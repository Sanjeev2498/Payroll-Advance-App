import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaModule } from '../prisma/prisma.module';
import { TenantContextService } from '../common/tenant-context.service';
import { PayrollModule } from './payroll.module';
import { PayrollRunManagementService } from './services/payroll-run-management.service';
import { PayrollBatchProcessingDto, PayrollRunFilterDto } from './dto';
import { PayrollStatus, EmploymentStatus, AssignmentStatus, AttendanceStatus } from '@prisma/client';
import { Decimal } from 'decimal.js';
import { v4 as uuidv4 } from 'uuid';

import { TestDataUtil } from '../test/utils/test-data.util';

describe('PayrollRunManagementService Integration', () => {
  let app: INestApplication;
  let payrollRunManagementService: PayrollRunManagementService;
  let prismaService: PrismaService;
  let tenantContextService: TenantContextService;

  // Test data
  let testCompanyId: string;
  let testClientId: string;
  let testSiteId: string;
  let testEmployeeIds: string[] = [];
  let testAssignmentIds: string[] = [];

  beforeAll(async () => {
    // Create a shared mock TenantContextService
    const mockTenantContextService = {
      tenantId: null,
      setContext: function(tenantId: string) { this.tenantId = tenantId; },
      getTenantId: function() { 
        return this.tenantId || testCompanyId; // Default to testCompanyId
      },
      hasContext: () => true,
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        PayrollModule,
        PrismaModule,
      ],
    })
    .overrideProvider(TenantContextService)
    .useValue(mockTenantContextService)
    .compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    payrollRunManagementService = await moduleFixture.resolve<PayrollRunManagementService>(PayrollRunManagementService);
    prismaService = moduleFixture.get<PrismaService>(PrismaService) || new PrismaService();
    tenantContextService = mockTenantContextService;

    console.log('Services resolved:', {
      payrollService: !!payrollRunManagementService,
      prismaService: !!prismaService,
      tenantService: !!tenantContextService,
      prismaProps: Object.keys(prismaService || {}).slice(0, 10),
      prismaCompanyMethod: typeof prismaService?.company
    });

    // Setup test data and wait for completion
    await setupTestData();
    
    // Verify testCompanyId is available
    if (!testCompanyId) {
      throw new Error('Test company ID not initialized after setup');
    }
    
    // Set the tenant context for all tests
    mockTenantContextService.setContext(testCompanyId);
  });

  afterAll(async () => {
    await cleanupTestData();
    await app.close();
  });

  describe('Payroll Run Batch Processing', () => {
    it('should create payroll run with batch processing successfully', async () => {
      // Recreate company and essential test data
      await setupTestData();
      
      // Setup tenant context
      jest.spyOn(tenantContextService, 'getTenantId').mockReturnValue(testCompanyId);

      const dto: PayrollBatchProcessingDto = {
        payPeriodStart: '2024-01-01',
        payPeriodEnd: '2024-01-31',
        employeeIds: testEmployeeIds,
        dryRun: false,
        skipErrors: false,
        sendNotifications: false, // Disable for testing
        processingConfig: {
          batchSize: 5,
          maxRetries: 2,
          timeoutMinutes: 10,
        },
      };

      const result = await payrollRunManagementService.createPayrollRunBatch(dto);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.payrollRunId).toBeDefined();
      expect(result.processedEmployees).toBeGreaterThanOrEqual(0);
      expect(result.summary).toBeDefined();
      expect(result.summary.payrollRunId).toBe(result.payrollRunId);

      // Verify payroll run was created in database
      const payrollRun = await prismaService.payrollRuns.findUnique({
        where: { id: result.payrollRunId },
      });

      expect(payrollRun).toBeDefined();
      expect(payrollRun!.company_id).toBe(testCompanyId);
      expect(payrollRun!.status).toBe(PayrollStatus.COMPLETED);
    });

    it('should perform dry run without saving data', async () => {
      jest.spyOn(tenantContextService, 'getTenantId').mockReturnValue(testCompanyId);

      const dto: PayrollBatchProcessingDto = {
        payPeriodStart: '2024-02-01',
        payPeriodEnd: '2024-02-29',
        employeeIds: testEmployeeIds.slice(0, 2),
        dryRun: true,
        skipErrors: false,
        sendNotifications: false,
      };

      const result = await payrollRunManagementService.createPayrollRunBatch(dto);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.payrollRunId).toBe('dry-run');
      
      // Verify no payroll run was created in database
      const payrollRuns = await prismaService.payrollRuns.findMany({
        where: {
          company_id: testCompanyId,
          pay_period_start: new Date('2024-02-01'),
        },
      });

      expect(payrollRuns).toHaveLength(0);
    });

    it('should handle validation errors appropriately', async () => {
      jest.spyOn(tenantContextService, 'getTenantId').mockReturnValue(testCompanyId);

      const dto: PayrollBatchProcessingDto = {
        payPeriodStart: '2024-03-31', // Invalid: start after end
        payPeriodEnd: '2024-03-01',
        employeeIds: testEmployeeIds,
        dryRun: false,
        skipErrors: false,
        sendNotifications: false,
      };

      await expect(
        payrollRunManagementService.createPayrollRunBatch(dto)
      ).rejects.toThrow();
    });
  });

  describe('Payroll Run Filtering', () => {
    let testPayrollRunId: string;

    beforeEach(async () => {
      // Recreate company and essential test data for this test suite
      await setupTestData();
      
      // Create a test payroll run
      jest.spyOn(tenantContextService, 'getTenantId').mockReturnValue(testCompanyId);
      
      const payrollRun = await prismaService.payrollRuns.create({
        data: {
          id: randomUUID(),
          company_id: testCompanyId,
          run_number: 'TEST-2024-01-001',
          pay_period_start: new Date('2024-01-01'),
          pay_period_end: new Date('2024-01-31'),
          status: PayrollStatus.COMPLETED,
          total_amount: 50000,
          processed_at: new Date(),
          updated_at: new Date(),
        },
      });

      testPayrollRunId = payrollRun.id;
    });

    it('should filter payroll runs by status', async () => {
      jest.spyOn(tenantContextService, 'getTenantId').mockReturnValue(testCompanyId);

      const filter: PayrollRunFilterDto = {
        status: PayrollStatus.COMPLETED,
        page: 1,
        limit: 10,
      };

      const result = await payrollRunManagementService.getPayrollRuns(filter);

      expect(result).toBeDefined();
      expect(result.data).toBeInstanceOf(Array);
      expect(result.data.length).toBeGreaterThan(0);
      expect(result.data.every(run => run.status === PayrollStatus.COMPLETED)).toBe(true);
      expect(result.pagination).toBeDefined();
      expect(result.pagination.page).toBe(1);
    });

    it('should filter payroll runs by pay period', async () => {
      jest.spyOn(tenantContextService, 'getTenantId').mockReturnValue(testCompanyId);

      const filter: PayrollRunFilterDto = {
        payPeriodFrom: '2024-01-01',
        payPeriodTo: '2024-01-31',
        page: 1,
        limit: 10,
      };

      const result = await payrollRunManagementService.getPayrollRuns(filter);

      expect(result).toBeDefined();
      expect(result.data).toBeInstanceOf(Array);
      expect(result.data.some(run => run.id === testPayrollRunId)).toBe(true);
    });

    it('should search payroll runs by run number', async () => {
      jest.spyOn(tenantContextService, 'getTenantId').mockReturnValue(testCompanyId);

      const filter: PayrollRunFilterDto = {
        runNumber: 'TEST-2024',
        page: 1,
        limit: 10,
      };

      const result = await payrollRunManagementService.getPayrollRuns(filter);

      expect(result).toBeDefined();
      expect(result.data).toBeInstanceOf(Array);
      expect(result.data.some(run => run.run_number.includes('TEST-2024'))).toBe(true);
    });
  });

  describe('Payroll Run Analytics', () => {
    let testPayrollRunId: string;

    beforeEach(async () => {
      // Recreate company and essential test data for this test suite  
      await setupTestData();
      
      // Create test payroll run with items
      jest.spyOn(tenantContextService, 'getTenantId').mockReturnValue(testCompanyId);
      
      const payrollRun = await prismaService.payrollRuns.create({
        data: {
          id: randomUUID(),
          company_id: testCompanyId,
          run_number: 'ANALYTICS-TEST-001',
          pay_period_start: new Date('2024-01-01'),
          pay_period_end: new Date('2024-01-31'),
          status: PayrollStatus.COMPLETED,
          total_amount: 75000,
          processed_at: new Date(),
          updated_at: new Date(),
        },
      });

      testPayrollRunId = payrollRun.id;

      // Create sample payroll items
      await prismaService.payrollItems.createMany({
        data: [
          {
            id: randomUUID(),
            payroll_run_id: testPayrollRunId,
            employee_id: testEmployeeIds[0],
            item_type: 'BASIC_PAY',
            description: 'Basic Pay',
            amount: "20000",
            amount_iv: "test-iv",
            amount_tag: "test-tag",
            calculation_data: { hours: 160, rate: 125 },
            updated_at: new Date(),
          },
          {
            id: randomUUID(),
            payroll_run_id: testPayrollRunId,
            employee_id: testEmployeeIds[0],
            item_type: 'OVERTIME',
            description: 'Overtime Pay',
            amount: "5000",
            amount_iv: "test-iv",
            amount_tag: "test-tag",
            calculation_data: { hours: 20, rate: 250 },
            updated_at: new Date(),
          },
          {
            id: randomUUID(),
            payroll_run_id: testPayrollRunId,
            employee_id: testEmployeeIds[0],
            item_type: 'TAX_DEDUCTION',
            description: 'Income Tax',
            amount: "-2500",
            amount_iv: "test-iv",
            amount_tag: "test-tag",
            calculation_data: { rate: 0.1 },
            updated_at: new Date(),
          },
        ],
      });
    });

    it('should generate comprehensive payroll analytics', async () => {
      jest.spyOn(tenantContextService, 'getTenantId').mockReturnValue(testCompanyId);

      const analytics = await payrollRunManagementService.getPayrollRunAnalytics(testPayrollRunId);

      expect(analytics).toBeDefined();
      expect(analytics.payrollRunId).toBe(testPayrollRunId);
      expect(analytics.run_number).toBe('ANALYTICS-TEST-001');
      expect(analytics.status).toBe(PayrollStatus.COMPLETED);
      expect(analytics.employeeCount).toBeGreaterThan(0);
      expect(analytics.analytics).toBeDefined();
      expect(analytics.analytics.totalGross).toBeDefined();
      expect(analytics.analytics.totalDeductions).toBeDefined();
      expect(analytics.analytics.averageSalary).toBeDefined();
      expect(analytics.analytics.itemBreakdown).toBeDefined();
    });

    it('should calculate correct item breakdown', async () => {
      jest.spyOn(tenantContextService, 'getTenantId').mockReturnValue(testCompanyId);

      const analytics = await payrollRunManagementService.getPayrollRunAnalytics(testPayrollRunId);

      const breakdown = analytics.analytics.itemBreakdown;
      expect(breakdown['BASIC_PAY']).toBeDefined();
      expect(breakdown['OVERTIME']).toBeDefined();
      expect(breakdown['TAX_DEDUCTION']).toBeDefined();
      
      // Verify amounts match what we created
      expect(Number(breakdown['BASIC_PAY'])).toBe(20000);
      expect(Number(breakdown['OVERTIME'])).toBe(5000);
    });
  });

  // Helper functions

  async function setupTestData() {
    // Reset arrays for fresh setup
    testEmployeeIds.length = 0;
    testAssignmentIds.length = 0;
    
    // Generate a UUID for the test company
    const companyId = uuidv4();
    const now = new Date();
    
    // Create test company
    const company = await prismaService.companies.create({
      data: {
        id: companyId,
        name: 'Test Payroll Company',
        slug: 'test-payroll-company',
        settings: {},
        branding: {},
        created_at: now,
        updated_at: now,
      },
    });
    testCompanyId = company.id;

    // Create test client using the new schema structure
    const client = await prismaService.clients.create({
      data: TestDataUtil.createTestClientData(testCompanyId),
    });
    
    // Create contract for the client
    const contract = await prismaService.contracts.create({
      data: {
        client_id: client.id,
        contract_number: `CONTRACT-${Date.now()}`,
        title: `Security Services - ${client.name}`,
        status: 'ACTIVE',
        start_date: new Date('2024-01-01'),
        service_definitions: {
          securityServices: ['Static Guard', 'Mobile Patrol'],
          coverage: { hours: 24, days: 7 }
        },
        billing_preferences: {
          frequency: 'MONTHLY',
          paymentTerms: 'NET_30'
        }
      },
    });
    testClientId = client.id;

    // Create test site with contract
    const site = await prismaService.sites.create({
      data: {
        id: randomUUID(),
        client_id: client.id,
        contract_id: contract.id,
        name: 'Test Site',
        address: { street: '123 Test St', city: 'Test City' },
        operational_status: 'ACTIVE',
        updated_at: new Date(),
      },
    });
    testSiteId = site.id;

    // Create test employees
    for (let i = 1; i <= 3; i++) {
      const employee = await prismaService.employees.create({
        data: {
          id: randomUUID(),
          company_id: testCompanyId,
          employee_number: `EMP-${i.toString().padStart(3, '0')}`,
          first_name: `Test${i}`,
          last_name: 'Employee',
          email: `employee${i}@test.com`,
          phone: `+91-9876543${i.toString().padStart(3, '0')}`,
          employment_status: 'ACTIVE',
          hire_date: new Date('2023-06-01'),
          skills: ['security', 'customer-service'],
          updated_at: new Date(),
        },
      });
      testEmployeeIds.push(employee.id);

      // Create assignment for each employee
      const assignment = await prismaService.assignments.create({
        data: {
          id: randomUUID(),
          employee_id: employee.id,
          site_id: testSiteId,
          role: 'Security Guard',
          status: 'ACTIVE',
          start_date: new Date('2023-06-01'),
          hourly_rate: '25.00', // Required field
          hourly_rate_iv: 'mock_iv', // Required field
          hourly_rate_tag: 'mock_tag', // Required field
          updated_at: new Date(),
        },
      });
      testAssignmentIds.push(assignment.id);

      // Create sample shifts and attendance
      const shift = await prismaService.shifts.create({
        data: {
          id: randomUUID(),
          assignment_id: assignment.id,
          site_id: testSiteId,
          shift_date: new Date('2024-01-15'),
          start_time: new Date('2024-01-15T08:00:00Z'),
          end_time: new Date('2024-01-15T16:00:00Z'),
          shift_type: 'REGULAR',
          status: 'SCHEDULED',
          coverage_required: 1,
          coverage_assigned: 1,
          updated_at: new Date(),
        },
      });

      await prismaService.attendance.create({
        data: {
          id: randomUUID(),
          employee_id: employee.id,
          shift_id: shift.id,
          clock_in: new Date('2024-01-15T08:00:00Z'),
          clock_out: new Date('2024-01-15T16:00:00Z'),
          status: 'PRESENT',
          location_data: { lat: 12.9716, lng: 77.5946 },
          updated_at: new Date(),
        },
      });
    }
  }

  async function cleanupTestData() {
    try {
      // Clean up in reverse order of dependencies
      // Get all employee IDs for the company first
      const companyEmployees = await prismaService.employees.findMany({
        where: { company_id: testCompanyId },
        select: { id: true }
      });
      const employeeIds = companyEmployees.map(emp => emp.id);

      // Get all payroll run IDs for the company first
      const companyPayrollRuns = await prismaService.payrollRuns.findMany({
        where: { company_id: testCompanyId },
        select: { id: true }
      });
      const payrollRunIds = companyPayrollRuns.map(run => run.id);

      // Get all client IDs for the company first
      const companyClients = await prismaService.clients.findMany({
        where: { company_id: testCompanyId },
        select: { id: true }
      });
      const clientIds = companyClients.map(client => client.id);

      // Get all contract IDs for these clients
      const clientContracts = await prismaService.contracts.findMany({
        where: { client_id: { in: clientIds } },
        select: { id: true }
      });
      const contractIds = clientContracts.map(contract => contract.id);

      // Clean up attendance using employee IDs
      if (employeeIds.length > 0) {
        await prismaService.attendance.deleteMany({
          where: { employee_id: { in: employeeIds } }
        });
      }

      // Clean up shifts
      await prismaService.shifts.deleteMany({
        where: { site_id: testSiteId }
      });

      // Clean up shift templates
      await prismaService.shiftTemplates.deleteMany({
        where: { company_id: testCompanyId }
      });

      // Clean up payroll items using payroll run IDs
      if (payrollRunIds.length > 0) {
        await prismaService.payrollItems.deleteMany({
          where: { payroll_run_id: { in: payrollRunIds } }
        });
      }

      // Clean up payroll runs
      await prismaService.payrollRuns.deleteMany({
        where: { company_id: testCompanyId }
      });

      // Clean up assignments using employee IDs
      if (employeeIds.length > 0) {
        await prismaService.assignments.deleteMany({
          where: { employee_id: { in: employeeIds } }
        });
      }

      // Clean up employees
      await prismaService.employees.deleteMany({
        where: { company_id: testCompanyId }
      });

      // Clean up sites using contract IDs
      if (contractIds.length > 0) {
        await prismaService.sites.deleteMany({
          where: { contract_id: { in: contractIds } }
        });
      }

      // Clean up contracts using client IDs
      if (clientIds.length > 0) {
        await prismaService.contracts.deleteMany({
          where: { client_id: { in: clientIds } }
        });
      }

      // Clean up clients
      await prismaService.clients.deleteMany({
        where: { company_id: testCompanyId }
      });

      // Finally, clean up the company
      await prismaService.companies.delete({
        where: { id: testCompanyId }
      });
    } catch (error) {
      console.error('Cleanup failed:', error);
      // Don't throw error during cleanup to avoid interfering with test results
    }
  }
});
