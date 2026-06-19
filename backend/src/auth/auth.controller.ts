import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  ValidationPipe,
  Get,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto, AuthResponseDto, TokenResponseDto } from './dto/auth-response.dto';
import { AuthenticatedUser } from './interfaces/jwt-payload.interface';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @UseGuards(LocalAuthGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body(ValidationPipe) loginDto: LoginDto,
  ): Promise<AuthResponseDto> {
    return this.authService.login(loginDto);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refreshToken(
    @Body('refreshToken') refreshToken: string,
  ): Promise<TokenResponseDto> {
    if (!refreshToken) {
      throw new Error('Refresh token is required');
    }
    return this.authService.refreshToken(refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @CurrentUser('id') userId: string,
  ): Promise<{ success: boolean; message: string }> {
    return this.authService.logout(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @CurrentUser('id') userId: string,
    @Body('currentPassword') currentPassword: string,
    @Body('newPassword') newPassword: string,
  ): Promise<{ success: boolean; message: string }> {
    return this.authService.changePassword(userId, currentPassword, newPassword);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  async getProfile(@CurrentUser() user: AuthenticatedUser): Promise<{
    success: boolean;
    data: AuthenticatedUser;
  }> {
    return {
      success: true,
      data: user,
    };
  }

  @Public()
  @Get('health')
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}