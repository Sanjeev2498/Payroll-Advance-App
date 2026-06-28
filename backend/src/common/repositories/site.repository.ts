import { Injectable } from '@nestjs/common';
import { TenantAwareRepository } from '../tenant-aware.repository';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantContextService } from '../tenant-context.service';
import { Site, Prisma } from '@prisma/client';

export interface SiteSearchFilters {
  search?: string;
  clientId?: string;
  operationalStatus?: string;
}

@Injectable()
export class SiteRepository extends TenantAwareRepository {
  constructor(
    protected readonly prisma: PrismaService,
    protected readonly tenantContext: TenantContextService,
  ) {
    super(prisma, tenantContext);
  }

  /**
   * Create a new site
   */
  async create(data: Prisma.SiteCreateInput): Promise<Site> {
    this.logOperation('CREATE', 'Site');

    return this.writeWithTenant(() =>
      this.prisma.site.create({
        data,
        include: {
          client: true,
          _count: {
            select: {
              assignments: true,
              shifts: true,
            },
          },
        },
      }),
    );
  }

  /**
   * Find site by ID with tenant isolation through client relationship
   */
  async findById(id: string): Promise<Site | null> {
    this.logOperation('READ', 'Site', id);

    return this.findWithTenant(() =>
      this.prisma.site.findFirst({
        where: {
          id,
          client: this.getTenantFilter(), // Tenant isolation via client
        },
        include: {
          client: {
            select: {
              id: true,
              name: true,
              contractStatus: true,
            },
          },
          _count: {
            select: {
              assignments: true,
              shifts: true,
            },
          },
        },
      }),
    );
  }

  /**
   * Update site by ID
   */
  async update(id: string, data: Prisma.SiteUpdateInput): Promise<Site> {
    this.logOperation('UPDATE', 'Site', id);

    // First verify the site exists and belongs to the current tenant
    const existing = await this.findById(id);
    if (!existing) {
      throw new Error(`Site with ID ${id} not found`);
    }

    return this.writeWithTenant(() =>
      this.prisma.site.update({
        where: { id },
        data,
        include: {
          client: true,
          _count: {
            select: {
              assignments: true,
              shifts: true,
            },
          },
        },
      }),
    );
  }

  /**
   * Soft delete site by setting status to INACTIVE
   */
  async delete(id: string): Promise<Site> {
    this.logOperation('DELETE', 'Site', id);

    // First verify the site exists and belongs to the current tenant
    const existing = await this.findById(id);
    if (!existing) {
      throw new Error(`Site with ID ${id} not found`);
    }

    return this.writeWithTenant(() =>
      this.prisma.site.update({
        where: { id },
        data: {
          operationalStatus: 'INACTIVE',
        },
        include: {
          client: true,
          _count: {
            select: {
              assignments: true,
              shifts: true,
            },
          },
        },
      }),
    );
  }

  /**
   * Find sites with search and filtering
   */
  async findMany(
    filters: SiteSearchFilters = {},
    page?: number,
    limit?: number,
    sortBy?: keyof Site,
    sortOrder?: 'asc' | 'desc',
  ): Promise<{
    sites: (Site & {
      client: { id: string; name: string; contractStatus: string };
      _count: { assignments: number; shifts: number };
    })[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    this.logOperation('LIST', 'Site');

    const pagination = this.getPaginationParams(page, limit);
    const sorting = this.getSortingParams(sortBy, sortOrder);

    const where: Prisma.SiteWhereInput = {
      client: this.getTenantFilter(), // Tenant isolation via client
      ...this.buildSiteSearchFilter(filters),
    };

    const [sites, total] = await Promise.all([
      this.findWithTenant(() =>
        this.prisma.site.findMany({
          where,
          include: {
            client: {
              select: {
                id: true,
                name: true,
                contractStatus: true,
              },
            },
            _count: {
              select: {
                assignments: true,
                shifts: true,
              },
            },
          },
          orderBy: sorting,
          skip: pagination.skip,
          take: pagination.take,
        }),
      ) as Promise<
        (Site & {
          client: { id: string; name: string; contractStatus: string };
          _count: { assignments: number; shifts: number };
        })[]
      >,
      this.findWithTenant(() => this.prisma.site.count({ where })) as Promise<number>,
    ]);

    return {
      sites,
      total,
      page: page || 1,
      limit: limit || 20,
      totalPages: Math.ceil(total / (limit || 20)),
    };
  }

  /**
   * Find sites by client ID
   */
  async findByClientId(clientId: string): Promise<Site[]> {
    this.logOperation('SEARCH', 'Site', `client:${clientId}`);

    return this.findWithTenant(() =>
      this.prisma.site.findMany({
        where: {
          clientId,
          client: this.getTenantFilter(), // Tenant isolation via client
        },
        include: {
          client: {
            select: {
              id: true,
              name: true,
              contractStatus: true,
            },
          },
          _count: {
            select: {
              assignments: true,
              shifts: true,
            },
          },
        },
        orderBy: { name: 'asc' },
      }),
    );
  }

  /**
   * Find sites by operational status
   */
  async findByOperationalStatus(status: string): Promise<Site[]> {
    this.logOperation('SEARCH', 'Site', `status:${status}`);

    return this.findWithTenant(() =>
      this.prisma.site.findMany({
        where: {
          operationalStatus: status as any,
          client: this.getTenantFilter(), // Tenant isolation via client
        },
        include: {
          client: {
            select: {
              id: true,
              name: true,
              contractStatus: true,
            },
          },
          _count: {
            select: {
              assignments: true,
              shifts: true,
            },
          },
        },
        orderBy: { name: 'asc' },
      }),
    );
  }

  /**
   * Get site statistics for the current tenant
   */
  async getSiteStats(): Promise<{
    total: number;
    active: number;
    inactive: number;
    maintenance: number;
    suspended: number;
    totalAssignments: number;
    averageAssignmentsPerSite: number;
  }> {
    this.logOperation('STATS', 'Site');

    const [total, active, inactive, maintenance, suspended, assignmentStats] = await Promise.all([
      this.findWithTenant(() =>
        this.prisma.site.count({
          where: {
            client: this.getTenantFilter(),
          },
        }),
      ) as Promise<number>,
      this.findWithTenant(() =>
        this.prisma.site.count({
          where: {
            operationalStatus: 'ACTIVE',
            client: this.getTenantFilter(),
          },
        }),
      ) as Promise<number>,
      this.findWithTenant(() =>
        this.prisma.site.count({
          where: {
            operationalStatus: 'INACTIVE',
            client: this.getTenantFilter(),
          },
        }),
      ) as Promise<number>,
      this.findWithTenant(() =>
        this.prisma.site.count({
          where: {
            operationalStatus: 'MAINTENANCE',
            client: this.getTenantFilter(),
          },
        }),
      ) as Promise<number>,
      this.findWithTenant(() =>
        this.prisma.site.count({
          where: {
            operationalStatus: 'SUSPENDED',
            client: this.getTenantFilter(),
          },
        }),
      ) as Promise<number>,
      this.findWithTenant(() =>
        this.prisma.site.aggregate({
          where: {
            client: this.getTenantFilter(),
          },
          _count: {
            assignments: true,
          },
        }),
      ) as Promise<{ _count: { assignments: number } }>,
    ]);

    const totalAssignments = assignmentStats._count.assignments || 0;
    const averageAssignmentsPerSite = total > 0 ? totalAssignments / total : 0;

    return {
      total,
      active,
      inactive,
      maintenance,
      suspended,
      totalAssignments,
      averageAssignmentsPerSite: Math.round(averageAssignmentsPerSite * 100) / 100,
    };
  }

  /**
   * Validate client relationship exists within tenant
   */
  async validateClientRelationship(clientId: string): Promise<boolean> {
    const client = await this.findWithTenant(() =>
      this.prisma.client.findFirst({
        where: {
          id: clientId,
          ...this.getTenantFilter(),
        },
      }),
    );

    return !!client;
  }

  /**
   * Build search filter for site queries
   */
  private buildSiteSearchFilter(filters: SiteSearchFilters): Prisma.SiteWhereInput {
    const conditions: Prisma.SiteWhereInput[] = [];

    // Text search across name and address
    if (filters.search) {
      const textSearch = this.buildTextSearchFilter(filters.search, ['name']);
      conditions.push(textSearch);
    }

    // Client filter
    if (filters.clientId) {
      conditions.push({
        clientId: filters.clientId,
      });
    }

    // Operational status filter
    if (filters.operationalStatus) {
      conditions.push({
        operationalStatus: filters.operationalStatus as any,
      });
    }

    return conditions.length > 0 ? { AND: conditions } : {};
  }
}
