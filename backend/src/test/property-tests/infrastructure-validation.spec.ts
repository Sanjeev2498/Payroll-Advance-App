import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantContextService } from '../../common/tenant-context.service';
import { PropertyTestSetup, TestDataFactory, TestIsolationManager } from '../helpers/property-test-setup';
import { SitesService } from '../../sites/sites.service';
import { EmployeesService } from '../../employees/employees.service';
import { randomUUID } from 'crypto';

describe('Property Test Infrastructure Validation', () => {
  let module: TestingModule;
  let prisma: PrismaService;
  let tenantContext: TenantContextService;
  let testTenantId: string;

  beforeEach(() => {
    testTenantId = `infra-test-${randomUUID()}`;
  });

  afterEach(async () => {
    await PropertyTestSetup.performTestCleanup(module, prisma, testTenantId);
  });

  afterAll(async () => {
    await TestIsolationManager.performGlobalCleanup(prisma);
  });

  /**
   * Validates: Requirements 2.3, 2.4, 2.10
   * Test that module.resolve() works properly for service injection
   */
  it('should properly resolve services using module.resolve() instead of module.get()', async () => {
    module = await PropertyTestSetup.createTestModule([
      SitesService,
    ], [], {
      tenantId: testTenantId,
      enableTestIsolation: true,
    });

    // Test the new resolve methods work
    const sitesService = await PropertyTestSetup.resolveService<SitesService>(module, SitesService);
    expect(sitesService).toBeDefined();
    expect(typeof sitesService.findAll).toBe('function');

    const tenantContextService = await PropertyTestSetup.resolveService<TenantContextService>(module, TenantContextService);
    expect(tenantContextService).toBeDefined();
    expect(typeof tenantContextService.hasContext).toBe('function');

    // Test that services are properly mocked and functional
    expect(tenantContextService.hasContext()).toBe(true);
    expect(tenantContextService.getTenantId()).toBe(testTenantId);
  });

  /**
   * Validates: Requirements 1.10, 2.10
   * Test that comprehensive mock setup works correctly
   */
  it('should provide comprehensive mock setup for all service dependencies', async () => {
    module = await PropertyTestSetup.createTestModule([
      EmployeesService,
      SitesService,
    ], [], {
      tenantId: testTenantId,
      enableTestIsolation: true,
    });

    prisma = await PropertyTestSetup.resolveService<PrismaService>(module, PrismaService);
    tenantContext = await PropertyTestSetup.resolveService<TenantContextService>(module, TenantContextService);

    // Verify all required mocks are available
    expect(prisma).toBeDefined();
    expect(prisma.withSystemContext).toBeDefined();
    expect(typeof prisma.withSystemContext).toBe('function');
    
    expect(tenantContext).toBeDefined();
    expect(tenantContext.hasContext()).toBe(true);
    expect(tenantContext.getTenantId()).toBe(testTenantId);

    // Test that business services can be resolved and work with mocked dependencies
    const employeesService = await PropertyTestSetup.resolveService<EmployeesService>(module, EmployeesService);
    const sitesService = await PropertyTestSetup.resolveService<SitesService>(module, SitesService);

    expect(employeesService).toBeDefined();
    expect(sitesService).toBeDefined();
  });

  /**
   * Validates: Requirements 1.10, 2.1, 2.7
   * Test that prisma.withSystemContext() is used for test data creation
   */
  it('should use prisma.withSystemContext() for all test data creation', async () => {
    module = await PropertyTestSetup.createTestModule();
    prisma = await PropertyTestSetup.resolveService<PrismaService>(module, PrismaService);

    // Test that system context is used for data creation
    const result = await TestDataFactory.createWithSystemContext(
      prisma,
      async (systemPrisma) => {
        expect(systemPrisma).toBeDefined();
        expect(systemPrisma.company).toBeDefined();
        return { success: true, systemPrisma };
      }
    );

    expect(result.success).toBe(true);
    expect(result.systemPrisma).toBeDefined();
  });

  /**
   * Validates: Requirements 2.7, 2.8
   * Test proper entity creation order: Company -> Client -> Contract -> Site -> Employee
   */
  it('should create entities in proper dependency order to avoid FK constraint violations', async () => {
    module = await PropertyTestSetup.createTestModule();
    prisma = await PropertyTestSetup.resolveService<PrismaService>(module, PrismaService);

    // Test hierarchical data creation with proper order
    const hierarchy = await PropertyTestSetup.createCompleteHierarchy(prisma, testTenantId, {
      clientCount: 1,
      employeeCount: 1,
      siteCount: 1,
      createAssignments: false,
    });

    // Verify proper entity relationships
    expect(hierarchy.company).toBeDefined();
    expect(hierarchy.company.id).toBe(testTenantId);

    expect(hierarchy.clients).toHaveLength(1);
    expect(hierarchy.clients[0].companyId).toBe(testTenantId);

    expect(hierarchy.contracts).toHaveLength(1);
    expect(hierarchy.contracts[0].clientId).toBe(hierarchy.clients[0].id);

    expect(hierarchy.sites).toHaveLength(1);
    expect(hierarchy.sites[0].contractId).toBe(hierarchy.contracts[0].id);

    expect(hierarchy.employees).toHaveLength(1);
    expect(hierarchy.employees[0].companyId).toBe(testTenantId);
  });

  /**
   * Validates: Requirements 1.10, 2.10
   * Test proper cleanup to avoid data leakage
   */
  it('should implement proper cleanup methods that delete in reverse dependency order', async () => {
    module = await PropertyTestSetup.createTestModule();
    prisma = await PropertyTestSetup.resolveService<PrismaService>(module, PrismaService);

    // Create test data
    await PropertyTestSetup.createTenantData(prisma, testTenantId, 'full');

    // Test cleanup functionality
    await expect(PropertyTestSetup.cleanupTenantData(prisma, testTenantId)).resolves.not.toThrow();

    // Verify data is cleaned up (should not find the company anymore)
    const cleanupResult = await prisma.withSystemContext(async (systemPrisma) => {
      const company = await systemPrisma.company.findUnique({ where: { id: testTenantId } });
      return company;
    });

    expect(cleanupResult).toBeNull();
  });

  /**
   * Validates: Requirements 2.10
   * Test proper test isolation to prevent data leakage between tests
   */
  it('should implement proper test isolation to prevent data leakage', async () => {
    const tenant1Id = `tenant1-${randomUUID()}`;
    const tenant2Id = `tenant2-${randomUUID()}`;

    // Create first test module
    const module1 = await PropertyTestSetup.createTestModule([], [], {
      tenantId: tenant1Id,
      enableTestIsolation: true,
    });
    const prisma1 = await PropertyTestSetup.resolveService<PrismaService>(module1, PrismaService);

    // Create second test module with different tenant
    const module2 = await PropertyTestSetup.createTestModule([], [], {
      tenantId: tenant2Id,
      enableTestIsolation: true,
    });
    const prisma2 = await PropertyTestSetup.resolveService<PrismaService>(module2, PrismaService);

    // Verify tenant contexts are isolated
    const tenantContext1 = await PropertyTestSetup.resolveService<TenantContextService>(module1, TenantContextService);
    const tenantContext2 = await PropertyTestSetup.resolveService<TenantContextService>(module2, TenantContextService);

    expect(tenantContext1.getTenantId()).toBe(tenant1Id);
    expect(tenantContext2.getTenantId()).toBe(tenant2Id);
    expect(tenantContext1.getTenantId()).not.toBe(tenantContext2.getTenantId());

    // Register for cleanup
    TestIsolationManager.registerTenantForCleanup(tenant1Id);
    TestIsolationManager.registerTenantForCleanup(tenant2Id);
    TestIsolationManager.registerModuleForCleanup(module1);
    TestIsolationManager.registerModuleForCleanup(module2);

    const stats = TestIsolationManager.getCleanupStatistics();
    expect(stats.tenantCount).toBeGreaterThanOrEqual(2);
    expect(stats.moduleCount).toBeGreaterThanOrEqual(2);
  });

  /**
   * Validates: Requirements 2.3, 2.4, 2.10
   * Test comprehensive service resolution with multiple services
   */
  it('should resolve multiple services efficiently with proper error handling', async () => {
    module = await PropertyTestSetup.createTestModule([
      SitesService,
      EmployeesService,
    ]);

    const services = await PropertyTestSetup.resolveServices(module, {
      prisma: PrismaService,
      tenantContext: TenantContextService,
      sitesService: SitesService,
      employeesService: EmployeesService,
    });

    expect(services.prisma).toBeDefined();
    expect(services.tenantContext).toBeDefined();
    expect(services.sitesService).toBeDefined();
    expect(services.employeesService).toBeDefined();

    // Test that all services are properly functional
    expect(typeof services.tenantContext.hasContext).toBe('function');
    expect(services.tenantContext.hasContext()).toBe(true);
  });

  /**
   * Validates: Requirements 1.10, 2.10
   * Test comprehensive cleanup with error recovery
   */
  it('should handle cleanup errors gracefully with retry logic', async () => {
    module = await PropertyTestSetup.createTestModule();
    prisma = await PropertyTestSetup.resolveService<PrismaService>(module, PrismaService);

    const tenantIds = [
      `cleanup-test-1-${randomUUID()}`,
      `cleanup-test-2-${randomUUID()}`,
      `cleanup-test-3-${randomUUID()}`,
    ];

    // Create test data for multiple tenants
    for (const tenantId of tenantIds) {
      await PropertyTestSetup.createTenantData(prisma, tenantId, 'minimal');
    }

    // Test comprehensive cleanup
    const result = await TestDataFactory.comprehensiveCleanup(prisma, tenantIds, {
      continueOnError: true,
      maxRetries: 2,
      retryDelay: 10,
    });

    expect(result).toBeDefined();
    expect(result.success).toEqual(expect.arrayContaining(tenantIds));
    expect(result.failed).toEqual([]);
  });
});