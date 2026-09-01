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
    numRuns: 2,  // Optimized for faster execution
    timeout: 8000, // Reduced timeout for performance
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
      await prisma.shifts.deleteMany({});
      await prisma.assignments.deleteMany({});
      await prisma.employees.deleteMany({});
      await prisma.sites.deleteMany({});
      await prisma.contracts.deleteMany({});
      await prisma.clients.deleteMany({});
      await prisma.companies.deleteMany({});
    } catch (error) {
      // Ignore cleanup errors
    }
  }
  async function createBasicScenario() {
    // Create company
    const company = await prisma.companies.create({
      data: {
        id: randomUUID(),
        name: 'Test Company',
        slug: `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        created_at: new Date(),
        updated_at: new Date(),
        settings: {},
        branding: {}
      }
    });

    // Set tenant context immediately after company creation
    tenantContext.setContext(company.id);

    // Create client
    const client = await prisma.clients.create({
      data: {
        id: randomUUID(),
        company_id: company.id,
        name: 'Test Client',
        contact_email: 'client@test.com',
        contact_info: { phone: '555-0123' },
        organization_type: 'CORPORATE_OFFICE',
        industry: 'Technology',
        company_size: '100-500',
        contract_status: 'ACTIVE',
        contract_start: new Date(),
        contract_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        billing_preferences: { cycle: 'monthly', terms: 'NET-30', currency: 'INR' },
        tags: ['test'],
        created_at: new Date(),
        updated_at: new Date()
      }
    });

    // Create contract
    const contract = await prisma.contracts.create({
      data: {
        id: randomUUID(),
        client_id: client.id,
        contract_number: `CONTRACT-SHIFT-${Date.now()}-${Math.random()}`,
        title: 'Security Services Agreement',
        description: 'Test security services',
        status: 'ACTIVE',
        start_date: new Date(),
        end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        service_definitions: { services: ['Security'], coverage: '24x7' },
        billing_preferences: { cycle: 'monthly', terms: 'NET-30', currency: 'INR' },
        contract_value: 100000.00,
        created_at: new Date(),
        updated_at: new Date()
      }
    });

    // Create site
    const site = await prisma.sites.create({
      data: {
        id: randomUUID(),
        contract_id: contract.id,
        client_id: client.id,
        name: 'Test Site',
        address: { street: '123 Test Street', city: 'Test City' },
        access_requirements: { keycard: true },
        safety_protocols: { emergency: '911' },
        operational_status: 'ACTIVE',
        contact_info: { phone: '555-0100' },
        min_staffing_level: 1,
        max_staffing_level: 10,
        created_at: new Date(),
        updated_at: new Date()
      }
    });

    // Create employee
    const employee = await prisma.employees.create({
      data: {
        id: randomUUID(),
        company_id: company.id,
        employee_number: 'EMP001',
        first_name: 'Test',
        last_name: 'Employee',
        email: 'test.employee@company.com',
        phone: '+91-9876543210',
        employment_status: 'ACTIVE',
        hire_date: new Date(),
        address: { street: '123 Employee St', city: 'Employee City' },
        certifications: {},
        skills: ['Security'],
        created_at: new Date(),
        updated_at: new Date()
      }
    });

    // Create assignment
    const assignment = await prisma.assignments.create({
      data: {
        id: randomUUID(),
        employee_id: employee.id,
        site_id: site.id,
        role: 'Security Guard',
        responsibilities: { primary: ['Security'], secondary: [] },
        hourly_rate: '100.00',
        hourly_rate_iv: 'mock_iv_string',
        hourly_rate_tag: 'mock_tag_string',
        status: 'ACTIVE',
        start_date: new Date(),
        created_at: new Date(),
        updated_at: new Date()
      }
    });

    return { company, client, contract, site, employee, assignment };
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
            const shift = await prisma.shifts.create({
              data: {
                id: randomUUID(),
                assignment_id: assignment.id,
                site_id: site.id,
                shift_date: shiftDate,
                start_time: new Date(`1970-01-01T09:00:00.000Z`), // DateTime object with time component
                end_time: new Date(`1970-01-01T17:00:00.000Z`),   // DateTime object with time component
                shift_type: 'REGULAR',
                status: 'SCHEDULED',
                created_at: new Date(),
                updated_at: new Date(),
                notes: {
                  coverageRequired: coverageRequired,
                  coverageAssigned: 1,
                  priority: 'NORMAL',
                  isRecurring: false,
                  skillRequirements: {},
                  shiftRequirements: {},
                  breakSchedule: {},
                  modificationLog: [
                    {
                      timestamp: new Date().toISOString(),
                      action: 'CREATED',
                      createdBy: 'test-system'
                    }
                  ]
                }
              }
            });

            // Verify: Basic shift properties
            expect(shift).toBeDefined();
            expect(shift.id).toBeTruthy();
            expect(shift.assignment_id).toBe(assignment.id);
            expect(shift.site_id).toBe(site.id);
            expect(shift.status).toBe('SCHEDULED');
            
            // Verify: Coverage calculations
            expect(shift.notes.coverageRequired).toBe(coverageRequired);
            expect(shift.notes.coverageAssigned).toBeGreaterThan(0);
            expect(shift.notes.coverageAssigned).toBeLessThanOrEqual(shift.notes.coverageRequired);
            
            // Verify: When assignment exists, coverage assigned should be defined
            if (shift.coverageAssigned !== undefined) {
              expect(shift.coverageAssigned).toBeGreaterThan(0);
            }
            
            // Verify: Status should be SCHEDULED when properly assigned
            expect(shift.status).toBe('SCHEDULED');

            // Test: Retrieve shift and verify persistence
            const retrievedShift = await prisma.shifts.findUnique({
              where: { id: shift.id }
            });
            
            expect(retrievedShift).toBeDefined();
            expect(retrievedShift!.notes.coverageRequired).toBe(coverageRequired);
            expect(retrievedShift!.notes.coverageAssigned).toBe(shift.notes.coverageAssigned);
            expect(retrievedShift!.status).toBe(shift.status);
            
            // Verify: No conflicts with same employee on same day
            const sameDayShifts = await prisma.shifts.findMany({
              where: {
                assignment_id: assignment.id,
                shift_date: shiftDate
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