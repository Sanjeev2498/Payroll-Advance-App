import { Injectable } from '@nestjs/common';
import { TenantAwareRepository } from '../tenant-aware.repository';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantContextService } from '../tenant-context.service';
import { ClientUser, Prisma, ClientUserRole } from '@prisma/client';

export interface CreateClientUserDto {
  clientId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: ClientUserRole;
  phone?: string;
  jobTitle?: string;
  department?: string;
  permissions?: any;
  preferences?: any;
}

export interface UpdateClientUserDto {
  email?: string;
  firstName?: string;
  lastName?: string;
  role?: ClientUserRole;
  phone?: string;
  jobTitle?: string;
  department?: string;
  permissions?: any;
  preferences?: any;
  isActive?: boolean;
}

export interface ClientUserSearchFilters {
  search?: string;
  role?: ClientUserRole;
  clientId?: string;
  isActive?: boolean;
  department?: string;
}

@Injectable()
export class ClientUserRepository extends TenantAwareRepository {
  constructor(
    protected readonly prisma: PrismaService,
    protected readonly tenantContext: TenantContextService,
  ) {
    super(prisma, tenantContext);
  }

  /**
   * Create a new client user
   */
  async create(data: CreateClientUserDto): Promise<ClientUser> {
    this.logOperation('CREATE', 'ClientUser');

    // Verify client exists and belongs to current tenant
    const client = await this.prisma.client.findFirst({
      where: {
        id: data.clientId,
        companyId: this.tenantContext.getTenantId(),
      },
    });

    if (!client) {
      throw new Error('Client not found or access denied');
    }

    // Check if email already exists for this client
    const existingUser = await this.prisma.clientUser.findFirst({
      where: {
        email: data.email,
        client: {
          companyId: this.tenantContext.getTenantId(),
        },
      },
    });

    if (existingUser) {
      throw new Error('Email address already exists');
    }

    const createData: Prisma.ClientUserCreateInput = {
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      role: data.role,
      phone: data.phone,
      jobTitle: data.jobTitle,
      department: data.department,
      permissions: data.permissions as Prisma.JsonValue,
      preferences: data.preferences as Prisma.JsonValue,
      invitedAt: new Date(),
      client: {
        connect: { id: data.clientId },
      },
    };

    return this.writeWithTenant(() =>
      this.prisma.clientUser.create({
        data: createData,
        include: {
          client: {
            select: {
              id: true,
              name: true,
              organizationType: true,
            },
          },
        },
      }),
    );
  }

  /**
   * Find client user by ID with tenant isolation
   */
  async findById(id: string): Promise<ClientUser | null> {
    this.logOperation('READ', 'ClientUser', id);

    return this.findWithTenant(() =>
      this.prisma.clientUser.findFirst({
        where: {
          id,
          client: {
            companyId: this.tenantContext.getTenantId(),
          },
        },
        include: {
          client: {
            select: {
              id: true,
              name: true,
              organizationType: true,
              contactEmail: true,
            },
          },
        },
      }),
    );
  }

  /**
   * Find client user by email
   */
  async findByEmail(email: string, clientId?: string): Promise<ClientUser | null> {
    this.logOperation('READ', 'ClientUser', `email:${email}`);

    const where: Prisma.ClientUserWhereInput = {
      email,
      client: {
        companyId: this.tenantContext.getTenantId(),
        ...(clientId && { id: clientId }),
      },
    };

    return this.findWithTenant(() =>
      this.prisma.clientUser.findFirst({
        where,
        include: {
          client: {
            select: {
              id: true,
              name: true,
              organizationType: true,
            },
          },
        },
      }),
    );
  }

  /**
   * Update client user by ID
   */
  async update(id: string, data: UpdateClientUserDto): Promise<ClientUser> {
    this.logOperation('UPDATE', 'ClientUser', id);

    // First verify the user exists and belongs to the current tenant
    const existing = await this.findById(id);
    if (!existing) {
      throw new Error(`Client user with ID ${id} not found`);
    }

    // Check email uniqueness if email is being updated
    if (data.email && data.email !== existing.email) {
      const existingEmail = await this.findByEmail(data.email);
      if (existingEmail) {
        throw new Error('Email address already exists');
      }
    }

    const updateData: Prisma.ClientUserUpdateInput = {
      ...(data.email && { email: data.email }),
      ...(data.firstName && { firstName: data.firstName }),
      ...(data.lastName && { lastName: data.lastName }),
      ...(data.role && { role: data.role }),
      ...(data.phone && { phone: data.phone }),
      ...(data.jobTitle && { jobTitle: data.jobTitle }),
      ...(data.department && { department: data.department }),
      ...(data.permissions && { permissions: data.permissions as Prisma.JsonValue }),
      ...(data.preferences && { preferences: data.preferences as Prisma.JsonValue }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
    };

    // Set activation timestamp if user is being activated
    if (data.isActive === true && !existing.activatedAt) {
      updateData.activatedAt = new Date();
    }

    return this.writeWithTenant(() =>
      this.prisma.clientUser.update({
        where: { id },
        data: updateData,
        include: {
          client: {
            select: {
              id: true,
              name: true,
              organizationType: true,
            },
          },
        },
      }),
    );
  }

  /**
   * Deactivate client user
   */
  async deactivate(id: string): Promise<ClientUser> {
    this.logOperation('DEACTIVATE', 'ClientUser', id);

    return this.update(id, { isActive: false });
  }

  /**
   * Find client users with search and filtering
   */
  async findMany(
    filters: ClientUserSearchFilters = {},
    page?: number,
    limit?: number,
    sortBy?: keyof ClientUser,
    sortOrder?: 'asc' | 'desc',
  ): Promise<{
    users: (ClientUser & { client: any })[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    this.logOperation('LIST', 'ClientUser');

    const pagination = this.getPaginationParams(page, limit);
    const sorting = this.getSortingParams(sortBy, sortOrder);

    const where: Prisma.ClientUserWhereInput = {
      client: {
        companyId: this.tenantContext.getTenantId(),
      },
      ...this.buildClientUserSearchFilter(filters),
    };

    const [users, total] = await Promise.all([
      this.findWithTenant(() =>
        this.prisma.clientUser.findMany({
          where,
          include: {
            client: {
              select: {
                id: true,
                name: true,
                organizationType: true,
              },
            },
          },
          orderBy: sorting,
          skip: pagination.skip,
          take: pagination.take,
        }),
      ) as Promise<(ClientUser & { client: any })[]>,
      this.findWithTenant(() => this.prisma.clientUser.count({ where })) as Promise<number>,
    ]);

    return {
      users,
      total,
      page: page || 1,
      limit: limit || 20,
      totalPages: Math.ceil(total / (limit || 20)),
    };
  }

  /**
   * Find client users by client ID
   */
  async findByClientId(clientId: string): Promise<ClientUser[]> {
    this.logOperation('SEARCH', 'ClientUser', `client:${clientId}`);

    return this.findWithTenant(() =>
      this.prisma.clientUser.findMany({
        where: {
          clientId,
          client: {
            companyId: this.tenantContext.getTenantId(),
          },
        },
        orderBy: [
          { role: 'asc' },
          { lastName: 'asc' },
          { firstName: 'asc' },
        ],
      }),
    );
  }

  /**
   * Find client users by role
   */
  async findByRole(role: ClientUserRole): Promise<ClientUser[]> {
    this.logOperation('SEARCH', 'ClientUser', `role:${role}`);

    return this.findWithTenant(() =>
      this.prisma.clientUser.findMany({
        where: {
          role,
          client: {
            companyId: this.tenantContext.getTenantId(),
          },
        },
        include: {
          client: {
            select: {
              id: true,
              name: true,
              organizationType: true,
            },
          },
        },
        orderBy: { lastName: 'asc' },
      }),
    );
  }

  /**
   * Get client user statistics
   */
  async getClientUserStats(): Promise<{
    total: number;
    active: number;
    inactive: number;
    byRole: Record<string, number>;
    byClient: Record<string, number>;
    invitationsSent: number;
    pendingActivations: number;
  }> {
    this.logOperation('STATS', 'ClientUser');

    const [
      total,
      active,
      inactive,
      byRole,
      byClient,
      invitationsSent,
      pendingActivations,
    ] = await Promise.all([
      this.findWithTenant(() =>
        this.prisma.clientUser.count({
          where: {
            client: { companyId: this.tenantContext.getTenantId() },
          },
        }),
      ) as Promise<number>,
      this.findWithTenant(() =>
        this.prisma.clientUser.count({
          where: {
            client: { companyId: this.tenantContext.getTenantId() },
            isActive: true,
          },
        }),
      ) as Promise<number>,
      this.findWithTenant(() =>
        this.prisma.clientUser.count({
          where: {
            client: { companyId: this.tenantContext.getTenantId() },
            isActive: false,
          },
        }),
      ) as Promise<number>,
      this.findWithTenant(() =>
        this.prisma.clientUser.groupBy({
          by: ['role'],
          where: {
            client: { companyId: this.tenantContext.getTenantId() },
          },
          _count: true,
        }),
      ),
      this.findWithTenant(() =>
        this.prisma.clientUser.groupBy({
          by: ['clientId'],
          where: {
            client: { companyId: this.tenantContext.getTenantId() },
          },
          _count: true,
        }),
      ),
      this.findWithTenant(() =>
        this.prisma.clientUser.count({
          where: {
            client: { companyId: this.tenantContext.getTenantId() },
            invitedAt: { not: null },
          },
        }),
      ) as Promise<number>,
      this.findWithTenant(() =>
        this.prisma.clientUser.count({
          where: {
            client: { companyId: this.tenantContext.getTenantId() },
            invitedAt: { not: null },
            activatedAt: null,
            isActive: true,
          },
        }),
      ) as Promise<number>,
    ]);

    // Convert role stats to record
    const roleStats: Record<string, number> = {};
    (byRole as any[]).forEach((item) => {
      roleStats[item.role] = item._count;
    });

    // Convert client stats to record (using client names)
    const clientStats: Record<string, number> = {};
    (byClient as any[]).forEach((item) => {
      clientStats[item.clientId] = item._count;
    });

    return {
      total,
      active,
      inactive,
      byRole: roleStats,
      byClient: clientStats,
      invitationsSent,
      pendingActivations,
    };
  }

  /**
   * Build search filter for client user queries
   */
  private buildClientUserSearchFilter(filters: ClientUserSearchFilters): Prisma.ClientUserWhereInput {
    const conditions: Prisma.ClientUserWhereInput[] = [];

    // Text search across name and email
    if (filters.search) {
      conditions.push({
        OR: [
          { firstName: { contains: filters.search, mode: 'insensitive' } },
          { lastName: { contains: filters.search, mode: 'insensitive' } },
          { email: { contains: filters.search, mode: 'insensitive' } },
          { jobTitle: { contains: filters.search, mode: 'insensitive' } },
        ],
      });
    }

    // Role filter
    if (filters.role) {
      conditions.push({
        role: filters.role,
      });
    }

    // Client filter
    if (filters.clientId) {
      conditions.push({
        clientId: filters.clientId,
      });
    }

    // Active status filter
    if (filters.isActive !== undefined) {
      conditions.push({
        isActive: filters.isActive,
      });
    }

    // Department filter
    if (filters.department) {
      conditions.push({
        department: {
          contains: filters.department,
          mode: 'insensitive',
        },
      });
    }

    return conditions.length > 0 ? { AND: conditions } : {};
  }

  /**
   * Update user permissions
   */
  async updatePermissions(id: string, permissions: any): Promise<ClientUser> {
    this.logOperation('PERMISSIONS', 'ClientUser', id);

    return this.update(id, { permissions });
  }

  /**
   * Update user preferences
   */
  async updatePreferences(id: string, preferences: any): Promise<ClientUser> {
    this.logOperation('PREFERENCES', 'ClientUser', id);

    return this.update(id, { preferences });
  }

  /**
   * Record user login
   */
  async recordLogin(id: string): Promise<ClientUser> {
    this.logOperation('LOGIN', 'ClientUser', id);

    return this.writeWithTenant(() =>
      this.prisma.clientUser.update({
        where: { id },
        data: {
          lastLoginAt: new Date(),
        },
      }),
    );
  }

  /**
   * Send invitation to client user
   */
  async sendInvitation(id: string): Promise<ClientUser> {
    this.logOperation('INVITE', 'ClientUser', id);

    return this.writeWithTenant(() =>
      this.prisma.clientUser.update({
        where: { id },
        data: {
          invitedAt: new Date(),
        },
        include: {
          client: {
            select: {
              id: true,
              name: true,
              organizationType: true,
            },
          },
        },
      }),
    );
  }

  /**
   * Activate client user account
   */
  async activate(id: string): Promise<ClientUser> {
    this.logOperation('ACTIVATE', 'ClientUser', id);

    return this.writeWithTenant(() =>
      this.prisma.clientUser.update({
        where: { id },
        data: {
          isActive: true,
          activatedAt: new Date(),
        },
      }),
    );
  }
}