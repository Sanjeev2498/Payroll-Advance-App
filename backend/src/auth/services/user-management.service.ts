import {
  Injectable,
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { User, UserRole } from '@prisma/client';
import { UserRepository } from '../repositories/user.repository';
import { TenantContextService } from '../../common/tenant-context.service';
import { CreateUserDto, RegisterUserDto } from '../dto/create-user.dto';
import { UpdateUserDto, UpdateUserProfileDto, ChangePasswordDto } from '../dto/update-user.dto';
import { UserFilterDto } from '../dto/user-filter.dto';
import { UserResponseDto, UserStatsDto } from '../dto/user-response.dto';

@Injectable()
export class UserManagementService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly tenantContext: TenantContextService,
  ) {}

  async createUser(
    createUserDto: CreateUserDto,
  ): Promise<{ user: UserResponseDto; temporaryPassword?: string }> {
    // Validate permissions
    this.validateUserCreationPermissions(createUserDto.role);

    // Generate secure password hash
    const passwordHash = await this.hashPassword(createUserDto.password);

    // Create user
    const user = await this.userRepository.create(createUserDto, passwordHash);

    // Convert to response DTO
    const userResponse = this.mapToResponseDto(user);

    return { user: userResponse };
  }

  async createUserWithTempPassword(
    createUserDto: Omit<CreateUserDto, 'password'>,
  ): Promise<{ user: UserResponseDto; temporaryPassword: string }> {
    // Validate permissions
    this.validateUserCreationPermissions(createUserDto.role);

    // Generate temporary password
    const temporaryPassword = this.generateSecurePassword();
    const passwordHash = await this.hashPassword(temporaryPassword);

    // Create user with temporary password
    const user = await this.userRepository.create(
      { ...createUserDto, password: temporaryPassword },
      passwordHash,
    );

    // Convert to response DTO
    const userResponse = this.mapToResponseDto(user);

    return { user: userResponse, temporaryPassword };
  }

  async registerUser(registerUserDto: RegisterUserDto): Promise<UserResponseDto> {
    // Hash password
    const passwordHash = await this.hashPassword(registerUserDto.password);

    // Register user (uses system context to bypass tenant restrictions)
    const user = await this.userRepository.register(registerUserDto, passwordHash);

    return this.mapToResponseDto(user);
  }

  async findAllUsers(filters: UserFilterDto): Promise<{ users: UserResponseDto[]; total: number }> {
    const { users, total } = await this.userRepository.findAll(filters);

    return {
      users: users.map((user) => this.mapToResponseDto(user)),
      total,
    };
  }

  async findUserById(id: string): Promise<UserResponseDto> {
    const user = await this.userRepository.findById(id);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.mapToResponseDto(user);
  }

  async findUserByEmail(email: string): Promise<UserResponseDto | null> {
    const user = await this.userRepository.findByEmail(email);

    if (!user) {
      return null;
    }

    return this.mapToResponseDto(user);
  }

  async updateUser(id: string, updateUserDto: UpdateUserDto): Promise<UserResponseDto> {
    // Validate update permissions
    this.validateUserUpdatePermissions(updateUserDto);

    const user = await this.userRepository.update(id, updateUserDto);

    return this.mapToResponseDto(user);
  }

  async updateUserProfile(
    userId: string,
    updateProfileDto: UpdateUserProfileDto,
  ): Promise<UserResponseDto> {
    // Users can update their own profile, or admins can update any profile
    const currentUserId = this.tenantContext.getUserId();
    const currentUserRole = this.tenantContext.getUserRole() as UserRole;

    if (userId !== currentUserId && !this.isAdminRole(currentUserRole)) {
      throw new ForbiddenException("Cannot update another user's profile");
    }

    // Convert profile DTO to user DTO
    const updateUserDto: UpdateUserDto = {
      firstName: updateProfileDto.firstName,
      lastName: updateProfileDto.lastName,
      email: updateProfileDto.email,
    };

    const user = await this.userRepository.update(userId, updateUserDto);

    return this.mapToResponseDto(user);
  }

  async changePassword(
    userId: string,
    changePasswordDto: ChangePasswordDto,
  ): Promise<{ success: boolean; message: string }> {
    // Users can change their own password, or admins can reset any password
    const currentUserId = this.tenantContext.getUserId();
    const currentUserRole = this.tenantContext.getUserRole() as UserRole;

    if (userId !== currentUserId && !this.isAdminRole(currentUserRole)) {
      throw new ForbiddenException("Cannot change another user's password");
    }

    // Get current user to validate current password
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Verify current password (only if changing own password)
    if (userId === currentUserId) {
      const isCurrentPasswordValid = await bcrypt.compare(
        changePasswordDto.currentPassword,
        user.passwordHash,
      );

      if (!isCurrentPasswordValid) {
        throw new UnauthorizedException('Current password is incorrect');
      }
    }

    // Validate new password strength
    this.validatePasswordStrength(changePasswordDto.newPassword);

    // Hash new password
    const newPasswordHash = await this.hashPassword(changePasswordDto.newPassword);

    // Update password
    await this.userRepository.updatePassword(userId, newPasswordHash);

    return {
      success: true,
      message: 'Password changed successfully',
    };
  }

  async resetUserPassword(userId: string): Promise<{ temporaryPassword: string }> {
    // Only admins can reset passwords
    const currentUserRole = this.tenantContext.getUserRole() as UserRole;
    if (!this.isAdminRole(currentUserRole)) {
      throw new ForbiddenException('Insufficient permissions to reset password');
    }

    // Generate temporary password
    const temporaryPassword = this.generateSecurePassword();
    const passwordHash = await this.hashPassword(temporaryPassword);

    // Update password
    await this.userRepository.updatePassword(userId, passwordHash);

    return { temporaryPassword };
  }

  async deactivateUser(id: string): Promise<UserResponseDto> {
    // Only admins can deactivate users
    const currentUserRole = this.tenantContext.getUserRole() as UserRole;
    if (!this.isAdminRole(currentUserRole)) {
      throw new ForbiddenException('Insufficient permissions to deactivate user');
    }

    // Cannot deactivate yourself
    const currentUserId = this.tenantContext.getUserId();
    if (id === currentUserId) {
      throw new BadRequestException('Cannot deactivate your own account');
    }

    const user = await this.userRepository.update(id, { isActive: false });

    return this.mapToResponseDto(user);
  }

  async reactivateUser(id: string): Promise<UserResponseDto> {
    // Only admins can reactivate users
    const currentUserRole = this.tenantContext.getUserRole() as UserRole;
    if (!this.isAdminRole(currentUserRole)) {
      throw new ForbiddenException('Insufficient permissions to reactivate user');
    }

    const user = await this.userRepository.update(id, { isActive: true });

    return this.mapToResponseDto(user);
  }

  async deleteUser(id: string): Promise<{ success: boolean; message: string }> {
    // Only admins can delete users
    const currentUserRole = this.tenantContext.getUserRole() as UserRole;
    if (!this.isAdminRole(currentUserRole)) {
      throw new ForbiddenException('Insufficient permissions to delete user');
    }

    // Cannot delete yourself
    const currentUserId = this.tenantContext.getUserId();
    if (id === currentUserId) {
      throw new BadRequestException('Cannot delete your own account');
    }

    await this.userRepository.delete(id);

    return {
      success: true,
      message: 'User deleted successfully',
    };
  }

  async getUserStats(): Promise<UserStatsDto> {
    // Only admins can view user stats
    const currentUserRole = this.tenantContext.getUserRole() as UserRole;
    if (!this.isAdminRole(currentUserRole)) {
      throw new ForbiddenException('Insufficient permissions to view user statistics');
    }

    return this.userRepository.getStats();
  }

  async hashPassword(password: string): Promise<string> {
    this.validatePasswordStrength(password);
    return bcrypt.hash(password, 12);
  }

  private validatePasswordStrength(password: string): void {
    if (password.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters long');
    }

    if (password.length > 128) {
      throw new BadRequestException('Password cannot exceed 128 characters');
    }

    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecialChar = /[@$!%*?&]/.test(password);

    if (!hasUpperCase || !hasLowerCase || !hasNumber || !hasSpecialChar) {
      throw new BadRequestException(
        'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
      );
    }
  }

  private generateSecurePassword(): string {
    // Generate a secure temporary password
    const length = 12;
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@$!%*?&';
    let password = '';

    // Ensure at least one of each required character type
    password += 'A'; // Uppercase
    password += 'a'; // Lowercase
    password += '1'; // Number
    password += '@'; // Special char

    // Fill the rest randomly
    for (let i = 4; i < length; i++) {
      password += charset.charAt(crypto.randomInt(0, charset.length));
    }

    // Shuffle the password
    return password
      .split('')
      .sort(() => crypto.randomInt(-1, 2))
      .join('');
  }

  private validateUserCreationPermissions(role: UserRole): void {
    const currentUserRole = this.tenantContext.getUserRole() as UserRole;

    // Only admins can create users
    if (!this.isAdminRole(currentUserRole)) {
      throw new ForbiddenException('Insufficient permissions to create users');
    }

    // Role hierarchy validation
    if (!this.canAssignRole(currentUserRole, role)) {
      throw new ForbiddenException(`Cannot assign role ${role}`);
    }
  }

  private validateUserUpdatePermissions(updateUserDto: UpdateUserDto): void {
    const currentUserRole = this.tenantContext.getUserRole() as UserRole;

    // Only admins can update users
    if (!this.isAdminRole(currentUserRole)) {
      throw new ForbiddenException('Insufficient permissions to update users');
    }

    // Role change validation
    if (updateUserDto.role && !this.canAssignRole(currentUserRole, updateUserDto.role)) {
      throw new ForbiddenException(`Cannot assign role ${updateUserDto.role}`);
    }
  }

  private canAssignRole(currentRole: UserRole, targetRole: UserRole): boolean {
    const roleHierarchy = {
      [UserRole.SUPER_ADMIN]: 5,
      [UserRole.COMPANY_ADMIN]: 4,
      [UserRole.MANAGER]: 3,
      [UserRole.SUPERVISOR]: 2,
      [UserRole.EMPLOYEE]: 1,
    };

    const currentLevel = roleHierarchy[currentRole] || 0;
    const targetLevel = roleHierarchy[targetRole] || 0;

    // Can assign roles at same level or lower
    return currentLevel >= targetLevel;
  }

  private isAdminRole(role: UserRole | null): boolean {
    if (!role) return false;
    const adminRoles: UserRole[] = [UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN, UserRole.MANAGER];
    return adminRoles.includes(role);
  }

  private mapToResponseDto(user: User): UserResponseDto {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      companyId: user.companyId,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
