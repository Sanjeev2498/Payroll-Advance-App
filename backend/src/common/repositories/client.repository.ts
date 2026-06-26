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
      billingPreferences: data.billingPreferences ? (data.billingPreferences as unknown as Prisma.JsonValue) : undefined,
      company: {
        connect: { id: this.tenantContext.getTenantId() }
      }
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
      ...(data.billingPreferences && { billingPreferences: data.billingPreferences as unknown as Prisma.JsonValue }),
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
    sortOrder?: 'asc' | 'desc'
  ): Promise<{
    clients: (Client & { 
      _count: { sites: number }
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
      this.findWithTenant(() =>
        this.prisma.client.count({ where }),
      ) as Promise<number>,
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
    expired: number;
    terminated: number;
    expiringThisMonth: number;
  }> {
    this.logOperation('STATS', 'Client');

    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);

    const [total, active, expired, terminated, expiringThisMonth] = await Promise.all([
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
      expired, 
      terminated, 
      expiringThisMonth 
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
      const textSearch = this.buildTextSearchFilter(filters.search, [
        'name',
        'contactEmail',
      ]);
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
}