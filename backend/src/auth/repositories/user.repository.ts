import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { users, UserRole, Prisma } from '@prisma/client';
import { TenantAwareRepository } from '../../common/tenant-aware.repository';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantContextService } from '../../common/tenant-context.service';
import { CreateUserDto, RegisterUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { UserFilterDto } from '../dto/user-filter.dto';
import { UserStatsDto } from '../dto/user-response.dto';

@Injectable()
export class UserRepository extends TenantAwareRepository {
  constructor(prisma: PrismaService, tenantContext: TenantContextService) {
    super(prisma, tenantContext);
  }

  /**
   * Override getTenantFilter to use snake_case field name for users table
   */
  protected getTenantFilter(): any {
    const tenantId = this.tenantContext.getTenantId();
    return { company_id: tenantId };
  }

  async create(createusersDto: CreateUserDto, passwordHash: string): Promise<users> {
    this.logOperation('CREATE', 'users');

    return this.writeWithTenant(async () => {
      // Use the provided companyId or get from tenant context
      const companyId = createusersDto.companyId || this.tenantContext.getTenantId();

      // Check if user with this email already exists
      const existingusers = await this.prisma.user.findUnique({
        where: { email: createusersDto.email },
      });

      if (existingusers) {
        throw new ConflictException('users with this email already exists');
      }

      // Verify company exists and user has permission to create users for this company
      const company = await this.prisma.companies.findUnique({
        where: { id: companyId },
      });

      if (!company) {
        throw new NotFoundException('Company not found');
      }

      // For non-system operations, ensure company matches tenant context
      const currentTenantId = this.tenantContext.getTenantId();
      if (companyId !== currentTenantId) {
        // Only SUPER_ADMIN can create users for other companies
        const currentUserRole = this.tenantContext.getUserRole();
        if (currentUserRole !== UserRole.SUPER_ADMIN) {
          throw new ConflictException('Cannot create user for different company');
        }
      }

      return this.prisma.user.create({
        data: {
          email: createusersDto.email,
          firstName: createusersDto.firstName,
          lastName: createusersDto.lastName,
          passwordHash,
          role: createusersDto.role,
          companyId,
          is_active: true,
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
    });
  }

  async register(registerusersDto: RegisterUserDto, passwordHash: string): Promise<users> {
    this.logOperation('REGISTER', 'users');

    return this.executeWithSystemContext(async () => {
      // Check if user with this email already exists
      const existingusers = await this.prisma.user.findUnique({
        where: { email: registerusersDto.email },
      });

      if (existingusers) {
        throw new ConflictException('users with this email already exists');
      }

      // Verify company exists
      const company = await this.prisma.companies.findUnique({
        where: { id: registerusersDto.companyId },
      });

      if (!company) {
        throw new NotFoundException('Company not found');
      }

      return this.prisma.user.create({
        data: {
          email: registerusersDto.email,
          firstName: registerusersDto.firstName,
          lastName: registerusersDto.lastName,
          passwordHash,
          role: UserRole.EMPLOYEE, // Default role for self-registration
          companyId: registerusersDto.companyId,
          is_active: true,
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
    });
  }

  async findAll(filters: UserFilterDto): Promise<{ users: users[]; total: number }> {
    this.logOperation('FIND_ALL', 'users');

    return this.findWithTenant(async () => {
      const {
        page = 1,
        limit = 20,
        search,
        role,
        isActive,
        sortBy = 'createdAt',
        sortOrder = 'desc',
      } = filters;

      // Build where clause
      const where: Prisma.usersWhereInput = {
        ...this.getTenantFilter(),
      };

      // Add search filter
      if (search) {
        where.OR = [
          { first_name: { contains: search, mode: 'insensitive' } },
          { last_name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ];
      }

      // Add role filter
      if (role) {
        where.role = role;
      }

      // Add active status filter
      if (typeof isActive === 'boolean') {
        where.is_active = isActive;
      }

      const { skip, take } = this.getPaginationParams(page, limit);
      const orderBy = this.getSortingParams(sortBy, sortOrder);

      const [users, total] = await Promise.all([
        this.prisma.user.findMany({
          where,
          skip,
          take,
          orderBy,
          include: {
            company: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        }),
        this.prisma.user.count({ where }),
      ]);

      return { users, total };
    });
  }

  async findById(id: string): Promise<users | null> {
    this.logOperation('FIND_BY_ID', 'users', id);

    return this.findWithTenant(async () => {
      return this.prisma.user.findFirst({
        where: {
          id,
          ...this.getTenantFilter(),
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
    });
  }

  async findByEmail(email: string): Promise<users | null> {
    this.logOperation('FIND_BY_EMAIL', 'users');

    return this.findWithTenant(async () => {
      return this.prisma.user.findFirst({
        where: {
          email,
          ...this.getTenantFilter(),
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
    });
  }

  async update(id: string, updateusersDto: UpdateUserDto): Promise<users> {
    this.logOperation('UPDATE', 'users', id);

    return this.writeWithTenant(async () => {
      // First check if user exists and belongs to tenant
      const existingusers = await this.findById(id);
      if (!existingusers) {
        throw new NotFoundException('users not found');
      }

      // Check email uniqueness if email is being updated
      if (updateusersDto.email && updateusersDto.email !== existingusers.email) {
        const emailExists = await this.prisma.user.findUnique({
          where: { email: updateusersDto.email },
        });

        if (emailExists) {
          throw new ConflictException('Email already in use');
        }
      }

      return this.prisma.user.update({
        where: { id },
        data: updateusersDto,
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
  }

  async updatePassword(id: string, passwordHash: string): Promise<users> {
    this.logOperation('UPDATE_PASSWORD', 'users', id);

    return this.writeWithTenant(async () => {
      // First check if user exists and belongs to tenant
      const existingusers = await this.findById(id);
      if (!existingusers) {
        throw new NotFoundException('users not found');
      }

      return this.prisma.user.update({
        where: { id },
        data: { passwordHash },
      });
    });
  }

  async updateLastLogin(id: string): Promise<void> {
    this.logOperation('UPDATE_LAST_LOGIN', 'users', id);

    await this.writeWithTenant(async () => {
      await this.prisma.user.update({
        where: { id },
        data: { lastLoginAt: new Date() },
      });
    });
  }

  async delete(id: string): Promise<users> {
    this.logOperation('DELETE', 'users', id);

    return this.writeWithTenant(async () => {
      // First check if user exists and belongs to tenant
      const existingusers = await this.findById(id);
      if (!existingusers) {
        throw new NotFoundException('users not found');
      }

      // Soft delete by deactivating the user
      return this.prisma.user.update({
        where: { id },
        data: { isActive: false },
      });
    });
  }

  async getStats(): Promise<UserStatsDto> {
    this.logOperation('GET_STATS', 'users');

    return this.findWithTenant(async () => {
      const tenantFilter = this.getTenantFilter();
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const [total, activeCount, roleStats, recentLoginsCount] = await Promise.all([
        this.prisma.user.count({
          where: tenantFilter,
        }),
        this.prisma.user.count({
          where: {
            ...tenantFilter,
            is_active: true,
          },
        }),
        this.prisma.user.groupBy({
          by: ['role'],
          where: tenantFilter,
          _count: {
            role: true,
          },
        }),
        this.prisma.user.count({
          where: {
            ...tenantFilter,
            lastLoginAt: {
              gte: thirtyDaysAgo,
            },
          },
        }),
      ]);

      return {
        total,
        active: activeCount,
        inactive: total - activeCount,
        byRole: roleStats.map((stat) => ({
          role: stat.role,
          count: stat._count.role,
        })),
        recentLogins: recentLoginsCount,
      };
    });
  }

  async exists(id: string): Promise<boolean> {
    this.logOperation('EXISTS', 'users', id);

    return this.findWithTenant(async () => {
      const user = await this.prisma.user.findFirst({
        where: {
          id,
          ...this.getTenantFilter(),
        },
        select: { id: true },
      });

      return !!user;
    });
  }
}
