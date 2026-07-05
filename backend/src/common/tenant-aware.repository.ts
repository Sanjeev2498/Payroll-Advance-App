import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from './tenant-context.service';
import { getErrorMessage, getErrorStack, formatError } from './utils/error.util';


/**
 * Base repository class that provides tenant-aware database operations
 * All repositories should extend this class to ensure proper multi-tenant isolation
 */
@Injectable()
export abstract class TenantAwareRepository {
  protected readonly logger = new Logger(this.constructor.name);

  constructor(
    protected readonly prisma: PrismaService,
    protected readonly tenantContext: TenantContextService,
  ) {}

  /**
   * Get the tenant filter for direct tenant-owned entities
   */
  protected getTenantFilter(): { companyId: string } {
    const tenantId = this.tenantContext.getTenantId();
    return { companyId: tenantId };
  }

  /**
   * Execute a database operation with automatic tenant context
   * This ensures RLS policies are properly applied
   */
  protected async executeWithTenant<T>(operation: (prisma: any) => Promise<T>): Promise<T> {
    const tenantId = this.tenantContext.getTenantId();
    const userRole = this.tenantContext.getUserRole();

    return this.prisma.withTenant(
      tenantId,
      async (prisma) => {
        return operation(prisma);
      },
      userRole || undefined,
    );
  }

  /**
   * Execute a system operation that bypasses tenant restrictions
   * Use this sparingly and only for legitimate system operations
   */
  protected async executeWithSystemContext<T>(operation: (prisma: any) => Promise<T>): Promise<T> {
    this.logger.warn('Executing operation with system context - bypassing RLS');
    return this.prisma.withSystemContext(async (prisma) => {
      return operation(prisma);
    });
  }

  /**
   * Validate that an entity belongs to the current tenant
   */
  protected validateTenantOwnership(entityTenantId: string): void {
    const currentTenantId = this.tenantContext.getTenantId();

    if (entityTenantId !== currentTenantId) {
      throw new Error(
        `Entity belongs to tenant ${entityTenantId} but current context is ${currentTenantId}`,
      );
    }
  }

  /**
   * Get pagination parameters with safe defaults
   */
  protected getPaginationParams(
    page?: number,
    limit?: number,
  ): {
    skip: number;
    take: number;
  } {
    const safeLimit = Math.min(limit || 20, 100); // Max 100 items per page
    const safePage = Math.max(page || 1, 1); // Min page 1

    return {
      skip: (safePage - 1) * safeLimit,
      take: safeLimit,
    };
  }

  /**
   * Get sorting parameters with safe defaults
   */
  protected getSortingParams<T extends Record<string, any>>(
    sortBy?: keyof T,
    sortOrder?: 'asc' | 'desc',
  ): Record<string, 'asc' | 'desc'> | undefined {
    if (!sortBy) {
      return { createdAt: 'desc' }; // Default sort by creation date
    }

    return { [sortBy as string]: sortOrder || 'asc' };
  }

  /**
   * Execute a find operation with automatic tenant context and error handling
   */
  protected async findWithTenant<T>(modelOperation: () => Promise<T>): Promise<T> {
    try {
      return await this.executeWithTenant(async () => {
        return modelOperation();
      });
    } catch (error) {
      this.logger.error(`Database operation failed: ${getErrorMessage(error)}`, getErrorStack(error));
      throw error;
    }
  }

  /**
   * Execute a write operation with automatic tenant context and error handling
   */
  protected async writeWithTenant<T>(modelOperation: () => Promise<T>): Promise<T> {
    try {
      return await this.executeWithTenant(async () => {
        return modelOperation();
      });
    } catch (error) {
      this.logger.error(`Database write operation failed: ${getErrorMessage(error)}`, getErrorStack(error));
      throw error;
    }
  }

  /**
   * Build search filter for text fields
   */
  protected buildTextSearchFilter(searchTerm?: string, fields: string[] = []): any {
    if (!searchTerm || fields.length === 0) {
      return {};
    }

    const searchConditions = fields.map((field) => ({
      [field]: {
        contains: searchTerm,
        mode: 'insensitive' as const,
      },
    }));

    return searchConditions.length === 1 ? searchConditions[0] : { OR: searchConditions };
  }

  /**
   * Build date range filter
   */
  protected buildDateRangeFilter(startDate?: Date | string, endDate?: Date | string): any {
    const filter: any = {};

    if (startDate) {
      filter.gte = new Date(startDate);
    }

    if (endDate) {
      filter.lte = new Date(endDate);
    }

    return Object.keys(filter).length > 0 ? filter : undefined;
  }

  /**
   * Log repository operation for audit purposes
   */
  protected logOperation(operation: string, entityType: string, entityId?: string): void {
    const context = this.tenantContext.getContextSnapshot();
    this.logger.debug(`${operation} ${entityType}${entityId ? ` [${entityId}]` : ''} - ${context}`);
  }
}
