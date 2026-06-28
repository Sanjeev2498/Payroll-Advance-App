import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ValidationPipe,
  ParseUUIDPipe,
} from '@nestjs/common';
import { UserManagementService } from '../services/user-management.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { PermissionsGuard } from '../guards/permissions.guard';
import { TenantGuard } from '../../common/tenant.guard';
import { RequirePermissions } from '../decorators/permissions.decorator';
import { CurrentUser } from '../decorators/current-user.decorator';
import { Public } from '../decorators/public.decorator';
import { UserPermissions } from '../enums/permissions.enum';
import { CreateUserDto, RegisterUserDto } from '../dto/create-user.dto';
import { UpdateUserDto, UpdateUserProfileDto, ChangePasswordDto } from '../dto/update-user.dto';
import { UserFilterDto } from '../dto/user-filter.dto';
import {
  UserListResponseDto,
  SingleUserResponseDto,
  UserCreatedResponseDto,
  UserStatsDto,
} from '../dto/user-response.dto';
import { AuthenticatedUser } from '../interfaces/jwt-payload.interface';

@Controller('users')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class UserManagementController {
  constructor(private readonly userManagementService: UserManagementService) {}

  @Post()
  @RequirePermissions(UserPermissions.CREATE_USER)
  @HttpCode(HttpStatus.CREATED)
  async createUser(
    @Body(ValidationPipe) createUserDto: CreateUserDto,
  ): Promise<UserCreatedResponseDto> {
    const result = await this.userManagementService.createUser(createUserDto);

    return {
      success: true,
      data: result,
      message: 'User created successfully',
    };
  }

  @Post('create-with-temp-password')
  @RequirePermissions(UserPermissions.CREATE_USER)
  @HttpCode(HttpStatus.CREATED)
  async createUserWithTempPassword(
    @Body(ValidationPipe) createUserDto: Omit<CreateUserDto, 'password'>,
  ): Promise<UserCreatedResponseDto> {
    const result = await this.userManagementService.createUserWithTempPassword(createUserDto);

    return {
      success: true,
      data: result,
      message: 'User created successfully with temporary password',
    };
  }

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async registerUser(
    @Body(ValidationPipe) registerUserDto: RegisterUserDto,
  ): Promise<SingleUserResponseDto> {
    const user = await this.userManagementService.registerUser(registerUserDto);

    return {
      success: true,
      data: user,
      message: 'User registered successfully',
    };
  }

  @Get()
  @RequirePermissions(UserPermissions.READ_USER)
  async getAllUsers(@Query(ValidationPipe) filters: UserFilterDto): Promise<UserListResponseDto> {
    const { users, total } = await this.userManagementService.findAllUsers(filters);

    const { page = 1, limit = 20 } = filters;
    const totalPages = Math.ceil(total / limit);

    return {
      success: true,
      data: users,
      metadata: {
        total,
        page,
        limit,
        totalPages,
        hasNext: page < totalPages,
        hasPrevious: page > 1,
      },
    };
  }

  @Get('stats')
  @RequirePermissions(UserPermissions.READ_USER_STATS)
  async getUserStats(): Promise<{ success: boolean; data: UserStatsDto }> {
    const stats = await this.userManagementService.getUserStats();

    return {
      success: true,
      data: stats,
    };
  }

  @Get('profile')
  async getCurrentUserProfile(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SingleUserResponseDto> {
    const userProfile = await this.userManagementService.findUserById(user.id);

    return {
      success: true,
      data: userProfile,
    };
  }

  @Get(':id')
  @RequirePermissions(UserPermissions.READ_USER)
  async getUserById(@Param('id', ParseUUIDPipe) id: string): Promise<SingleUserResponseDto> {
    const user = await this.userManagementService.findUserById(id);

    return {
      success: true,
      data: user,
    };
  }

  @Put(':id')
  @RequirePermissions(UserPermissions.UPDATE_USER)
  async updateUser(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) updateUserDto: UpdateUserDto,
  ): Promise<SingleUserResponseDto> {
    const user = await this.userManagementService.updateUser(id, updateUserDto);

    return {
      success: true,
      data: user,
      message: 'User updated successfully',
    };
  }

  @Put('profile/:id')
  async updateUserProfile(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) updateProfileDto: UpdateUserProfileDto,
  ): Promise<SingleUserResponseDto> {
    const user = await this.userManagementService.updateUserProfile(id, updateProfileDto);

    return {
      success: true,
      data: user,
      message: 'Profile updated successfully',
    };
  }

  @Put(':id/password')
  async changeUserPassword(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) changePasswordDto: ChangePasswordDto,
  ): Promise<{ success: boolean; message: string }> {
    return this.userManagementService.changePassword(id, changePasswordDto);
  }

  @Post(':id/reset-password')
  @RequirePermissions(UserPermissions.RESET_USER_PASSWORD)
  @HttpCode(HttpStatus.OK)
  async resetUserPassword(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ success: boolean; data: { temporaryPassword: string }; message: string }> {
    const result = await this.userManagementService.resetUserPassword(id);

    return {
      success: true,
      data: result,
      message: 'Password reset successfully',
    };
  }

  @Put(':id/deactivate')
  @RequirePermissions(UserPermissions.DEACTIVATE_USER)
  async deactivateUser(@Param('id', ParseUUIDPipe) id: string): Promise<SingleUserResponseDto> {
    const user = await this.userManagementService.deactivateUser(id);

    return {
      success: true,
      data: user,
      message: 'User deactivated successfully',
    };
  }

  @Put(':id/reactivate')
  @RequirePermissions(UserPermissions.ACTIVATE_USER)
  async reactivateUser(@Param('id', ParseUUIDPipe) id: string): Promise<SingleUserResponseDto> {
    const user = await this.userManagementService.reactivateUser(id);

    return {
      success: true,
      data: user,
      message: 'User reactivated successfully',
    };
  }

  @Delete(':id')
  @RequirePermissions(UserPermissions.DELETE_USER)
  @HttpCode(HttpStatus.OK)
  async deleteUser(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ success: boolean; message: string }> {
    return this.userManagementService.deleteUser(id);
  }
}
