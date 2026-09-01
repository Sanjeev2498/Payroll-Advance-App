import { Injectable } from '@nestjs/common';
import { TenantAwareRepository } from '../tenant-aware.repository';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantContextService } from '../tenant-context.service';
import { sites, Prisma } from '@prisma/client';

export interface SiteSearchFilters {
  search?: string;
  clientId?: string;
  contractId?: string;
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
  async create(data: Prisma.sitesCreateInput): Promise<sites> {
    this.logOperation('CREATE', 'sites');

    return this.writeWithTenant(() =>
      this.prisma.site.create({
        data,
        include: {
          contracts: {
            include: {
              client: {
                select: {
                  id: true,
                  name: true,
                },
              },
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
   * Find site by ID with tenant isolation through client relationship
   */
  async findById(id: string): Promise<sites | null> {
    this.logOperation('READ', 'sites', id);

    return this.findWithTenant(() =>
      this.prisma.site.findFirst({
        where: {
          id,
          contracts: {
            client: this.getTenantFilter(), // Tenant isolation via contract->client
          },
        },
        include: {
          contracts: {
            include: {
              client: {
                select: {
                  id: true,
                  name: true,
                },
              },
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
  async update(id: string, data: Prisma.sitesUpdateInput): Promise<sites> {
    this.logOperation('UPDATE', 'sites', id);

    // First verify the site exists and belongs to the current tenant
    const existing = await this.findById(id);
    if (!existing) {
      throw new Error(`sites with ID ${id} not found`);
    }

    return this.writeWithTenant(() =>
      this.prisma.site.update({
        where: { id },
        data,
        include: {
          contracts: {
            include: {
              client: {
                select: {
                  id: true,
                  name: true,
                },
              },
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
   * Soft delete site by setting status to INACTIVE
   */
  async delete(id: string): Promise<sites> {
    this.logOperation('DELETE', 'sites', id);

    // First verify the site exists and belongs to the current tenant
    const existing = await this.findById(id);
    if (!existing) {
      throw new Error(`sites with ID ${id} not found`);
    }

    return this.writeWithTenant(() =>
      this.prisma.site.update({
        where: { id },
        data: {
          operationalStatus: 'INACTIVE',
        },
        include: {
          contracts: {
            include: {
              client: {
                select: {
                  id: true,
                  name: true,
                },
              },
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
   * Find sites with search and filtering
   */
  async findMany(
    filters: SiteSearchFilters = {},
    page?: number,
    limit?: number,
    sortBy?: keyof sites,
    sortOrder?: 'asc' | 'desc',
  ): Promise<{
    sites: (sites & {
      contracts: { client: { id: string; name: string } };
      _count: { assignments: number; shifts: number };
    })[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    this.logOperation('LIST', 'sites');

    const pagination = this.getPaginationParams(page, limit);
    const sorting = this.getSortingParams(sortBy, sortOrder);

    const where: Prisma.sitesWhereInput = {
      contracts: {
        clients: { company_id: this.tenantContext.getTenantId() }, // Tenant isolation via contract->client
      },
      ...this.buildSiteSearchFilter(filters),
    };

    const [sites, total] = await Promise.all([
      this.findWithTenant(() =>
        this.prisma.site.findMany({
          where,
          include: {
            contracts: {
              include: {
                client: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
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
        (sites & {
          contracts: { client: { id: string; name: string } };
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
   * Find sites by client ID (through contract relationship)
   */
  async findByClientId(clientId: string): Promise<sites[]> {
    this.logOperation('SEARCH', 'sites', `client:${clientId}`);

    return this.findWithTenant(() =>
      this.prisma.site.findMany({
        where: {
          contracts: {
            clientId: clientId,
            client: this.getTenantFilter(), // Tenant isolation via contract->client
          },
        },
        include: {
          contracts: {
            include: {
              client: {
                select: {
                  id: true,
                  name: true,
                },
              },
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
  async findByOperationalStatus(status: string): Promise<sites[]> {
    this.logOperation('SEARCH', 'sites', `status:${status}`);

    return this.findWithTenant(() =>
      this.prisma.site.findMany({
        where: {
          operationalStatus: status as any,
          contracts: {
            client: this.getTenantFilter(), // Tenant isolation via contract->client
          },
        },
        include: {
          contracts: {
            include: {
              client: {
                select: {
                  id: true,
                  name: true,
                },
              },
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
    this.logOperation('STATS', 'sites');

    const [total, active, inactive, maintenance, suspended, assignmentStats] = await Promise.all([
      this.findWithTenant(() =>
        this.prisma.site.count({
          where: {
            contracts: {
              client: this.getTenantFilter(),
            },
          },
        }),
      ) as Promise<number>,
      this.findWithTenant(() =>
        this.prisma.site.count({
          where: {
            operationalStatus: 'ACTIVE',
            contracts: {
              client: this.getTenantFilter(),
            },
          },
        }),
      ) as Promise<number>,
      this.findWithTenant(() =>
        this.prisma.site.count({
          where: {
            operationalStatus: 'INACTIVE',
            contracts: {
              client: this.getTenantFilter(),
            },
          },
        }),
      ) as Promise<number>,
      this.findWithTenant(() =>
        this.prisma.site.count({
          where: {
            operationalStatus: 'MAINTENANCE',
            contracts: {
              client: this.getTenantFilter(),
            },
          },
        }),
      ) as Promise<number>,
      this.findWithTenant(() =>
        this.prisma.site.count({
          where: {
            operationalStatus: 'SUSPENDED',
            contracts: {
              client: this.getTenantFilter(),
            },
          },
        }),
      ) as Promise<number>,
      this.findWithTenant(() =>
        this.prisma.site.aggregate({
          where: {
            contracts: {
              client: this.getTenantFilter(),
            },
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
  private buildSiteSearchFilter(filters: SiteSearchFilters): Prisma.sitesWhereInput {
    const conditions: Prisma.sitesWhereInput[] = [];

    // Text search across name and address
    if (filters.search) {
      const textSearch = this.buildTextSearchFilter(filters.search, ['name']);
      conditions.push(textSearch);
    }

    // Client filter - through contract relationship
    if (filters.clientId) {
      conditions.push({
        contracts: {
          client_id: filters.clientId,
        },
      });
    }

    // Contract filter
    if (filters.contractId) {
      conditions.push({
        contract_id: filters.contractId,
      });
    }

    // Operational status filter
    if (filters.operationalStatus) {
      conditions.push({
        operational_status: filters.operationalStatus as any,
      });
    }

    return conditions.length > 0 ? { AND: conditions } : {};
  }
}
