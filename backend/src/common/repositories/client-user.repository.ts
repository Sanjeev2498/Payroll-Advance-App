import { Injectable } from '@nestjs/common';
import { TenantAwareRepository } from '../tenant-aware.repository';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantContextService } from '../tenant-context.service';
import { clients, client_users, Prisma, ClientUserRole } from '@prisma/client';

export interface Createclient_usersDto {
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

export interface Updateclient_usersDto {
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
  async create(data: Createclient_usersDto): Promise<clients> {
    this.logOperation('CREATE', 'client_users');

    // Verify client exists and belongs to current tenant
    const client = await this.prisma.client.findFirst({
      where: {
        id: data.clientId,
        company_id: this.tenantContext.getTenantId(),
      },
    });

    if (!client) {
      throw new Error('Client not found or access denied');
    }

    // Check if email already exists for this client
    const existingUser = await this.prisma.clientUsers.findFirst({
      where: {
        email: data.email,
        client: {
          company_id: this.tenantContext.getTenantId(),
        },
      },
    });

    if (existingUser) {
      throw new Error('Email address already exists');
    }

    const createData: Prisma.client_usersCreateInput = {
      email: data.email,
      first_name: data.firstName,
      last_name: data.lastName,
      role: data.role,
      phone: data.phone,
      job_title: data.jobTitle,
      department: data.department,
      permissions: data.permissions as Prisma.JsonValue,
      preferences: data.preferences as Prisma.JsonValue,
      invited_at: new Date(),
      updated_at: new Date(),
      client: {
        connect: { id: data.clientId },
      },
    };

    return this.writeWithTenant(() =>
      this.prisma.clientUsers.create({
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
  async findById(id: string): Promise<client_users | null> {
    this.logOperation('READ', 'client_users', id);

    return this.findWithTenant(() =>
      this.prisma.clientUsers.findFirst({
        where: {
          id,
          client: {
            company_id: this.tenantContext.getTenantId(),
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
  async findByEmail(email: string, clientId?: string): Promise<client_users | null> {
    this.logOperation('READ', 'client_users', `email:${email}`);

    const where: Prisma.client_usersWhereInput = {
      email,
      client: {
        company_id: this.tenantContext.getTenantId(),
        ...(clientId && { id: clientId }),
      },
    };

    return this.findWithTenant(() =>
      this.prisma.clientUsers.findFirst({
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
  async update(id: string, data: Updateclient_usersDto): Promise<client_users> {
    this.logOperation('UPDATE', 'client_users', id);

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

    const updateData: Prisma.client_usersUpdateInput = {
      ...(data.email && { email: data.email }),
      ...(data.firstName && { first_name: data.firstName }),
      ...(data.lastName && { last_name: data.lastName }),
      ...(data.role && { role: data.role }),
      ...(data.phone && { phone: data.phone }),
      ...(data.jobTitle && { job_title: data.jobTitle }),
      ...(data.department && { department: data.department }),
      ...(data.permissions && { permissions: data.permissions as Prisma.JsonValue }),
      ...(data.preferences && { preferences: data.preferences as Prisma.JsonValue }),
      ...(data.isActive !== undefined && { is_active: data.isActive }),
    };

    // Set activation timestamp if user is being activated
    if (data.isActive === true && !existing.activated_at) {
      updateData.activated_at = new Date();
    }

    return this.writeWithTenant(() =>
      this.prisma.clientUsers.update({
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
  async deactivate(id: string): Promise<client_users> {
    this.logOperation('DEACTIVATE', 'client_users', id);

    return this.update(id, { isActive: false });
  }

  /**
   * Find client users with search and filtering
   */
  async findMany(
    filters: ClientUserSearchFilters = {},
    page?: number,
    limit?: number,
    sortBy?: keyof client_users,
    sortOrder?: 'asc' | 'desc',
  ): Promise<{
    users: (client_users & { client: any })[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    this.logOperation('LIST', 'client_users');

    const pagination = this.getPaginationParams(page, limit);
    const sorting = this.getSortingParams(sortBy, sortOrder);

    const where: Prisma.client_usersWhereInput = {
      client: {
        company_id: this.tenantContext.getTenantId(),
      },
      ...this.buildclient_usersSearchFilter(filters),
    };

    const [users, total] = await Promise.all([
      this.findWithTenant(() =>
        this.prisma.clientUsers.findMany({
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
      ) as Promise<(client_users & { client: any })[]>,
      this.findWithTenant(() => this.prisma.clientUsers.count({ where })) as Promise<number>,
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
  async findByClientId(clientId: string): Promise<client_users[]> {
    this.logOperation('SEARCH', 'client_users', `client:${clientId}`);

    return this.findWithTenant(() =>
      this.prisma.clientUsers.findMany({
        where: {
          clientId,
          client: {
            company_id: this.tenantContext.getTenantId(),
          },
        },
        orderBy: [
          { role: 'asc' },
          { last_name: 'asc' },
          { first_name: 'asc' },
        ],
      }),
    );
  }

  /**
   * Find client users by role
   */
  async findByRole(role: ClientUserRole): Promise<client_users[]> {
    this.logOperation('SEARCH', 'client_users', `role:${role}`);

    return this.findWithTenant(() =>
      this.prisma.clientUsers.findMany({
        where: {
          role,
          client: {
            company_id: this.tenantContext.getTenantId(),
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
        orderBy: { last_name: 'asc' },
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
    this.logOperation('STATS', 'client_users');

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
        this.prisma.clientUsers.count({
          where: {
            client: { company_id: this.tenantContext.getTenantId() },
          },
        }),
      ) as Promise<number>,
      this.findWithTenant(() =>
        this.prisma.clientUsers.count({
          where: {
            client: { company_id: this.tenantContext.getTenantId() },
            is_active: true,
          },
        }),
      ) as Promise<number>,
      this.findWithTenant(() =>
        this.prisma.clientUsers.count({
          where: {
            client: { company_id: this.tenantContext.getTenantId() },
            is_active: false,
          },
        }),
      ) as Promise<number>,
      this.findWithTenant(() =>
        this.prisma.clientUsers.groupBy({
          by: ['role'],
          where: {
            client: { company_id: this.tenantContext.getTenantId() },
          },
          _count: true,
        }),
      ),
      this.findWithTenant(() =>
        this.prisma.clientUsers.groupBy({
          by: ['client_id'],
          where: {
            client: { company_id: this.tenantContext.getTenantId() },
          },
          _count: true,
        }),
      ),
      this.findWithTenant(() =>
        this.prisma.clientUsers.count({
          where: {
            client: { company_id: this.tenantContext.getTenantId() },
            invited_at: { not: null },
          },
        }),
      ) as Promise<number>,
      this.findWithTenant(() =>
        this.prisma.clientUsers.count({
          where: {
            client: { company_id: this.tenantContext.getTenantId() },
            invited_at: { not: null },
            activated_at: null,
            is_active: true,
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
      clientStats[item.client_id] = item._count;
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
  private buildclient_usersSearchFilter(filters: ClientUserSearchFilters): Prisma.client_usersWhereInput {
    const conditions: Prisma.client_usersWhereInput[] = [];

    // Text search across name and email
    if (filters.search) {
      conditions.push({
        OR: [
          { first_name: { contains: filters.search, mode: 'insensitive' } },
          { last_name: { contains: filters.search, mode: 'insensitive' } },
          { email: { contains: filters.search, mode: 'insensitive' } },
          { job_title: { contains: filters.search, mode: 'insensitive' } },
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
        client_id: filters.clientId,
      });
    }

    // Active status filter
    if (filters.isActive !== undefined) {
      conditions.push({
        is_active: filters.isActive,
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
  async updatePermissions(id: string, permissions: any): Promise<client_users> {
    this.logOperation('PERMISSIONS', 'client_users', id);

    return this.update(id, { permissions });
  }

  /**
   * Update user preferences
   */
  async updatePreferences(id: string, preferences: any): Promise<client_users> {
    this.logOperation('PREFERENCES', 'client_users', id);

    return this.update(id, { preferences });
  }

  /**
   * Record user login
   */
  async recordLogin(id: string): Promise<client_users> {
    this.logOperation('LOGIN', 'client_users', id);

    return this.writeWithTenant(() =>
      this.prisma.clientUsers.update({
        where: { id },
        data: {
          last_login_at: new Date(),
        },
      }),
    );
  }

  /**
   * Send invitation to client user
   */
  async sendInvitation(id: string): Promise<client_users> {
    this.logOperation('INVITE', 'client_users', id);

    return this.writeWithTenant(() =>
      this.prisma.clientUsers.update({
        where: { id },
        data: {
          invited_at: new Date(),
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
  async activate(id: string): Promise<client_users> {
    this.logOperation('ACTIVATE', 'client_users', id);

    return this.writeWithTenant(() =>
      this.prisma.clientUsers.update({
        where: { id },
        data: {
          is_active: true,
          activated_at: new Date(),
        },
      }),
    );
  }
}