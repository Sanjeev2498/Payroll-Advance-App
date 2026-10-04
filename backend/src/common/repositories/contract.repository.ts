import { Injectable } from '@nestjs/common';
import { TenantAwareRepository } from '../tenant-aware.repository';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantContextService } from '../tenant-context.service';
import { contracts, sites, assignments, invoices, Prisma, ContractStatus } from '@prisma/client';

export interface CreatecontractsDto {
  clientId: string;
  contractNumber: string;
  title: string;
  description?: string;
  startDate: Date;
  endDate?: Date;
  serviceDefinitions: any;
  serviceLevelAgreement?: any;
  billingPreferences?: any;
  defaultBillingRates?: any;
  contractValue?: number;
  paymentTerms?: any;
  renewalNotificationDays?: number;
  autoRenewalEnabled?: boolean;
}

export interface UpdatecontractsDto {
  title?: string;
  description?: string;
  startDate?: Date;
  endDate?: Date;
  serviceDefinitions?: any;
  serviceLevelAgreement?: any;
  billingPreferences?: any;
  defaultBillingRates?: any;
  contractValue?: number;
  paymentTerms?: any;
  renewalNotificationDays?: number;
  autoRenewalEnabled?: boolean;
  status?: ContractStatus;
}

export interface contractsSearchFilters {
  search?: string;
  status?: ContractStatus;
  clientId?: string;
  expiringBefore?: Date;
}

@Injectable()
export class ContractRepository extends TenantAwareRepository {
  constructor(
    protected readonly prisma: PrismaService,
    protected readonly tenantContext: TenantContextService,
  ) {
    super(prisma, tenantContext);
  }

  /**
   * Create a new contract
   */
  async create(data: CreatecontractsDto): Promise<contracts> {
    this.logOperation('CREATE', 'contracts');

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

    const createData: Prisma.contractsCreateInput = {
      contract_number: data.contractNumber,
      title: data.title,
      description: data.description,
      start_date: data.startDate,
      end_date: data.endDate,
      contract_value: data.contractValue,
      clients: {
        connect: { id: data.clientId },
      },
    };

    return this.writeWithTenant(() =>
      this.prisma.contract.create({
        data: createData,
        include: {
          clients: {
            select: {
              id: true,
              name: true,
              organizationType: true,
            },
          },
          _count: {
            select: {
              sites: true,
            },
          },
        },
      }),
    );
  }

  /**
   * Find contract by ID with tenant isolation
   */
  async findById(id: string): Promise<contracts | null> {
    this.logOperation('READ', 'contracts', id);

    return this.findWithTenant(() =>
      this.prisma.contract.findFirst({
        where: {
          id,
          clients: {
            company_id: this.tenantContext.getTenantId(),
          },
        },
        include: {
          clients: {
            select: {
              id: true,
              name: true,
              organizationType: true,
              contactEmail: true,
            },
          },
          sites: {
            select: {
              id: true,
              name: true,
              operationalStatus: true,
              minStaffingLevel: true,
              maxStaffingLevel: true,
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
   * Update contract by ID
   */
  async update(id: string, data: UpdatecontractsDto): Promise<contracts> {
    this.logOperation('UPDATE', 'contracts', id);

    // First verify the contract exists and belongs to the current tenant
    const existing = await this.findById(id);
    if (!existing) {
      throw new Error(`contracts with ID ${id} not found`);
    }

    const updateData: Prisma.contractsUpdateInput = {
      ...(data.title && { title: data.title }),
      ...(data.description && { description: data.description }),
      ...(data.startDate && { startDate: data.startDate }),
      ...(data.endDate && { endDate: data.endDate }),
      ...(data.serviceDefinitions && {
        serviceDefinitions: data.serviceDefinitions as Prisma.JsonValue,
      }),
      ...(data.serviceLevelAgreement && {
        serviceLevelAgreement: data.serviceLevelAgreement as Prisma.JsonValue,
      }),
      ...(data.billingPreferences && {
        billingPreferences: data.billingPreferences as Prisma.JsonValue,
      }),
      ...(data.defaultBillingRates && {
        defaultBillingRates: data.defaultBillingRates as Prisma.JsonValue,
      }),
      ...(data.contractValue !== undefined && { contractValue: data.contractValue }),
      ...(data.paymentTerms && {
        paymentTerms: data.paymentTerms as Prisma.JsonValue,
      }),
      ...(data.renewalNotificationDays !== undefined && {
        renewalNotificationDays: data.renewalNotificationDays,
      }),
      ...(data.autoRenewalEnabled !== undefined && {
        autoRenewalEnabled: data.autoRenewalEnabled,
      }),
      ...(data.status && { status: data.status }),
    };

    // Add to contract history
    if (Object.keys(updateData).length > 0) {
      const historyEntry = {
        timestamp: new Date().toISOString(),
        changes: Object.keys(updateData),
        updatedBy: 'system', // This should be the current user ID in real implementation
      };

      (updateData as any).contractHistory = {
        ...((existing as any).contractHistory as any),
        updates: [
          ...(((existing as any).contractHistory as any)?.updates || []),
          historyEntry,
        ],
      };
    }

    return this.writeWithTenant(() =>
      this.prisma.contract.update({
        where: { id },
        data: updateData,
        include: {
          clients: {
            select: {
              id: true,
              name: true,
              organizationType: true,
            },
          },
          _count: {
            select: {
              sites: true,
            },
          },
        },
      }),
    );
  }

  /**
   * Delete contract (set status to TERMINATED)
   */
  async delete(id: string): Promise<contracts> {
    this.logOperation('DELETE', 'contracts', id);

    return this.update(id, { status: 'TERMINATED' });
  }

  /**
   * Find contracts with search and filtering
   */
  async findMany(
    filters: contractsSearchFilters = {},
    page?: number,
    limit?: number,
    sortBy?: keyof contracts,
    sortOrder?: 'asc' | 'desc',
  ): Promise<{
    contracts: (contracts & {
      client: any;
      _count: { sites: number; invoices: number };
    })[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    this.logOperation('LIST', 'contracts');

    const pagination = this.getPaginationParams(page, limit);
    const sorting = this.getSortingParams(sortBy, sortOrder);

    const where: Prisma.contractsWhereInput = {
      clients: {
        company_id: this.tenantContext.getTenantId(),
      },
      ...this.buildcontractsSearchFilter(filters),
    };

    const [contracts, total] = await Promise.all([
      this.findWithTenant(() =>
        this.prisma.contract.findMany({
          where,
          include: {
            clients: {
              select: {
                id: true,
                name: true,
                organizationType: true,
                contactEmail: true,
              },
            },
            _count: {
              select: {
                sites: true,
                invoices: true,
              },
            },
          },
          orderBy: sorting,
          skip: pagination.skip,
          take: pagination.take,
        }),
      ) as Promise<(contracts & { client: any; _count: { sites: number; invoices: number } })[]>,
      this.findWithTenant(() => this.prisma.contract.count({ where })) as Promise<number>,
    ]);

    return {
      contracts,
      total,
      page: page || 1,
      limit: limit || 20,
      totalPages: Math.ceil(total / (limit || 20)),
    };
  }

  /**
   * Find contracts expiring within specified days
   */
  async findExpiringcontractss(daysUntilExpiry: number = 30): Promise<contracts[]> {
    this.logOperation('SEARCH', 'contracts', `expiring:${daysUntilExpiry}days`);

    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + daysUntilExpiry);

    return this.findWithTenant(() =>
      this.prisma.contract.findMany({
        where: {
          clients: {
            company_id: this.tenantContext.getTenantId(),
          },
          status: 'ACTIVE',
          endDate: {
            lte: expiryDate,
            gte: new Date(), // Not already expired
          },
        },
        include: {
          clients: {
            select: {
              id: true,
              name: true,
              organizationType: true,
              contactEmail: true,
            },
          },
        },
        orderBy: { endDate: 'asc' },
      }),
    );
  }

  /**
   * Get contract statistics
   */
  async getcontractsStats(): Promise<{
    total: number;
    active: number;
    pending: number;
    expired: number;
    terminated: number;
    expiringThisMonth: number;
    totalValue: number;
    avgcontractsLength: number;
  }> {
    this.logOperation('STATS', 'contracts');

    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);

    const [
      total,
      active,
      pending,
      expired,
      terminated,
      expiringThisMonth,
      contractValues,
      contractLengths,
    ] = await Promise.all([
      this.findWithTenant(() =>
        this.prisma.contract.count({
          where: {
            clients: { companyId: this.tenantContext.getTenantId() },
          },
        }),
      ) as Promise<number>,
      this.findWithTenant(() =>
        this.prisma.contract.count({
          where: {
            clients: { companyId: this.tenantContext.getTenantId() },
            status: 'ACTIVE',
          },
        }),
      ) as Promise<number>,
      this.findWithTenant(() =>
        this.prisma.contract.count({
          where: {
            clients: { companyId: this.tenantContext.getTenantId() },
            status: 'PENDING',
          },
        }),
      ) as Promise<number>,
      this.findWithTenant(() =>
        this.prisma.contract.count({
          where: {
            clients: { companyId: this.tenantContext.getTenantId() },
            status: 'EXPIRED',
          },
        }),
      ) as Promise<number>,
      this.findWithTenant(() =>
        this.prisma.contract.count({
          where: {
            clients: { companyId: this.tenantContext.getTenantId() },
            status: 'TERMINATED',
          },
        }),
      ) as Promise<number>,
      this.findWithTenant(() =>
        this.prisma.contract.count({
          where: {
            clients: { companyId: this.tenantContext.getTenantId() },
            status: 'ACTIVE',
            endDate: {
              lte: nextMonth,
              gte: new Date(),
            },
          },
        }),
      ) as Promise<number>,
      this.findWithTenant(() =>
        this.prisma.contract.findMany({
          where: {
            clients: { companyId: this.tenantContext.getTenantId() },
            contractValue: { not: null },
          },
          select: { contractValue: true },
        }),
      ) as Promise<{ contractValue: any }[]>,
      this.findWithTenant(() =>
        this.prisma.contract.findMany({
          where: {
            clients: { companyId: this.tenantContext.getTenantId() },
            endDate: { not: null },
          },
          select: { startDate: true, endDate: true },
        }),
      ) as Promise<{ startDate: Date; endDate: Date | null }[]>,
    ]);

    // Calculate total contract value
    const totalValue = contractValues.reduce((sum, contract) => {
      return sum + (contract.contractValue ? parseFloat(contract.contractValue.toString()) : 0);
    }, 0);

    // Calculate average contract length in months
    const avgcontractsLength = contractLengths.length > 0 ? 
      contractLengths.reduce((sum, contract) => {
        if (contract.endDate) {
          const months = Math.abs(
            new Date(contract.endDate).getTime() - new Date(contract.startDate).getTime()
          ) / (1000 * 60 * 60 * 24 * 30);
          return sum + months;
        }
        return sum;
      }, 0) / contractLengths.length : 0;

    return {
      total,
      active,
      pending,
      expired,
      terminated,
      expiringThisMonth,
      totalValue,
      avgcontractsLength: Math.round(avgcontractsLength),
    };
  }

  /**
   * Build search filter for contract queries
   */
  private buildcontractsSearchFilter(filters: contractsSearchFilters): Prisma.contractsWhereInput {
    const conditions: Prisma.contractsWhereInput[] = [];

    // Text search across contract number, title, and client name
    if (filters.search) {
      conditions.push({
        OR: [
          { contract_number: { contains: filters.search, mode: 'insensitive' } },
          { title: { contains: filters.search, mode: 'insensitive' } },
          { clients: { name: { contains: filters.search, mode: 'insensitive' } } },
        ],
      });
    }

    // Status filter
    if (filters.status) {
      conditions.push({
        status: filters.status,
      });
    }

    // Client filter
    if (filters.clientId) {
      conditions.push({
        client_id: filters.clientId,
      });
    }

    // Expiring before date filter
    if (filters.expiringBefore) {
      conditions.push({
        end_date: {
          lte: filters.expiringBefore,
        },
      });
    }

    return conditions.length > 0 ? { AND: conditions } : {};
  }

  /**
   * Get contract performance metrics
   */
  async getcontractsPerformance(contractId: string): Promise<{
    siteCount: number;
    totalEmployeesAssigned: number;
    attendanceRate: number;
    invoiceCount: number;
    totalBilled: number;
    outstandingAmount: number;
    serviceUptime: number;
  }> {
    this.logOperation('PERFORMANCE', 'contracts', contractId);

    const contract = await this.findWithTenant(() =>
      this.prisma.contract.findFirst({
        where: {
          id: contractId,
          clients: { companyId: this.tenantContext.getTenantId() },
        },
        include: {
          sites: {
            include: {
              assignments: {
                where: { status: 'ACTIVE' },
              },
            },
          },
          invoices: true,
        },
      }),
    ) as contracts & {
      sites: Array<sites & { assignments: assignments[] }>;
      invoices: invoices[];
    };

    if (!contract) {
      throw new Error('contracts not found');
    }

    const siteCount = contract.sites.length;
    const totalEmployeesAssigned = contract.sites.reduce(
      (sum, site) => sum + site.assignments.length,
      0,
    );

    const invoiceCount = contract.invoices.length;
    const totalBilled = contract.invoices.reduce(
      (sum, invoice) => sum + parseFloat(invoice.total_amount.toString()),
      0,
    );
    const outstandingAmount = contract.invoices
      .filter(invoice => invoice.status !== 'PAID')
      .reduce((sum, invoice) => sum + parseFloat(invoice.total_amount.toString()), 0);

    return {
      siteCount,
      totalEmployeesAssigned,
      attendanceRate: 92.5, // Placeholder - would need to calculate from attendance data
      invoiceCount,
      totalBilled,
      outstandingAmount,
      serviceUptime: 98.2, // Placeholder - would need to calculate from operational data
    };
  }
}