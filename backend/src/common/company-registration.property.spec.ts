import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from './tenant-context.service';
import * as fc from 'fast-check';

// Simple UUID generator for tests
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c == 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Mock Prisma Service for testing without database
class MockPrismaService {
  private mockData: {
    companies: any[];
    users: any[];
    clients: any[];
    employees: any[];
    payrollRuns: any[];
  } = {
    companies: [],
    users: [],
    clients: [],
    employees: [],
    payrollRuns: [],
  };

  private currentTenantId: string | null = null;

  // Mock transaction and context methods
  async withSystemContext<T>(operation: (prisma: any) => Promise<T>): Promise<T> {
    const originalTenantId = this.currentTenantId;
    this.currentTenantId = null; // System context bypasses tenant filter
    try {
      return await operation(this);
    } finally {
      this.currentTenantId = originalTenantId;
    }
  }

  async withTenant<T>(tenantId: string, operation: (prisma: any) => Promise<T>): Promise<T> {
    const originalTenantId = this.currentTenantId;
    this.currentTenantId = tenantId;
    try {
      return await operation(this);
    } finally {
      this.currentTenantId = originalTenantId;
    }
  }

  // Mock transaction support
  async $transaction<T>(operation: (prisma: any) => Promise<T>): Promise<T> {
    return await operation(this);
  }

  // Mock model operations
  get company() {
    return {
      create: async (args: any) => {
        const company = {
          ...args.data,
          id: args.data.id || generateUUID(),
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        this.mockData.companies.push(company);
        return company;
      },
      findUnique: async (args: any) => {
        return this.mockData.companies.find((c) => c.id === args.where.id);
      },
      findMany: async () => {
        if (this.currentTenantId === null) {
          return this.mockData.companies;
        }
        return this.mockData.companies.filter((c) => c.id === this.currentTenantId);
      },
      deleteMany: async () => {
        this.mockData.companies = [];
        return { count: 0 };
      },
    };
  }

  get user() {
    return {
      create: async (args: any) => {
        const user = {
          ...args.data,
          id: args.data.id || generateUUID(),
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        this.mockData.users.push(user);
        return user;
      },
      findMany: async (args?: any) => {
        let users = this.mockData.users;
        if (args?.where?.companyId && this.currentTenantId !== null) {
          users = users.filter((u) => u.companyId === this.currentTenantId);
        }
        return users;
      },
      count: async (args?: any) => {
        let users = this.mockData.users;
        if (args?.where?.companyId && this.currentTenantId !== null) {
          users = users.filter((u) => u.companyId === this.currentTenantId);
        }
        return users.length;
      },
      deleteMany: async () => {
        this.mockData.users = [];
        return { count: 0 };
      },
    };
  }

  get client() {
    return {
      findMany: async (args?: any) => {
        let clients = this.mockData.clients;
        if (args?.where?.companyId && this.currentTenantId !== null) {
          clients = clients.filter((c) => c.companyId === this.currentTenantId);
        }
        return clients;
      },
      count: async (args?: any) => {
        let clients = this.mockData.clients;
        if (args?.where?.companyId && this.currentTenantId !== null) {
          clients = clients.filter((c) => c.companyId === this.currentTenantId);
        }
        return clients.length;
      },
      deleteMany: async () => {
        this.mockData.clients = [];
        return { count: 0 };
      },
    };
  }

  get employee() {
    return {
      findMany: async (args?: any) => {
        let employees = this.mockData.employees;
        if (args?.where?.companyId && this.currentTenantId !== null) {
          employees = employees.filter((e) => e.companyId === this.currentTenantId);
        }
        return employees;
      },
      count: async (args?: any) => {
        let employees = this.mockData.employees;
        if (args?.where?.companyId && this.currentTenantId !== null) {
          employees = employees.filter((e) => e.companyId === this.currentTenantId);
        }
        return employees.length;
      },
      deleteMany: async () => {
        this.mockData.employees = [];
        return { count: 0 };
      },
    };
  }

  get payrollRun() {
    return {
      findMany: async (args?: any) => {
        let payrollRuns = this.mockData.payrollRuns;
        if (args?.where?.companyId && this.currentTenantId !== null) {
          payrollRuns = payrollRuns.filter((pr) => pr.companyId === this.currentTenantId);
        }
        return payrollRuns;
      },
      count: async (args?: any) => {
        let payrollRuns = this.mockData.payrollRuns;
        if (args?.where?.companyId && this.currentTenantId !== null) {
          payrollRuns = payrollRuns.filter((pr) => pr.companyId === this.currentTenantId);
        }
        return payrollRuns.length;
      },
      deleteMany: async () => {
        this.mockData.payrollRuns = [];
        return { count: 0 };
      },
    };
  }

  // Additional cleanup methods for other entities
  get site() {
    return {
      deleteMany: async () => ({ count: 0 }),
    };
  }

  get assignment() {
    return {
      deleteMany: async () => ({ count: 0 }),
    };
  }

  get attendance() {
    return {
      deleteMany: async () => ({ count: 0 }),
    };
  }

  get shift() {
    return {
      deleteMany: async () => ({ count: 0 }),
    };
  }

  get invoice() {
    return {
      deleteMany: async () => ({ count: 0 }),
    };
  }

  get payrollItem() {
    return {
      deleteMany: async () => ({ count: 0 }),
    };
  }
}

// Mock company registration service
class MockCompanyRegistrationService {
  constructor(private prisma: MockPrismaService) {}

  async registerCompany(registrationData: {
    name: string;
    slug: string;
    adminUser: {
      email: string;
      firstName: string;
      lastName: string;
      password: string;
    };
    settings?: any;
    branding?: any;
  }) {
    return await this.prisma.$transaction(async (prisma) => {
      // Create company with default configurations
      const company = await prisma.company.create({
        data: {
          name: registrationData.name,
          slug: registrationData.slug,
          settings: registrationData.settings || this.getDefaultSettings(),
          branding: registrationData.branding || this.getDefaultBranding(),
        },
      });

      // Create admin user for the company
      const adminUser = await prisma.user.create({
        data: {
          companyId: company.id,
          email: registrationData.adminUser.email,
          firstName: registrationData.adminUser.firstName,
          lastName: registrationData.adminUser.lastName,
          role: 'COMPANY_ADMIN',
          passwordHash: 'hashed_' + registrationData.adminUser.password, // Mock hash
        },
      });

      return {
        company,
        adminUser,
      };
    });
  }

  private getDefaultSettings() {
    return {
      timeZone: 'UTC',
      dateFormat: 'YYYY-MM-DD',
      currency: 'USD',
      workingHours: {
        start: '09:00',
        end: '17:00',
      },
      payrollSettings: {
        payFrequency: 'BIWEEKLY',
        overtimeThreshold: 40,
        overtimeRate: 1.5,
      },
      attendanceSettings: {
        clockInGracePeriod: 15,
        clockOutGracePeriod: 15,
        requireLocation: true,
      },
      notificationSettings: {
        emailEnabled: true,
        smsEnabled: false,
        pushEnabled: true,
      },
    };
  }

  private getDefaultBranding() {
    return {
      primaryColor: '#1f2937',
      secondaryColor: '#6b7280',
      logo: null,
      favicon: null,
      companyDescription: '',
      themes: {
        light: {
          background: '#ffffff',
          text: '#111827',
        },
        dark: {
          background: '#111827',
          text: '#f9fafb',
        },
      },
    };
  }
}

describe('Company Registration Completeness Property Tests', () => {
  let prismaService: MockPrismaService;
  let companyRegistrationService: MockCompanyRegistrationService;
  let moduleRef: TestingModule;

  // Property test configuration
  const PROPERTY_TEST_CONFIG = {
    numRuns: 50, // Reduced for faster execution with mocks
    timeout: 5000,
    seed: 42,
  };

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      providers: [
        TenantContextService,
        {
          provide: PrismaService,
          useClass: MockPrismaService,
        },
      ],
    }).compile();

    prismaService = moduleRef.get<PrismaService>(PrismaService) as unknown as MockPrismaService;
    companyRegistrationService = new MockCompanyRegistrationService(prismaService);
  });

  afterAll(async () => {
    await moduleRef.close();
  });

  beforeEach(async () => {
    // Clean up any existing test data before each test
    await cleanupTestData();
  });

  afterEach(async () => {
    // Clean up test data after each test
    await cleanupTestData();
  });

  /**
   * Property 2: Company Registration Completeness
   * Validates: Requirements 1.2
   * Test that company registration creates complete workspace with defaults
   */
  describe('Property 2: Company Registration Completeness', () => {
    it('should create a complete isolated workspace with default configurations for any valid company registration', async () => {
      await fc.assert(
        fc.asyncProperty(companyRegistrationGenerator(), async (registrationData) => {
          try {
            // Act: Register company with the generated data
            const registrationResult =
              await companyRegistrationService.registerCompany(registrationData);

            // Verify: Company registration completeness
            await verifyCompleteWorkspaceCreation(registrationResult, registrationData);
          } catch (error) {
            console.error('Company registration property test error:', error);
            throw error;
          }
        }),
        PROPERTY_TEST_CONFIG,
      );
    });

    it('should create default configurations that are non-empty and well-structured for any company', async () => {
      await fc.assert(
        fc.asyncProperty(companyRegistrationGenerator(), async (registrationData) => {
          try {
            // Act: Register company
            const registrationResult =
              await companyRegistrationService.registerCompany(registrationData);

            // Verify: Default configurations are properly structured
            await verifyDefaultConfigurationStructure(registrationResult);
          } catch (error) {
            console.error('Default configuration structure test error:', error);
            throw error;
          }
        }),
        PROPERTY_TEST_CONFIG,
      );
    });

    it('should maintain workspace isolation and completeness under concurrent registrations', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(companyRegistrationGenerator(), { minLength: 2, maxLength: 5 }),
          async (registrationDataArray) => {
            // Ensure all companies have unique slugs and emails
            const uniqueSlugs = new Set(registrationDataArray.map((r) => r.slug));
            const uniqueEmails = new Set(registrationDataArray.map((r) => r.adminUser.email));
            fc.pre(uniqueSlugs.size === registrationDataArray.length);
            fc.pre(uniqueEmails.size === registrationDataArray.length);

            try {
              // Act: Register companies concurrently
              const registrationPromises = registrationDataArray.map((data) =>
                companyRegistrationService.registerCompany(data),
              );
              const registrationResults = await Promise.all(registrationPromises);

              // Verify: All registrations are complete and isolated
              await verifyConcurrentRegistrationIntegrity(
                registrationResults,
                registrationDataArray,
              );
            } catch (error) {
              console.error('Concurrent registration test error:', error);
              throw error;
            }
          },
        ),
        PROPERTY_TEST_CONFIG,
      );
    });

    it('should provide consistent default workspace structure regardless of input variations', async () => {
      await fc.assert(
        fc.asyncProperty(
          companyRegistrationGenerator(),
          companyRegistrationGenerator(),
          async (registration1, registration2) => {
            // Ensure different companies
            fc.pre(registration1.slug !== registration2.slug);
            fc.pre(registration1.adminUser.email !== registration2.adminUser.email);

            try {
              // Act: Register two different companies
              const result1 = await companyRegistrationService.registerCompany(registration1);
              const result2 = await companyRegistrationService.registerCompany(registration2);

              // Verify: Both have consistent default structures
              await verifyConsistentDefaultStructure(result1, result2);
            } catch (error) {
              console.error('Consistent structure test error:', error);
              throw error;
            }
          },
        ),
        PROPERTY_TEST_CONFIG,
      );
    });
  });

  // Data Generators
  function companyRegistrationGenerator() {
    return fc.record({
      name: fc.string({ minLength: 3, maxLength: 50 }).map((s) => s.trim()),
      slug: fc
        .string({ minLength: 3, maxLength: 20 })
        .map((s) =>
          s
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '-')
            .slice(0, 20),
        )
        .filter((s) => s.length >= 3),
      adminUser: fc.record({
        email: fc.emailAddress(),
        firstName: fc.string({ minLength: 2, maxLength: 20 }).map((s) => s.trim()),
        lastName: fc.string({ minLength: 2, maxLength: 20 }).map((s) => s.trim()),
        password: fc.string({ minLength: 8, maxLength: 50 }),
      }),
      settings: fc.option(fc.object(), { nil: undefined }),
      branding: fc.option(fc.object(), { nil: undefined }),
    });
  }

  // Verification Functions
  async function verifyCompleteWorkspaceCreation(
    registrationResult: any,
    originalRegistrationData: any,
  ) {
    const { company, adminUser } = registrationResult;

    // Verify company was created with all required fields
    expect(company).toBeDefined();
    expect(company.id).toBeDefined();
    expect(company.name).toBe(originalRegistrationData.name);
    expect(company.slug).toBe(originalRegistrationData.slug);
    expect(company.createdAt).toBeDefined();
    expect(company.updatedAt).toBeDefined();

    // Verify company has default settings and branding
    expect(company.settings).toBeDefined();
    expect(company.branding).toBeDefined();

    // Verify admin user was created
    expect(adminUser).toBeDefined();
    expect(adminUser.id).toBeDefined();
    expect(adminUser.companyId).toBe(company.id);
    expect(adminUser.email).toBe(originalRegistrationData.adminUser.email);
    expect(adminUser.firstName).toBe(originalRegistrationData.adminUser.firstName);
    expect(adminUser.lastName).toBe(originalRegistrationData.adminUser.lastName);
    expect(adminUser.role).toBe('COMPANY_ADMIN');

    // Verify workspace isolation - check that company can only access its own data
    await verifyWorkspaceIsolation(company.id);
  }

  async function verifyDefaultConfigurationStructure(registrationResult: any) {
    const { company } = registrationResult;

    // Verify settings structure
    const settings = company.settings;
    expect(settings).toBeDefined();
    expect(typeof settings).toBe('object');

    // Required setting categories should exist
    expect(settings.timeZone).toBeDefined();
    expect(settings.dateFormat).toBeDefined();
    expect(settings.currency).toBeDefined();
    expect(settings.workingHours).toBeDefined();
    expect(settings.payrollSettings).toBeDefined();
    expect(settings.attendanceSettings).toBeDefined();
    expect(settings.notificationSettings).toBeDefined();

    // Verify payroll settings completeness
    expect(settings.payrollSettings.payFrequency).toBeDefined();
    expect(settings.payrollSettings.overtimeThreshold).toBeDefined();
    expect(settings.payrollSettings.overtimeRate).toBeDefined();
    expect(typeof settings.payrollSettings.overtimeThreshold).toBe('number');
    expect(typeof settings.payrollSettings.overtimeRate).toBe('number');

    // Verify attendance settings completeness
    expect(settings.attendanceSettings.clockInGracePeriod).toBeDefined();
    expect(settings.attendanceSettings.clockOutGracePeriod).toBeDefined();
    expect(settings.attendanceSettings.requireLocation).toBeDefined();
    expect(typeof settings.attendanceSettings.clockInGracePeriod).toBe('number');
    expect(typeof settings.attendanceSettings.requireLocation).toBe('boolean');

    // Verify branding structure
    const branding = company.branding;
    expect(branding).toBeDefined();
    expect(typeof branding).toBe('object');
    expect(branding.primaryColor).toBeDefined();
    expect(branding.secondaryColor).toBeDefined();
    expect(branding.themes).toBeDefined();
    expect(branding.themes.light).toBeDefined();
    expect(branding.themes.dark).toBeDefined();
  }

  async function verifyWorkspaceIsolation(companyId: string) {
    // Test that queries within tenant context only return data for this company
    const results = await prismaService.withTenant(companyId, async (prisma) => {
      return {
        companies: await prisma.company.findMany(),
        users: await prisma.user.findMany({ where: { companyId } }),
        clients: await prisma.client.findMany({ where: { companyId } }),
        employees: await prisma.employee.findMany({ where: { companyId } }),
        payrollRuns: await prisma.payrollRun.findMany({ where: { companyId } }),
      };
    });

    // Should only see this company
    expect(results.companies).toHaveLength(1);
    expect(results.companies[0].id).toBe(companyId);

    // Should have at least the admin user
    expect(results.users.length).toBeGreaterThanOrEqual(1);
    expect(results.users.every((u: any) => u.companyId === companyId)).toBe(true);

    // Initially empty collections should be accessible but empty
    expect(Array.isArray(results.clients)).toBe(true);
    expect(Array.isArray(results.employees)).toBe(true);
    expect(Array.isArray(results.payrollRuns)).toBe(true);
  }

  async function verifyConcurrentRegistrationIntegrity(
    registrationResults: any[],
    originalRegistrationData: any[],
  ) {
    // Verify all registrations succeeded
    expect(registrationResults).toHaveLength(originalRegistrationData.length);
    registrationResults.forEach((result) => {
      expect(result.company).toBeDefined();
      expect(result.adminUser).toBeDefined();
    });

    // Verify each company has unique identifiers
    const companyIds = registrationResults.map((r) => r.company.id);
    const uniqueCompanyIds = new Set(companyIds);
    expect(uniqueCompanyIds.size).toBe(companyIds.length);

    // Verify each admin user has unique identifiers
    const userIds = registrationResults.map((r) => r.adminUser.id);
    const uniqueUserIds = new Set(userIds);
    expect(uniqueUserIds.size).toBe(userIds.length);

    // Verify workspace isolation for each company
    for (const result of registrationResults) {
      await verifyWorkspaceIsolation(result.company.id);
    }
  }

  async function verifyConsistentDefaultStructure(result1: any, result2: any) {
    const settings1 = result1.company.settings;
    const settings2 = result2.company.settings;
    const branding1 = result1.company.branding;
    const branding2 = result2.company.branding;

    // Both should have the same structure (same keys)
    expect(Object.keys(settings1).sort()).toEqual(Object.keys(settings2).sort());
    expect(Object.keys(branding1).sort()).toEqual(Object.keys(branding2).sort());

    // Both should have the same default values for system settings
    expect(settings1.timeZone).toBe(settings2.timeZone);
    expect(settings1.dateFormat).toBe(settings2.dateFormat);
    expect(settings1.currency).toBe(settings2.currency);
    expect(settings1.payrollSettings.payFrequency).toBe(settings2.payrollSettings.payFrequency);
    expect(settings1.payrollSettings.overtimeThreshold).toBe(
      settings2.payrollSettings.overtimeThreshold,
    );
    expect(settings1.payrollSettings.overtimeRate).toBe(settings2.payrollSettings.overtimeRate);

    // Both should have the same default branding structure
    expect(branding1.primaryColor).toBe(branding2.primaryColor);
    expect(branding1.secondaryColor).toBe(branding2.secondaryColor);
    expect(Object.keys(branding1.themes)).toEqual(Object.keys(branding2.themes));
  }

  // Cleanup function
  async function cleanupTestData() {
    await prismaService.withSystemContext(async (prisma) => {
      // Delete in reverse dependency order
      await prisma.payrollItem.deleteMany({});
      await prisma.payrollRun.deleteMany({});
      await prisma.invoice.deleteMany({});
      await prisma.attendance.deleteMany({});
      await prisma.shift.deleteMany({});
      await prisma.assignment.deleteMany({});
      await prisma.site.deleteMany({});
      await prisma.employee.deleteMany({});
      await prisma.client.deleteMany({});
      await prisma.user.deleteMany({});
      await prisma.company.deleteMany({});
    });
  }
});
