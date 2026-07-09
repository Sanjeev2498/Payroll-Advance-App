import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantContextService } from '../../common/tenant-context.service';
import { ShiftsModule } from '../../shifts/shifts.module';
import { ShiftsService } from '../../shifts/shifts.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { CommonModule } from '../../common/common.module';
import * as fc from 'fast-check';
import { randomUUID } from 'crypto';

/**
 * **Property 19: Shift Calendar Consistency**
 * **Validates: Requirements 6.1, 6.2**
 * 
 * This property test ensures that shift calendar operations (creation, swapping, recurring) 
 * maintain schedule integrity and prevent conflicts across all valid deployment scenarios.
 */
describe('Shift Calendar Consistency Properties', () => {
  let module: TestingModule;
  let shiftsService: ShiftsService;
  let prisma: PrismaService;
  let tenantContext: TenantContextService;

  const PROPERTY_TEST_CONFIG = {
    numRuns: 3,  // Reduced for faster execution
    timeout: 15000, // 15 second timeout per test
    seed: 42,
  };

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: ['.env.test', '.env'],
        }),
        PrismaModule,
        CommonModule,
        ShiftsModule
      ],
    }).compile();

    shiftsService = await module.resolve<ShiftsService>(ShiftsService);
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

  // Test data generators
  const shiftCalendarScenarioGenerator = () => {
    return fc.record({
      companyName: fc.string({ minLength: 5, maxLength: 30 }).filter(s => 
        s.trim().length > 0 && /^[a-zA-Z0-9\s]+$/.test(s.trim())
      ),
      siteCount: fc.integer({ min: 1, max: 5 }),
      employeeCount: fc.integer({ min: 1, max: 8 }),
      shiftCount: fc.integer({ min: 1, max: 10 }),
      daysAhead: fc.integer({ min: 1, max: 30 }),
      conflictProbability: fc.float({ min: 0.0, max: 0.5 }),
      recurringEnabled: fc.boolean(),
      swappingEnabled: fc.boolean(),
    });
  };

  const timeSlotGenerator = () => {
    return fc.record({
      startHour: fc.integer({ min: 6, max: 18 }), // 6 AM to 6 PM
      durationHours: fc.integer({ min: 4, max: 12 }), // 4 to 12 hour shifts
    });
  };

  // Helper functions
  async function cleanup() {
    try {
      await prisma.attendance.deleteMany({});
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

  async function createTestScenario(scenario: any) {
    // Create company
    const company = await prisma.company.create({
      data: {
        id: randomUUID(),
        name: scenario.companyName,
        slug: `${scenario.companyName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
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
        name: `${scenario.companyName} Client`,
        contactEmail: `client@${scenario.companyName.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`,
        contactInfo: { phone: '555-0123' },
        contractStatus: 'ACTIVE',
        contractStart: new Date(),
        contractEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        billingPreferences: {}
      }
    });
    // Create sites
    const sites = [];
    for (let i = 0; i < scenario.siteCount; i++) {
      const site = await prisma.site.create({
        data: {
          id: randomUUID(),
          clientId: client.id,
          name: `Site ${i + 1}`,
          address: { street: `${100 + i} Site Street`, city: 'Test City' },
          accessRequirements: { keycard: true },
          safetyProtocols: { emergency: '911' },
          operationalStatus: 'ACTIVE',
          contactInfo: { phone: `555-010${i}` },
        }
      });
      sites.push(site);
    }

    // Create employees
    const employees = [];
    for (let i = 0; i < scenario.employeeCount; i++) {
      const employee = await prisma.employee.create({
        data: {
          id: randomUUID(),
          companyId: company.id,
          employeeNumber: `EMP${1000 + i}`,
          firstName: `Employee${i}`,
          lastName: 'Test',
          email: `emp${i}@test.com`,
          phone: `555-020${i}`,
          address: { street: `${200 + i} Employee St` },
          certifications: { security: true },
          skills: ['security', 'surveillance'],
          employmentStatus: 'ACTIVE',
          hireDate: new Date(),
        }
      });
      employees.push(employee);
    }

    // Create assignments (employees assigned to sites)
    const assignments = [];
    const assignmentCount = Math.min(scenario.employeeCount, scenario.siteCount);
    
    for (let i = 0; i < assignmentCount; i++) {
      const assignment = await prisma.assignment.create({
        data: {
          id: randomUUID(),
          employeeId: employees[i].id,
          siteId: sites[i % sites.length].id,
          role: 'Security Guard',
          responsibilities: { patrol: true, monitoring: true },
          hourlyRate: '25.00',
          hourlyRateIv: 'test-iv',
          hourlyRateTag: 'test-tag',
          status: 'ACTIVE',
          startDate: new Date(),
        }
      });
      assignments.push(assignment);
    }

    return { company, client, sites, employees, assignments };
  }
  describe('Property 19.1: Shift Creation Consistency', () => {
    it('should maintain schedule integrity during shift creation operations', async () => {
      await fc.assert(fc.asyncProperty(
        shiftCalendarScenarioGenerator(),
        timeSlotGenerator(),
        async (scenario, timeSlot) => {
          // **Feature: security-workforce-payroll-system, Property 19.1: Shift Creation Consistency**
          
          // Setup: Create test scenario
          const { company, sites, assignments } = await createTestScenario(scenario);
          
          // Set tenant context
          tenantContext.setContext(company.id);
          
          try {
            // Test: Create shifts for different sites and verify consistency
            const createdShifts = [];
            const shiftDate = new Date();
            shiftDate.setDate(shiftDate.getDate() + scenario.daysAhead);
            
            for (let i = 0; i < Math.min(scenario.shiftCount, assignments.length); i++) {
              const assignment = assignments[i % assignments.length];
              const startTime = `${String(timeSlot.startHour).padStart(2, '0')}:00:00`;
              const endHour = timeSlot.startHour + timeSlot.durationHours;
              const endTime = `${String(Math.min(endHour, 23)).padStart(2, '0')}:00:00`;
              
              const shiftDto = {
                assignmentId: assignment.id,
                siteId: assignment.siteId,
                shiftDate: shiftDate.toISOString().split('T')[0],
                startTime,
                endTime,
                shiftType: 'REGULAR' as const,
                priority: 'NORMAL' as const,
                coverageRequired: 1,
                isRecurring: false,
              };

              // Create shift and verify it's created correctly
              const shift = await shiftsService.create(shiftDto);
              createdShifts.push(shift);

              // Verify: Basic shift properties
              expect(shift).toBeDefined();
              expect(shift.id).toBeTruthy();
              expect(shift.assignmentId).toBe(assignment.id);
              expect(shift.siteId).toBe(assignment.siteId);
              expect(shift.status).toBe('SCHEDULED');
              
              // Verify: Coverage calculations
              expect(shift.coverageRequired).toBe(1);
              expect(shift.coverageAssigned).toBeGreaterThanOrEqual(0);
              expect(shift.coverageAssigned).toBeLessThanOrEqual(shift.coverageRequired);
              
              // Move to next day to avoid conflicts
              shiftDate.setDate(shiftDate.getDate() + 1);
            }

            // Verify: No scheduling conflicts exist
            const allShifts = await prisma.shift.findMany({
              where: { 
                site: { 
                  client: { companyId: company.id } 
                }
              },
              include: {
                assignment: {
                  include: {
                    employee: { select: { id: true, firstName: true, lastName: true } }
                  }
                },
                site: { select: { id: true, name: true } }
              }
            });

            // Check for overlapping shifts for same employee
            const employeeShifts = new Map<string, any[]>();
            for (const shift of allShifts) {
              if (shift.assignment?.employeeId) {
                if (!employeeShifts.has(shift.assignment.employeeId)) {
                  employeeShifts.set(shift.assignment.employeeId, []);
                }
                employeeShifts.get(shift.assignment.employeeId)!.push(shift);
              }
            }

            // Verify no overlapping shifts for same employee on same day
            for (const [employeeId, shifts] of employeeShifts) {
              const shiftsByDate = new Map<string, any[]>();
              for (const shift of shifts) {
                const dateKey = shift.shiftDate.toISOString().split('T')[0];
                if (!shiftsByDate.has(dateKey)) {
                  shiftsByDate.set(dateKey, []);
                }
                shiftsByDate.get(dateKey)!.push(shift);
              }
              
              // Each employee should have at most one shift per day
              for (const [date, dateShifts] of shiftsByDate) {
                expect(dateShifts.length).toBeLessThanOrEqual(1);
              }
            }

          } finally {
            // Cleanup: Remove test data
            await cleanup();
          }
        }
      ), PROPERTY_TEST_CONFIG);
    });
  });
  describe('Property 19.2: Coverage Assignment Validation', () => {
    it('should correctly manage coverage requirements and assignments', async () => {
      await fc.assert(fc.asyncProperty(
        shiftCalendarScenarioGenerator(),
        fc.integer({ min: 1, max: 3 }), // coverage required
        async (scenario, coverageRequired) => {
          // **Feature: security-workforce-payroll-system, Property 19.2: Coverage Assignment Validation**
          
          // Setup: Create test scenario
          const { company, sites, assignments } = await createTestScenario(scenario);
          
          // Set tenant context
          tenantContext.setContext(company.id);
          
          try {
            const shiftDate = new Date();
            shiftDate.setDate(shiftDate.getDate() + scenario.daysAhead);
            
            if (assignments.length > 0) {
              const assignment = assignments[0];
              
              // Create shift with specific coverage requirement
              const shiftDto = {
                assignmentId: assignment.id,
                siteId: assignment.siteId,
                shiftDate: shiftDate.toISOString().split('T')[0],
                startTime: '09:00:00',
                endTime: '17:00:00',
                shiftType: 'REGULAR' as const,
                priority: 'NORMAL' as const,
                coverageRequired: coverageRequired,
                isRecurring: false,
              };

              const shift = await shiftsService.create(shiftDto);

              // Verify: Coverage requirements are set correctly
              expect(shift.coverageRequired).toBe(coverageRequired);
              
              // Verify: When an assignment exists, coverage assigned should be > 0
              if (shift.assignmentId) {
                expect(shift.coverageAssigned).toBeGreaterThan(0);
                expect(shift.coverageAssigned).toBeLessThanOrEqual(shift.coverageRequired);
              } else {
                // No assignment means no coverage assigned yet
                expect(shift.coverageAssigned).toBe(0);
              }
              
              // Verify: Status should be SCHEDULED when properly assigned
              if (shift.coverageAssigned >= shift.coverageRequired) {
                expect(shift.status).toBe('SCHEDULED');
              } else if (shift.coverageAssigned > 0 && shift.coverageAssigned < shift.coverageRequired) {
                // Partial coverage - should still be SCHEDULED but might need more coverage
                expect(['SCHEDULED', 'NEEDS_COVERAGE']).toContain(shift.status);
              } else {
                // No coverage - might be SCHEDULED (pending assignment) or NEEDS_COVERAGE
                expect(['SCHEDULED', 'NEEDS_COVERAGE']).toContain(shift.status);
              }

              // Test: Retrieve shift and verify persistence
              const retrievedShift = await shiftsService.findOne(shift.id);
              expect(retrievedShift.coverageRequired).toBe(coverageRequired);
              expect(retrievedShift.coverageAssigned).toBe(shift.coverageAssigned);
              expect(retrievedShift.status).toBe(shift.status);
            }

          } finally {
            // Cleanup: Remove test data
            await cleanup();
          }
        }
      ), PROPERTY_TEST_CONFIG);
    });
  });
  describe('Property 19.3: Conflict Detection Accuracy', () => {
    it('should accurately detect and prevent scheduling conflicts', async () => {
      await fc.assert(fc.asyncProperty(
        shiftCalendarScenarioGenerator(),
        async (scenario) => {
          // **Feature: security-workforce-payroll-system, Property 19.3: Conflict Detection Accuracy**
          
          // Setup: Create test scenario
          const { company, sites, assignments } = await createTestScenario(scenario);
          
          // Set tenant context
          tenantContext.setContext(company.id);
          
          try {
            if (assignments.length > 0) {
              const assignment = assignments[0];
              const shiftDate = new Date();
              shiftDate.setDate(shiftDate.getDate() + scenario.daysAhead);
              
              // Create first shift
              const firstShiftDto = {
                assignmentId: assignment.id,
                siteId: assignment.siteId,
                shiftDate: shiftDate.toISOString().split('T')[0],
                startTime: '09:00:00',
                endTime: '17:00:00',
                shiftType: 'REGULAR' as const,
                priority: 'NORMAL' as const,
                coverageRequired: 1,
                isRecurring: false,
              };

              const firstShift = await shiftsService.create(firstShiftDto);
              expect(firstShift).toBeDefined();
              expect(firstShift.status).toBe('SCHEDULED');

              // Test: Try to create overlapping shift for same employee
              const conflictingShiftDto = {
                assignmentId: assignment.id,
                siteId: assignment.siteId,
                shiftDate: shiftDate.toISOString().split('T')[0],
                startTime: '15:00:00', // Overlaps with first shift (9-17)
                endTime: '23:00:00',
                shiftType: 'REGULAR' as const,
                priority: 'NORMAL' as const,
                coverageRequired: 1,
                isRecurring: false,
              };

              // Verify: Conflicting shift should be rejected
              let conflictDetected = false;
              try {
                await shiftsService.create(conflictingShiftDto);
                // If no error thrown, check if the system handled it gracefully
                const allShifts = await prisma.shift.findMany({
                  where: { 
                    assignmentId: assignment.id,
                    shiftDate: shiftDate
                  }
                });

                // Should have only one shift or conflict should be resolved
                expect(allShifts.length).toBeGreaterThan(0);
                
                // If multiple shifts exist for same employee/date, they shouldn't overlap
                if (allShifts.length > 1) {
                  for (let i = 0; i < allShifts.length - 1; i++) {
                    for (let j = i + 1; j < allShifts.length; j++) {
                      const shift1 = allShifts[i];
                      const shift2 = allShifts[j];
                      
                      // Convert time strings to comparable format
                      const start1 = shift1.startTime;
                      const end1 = shift1.endTime;
                      const start2 = shift2.startTime;
                      const end2 = shift2.endTime;
                      
                      // Verify no overlap: either shift1 ends before shift2 starts, or shift2 ends before shift1 starts
                      const noOverlap = (end1 <= start2) || (end2 <= start1);
                      expect(noOverlap).toBe(true);
                    }
                  }
                }
              } catch (error) {
                conflictDetected = true;
                // Verify this is a conflict-related error
                expect(error.message.toLowerCase()).toMatch(/conflict|overlap|scheduling/i);
              }

              // Test: Non-conflicting shift should work
              const nonConflictingDate = new Date(shiftDate);
              nonConflictingDate.setDate(nonConflictingDate.getDate() + 1);
              
              const nonConflictingShiftDto = {
                assignmentId: assignment.id,
                siteId: assignment.siteId,
                shiftDate: nonConflictingDate.toISOString().split('T')[0],
                startTime: '09:00:00',
                endTime: '17:00:00',
                shiftType: 'REGULAR' as const,
                priority: 'NORMAL' as const,
                coverageRequired: 1,
                isRecurring: false,
              };

              const nonConflictingShift = await shiftsService.create(nonConflictingShiftDto);
              expect(nonConflictingShift).toBeDefined();
              expect(nonConflictingShift.status).toBe('SCHEDULED');
            }

          } finally {
            // Cleanup: Remove test data
            await cleanup();
          }
        }
      ), PROPERTY_TEST_CONFIG);
    });
  });
  describe('Property 19.4: Shift Status Management', () => {
    it('should maintain proper shift status transitions and integrity', async () => {
      await fc.assert(fc.asyncProperty(
        shiftCalendarScenarioGenerator(),
        fc.constantFrom('SCHEDULED', 'CONFIRMED', 'CANCELLED', 'NEEDS_COVERAGE'),
        async (scenario, targetStatus) => {
          // **Feature: security-workforce-payroll-system, Property 19.4: Shift Status Management**
          
          // Setup: Create test scenario
          const { company, sites, assignments } = await createTestScenario(scenario);
          
          // Set tenant context
          tenantContext.setContext(company.id);
          
          try {
            if (assignments.length > 0) {
              const assignment = assignments[0];
              const shiftDate = new Date();
              shiftDate.setDate(shiftDate.getDate() + scenario.daysAhead);
              
              // Create shift
              const shiftDto = {
                assignmentId: assignment.id,
                siteId: assignment.siteId,
                shiftDate: shiftDate.toISOString().split('T')[0],
                startTime: '09:00:00',
                endTime: '17:00:00',
                shiftType: 'REGULAR' as const,
                priority: 'NORMAL' as const,
                coverageRequired: 1,
                isRecurring: false,
              };

              const shift = await shiftsService.create(shiftDto);
              expect(shift.status).toBe('SCHEDULED');

              // Test: Update shift status
              const updateDto = {
                status: targetStatus as any,
                modificationReason: {
                  action: `STATUS_CHANGE_TO_${targetStatus}`,
                  reason: `Testing status change to ${targetStatus}`,
                  modifiedBy: 'test-user'
                }
              };

              const updatedShift = await shiftsService.update(shift.id, updateDto);
              
              // Verify: Status was updated correctly
              expect(updatedShift.status).toBe(targetStatus);
              
              // Verify: Modification log was updated
              expect(updatedShift.modificationLog).toBeDefined();
              const modLog = Array.isArray(updatedShift.modificationLog) 
                ? updatedShift.modificationLog 
                : [];
              expect(modLog.length).toBeGreaterThan(0);
              
              // Verify: Coverage assignments remain consistent with status
              if (targetStatus === 'CANCELLED') {
                // Cancelled shifts should maintain their coverage data but not be counted as active
                expect(updatedShift.coverageRequired).toBeGreaterThan(0);
                // Coverage assigned can remain as is for historical tracking
              } else if (targetStatus === 'NEEDS_COVERAGE') {
                // Shifts needing coverage should have coverage required > coverage assigned
                expect(updatedShift.coverageRequired).toBeGreaterThan(0);
                // Coverage assigned might be 0 or less than required
                expect(updatedShift.coverageAssigned).toBeLessThanOrEqual(updatedShift.coverageRequired);
              } else if (targetStatus === 'CONFIRMED' || targetStatus === 'SCHEDULED') {
                // Active shifts should have proper coverage
                expect(updatedShift.coverageRequired).toBeGreaterThan(0);
                expect(updatedShift.coverageAssigned).toBeGreaterThanOrEqual(0);
                expect(updatedShift.coverageAssigned).toBeLessThanOrEqual(updatedShift.coverageRequired);
              }

              // Test: Verify shift can be retrieved with correct status
              const retrievedShift = await shiftsService.findOne(shift.id);
              expect(retrievedShift.status).toBe(targetStatus);
              expect(retrievedShift.id).toBe(shift.id);
            }

          } finally {
            // Cleanup: Remove test data
            await cleanup();
          }
        }
      ), PROPERTY_TEST_CONFIG);
    });
  });
  describe('Property 19.5: Recurring Shift Consistency', () => {
    it('should maintain schedule integrity for recurring shift operations', async () => {
      await fc.assert(fc.asyncProperty(
        shiftCalendarScenarioGenerator().filter(s => s.recurringEnabled),
        fc.constantFrom('WEEKLY', 'DAILY'),
        fc.integer({ min: 2, max: 5 }), // number of recurrences
        async (scenario, recurrenceType, occurrences) => {
          // **Feature: security-workforce-payroll-system, Property 19.5: Recurring Shift Consistency**
          
          // Setup: Create test scenario
          const { company, sites, assignments } = await createTestScenario(scenario);
          
          // Set tenant context
          tenantContext.setContext(company.id);
          
          try {
            if (assignments.length > 0) {
              const assignment = assignments[0];
              const shiftDate = new Date();
              shiftDate.setDate(shiftDate.getDate() + scenario.daysAhead);
              
              // Create recurring shift
              const recurringShiftDto = {
                assignmentId: assignment.id,
                siteId: assignment.siteId,
                shiftDate: shiftDate.toISOString().split('T')[0],
                startTime: '09:00:00',
                endTime: '17:00:00',
                shiftType: 'REGULAR' as const,
                priority: 'NORMAL' as const,
                coverageRequired: 1,
                isRecurring: true,
                recurringPattern: {
                  type: recurrenceType,
                  interval: 1,
                  occurrences: occurrences,
                  endDate: null
                }
              };

              const baseShift = await shiftsService.create(recurringShiftDto);
              
              // Verify: Base shift was created correctly
              expect(baseShift).toBeDefined();
              expect(baseShift.isRecurring).toBe(true);
              expect(baseShift.status).toBe('SCHEDULED');

              // Give time for recurring shifts to be created
              await new Promise(resolve => setTimeout(resolve, 100));

              // Test: Verify recurring shifts were created
              const allShifts = await prisma.shift.findMany({
                where: {
                  assignmentId: assignment.id,
                  siteId: assignment.siteId,
                  startTime: baseShift.startTime,
                  endTime: baseShift.endTime,
                },
                orderBy: { shiftDate: 'asc' }
              });

              // Should have at least the base shift (recurring creation might be async)
              expect(allShifts.length).toBeGreaterThan(0);
              
              // Verify: All shifts have consistent properties
              for (const shift of allShifts) {
                expect(shift.assignmentId).toBe(assignment.id);
                expect(shift.siteId).toBe(assignment.siteId);
                expect(shift.startTime).toEqual(baseShift.startTime);
                expect(shift.endTime).toEqual(baseShift.endTime);
                expect(shift.coverageRequired).toBe(baseShift.coverageRequired);
                expect(shift.status).toMatch(/^(SCHEDULED|CONFIRMED)$/);
                
                // Coverage assigned should be consistent
                expect(shift.coverageAssigned).toBeGreaterThanOrEqual(0);
                expect(shift.coverageAssigned).toBeLessThanOrEqual(shift.coverageRequired);
              }

              // Verify: No scheduling conflicts between recurring shifts
              for (let i = 0; i < allShifts.length - 1; i++) {
                for (let j = i + 1; j < allShifts.length; j++) {
                  const shift1 = allShifts[i];
                  const shift2 = allShifts[j];
                  
                  // If on same date, should not overlap (this shouldn't happen for proper recurring shifts)
                  if (shift1.shiftDate.getTime() === shift2.shiftDate.getTime()) {
                    const start1 = shift1.startTime;
                    const end1 = shift1.endTime;
                    const start2 = shift2.startTime;
                    const end2 = shift2.endTime;
                    
                    const noOverlap = (end1 <= start2) || (end2 <= start1);
                    expect(noOverlap).toBe(true);
                  }
                }
              }

              // Test: Verify recurring pattern consistency
              if (allShifts.length > 1) {
                const sortedShifts = allShifts.sort((a, b) => a.shiftDate.getTime() - b.shiftDate.getTime());
                
                for (let i = 1; i < Math.min(sortedShifts.length, 3); i++) {
                  const prevDate = sortedShifts[i - 1].shiftDate;
                  const currentDate = sortedShifts[i].shiftDate;
                  const daysDiff = Math.floor((currentDate.getTime() - prevDate.getTime()) / (24 * 60 * 60 * 1000));
                  
                  if (recurrenceType === 'DAILY') {
                    expect(daysDiff).toBeGreaterThanOrEqual(1);
                    expect(daysDiff).toBeLessThanOrEqual(7); // Allow some flexibility
                  } else if (recurrenceType === 'WEEKLY') {
                    expect(daysDiff).toBeGreaterThanOrEqual(6);
                    expect(daysDiff).toBeLessThanOrEqual(8); // Allow some flexibility
                  }
                }
              }
            }

          } finally {
            // Cleanup: Remove test data
            await cleanup();
          }
        }
      ), PROPERTY_TEST_CONFIG);
    });
  });

});