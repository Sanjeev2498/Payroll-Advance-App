import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { UserManagementService } from './user-management.service';
import { UserRepository } from '../repositories/user.repository';
import { TenantContextService } from '../../common/tenant-context.service';

describe('UserManagementService', () => {
  let service: UserManagementService;
  let userRepository: jest.Mocked<UserRepository>;
  let tenantContext: jest.Mocked<TenantContextService>;

  const mockTenantId = 'tenant-123';
  const mockUserId = 'user-123';
  const mockUser = {
    id: mockUserId,
    companyId: mockTenantId,
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    passwordHash: 'hashed-password',
    role: UserRole.EMPLOYEE,
    isActive: true,
    lastLoginAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockUserRepository = {
      create: jest.fn(),
      register: jest.fn(),
      findAll: jest.fn(),
      findById: jest.fn(),
      findByEmail: jest.fn(),
      update: jest.fn(),
      updatePassword: jest.fn(),
      delete: jest.fn(),
      getStats: jest.fn(),
    };

    const mockTenantContext = {
      getTenantId: jest.fn(() => mockTenantId),
      getUserId: jest.fn(() => mockUserId),
      getUserRole: jest.fn(() => UserRole.COMPANY_ADMIN),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserManagementService,
        {
          provide: UserRepository,
          useValue: mockUserRepository,
        },
        {
          provide: TenantContextService,
          useValue: mockTenantContext,
        },
      ],
    }).compile();

    service = module.get<UserManagementService>(UserManagementService);
    userRepository = module.get(UserRepository) as jest.Mocked<UserRepository>;
    tenantContext = module.get(TenantContextService) as jest.Mocked<TenantContextService>;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createUser', () => {
    const createUserDto = {
      email: 'newuser@example.com',
      firstName: 'Jane',
      lastName: 'Smith',
      password: 'SecurePass123!',
      role: UserRole.EMPLOYEE,
    };

    it('should create a user successfully', async () => {
      userRepository.create.mockResolvedValue(mockUser);

      const result = await service.createUser(createUserDto);

      expect(userRepository.create).toHaveBeenCalledWith(
        createUserDto,
        expect.any(String), // hashed password
      );
      expect(result.user).toEqual(
        expect.objectContaining({
          id: mockUser.id,
          email: mockUser.email,
          firstName: mockUser.firstName,
          lastName: mockUser.lastName,
          role: mockUser.role,
          companyId: mockUser.companyId,
        }),
      );
    });

    it('should throw ForbiddenException if user lacks permissions', async () => {
      tenantContext.getUserRole.mockReturnValue(UserRole.EMPLOYEE);

      await expect(service.createUser(createUserDto)).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException if trying to assign higher role', async () => {
      tenantContext.getUserRole.mockReturnValue(UserRole.MANAGER);
      const dto = { ...createUserDto, role: UserRole.SUPER_ADMIN };

      await expect(service.createUser(dto)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('registerUser', () => {
    const registerUserDto = {
      email: 'newuser@example.com',
      firstName: 'Jane',
      lastName: 'Smith',
      password: 'SecurePass123!',
      companyId: mockTenantId,
    };

    it('should register a user successfully', async () => {
      const registeredUser = { ...mockUser, role: UserRole.EMPLOYEE };
      userRepository.register.mockResolvedValue(registeredUser);

      const result = await service.registerUser(registerUserDto);

      expect(userRepository.register).toHaveBeenCalledWith(
        registerUserDto,
        expect.any(String), // hashed password
      );
      expect(result).toEqual(
        expect.objectContaining({
          id: registeredUser.id,
          email: registeredUser.email,
          role: UserRole.EMPLOYEE, // Always EMPLOYEE for registration
        }),
      );
    });
  });

  describe('findAllUsers', () => {
    const filters = { page: 1, limit: 20 };

    it('should return paginated users', async () => {
      const users = [mockUser];
      const total = 1;
      userRepository.findAll.mockResolvedValue({ users, total });

      const result = await service.findAllUsers(filters);

      expect(userRepository.findAll).toHaveBeenCalledWith(filters);
      expect(result.users).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });

  describe('findUserById', () => {
    it('should return user if found', async () => {
      userRepository.findById.mockResolvedValue(mockUser);

      const result = await service.findUserById(mockUserId);

      expect(userRepository.findById).toHaveBeenCalledWith(mockUserId);
      expect(result.id).toBe(mockUserId);
    });

    it('should throw NotFoundException if user not found', async () => {
      userRepository.findById.mockResolvedValue(null);

      await expect(service.findUserById(mockUserId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateUser', () => {
    const updateUserDto = {
      firstName: 'Updated',
      lastName: 'Name',
    };

    it('should update user successfully', async () => {
      const updatedUser = { ...mockUser, ...updateUserDto };
      userRepository.update.mockResolvedValue(updatedUser);

      const result = await service.updateUser(mockUserId, updateUserDto);

      expect(userRepository.update).toHaveBeenCalledWith(mockUserId, updateUserDto);
      expect(result.firstName).toBe('Updated');
      expect(result.lastName).toBe('Name');
    });

    it('should throw ForbiddenException if user lacks permissions', async () => {
      tenantContext.getUserRole.mockReturnValue(UserRole.EMPLOYEE);

      await expect(service.updateUser(mockUserId, updateUserDto)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('updateUserProfile', () => {
    const updateProfileDto = {
      firstName: 'Updated',
      email: 'updated@example.com',
    };

    it('should allow user to update own profile', async () => {
      const updatedUser = { ...mockUser, ...updateProfileDto };
      userRepository.update.mockResolvedValue(updatedUser);

      const result = await service.updateUserProfile(mockUserId, updateProfileDto);

      expect(userRepository.update).toHaveBeenCalledWith(mockUserId, {
        firstName: updateProfileDto.firstName,
        lastName: undefined,
        email: updateProfileDto.email,
      });
      expect(result.firstName).toBe('Updated');
    });

    it('should allow admin to update any profile', async () => {
      const otherUserId = 'other-user-123';
      tenantContext.getUserRole.mockReturnValue(UserRole.COMPANY_ADMIN);
      const updatedUser = { ...mockUser, id: otherUserId, ...updateProfileDto };
      userRepository.update.mockResolvedValue(updatedUser);

      const result = await service.updateUserProfile(otherUserId, updateProfileDto);

      expect(userRepository.update).toHaveBeenCalledWith(otherUserId, expect.any(Object));
      expect(result.id).toBe(otherUserId);
    });

    it('should throw ForbiddenException if non-admin tries to update other user', async () => {
      const otherUserId = 'other-user-123';
      tenantContext.getUserRole.mockReturnValue(UserRole.EMPLOYEE);

      await expect(service.updateUserProfile(otherUserId, updateProfileDto)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('changePassword', () => {
    const changePasswordDto = {
      currentPassword: 'oldpass123',
      newPassword: 'NewSecurePass123!',
    };

    it('should allow user to change own password', async () => {
      userRepository.findById.mockResolvedValue(mockUser);
      userRepository.updatePassword.mockResolvedValue(mockUser);
      // Mock bcrypt.compare
      jest.spyOn(require('bcryptjs'), 'compare').mockResolvedValue(true);

      const result = await service.changePassword(mockUserId, changePasswordDto);

      expect(userRepository.updatePassword).toHaveBeenCalledWith(mockUserId, expect.any(String));
      expect(result.success).toBe(true);
    });

    it('should throw UnauthorizedException if current password is wrong', async () => {
      userRepository.findById.mockResolvedValue(mockUser);
      // Mock bcrypt.compare to return false
      jest.spyOn(require('bcryptjs'), 'compare').mockResolvedValue(false);

      await expect(service.changePassword(mockUserId, changePasswordDto)).rejects.toThrow();
    });

    it('should allow admin to reset any password without current password', async () => {
      const otherUserId = 'other-user-123';
      tenantContext.getUserRole.mockReturnValue(UserRole.COMPANY_ADMIN);
      userRepository.findById.mockResolvedValue({ ...mockUser, id: otherUserId });
      userRepository.updatePassword.mockResolvedValue({ ...mockUser, id: otherUserId });

      const result = await service.changePassword(otherUserId, changePasswordDto);

      expect(userRepository.updatePassword).toHaveBeenCalledWith(otherUserId, expect.any(String));
      expect(result.success).toBe(true);
    });
  });

  describe('deactivateUser', () => {
    it('should deactivate user if user is admin', async () => {
      const deactivatedUser = { ...mockUser, isActive: false };
      userRepository.update.mockResolvedValue(deactivatedUser);

      const result = await service.deactivateUser('other-user-123');

      expect(userRepository.update).toHaveBeenCalledWith('other-user-123', { isActive: false });
      expect(result.isActive).toBe(false);
    });

    it('should throw ForbiddenException if user lacks admin permissions', async () => {
      tenantContext.getUserRole.mockReturnValue(UserRole.EMPLOYEE);

      await expect(service.deactivateUser('other-user-123')).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if trying to deactivate own account', async () => {
      await expect(service.deactivateUser(mockUserId)).rejects.toThrow(BadRequestException);
    });
  });

  describe('deleteUser', () => {
    it('should delete user if user is admin', async () => {
      userRepository.delete.mockResolvedValue(mockUser);

      const result = await service.deleteUser('other-user-123');

      expect(userRepository.delete).toHaveBeenCalledWith('other-user-123');
      expect(result.success).toBe(true);
    });

    it('should throw ForbiddenException if user lacks admin permissions', async () => {
      tenantContext.getUserRole.mockReturnValue(UserRole.EMPLOYEE);

      await expect(service.deleteUser('other-user-123')).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if trying to delete own account', async () => {
      await expect(service.deleteUser(mockUserId)).rejects.toThrow(BadRequestException);
    });
  });

  describe('password validation', () => {
    it('should validate password strength correctly', async () => {
      const weakPasswords = [
        'short', // too short
        'nouppercase123!', // no uppercase
        'NOLOWERCASE123!', // no lowercase
        'NoNumbers!', // no numbers
        'NoSpecialChars123', // no special chars
      ];

      for (const password of weakPasswords) {
        await expect(service.hashPassword(password)).rejects.toThrow(BadRequestException);
      }
    });

    it('should accept strong passwords', async () => {
      const strongPassword = 'SecurePass123!';
      const result = await service.hashPassword(strongPassword);
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });
  });

  describe('getUserStats', () => {
    it('should return user statistics for admin', async () => {
      const mockStats = {
        total: 10,
        active: 8,
        inactive: 2,
        byRole: [
          { role: UserRole.EMPLOYEE, count: 7 },
          { role: UserRole.MANAGER, count: 2 },
          { role: UserRole.COMPANY_ADMIN, count: 1 },
        ],
        recentLogins: 5,
      };
      userRepository.getStats.mockResolvedValue(mockStats);

      const result = await service.getUserStats();

      expect(userRepository.getStats).toHaveBeenCalled();
      expect(result).toEqual(mockStats);
    });

    it('should throw ForbiddenException for non-admin users', async () => {
      tenantContext.getUserRole.mockReturnValue(UserRole.EMPLOYEE);

      await expect(service.getUserStats()).rejects.toThrow(ForbiddenException);
    });
  });
});
