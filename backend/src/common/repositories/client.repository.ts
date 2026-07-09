import { Injectable } from '@nestjs/common';
import { TenantAwareRepository } from '../tenant-aware.repository';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantContextService } from '../tenant-context.service';
import { Client, Prisma } from '@prisma/client';
import { CreateClientDto } from '../../clients/dto/create-client.dto';
import { UpdateClientDto } from '../../clients/dto/update-client.dto';

export interface ClientSearchFilters {
  search?: string;
  contractStatus?: string;
  contractExpiringBefore?: Date;
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
  async create(data: CreateClientDto): Promise<Client> {
    this.logOperation('CREATE', 'Client');

    const createData: Prisma.ClientCreateInput = {
      name: data.name,
      contactEmail: data.contactEmail,
      contactInfo: data.contactInfo ? (data.contactInfo as unknown as Prisma.JsonValue) : undefined,
      contractStatus: data.contractStatus || 'PENDING',
      contractStart: data.contractStart,
      contractEnd: data.contractEnd,
      billingPreferences: data.billingPreferences
        ? (data.billingPreferences as unknown as Prisma.JsonValue)
        : undefined,
      company: {
        connect: { id: this.tenantContext.getTenantId() },
      },
    };

    return this.writeWithTenant(() =>
      this.prisma.client.create({
        data: createData,
      }),
    );
  }

  /**
   * Find client by ID with tenant isolation
   */
  async findById(id: string): Promise<Client | null> {
    this.logOperation('READ', 'Client', id);

    return this.findWithTenant(() =>
      this.prisma.client.findFirst({
        where: {
          id,
          ...this.getTenantFilter(),
        },
        include: {
          sites: {
            select: {
              id: true,
              name: true,
              operationalStatus: true,
              _count: {
                select: {
                  assignments: true,
                },
              },
            },
          },
          invoices: {
            select: {
              id: true,
              invoiceNumber: true,
              totalAmount: true,
              status: true,
              dueDate: true,
            },
            orderBy: { createdAt: 'desc' },
            take: 5,
          },
        },
      }),
    );
  }

  /**
   * Update client by ID
   */
  async update(id: string, data: UpdateClientDto): Promise<Client> {
    this.logOperation('UPDATE', 'Client', id);

    // First verify the client exists and belongs to the current tenant
    const existing = await this.findById(id);
    if (!existing) {
      throw new Error(`Client with ID ${id} not found`);
    }

    const updateData: Prisma.ClientUpdateInput = {
      ...(data.name && { name: data.name }),
      ...(data.contactEmail && { contactEmail: data.contactEmail }),
      ...(data.contactInfo && { contactInfo: data.contactInfo as unknown as Prisma.JsonValue }),
      ...(data.contractStatus && { contractStatus: data.contractStatus }),
      ...(data.contractStart && { contractStart: data.contractStart }),
      ...(data.contractEnd && { contractEnd: data.contractEnd }),
      ...(data.billingPreferences && {
        billingPreferences: data.billingPreferences as unknown as Prisma.JsonValue,
      }),
    };

    return this.writeWithTenant(() =>
      this.prisma.client.update({
        where: { id },
        data: updateData,
      }),
    );
  }

  /**
   * Soft delete client by setting status to inactive
   */
  async delete(id: string): Promise<Client> {
    this.logOperation('DELETE', 'Client', id);

    // First verify the client exists and belongs to the current tenant
    const existing = await this.findById(id);
    if (!existing) {
      throw new Error(`Client with ID ${id} not found`);
    }

    return this.writeWithTenant(() =>
      this.prisma.client.update({
        where: { id },
        data: {
          contractStatus: 'TERMINATED',
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
    sortBy?: keyof Client,
    sortOrder?: 'asc' | 'desc',
  ): Promise<{
    clients: (Client & {
      _count: { sites: number };
    })[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    this.logOperation('LIST', 'Client');

    const pagination = this.getPaginationParams(page, limit);
    const sorting = this.getSortingParams(sortBy, sortOrder);

    const where: Prisma.ClientWhereInput = {
      ...this.getTenantFilter(),
      ...this.buildClientSearchFilter(filters),
    };

    const [clients, total] = await Promise.all([
      this.findWithTenant(() =>
        this.prisma.client.findMany({
          where,
          include: {
            _count: {
              select: {
                sites: true,
              },
            },
          },
          orderBy: sorting,
          skip: pagination.skip,
          take: pagination.take,
        }),
      ) as Promise<(Client & { _count: { sites: number } })[]>,
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
  async findExpiringContracts(daysUntilExpiry: number = 30): Promise<Client[]> {
    this.logOperation('SEARCH', 'Client', `expiring:${daysUntilExpiry}days`);

    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + daysUntilExpiry);

    return this.findWithTenant(() =>
      this.prisma.client.findMany({
        where: {
          ...this.getTenantFilter(),
          contractStatus: 'ACTIVE',
          contractEnd: {
            lte: expiryDate,
            gte: new Date(), // Not already expired
          },
        },
        orderBy: { contractEnd: 'asc' },
      }),
    );
  }

  /**
   * Get client statistics for the current tenant
   */
  async getClientStats(): Promise<{
    total: number;
    active: number;
    suspended: number;
    expired: number;
    terminated: number;
    expiringThisMonth: number;
  }> {
    this.logOperation('STATS', 'Client');

    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);

    const [total, active, suspended, expired, terminated, expiringThisMonth] = await Promise.all([
      this.findWithTenant(() =>
        this.prisma.client.count({
          where: this.getTenantFilter(),
        }),
      ) as Promise<number>,
      this.findWithTenant(() =>
        this.prisma.client.count({
          where: {
            ...this.getTenantFilter(),
            contractStatus: 'ACTIVE',
          },
        }),
      ) as Promise<number>,
      this.findWithTenant(() =>
        this.prisma.client.count({
          where: {
            ...this.getTenantFilter(),
            contractStatus: 'SUSPENDED',
          },
        }),
      ) as Promise<number>,
      this.findWithTenant(() =>
        this.prisma.client.count({
          where: {
            ...this.getTenantFilter(),
            contractStatus: 'EXPIRED',
          },
        }),
      ) as Promise<number>,
      this.findWithTenant(() =>
        this.prisma.client.count({
          where: {
            ...this.getTenantFilter(),
            contractStatus: 'TERMINATED',
          },
        }),
      ) as Promise<number>,
      this.findWithTenant(() =>
        this.prisma.client.count({
          where: {
            ...this.getTenantFilter(),
            contractStatus: 'ACTIVE',
            contractEnd: {
              lte: nextMonth,
              gte: new Date(),
            },
          },
        }),
      ) as Promise<number>,
    ]);

    return {
      total,
      active,
      suspended,
      expired,
      terminated,
      expiringThisMonth,
    };
  }

  /**
   * Find clients by contract status
   */
  async findByContractStatus(status: string): Promise<Client[]> {
    this.logOperation('SEARCH', 'Client', `status:${status}`);

    return this.findWithTenant(() =>
      this.prisma.client.findMany({
        where: {
          ...this.getTenantFilter(),
          contractStatus: status,
        },
        orderBy: { name: 'asc' },
      }),
    );
  }

  /**
   * Build search filter for client queries
   */
  private buildClientSearchFilter(filters: ClientSearchFilters): Prisma.ClientWhereInput {
    const conditions: Prisma.ClientWhereInput[] = [];

    // Text search across name and email
    if (filters.search) {
      const textSearch = this.buildTextSearchFilter(filters.search, ['name', 'contactEmail']);
      conditions.push(textSearch);
    }

    // Contract status filter
    if (filters.contractStatus) {
      conditions.push({
        contractStatus: filters.contractStatus as any,
      });
    }

    // Contract expiring before date filter
    if (filters.contractExpiringBefore) {
      conditions.push({
        contractEnd: {
          lte: filters.contractExpiringBefore,
        },
      });
    }

    return conditions.length > 0 ? { AND: conditions } : {};
  }

  /**
   * Get client performance metrics
   */
  async getClientPerformanceMetrics(clientId: string): Promise<{
    serviceQualityScore: number;
    paymentTimelinessScore: number;
    contractComplianceScore: number;
    satisfactionRating: number;
    complaintsThisYear: number;
    escalationsThisYear: number;
    avgResponseTime: number;
  }> {
    this.logOperation('METRICS', 'Client', clientId);

    // For now, return mock data since the interaction and document models aren't available yet
    return {
      serviceQualityScore: 8.5,
      paymentTimelinessScore: 9.0,
      contractComplianceScore: 8.8,
      satisfactionRating: 4.2,
      complaintsThisYear: 0,
      escalationsThisYear: 0,
      avgResponseTime: 2.5,
    };
  }

  /**
   * Get contract renewal information
   */
  async getContractRenewalInfo(clientId: string): Promise<{
    daysUntilExpiry: number;
    renewalStatus: string;
    notificationSent: boolean;
    lastDiscussionDate?: Date;
    renewalProbability: number;
  }> {
    this.logOperation('RENEWAL', 'Client', clientId);

    const client = await this.findById(clientId);
    if (!client || !client.contractEnd) {
      throw new Error('Client not found or no contract end date');
    }

    const now = new Date();
    const contractEnd = new Date(client.contractEnd);
    const daysUntilExpiry = Math.ceil((contractEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    // Determine renewal status
    let renewalStatus = 'NOT_STARTED';
    if (daysUntilExpiry <= 90 && daysUntilExpiry > 60) {
      renewalStatus = 'PENDING_REVIEW';
    } else if (daysUntilExpiry <= 60 && daysUntilExpiry > 30) {
      renewalStatus = 'IN_DISCUSSION';
    } else if (daysUntilExpiry <= 30) {
      renewalStatus = 'URGENT';
    }

    return {
      daysUntilExpiry,
      renewalStatus,
      notificationSent: daysUntilExpiry <= 90, // Default notification threshold
      renewalProbability: 8, // Default probability score
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
    expectedCompletion?: Date;
  }> {
    this.logOperation('ONBOARDING', 'Client', clientId);

    const client = await this.findById(clientId);
    if (!client) {
      throw new Error('Client not found');
    }

    // For now, return mock data since document management models aren't available yet
    const totalItems = 5;
    const completedItems = client.contractStatus === 'ACTIVE' ? 5 : 2;
    const completionPercentage = Math.round((completedItems / totalItems) * 100);

    let status = 'NOT_STARTED';
    if (completionPercentage > 0 && completionPercentage < 100) {
      status = 'IN_PROGRESS';
    } else if (completionPercentage === 100) {
      status = 'COMPLETED';
    }

    // Calculate expected completion (30 days from contract start by default)
    const expectedCompletion = client.contractStart 
      ? new Date(new Date(client.contractStart).getTime() + (30 * 24 * 60 * 60 * 1000))
      : undefined;

    return {
      completionPercentage,
      completedItems,
      totalItems,
      documentsCollected: client.contractStatus === 'ACTIVE' ? 4 : 1,
      documentsRequired: 4,
      status,
      expectedCompletion,
    };
  }
}
