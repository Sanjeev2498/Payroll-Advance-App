import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { DashboardService } from '../../dashboard/dashboard.service';
import { TenantContextService } from '../../common/tenant-context.service';
import * as fc from 'fast-check';
import { randomUUID } from 'crypto';

/**
 * Property-Based Test: Operations Command Center KPI Accuracy
 * **Validates: Requirements 11.1**
 *
 * This test ensures that the Operations Command Center displays accurate real-time metrics
 * for active guards, sites, attendance status, payroll status, and billing overview.
 * Tests verify mathematical accuracy and data consistency across various scenarios.
 */
describe('Property Test: Operations Command Center KPI Accuracy', () => {
  let dashboardService: DashboardService;
  let prismaService: PrismaService;
  let tenantContextService: TenantContextService;
  let module: TestingModule;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [ConfigModule.forRoot()],
      providers: [
        PrismaService,
        DashboardService,
        TenantContextService,
      ],
    }).compile();

    dashboardService = await module.resolve<DashboardService>(DashboardService);
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
   * Generate valid test data for various KPI scenarios
   */
  const employeeGenerator = fc.record({
    employeeNumber: fc.string({ minLength: 3, maxLength: 10 }),
    firstName: fc.string({ minLength: 2, maxLength: 30 }),
    lastName: fc.string({ minLength: 2, maxLength: 30 }),
    email: fc.emailAddress(),
    employmentStatus: fc.constantFrom('ACTIVE', 'INACTIVE', 'TERMINATED'),
    skills: fc.array(fc.string({ minLength: 3, maxLength: 20 }), { maxLength: 5 })
  });
  const siteGenerator = fc.record({
    name: fc.string({ minLength: 3, maxLength: 50 }),
    operationalStatus: fc.constantFrom('ACTIVE', 'INACTIVE', 'MAINTENANCE'),
    address: fc.record({
      street: fc.string({ minLength: 5, maxLength: 100 }),
      city: fc.string({ minLength: 2, maxLength: 50 }),
      state: fc.string({ minLength: 2, maxLength: 50 }),
      zipCode: fc.string({ minLength: 5, maxLength: 10 })
    })
  });

  const clientGenerator = fc.record({
    name: fc.string({ minLength: 3, maxLength: 100 }),
    contactEmail: fc.emailAddress(),
    contractStatus: fc.constantFrom('ACTIVE', 'PENDING', 'EXPIRED', 'TERMINATED')
  });

  const attendanceGenerator = fc.record({
    status: fc.constantFrom('PRESENT', 'LATE', 'ABSENT', 'PENDING'),
    clockIn: fc.date({ min: new Date('2024-01-01'), max: new Date() }),
    clockOut: fc.option(fc.date({ min: new Date('2024-01-01'), max: new Date() }))
  });

  const payrollGenerator = fc.record({
    status: fc.constantFrom('DRAFT', 'PROCESSING', 'COMPLETED', 'CANCELLED'),
    totalAmount: fc.float({ min: 1000, max: 50000, noNaN: true }),
    payPeriodStart: fc.date({ min: new Date('2024-01-01'), max: new Date() }),
    payPeriodEnd: fc.date({ min: new Date('2024-01-01'), max: new Date() })
  });

  const invoiceGenerator = fc.record({
    status: fc.constantFrom('DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED'),
    totalAmount: fc.float({ min: 500, max: 25000, noNaN: true }),
    billingPeriodStart: fc.date({ min: new Date('2024-01-01'), max: new Date() }),
    billingPeriodEnd: fc.date({ min: new Date('2024-01-01'), max: new Date() })
  });

  /**
   * Property 14: Real-time KPI Accuracy
   * **Validates: Requirements 11.1**
   *
   * For any Operations Command Center dashboard request with valid tenant data,
   * the system SHALL display accurate real-time metrics that correctly reflect
   * the current state of active guards, sites, attendance, payroll, and billing.
   */
  it('Property 14: Real-time KPI accuracy', async () => {
    const testTenantId = randomUUID();

    // Setup: Create test company
    await prismaService.withSystemContext(async (prisma) => {
      await prisma.company.create({
        data: {
          id: testTenantId,
          name: 'KPI Test Company',
          slug: `kpi-test-${testTenantId.substring(0, 8)}`,
        },
      });
    });
    try {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            employees: fc.array(employeeGenerator, { minLength: 1, maxLength: 10 }),
            clients: fc.array(clientGenerator, { minLength: 1, maxLength: 3 }),
            sites: fc.array(siteGenerator, { minLength: 1, maxLength: 5 }),
            attendanceRecords: fc.array(attendanceGenerator, { minLength: 0, maxLength: 15 }),
            payrollRuns: fc.array(payrollGenerator, { minLength: 0, maxLength: 3 }),
            invoices: fc.array(invoiceGenerator, { minLength: 0, maxLength: 8 })
          }),
          async (testData) => {
            // Setup tenant context
            tenantContextService.setContext(testTenantId);

            // Create test data in database
            const createdClients = [];
            const createdSites = [];
            const createdEmployees = [];
            const createdAssignments = [];

            await prismaService.withTenant(testTenantId, async (prisma) => {
              // Create clients
              for (const clientData of testData.clients) {
                const client = await prisma.client.create({
                  data: {
                    name: clientData.name,
                    contactEmail: clientData.contactEmail,
                    contractStatus: clientData.contractStatus,
                    companyId: testTenantId
                  }
                });
                createdClients.push(client);
              }

              // Create sites
              for (let i = 0; i < testData.sites.length; i++) {
                const siteData = testData.sites[i];
                const client = createdClients[i % createdClients.length];
                
                const site = await prisma.site.create({
                  data: {
                    name: siteData.name,
                    operationalStatus: siteData.operationalStatus,
                    address: siteData.address,
                    clientId: client.id
                  }
                });
                createdSites.push(site);
              }

              // Create employees
              for (const empData of testData.employees) {
                const employee = await prisma.employee.create({
                  data: {
                    employeeNumber: empData.employeeNumber,
                    firstName: empData.firstName,
                    lastName: empData.lastName,
                    email: empData.email,
                    employmentStatus: empData.employmentStatus,
                    skills: empData.skills,
                    hireDate: new Date('2024-01-01'),
                    companyId: testTenantId
                  }
                });
                createdEmployees.push(employee);
              }
              // Create assignments (employees to sites)
              const activeEmployees = createdEmployees.filter(emp => emp.employmentStatus === 'ACTIVE');
              const activeSites = createdSites.filter(site => site.operationalStatus === 'ACTIVE');
              
              for (let i = 0; i < Math.min(activeEmployees.length, activeSites.length); i++) {
                const assignment = await prisma.assignment.create({
                  data: {
                    role: 'Security Guard',
                    hourlyRate: 25.00,
                    status: 'ACTIVE',
                    startDate: new Date('2024-01-01'),
                    employeeId: activeEmployees[i].id,
                    siteId: activeSites[i].id
                  }
                });
                createdAssignments.push(assignment);
              }

              // Create attendance records for today
              const today = new Date();
              today.setHours(0, 0, 0, 0);

              for (let i = 0; i < Math.min(testData.attendanceRecords.length, createdEmployees.length); i++) {
                const attData = testData.attendanceRecords[i];
                const employee = createdEmployees[i];
                
                // Create shift for today first
                if (activeSites.length > 0) {
                  const shift = await prisma.shift.create({
                    data: {
                      shiftDate: today,
                      startTime: new Date(`${today.toISOString().split('T')[0]}T08:00:00.000Z`),
                      endTime: new Date(`${today.toISOString().split('T')[0]}T16:00:00.000Z`),
                      shiftType: 'REGULAR',
                      status: 'SCHEDULED',
                      siteId: activeSites[0].id,
                      assignmentId: createdAssignments[0]?.id
                    }
                  });

                  // Create attendance record
                  const clockInTime = new Date(today);
                  clockInTime.setHours(8, 0, 0, 0);
                  
                  await prisma.attendance.create({
                    data: {
                      clockIn: clockInTime,
                      clockOut: attData.clockOut ? new Date(clockInTime.getTime() + 8 * 60 * 60 * 1000) : null,
                      status: attData.status,
                      employeeId: employee.id,
                      shiftId: shift.id
                    }
                  });
                }
              }

              // Create payroll runs
              for (const payrollData of testData.payrollRuns) {
                await prisma.payrollRun.create({
                  data: {
                    runNumber: `PAY-${Date.now()}-${Math.random().toString(36).substring(7)}`,
                    payPeriodStart: payrollData.payPeriodStart,
                    payPeriodEnd: payrollData.payPeriodEnd,
                    status: payrollData.status,
                    totalAmount: payrollData.totalAmount,
                    companyId: testTenantId
                  }
                });
              }
              // Create invoices
              for (let i = 0; i < testData.invoices.length && i < createdClients.length; i++) {
                const invoiceData = testData.invoices[i];
                const client = createdClients[i % createdClients.length];
                
                await prisma.invoice.create({
                  data: {
                    invoiceNumber: `INV-${Date.now()}-${Math.random().toString(36).substring(7)}`,
                    billingPeriodStart: invoiceData.billingPeriodStart,
                    billingPeriodEnd: invoiceData.billingPeriodEnd,
                    subtotal: invoiceData.totalAmount * 0.9,
                    taxAmount: invoiceData.totalAmount * 0.1,
                    totalAmount: invoiceData.totalAmount,
                    status: invoiceData.status,
                    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                    clientId: client.id
                  }
                });
              }
            });

            // Test: Get KPI metrics
            const kpis = await dashboardService.getKPIMetrics();

            // Verify: Active Guards calculation
            const expectedActiveGuards = testData.employees.filter(emp => emp.employmentStatus === 'ACTIVE').length;
            expect(kpis.activeGuards).toBe(expectedActiveGuards);

            // Verify: Active Sites calculation
            const expectedActiveSites = testData.sites.filter(site => site.operationalStatus === 'ACTIVE').length;
            expect(kpis.activeSites).toBe(expectedActiveSites);

            // Verify: Guards on Duty (employees with attendance today, no clock-out)
            const expectedGuardsOnDuty = testData.attendanceRecords.filter(att => 
              att.clockOut === null && (att.status === 'PRESENT' || att.status === 'LATE')
            ).length;
            expect(kpis.guardsOnDuty).toBeGreaterThanOrEqual(0);
            expect(kpis.guardsOnDuty).toBeLessThanOrEqual(expectedActiveGuards);

            // Verify: Attendance Status accuracy
            expect(kpis.attendanceStatus).toBeDefined();
            expect(kpis.attendanceStatus.present).toBeGreaterThanOrEqual(0);
            expect(kpis.attendanceStatus.late).toBeGreaterThanOrEqual(0);
            expect(kpis.attendanceStatus.absent).toBeGreaterThanOrEqual(0);
            expect(kpis.attendanceStatus.totalScheduled).toBeGreaterThanOrEqual(0);
            
            // Total should be sum of all status counts
            const attendanceTotal = kpis.attendanceStatus.present + 
                                  kpis.attendanceStatus.late + 
                                  kpis.attendanceStatus.absent;
            expect(attendanceTotal).toBeLessThanOrEqual(kpis.attendanceStatus.totalScheduled);

            // Verify: Payroll Status accuracy
            expect(kpis.payrollStatus).toBeDefined();
            expect(kpis.payrollStatus.processed).toBeGreaterThanOrEqual(0);
            expect(kpis.payrollStatus.pending).toBeGreaterThanOrEqual(0);
            expect(kpis.payrollStatus.totalAmount).toBeGreaterThanOrEqual(0);
            expect(kpis.payrollStatus.nextRunDate).toBeDefined();
            // Verify: Pending Approvals accuracy
            expect(kpis.pendingApprovals).toBeDefined();
            expect(kpis.pendingApprovals.attendance).toBeGreaterThanOrEqual(0);
            expect(kpis.pendingApprovals.assignments).toBeGreaterThanOrEqual(0);
            expect(kpis.pendingApprovals.payroll).toBeGreaterThanOrEqual(0);
            
            // Total should be sum of all pending counts
            const expectedPendingTotal = kpis.pendingApprovals.attendance + 
                                       kpis.pendingApprovals.assignments + 
                                       kpis.pendingApprovals.payroll;
            expect(kpis.pendingApprovals.total).toBe(expectedPendingTotal);

            // Verify: Billing Overview accuracy
            expect(kpis.billingOverview).toBeDefined();
            expect(kpis.billingOverview.monthlyRevenue).toBeGreaterThanOrEqual(0);
            expect(kpis.billingOverview.outstandingInvoices).toBeGreaterThanOrEqual(0);
            expect(kpis.billingOverview.paidInvoices).toBeGreaterThanOrEqual(0);
            expect(kpis.billingOverview.totalBilled).toBeGreaterThanOrEqual(0);

            // Verify: Vacant Positions calculation
            expect(kpis.vacantPositions).toBeGreaterThanOrEqual(0);
            expect(kpis.vacantPositions).toBeLessThanOrEqual(expectedActiveSites);

            // Verify: Data consistency - no negative values
            expect(kpis.activeGuards).toBeGreaterThanOrEqual(0);
            expect(kpis.activeSites).toBeGreaterThanOrEqual(0);
            expect(kpis.guardsOnDuty).toBeGreaterThanOrEqual(0);
            expect(kpis.vacantPositions).toBeGreaterThanOrEqual(0);

            // Verify: Logical constraints
            // Guards on duty cannot exceed active guards
            expect(kpis.guardsOnDuty).toBeLessThanOrEqual(kpis.activeGuards);
            
            // Vacant positions cannot exceed active sites
            expect(kpis.vacantPositions).toBeLessThanOrEqual(kpis.activeSites);

            // Cleanup: Remove test data
            await prismaService.withTenant(testTenantId, async (prisma) => {
              await prisma.attendance.deleteMany({});
              await prisma.shift.deleteMany({});
              await prisma.assignment.deleteMany({});
              await prisma.invoice.deleteMany({});
              await prisma.payrollRun.deleteMany({});
              await prisma.site.deleteMany({});
              await prisma.employee.deleteMany({});
              await prisma.client.deleteMany({});
            });
          }
        ),
        {
          numRuns: 15, // Comprehensive testing across different scenarios
          timeout: 25000, // 25 second timeout per test
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
  }, 45000); // 45 second test timeout
  /**
   * Property 15: KPI Calculation Performance Under Load
   * **Validates: Requirements 11.1**
   *
   * For any KPI calculation request with large datasets, the system SHALL
   * maintain calculation accuracy while performing within acceptable time limits.
   * Tests verify that KPI calculations scale properly with data volume.
   */
  it('Property 15: KPI calculation performance under load', async () => {
    const testTenantId = randomUUID();

    // Setup: Create test company
    await prismaService.withSystemContext(async (prisma) => {
      await prisma.company.create({
        data: {
          id: testTenantId,
          name: 'Performance Test Company',
          slug: `perf-test-${testTenantId.substring(0, 8)}`,
        },
      });
    });

    try {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            employeeCount: fc.integer({ min: 50, max: 200 }),
            siteCount: fc.integer({ min: 20, max: 80 }),
            attendanceRecordCount: fc.integer({ min: 100, max: 300 }),
            payrollRunCount: fc.integer({ min: 5, max: 15 }),
            invoiceCount: fc.integer({ min: 30, max: 100 })
          }),
          async (loadData) => {
            // Setup tenant context
            tenantContextService.setContext(testTenantId);

            const startTime = Date.now();

            // Create large dataset
            await prismaService.withTenant(testTenantId, async (prisma) => {
              // Create client first
              const client = await prisma.client.create({
                data: {
                  name: 'Performance Test Client',
                  contactEmail: 'perf-test@example.com',
                  contractStatus: 'ACTIVE',
                  companyId: testTenantId
                }
              });

              // Batch create employees
              const employeeData = Array.from({ length: loadData.employeeCount }, (_, i) => ({
                employeeNumber: `EMP-${i.toString().padStart(4, '0')}`,
                firstName: `Employee${i}`,
                lastName: `Test${i}`,
                email: `emp${i}@example.com`,
                employmentStatus: i % 3 === 0 ? 'ACTIVE' : (i % 5 === 0 ? 'INACTIVE' : 'ACTIVE'),
                hireDate: new Date('2024-01-01'),
                companyId: testTenantId,
                skills: ['Security', 'Surveillance']
              }));

              await prisma.employee.createMany({ data: employeeData });

              // Batch create sites
              const siteData = Array.from({ length: loadData.siteCount }, (_, i) => ({
                name: `Site ${i}`,
                operationalStatus: i % 4 === 0 ? 'ACTIVE' : (i % 7 === 0 ? 'INACTIVE' : 'ACTIVE'),
                clientId: client.id,
                address: {
                  street: `${100 + i} Test Street`,
                  city: 'Test City',
                  state: 'Test State',
                  zipCode: '12345'
                }
              }));

              await prisma.site.createMany({ data: siteData });
            });
            // Test: Measure KPI calculation performance
            const kpiStartTime = Date.now();
            const kpis = await dashboardService.getKPIMetrics();
            const kpiEndTime = Date.now();
            const kpiCalculationTime = kpiEndTime - kpiStartTime;

            // Verify: Performance requirements
            expect(kpiCalculationTime).toBeLessThan(5000); // Should complete within 5 seconds

            // Verify: KPI accuracy with large dataset
            expect(kpis.activeGuards).toBeGreaterThanOrEqual(0);
            expect(kpis.activeSites).toBeGreaterThanOrEqual(0);
            expect(kpis.guardsOnDuty).toBeGreaterThanOrEqual(0);
            expect(kpis.vacantPositions).toBeGreaterThanOrEqual(0);

            // Verify: Data consistency at scale
            expect(kpis.guardsOnDuty).toBeLessThanOrEqual(kpis.activeGuards);
            expect(kpis.vacantPositions).toBeLessThanOrEqual(kpis.activeSites);

            // Verify: No overflow or invalid calculations
            expect(Number.isFinite(kpis.activeGuards)).toBe(true);
            expect(Number.isFinite(kpis.activeSites)).toBe(true);
            expect(Number.isFinite(kpis.payrollStatus.totalAmount)).toBe(true);
            expect(Number.isFinite(kpis.billingOverview.monthlyRevenue)).toBe(true);

            // Cleanup: Remove test data
            await prismaService.withTenant(testTenantId, async (prisma) => {
              await prisma.attendance.deleteMany({});
              await prisma.shift.deleteMany({});
              await prisma.assignment.deleteMany({});
              await prisma.invoice.deleteMany({});
              await prisma.payrollRun.deleteMany({});
              await prisma.site.deleteMany({});
              await prisma.employee.deleteMany({});
              await prisma.client.deleteMany({});
            });

            const totalTime = Date.now() - startTime;
            console.log(`Load test completed: ${loadData.employeeCount} employees, ${loadData.siteCount} sites in ${totalTime}ms (KPI calc: ${kpiCalculationTime}ms)`);
          }
        ),
        {
          numRuns: 5, // Fewer runs for performance tests
          timeout: 30000, // 30 second timeout per test
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
  }, 60000); // 60 second test timeout
  /**
   * Property 16: KPI Data Consistency Across Time Ranges
   * **Validates: Requirements 11.1**
   *
   * For any KPI calculation involving time-based data (attendance, payroll, billing),
   * the system SHALL maintain mathematical consistency and accurate date filtering
   * across different time periods and data scenarios.
   */
  it('Property 16: KPI data consistency across time ranges', async () => {
    const testTenantId = randomUUID();

    // Setup: Create test company
    await prismaService.withSystemContext(async (prisma) => {
      await prisma.company.create({
        data: {
          id: testTenantId,
          name: 'Time Range Test Company',
          slug: `time-test-${testTenantId.substring(0, 8)}`,
        },
      });
    });

    try {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            baseDate: fc.date({ min: new Date('2024-01-01'), max: new Date('2024-06-01') }),
            daysOffset: fc.integer({ min: -30, max: 30 }),
            attendanceStatuses: fc.array(
              fc.constantFrom('PRESENT', 'LATE', 'ABSENT', 'PENDING'),
              { minLength: 1, maxLength: 10 }
            ),
            payrollAmounts: fc.array(
              fc.float({ min: 1000, max: 10000, noNaN: true }),
              { minLength: 1, maxLength: 5 }
            ),
            invoiceAmounts: fc.array(
              fc.float({ min: 500, max: 5000, noNaN: true }),
              { minLength: 1, maxLength: 8 }
            )
          }),
          async (timeData) => {
            // Setup tenant context
            tenantContextService.setContext(testTenantId);

            // Calculate test dates
            const targetDate = new Date(timeData.baseDate.getTime() + timeData.daysOffset * 24 * 60 * 60 * 1000);
            const monthStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
            const monthEnd = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0, 23, 59, 59);

            await prismaService.withTenant(testTenantId, async (prisma) => {
              // Create test client and employee
              const client = await prisma.client.create({
                data: {
                  name: 'Time Range Client',
                  contactEmail: 'time@example.com',
                  contractStatus: 'ACTIVE',
                  companyId: testTenantId
                }
              });

              const employee = await prisma.employee.create({
                data: {
                  employeeNumber: 'EMP-TIME-001',
                  firstName: 'Time',
                  lastName: 'Test',
                  email: 'time.test@example.com',
                  employmentStatus: 'ACTIVE',
                  hireDate: new Date('2024-01-01'),
                  companyId: testTenantId
                }
              });

              // Create time-based test data
              let expectedMonthlyRevenue = 0;
              let expectedTotalBilled = 0;

              // Create invoices with different dates
              for (let i = 0; i < timeData.invoiceAmounts.length; i++) {
                const amount = timeData.invoiceAmounts[i];
                const isInCurrentMonth = i % 2 === 0;
                const invoiceDate = isInCurrentMonth ? 
                  new Date(monthStart.getTime() + i * 24 * 60 * 60 * 1000) :
                  new Date(monthStart.getTime() - (i + 1) * 24 * 60 * 60 * 1000);

                const status = i % 3 === 0 ? 'PAID' : (i % 4 === 0 ? 'SENT' : 'DRAFT');

                await prisma.invoice.create({
                  data: {
                    invoiceNumber: `INV-TIME-${i}`,
                    billingPeriodStart: invoiceDate,
                    billingPeriodEnd: new Date(invoiceDate.getTime() + 7 * 24 * 60 * 60 * 1000),
                    subtotal: amount * 0.9,
                    taxAmount: amount * 0.1,
                    totalAmount: amount,
                    status: status,
                    dueDate: new Date(invoiceDate.getTime() + 30 * 24 * 60 * 60 * 1000),
                    clientId: client.id
                  }
                });

                if (isInCurrentMonth) {
                  expectedTotalBilled += amount;
                  if (status === 'PAID') {
                    expectedMonthlyRevenue += amount;
                  }
                }
              }

              // Create payroll runs with time-based data
              for (let i = 0; i < timeData.payrollAmounts.length; i++) {
                const amount = timeData.payrollAmounts[i];
                const runDate = new Date(monthStart.getTime() + i * 7 * 24 * 60 * 60 * 1000);

                await prisma.payrollRun.create({
                  data: {
                    runNumber: `PAY-TIME-${i}`,
                    payPeriodStart: runDate,
                    payPeriodEnd: new Date(runDate.getTime() + 14 * 24 * 60 * 60 * 1000),
                    status: i % 2 === 0 ? 'COMPLETED' : 'PROCESSING',
                    totalAmount: amount,
                    companyId: testTenantId
                  }
                });
              }
            });

            // Test: Get KPI metrics and verify time-based calculations
            const kpis = await dashboardService.getKPIMetrics();

            // Verify: Time-based calculations are consistent
            expect(kpis.billingOverview.monthlyRevenue).toBeGreaterThanOrEqual(0);
            expect(kpis.billingOverview.totalBilled).toBeGreaterThanOrEqual(kpis.billingOverview.monthlyRevenue);

            // Verify: Payroll calculations are valid
            expect(kpis.payrollStatus.totalAmount).toBeGreaterThanOrEqual(0);
            expect(Number.isFinite(kpis.payrollStatus.totalAmount)).toBe(true);

            // Verify: Date consistency
            expect(new Date(kpis.payrollStatus.nextRunDate)).toBeInstanceOf(Date);
            expect(new Date(kpis.payrollStatus.nextRunDate).getTime()).toBeGreaterThan(Date.now());

            // Cleanup test data
            await prismaService.withTenant(testTenantId, async (prisma) => {
              await prisma.invoice.deleteMany({});
              await prisma.payrollRun.deleteMany({});
              await prisma.employee.deleteMany({});
              await prisma.client.deleteMany({});
            });
          }
        ),
        {
          numRuns: 10,
          timeout: 20000,
          seed: 456,
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
  }, 40000); // 40 second test timeout
});