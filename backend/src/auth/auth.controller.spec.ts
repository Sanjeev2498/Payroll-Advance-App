import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthenticatedUser } from './interfaces/jwt-payload.interface';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;

  const mockUser: AuthenticatedUser = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    role: 'EMPLOYEE',
    companyId: '123e4567-e89b-12d3-a456-426614174001',
    isActive: true,
  };

  const mockAuthResponse = {
    success: true,
    data: {
      user: {
        id: mockUser.id,
        email: mockUser.email,
        firstName: mockUser.firstName,
        lastName: mockUser.lastName,
        role: mockUser.role,
        companyId: mockUser.companyId,
      },
      tokens: {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        expiresIn: 900,
      },
    },
    message: 'Login successful',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            login: jest.fn(),
            refreshToken: jest.fn(),
            logout: jest.fn(),
            changePassword: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('should return auth response when login is successful', async () => {
      // Arrange
      const loginDto = { email: 'test@example.com', password: 'password123' };
      (authService.login as jest.Mock).mockResolvedValue(mockAuthResponse);

      // Act
      const result = await controller.login(loginDto);

      // Assert
      expect(result).toEqual(mockAuthResponse);
      expect(authService.login).toHaveBeenCalledWith(loginDto);
    });

    it('should throw UnauthorizedException when login fails', async () => {
      // Arrange
      const loginDto = { email: 'test@example.com', password: 'wrongpassword' };
      (authService.login as jest.Mock).mockRejectedValue(
        new UnauthorizedException('Invalid credentials'),
      );

      // Act & Assert
      await expect(controller.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refreshToken', () => {
    it('should return new tokens when refresh is successful', async () => {
      // Arrange
      const refreshToken = 'valid-refresh-token';
      const tokenResponse = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        expiresIn: 900,
      };
      (authService.refreshToken as jest.Mock).mockResolvedValue(tokenResponse);

      // Act
      const result = await controller.refreshToken(refreshToken);

      // Assert
      expect(result).toEqual(tokenResponse);
      expect(authService.refreshToken).toHaveBeenCalledWith(refreshToken);
    });

    it('should throw error when refresh token is missing', async () => {
      // Act & Assert
      await expect(controller.refreshToken('')).rejects.toThrow();
    });
  });

  describe('logout', () => {
    it('should return success response when logout is successful', async () => {
      // Arrange
      const logoutResponse = { success: true, message: 'Logout successful' };
      (authService.logout as jest.Mock).mockResolvedValue(logoutResponse);

      // Act
      const result = await controller.logout(mockUser.id);

      // Assert
      expect(result).toEqual(logoutResponse);
      expect(authService.logout).toHaveBeenCalledWith(mockUser.id);
    });
  });

  describe('changePassword', () => {
    it('should return success response when password change is successful', async () => {
      // Arrange
      const successResponse = { success: true, message: 'Password changed successfully' };
      (authService.changePassword as jest.Mock).mockResolvedValue(successResponse);

      // Act
      const result = await controller.changePassword(mockUser.id, 'oldpassword', 'newpassword123');

      // Assert
      expect(result).toEqual(successResponse);
      expect(authService.changePassword).toHaveBeenCalledWith(
        mockUser.id,
        'oldpassword',
        'newpassword123',
      );
    });
  });

  describe('getProfile', () => {
    it('should return user profile', async () => {
      // Act
      const result = await controller.getProfile(mockUser);

      // Assert
      expect(result).toEqual({
        success: true,
        data: mockUser,
      });
    });
  });

  describe('healthCheck', () => {
    it('should return health status', async () => {
      // Act
      const result = await controller.healthCheck();

      // Assert
      expect(result).toEqual({
        status: 'ok',
        timestamp: expect.any(String),
      });
    });
  });
});
