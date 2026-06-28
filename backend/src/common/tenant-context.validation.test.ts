import { Test, TestingModule } from '@nestjs/testing';
import { TenantContextService } from './tenant-context.service';
import { TenantGuard } from './tenant.guard';
import { TenantContextMiddleware } from './tenant-context.middleware';
import { PrismaService } from '../prisma/prisma.service';
import { Reflector } from '@nestjs/core';

describe('Tenant Context Management System - Validation', () => {
  let module: TestingModule;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      providers: [
        TenantContextService,
        TenantGuard,
        TenantContextMiddleware,
        {
          provide: PrismaService,
          useValue: {
            setTenantContext: jest.fn(),
            clearTenantContext: jest.fn(),
          },
        },
        {
          provide: Reflector,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();
  });

  it('should have all tenant context components available', async () => {
    // Verify all components are properly registered and available
    const tenantContextService = await module.resolve<TenantContextService>(TenantContextService);
    const tenantGuard = module.get<TenantGuard>(TenantGuard);
    const tenantContextMiddleware = module.get<TenantContextMiddleware>(TenantContextMiddleware);

    expect(tenantContextService).toBeDefined();
    expect(tenantGuard).toBeDefined();
    expect(tenantContextMiddleware).toBeDefined();
  });

  it('should properly manage tenant context lifecycle', async () => {
    const tenantContextService = await module.resolve<TenantContextService>(TenantContextService);

    // Test context lifecycle
    expect(tenantContextService.hasContext()).toBe(false);

    // Set context
    const testTenantId = '11111111-1111-1111-1111-111111111111';
    const testUserId = 'user123';
    const testRole = 'COMPANY_ADMIN';

    tenantContextService.setContext(testTenantId, testUserId, testRole);

    // Verify context is set
    expect(tenantContextService.hasContext()).toBe(true);
    expect(tenantContextService.getTenantId()).toBe(testTenantId);
    expect(tenantContextService.getUserId()).toBe(testUserId);
    expect(tenantContextService.getUserRole()).toBe(testRole);

    // Clear context
    tenantContextService.clearContext();
    expect(tenantContextService.hasContext()).toBe(false);
  });

  it('should validate tenant access correctly', async () => {
    const tenantContextService = await module.resolve<TenantContextService>(TenantContextService);

    const tenant1 = '11111111-1111-1111-1111-111111111111';
    const tenant2 = '22222222-2222-2222-2222-222222222222';

    // Set context for tenant1
    tenantContextService.setContext(tenant1, 'user1', 'COMPANY_ADMIN');

    // Should allow access to own tenant
    expect(tenantContextService.validateTenantAccess(tenant1)).toBe(true);

    // Should deny access to different tenant
    expect(tenantContextService.validateTenantAccess(tenant2)).toBe(false);

    // Super admin should access any tenant
    tenantContextService.setContext(tenant1, 'superadmin', 'SUPER_ADMIN');
    expect(tenantContextService.validateTenantAccess(tenant1)).toBe(true);
    expect(tenantContextService.validateTenantAccess(tenant2)).toBe(true);
  });

  it('should provide role-based access checks', async () => {
    const tenantContextService = await module.resolve<TenantContextService>(TenantContextService);

    // Test company admin
    tenantContextService.setContext('tenant1', 'admin', 'COMPANY_ADMIN');
    expect(tenantContextService.isAdmin()).toBe(true);
    expect(tenantContextService.hasRole('COMPANY_ADMIN')).toBe(true);
    expect(tenantContextService.hasRole('MANAGER')).toBe(false);
    expect(tenantContextService.hasAnyRole(['COMPANY_ADMIN', 'MANAGER'])).toBe(true);

    // Test manager
    tenantContextService.setContext('tenant1', 'manager', 'MANAGER');
    expect(tenantContextService.isAdmin()).toBe(false);
    expect(tenantContextService.hasRole('MANAGER')).toBe(true);
    expect(tenantContextService.hasRole('COMPANY_ADMIN')).toBe(false);
    expect(tenantContextService.hasAnyRole(['MANAGER', 'SUPERVISOR'])).toBe(true);
  });

  afterAll(async () => {
    await module.close();
  });
});
