import { Injectable } from '@nestjs/common';
import { TenantAwareRepository } from '../tenant-aware.repository';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantContextService } from '../tenant-context.service';
import { sites, Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';

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

    // Ensure the data has required fields
    const createData = {
      id: randomUUID(),
      created_at: new Date(),
      updated_at: new Date(),
      ...data,
    };

    return this.writeWithTenant(() =>
      this.prisma.sites.create({
        data: createData,
        include: {
          contracts: {
            include: {
              clients: {
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
      this.prisma.sites.findFirst({
        where: {
          id,
          contracts: {
            clients: this.getTenantFilter(), // Tenant isolation via contract->client
          },
        },
        include: {
          contracts: {
            include: {
              clients: {
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
      this.prisma.sites.update({
        where: { id },
        data,
        include: {
          contracts: {
            include: {
              clients: {
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
   * Find sites by client ID with tenant isolation
   */
  async findByClientId(clientId: string): Promise<sites[]> {
    this.logOperation('READ', 'sites', `client:${clientId}`);

    return this.findWithTenant(() =>
      this.prisma.sites.findMany({
        where: {
          contracts: {
            clients: {
              ...this.getTenantFilter(), // Tenant isolation
              id: clientId, // Filter by specific client
            },
          },
        },
        include: {
          contracts: {
            include: {
              clients: {
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
   * Find sites by operational status with tenant isolation
   */
  async findByOperationalStatus(status: string): Promise<sites[]> {
    this.logOperation('READ', 'sites', `status:${status}`);

    return this.findWithTenant(() =>
      this.prisma.sites.findMany({
        where: {
          operational_status: status,
          contracts: {
            clients: this.getTenantFilter(), // Tenant isolation via contract->client
          },
        },
        include: {
          contracts: {
            include: {
              clients: {
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
   * Get site statistics for the current tenant
   */
  async getSitesStats(): Promise<{
    totalSites: number;
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
        this.prisma.sites.count({
          where: {
            contracts: {
              clients: this.getTenantFilter(),
            },
          },
        }),
      ) as Promise<number>,
      this.findWithTenant(() =>
        this.prisma.sites.count({
          where: {
            operational_status: 'ACTIVE',
            contracts: {
              clients: this.getTenantFilter(),
            },
          },
        }),
      ) as Promise<number>,
      this.findWithTenant(() =>
        this.prisma.sites.count({
          where: {
            operational_status: 'INACTIVE',
            contracts: {
              clients: this.getTenantFilter(),
            },
          },
        }),
      ) as Promise<number>,
      this.findWithTenant(() =>
        this.prisma.sites.count({
          where: {
            operational_status: 'UNDER_MAINTENANCE',
            contracts: {
              clients: this.getTenantFilter(),
            },
          },
        }),
      ) as Promise<number>,
      this.findWithTenant(() =>
        this.prisma.sites.count({
          where: {
            operational_status: 'SUSPENDED',
            contracts: {
              clients: this.getTenantFilter(),
            },
          },
        }),
      ) as Promise<number>,
      this.findWithTenant(() =>
        this.prisma.sites.aggregate({
          where: {
            contracts: {
              clients: this.getTenantFilter(),
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
      totalSites: total,
      active,
      inactive,
      maintenance,
      suspended,
      totalAssignments,
      averageAssignmentsPerSite: Math.round(averageAssignmentsPerSite * 100) / 100,
    };
  }
}
