import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException, ForbiddenException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';

// Mock bcrypt
jest.mock('bcryptjs', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;
  let prismaService: PrismaService;
  let jwtService: JwtService;
  let configService: ConfigService;

  const mockUser = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    role: 'EMPLOYEE',
    companyId: '123e4567-e89b-12d3-a456-426614174001',
    passwordHash: 'hashedpassword',
    isActive: true,
    company: {
      id: '123e4567-e89b-12d3-a456-426614174001',
      name: 'Test Company',
      slug: 'test-company',
    },
  };

  const mockAuthenticatedUser = {
    id: mockUser.id,
    email: mockUser.email,
    firstName: mockUser.firstName,
    lastName: mockUser.lastName,
    role: mockUser.role,
    companyId: mockUser.companyId,
    isActive: mockUser.isActive,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              findUnique: jest.fn(),
              findFirst: jest.fn(),
              update: jest.fn(),
            },
          },
        },
        {
          provide: JwtService,
          useValue: {
            signAsync: jest.fn(),
            verify: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config = {
                JWT_SECRET: 'test-secret',
                JWT_REFRESH_SECRET: 'test-refresh-secret',
              };
              return config[key];
            }),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prismaService = module.get<PrismaService>(PrismaService);
    jwtService = module.get<JwtService>(JwtService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validateUser', () => {
    it('should return user data when credentials are valid', async () => {
      // Arrange
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      // Act
      const result = await service.validateUser('test@example.com', 'password123');

      // Assert
      expect(result).toEqual(mockAuthenticatedUser);
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
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
    });

    it('should return null when user does not exist', async () => {
      // Arrange
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);

      // Act
      const result = await service.validateUser('nonexistent@example.com', 'password123');

      // Assert
      expect(result).toBeNull();
    });

    it('should throw ForbiddenException when user is not active', async () => {
      // Arrange
      const inactiveUser = { ...mockUser, isActive: false };
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(inactiveUser);

      // Act & Assert
      await expect(service.validateUser('test@example.com', 'password123')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should return null when password is invalid', async () => {
      // Arrange
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      // Act
      const result = await service.validateUser('test@example.com', 'wrongpassword');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('login', () => {
    it('should return auth response when credentials are valid', async () => {
      // Arrange
      const loginDto = { email: 'test@example.com', password: 'password123' };
      const mockTokens = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        expiresIn: 900,
      };

      jest.spyOn(service, 'validateUser').mockResolvedValue(mockAuthenticatedUser);
      (prismaService.user.update as jest.Mock).mockResolvedValue(mockUser);
      (jwtService.signAsync as jest.Mock)
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token');

      // Act
      const result = await service.login(loginDto);

      // Assert
      expect(result).toEqual({
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
          tokens: mockTokens,
        },
        message: 'Login successful',
      });

      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: { lastLoginAt: expect.any(Date) },
      });
    });

    it('should throw UnauthorizedException when credentials are invalid', async () => {
      // Arrange
      const loginDto = { email: 'test@example.com', password: 'wrongpassword' };
      jest.spyOn(service, 'validateUser').mockResolvedValue(null);

      // Act & Assert
      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refreshToken', () => {
    it('should return new tokens when refresh token is valid', async () => {
      // Arrange
      const refreshToken = 'valid-refresh-token';
      const mockPayload = {
        sub: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
        companyId: mockUser.companyId,
        type: 'refresh' as const,
      };

      (jwtService.verify as jest.Mock).mockReturnValue(mockPayload);
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(mockUser);
      (jwtService.signAsync as jest.Mock)
        .mockResolvedValueOnce('new-access-token')
        .mockResolvedValueOnce('new-refresh-token');

      // Act
      const result = await service.refreshToken(refreshToken);

      // Assert
      expect(result).toEqual({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        expiresIn: 900,
      });
    });

    it('should throw UnauthorizedException when refresh token is invalid', async () => {
      // Arrange
      const refreshToken = 'invalid-refresh-token';
      (jwtService.verify as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      // Act & Assert
      await expect(service.refreshToken(refreshToken)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when token type is not refresh', async () => {
      // Arrange
      const refreshToken = 'access-token-used-as-refresh';
      const mockPayload = {
        sub: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
        companyId: mockUser.companyId,
        type: 'access' as const,
      };

      (jwtService.verify as jest.Mock).mockReturnValue(mockPayload);

      // Act & Assert
      await expect(service.refreshToken(refreshToken)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('logout', () => {
    it('should return success response', async () => {
      // Act
      const result = await service.logout('user-id');

      // Assert
      expect(result).toEqual({
        success: true,
        message: 'Logout successful',
      });
    });
  });

  describe('changePassword', () => {
    it('should successfully change password when current password is correct', async () => {
      // Arrange
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (bcrypt.hash as jest.Mock).mockResolvedValue('new-hashed-password');
      (prismaService.user.update as jest.Mock).mockResolvedValue(mockUser);

      // Act
      const result = await service.changePassword('user-id', 'oldpassword', 'newpassword123');

      // Assert
      expect(result).toEqual({
        success: true,
        message: 'Password changed successfully',
      });

      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-id' },
        data: { passwordHash: 'new-hashed-password' },
      });
    });

    it('should throw UnauthorizedException when user not found', async () => {
      // Arrange
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.changePassword('user-id', 'oldpassword', 'newpassword123'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when current password is incorrect', async () => {
      // Arrange
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      // Act & Assert
      await expect(
        service.changePassword('user-id', 'wrongpassword', 'newpassword123'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw BadRequestException when new password is too short', async () => {
      // Arrange
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      // Act & Assert
      await expect(service.changePassword('user-id', 'oldpassword', '12345')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('hashPassword', () => {
    it('should hash password', async () => {
      // Arrange
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');

      // Act
      const result = await service.hashPassword('password123');

      // Assert
      expect(result).toBe('hashed-password');
      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 12);
    });
  });
});
