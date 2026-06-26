import { Test, TestingModule } from '@nestjs/testing';
import { UserManagementController } from './user-management.controller';
import { UserManagementService } from '../services/user-management.service';
import { UserRole } from '@prisma/client';
import { CreateUserDto } from '../dto/create-user.dto';
import { UserFilterDto } from '../dto/user-filter.dto';

describe('UserManagementController', () => {
  let controller: UserManagementController;
  let userManagementService: jest.Mocked<UserManagementService>;

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    role: UserRole.EMPLOYEE,
    companyId: 'company-123',
    isActive: true,
    lastLoginAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockUserManagementService = {
    createUser: jest.fn(),
    createUserWithTempPassword: jest.fn(),
    registerUser: jest.fn(),
    findAllUsers: jest.fn(),
    findUserById: jest.fn(),
    updateUser: jest.fn(),
    updateUserProfile: jest.fn(),
    changePassword: jest.fn(),
    resetUserPassword: jest.fn(),
    deactivateUser: jest.fn(),
    reactivateUser: jest.fn(),
    deleteUser: jest.fn(),
    getUserStats: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserManagementController],
      providers: [
        {
          provide: UserManagementService,
          useValue: mockUserManagementService,
        },
      ],
    }).compile();

    controller = module.get<UserManagementController>(UserManagementController);
    userManagementService = module.get(UserManagementService) as jest.Mocked<UserManagementService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createUser', () => {
    it('should create a user successfully', async () => {
      const createUserDto: CreateUserDto = {
        email: 'newuser@example.com',
        firstName: 'Jane',
        lastName: 'Smith',
        password: 'SecurePass123!',
        role: UserRole.EMPLOYEE,
      };

      userManagementService.createUser.mockResolvedValue({
        user: mockUser,
      });

      const result = await controller.createUser(createUserDto);

      expect(userManagementService.createUser).toHaveBeenCalledWith(createUserDto);
      expect(result).toEqual({
        success: true,
        data: { user: mockUser },
        message: 'User created successfully',
      });
    });
  });

  describe('createUserWithTempPassword', () => {
    it('should create user with temporary password', async () => {
      const createUserDto = {
        email: 'newuser@example.com',
        firstName: 'Jane',
        lastName: 'Smith',
        role: UserRole.EMPLOYEE,
      };

      userManagementService.createUserWithTempPassword.mockResolvedValue({
        user: mockUser,
        temporaryPassword: 'TempPass123!',
      });

      const result = await controller.createUserWithTempPassword(createUserDto);

      expect(userManagementService.createUserWithTempPassword).toHaveBeenCalledWith(createUserDto);
      expect(result).toEqual({
        success: true,
        data: { user: mockUser, temporaryPassword: 'TempPass123!' },
        message: 'User created successfully with temporary password',
      });
    });
  });

  describe('getAllUsers', () => {
    it('should return paginated users', async () => {
      const filters: UserFilterDto = { page: 1, limit: 20 };
      const users = [mockUser];
      const total = 1;

      userManagementService.findAllUsers.mockResolvedValue({ users, total });

      const result = await controller.getAllUsers(filters);

      expect(userManagementService.findAllUsers).toHaveBeenCalledWith(filters);
      expect(result).toEqual({
        success: true,
        data: users,
        metadata: {
          total: 1,
          page: 1,
          limit: 20,
          totalPages: 1,
          hasNext: false,
          hasPrevious: false,
        },
      });
    });
  });

  describe('getUserById', () => {
    it('should return user by ID', async () => {
      const userId = 'user-123';
      userManagementService.findUserById.mockResolvedValue(mockUser);

      const result = await controller.getUserById(userId);

      expect(userManagementService.findUserById).toHaveBeenCalledWith(userId);
      expect(result).toEqual({
        success: true,
        data: mockUser,
      });
    });
  });

  describe('updateUser', () => {
    it('should update user successfully', async () => {
      const userId = 'user-123';
      const updateUserDto = {
        firstName: 'Updated',
        lastName: 'Name',
      };
      const updatedUser = { ...mockUser, ...updateUserDto };

      userManagementService.updateUser.mockResolvedValue(updatedUser);

      const result = await controller.updateUser(userId, updateUserDto);

      expect(userManagementService.updateUser).toHaveBeenCalledWith(userId, updateUserDto);
      expect(result).toEqual({
        success: true,
        data: updatedUser,
        message: 'User updated successfully',
      });
    });
  });

  describe('changeUserPassword', () => {
    it('should change user password', async () => {
      const userId = 'user-123';
      const changePasswordDto = {
        currentPassword: 'oldpass123',
        newPassword: 'NewSecurePass123!',
      };
      const mockResponse = {
        success: true,
        message: 'Password changed successfully',
      };

      userManagementService.changePassword.mockResolvedValue(mockResponse);

      const result = await controller.changeUserPassword(userId, changePasswordDto);

      expect(userManagementService.changePassword).toHaveBeenCalledWith(userId, changePasswordDto);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('deactivateUser', () => {
    it('should deactivate user successfully', async () => {
      const userId = 'user-123';
      const deactivatedUser = { ...mockUser, isActive: false };

      userManagementService.deactivateUser.mockResolvedValue(deactivatedUser);

      const result = await controller.deactivateUser(userId);

      expect(userManagementService.deactivateUser).toHaveBeenCalledWith(userId);
      expect(result).toEqual({
        success: true,
        data: deactivatedUser,
        message: 'User deactivated successfully',
      });
    });
  });

  describe('deleteUser', () => {
    it('should delete user successfully', async () => {
      const userId = 'user-123';
      const mockResponse = {
        success: true,
        message: 'User deleted successfully',
      };

      userManagementService.deleteUser.mockResolvedValue(mockResponse);

      const result = await controller.deleteUser(userId);

      expect(userManagementService.deleteUser).toHaveBeenCalledWith(userId);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getUserStats', () => {
    it('should return user statistics', async () => {
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

      userManagementService.getUserStats.mockResolvedValue(mockStats);

      const result = await controller.getUserStats();

      expect(userManagementService.getUserStats).toHaveBeenCalled();
      expect(result).toEqual({
        success: true,
        data: mockStats,
      });
    });
  });
});