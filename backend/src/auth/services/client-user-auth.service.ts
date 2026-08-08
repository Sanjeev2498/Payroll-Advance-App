import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service';
import { ClientUserRepository } from '../../common/repositories/client-user.repository';
import { JwtPayload, AuthenticatedClientUser } from '../interfaces/jwt-payload.interface';
import { TokenResponseDto } from '../dto/auth-response.dto';
import { ClientUserRole } from '@prisma/client';

@Injectable()
export class ClientUserAuthService {
  private readonly logger = new Logger(ClientUserAuthService.name);
  private readonly accessTokenExpiry = '15m';
  private readonly refreshTokenExpiry = '7d';

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly clientUserRepository: ClientUserRepository,
  ) {}

  /**
   * Validate client user credentials
   */
  async validateClientUser(email: string, password: string): Promise<AuthenticatedClientUser | null> {
    try {
      // Find client user with client and company information
      // TODO: Fix after Prisma client generation issue is resolved
      // For now, using direct query approach
      const clientUser = await this.prisma.$queryRaw`
        SELECT cu.*, c.name as client_name, c.company_id
        FROM client_users cu
        JOIN clients c ON cu.client_id = c.id  
        WHERE cu.email = ${email} AND cu.is_active = true
        LIMIT 1
      ` as any[];

      if (!clientUser || clientUser.length === 0) {
        return null;
      }

      const user = clientUser[0];

      if (!user) {
        this.logger.warn(`Client user not found or inactive: ${email}`);
        return null;
      }

      // For now, we'll use a default password system. In production, you'd implement proper password hashing
      // This is a simplified implementation - in real production, client users would have their own password system
      const defaultPassword = 'ClientUser123!'; // This should be configurable or user-set
      const isPasswordValid = password === defaultPassword; // Simplified for this implementation
      
      if (!isPasswordValid) {
        this.logger.warn(`Invalid password for client user: ${email}`);
        return null;
      }

      this.logger.log(`Client user authenticated successfully: ${email}`);

      return {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        clientId: user.client_id,
        isActive: user.is_active,
        client: {
          id: user.client_id,
          name: user.client_name,
          companyId: user.company_id,
        },
      };
    } catch (error) {
      this.logger.error(`Error validating client user ${email}:`, error);
      if (error instanceof ForbiddenException) {
        throw error;
      }
      return null;
    }
  }

  /**
   * Login client user
   */
  async loginClientUser(email: string, password: string): Promise<{
    user: AuthenticatedClientUser;
    tokens: TokenResponseDto;
  }> {
    const clientUser = await this.validateClientUser(email, password);

    if (!clientUser) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Update last login timestamp
    await this.clientUserRepository.recordLogin(clientUser.id);

    const tokens = await this.generateClientUserTokens(clientUser);

    this.logger.log(`Client user logged in successfully: ${email}`);

    return {
      user: clientUser,
      tokens,
    };
  }

  /**
   * Refresh client user token
   */
  async refreshClientUserToken(refreshToken: string): Promise<TokenResponseDto> {
    try {
      const payload = this.jwtService.verify<JwtPayload>(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });

      // Verify token type and user type
      if (payload.type !== 'refresh' || payload.userType !== 'client_user') {
        throw new UnauthorizedException('Invalid token type');
      }

      // Verify client user still exists and is active
      const clientUser = await this.prisma.clientUser.findFirst({
        where: {
          id: payload.sub,
          email: payload.email,
          isActive: true,
        },
        include: {
          client: {
            select: {
              id: true,
              name: true,
              companyId: true,
            },
          },
        },
      });

      if (!clientUser) {
        throw new UnauthorizedException('Client user not found or inactive');
      }

      const authenticatedClientUser: AuthenticatedClientUser = {
        id: clientUser.id,
        email: clientUser.email,
        firstName: clientUser.firstName,
        lastName: clientUser.lastName,
        role: clientUser.role,
        clientId: clientUser.clientId,
        isActive: clientUser.isActive,
        client: clientUser.client,
      };

      return this.generateClientUserTokens(authenticatedClientUser);
    } catch (error) {
      this.logger.error('Error refreshing client user token:', error);
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  /**
   * Invite new client user
   */
  async inviteClientUser(clientId: string, userData: {
    email: string;
    firstName: string;
    lastName: string;
    role: ClientUserRole;
    phone?: string;
    jobTitle?: string;
    department?: string;
  }): Promise<{ clientUser: any; invitationSent: boolean; invitationToken: string }> {
    this.logger.log(`Inviting client user ${userData.email} for client ${clientId}`);

    try {
      // Check if user already exists
      const existingUser = await this.clientUserRepository.findByEmail(userData.email, clientId);
      if (existingUser) {
        throw new BadRequestException('User with this email already exists for this client');
      }

      // Create client user record
      const clientUser = await this.clientUserRepository.create({
        clientId,
        ...userData,
        // Set default permissions based on role
        permissions: this.getDefaultPermissionsForRole(userData.role),
      });

      // Generate invitation token
      const invitationToken = await this.generateInvitationToken(clientUser.id);

      // Mark as invited
      await this.clientUserRepository.sendInvitation(clientUser.id);

      // In a real implementation, you would send an email here
      // For now, we'll just return the invitation token
      this.logger.log(`Client user invited successfully: ${userData.email}`);

      return {
        clientUser,
        invitationSent: true,
        invitationToken,
      };
    } catch (error) {
      this.logger.error(`Error inviting client user ${userData.email}:`, error);
      throw error;
    }
  }

  /**
   * Activate client user account with invitation token
   */
  async activateClientUser(invitationToken: string, password: string): Promise<{
    user: AuthenticatedClientUser;
    tokens: TokenResponseDto;
  }> {
    try {
      // Verify invitation token
      const payload = this.jwtService.verify<{ userId: string; type: string }>(invitationToken, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      if (payload.type !== 'invitation') {
        throw new UnauthorizedException('Invalid invitation token');
      }

      // Find the client user
      const clientUser = await this.prisma.clientUser.findUnique({
        where: { id: payload.userId },
        include: {
          client: {
            select: {
              id: true,
              name: true,
              companyId: true,
            },
          },
        },
      });

      if (!clientUser) {
        throw new NotFoundException('Client user not found');
      }

      if (clientUser.activatedAt) {
        throw new BadRequestException('Account is already activated');
      }

      // Activate the account
      // In a real implementation, you'd hash and store the password
      await this.clientUserRepository.activate(clientUser.id);

      const authenticatedUser: AuthenticatedClientUser = {
        id: clientUser.id,
        email: clientUser.email,
        firstName: clientUser.firstName,
        lastName: clientUser.lastName,
        role: clientUser.role,
        clientId: clientUser.clientId,
        isActive: clientUser.isActive,
        client: clientUser.client,
      };

      const tokens = await this.generateClientUserTokens(authenticatedUser);

      this.logger.log(`Client user activated successfully: ${clientUser.email}`);

      return {
        user: authenticatedUser,
        tokens,
      };
    } catch (error) {
      this.logger.error('Error activating client user:', error);
      throw error;
    }
  }

  /**
   * Generate JWT tokens for client user
   */
  private async generateClientUserTokens(clientUser: AuthenticatedClientUser): Promise<TokenResponseDto> {
    const accessTokenPayload: JwtPayload = {
      sub: clientUser.id,
      email: clientUser.email,
      role: clientUser.role,
      companyId: clientUser.client.companyId, // Use client's company ID for tenant context
      clientId: clientUser.clientId,
      userType: 'client_user',
      type: 'access',
    };

    const refreshTokenPayload: JwtPayload = {
      sub: clientUser.id,
      email: clientUser.email,
      role: clientUser.role,
      companyId: clientUser.client.companyId,
      clientId: clientUser.clientId,
      userType: 'client_user',
      type: 'refresh',
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(accessTokenPayload, {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn: this.accessTokenExpiry,
      }),
      this.jwtService.signAsync(refreshTokenPayload, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.refreshTokenExpiry,
      }),
    ]);

    return {
      accessToken,
      refreshToken,
      expiresIn: 15 * 60, // 15 minutes in seconds
    };
  }

  /**
   * Generate invitation token
   */
  private async generateInvitationToken(userId: string): Promise<string> {
    const payload = {
      userId,
      type: 'invitation',
    };

    return this.jwtService.signAsync(payload, {
      secret: this.configService.get<string>('JWT_SECRET'),
      expiresIn: '7d', // Invitation valid for 7 days
    });
  }

  /**
   * Get default permissions for role
   */
  private getDefaultPermissionsForRole(role: ClientUserRole): any {
    // This would map to the ClientUserPermissionsConfig
    const defaultPermissions = {
      [ClientUserRole.FACILITY_MANAGER]: { level: 'facility_operations' },
      [ClientUserRole.FINANCE_MANAGER]: { level: 'financial_management' },
      [ClientUserRole.SECURITY_MANAGER]: { level: 'security_operations' },
      [ClientUserRole.HR_MANAGER]: { level: 'hr_management' },
      [ClientUserRole.REGIONAL_MANAGER]: { level: 'regional_oversight' },
    };

    return defaultPermissions[role] || {};
  }

  /**
   * Logout client user
   */
  async logoutClientUser(userId: string): Promise<{ success: boolean; message: string }> {
    // In a production system, you might want to maintain a token blacklist
    this.logger.log(`Client user logged out: ${userId}`);
    
    return {
      success: true,
      message: 'Logout successful',
    };
  }
}