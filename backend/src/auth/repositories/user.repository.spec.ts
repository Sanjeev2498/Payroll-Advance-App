import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { UserRepository } from './user.repository';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantContextService } from '../../common/tenant-context.service';

describe('UserRepository', () => {
  let repository: UserRepository;
  let prisma: jest.Mocked<PrismaService>;
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
    company: {
      id: mockTenantId,
      name: 'Test Company',
      slug: 'test-company',
    },
  };

  const mockPrismaUser = {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    groupBy: jest.fn(),
  };

  const mockPrismaCompany = {
    findUnique: jest.fn(),
  };

  beforeEach(async () => {
    const mockPrisma = {
      user: mockPrismaUser,
      company: mockPrismaCompany,
      withTenant: jest.fn((tenantId, fn) => fn(mockPrisma)),
      withSystemContext: jest.fn((fn) => fn(mockPrisma)),
    };

    const mockTenantContext = {
      getTenantId: jest.fn(() => mockTenantId),
      getUserId: jest.fn(() => mockUserId),
      getUserRole: jest.fn(() => UserRole.COMPANY_ADMIN),
      getContextSnapshot: jest.fn(() => `Context[tenant:${mockTenantId},user:${mockUserId},role:${UserRole.COMPANY_ADMIN},set:true]`),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserRepository,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
        {
          provide: TenantContextService,
          useValue: mockTenantContext,
        },
      ],
    }).compile();

    repository = module.get<UserRepository>(UserRepository);
    prisma = module.get(PrismaService) as jest.Mocked<PrismaService>;
    tenantContext = module.get(TenantContextService) as jest.Mocked<TenantContextService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('create', () => {
    const createUserDto = {
      email: 'newuser@example.com',
      firstName: 'Jane',
      lastName: 'Smith',
      password: 'SecurePass123!',
      role: UserRole.EMPLOYEE,
    };

    it('should create a user successfully', async () => {
      mockPrismaUser.findUnique.mockResolvedValue(null); // Email not exists
      mockPrismaCompany.findUnique.mockResolvedValue({ id: mockTenantId, name: 'Test Company' });
      mockPrismaUser.create.mockResolvedValue(mockUser);

      const result = await repository.create(createUserDto, 'hashed-password');

      expect(mockPrismaUser.findUnique).toHaveBeenCalledWith({
        where: { email: createUserDto.email },
      });
      expect(mockPrismaCompany.findUnique).toHaveBeenCalledWith({
        where: { id: mockTenantId },
      });
      expect(mockPrismaUser.create).toHaveBeenCalledWith({
        data: {
          email: createUserDto.email,
          firstName: createUserDto.firstName,
          lastName: createUserDto.lastName,
          passwordHash: 'hashed-password',
          role: createUserDto.role,
          companyId: mockTenantId,
          isActive: true,
        },
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
      expect(result).toEqual(mockUser);
    });

    it('should throw ConflictException if email already exists', async () => {
      mockPrismaUser.findUnique.mockResolvedValue(mockUser);

      await expect(repository.create(createUserDto, 'hashed-password')).rejects.toThrow(ConflictException);
    });

    it('should throw NotFoundException if company does not exist', async () => {
      mockPrismaUser.findUnique.mockResolvedValue(null);
      mockPrismaCompany.findUnique.mockResolvedValue(null);

      await expect(repository.create(createUserDto, 'hashed-password')).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if trying to create user for different company without SUPER_ADMIN role', async () => {
      const differentCompanyId = 'other-company-123';
      tenantContext.getUserRole.mockReturnValue(UserRole.COMPANY_ADMIN);
      mockPrismaUser.findUnique.mockResolvedValue(null);
      mockPrismaCompany.findUnique.mockResolvedValue({ id: differentCompanyId, name: 'Other Company' });

      await expect(
        repository.create({ ...createUserDto, companyId: differentCompanyId }, 'hashed-password')
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('register', () => {
    const registerUserDto = {
      email: 'register@example.com',
      firstName: 'Register',
      lastName: 'User',
      password: 'SecurePass123!',
      companyId: mockTenantId,
    };

    it('should register a user successfully with system context', async () => {
      mockPrismaUser.findUnique.mockResolvedValue(null);
      mockPrismaCompany.findUnique.mockResolvedValue({ id: mockTenantId, name: 'Test Company' });
      mockPrismaUser.create.mockResolvedValue({ ...mockUser, role: UserRole.EMPLOYEE });

      const result = await repository.register(registerUserDto, 'hashed-password');

      expect(prisma.withSystemContext).toHaveBeenCalled();
      expect(mockPrismaUser.create).toHaveBeenCalledWith({
        data: {
          email: registerUserDto.email,
          firstName: registerUserDto.firstName,
          lastName: registerUserDto.lastName,
          passwordHash: 'hashed-password',
          role: UserRole.EMPLOYEE, // Default role for registration
          companyId: registerUserDto.companyId,
          isActive: true,
        },
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
      expect(result.role).toBe(UserRole.EMPLOYEE);
    });
  });

  describe('findAll', () => {
    const filters = {
      page: 1,
      limit: 20,
      search: 'john',
      role: UserRole.EMPLOYEE,
      isActive: true,
    };

    it('should find users with filters and pagination', async () => {
      const users = [mockUser];
      const total = 1;
      mockPrismaUser.findMany.mockResolvedValue(users);
      mockPrismaUser.count.mockResolvedValue(total);

      const result = await repository.findAll(filters);

      expect(mockPrismaUser.findMany).toHaveBeenCalledWith({
        where: {
          companyId: mockTenantId,
          OR: [
            { firstName: { contains: 'john', mode: 'insensitive' } },
            { lastName: { contains: 'john', mode: 'insensitive' } },
            { email: { contains: 'john', mode: 'insensitive' } },
          ],
          role: UserRole.EMPLOYEE,
          isActive: true,
        },
        skip: 0,
        take: 20,
        orderBy: { created_at: 'desc' },
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
      expect(mockPrismaUser.count).toHaveBeenCalledWith({
        where: expect.objectContaining({
          companyId: mockTenantId,
        }),
      });
      expect(result).toEqual({ users, total });
    });

    it('should find users without search filters', async () => {
      const simpleFilters = { page: 1, limit: 20 };
      const users = [mockUser];
      const total = 1;
      mockPrismaUser.findMany.mockResolvedValue(users);
      mockPrismaUser.count.mockResolvedValue(total);

      const result = await repository.findAll(simpleFilters);

      expect(mockPrismaUser.findMany).toHaveBeenCalledWith({
        where: {
          companyId: mockTenantId,
        },
        skip: 0,
        take: 20,
        orderBy: { created_at: 'desc' },
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
  });

  describe('findById', () => {
    it('should find user by id within tenant context', async () => {
      mockPrismaUser.findFirst.mockResolvedValue(mockUser);

      const result = await repository.findById(mockUserId);

      expect(mockPrismaUser.findFirst).toHaveBeenCalledWith({
        where: {
          id: mockUserId,
          companyId: mockTenantId,
        },
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
      expect(result).toEqual(mockUser);
    });

    it('should return null if user not found or not in tenant', async () => {
      mockPrismaUser.findFirst.mockResolvedValue(null);

      const result = await repository.findById('non-existent-id');

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    const updateUserDto = {
      firstName: 'Updated',
      lastName: 'Name',
      email: 'updated@example.com',
    };

    it('should update user successfully', async () => {
      mockPrismaUser.findFirst.mockResolvedValue(mockUser);
      mockPrismaUser.findUnique.mockResolvedValue(null); // Email not taken
      const updatedUser = { ...mockUser, ...updateUserDto };
      mockPrismaUser.update.mockResolvedValue(updatedUser);

      const result = await repository.update(mockUserId, updateUserDto);

      expect(mockPrismaUser.update).toHaveBeenCalledWith({
        where: { id: mockUserId },
        data: updateUserDto,
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
      expect(result).toEqual(updatedUser);
    });

    it('should throw NotFoundException if user not found', async () => {
      mockPrismaUser.findFirst.mockResolvedValue(null);

      await expect(repository.update('non-existent-id', updateUserDto)).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if email already taken by another user', async () => {
      const otherUser = { ...mockUser, id: 'other-user', email: 'updated@example.com' };
      mockPrismaUser.findFirst.mockResolvedValue(mockUser);
      mockPrismaUser.findUnique.mockResolvedValue(otherUser);

      await expect(repository.update(mockUserId, updateUserDto)).rejects.toThrow(ConflictException);
    });
  });

  describe('delete', () => {
    it('should soft delete user by setting isActive to false', async () => {
      mockPrismaUser.findFirst.mockResolvedValue(mockUser);
      const deactivatedUser = { ...mockUser, isActive: false };
      mockPrismaUser.update.mockResolvedValue(deactivatedUser);

      const result = await repository.delete(mockUserId);

      expect(mockPrismaUser.update).toHaveBeenCalledWith({
        where: { id: mockUserId },
        data: { isActive: false },
      });
      expect(result).toEqual(deactivatedUser);
    });

    it('should throw NotFoundException if user not found', async () => {
      mockPrismaUser.findFirst.mockResolvedValue(null);

      await expect(repository.delete('non-existent-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getStats', () => {
    it('should return user statistics within tenant context', async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      mockPrismaUser.count
        .mockResolvedValueOnce(10) // total
        .mockResolvedValueOnce(8) // active
        .mockResolvedValueOnce(3); // recent logins

      mockPrismaUser.groupBy.mockResolvedValue([
        { role: UserRole.EMPLOYEE, _count: { role: 7 } },
        { role: UserRole.MANAGER, _count: { role: 2 } },
        { role: UserRole.COMPANY_ADMIN, _count: { role: 1 } },
      ]);

      const result = await repository.getStats();

      expect(result).toEqual({
        total: 10,
        active: 8,
        inactive: 2,
        byRole: [
          { role: UserRole.EMPLOYEE, count: 7 },
          { role: UserRole.MANAGER, count: 2 },
          { role: UserRole.COMPANY_ADMIN, count: 1 },
        ],
        recentLogins: 3,
      });
    });
  });

  describe('exists', () => {
    it('should return true if user exists in tenant context', async () => {
      mockPrismaUser.findFirst.mockResolvedValue({ id: mockUserId });

      const result = await repository.exists(mockUserId);

      expect(mockPrismaUser.findFirst).toHaveBeenCalledWith({
        where: {
          id: mockUserId,
          companyId: mockTenantId,
        },
        select: { id: true },
      });
      expect(result).toBe(true);
    });

    it('should return false if user does not exist in tenant context', async () => {
      mockPrismaUser.findFirst.mockResolvedValue(null);

      const result = await repository.exists('non-existent-id');

      expect(result).toBe(false);
    });
  });
});