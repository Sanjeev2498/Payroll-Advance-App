import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  ValidationPipe,
  Get,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
  ApiUnauthorizedResponse,
  ApiBadRequestResponse,
  ApiOkResponse,
  ApiProperty,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto, TokenResponseDto } from './dto/auth-response.dto';
import { AuthenticatedUser } from './interfaces/jwt-payload.interface';
import { PrismaService } from '../prisma/prisma.service';
import { BaseResponseDto, ErrorResponseDto } from '../common/dto/base-response.dto';

// DTOs for Swagger documentation
export class RefreshTokenRequestDto {
  @ApiProperty({
    description: 'JWT refresh token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  refreshToken: string;
}

export class ChangePasswordRequestDto {
  @ApiProperty({
    description: 'Current password',
    example: 'currentPassword123',
    minLength: 6,
  })
  currentPassword: string;

  @ApiProperty({
    description: 'New password',
    example: 'newSecurePassword456',
    minLength: 6,
  })
  newPassword: string;
}

export class UserProfileResponseDto {
  @ApiProperty({ description: 'User ID', example: 'usr_123456789' })
  id: string;

  @ApiProperty({ description: 'User email address', example: 'john.doe@company.com' })
  email: string;

  @ApiProperty({ description: 'First name', example: 'John' })
  firstName: string;

  @ApiProperty({ description: 'Last name', example: 'Doe' })
  lastName: string;

  @ApiProperty({ description: 'User role', example: 'COMPANY_ADMIN' })
  role: string;

  @ApiProperty({ description: 'Company ID', example: 'cmp_987654321' })
  companyId: string;

  @ApiProperty({ description: 'Tenant ID (same as company ID)', example: 'cmp_987654321' })
  tenantId: string;

  @ApiProperty({ description: 'Company/Tenant name', example: 'Acme Security Services' })
  tenantName: string;

  @ApiProperty({ description: 'User status', example: 'ACTIVE' })
  status: string;

  @ApiProperty({ description: 'Account creation timestamp', example: '2024-03-10T10:30:00Z' })
  createdAt: string;

  @ApiProperty({ description: 'Last update timestamp', example: '2024-03-10T10:30:00Z' })
  updatedAt: string;
}

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly prisma: PrismaService,
  ) {}

  @Public()
  @UseGuards(LocalAuthGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'User authentication',
    description: 'Authenticate user with email and password to receive JWT tokens',
  })
  @ApiBody({
    type: LoginDto,
    description: 'User login credentials',
  })
  @ApiOkResponse({
    description: 'Authentication successful',
    type: AuthResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid credentials',
    type: ErrorResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Validation error',
    type: ErrorResponseDto,
  })
  async login(@Body(ValidationPipe) loginDto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(loginDto);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Refresh JWT token',
    description: 'Exchange a valid refresh token for a new access token',
  })
  @ApiBody({
    type: RefreshTokenRequestDto,
    description: 'Refresh token request',
  })
  @ApiOkResponse({
    description: 'Token refresh successful',
    type: TokenResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or expired refresh token',
    type: ErrorResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Refresh token is required',
    type: ErrorResponseDto,
  })
  async refreshToken(@Body('refreshToken') refreshToken: string): Promise<TokenResponseDto> {
    if (!refreshToken) {
      throw new Error('Refresh token is required');
    }
    return this.authService.refreshToken(refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'User logout',
    description: 'Logout user and invalidate refresh token',
  })
  @ApiOkResponse({
    description: 'Logout successful',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Logout successful' },
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or expired token',
    type: ErrorResponseDto,
  })
  async logout(@CurrentUser('id') userId: string): Promise<{ success: boolean; message: string }> {
    return this.authService.logout(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Change user password',
    description: 'Change the authenticated user password',
  })
  @ApiBody({
    type: ChangePasswordRequestDto,
    description: 'Password change request',
  })
  @ApiOkResponse({
    description: 'Password changed successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Password changed successfully' },
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid current password or expired token',
    type: ErrorResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Validation error',
    type: ErrorResponseDto,
  })
  async changePassword(
    @CurrentUser('id') userId: string,
    @Body('currentPassword') currentPassword: string,
    @Body('newPassword') newPassword: string,
  ): Promise<{ success: boolean; message: string }> {
    return this.authService.changePassword(userId, currentPassword, newPassword);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get user profile',
    description: 'Retrieve the authenticated user profile information',
  })
  @ApiOkResponse({
    description: 'User profile retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: { $ref: '#/components/schemas/UserProfileResponseDto' },
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or expired token',
    type: ErrorResponseDto,
  })
  async getProfile(@CurrentUser() user: AuthenticatedUser): Promise<{
    success: boolean;
    data: any; // Updated to return full user info with tenant fields
  }> {
    // Get full user data with company info for tenant fields
    const fullUser = await this.prisma.user.findUnique({
      where: { id: user.id },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    if (!fullUser) {
      throw new UnauthorizedException('User not found');
    }

    return {
      success: true,
      data: {
        id: fullUser.id,
        email: fullUser.email,
        firstName: fullUser.firstName,
        lastName: fullUser.lastName,
        role: fullUser.role,
        companyId: fullUser.companyId,
        // Add tenant fields for frontend compatibility
        tenantId: fullUser.companyId,
        tenantName: fullUser.company?.name || 'Unknown Company',
        status: fullUser.isActive ? 'ACTIVE' : 'INACTIVE',
        createdAt: fullUser.createdAt.toISOString(),
        updatedAt: fullUser.updatedAt.toISOString(),
      },
    };
  }

  @Public()
  @Get('health')
  @ApiOperation({
    summary: 'Authentication service health check',
    description: 'Check if the authentication service is operational',
  })
  @ApiOkResponse({
    description: 'Service is healthy',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        timestamp: { type: 'string', example: '2024-03-10T10:30:00Z' },
      },
    },
  })
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}
