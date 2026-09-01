import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import request from 'supertest';
import { PrismaService } from '../prisma/prisma.service';
import { PayrollModule } from './payroll.module';
import { CommonModule } from '../common/common.module';
import { PrismaModule } from '../prisma/prisma.module';
import { TenantContextService } from '../common/tenant-context.service';
import { PayrollStatus, AttendanceStatus, EmploymentStatus, AssignmentStatus, ShiftStatus } from '@prisma/client';
import { TestDataUtil } from '../test/utils/test-data.util';
import { Decimal } from 'decimal.js';

describe('Payroll Integration Tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let tenantContextService: TenantContextService;

  // Test data IDs
  let companyId: string;
  let clientId: string;
  let siteId: string;
  let employeeId: string;
  let assignmentId: string;
  let shiftId: string;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        PayrollModule, 
        CommonModule, 
        PrismaModule
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    prisma = moduleRef.get<PrismaService>(PrismaService);
    tenantContextService = await moduleRef.resolve<TenantContextService>(TenantContextService);

    // Mock tenant context for testing
    jest.spyOn(tenantContextService, 'getTenantId').mockImplementation(() => companyId);

    await app.init();
  });

  beforeEach(async () => {
    // Clean up database using correct model names
    await prisma.attendance.deleteMany();
    await prisma.shifts.deleteMany();
    await prisma.assignments.deleteMany();
    await prisma.employees.deleteMany();
    await prisma.sites.deleteMany();
    await prisma.clients.deleteMany();
    await prisma.payrollItems.deleteMany();
    await prisma.payrollRuns.deleteMany();
    await prisma.companies.deleteMany();

    // Create test data
    const company = await prisma.companies.create({
      data: TestDataUtil.createTestCompanyData(),
    });
    companyId = company.id;

    const client = await prisma.clients.create({
      data: {
        id: TestDataUtil.generateTestId(),
        company_id: companyId,
        name: 'Test Client Corp',
        contact_email: 'client@testcorp.com',
        organization_type: 'CORPORATE_OFFICE',
        created_at: new Date(),
        updated_at: new Date(),
      },
    });
    clientId = client.id;

    // FIXED: Create separate Contract entity
    const contract = await prisma.contracts.create({
      data: {
        client_id: client.id,
        contract_number: 'CNT-TEST-001',
        title: 'Test Payroll Contract',
        status: 'ACTIVE',
        start_date: new Date(),
        service_definitions: { services: ['payroll'] },
        billing_preferences: { cycle: 'monthly' },
        created_at: new Date(),
        updated_at: new Date(),
      },
    });

    const site = await prisma.sites.create({
      data: {
        id: TestDataUtil.generateTestId(),
        client_id: client.id, // Required field
        contract_id: contract.id, // FIXED: Link to contract instead of client
        name: 'Main Office Building',
        address: { street: '123 Business Ave', city: 'Mumbai', state: 'Maharashtra' },
        operational_status: 'ACTIVE',
        created_at: new Date(),
        updated_at: new Date(),
      },
    });
    siteId = site.id;

    const employee = await prisma.employees.create({
      data: {
        id: TestDataUtil.generateTestId(),
        company_id: companyId,
        employee_number: 'EMP-001',
        first_name: 'Rajesh',
        last_name: 'Kumar',
        email: 'rajesh.kumar@company.com',
        phone: '+91-9876543210',
        address: {
          street: '123 Test Street',
          city: 'Mumbai',
          state: 'Maharashtra',
          pincode: '400001',
          country: 'India'
        },
        skills: ['security', 'surveillance'],
        employment_status: EmploymentStatus.ACTIVE,
        hire_date: new Date('2024-01-01'),
        created_at: new Date(),
        updated_at: new Date(),
      },
    });
    employeeId = employee.id;

    const assignment = await prisma.assignments.create({
      data: {
        id: TestDataUtil.generateTestId(),
        employee_id: employeeId,
        site_id: siteId,
        role: 'Security Guard',
        hourly_rate: '30.00', // Encrypted string field
        hourly_rate_iv: 'test_iv_12345678901234567890123', // 32 chars max
        hourly_rate_tag: 'test_tag_1234567890123456789012', // 32 chars max  
        status: AssignmentStatus.ACTIVE,
        start_date: new Date('2024-01-01'),
        created_at: new Date(),
        updated_at: new Date(),
      },
    });
    assignmentId = assignment.id;

    const shift = await prisma.shifts.create({
      data: {
        id: TestDataUtil.generateTestId(),
        assignment_id: assignmentId,
        site_id: siteId, // Required field
        shift_date: new Date('2024-01-15'),
        start_time: new Date('2024-01-15T09:00:00Z'),
        end_time: new Date('2024-01-15T17:00:00Z'),
        shift_type: 'REGULAR',
        status: ShiftStatus.COMPLETED,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });
    shiftId = shift.id;

    // Create attendance record
    await prisma.attendance.create({
      data: {
        id: TestDataUtil.generateTestId(),
        employee_id: employeeId,
        shift_id: shiftId,
        clock_in: new Date('2024-01-15T09:00:00Z'),
        clock_out: new Date('2024-01-15T17:00:00Z'), // 8 hours
        status: AttendanceStatus.PRESENT,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /payroll/runs', () => {
    it('should create payroll run with correct calculations', async () => {
      const createPayrollRunDto = {
        payPeriodStart: '2024-01-01',
        payPeriodEnd: '2024-01-31',
      };

      const response = await request(app.getHttpServer())
        .post('/payroll/runs')
        .send(createPayrollRunDto)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.employeeCount).toBe(1);
      expect(response.body.data.employeeResults).toHaveLength(1);

      const employeeResult = response.body.data.employeeResults[0];
      expect(employeeResult.employeeId).toBe(employeeId);
      expect(employeeResult.employeeName).toBe('Rajesh Kumar');
      expect(employeeResult.totalHours).toBe(8);
      expect(employeeResult.regularHours).toBe(8);
      expect(employeeResult.overtimeHours).toBe(0);
      expect(parseFloat(employeeResult.basicPay)).toBe(240.00); // 8 hours × ₹30

      // Verify payroll run was created in database
      const payrollRun = await prisma.payrollRuns.findFirst({
        where: { company_id: companyId },
        include: { payroll_items: true },
      });

      expect(payrollRun).toBeTruthy();
      expect(payrollRun!.status).toBe(PayrollStatus.COMPLETED);
      expect(payrollRun!.payroll_items.length).toBeGreaterThan(0);
    });

    it('should handle overtime correctly', async () => {
      // Create additional shift with overtime
      await prisma.shifts.create({
        data: {
          id: TestDataUtil.generateTestId(),
          assignment_id: assignmentId,
          shift_date: new Date('2024-01-16'),
          start_time: new Date('2024-01-16T09:00:00Z'),
          end_time: new Date('2024-01-16T19:00:00Z'), // 10 hours
          shift_type: 'OVERTIME',
          status: ShiftStatus.COMPLETED,
        },
      });

      await prisma.attendance.create({
        data: {
          id: TestDataUtil.generateTestId(),
          employee_id: employeeId,
          shift_id: (await prisma.shifts.findFirst({ 
            where: { shift_date: new Date('2024-01-16') }
          }))!.id,
          clock_in: new Date('2024-01-16T09:00:00Z'),
          clock_out: new Date('2024-01-16T19:00:00Z'), // 10 hours total
          status: AttendanceStatus.PRESENT,
        },
      });

      const createPayrollRunDto = {
        payPeriodStart: '2024-01-01',
        payPeriodEnd: '2024-01-31',
      };

      const response = await request(app.getHttpServer())
        .post('/payroll/runs')
        .send(createPayrollRunDto)
        .expect(201);

      const employeeResult = response.body.data.employeeResults[0];
      expect(employeeResult.totalHours).toBe(18); // 8 + 10 hours
      expect(employeeResult.regularHours).toBe(16); // 8 + 8 hours (max regular per day)
      expect(employeeResult.overtimeHours).toBe(2); // 2 hours overtime from second day
      expect(parseFloat(employeeResult.overtimePay)).toBe(90.00); // 2 hours × ₹30 × 1.5
    });

    it('should calculate Indian payroll deductions correctly', async () => {
      const createPayrollRunDto = {
        payPeriodStart: '2024-01-01',
        payPeriodEnd: '2024-01-31',
      };

      const response = await request(app.getHttpServer())
        .post('/payroll/runs')
        .send(createPayrollRunDto)
        .expect(201);

      const employeeResult = response.body.data.employeeResults[0];
      
      // Verify deductions are calculated
      expect(parseFloat(employeeResult.totalDeductions)).toBeGreaterThan(0);
      expect(parseFloat(employeeResult.netSalary)).toBeLessThan(parseFloat(employeeResult.grossSalary));

      // Check payroll items for Indian-specific deductions
      const itemTypes = employeeResult.items.map((item: any) => item.itemType);
      expect(itemTypes).toContain('TAX_DEDUCTION'); // Income tax
      expect(itemTypes).toContain('SOCIAL_SECURITY'); // Provident Fund
      expect(itemTypes).toContain('OTHER_DEDUCTION'); // Professional Tax

      // Verify specific deduction calculations
      const taxDeduction = employeeResult.items.find((item: any) => 
        item.itemType === 'TAX_DEDUCTION'
      );
      expect(parseFloat(taxDeduction.amount)).toBe(-24.00); // 10% of ₹240

      const professionalTax = employeeResult.items.find((item: any) => 
        item.itemType === 'OTHER_DEDUCTION' && item.description === 'Professional Tax'
      );
      expect(parseFloat(professionalTax.amount)).toBe(-200.00); // Fixed ₹200
    });

    it('should prevent overlapping payroll runs', async () => {
      const createPayrollRunDto = {
        payPeriodStart: '2024-01-01',
        payPeriodEnd: '2024-01-31',
      };

      // Create first payroll run
      await request(app.getHttpServer())
        .post('/payroll/runs')
        .send(createPayrollRunDto)
        .expect(201);

      // Try to create overlapping payroll run
      const overlappingDto = {
        payPeriodStart: '2024-01-15',
        payPeriodEnd: '2024-02-15',
      };

      await request(app.getHttpServer())
        .post('/payroll/runs')
        .send(overlappingDto)
        .expect(400);
    });
  });

  describe('GET /payroll/runs', () => {
    beforeEach(async () => {
      // Create a test payroll run
      await request(app.getHttpServer())
        .post('/payroll/runs')
        .send({
          payPeriodStart: '2024-01-01',
          payPeriodEnd: '2024-01-31',
        });
    });

    it('should list payroll runs with pagination', async () => {
      const response = await request(app.getHttpServer())
        .get('/payroll/runs')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 1,
        pages: 1,
      });
    });

    it('should support custom pagination', async () => {
      const response = await request(app.getHttpServer())
        .get('/payroll/runs?page=1&limit=5')
        .expect(200);

      expect(response.body.pagination.limit).toBe(5);
    });
  });

  describe('GET /payroll/runs/:id', () => {
    let payrollRunId: string;

    beforeEach(async () => {
      const createResponse = await request(app.getHttpServer())
        .post('/payroll/runs')
        .send({
          payPeriodStart: '2024-01-01',
          payPeriodEnd: '2024-01-31',
        });
      
      payrollRunId = createResponse.body.data.payrollRunId;
    });

    it('should get payroll run details', async () => {
      const response = await request(app.getHttpServer())
        .get(`/payroll/runs/${payrollRunId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(payrollRunId);
      expect(response.body.data.payrollItems).toBeDefined();
    });

    it('should return 404 for non-existent payroll run', async () => {
      const nonExistentId = '550e8400-e29b-41d4-a716-446655440000';
      
      await request(app.getHttpServer())
        .get(`/payroll/runs/${nonExistentId}`)
        .expect(404);
    });
  });

  describe('GET /payroll/runs/:id/summary', () => {
    let payrollRunId: string;

    beforeEach(async () => {
      const createResponse = await request(app.getHttpServer())
        .post('/payroll/runs')
        .send({
          payPeriodStart: '2024-01-01',
          payPeriodEnd: '2024-01-31',
        });
      
      payrollRunId = createResponse.body.data.payrollRunId;
    });

    it('should get payroll run summary', async () => {
      const response = await request(app.getHttpServer())
        .get(`/payroll/runs/${payrollRunId}/summary`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.payrollRunId).toBe(payrollRunId);
      expect(response.body.data.employeeCount).toBe(1);
      expect(response.body.data.itemBreakdown).toBeDefined();
      expect(response.body.data.itemBreakdown.basicPay).toBeGreaterThan(0);
    });
  });
});
