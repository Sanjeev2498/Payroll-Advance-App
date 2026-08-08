import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

@Injectable()
export class ClientUserAuthGuard implements CanActivate {
  private readonly logger = new Logger(ClientUserAuthGuard.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('No token provided');
    }

    try {
      // Verify and decode the JWT token
      const payload: JwtPayload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      // Ensure this is a client user token
      if (payload.userType !== 'client_user') {
        throw new UnauthorizedException('Invalid user type - client access required');
      }

      // Verify the client user exists and is active
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

      // Add client user information to request
      request.clientUser = {
        id: clientUser.id,
        email: clientUser.email,
        firstName: clientUser.firstName,
        lastName: clientUser.lastName,
        role: clientUser.role,
        clientId: clientUser.clientId,
        isActive: clientUser.isActive,
        client: clientUser.client,
      };

      // Set tenant context from client's company
      request.tenantId = clientUser.client.companyId;

      this.logger.debug(`Client user authenticated: ${clientUser.email} (${clientUser.role})`);

      return true;
    } catch (error) {
      this.logger.warn(`Client user authentication failed:`, (error as Error).message);
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  private extractTokenFromHeader(request: any): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}