import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import * as request from 'supertest';
import { PrismaService } from '../prisma/prisma.service';
import { PayrollModule } from './payroll.module';
import { CommonModule } from '../common/common.module';
import { PrismaModule } from '../prisma/prisma.module';
import { TenantContextService } from '../common/tenant-context.service';
import { PayrollStatus, AttendanceStatus, EmploymentStatus, AssignmentStatus, ShiftStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

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
    tenantContextService = moduleRef.get<TenantContextService>(TenantContextService);

    // Mock tenant context for testing
    jest.spyOn(tenantContextService, 'getTenantId').mockImplementation(() => companyId);

    await app.init();
  });

  beforeEach(async () => {
    // Clean up database
    await prisma.attendance.deleteMany();
    await prisma.shift.deleteMany();
    await prisma.assignment.deleteMany();
    await prisma.employee.deleteMany();
    await prisma.site.deleteMany();
    await prisma.client.deleteMany();
    await prisma.payrollItem.deleteMany();
    await prisma.payrollRun.deleteMany();
    await prisma.company.deleteMany();

    // Create test data
    const company = await prisma.company.create({
      data: {
        name: 'Test Security Company',
        slug: 'test-security-co',
        settings: {},
        branding: {},
      },
    });
    companyId = company.id;

    const client = await prisma.client.create({
      data: {
        companyId,
        name: 'Test Client Corp',
        contactEmail: 'client@testcorp.com',
        contractStatus: 'ACTIVE',
      },
    });
    clientId = client.id;

    const site = await prisma.site.create({
      data: {
        clientId,
        name: 'Main Office Building',
        address: { street: '123 Business Ave', city: 'Mumbai', state: 'Maharashtra' },
        operationalStatus: 'ACTIVE',
      },
    });
    siteId = site.id;

    const employee = await prisma.employee.create({
      data: {
        companyId,
        employeeNumber: 'EMP-001',
        firstName: 'Rajesh',
        lastName: 'Kumar',
        email: 'rajesh.kumar@company.com',
        phone: '+91-9876543210',
        skills: ['security', 'surveillance'],
        employmentStatus: EmploymentStatus.ACTIVE,
        hireDate: new Date('2024-01-01'),
      },
    });
    employeeId = employee.id;

    const assignment = await prisma.assignment.create({
      data: {
        employeeId,
        siteId,
        role: 'Security Guard',
        hourlyRate: new Decimal(30.00), // ₹30 per hour
        status: AssignmentStatus.ACTIVE,
        startDate: new Date('2024-01-01'),
      },
    });
    assignmentId = assignment.id;

    const shift = await prisma.shift.create({
      data: {
        assignmentId,
        siteId,
        shiftDate: new Date('2024-01-15'),
        startTime: new Date('2024-01-15T09:00:00Z'),
        endTime: new Date('2024-01-15T17:00:00Z'),
        shiftType: 'REGULAR',
        status: ShiftStatus.COMPLETED,
      },
    });
    shiftId = shift.id;

    // Create attendance record
    await prisma.attendance.create({
      data: {
        employeeId,
        shiftId,
        clockIn: new Date('2024-01-15T09:00:00Z'),
        clockOut: new Date('2024-01-15T17:00:00Z'), // 8 hours
        status: AttendanceStatus.PRESENT,
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
      const payrollRun = await prisma.payrollRun.findFirst({
        where: { companyId },
        include: { payrollItems: true },
      });

      expect(payrollRun).toBeTruthy();
      expect(payrollRun!.status).toBe(PayrollStatus.COMPLETED);
      expect(payrollRun!.payrollItems.length).toBeGreaterThan(0);
    });

    it('should handle overtime correctly', async () => {
      // Create additional shift with overtime
      await prisma.shift.create({
        data: {
          assignmentId,
          siteId,
          shiftDate: new Date('2024-01-16'),
          startTime: new Date('2024-01-16T09:00:00Z'),
          endTime: new Date('2024-01-16T19:00:00Z'), // 10 hours
          shiftType: 'OVERTIME',
          status: ShiftStatus.COMPLETED,
        },
      });

      await prisma.attendance.create({
        data: {
          employeeId,
          shiftId: (await prisma.shift.findFirst({ 
            where: { shiftDate: new Date('2024-01-16') }
          }))!.id,
          clockIn: new Date('2024-01-16T09:00:00Z'),
          clockOut: new Date('2024-01-16T19:00:00Z'), // 10 hours total
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