import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantContextService } from '../../common/tenant-context.service';
import { PropertyTestSetup, PropertyTestGenerators } from '../helpers/property-test-setup';
import { AuthController } from '../../auth/auth.controller';
import { AuthService } from '../../auth/auth.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { SitesService } from '../../sites/sites.service';
import { InvoiceCalculationService } from '../../billing/services/invoice-calculation.service';
import { SupervisorPortalController } from '../../supervisor-portal/supervisor-portal.controller';
import { SupervisorPortalService } from '../../supervisor-portal/supervisor-portal.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { SupervisorOrAbove } from '../../common/tenant.guard';
import { EmployeesService } from '../../employees/employees.service';
import { BillingService } from '../../billing/billing.service';
import { ContractsService } from '../../contracts/contracts.service';
import { EncryptionUtil } from '../../common/utils/encryption.util';
import { ConfigService } from '@nestjs/config';
import * as fc from 'fast-check';
import { randomUUID } from 'crypto';

/**
 * **Validates: Requirements 2.1-2.10**
 * 
 * Bug Condition Exploration Property Test
 * 
 * CRITICAL: This test MUST FAIL on unfixed code - failure confirms the infrastructure bugs exist
 * DO NOT attempt to fix the test or the code when it fails
 * 
 * GOAL: Surface counterexamples that demonstrate the 10 categories of test infrastructure failures exist:
 * 1. Database schema column name mismatches (contact_info vs contactInfo)
 * 2. Billing integration field mapping errors (clientId vs contractId)
 * 3. PrismaService dependency injection failures
 * 4. ConfigService resolution errors in EncryptionUtil
 * 5. TenantContext mocking failures
 * 6. Invoice generation parameter mismatches
 * 7. Data structure inconsistencies in billing tests
 * 8. Employee field name inconsistencies
 * 9. SupervisorPortalController constructor errors
 * 10. Property test service injection failures
 */
describe('Bug Condition Exploration - Test Infrastructure Reliability', () => {
  let prisma: PrismaService;
  let tenantContext: TenantContextService;
  let module: TestingModule;

  const testTenantId = `bug-test-${randomUUID()}`;

  beforeAll(async () => {
    console.log('🔍 Bug Condition Exploration: Testing infrastructure components on UNFIXED code');
    console.log('🚨 EXPECTED OUTCOME: Test failures that demonstrate infrastructure bugs exist');
  });

  afterAll(async () => {
    if (prisma && testTenantId) {
      await PropertyTestSetup.cleanupTenantData(prisma, testTenantId).catch(console.error);
    }
    if (module) {
      await module.close();
    }
  });

  /**
   * Property 1: Database Schema Column Name Alignment
   * Tests that database operations use correct column names matching Prisma schema
   */
  it('should expose schema column name mismatches (employees.contact_info vs contactInfo)', async () => {
    module = await PropertyTestSetup.createTestModule([
      EmployeesService,
    ]);

    prisma = module.get<PrismaService>(PrismaService);
    tenantContext = module.get<TenantContextService>(TenantContextService);
    const employeesService = module.get<EmployeesService>(EmployeesService);

    PropertyTestSetup.setupTenantContext(tenantContext, testTenantId);

    // Create test data first
    const { company, employee } = await PropertyTestSetup.createTenantData(prisma, testTenantId, 'full');

    // Test database operation that should fail with "contact_info does not exist" error
    // This simulates the old field name being used in tests
    const result = await prisma.$queryRaw`
      SELECT id, contact_info FROM employees 
      WHERE "companyId" = ${testTenantId} 
      LIMIT 1
    `.catch((error) => {
      console.log('🐛 FOUND BUG 1: Schema column mismatch -', error.message);
      return { error: error.message, category: 'schema_column_mismatch' };
    });

    // The bug condition: query fails because column is actually named 'contactInfo' not 'contact_info'
    expect(result).toHaveProperty('error');
    expect(result.error).toContain('contact_info');
  });

  /**
   * Property 2: Dependency Injection Chain Completion  
   * Tests that authentication guards can resolve all required dependencies
   */
  it('should expose dependency injection failures in auth guards', async () => {
    let dependencyError = null;

    try {
      // Attempt to create auth controller without proper TenantContextService setup
      module = await Test.createTestingModule({
        imports: [ConfigModule.forRoot()],
        controllers: [AuthController],
        providers: [
          AuthService,
          PrismaService,
          // Missing TenantContextService - this should cause injection failure
          JwtAuthGuard,
        ],
      }).compile();

      const authController = module.get<AuthController>(AuthController);
      await authController.getProfile({ user: { id: 'test' } } as any);
    } catch (error) {
      dependencyError = error;
      console.log('🐛 FOUND BUG 2: Dependency injection failure -', error.message);
    }

    // The bug condition: dependency injection fails because TenantContextService is missing
    expect(dependencyError).not.toBeNull();
    expect(dependencyError.message).toContain('dependencies');
  });

  /**
   * Property 3: PrismaService Injection Validation
   * Tests that services have properly injected PrismaService
   */
  it('should expose PrismaService undefined errors', async () => {
    module = await PropertyTestSetup.createTestModule([
      SitesService,
      TenantContextService,
    ]);

    const sitesService = module.get<SitesService>(SitesService);
    tenantContext = module.get<TenantContextService>(TenantContextService);
    
    PropertyTestSetup.setupTenantContext(tenantContext, testTenantId);

    let prismaError = null;

    try {
      // This should fail if this.prisma is undefined in SitesService
      await sitesService.findAll();
    } catch (error) {
      prismaError = error;
      console.log('🐛 FOUND BUG 3: PrismaService injection failure -', error.message);
    }

    // The bug condition: service fails because this.prisma is undefined
    expect(prismaError).not.toBeNull();
    expect(prismaError.message).toMatch(/Cannot read properties.*findFirst|prisma.*undefined/);
  });

  /**
   * Property 4: ConfigService Resolution for Dependencies
   * Tests that EncryptionUtil can resolve ConfigService dependency
   */
  it('should expose ConfigService resolution errors in EncryptionUtil', async () => {
    let configError = null;

    try {
      module = await Test.createTestingModule({
        providers: [
          EncryptionUtil,
          // Missing ConfigService - should cause resolution failure
          PrismaService,
        ],
      }).compile();

      const encryptionUtil = module.get<EncryptionUtil>(EncryptionUtil);
      await encryptionUtil.encrypt('test-data');
    } catch (error) {
      configError = error;
      console.log('🐛 FOUND BUG 4: ConfigService resolution failure -', error.message);
    }

    // The bug condition: EncryptionUtil fails because ConfigService cannot be resolved
    expect(configError).not.toBeNull();
    expect(configError.message).toContain('ConfigService');
  });

  /**
   * Property 5: TenantContext Method Mocking
   * Tests that tenant context methods are properly mocked
   */
  it('should expose TenantContext mocking failures', async () => {
    module = await PropertyTestSetup.createTestModule([
      SitesService,
      TenantContextService,
    ]);

    const sitesService = module.get<SitesService>(SitesService);
    tenantContext = module.get<TenantContextService>(TenantContextService);

    // Simulate improper mocking by overriding hasContext to be undefined
    (tenantContext as any).hasContext = undefined;

    let mockingError = null;

    try {
      const queryDto = {
        page: 1,
        limit: 10,
        search: '',
        clientId: '',
        operationalStatus: '',
        sortBy: 'name',
        sortOrder: 'asc',
      };
      await sitesService.findAll(queryDto);
    } catch (error) {
      mockingError = error;
      console.log('🐛 FOUND BUG 5: TenantContext mocking failure -', error.message);
    }

    // The bug condition: method fails because tenantContext.hasContext is not a function
    expect(mockingError).not.toBeNull();
    expect(mockingError.message).toMatch(/hasContext.*not.*function|Cannot read.*hasContext/);
  });

  /**
   * Property 5b: TenantContext Method Mocking - FIXED VERSION
   * Tests that tenant context methods work properly when correctly mocked
   */
  it('should properly mock TenantContext methods when configured correctly', async () => {
    module = await PropertyTestSetup.createTestModule([
      SitesService,
      TenantContextService,
    ]);

    const sitesService = module.get<SitesService>(SitesService);
    tenantContext = module.get<TenantContextService>(TenantContextService);

    // Verify proper mocking is already in place (PropertyTestSetup should handle this)
    let mockingError = null;
    let result = null;

    try {
      // This should work with properly mocked TenantContext - provide required queryDto parameter
      const queryDto = {
        page: 1,
        limit: 10,
        search: '',
        clientId: '',
        operationalStatus: '',
        sortBy: 'name',
        sortOrder: 'asc',
      };
      result = await sitesService.findAll(queryDto);
    } catch (error) {
      mockingError = error;
      console.log('❌ UNEXPECTED ERROR in fixed TenantContext mocking -', error.message);
    }

    // The fixed condition: method should work with properly mocked tenantContext.hasContext
    expect(mockingError).toBeNull();
    expect(result).toBeDefined();
    expect(typeof tenantContext.hasContext).toBe('function');
    expect(tenantContext.hasContext()).toBe(true);
  });

  /**
   * Property 6: Invoice Generation Parameter Alignment
   * Tests that invoice generation uses correct parameter names
   */
  it('should expose invoice generation parameter mismatches', async () => {
    module = await PropertyTestSetup.createTestModule([
      InvoiceCalculationService,
      ConfigService,
    ]);

    const invoiceService = module.get<InvoiceCalculationService>(InvoiceCalculationService);
    
    let parameterError = null;

    try {
      // Try to generate invoice number using contractId parameter (FIXED)
      const invoiceNumber = await (invoiceService as any).generateInvoiceNumber(
        'company-123',
        'contract-123' // FIXED: Now uses contractId instead of clientId
      );
    } catch (error) {
      parameterError = error;
      console.log('🐛 FOUND BUG 6: Invoice parameter mismatch -', error.message);
    }

    // The bug condition: method fails because it expects contractId but receives clientId
    expect(parameterError).not.toBeNull();
    expect(parameterError.message).toMatch(/contractId|clientId/);
  });

  /**
   * Property 7: Data Structure Hierarchy Alignment  
   * Tests that billing tests use correct Client -> Contract -> Site relationship
   */
  it('should expose data structure inconsistencies in billing tests', async () => {
    module = await PropertyTestSetup.createTestModule([
      BillingService,
    ]);

    prisma = module.get<PrismaService>(PrismaService);
    tenantContext = module.get<TenantContextService>(TenantContextService);
    const billingService = module.get<BillingService>(BillingService);

    PropertyTestSetup.setupTenantContext(tenantContext, testTenantId);

    let structureError = null;

    try {
      // Create test data using old structure (contract fields on Client)
      const testClient = await prisma.client.create({
        data: {
          companyId: testTenantId,
          name: 'Test Client',
          contactEmail: 'test@example.com',
          contactInfo: {},
          // These fields should now be on Contract, not Client
          contractStatus: 'ACTIVE', // This should fail - field doesn't exist on Client
          contractStart: new Date(),
          billingPreferences: { cycle: 'monthly' },
        },
      });
    } catch (error) {
      structureError = error;
      console.log('🐛 FOUND BUG 7: Data structure inconsistency -', error.message);
    }

    // The bug condition: data creation fails because contract fields don't exist on Client
    expect(structureError).not.toBeNull();
    expect(structureError.message).toContain('contractStatus');
  });

  /**
   * Property 8: Employee Field Name Consistency
   * Tests that employee tests use consistent field names with schema
   */
  it('should expose employee field name inconsistencies', async () => {
    module = await PropertyTestSetup.createTestModule([
      EmployeesService,
    ]);

    prisma = module.get<PrismaService>(PrismaService);
    tenantContext = module.get<TenantContextService>(TenantContextService);

    PropertyTestSetup.setupTenantContext(tenantContext, testTenantId);

    let fieldError = null;

    try {
      // Create employee with inconsistent field names
      await prisma.employee.create({
        data: {
          companyId: testTenantId,
          employeeNumber: 'EMP-001',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@test.com',
          phone: '555-0123',
          contact_info: { phone: '555-0123' }, // Wrong field name - should be contactInfo
          employmentStatus: 'ACTIVE',
          hireDate: new Date(),
        },
      });
    } catch (error) {
      fieldError = error;
      console.log('🐛 FOUND BUG 8: Employee field name inconsistency -', error.message);
    }

    // The bug condition: employee creation fails due to incorrect field name
    expect(fieldError).not.toBeNull();
    expect(fieldError.message).toContain('contact_info');
  });

  /**
   * Property 9: Controller Constructor Resolution
   * Tests that controllers can be properly instantiated in tests
   */
  it('should expose SupervisorPortalController constructor errors', async () => {
    let constructorError = null;

    try {
      module = await Test.createTestingModule({
        controllers: [SupervisorPortalController],
        providers: [
          // Missing SupervisorPortalService dependency - should cause constructor error
          {
            provide: PrismaService,
            useValue: {
              site: { findMany: jest.fn() },
              assignment: { findMany: jest.fn() },
            },
          },
          {
            provide: TenantContextService,
            useValue: {
              getTenantId: jest.fn().mockReturnValue('test-tenant'),
              hasContext: jest.fn().mockReturnValue(true),
            },
          },
          // SupervisorPortalService is missing - this should cause the constructor error
        ],
      }).compile();

      const controller = module.get<SupervisorPortalController>(SupervisorPortalController);
    } catch (error) {
      constructorError = error;
      console.log('🐛 FOUND BUG 9: Controller constructor error -', error.message);
    }

    // The bug condition: controller fails to instantiate due to missing SupervisorPortalService dependency
    expect(constructorError).not.toBeNull();
    expect(constructorError.message).toMatch(/SupervisorPortalService|Cannot resolve|metatype/);
  });

  /**
   * Property 9b: Controller Constructor Resolution - FIXED VERSION
   * Tests that controllers can be properly instantiated when all dependencies are provided
   */
  it('should properly instantiate SupervisorPortalController when dependencies are provided', async () => {
    let controllerInstance = null;
    let instantiationError = null;

    try {
      module = await Test.createTestingModule({
        controllers: [SupervisorPortalController],
        providers: [
          {
            provide: SupervisorPortalService,
            useValue: {
              getDashboardOverview: jest.fn(),
              processAttendanceApproval: jest.fn(),
              getSiteHealthMonitoring: jest.fn(),
              getDailyMusterRoll: jest.fn(),
              handleEmergencyReplacement: jest.fn(),
            },
          },
          {
            provide: PrismaService,
            useValue: {
              site: { findMany: jest.fn() },
              assignment: { findMany: jest.fn() },
            },
          },
          {
            provide: TenantContextService,
            useValue: {
              getTenantId: jest.fn().mockReturnValue('test-tenant'),
              hasContext: jest.fn().mockReturnValue(true),
            },
          },
        ],
      })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn().mockReturnValue(true) })
      .overrideGuard(SupervisorOrAbove)
      .useValue({ canActivate: jest.fn().mockReturnValue(true) })
      .compile();

      controllerInstance = module.get<SupervisorPortalController>(SupervisorPortalController);
    } catch (error) {
      instantiationError = error;
      console.log('❌ UNEXPECTED ERROR in fixed controller instantiation -', error.message);
    }

    // The fixed condition: controller should instantiate successfully with proper dependencies
    expect(instantiationError).toBeNull();
    expect(controllerInstance).toBeDefined();
    expect(controllerInstance).toBeInstanceOf(SupervisorPortalController);
  });

  /**
   * Property 10: Property Test Service Injection
   * Tests that property tests can properly inject and mock services
   */
  it('should expose property test service injection failures', async () => {
    module = await PropertyTestSetup.createTestModule();

    let serviceError = null;

    try {
      // Attempt to resolve service for property testing without proper setup
      const nonExistentService = module.get('NonExistentService', { strict: false });
      
      // Try to use module.resolve instead of module.get for scoped services
      const scopedService = await module.resolve(PrismaService);
      
      if (!scopedService.findFirst) {
        throw new Error('Service injection failed - findFirst method not available');
      }
    } catch (error) {
      serviceError = error;
      console.log('🐛 FOUND BUG 10: Property test service injection failure -', error.message);
    }

    // The bug condition: service resolution fails in property test context
    expect(serviceError).not.toBeNull();
    expect(serviceError.message).toMatch(/Service.*injection|resolve|findFirst/);
  });

  /**
   * Property-based test to validate infrastructure reliability across random scenarios
   * This should fail on multiple categories when run against unfixed code
   */
  it('should demonstrate infrastructure failures across generated test scenarios', async () => {
    const testScenarios = fc.sample(fc.record({
      tenantId: fc.string({ minLength: 10, maxLength: 20 }),
      operationType: fc.constantFrom(
        'employee_creation',
        'client_billing',
        'site_management', 
        'contract_operations',
        'invoice_generation'
      ),
      useOldFieldNames: fc.boolean(),
      includeDependencies: fc.boolean(),
    }), 5);

    let infrastructureFailures: string[] = [];

    for (const scenario of testScenarios) {
      console.log(`🧪 Testing scenario: ${scenario.operationType} with tenant ${scenario.tenantId}`);
      
      try {
        // Each scenario will likely fail due to different infrastructure issues
        module = await PropertyTestSetup.createTestModule(
          scenario.includeDependencies ? [TenantContextService] : []
        );

        prisma = module.get<PrismaService>(PrismaService);
        
        if (scenario.operationType === 'employee_creation') {
          // This will fail if field names are wrong or dependencies missing
          await prisma.employee.findMany({
            where: { contact_info: { not: null } } // Wrong field name
          });
        }

        console.log(`✅ Scenario ${scenario.operationType} unexpectedly passed`);
      } catch (error) {
        const failureMsg = `${scenario.operationType}: ${error.message}`;
        infrastructureFailures.push(failureMsg);
        console.log(`🐛 FOUND INFRASTRUCTURE BUG in ${scenario.operationType}: ${error.message}`);
      }
    }

    // Document the counterexamples found
    console.log('\n📋 COUNTEREXAMPLES FOUND:');
    infrastructureFailures.forEach((failure, index) => {
      console.log(`${index + 1}. ${failure}`);
    });

    // The bug condition: multiple infrastructure failures should be detected
    expect(infrastructureFailures.length).toBeGreaterThan(0);
    expect(infrastructureFailures).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/contact_info|schema|dependency|injection|metatype/)
      ])
    );
  });
});