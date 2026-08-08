import { Reflector } from '@nestjs/core';
import { RbacService } from '../../auth/rbac/rbac.service';
import { TenantContextService } from '../../common/tenant-context.service';
import { UserRole } from '@prisma/client';

/**
 * Comprehensive RBAC test setup helper
 * Provides properly configured providers for testing NestJS modules with RBAC
 */
export class RbacTestSetup {
  /**
   * Get complete RBAC providers for test module configuration
   */
  static getProviders(options: {
    tenantId?: string;
    userId?: string;
    userRole?: UserRole | string;
  } = {}) {
    const {
      tenantId = 'test-tenant-id',
      userId = 'test-user-id',
      userRole = UserRole.COMPANY_ADMIN,
    } = options;

    return [
      {
        provide: TenantContextService,
        useValue: {
          getTenantId: jest.fn().mockReturnValue(tenantId),
          getUserId: jest.fn().mockReturnValue(userId),
          getUserRole: jest.fn().mockReturnValue(userRole),
          hasContext: jest.fn().mockReturnValue(true),
          setContext: jest.fn(),
          clearContext: jest.fn(),
          validateTenantAccess: jest.fn().mockReturnValue(true),
          isAdmin: jest.fn().mockReturnValue(true),
          hasRole: jest.fn().mockReturnValue(true),
          hasAnyRole: jest.fn().mockReturnValue(true),
          getContext: jest.fn().mockReturnValue({
            tenantId,
            userId,
            userRole,
            isSet: true,
          }),
          getContextSnapshot: jest.fn().mockReturnValue(`Context[tenant:${tenantId},user:${userId},role:${userRole},set:true]`),
        },
      },
      {
        provide: RbacService,
        useValue: {
          hasPermission: jest.fn().mockReturnValue(true),
          hasAnyPermission: jest.fn().mockReturnValue(true),
          hasAllPermissions: jest.fn().mockReturnValue(true),
          getUserPermissions: jest.fn().mockReturnValue([]),
          canAccessTenant: jest.fn().mockReturnValue(true),
          canManageUser: jest.fn().mockReturnValue(true),
          canPerformActionInTenant: jest.fn().mockReturnValue(true),
          canAccessResource: jest.fn().mockReturnValue(true),
          getAssignableRoles: jest.fn().mockReturnValue([userRole]),
          getPermissionContext: jest.fn().mockReturnValue({
            userId,
            userRole,
            tenantId,
            permissions: [],
            timestamp: new Date(),
          }),
          logAuthorizationEvent: jest.fn(),
        },
      },
      {
        provide: Reflector,
        useValue: {
          get: jest.fn().mockReturnValue([]),
          getAll: jest.fn().mockReturnValue([]),
          getAllAndOverride: jest.fn().mockReturnValue([]),
        },
      },
    ];
  }

  /**
   * Set up tenant context for property tests
   */
  static setupTenantContext(
    tenantContextService: TenantContextService,
    options: {
      tenantId?: string;
      userId?: string;
      userRole?: UserRole | string;
    } = {},
  ) {
    const {
      tenantId = 'test-tenant-id',
      userId = 'test-user-id',
      userRole = UserRole.COMPANY_ADMIN,
    } = options;

    // Set up the context for the test
    jest.spyOn(tenantContextService, 'getTenantId').mockReturnValue(tenantId);
    jest.spyOn(tenantContextService, 'getUserId').mockReturnValue(userId);
    jest.spyOn(tenantContextService, 'getUserRole').mockReturnValue(userRole);
    jest.spyOn(tenantContextService, 'hasContext').mockReturnValue(true);
    jest.spyOn(tenantContextService, 'getContext').mockReturnValue({
      tenantId,
      userId,
      userRole,
      isSet: true,
    });

    return { tenantId, userId, userRole };
  }

  /**
   * Create a mock test tenant context for property tests
   */
  static createMockTenantContext(
    tenantId: string = 'test-tenant-' + Math.random().toString(36).substr(2, 9),
    userId: string = 'user-' + Math.random().toString(36).substr(2, 9),
    userRole: UserRole | string = UserRole.COMPANY_ADMIN,
  ) {
    return {
      tenantId,
      userId,
      userRole,
      context: {
        getTenantId: () => tenantId,
        getUserId: () => userId,
        getUserRole: () => userRole,
        hasContext: () => true,
        setContext: jest.fn(),
        clearContext: jest.fn(),
        getContext: () => ({
          tenantId,
          userId,
          userRole,
          isSet: true,
        }),
      },
    };
  }
}

/**
 * Property test data generation helper
 * Ensures data is created with proper tenant context to avoid foreign key constraints
 */
export class PropertyTestDataHelper {
  /**
   * Create test data with proper tenant context
   */
  static async withTenantContext<T>(
    prisma: any,
    tenantId: string,
    dataCreationFn: (prisma: any, tenantId: string) => Promise<T>,
  ): Promise<T> {
    // Use the tenant-aware prisma methods if available
    if (prisma.withTenant) {
      return await prisma.withTenant(tenantId, async (tenantPrisma: any) => {
        return await dataCreationFn(tenantPrisma, tenantId);
      });
    }

    // Fallback to regular prisma with manual tenant ID injection
    return await dataCreationFn(prisma, tenantId);
  }

  /**
   * Create a complete company hierarchy with proper tenant context
   */
  static async createCompanyHierarchy(prisma: any, tenantId: string, companyName: string) {
    const company = await prisma.company.create({
      data: {
        id: tenantId, // Use tenantId as company ID for proper foreign key relationships
        name: companyName,
        slug: companyName.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Date.now(),
        settings: {},
        branding: {},
      },
    });

    return { company, tenantId: company.id };
  }

  /**
   * Ensure test data has valid foreign key relationships
   */
  static async ensureValidForeignKeys(
    prisma: any,
    tenantId: string,
    data: any,
    entityType: 'client' | 'employee' | 'site' | 'assignment' | 'contract',
  ) {
    // Ensure company exists
    const company = await prisma.company.upsert({
      where: { id: tenantId },
      update: {},
      create: {
        id: tenantId,
        name: 'Test Company',
        slug: 'test-company-' + Date.now(),
        settings: {},
        branding: {},
      },
    });

    // Add companyId to data if needed
    if (['client', 'employee', 'site'].includes(entityType)) {
      data.companyId = company.id;
    }

    return data;
  }
}