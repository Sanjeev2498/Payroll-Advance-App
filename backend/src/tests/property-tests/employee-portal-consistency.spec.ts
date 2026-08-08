import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { EmployeePortalService } from '../../employees/employee-portal.service';
import { TenantContextService } from '../../common/tenant-context.service';
import * as fc from 'fast-check';
import { randomUUID } from 'crypto';

/**
 * Property-Based Test: Employee Portal Data Consistency
 * **Validates: Requirements 11.2**
 *
 * This test ensures that attendance, deployments, schedules, payslips, and notifications
 * remain consistent across all employee portal views. Tests verify data synchronization
 * and accuracy across different employee portal endpoints.
 */
describe('Property Test: Employee Portal Data Consistency', () => {
  let employeePortalService: EmployeePortalService;
  let prismaService: PrismaService;
  let tenantContextService: TenantContextService;
  let module: TestingModule;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [ConfigModule.forRoot()],
      providers: [
        PrismaService,
        EmployeePortalService,
        TenantContextService,
      ],
    }).compile();

    employeePortalService = await module.resolve<EmployeePortalService>(EmployeePortalService);
    prismaService = module.get<PrismaService>(PrismaService);
    tenantContextService = await module.resolve<TenantContextService>(TenantContextService);
    
    await prismaService.onModuleInit();
  });

  afterAll(async () => {
    if (prismaService) {
      await prismaService.onModuleDestroy();
    }
    if (module) {
      await module.close();
    }
  });

  /**
   * Generate valid test data for employee portal scenarios
   */
  const employeeDataGenerator = fc.record({
    employeeNumber: fc.string({ minLength: 3, maxLength: 10 }),
    firstName: fc.string({ minLength: 2, maxLength: 30 }),
    lastName: fc.string({ minLength: 2, maxLength: 30 }),
    email: fc.emailAddress(),
    employmentStatus: fc.constantFrom('ACTIVE')
  });
  const queryFilterGenerator = fc.record({
    attendanceFilter: fc.constantFrom('TODAY', 'THIS_WEEK', 'THIS_MONTH'),
    shiftFilter: fc.constantFrom('CURRENT', 'UPCOMING', 'PAST', 'THIS_WEEK'),
    payrollYear: fc.constantFrom('2024', '2023'),
    payrollMonth: fc.option(fc.constantFrom('1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'))
  });

  /**
   * Property 25: Employee Portal Consistency
   * **Validates: Requirements 11.2**
   *
   * For any employee portal request with valid employee data,
   * the system SHALL maintain data consistency across all views including
   * attendance, deployments, schedules, payslips, and notifications.
   */
  it('Property 25: Employee Portal Consistency', async () => {
    const testTenantId = randomUUID();

    // Setup: Create test company
    await prismaService.withSystemContext(async (prisma) => {
      await prisma.company.create({
        data: {
          id: testTenantId,
          name: 'Portal Test Company',
          slug: `portal-test-${testTenantId.substring(0, 8)}`,
        },
      });
    });

    try {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            employee: employeeDataGenerator,
            client: fc.record({
              name: fc.string({ minLength: 3, maxLength: 50 }),
              contactEmail: fc.emailAddress()
            }),
            site: fc.record({
              name: fc.string({ minLength: 3, maxLength: 50 }),
              address: fc.record({
                street: fc.string({ minLength: 5, maxLength: 50 }),
                city: fc.string({ minLength: 2, maxLength: 30 }),
                state: fc.string({ minLength: 2, maxLength: 30 }),
                zipCode: fc.string({ minLength: 5, maxLength: 10 })
              })
            }),
            queryFilters: queryFilterGenerator
          }),
          async (testData) => {
            // Setup tenant context
            tenantContextService.setContext(testTenantId);

            let createdEmployee: any;

            await prismaService.withTenant(testTenantId, async (prisma) => {
              // Create client using minimal required fields
              const client = await prisma.client.create({
                data: {
                  name: testData.client.name,
                  contactEmail: testData.client.contactEmail,
                  companyId: testTenantId
                }
              });

              // Create contract first
              const contract = await prisma.contract.create({
                data: {
                  clientId: client.id,
                  contractNumber: `CONT-${Date.now()}-${Math.random()}`,
                  title: `Security Services - ${client.name}`,
                  status: 'ACTIVE',
                  startDate: new Date(),
                  endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
                  serviceDefinitions: { services: ['security'] }
                }
              });

              // Create site
              const site = await prisma.site.create({
                data: {
                  name: testData.site.name,
                  operationalStatus: 'ACTIVE',
                  address: testData.site.address,
                  contractId: contract.id
                }
              });

              // Create employee with minimal required fields
              createdEmployee = await prisma.employee.create({
                data: {
                  employeeNumber: testData.employee.employeeNumber,
                  firstName: testData.employee.firstName,
                  lastName: testData.employee.lastName,
                  email: testData.employee.email,
                  employmentStatus: 'ACTIVE',
                  hireDate: new Date('2024-01-01'),
                  companyId: testTenantId
                }
              });

              // Create assignment with encrypted hourlyRate
              const assignment = await prisma.assignment.create({
                data: {
                  role: 'Security Guard',
                  hourlyRate: '25.00',
                  hourlyRateIv: 'dummy_iv_value_123456789012',
                  hourlyRateTag: 'dummy_tag_value_12345678901',
                  status: 'ACTIVE',
                  startDate: new Date('2024-01-01'),
                  employeeId: createdEmployee.id,
                  siteId: site.id
                }
              });

              // Create a basic shift for today
              const today = new Date();
              const shiftDate = new Date(today.toISOString().split('T')[0]);
              const startTime = new Date(`${shiftDate.toISOString().split('T')[0]}T08:00:00.000Z`);
              const endTime = new Date(`${shiftDate.toISOString().split('T')[0]}T16:00:00.000Z`);
              const shift = await prisma.shift.create({
                data: {
                  shiftDate,
                  startTime,
                  endTime,
                  shiftType: 'REGULAR',
                  status: 'SCHEDULED',
                  siteId: site.id,
                  assignmentId: assignment.id
                }
              });

              // Create attendance record
              await prisma.attendance.create({
                data: {
                  clockIn: startTime,
                  clockOut: null,
                  status: 'PRESENT',
                  employeeId: createdEmployee.id,
                  shiftId: shift.id
                }
              });
            });

            // Test: Get data from different employee portal endpoints
            const dashboardData = await employeePortalService.getDashboard(createdEmployee.id);
            
            const attendanceData = await employeePortalService.getAttendanceRecords(
              createdEmployee.id,
              { filter: testData.queryFilters.attendanceFilter as any }
            );
            
            const shiftData = await employeePortalService.getShiftSchedules(
              createdEmployee.id,
              { filter: testData.queryFilters.shiftFilter as any }
            );
            
            const payrollData = await employeePortalService.getPayrollInformation(
              createdEmployee.id,
              { 
                year: testData.queryFilters.payrollYear,
                month: testData.queryFilters.payrollMonth || undefined
              }
            );

            const notificationData = await employeePortalService.getNotifications(
              createdEmployee.id,
              false
            );
            // Verify: Dashboard data consistency
            expect(dashboardData).toBeDefined();
            expect(dashboardData.attendanceSummary).toBeDefined();
            expect(dashboardData.upcomingShifts).toBeDefined();
            expect(dashboardData.recentPayslips).toBeDefined();
            expect(dashboardData.clockStatus).toBeDefined();

            // Verify: Attendance data consistency
            expect(attendanceData.records).toBeDefined();
            expect(attendanceData.summary).toBeDefined();
            expect(Array.isArray(attendanceData.records)).toBe(true);
            expect(typeof attendanceData.summary.totalDaysWorked).toBe('number');
            expect(typeof attendanceData.summary.totalHoursWorked).toBe('number');
            expect(attendanceData.summary.attendanceRate).toBeGreaterThanOrEqual(0);
            expect(attendanceData.summary.attendanceRate).toBeLessThanOrEqual(100);

            // Verify: Shift data consistency
            expect(Array.isArray(shiftData)).toBe(true);
            shiftData.forEach(shift => {
              expect(shift.id).toBeDefined();
              expect(shift.siteName).toBeDefined();
              expect(shift.shiftDate).toBeDefined();
              expect(shift.startTime).toBeDefined();
              expect(shift.endTime).toBeDefined();
              expect(shift.status).toBeDefined();
            });

            // Verify: Payroll data consistency
            expect(Array.isArray(payrollData)).toBe(true);
            payrollData.forEach(payroll => {
              expect(typeof payroll.grossPay).toBe('number');
              expect(typeof payroll.netPay).toBe('number');
              expect(payroll.netPay).toBeLessThanOrEqual(payroll.grossPay);
              expect(payroll.status).toBeDefined();
            });

            // Verify: Notification data consistency
            expect(Array.isArray(notificationData)).toBe(true);
            const unreadCount = notificationData.filter(n => !n.isRead).length;
            expect(dashboardData.unreadNotifications).toBe(unreadCount);

            // Verify: Data type consistency across endpoints
            expect(typeof dashboardData.unreadNotifications).toBe('number');
            expect(dashboardData.unreadNotifications).toBeGreaterThanOrEqual(0);

            // Verify: Clock status logical consistency
            expect(typeof dashboardData.clockStatus.isClockedIn).toBe('boolean');
            // Verify: Upcoming shifts consistency between dashboard and shifts endpoint
            dashboardData.upcomingShifts.forEach(dashboardShift => {
              const matchingShift = shiftData.find(shift => shift.id === dashboardShift.id);
              if (matchingShift) {
                expect(matchingShift.siteName).toBe(dashboardShift.siteName);
                expect(matchingShift.shiftDate).toBe(dashboardShift.shiftDate);
                expect(matchingShift.status).toBe(dashboardShift.status);
              }
            });

            // Cleanup: Remove test data
            await prismaService.withTenant(testTenantId, async (prisma) => {
              await prisma.shiftNotification.deleteMany({});
              await prisma.attendance.deleteMany({});
              await prisma.shift.deleteMany({});
              await prisma.assignment.deleteMany({});
              await prisma.site.deleteMany({});
              await prisma.employee.deleteMany({});
              await prisma.client.deleteMany({});
            });
          }
        ),
        {
          numRuns: 2, // Reduced for comprehensive testing while maintaining performance
          timeout: 15000, // 15 second timeout per test
          seed: 42,
          endOnFailure: true,
        }
      );
    } finally {
      // Cleanup: Remove test company
      await prismaService.withSystemContext(async (prisma) => {
        await prisma.company
          .delete({ where: { id: testTenantId } })
          .catch(() => {
            // Ignore cleanup errors
          });
      });
    }
  }, 30000); // 30 second test timeout
  /**
   * Property 26: Employee Portal Data Mathematical Consistency
   * **Validates: Requirements 11.2**
   *
   * For any employee portal calculations (attendance summaries, payroll totals),
   * the system SHALL maintain mathematical accuracy and logical consistency
   * across all computed values.
   */
  it('Property 26: Employee Portal Data Mathematical Consistency', async () => {
    const testTenantId = randomUUID();

    // Setup: Create test company
    await prismaService.withSystemContext(async (prisma) => {
      await prisma.company.create({
        data: {
          id: testTenantId,
          name: 'Math Test Company',
          slug: `math-test-${testTenantId.substring(0, 8)}`,
        },
      });
    });

    try {
      await fc.assert(
        fc.asyncProperty(
          employeeDataGenerator,
          async (employeeData) => {
            // Setup tenant context
            tenantContextService.setContext(testTenantId);

            let createdEmployee: any;

            await prismaService.withTenant(testTenantId, async (prisma) => {
              // Create minimal employee
              createdEmployee = await prisma.employee.create({
                data: {
                  employeeNumber: employeeData.employeeNumber,
                  firstName: employeeData.firstName,
                  lastName: employeeData.lastName,
                  email: employeeData.email,
                  employmentStatus: 'ACTIVE',
                  hireDate: new Date('2024-01-01'),
                  companyId: testTenantId
                }
              });
            });
            // Test: Get attendance summary and verify mathematical consistency
            // Ensure we're still in tenant context
            const attendanceData = await prismaService.withTenant(testTenantId, async () => {
              return employeePortalService.getAttendanceRecords(
                createdEmployee.id,
                { filter: 'THIS_MONTH' as any }
              );
            });

            // Verify: Mathematical consistency in attendance summary
            const summary = attendanceData.summary;
            
            // All numeric values should be non-negative
            expect(summary.totalDaysWorked).toBeGreaterThanOrEqual(0);
            expect(summary.totalHoursWorked).toBeGreaterThanOrEqual(0);
            expect(summary.overtimeHours).toBeGreaterThanOrEqual(0);
            expect(summary.lateArrivals).toBeGreaterThanOrEqual(0);
            expect(summary.earlyDepartures).toBeGreaterThanOrEqual(0);

            // Attendance rate should be a valid percentage
            expect(summary.attendanceRate).toBeGreaterThanOrEqual(0);
            expect(summary.attendanceRate).toBeLessThanOrEqual(100);

            // Overtime hours should not exceed total hours worked
            expect(summary.overtimeHours).toBeLessThanOrEqual(summary.totalHoursWorked);

            // Late arrivals and early departures should be integers (count values)
            expect(Number.isInteger(summary.lateArrivals)).toBe(true);
            expect(Number.isInteger(summary.earlyDepartures)).toBe(true);
            expect(Number.isInteger(summary.totalDaysWorked)).toBe(true);

            // Test: Get dashboard and verify consistency
            const dashboardData = await prismaService.withTenant(testTenantId, async () => {
              return employeePortalService.getDashboard(createdEmployee.id);
            });
            
            // Dashboard attendance summary should match dedicated endpoint
            expect(dashboardData.attendanceSummary.totalDaysWorked).toBe(summary.totalDaysWorked);
            expect(dashboardData.attendanceSummary.totalHoursWorked).toBe(summary.totalHoursWorked);
            expect(dashboardData.attendanceSummary.attendanceRate).toBe(summary.attendanceRate);

            // Cleanup
            await prismaService.withTenant(testTenantId, async (prisma) => {
              await prisma.employee.deleteMany({});
            });
          }
        ),
        {
          numRuns: 3,
          timeout: 10000,
          seed: 123,
          endOnFailure: true,
        }
      );
    } finally {
      // Cleanup: Remove test company
      await prismaService.withSystemContext(async (prisma) => {
        await prisma.company
          .delete({ where: { id: testTenantId } })
          .catch(() => {
            // Ignore cleanup errors
          });
      });
    }
  }, 25000);
});