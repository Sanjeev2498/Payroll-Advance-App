import { Injectable } from '@nestjs/common';
import { TenantAwareRepository } from '../tenant-aware.repository';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantContextService } from '../tenant-context.service';
import { clients, contracts, sites, Prisma, ClientOrganizationType } from '@prisma/client';

export interface CreateClientDto {
  name: string;
  contactEmail: string;
  contactInfo?: any;
  organizationType?: ClientOrganizationType;
  industry?: string;
  companySize?: string;
  tags?: string[];
  accountManagerId?: string;
  documentRequirements?: any;
  onboardingChecklist?: any;
}

export interface UpdateClientDto {
  name?: string;
  contactEmail?: string;
  contactInfo?: any;
  organizationType?: ClientOrganizationType;
  industry?: string;
  companySize?: string;
  tags?: string[];
  accountManagerId?: string;
  documentRequirements?: any;
  onboardingChecklist?: any;
  relationshipNotes?: string;
  lastContactDate?: Date;
  nextFollowUpDate?: Date;
}

export interface ClientSearchFilters {
  search?: string;
  organizationType?: ClientOrganizationType;
  industry?: string;
  accountManagerId?: string;
  tags?: string[];
}

@Injectable()
export class ClientRepository extends TenantAwareRepository {
  constructor(
    protected readonly prisma: PrismaService,
    protected readonly tenantContext: TenantContextService,
  ) {
    super(prisma, tenantContext);
  }

  /**
   * Create a new client
   */
  async create(data: CreateClientDto): Promise<clients> {
    this.logOperation('CREATE', 'clients');

    const createData = {
      name: data.name,
      contact_email: data.contactEmail,
      contact_info: data.contactInfo ? (data.contactInfo as unknown as Prisma.JsonValue) : undefined,
      organization_type: data.organizationType || 'CORPORATE_OFFICE',
      industry: data.industry,
      company_size: data.companySize,
      updated_at: new Date(),
      tags: data.tags || [],
    } as Prisma.clientsCreateInput;

    return this.writeWithTenant(() =>
      this.prisma.client.create({
        data: createData,
        include: {
          accountManager: true,
          _count: {
            select: {
              contracts: true,
              clientUsers: true,
            },
          },
        },
      }),
    );
  }

  /**
   * Find client by ID with tenant isolation
   */
  async findById(id: string): Promise<clients | null> {
    this.logOperation('READ', 'clients', id);

    return this.findWithTenant(() =>
      this.prisma.client.findFirst({
        where: {
          id,
          ...this.getTenantFilter(),
        },
        include: {
          accountManager: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          contracts: {
            select: {
              id: true,
              contractNumber: true,
              title: true,
              status: true,
              startDate: true,
              endDate: true,
              _count: {
                select: {
                  sites: true,
                },
              },
            },
            orderBy: { startDate: 'desc' },
          },
          clientUsers: {
            where: { isActive: true },
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              role: true,
              jobTitle: true,
            },
          },
          _count: {
            select: {
              contracts: true,
              clientUsers: true,
              clientDocuments: true,
            },
          },
        },
      }),
    );
  }

  /**
   * Update client by ID
   */
  async update(id: string, data: UpdateClientDto): Promise<clients> {
    this.logOperation('UPDATE', 'clients', id);

    // First verify the client exists and belongs to the current tenant
    const existing = await this.findById(id);
    if (!existing) {
      throw new Error(`clients with ID ${id} not found`);
    }

    const updateData: Prisma.clientsUpdateInput = {
      ...(data.name && { name: data.name }),
      ...(data.contactEmail && { contact_email: data.contactEmail }),
      ...(data.contactInfo && { contactInfo: data.contactInfo as unknown as Prisma.JsonValue }),
      ...(data.organizationType && { organizationType: data.organizationType }),
      ...(data.industry && { industry: data.industry }),
      ...(data.companySize && { companySize: data.companySize }),
      ...(data.tags && { tags: data.tags }),
      ...(data.relationshipNotes && { relationshipNotes: data.relationshipNotes }),
      ...(data.lastContactDate && { lastContactDate: data.lastContactDate }),
      ...(data.nextFollowUpDate && { nextFollowUpDate: data.nextFollowUpDate }),
      ...(data.documentRequirements && {
        documentRequirements: data.documentRequirements as unknown as Prisma.JsonValue,
      }),
      ...(data.onboardingChecklist && {
        onboardingChecklist: data.onboardingChecklist as unknown as Prisma.JsonValue,
      }),
      ...(data.accountManagerId && {
        accountManager: { connect: { id: data.accountManagerId } },
      }),
    };

    return this.writeWithTenant(() =>
      this.prisma.client.update({
        where: { id },
        data: updateData,
        include: {
          accountManager: true,
          _count: {
            select: {
              contracts: true,
              clientUsers: true,
            },
          },
        },
      }),
    );
  }

  /**
   * Soft delete client (archive)
   */
  async delete(id: string): Promise<clients> {
    this.logOperation('DELETE', 'clients', id);

    // First verify the client exists and belongs to the current tenant
    const existing = await this.findById(id);
    if (!existing) {
      throw new Error(`clients with ID ${id} not found`);
    }

    // For now, we'll mark client as archived by adding a tag
    // In a real implementation, you might want to add an 'isActive' field
    return this.writeWithTenant(() =>
      this.prisma.client.update({
        where: { id },
        data: {
          tags: {
            push: 'ARCHIVED',
          },
        },
      }),
    );
  }

  /**
   * Find clients with search and filtering
   */
  async findMany(
    filters: ClientSearchFilters = {},
    page?: number,
    limit?: number,
    sortBy?: keyof clients,
    sortOrder?: 'asc' | 'desc',
  ): Promise<{
    clients: (clients & {
      accountManager?: any;
      _count: { contracts: number; clientUsers: number };
    })[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    this.logOperation('LIST', 'clients');

    const pagination = this.getPaginationParams(page, limit);
    const sorting = this.getSortingParams(sortBy, sortOrder);

    const where: Prisma.clientsWhereInput = {
      ...this.getTenantFilter(),
      ...this.buildclientsSearchFilter(filters),
      // Exclude archived clients - remove this filter for now
      // tags: {
      //   notIn: ['ARCHIVED'],
      // },
    };

    const [clients, total] = await Promise.all([
      this.findWithTenant(() =>
        this.prisma.client.findMany({
          where,
          include: {
            accountManager: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
            _count: {
              select: {
                contracts: true,
                clientUsers: true,
              },
            },
          },
          orderBy: sorting,
          skip: pagination.skip,
          take: pagination.take,
        }),
      ) as Promise<(clients & { accountManager?: any; _count: { contracts: number; clientUsers: number } })[]>,
      this.findWithTenant(() => this.prisma.client.count({ where })) as Promise<number>,
    ]);

    return {
      clients,
      total,
      page: page || 1,
      limit: limit || 20,
      totalPages: Math.ceil(total / (limit || 20)),
    };
  }

  /**
   * Find clients with expiring contracts
   */
  async findWithExpiringContracts(daysUntilExpiry: number = 30): Promise<clients[]> {
    this.logOperation('SEARCH', 'clients', `expiring:${daysUntilExpiry}days`);

    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + daysUntilExpiry);

    return this.findWithTenant(() =>
      this.prisma.client.findMany({
        where: {
          ...this.getTenantFilter(),
          contracts: {
            some: {
              status: 'ACTIVE',
              endDate: {
                lte: expiryDate,
                gte: new Date(), // Not already expired
              },
            },
          },
        },
        include: {
          contracts: {
            where: {
              status: 'ACTIVE',
              endDate: {
                lte: expiryDate,
                gte: new Date(),
              },
            },
            select: {
              id: true,
              contractNumber: true,
              title: true,
              endDate: true,
            },
          },
        },
        orderBy: { name: 'asc' },
      }),
    );
  }

  /**
   * Get client statistics for the current tenant
   */
  async getclientsStats(): Promise<{
    total: number;
    byOrganizationType: Record<string, number>;
    withActiveContracts: number;
    withExpiringContracts: number;
    withMultipleContracts: number;
    withclientsUsers: number;
  }> {
    this.logOperation('STATS', 'clients');

    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);

    const [
      total,
      byOrganizationType,
      withActiveContracts,
      withExpiringContracts,
      withMultipleContracts,
      withclientsUsers,
    ] = await Promise.all([
      // Total clients
      this.findWithTenant(() =>
        this.prisma.client.count({
          where: {
            ...this.getTenantFilter(),
            tags: { none: { equals: 'ARCHIVED' } },
          },
        }),
      ) as Promise<number>,

      // By organization type
      this.findWithTenant(() =>
        this.prisma.client.groupBy({
          by: ['organizationType'],
          where: {
            ...this.getTenantFilter(),
            tags: { none: { equals: 'ARCHIVED' } },
          },
          _count: true,
        }),
      ),

      // With active contracts
      this.findWithTenant(() =>
        this.prisma.client.count({
          where: {
            ...this.getTenantFilter(),
            tags: { none: { equals: 'ARCHIVED' } },
            contracts: {
              some: {
                status: 'ACTIVE',
              },
            },
          },
        }),
      ) as Promise<number>,

      // With expiring contracts
      this.findWithTenant(() =>
        this.prisma.client.count({
          where: {
            ...this.getTenantFilter(),
            tags: { none: { equals: 'ARCHIVED' } },
            contracts: {
              some: {
                status: 'ACTIVE',
                endDate: {
                  lte: nextMonth,
                  gte: new Date(),
                },
              },
            },
          },
        }),
      ) as Promise<number>,

      // With multiple contracts
      this.findWithTenant(() =>
        this.prisma.client.count({
          where: {
            ...this.getTenantFilter(),
            tags: { none: { equals: 'ARCHIVED' } },
            contracts: {
              _count: {
                gt: 1,
              },
            },
          },
        }),
      ) as Promise<number>,

      // With client users
      this.findWithTenant(() =>
        this.prisma.client.count({
          where: {
            ...this.getTenantFilter(),
            tags: { none: { equals: 'ARCHIVED' } },
            clientUsers: {
              some: {
                isActive: true,
              },
            },
          },
        }),
      ) as Promise<number>,
    ]);

    // Convert organization type stats to record
    const orgTypeStats: Record<string, number> = {};
    (byOrganizationType as any[]).forEach((item) => {
      orgTypeStats[item.organizationType] = item._count;
    });

    return {
      total,
      byOrganizationType: orgTypeStats,
      withActiveContracts,
      withExpiringContracts,
      withMultipleContracts,
      withclientsUsers,
    };
  }

  /**
   * Find clients by contract status
   */
  async findByContractStatus(status: string): Promise<clients[]> {
    this.logOperation('SEARCH', 'clients', `contractStatus:${status}`);

    return this.findWithTenant(() =>
      this.prisma.client.findMany({
        where: {
          ...this.getTenantFilter(),
          contracts: {
            some: {
              status: status as any,
            },
          },
        },
        include: {
          accountManager: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          contracts: {
            where: { status: status as any },
            select: {
              id: true,
              contractNumber: true,
              title: true,
              status: true,
              startDate: true,
              endDate: true,
            },
          },
          _count: {
            select: {
              contracts: true,
            },
          },
        },
        orderBy: { name: 'asc' },
      }),
    );
  }

  /**
   * Find clients by organization type
   */
  async findByOrganizationType(organizationType: ClientOrganizationType): Promise<clients[]> {
    this.logOperation('SEARCH', 'clients', `orgType:${organizationType}`);

    return this.findWithTenant(() =>
      this.prisma.client.findMany({
        where: {
          ...this.getTenantFilter(),
          organizationType,
          tags: { none: { equals: 'ARCHIVED' } },
        },
        include: {
          accountManager: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          _count: {
            select: {
              contracts: true,
            },
          },
        },
        orderBy: { name: 'asc' },
      }),
    );
  }

  /**
   * Build search filter for client queries
   */
  private buildclientsSearchFilter(filters: ClientSearchFilters): Prisma.clientsWhereInput {
    const conditions: Prisma.clientsWhereInput[] = [];

    // Text search across name and email
    if (filters.search) {
      const textSearch = this.buildTextSearchFilter(filters.search, ['name', 'contact_email']);
      conditions.push(textSearch);
    }

    // Organization type filter
    if (filters.organizationType) {
      conditions.push({
        organization_type: filters.organizationType,
      });
    }

    // Industry filter
    if (filters.industry) {
      conditions.push({
        industry: {
          contains: filters.industry,
          mode: 'insensitive',
        },
      });
    }

    // Tags filter
    if (filters.tags && filters.tags.length > 0) {
      conditions.push({
        tags: {
          hasSome: filters.tags,
        },
      });
    }

    return conditions.length > 0 ? { AND: conditions } : {};
  }

  /**
   * Get client performance metrics
   */
  async getclientsPerformanceMetrics(clientId: string): Promise<{
    serviceQualityScore: number;
    contractCompliance: number;
    satisfactionRating: number;
    activeContracts: number;
    totalSites: number;
    avgResponseTime: number;
  }> {
    this.logOperation('METRICS', 'clients', clientId);

    const client = await this.findWithTenant(() =>
      this.prisma.client.findFirst({
        where: {
          id: clientId,
          ...this.getTenantFilter(),
        },
        include: {
          contracts: {
            where: { status: 'ACTIVE' },
            include: {
              sites: true,
            },
          },
        },
      }),
    ) as clients & {
      contracts: Array<contracts & { sites: sites[] }>;
    };

    if (!client) {
      throw new Error('clients not found');
    }

    const activeContracts = client.contracts?.length || 0;
    const totalSites = client.contracts?.reduce((sum, contract) => sum + (contract.sites?.length || 0), 0) || 0;

    // Extract performance data from JSON field or use defaults
    const performanceData = (client as any).performanceMetrics as any || {};

    return {
      serviceQualityScore: performanceData.serviceQualityScore || 8.5,
      contractCompliance: performanceData.contractCompliance || 95.0,
      satisfactionRating: performanceData.satisfactionRating || 4.2,
      activeContracts,
      totalSites,
      avgResponseTime: performanceData.avgResponseTime || 2.5,
    };
  }

  /**
   * Get contract renewal information for a client
   */
  async getContractRenewalInfo(clientId: string): Promise<{
    contractsNearExpiry: Array<{
      contractId: string;
      contractNumber: string;
      title: string;
      daysUntilExpiry: number;
      renewalStatus: string;
    }>;
    totalContracts: number;
    renewalOpportunities: number;
  }> {
    this.logOperation('RENEWAL', 'clients', clientId);

    const client = await this.findWithTenant(() =>
      this.prisma.client.findFirst({
        where: {
          id: clientId,
          ...this.getTenantFilter(),
        },
        include: {
          contracts: {
            where: { status: 'ACTIVE' },
            select: {
              id: true,
              contractNumber: true,
              title: true,
              endDate: true,
            },
          },
        },
      }),
    ) as clients & {
      contracts: Array<{
        id: string;
        contractNumber: string;
        title: string;
        endDate: Date | null;
      }>;
    };

    if (!client) {
      throw new Error('clients not found');
    }

    const now = new Date();
    const contractsNearExpiry = (client.contracts || [])
      .filter(contract => contract.endDate)
      .map(contract => {
        const endDate = new Date(contract.endDate!);
        const daysUntilExpiry = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        
        let renewalStatus = 'NOT_STARTED';
        if (daysUntilExpiry <= 90 && daysUntilExpiry > 60) {
          renewalStatus = 'PENDING_REVIEW';
        } else if (daysUntilExpiry <= 60 && daysUntilExpiry > 30) {
          renewalStatus = 'IN_DISCUSSION';
        } else if (daysUntilExpiry <= 30) {
          renewalStatus = 'URGENT';
        }

        return {
          contractId: contract.id,
          contractNumber: contract.contractNumber,
          title: contract.title,
          daysUntilExpiry,
          renewalStatus,
        };
      })
      .filter(contract => contract.daysUntilExpiry <= 90 && contract.daysUntilExpiry > 0)
      .sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);

    return {
      contractsNearExpiry,
      totalContracts: client.contracts?.length || 0,
      renewalOpportunities: contractsNearExpiry.length,
    };
  }

  /**
   * Get onboarding status for a client
   */
  async getOnboardingStatus(clientId: string): Promise<{
    completionPercentage: number;
    completedItems: number;
    totalItems: number;
    documentsCollected: number;
    documentsRequired: number;
    status: string;
    checklist: Array<{
      item: string;
      completed: boolean;
      dueDate?: Date;
    }>;
  }> {
    this.logOperation('ONBOARDING', 'clients', clientId);

    const client = await this.findWithTenant(() =>
      this.prisma.client.findFirst({
        where: {
          id: clientId,
          ...this.getTenantFilter(),
        },
        include: {
          contracts: {
            include: {
              sites: true,
            },
          },
        }
      })
    ) as clients & {
      contracts: Array<contracts & { sites: sites[] }>;
    };

    if (!client) {
      throw new Error('clients not found');
    }

    const totalSites = client.contracts?.reduce((sum, contract) => sum + (contract.sites?.length || 0), 0) || 0;

    const checklistData = (client as any).onboardingChecklist as any || {
      items: [
        { item: 'Contract Signed', completed: (client.contracts?.length || 0) > 0 },
        { item: 'Site Information Collected', completed: totalSites > 0 },
        { item: 'Contact Information Verified', completed: !!client.contact_email },
        { item: 'Payment Terms Agreed', completed: true },
        { item: 'Security Requirements Defined', completed: true },
      ]
    };

    const checklist = checklistData.items || [];
    const completedItems = checklist.filter((item: any) => item.completed).length;
    const totalItems = checklist.length;
    const completionPercentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

    let status = 'NOT_STARTED';
    if (completionPercentage > 0 && completionPercentage < 100) {
      status = 'IN_PROGRESS';
    } else if (completionPercentage === 100) {
      status = 'COMPLETED';
    }

    return {
      completionPercentage,
      completedItems,
      totalItems,
      documentsCollected: completedItems,
      documentsRequired: totalItems,
      status,
      checklist
    };
  }

  /**
   * Create a client user
   */
  async createclientsUser(clientId: string, userData: {
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    phone?: string;
    jobTitle?: string;
    department?: string;
  }): Promise<any> {
    this.logOperation('CREATE', 'clientsUser', clientId);

    // Verify client exists and belongs to current tenant
    const client = await this.findById(clientId);
    if (!client) {
      throw new Error('clients not found');
    }

    return this.writeWithTenant(() =>
      this.prisma.clientUser.create({
        data: {
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          role: userData.role as any,
          phone: userData.phone,
          jobTitle: userData.jobTitle,
          department: userData.department,
          invitedAt: new Date(),
          client: {
            connect: { id: clientId },
          },
        },
      }),
    );
  }

  /**
   * Get client users for a client
   */
  async getclientsUsers(clientId: string): Promise<any[]> {
    this.logOperation('LIST', 'clientsUser', clientId);

    return this.findWithTenant(() =>
      this.prisma.clientUser.findMany({
        where: {
          clientId,
          client: this.getTenantFilter(),
        },
        orderBy: { createdAt: 'desc' },
      }),
    );
  }

  /**
   * Update client user status
   */
  async updateclientsUserStatus(clientId: string, userId: string, isActive: boolean): Promise<any> {
    this.logOperation('UPDATE', 'clientsUser', `${clientId}:${userId}`);

    return this.writeWithTenant(() =>
      this.prisma.clientUser.update({
        where: {
          id: userId,
          client: this.getTenantFilter(),
        },
        data: {
          isActive,
        },
      }),
    );
  }
}