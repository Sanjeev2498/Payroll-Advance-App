import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Get,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { ClientUserAuthService } from '../services/client-user-auth.service';
import { ClientUserAuthGuard } from '../guards/client-user-auth.guard';
import { CurrentClientUser } from '../decorators/client-user.decorator';
import { PublicClientEndpoint } from '../decorators/client-permissions.decorator';
import {
  ClientUserLoginDto,
  ClientUserActivationDto,
  ClientUserRefreshTokenDto,
} from '../dto/client-user-login.dto';
import {
  ClientUserLoginResponseDto,
  ClientUserResponseDto,
} from '../dto/client-user-response.dto';
import { TokenResponseDto } from '../dto/auth-response.dto';
import { AuthenticatedClientUser } from '../interfaces/jwt-payload.interface';

@ApiTags('Client User Authentication')
@Controller('client-auth')
export class ClientUserAuthController {
  constructor(private readonly clientUserAuthService: ClientUserAuthService) {}

  @Post('login')
  @PublicClientEndpoint()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Client user login',
    description: 'Authenticate client user and receive access tokens',
  })
  @ApiBody({ type: ClientUserLoginDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Login successful',
    type: ClientUserLoginResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid credentials',
  })
  async login(@Body() loginDto: ClientUserLoginDto): Promise<ClientUserLoginResponseDto> {
    const result = await this.clientUserAuthService.loginClientUser(
      loginDto.email,
      loginDto.password,
    );

    return {
      success: true,
      data: {
        user: this.mapToClientUserResponse(result.user),
        tokens: result.tokens,
      },
      message: 'Login successful',
    };
  }

  @Post('activate')
  @PublicClientEndpoint()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Activate client user account',
    description: 'Activate client user account with invitation token and set password',
  })
  @ApiBody({ type: ClientUserActivationDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Account activated successfully',
    type: ClientUserLoginResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid invitation token',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Account already activated or invalid data',
  })
  async activateAccount(@Body() activationDto: ClientUserActivationDto): Promise<ClientUserLoginResponseDto> {
    const result = await this.clientUserAuthService.activateClientUser(
      activationDto.invitationToken,
      activationDto.password,
    );

    return {
      success: true,
      data: {
        user: this.mapToClientUserResponse(result.user),
        tokens: result.tokens,
      },
      message: 'Account activated successfully',
    };
  }

  @Post('refresh')
  @PublicClientEndpoint()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Refresh access token',
    description: 'Get new access token using refresh token',
  })
  @ApiBody({ type: ClientUserRefreshTokenDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Token refreshed successfully',
    type: TokenResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid or expired refresh token',
  })
  async refreshToken(@Body() refreshDto: ClientUserRefreshTokenDto): Promise<TokenResponseDto> {
    return this.clientUserAuthService.refreshClientUserToken(refreshDto.refreshToken);
  }

  @Post('logout')
  @UseGuards(ClientUserAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Client user logout',
    description: 'Logout current client user session',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Logout successful',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid or expired token',
  })
  async logout(@CurrentClientUser('id') userId: string): Promise<{ success: boolean; message: string }> {
    return this.clientUserAuthService.logoutClientUser(userId);
  }

  @Get('profile')
  @UseGuards(ClientUserAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get client user profile',
    description: 'Get current authenticated client user profile information',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Profile retrieved successfully',
    type: ClientUserResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid or expired token',
  })
  async getProfile(@CurrentClientUser() clientUser: AuthenticatedClientUser): Promise<{
    success: boolean;
    data: ClientUserResponseDto;
  }> {
    return {
      success: true,
      data: this.mapToClientUserResponse(clientUser),
    };
  }

  /**
   * Helper method to map AuthenticatedClientUser to ClientUserResponseDto
   */
  private mapToClientUserResponse(user: AuthenticatedClientUser): ClientUserResponseDto {
    return {
      id: user.id,
      clientId: user.clientId,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      isActive: user.isActive,
      createdAt: new Date().toISOString(), // In real implementation, get from database
      updatedAt: new Date().toISOString(),
      client: user.client ? {
        id: user.client.id,
        name: user.client.name,
        companyId: user.client.companyId,
      } : undefined,
    };
  }
}