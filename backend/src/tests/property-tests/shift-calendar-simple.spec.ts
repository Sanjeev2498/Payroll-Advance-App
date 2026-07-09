import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantContextService } from '../../common/tenant-context.service';
import * as fc from 'fast-check';
import { randomUUID } from 'crypto';

/**
 * Simple Property Test: Shift Calendar Consistency  
 * **Validates: Requirements 6.1, 6.2**
 * 
 * This is a simplified version to test basic shift operations.
 */
describe('Simple Shift Calendar Consistency Properties', () => {
  let module: TestingModule;
  let prisma: PrismaService;
  let tenantContext: TenantContextService;

  const PROPERTY_TEST_CONFIG = {
    numRuns: 2,  // Very reduced for faster execution
    timeout: 10000, // 10 second timeout per test
    seed: 42,
  };

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: ['.env.test', '.env'],
        }),
      ],
      providers: [
        PrismaService,
        TenantContextService,
      ],
    }).compile();

    prisma = module.get<PrismaService>(PrismaService);
    tenantContext = await module.resolve<TenantContextService>(TenantContextService);
    
    await prisma.onModuleInit();
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.onModuleDestroy();
    }
    if (module) {
      await module.close();
    }
  });

  beforeEach(async () => {
    // Clean up before each test
    await cleanup();
  });

  // Helper functions
  async function cleanup() {
    try {
      await prisma.shift.deleteMany({});
      await prisma.assignment.deleteMany({});
      await prisma.employee.deleteMany({});
      await prisma.site.deleteMany({});
      await prisma.client.deleteMany({});
      await prisma.company.deleteMany({});
    } catch (error) {
      // Ignore cleanup errors
    }
  }
  async function createBasicScenario() {
    // Create company
    const company = await prisma.company.create({
      data: {
        id: randomUUID(),
        name: 'Test Company',
        slug: `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        settings: {},
        branding: {}
      }
    });

    // Set tenant context immediately after company creation
    tenantContext.setContext(company.id);

    // Create client
    const client = await prisma.client.create({
      data: {
        id: randomUUID(),
        companyId: company.id,
        name: 'Test Client',
        contactEmail: 'client@test.com',
        contactInfo: { phone: '555-0123' },
        contractStatus: 'ACTIVE',
        contractStart: new Date(),
        contractEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        billingPreferences: {}
      }
    });

    // Create site
    const site = await prisma.site.create({
      data: {
        id: randomUUID(),
        clientId: client.id,
        name: 'Test Site',
        address: { street: '123 Test Street', city: 'Test City' },
        accessRequirements: { keycard: true },
        safetyProtocols: { emergency: '911' },
        operationalStatus: 'ACTIVE',
        contactInfo: { phone: '555-0100' },
      }
    });

    // Create employee
    const employee = await prisma.employee.create({
      data: {
        id: randomUUID(),
        companyId: company.id,
        employeeNumber: 'EMP001',
        firstName: 'Test',
        lastName: 'Employee',
        email: 'emp@test.com',
        phone: '555-0200',
        address: { street: '200 Employee St' },
        certifications: { security: true },
        skills: ['security', 'surveillance'],
        employmentStatus: 'ACTIVE',
        hireDate: new Date(),
      }
    });

    // Create assignment
    const assignment = await prisma.assignment.create({
      data: {
        id: randomUUID(),
        employeeId: employee.id,
        siteId: site.id,
        role: 'Security Guard',
        responsibilities: { patrol: true, monitoring: true },
        hourlyRate: '25.00',
        hourlyRateIv: 'test-iv',
        hourlyRateTag: 'test-tag',
        status: 'ACTIVE',
        startDate: new Date(),
      }
    });

    return { company, client, site, employee, assignment };
  }
  describe('Property 19: Basic Shift Calendar Consistency', () => {
    it('should create and manage shift records correctly', async () => {
      await fc.assert(fc.asyncProperty(
        fc.integer({ min: 1, max: 3 }),  // coverage required
        async (coverageRequired) => {
          // **Feature: security-workforce-payroll-system, Property 19: Basic Shift Calendar Consistency**
          
          // Setup: Create test scenario
          const { company, site, assignment } = await createBasicScenario();
          
          try {
            const shiftDate = new Date();
            shiftDate.setDate(shiftDate.getDate() + 1); // Tomorrow
            
            // Test: Create shift directly in database
            const shift = await prisma.shift.create({
              data: {
                id: randomUUID(),
                assignmentId: assignment.id,
                siteId: site.id,
                shiftDate: shiftDate,
                startTime: '09:00:00',
                endTime: '17:00:00',
                shiftType: 'REGULAR',
                status: 'SCHEDULED',
                priority: 'NORMAL',
                isRecurring: false,
                coverageRequired: coverageRequired,
                coverageAssigned: 1, // Since we have an assignment
                skillRequirements: {},
                shiftRequirements: {},
                breakSchedule: {},
                notes: {},
                modificationLog: [
                  {
                    timestamp: new Date().toISOString(),
                    action: 'CREATED',
                    createdBy: 'test-system'
                  }
                ]
              }
            });

            // Verify: Basic shift properties
            expect(shift).toBeDefined();
            expect(shift.id).toBeTruthy();
            expect(shift.assignmentId).toBe(assignment.id);
            expect(shift.siteId).toBe(site.id);
            expect(shift.status).toBe('SCHEDULED');
            
            // Verify: Coverage calculations
            expect(shift.coverageRequired).toBe(coverageRequired);
            expect(shift.coverageAssigned).toBeGreaterThan(0);
            expect(shift.coverageAssigned).toBeLessThanOrEqual(shift.coverageRequired);
            
            // Verify: When assignment exists, coverage assigned should be > 0
            expect(shift.coverageAssigned).toBeGreaterThan(0);
            
            // Verify: Status should be SCHEDULED when properly assigned
            expect(shift.status).toBe('SCHEDULED');

            // Test: Retrieve shift and verify persistence
            const retrievedShift = await prisma.shift.findUnique({
              where: { id: shift.id }
            });
            
            expect(retrievedShift).toBeDefined();
            expect(retrievedShift!.coverageRequired).toBe(coverageRequired);
            expect(retrievedShift!.coverageAssigned).toBe(shift.coverageAssigned);
            expect(retrievedShift!.status).toBe(shift.status);
            
            // Verify: No conflicts with same employee on same day
            const sameDayShifts = await prisma.shift.findMany({
              where: {
                assignmentId: assignment.id,
                shiftDate: shiftDate
              }
            });
            
            expect(sameDayShifts.length).toBe(1); // Only our shift

          } finally {
            // Cleanup: Remove test data
            await cleanup();
          }
        }
      ), PROPERTY_TEST_CONFIG);
    });
  });

});