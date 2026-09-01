import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { BillingModule } from './billing.module';
import { BillingService } from './billing.service';
import { TenantContextService } from '../common/tenant-context.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { InvoiceStatus } from '@prisma/client';
import { TestDataUtil } from '../test/utils/test-data.util';

describe('Billing Integration Tests', () => {
  let app: INestApplication;
  let billingService: BillingService;
  let prismaService: PrismaService;
  let tenantContextService: TenantContextService;

  // Test data
  let testCompanyId: string;
  let testClientId: string;
  let testContractId: string;
  let testSiteId: string;
  let testEmployeeId: string;
  let testAssignmentId: string;

  // Mock for tenant context that can be updated
  const mockTenantContext = {
    getTenantId: jest.fn(() => testCompanyId),
    setTenantId: jest.fn(),
    getUserId: jest.fn(() => 'test-user-id'),
    setUserId: jest.fn(),
    isContextSet: true,
  };

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        BillingModule
      ],
      providers: [
        {
          provide: TenantContextService,
          useValue: mockTenantContext,
        },
      ],
    })
    .overrideProvider(TenantContextService)
    .useValue(mockTenantContext)
    .compile();

    app = moduleRef.createNestApplication();
    await app.init();

    billingService = await moduleRef.resolve<BillingService>(BillingService);
    prismaService = moduleRef.get<PrismaService>(PrismaService);
    tenantContextService = await moduleRef.resolve<TenantContextService>(TenantContextService);
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
      const createInvoiceDto: CreateInvoiceDto = {
        contractId: testContractId,
        billingPeriodStart: '2025-08-01',
        billingPeriodEnd: '2025-08-31',
        siteIds: [testSiteId],
      };

      const invoice = await billingService.createInvoice(createInvoiceDto);

      expect(invoice).toBeDefined();
      expect(invoice.contractId).toBe(testContractId);
      expect(invoice.status).toBe(InvoiceStatus.DRAFT);
      expect(invoice.subtotal).toBeGreaterThan(0);
      expect(invoice.totalAmount).toBeGreaterThan(0);
      expect(invoice.invoiceNumber).toMatch(/^INV-/);
    });

    it('should calculate GST correctly for Indian billing', async () => {
      const createInvoiceDto: CreateInvoiceDto = {
        contractId: testContractId,
        billingPeriodStart: '2025-08-01',
        billingPeriodEnd: '2025-08-31',
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
      const createInvoiceDto: CreateInvoiceDto = {
        contractId: testContractId,
        billingPeriodStart: '2025-08-01',
        billingPeriodEnd: '2025-08-31',
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
      // Create a few test invoices
      const invoiceDto: CreateInvoiceDto = {
        contractId: testContractId,
        billingPeriodStart: '2025-08-01',
        billingPeriodEnd: '2025-08-31',
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
      const createInvoiceDto: CreateInvoiceDto = {
        contractId: testContractId,
        billingPeriodStart: '2025-08-01',
        billingPeriodEnd: '2025-08-31',
        siteIds: [testSiteId],
      };

      const invoice = await billingService.createInvoice(createInvoiceDto);
      
      const sentInvoice = await billingService.markInvoiceAsSent(invoice.id);

      expect(sentInvoice.status).toBe(InvoiceStatus.SENT);
    });
  });

  describe('Billing Calculations', () => {
    it('should calculate billing preview correctly', async () => {
      const createInvoiceDto: CreateInvoiceDto = {
        contractId: testContractId,
        billingPeriodStart: '2025-08-01',
        billingPeriodEnd: '2025-08-31',
        siteIds: [testSiteId],
      };

      const preview = await billingService.calculateBillingPreview(createInvoiceDto);

      expect(preview).toBeDefined();
      expect(preview.siteDeployments).toBeDefined();
      expect(preview.summary).toBeDefined();
      expect(preview.summary.totalHours).toBeGreaterThan(0);
      expect(preview.summary.subtotal.toNumber()).toBeGreaterThan(0);
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
    const company = await prismaService.companies.create({
      data: TestDataUtil.createTestCompanyData(),
    });
    testCompanyId = company.id;
    
    // Update the mock to use the actual company ID
    mockTenantContext.getTenantId.mockReturnValue(testCompanyId);

    // Create test client
    const client = await prismaService.clients.create({
      data: TestDataUtil.createTestClientData(testCompanyId),
    });
    testClientId = client.id;

    // Create test contract for the client
    const contract = await prismaService.contracts.create({
      data: TestDataUtil.createTestContractData(testClientId),
    });
    testContractId = contract.id;

    // Create test site
    const site = await prismaService.sites.create({
      data: TestDataUtil.createTestSiteData(testContractId, testClientId),
    });
    testSiteId = site.id;

    // Create test employee using TestDataUtil
    const employee = await prismaService.employees.create({
      data: TestDataUtil.createTestEmployeeData(testCompanyId, {
        employee_number: 'EMP001',
        first_name: 'John',
        last_name: 'Doe',
        email: 'john.doe@test.com',
        phone: '+91-1234567890',
      }),
    });
    testEmployeeId = employee.id;

    // Create test assignment
    const assignment = await prismaService.assignments.create({
      data: {
        id: TestDataUtil.generateTestId(),
        employee_id: testEmployeeId,
        site_id: testSiteId,
        role: 'Security Guard',
        responsibilities: {},
        hourly_rate: '250', // Must be string for encrypted field
        hourly_rate_iv: 'test_iv_1234567890123456789012', // 26 chars (max 32)
        hourly_rate_tag: 'test_tag_123456789012345678901', // 27 chars (max 32)
        status: 'ACTIVE',
        start_date: new Date('2025-08-01'), // Current year
        created_at: new Date(),
        updated_at: new Date(),
      },
    });
    testAssignmentId = assignment.id;

    // Create test shifts and attendance
    for (let i = 1; i <= 5; i++) {
      const shiftDate = new Date(`2025-08-0${i}`); // Current year
      
      const shift = await prismaService.shifts.create({
        data: {
          id: TestDataUtil.generateTestId(),
          assignment_id: testAssignmentId,
          site_id: testSiteId,
          shift_date: shiftDate,
          start_time: new Date(`1970-01-01T09:00:00.000Z`),
          end_time: new Date(`1970-01-01T17:00:00.000Z`),
          shift_type: 'REGULAR',
          status: 'COMPLETED',
          created_at: new Date(),
          updated_at: new Date(),
        },
      });

      // Create attendance record
      await prismaService.attendance.create({
        data: {
          id: TestDataUtil.generateTestId(),
          employee_id: testEmployeeId,
          shift_id: shift.id,
          clock_in: new Date(`${shiftDate.toISOString().split('T')[0]}T09:00:00.000Z`),
          clock_out: new Date(`${shiftDate.toISOString().split('T')[0]}T17:00:00.000Z`),
          status: 'PRESENT',
          location_data: {},
          verification_data: {},
          notes: 'Test attendance record',
          created_at: new Date(),
          updated_at: new Date(),
        },
      });
    }
  }

  async function cleanupTestData() {
    if (testCompanyId) {
      // Clean up in reverse order of dependencies
      await prismaService.attendance.deleteMany({
        where: {
          employees: { company_id: testCompanyId },
        },
      });

      await prismaService.shifts.deleteMany({
        where: {
          sites: { contracts: { clients: { company_id: testCompanyId } } },
        },
      });

      await prismaService.assignments.deleteMany({
        where: {
          employees: { company_id: testCompanyId },
        },
      });

      await prismaService.invoices.deleteMany({
        where: {
          clients: { company_id: testCompanyId },
        },
      });

      await prismaService.employees.deleteMany({
        where: { company_id: testCompanyId },
      });

      await prismaService.sites.deleteMany({
        where: { contracts: { clients: { company_id: testCompanyId } } },
      });

      await prismaService.contracts.deleteMany({
        where: { clients: { company_id: testCompanyId } },
      });

      await prismaService.clients.deleteMany({
        where: { company_id: testCompanyId },
      });

      await prismaService.companies.deleteMany({
        where: { id: testCompanyId },
      });
    }
  }
});
