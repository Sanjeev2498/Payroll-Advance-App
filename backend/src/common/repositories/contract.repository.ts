import { Injectable } from '@nestjs/common';
import { TenantAwareRepository } from '../tenant-aware.repository';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantContextService } from '../tenant-context.service';
import { Contract, Site, Assignment, Invoice, Prisma, ContractStatus } from '@prisma/client';

export interface CreateContractDto {
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

export interface UpdateContractDto {
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

export interface ContractSearchFilters {
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
  async create(data: CreateContractDto): Promise<Contract> {
    this.logOperation('CREATE', 'Contract');

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

    const createData: Prisma.ContractCreateInput = {
      contractNumber: data.contractNumber,
      title: data.title,
      description: data.description,
      startDate: data.startDate,
      endDate: data.endDate,
      serviceDefinitions: data.serviceDefinitions as Prisma.JsonValue,
      serviceLevelAgreement: data.serviceLevelAgreement as Prisma.JsonValue,
      billingPreferences: data.billingPreferences as Prisma.JsonValue,
      defaultBillingRates: data.defaultBillingRates as Prisma.JsonValue,
      contractValue: data.contractValue,
      paymentTerms: data.paymentTerms as Prisma.JsonValue,
      renewalNotificationDays: data.renewalNotificationDays || 90,
      autoRenewalEnabled: data.autoRenewalEnabled || false,
      client: {
        connect: { id: data.clientId },
      },
    };

    return this.writeWithTenant(() =>
      this.prisma.contract.create({
        data: createData,
        include: {
          client: {
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
  async findById(id: string): Promise<Contract | null> {
    this.logOperation('READ', 'Contract', id);

    return this.findWithTenant(() =>
      this.prisma.contract.findFirst({
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
  async update(id: string, data: UpdateContractDto): Promise<Contract> {
    this.logOperation('UPDATE', 'Contract', id);

    // First verify the contract exists and belongs to the current tenant
    const existing = await this.findById(id);
    if (!existing) {
      throw new Error(`Contract with ID ${id} not found`);
    }

    const updateData: Prisma.ContractUpdateInput = {
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

      updateData.contractHistory = {
        ...(existing.contractHistory as any),
        updates: [
          ...((existing.contractHistory as any)?.updates || []),
          historyEntry,
        ],
      };
    }

    return this.writeWithTenant(() =>
      this.prisma.contract.update({
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
  async delete(id: string): Promise<Contract> {
    this.logOperation('DELETE', 'Contract', id);

    return this.update(id, { status: 'TERMINATED' });
  }

  /**
   * Find contracts with search and filtering
   */
  async findMany(
    filters: ContractSearchFilters = {},
    page?: number,
    limit?: number,
    sortBy?: keyof Contract,
    sortOrder?: 'asc' | 'desc',
  ): Promise<{
    contracts: (Contract & {
      client: any;
      _count: { sites: number; invoices: number };
    })[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    this.logOperation('LIST', 'Contract');

    const pagination = this.getPaginationParams(page, limit);
    const sorting = this.getSortingParams(sortBy, sortOrder);

    const where: Prisma.ContractWhereInput = {
      client: {
        companyId: this.tenantContext.getTenantId(),
      },
      ...this.buildContractSearchFilter(filters),
    };

    const [contracts, total] = await Promise.all([
      this.findWithTenant(() =>
        this.prisma.contract.findMany({
          where,
          include: {
            client: {
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
      ) as Promise<(Contract & { client: any; _count: { sites: number; invoices: number } })[]>,
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
  async findExpiringContracts(daysUntilExpiry: number = 30): Promise<Contract[]> {
    this.logOperation('SEARCH', 'Contract', `expiring:${daysUntilExpiry}days`);

    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + daysUntilExpiry);

    return this.findWithTenant(() =>
      this.prisma.contract.findMany({
        where: {
          client: {
            companyId: this.tenantContext.getTenantId(),
          },
          status: 'ACTIVE',
          endDate: {
            lte: expiryDate,
            gte: new Date(), // Not already expired
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
        orderBy: { endDate: 'asc' },
      }),
    );
  }

  /**
   * Get contract statistics
   */
  async getContractStats(): Promise<{
    total: number;
    active: number;
    pending: number;
    expired: number;
    terminated: number;
    expiringThisMonth: number;
    totalValue: number;
    avgContractLength: number;
  }> {
    this.logOperation('STATS', 'Contract');

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
            client: { companyId: this.tenantContext.getTenantId() },
          },
        }),
      ) as Promise<number>,
      this.findWithTenant(() =>
        this.prisma.contract.count({
          where: {
            client: { companyId: this.tenantContext.getTenantId() },
            status: 'ACTIVE',
          },
        }),
      ) as Promise<number>,
      this.findWithTenant(() =>
        this.prisma.contract.count({
          where: {
            client: { companyId: this.tenantContext.getTenantId() },
            status: 'PENDING',
          },
        }),
      ) as Promise<number>,
      this.findWithTenant(() =>
        this.prisma.contract.count({
          where: {
            client: { companyId: this.tenantContext.getTenantId() },
            status: 'EXPIRED',
          },
        }),
      ) as Promise<number>,
      this.findWithTenant(() =>
        this.prisma.contract.count({
          where: {
            client: { companyId: this.tenantContext.getTenantId() },
            status: 'TERMINATED',
          },
        }),
      ) as Promise<number>,
      this.findWithTenant(() =>
        this.prisma.contract.count({
          where: {
            client: { companyId: this.tenantContext.getTenantId() },
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
            client: { companyId: this.tenantContext.getTenantId() },
            contractValue: { not: null },
          },
          select: { contractValue: true },
        }),
      ) as Promise<{ contractValue: any }[]>,
      this.findWithTenant(() =>
        this.prisma.contract.findMany({
          where: {
            client: { companyId: this.tenantContext.getTenantId() },
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
    const avgContractLength = contractLengths.length > 0 ? 
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
      avgContractLength: Math.round(avgContractLength),
    };
  }

  /**
   * Build search filter for contract queries
   */
  private buildContractSearchFilter(filters: ContractSearchFilters): Prisma.ContractWhereInput {
    const conditions: Prisma.ContractWhereInput[] = [];

    // Text search across contract number, title, and client name
    if (filters.search) {
      conditions.push({
        OR: [
          { contractNumber: { contains: filters.search, mode: 'insensitive' } },
          { title: { contains: filters.search, mode: 'insensitive' } },
          { client: { name: { contains: filters.search, mode: 'insensitive' } } },
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
        clientId: filters.clientId,
      });
    }

    // Expiring before date filter
    if (filters.expiringBefore) {
      conditions.push({
        endDate: {
          lte: filters.expiringBefore,
        },
      });
    }

    return conditions.length > 0 ? { AND: conditions } : {};
  }

  /**
   * Get contract performance metrics
   */
  async getContractPerformance(contractId: string): Promise<{
    siteCount: number;
    totalEmployeesAssigned: number;
    attendanceRate: number;
    invoiceCount: number;
    totalBilled: number;
    outstandingAmount: number;
    serviceUptime: number;
  }> {
    this.logOperation('PERFORMANCE', 'Contract', contractId);

    const contract = await this.findWithTenant(() =>
      this.prisma.contract.findFirst({
        where: {
          id: contractId,
          client: { companyId: this.tenantContext.getTenantId() },
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
    ) as Contract & {
      sites: Array<Site & { assignments: Assignment[] }>;
      invoices: Invoice[];
    };

    if (!contract) {
      throw new Error('Contract not found');
    }

    const siteCount = contract.sites.length;
    const totalEmployeesAssigned = contract.sites.reduce(
      (sum, site) => sum + site.assignments.length,
      0,
    );

    const invoiceCount = contract.invoices.length;
    const totalBilled = contract.invoices.reduce(
      (sum, invoice) => sum + parseFloat(invoice.totalAmount.toString()),
      0,
    );
    const outstandingAmount = contract.invoices
      .filter(invoice => invoice.status !== 'PAID')
      .reduce((sum, invoice) => sum + parseFloat(invoice.totalAmount.toString()), 0);

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