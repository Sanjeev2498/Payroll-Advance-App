import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { BillingModule } from './billing.module';
import { BillingService } from './billing.service';
import { TenantContextService } from '../common/tenant-context.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { InvoiceStatus } from '@prisma/client';

describe('Billing Integration Tests', () => {
  let app: INestApplication;
  let billingService: BillingService;
  let prismaService: PrismaService;
  let tenantContextService: TenantContextService;

  // Test data
  let testCompanyId: string;
  let testClientId: string;
  let testSiteId: string;
  let testEmployeeId: string;
  let testAssignmentId: string;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        BillingModule
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();

    billingService = await moduleRef.resolve<BillingService>(BillingService);
    prismaService = moduleRef.get<PrismaService>(PrismaService);
    tenantContextService = moduleRef.get<TenantContextService>(TenantContextService);
  });

  beforeEach(async () => {
    // Set up test data
    await setupTestData();
  });

  afterEach(async () => {
    // Clean up test data
    await cleanupTestData();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Invoice Creation', () => {
    it('should create invoice with basic deployment data', async () => {
      // Set tenant context
      jest.spyOn(tenantContextService, 'getTenantId').mockReturnValue(testCompanyId);

      const createInvoiceDto: CreateInvoiceDto = {
        clientId: testClientId,
        billingPeriodStart: '2024-01-01',
        billingPeriodEnd: '2024-01-31',
        siteIds: [testSiteId],
      };

      const invoice = await billingService.createInvoice(createInvoiceDto);

      expect(invoice).toBeDefined();
      expect(invoice.clientId).toBe(testClientId);
      expect(invoice.status).toBe(InvoiceStatus.DRAFT);
      expect(invoice.subtotal).toBeGreaterThan(0);
      expect(invoice.totalAmount).toBeGreaterThan(0);
      expect(invoice.invoiceNumber).toMatch(/^INV-/);
    });

    it('should calculate GST correctly for Indian billing', async () => {
      // Set tenant context
      jest.spyOn(tenantContextService, 'getTenantId').mockReturnValue(testCompanyId);

      const createInvoiceDto: CreateInvoiceDto = {
        clientId: testClientId,
        billingPeriodStart: '2024-01-01',
        billingPeriodEnd: '2024-01-31',
        siteIds: [testSiteId],
        gstDetails: {
          companyGstin: '07AAAPZ2581P1ZF', // Delhi GSTIN
          clientGstin: '09AAAPZ2581P1ZG', // UP GSTIN - inter-state
          placeOfSupply: '09', // UP
        },
      };

      const invoice = await billingService.createInvoice(createInvoiceDto);

      expect(invoice).toBeDefined();
      expect(invoice.taxAmount).toBeGreaterThan(0);
      expect(invoice.gstDetails).toBeDefined();
      expect(invoice.gstDetails?.isInterState).toBe(true);
      expect(invoice.gstDetails?.igst).toBeGreaterThan(0);
      expect(invoice.gstDetails?.cgst).toBe(0);
      expect(invoice.gstDetails?.sgst).toBe(0);
    });

    it('should handle additional charges correctly', async () => {
      // Set tenant context
      jest.spyOn(tenantContextService, 'getTenantId').mockReturnValue(testCompanyId);

      const createInvoiceDto: CreateInvoiceDto = {
        clientId: testClientId,
        billingPeriodStart: '2024-01-01',
        billingPeriodEnd: '2024-01-31',
        siteIds: [testSiteId],
        additionalCharges: [
          {
            name: 'Transport Allowance',
            amount: 1000,
            taxable: true,
          },
          {
            name: 'Service Fee',
            amount: 500,
            taxable: false,
          },
        ],
      };

      const invoice = await billingService.createInvoice(createInvoiceDto);

      expect(invoice).toBeDefined();
      expect(invoice.additionalCharges).toHaveLength(2);
      expect(invoice.totalAmount).toBeGreaterThan(invoice.subtotal);
    });
  });

  describe('Invoice Management', () => {
    it('should list invoices with pagination', async () => {
      // Set tenant context
      jest.spyOn(tenantContextService, 'getTenantId').mockReturnValue(testCompanyId);

      // Create a few test invoices
      const invoiceDto: CreateInvoiceDto = {
        clientId: testClientId,
        billingPeriodStart: '2024-01-01',
        billingPeriodEnd: '2024-01-31',
        siteIds: [testSiteId],
      };

      await billingService.createInvoice(invoiceDto);
      await billingService.createInvoice({
        ...invoiceDto,
        billingPeriodStart: '2024-02-01',
        billingPeriodEnd: '2024-02-28',
      });

      const invoiceList = await billingService.listInvoices({
        page: 1,
        limit: 10,
      });

      expect(invoiceList).toBeDefined();
      expect(invoiceList.data).toBeDefined();
      expect(invoiceList.pagination).toBeDefined();
      expect(invoiceList.data.length).toBeGreaterThanOrEqual(2);
    });

    it('should update invoice status', async () => {
      // Set tenant context
      jest.spyOn(tenantContextService, 'getTenantId').mockReturnValue(testCompanyId);

      const createInvoiceDto: CreateInvoiceDto = {
        clientId: testClientId,
        billingPeriodStart: '2024-01-01',
        billingPeriodEnd: '2024-01-31',
        siteIds: [testSiteId],
      };

      const invoice = await billingService.createInvoice(createInvoiceDto);
      
      const sentInvoice = await billingService.markInvoiceAsSent(invoice.id);

      expect(sentInvoice.status).toBe(InvoiceStatus.SENT);
    });
  });

  describe('Billing Calculations', () => {
    it('should calculate billing preview correctly', async () => {
      // Set tenant context
      jest.spyOn(tenantContextService, 'getTenantId').mockReturnValue(testCompanyId);

      const createInvoiceDto: CreateInvoiceDto = {
        clientId: testClientId,
        billingPeriodStart: '2024-01-01',
        billingPeriodEnd: '2024-01-31',
        siteIds: [testSiteId],
      };

      const preview = await billingService.calculateBillingPreview(createInvoiceDto);

      expect(preview).toBeDefined();
      expect(preview.siteDeployments).toBeDefined();
      expect(preview.summary).toBeDefined();
      expect(preview.summary.totalHours).toBeGreaterThan(0);
      expect(preview.summary.subtotal).toBeGreaterThan(0);
    });

    it('should validate GSTIN correctly', async () => {
      const validGstin = '07AAAPZ2581P1ZF';
      const invalidGstin = 'INVALID';

      const validResult = billingService.validateGstin(validGstin);
      const invalidResult = billingService.validateGstin(invalidGstin);

      expect(validResult.isValid).toBe(true);
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.error).toBeDefined();
    });
  });

  async function setupTestData() {
    // Create test company
    const company = await prismaService.company.create({
      data: {
        name: 'Test Security Company',
        slug: 'test-security-company',
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
        contactInfo: {},
        contractStatus: 'ACTIVE',
        contractStart: new Date('2023-01-01'),
        contractEnd: new Date('2024-12-31'),
        billingPreferences: {},
      },
    });
    testClientId = client.id;

    // Create test site
    const site = await prismaService.site.create({
      data: {
        clientId: testClientId,
        name: 'Test Site',
        address: {
          street: '123 Test Street',
          city: 'Test City',
          state: 'Test State',
          zipCode: '12345',
        },
        operationalStatus: 'ACTIVE',
        accessRequirements: {},
        safetyProtocols: {},
        contactInfo: {},
      },
    });
    testSiteId = site.id;

    // Create test employee
    const employee = await prismaService.employee.create({
      data: {
        companyId: testCompanyId,
        employeeNumber: 'EMP001',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@test.com',
        phone: '1234567890',
        address: {},
        certifications: {},
        skills: ['Security'],
        employmentStatus: 'ACTIVE',
        hireDate: new Date('2022-01-01'),
      },
    });
    testEmployeeId = employee.id;

    // Create test assignment
    const assignment = await prismaService.assignment.create({
      data: {
        employeeId: testEmployeeId,
        siteId: testSiteId,
        role: 'Security Guard',
        responsibilities: {},
        hourlyRate: 250, // INR 250 per hour
        status: 'ACTIVE',
        startDate: new Date('2023-01-01'),
      },
    });
    testAssignmentId = assignment.id;

    // Create test shifts and attendance
    for (let i = 1; i <= 5; i++) {
      const shiftDate = new Date(`2024-01-0${i}`);
      
      const shift = await prismaService.shift.create({
        data: {
          assignmentId: testAssignmentId,
          siteId: testSiteId,
          shiftDate,
          startTime: new Date(`1970-01-01T09:00:00.000Z`),
          endTime: new Date(`1970-01-01T17:00:00.000Z`),
          shiftType: 'REGULAR',
          status: 'COMPLETED',
          coverageRequired: 1,
          coverageAssigned: 1,
        },
      });

      // Create attendance record
      await prismaService.attendance.create({
        data: {
          employeeId: testEmployeeId,
          shiftId: shift.id,
          clockIn: new Date(`${shiftDate.toISOString().split('T')[0]}T09:00:00.000Z`),
          clockOut: new Date(`${shiftDate.toISOString().split('T')[0]}T17:00:00.000Z`),
          status: 'PRESENT',
          locationData: {},
          verificationData: {},
          notes: 'Test attendance record',
        },
      });
    }
  }

  async function cleanupTestData() {
    if (testCompanyId) {
      // Clean up in reverse order of dependencies
      await prismaService.attendance.deleteMany({
        where: {
          employee: { companyId: testCompanyId },
        },
      });

      await prismaService.shift.deleteMany({
        where: {
          site: { client: { companyId: testCompanyId } },
        },
      });

      await prismaService.assignment.deleteMany({
        where: {
          employee: { companyId: testCompanyId },
        },
      });

      await prismaService.invoice.deleteMany({
        where: {
          client: { companyId: testCompanyId },
        },
      });

      await prismaService.employee.deleteMany({
        where: { companyId: testCompanyId },
      });

      await prismaService.site.deleteMany({
        where: { client: { companyId: testCompanyId } },
      });

      await prismaService.client.deleteMany({
        where: { companyId: testCompanyId },
      });

      await prismaService.company.deleteMany({
        where: { id: testCompanyId },
      });
    }
  }
});