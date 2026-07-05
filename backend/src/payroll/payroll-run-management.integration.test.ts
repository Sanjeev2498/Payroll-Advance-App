import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from '../common/tenant-context.service';
import { PayrollModule } from './payroll.module';
import { PayrollRunManagementService } from './services/payroll-run-management.service';
import { PayrollBatchProcessingDto, PayrollRunFilterDto } from './dto';
import { PayrollStatus, EmploymentStatus, AssignmentStatus, AttendanceStatus } from '@prisma/client';
import { Decimal } from 'decimal.js';

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
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        PayrollModule
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    payrollRunManagementService = moduleFixture.get<PayrollRunManagementService>(PayrollRunManagementService);
    prismaService = moduleFixture.get<PrismaService>(PrismaService);
    tenantContextService = moduleFixture.get<TenantContextService>(TenantContextService);

    // Setup test data
    await setupTestData();
  });

  afterAll(async () => {
    await cleanupTestData();
    await app.close();
  });

  describe('Payroll Run Batch Processing', () => {
    it('should create payroll run with batch processing successfully', async () => {
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
      const payrollRun = await prismaService.payrollRun.findUnique({
        where: { id: result.payrollRunId },
      });

      expect(payrollRun).toBeDefined();
      expect(payrollRun!.companyId).toBe(testCompanyId);
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
      const payrollRuns = await prismaService.payrollRun.findMany({
        where: {
          companyId: testCompanyId,
          payPeriodStart: new Date('2024-02-01'),
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
      // Create a test payroll run
      jest.spyOn(tenantContextService, 'getTenantId').mockReturnValue(testCompanyId);
      
      const payrollRun = await prismaService.payrollRun.create({
        data: {
          companyId: testCompanyId,
          runNumber: 'TEST-2024-01-001',
          payPeriodStart: new Date('2024-01-01'),
          payPeriodEnd: new Date('2024-01-31'),
          status: PayrollStatus.COMPLETED,
          totalAmount: new Decimal(50000),
          processedAt: new Date(),
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
      expect(result.data.some(run => run.runNumber.includes('TEST-2024'))).toBe(true);
    });
  });

  describe('Payroll Run Analytics', () => {
    let testPayrollRunId: string;

    beforeEach(async () => {
      // Create test payroll run with items
      jest.spyOn(tenantContextService, 'getTenantId').mockReturnValue(testCompanyId);
      
      const payrollRun = await prismaService.payrollRun.create({
        data: {
          companyId: testCompanyId,
          runNumber: 'ANALYTICS-TEST-001',
          payPeriodStart: new Date('2024-01-01'),
          payPeriodEnd: new Date('2024-01-31'),
          status: PayrollStatus.COMPLETED,
          totalAmount: new Decimal(75000),
          processedAt: new Date(),
        },
      });

      testPayrollRunId = payrollRun.id;

      // Create sample payroll items
      await prismaService.payrollItem.createMany({
        data: [
          {
            payrollRunId: testPayrollRunId,
            employeeId: testEmployeeIds[0],
            itemType: 'BASIC_PAY',
            description: 'Basic Pay',
            amount: new Decimal(20000),
            calculationData: { hours: 160, rate: 125 },
          },
          {
            payrollRunId: testPayrollRunId,
            employeeId: testEmployeeIds[0],
            itemType: 'OVERTIME',
            description: 'Overtime Pay',
            amount: new Decimal(5000),
            calculationData: { hours: 20, rate: 250 },
          },
          {
            payrollRunId: testPayrollRunId,
            employeeId: testEmployeeIds[0],
            itemType: 'TAX_DEDUCTION',
            description: 'Income Tax',
            amount: new Decimal(-2500),
            calculationData: { rate: 0.1 },
          },
        ],
      });
    });

    it('should generate comprehensive payroll analytics', async () => {
      jest.spyOn(tenantContextService, 'getTenantId').mockReturnValue(testCompanyId);

      const analytics = await payrollRunManagementService.getPayrollRunAnalytics(testPayrollRunId);

      expect(analytics).toBeDefined();
      expect(analytics.payrollRunId).toBe(testPayrollRunId);
      expect(analytics.runNumber).toBe('ANALYTICS-TEST-001');
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
      expect(new Decimal(breakdown['BASIC_PAY']).equals(new Decimal(20000))).toBe(true);
      expect(new Decimal(breakdown['OVERTIME']).equals(new Decimal(5000))).toBe(true);
    });
  });

  // Helper functions

  async function setupTestData() {
    // Create test company
    const company = await prismaService.company.create({
      data: {
        name: 'Test Payroll Company',
        slug: 'test-payroll-company',
        settings: {},
        branding: {},
      },
    });
    testCompanyId = company.id;

    // Create test client
    const client = await prismaService.client.create({
      data: {
        companyId: testCompanyId,
        name: 'Test Client',
        contactEmail: 'client@test.com',
        contractStatus: 'ACTIVE',
        contractStart: new Date('2023-01-01'),
      },
    });
    testClientId = client.id;

    // Create test site
    const site = await prismaService.site.create({
      data: {
        clientId: testClientId,
        name: 'Test Site',
        address: { street: '123 Test St', city: 'Test City' },
        operationalStatus: 'ACTIVE',
      },
    });
    testSiteId = site.id;

    // Create test employees
    for (let i = 1; i <= 3; i++) {
      const employee = await prismaService.employee.create({
        data: {
          companyId: testCompanyId,
          employeeNumber: `EMP-${i.toString().padStart(3, '0')}`,
          firstName: `Test${i}`,
          lastName: 'Employee',
          email: `employee${i}@test.com`,
          phone: `+91-9876543${i.toString().padStart(3, '0')}`,
          employmentStatus: EmploymentStatus.ACTIVE,
          hireDate: new Date('2023-06-01'),
          skills: ['security', 'customer-service'],
        },
      });
      testEmployeeIds.push(employee.id);

      // Create assignment for each employee
      const assignment = await prismaService.assignment.create({
        data: {
          employeeId: employee.id,
          siteId: testSiteId,
          role: 'Security Guard',
          hourlyRate: new Decimal(150), // ₹150 per hour
          status: AssignmentStatus.ACTIVE,
          startDate: new Date('2023-06-01'),
        },
      });
      testAssignmentIds.push(assignment.id);

      // Create sample shifts and attendance
      const shift = await prismaService.shift.create({
        data: {
          assignmentId: assignment.id,
          siteId: testSiteId,
          shiftDate: new Date('2024-01-15'),
          startTime: new Date('2024-01-15T08:00:00Z'),
          endTime: new Date('2024-01-15T16:00:00Z'),
          shiftType: 'REGULAR',
          status: 'COMPLETED',
        },
      });

      await prismaService.attendance.create({
        data: {
          employeeId: employee.id,
          shiftId: shift.id,
          clockIn: new Date('2024-01-15T08:00:00Z'),
          clockOut: new Date('2024-01-15T16:00:00Z'),
          status: AttendanceStatus.PRESENT,
          locationData: { lat: 12.9716, lng: 77.5946 },
        },
      });
    }
  }

  async function cleanupTestData() {
    // Clean up in reverse order of dependencies
    await prismaService.attendance.deleteMany({
      where: {
        employee: { companyId: testCompanyId },
      },
    });

    await prismaService.shift.deleteMany({
      where: {
        site: {
          client: { companyId: testCompanyId },
        },
      },
    });

    await prismaService.payrollItem.deleteMany({
      where: {
        payrollRun: { companyId: testCompanyId },
      },
    });

    await prismaService.payrollRun.deleteMany({
      where: { companyId: testCompanyId },
    });

    await prismaService.assignment.deleteMany({
      where: {
        employee: { companyId: testCompanyId },
      },
    });

    await prismaService.employee.deleteMany({
      where: { companyId: testCompanyId },
    });

    await prismaService.site.deleteMany({
      where: {
        client: { companyId: testCompanyId },
      },
    });

    await prismaService.client.deleteMany({
      where: { companyId: testCompanyId },
    });

    await prismaService.company.delete({
      where: { id: testCompanyId },
    });
  }
});
