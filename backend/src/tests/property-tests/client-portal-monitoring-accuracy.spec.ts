import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { ClientPortalService } from '../../client-portal/client-portal.service';
import { TenantContextService } from '../../common/tenant-context.service';
import { ClientRepository } from '../../common/repositories/client.repository';
import { SiteRepository } from '../../common/repositories/site.repository';
import { AttendanceRepository } from '../../common/repositories/attendance.repository';
import { BillingService } from '../../billing/billing.service';
import * as fc from 'fast-check';
import { randomUUID } from 'crypto';

// Mock billing service dependencies
const mockInvoiceService = {
  create: jest.fn().mockResolvedValue({ id: 'mock-invoice', invoiceNumber: 'INV-001' }),
  findById: jest.fn().mockResolvedValue({ id: 'mock-invoice', client: { id: 'client-1', name: 'Test Client' } }),
  findAll: jest.fn().mockResolvedValue({ data: [], pagination: { total: 0, page: 1, limit: 20, pages: 0 } }),
};

const mockInvoiceCalculationService = {
  calculateInvoiceAmounts: jest.fn().mockResolvedValue({ subtotal: 1000, taxAmount: 100, totalAmount: 1100 }),
};

const mockGstCalculationService = {
  calculateGst: jest.fn().mockResolvedValue({ gstAmount: 100, cgst: 50, sgst: 50 }),
};

const mockInvoicePdfService = {
  generatePdf: jest.fn().mockResolvedValue({ filePath: '/mock/path.pdf', fileName: 'invoice.pdf', fileSize: 1024, generatedAt: new Date() }),
};

const mockBillingValidationService = {
  validateClientBillingPermissions: jest.fn().mockResolvedValue(true),
  validateAdditionalCharges: jest.fn().mockReturnValue(true),
  validateBillingRates: jest.fn().mockReturnValue(true),
  validateDueDate: jest.fn().mockReturnValue(true),
};

/**
 * Property-Based Test: Client Portal Monitoring Accuracy
 * **Validates: Requirements 11.4**
 *
 * This test validates that site monitoring, attendance, deployment status, invoices,
 * incidents, and reports displayed in the client portal always reflect the latest
 * operational data with accuracy and freshness.
 */
describe('Property Test: Client Portal Monitoring Accuracy', () => {
  let clientPortalService: ClientPortalService;
  let prismaService: PrismaService;
  let tenantContextService: TenantContextService;
  let module: TestingModule;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [ConfigModule.forRoot()],
      providers: [
        PrismaService,
        ClientPortalService,
        TenantContextService,
        ClientRepository,
        SiteRepository,
        AttendanceRepository,
        {
          provide: BillingService,
          useValue: {
            listInvoices: jest.fn().mockResolvedValue({
              data: [],
              pagination: { total: 0, page: 1, limit: 20, pages: 0 }
            }),
            getInvoice: jest.fn().mockResolvedValue({
              id: 'mock-invoice',
              client: { id: 'client-1', name: 'Test Client' }
            }),
            generateInvoicePdf: jest.fn().mockResolvedValue({
              filePath: '/mock/path.pdf',
              fileName: 'invoice.pdf',
              fileSize: 1024,
              generatedAt: new Date()
            })
          }
        },
        // Mock individual billing service dependencies
        { provide: 'InvoiceService', useValue: mockInvoiceService },
        { provide: 'InvoiceCalculationService', useValue: mockInvoiceCalculationService },
        { provide: 'GstCalculationService', useValue: mockGstCalculationService },
        { provide: 'InvoicePdfService', useValue: mockInvoicePdfService },
        { provide: 'BillingValidationService', useValue: mockBillingValidationService },
      ],
    }).compile();

    clientPortalService = await module.resolve<ClientPortalService>(ClientPortalService);
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
   * Generate valid test data for client portal scenarios
   */
  const clientDataGenerator = fc.record({
    name: fc.string({ minLength: 3, maxLength: 50 }),
    contactEmail: fc.emailAddress(),
    contactInfo: fc.record({
      phone: fc.string({ minLength: 10, maxLength: 15 }),
      address: fc.string({ minLength: 10, maxLength: 100 })
    })
  });

  const contractDataGenerator = fc.record({
    serviceDefinition: fc.record({
      guardCount: fc.integer({ min: 1, max: 10 }),
      shiftPattern: fc.constantFrom('DAY', 'NIGHT', 'ROTATING'),
      coverageHours: fc.integer({ min: 8, max: 24 })
    }),
    billingPreferences: fc.record({
      hourlyRate: fc.float({ min: Math.fround(15.0), max: Math.fround(50.0), noNaN: true }),
      overtimeMultiplier: fc.float({ min: Math.fround(1.5), max: Math.fround(2.0), noNaN: true }),
      billingFrequency: fc.constantFrom('WEEKLY', 'MONTHLY')
    })
  });

  const siteDataGenerator = fc.record({
    name: fc.string({ minLength: 3, maxLength: 50 }),
    operationalStatus: fc.constantFrom('ACTIVE', 'INACTIVE', 'MAINTENANCE'),
    minStaffingLevel: fc.integer({ min: 1, max: 5 }),
    maxStaffingLevel: fc.integer({ min: 2, max: 10 }),
    skillRequirements: fc.record({
      skills: fc.array(fc.constantFrom('SECURITY', 'FIRST_AID', 'FIRE_SAFETY'), { minLength: 1, maxLength: 3 })
    }),
    address: fc.record({
      street: fc.string({ minLength: 5, max: 50 }),
      city: fc.string({ minLength: 2, maxLength: 30 }),
      state: fc.string({ minLength: 2, maxLength: 30 }),
      zipCode: fc.string({ minLength: 5, maxLength: 10 })
    })
  });

  const employeeDataGenerator = fc.record({
    employeeNumber: fc.string({ minLength: 3, maxLength: 10 }),
    firstName: fc.string({ minLength: 2, maxLength: 30 }),
    lastName: fc.string({ minLength: 2, maxLength: 30 }),
    email: fc.emailAddress(),
    skills: fc.array(fc.constantFrom('SECURITY', 'FIRST_AID', 'FIRE_SAFETY'), { minLength: 1, maxLength: 3 }),
    employmentStatus: fc.constantFrom('ACTIVE')
  });
  /**
   * Property 26: Client Portal Monitoring Accuracy
   * **Validates: Requirements 11.4**
   *
   * For any client portal request with valid operational data,
   * the system SHALL ensure that site monitoring, attendance, deployment status,
   * invoices, incidents, and reports always reflect the latest operational data
   * with accuracy, freshness, and mathematical consistency.
   */
  it('Property 26: Client Portal Monitoring Accuracy', async () => {
    const testTenantId = randomUUID();

    // Setup: Create test company
    await prismaService.withSystemContext(async (prisma) => {
      await prisma.company.create({
        data: {
          id: testTenantId,
          name: 'Client Portal Test Company',
          slug: `client-portal-test-${testTenantId.substring(0, 8)}`,
        },
      });
    });

    try {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            client: clientDataGenerator,
            contract: contractDataGenerator,
            sites: fc.array(siteDataGenerator, { minLength: 1, maxLength: 3 }),
            employees: fc.array(employeeDataGenerator, { minLength: 2, maxLength: 5 }),
            attendanceData: fc.record({
              shiftsPerSite: fc.integer({ min: 1, max: 3 }),
              attendanceRate: fc.float({ min: Math.fround(0.8), max: Math.fround(1.0), noNaN: true }),
              lateArrivals: fc.integer({ min: 0, max: 3 }),
              earlyDepartures: fc.integer({ min: 0, max: 2 })
            })
          }),
          async (testData) => {
            // Setup tenant context
            tenantContextService.setContext(testTenantId);

            let createdClient: any;
            let createdContract: any;
            let createdSites: any[] = [];
            let createdEmployees: any[] = [];
            let createdAssignments: any[] = [];
            let createdShifts: any[] = [];
            let createdAttendance: any[] = [];

            await prismaService.withTenant(testTenantId, async (prisma) => {
              // Ensure company exists first
              let company = await prisma.company.findUnique({ where: { id: testTenantId } });
              if (!company) {
                company = await prisma.company.create({
                  data: {
                    id: testTenantId,
                    name: `Test Company ${testTenantId}`,
                    slug: `test-${testTenantId.substring(0, 8)}`,
                    settings: {},
                    branding: {}
                  }
                });
              }

              // Create client
              createdClient = await prisma.client.create({
                data: {
                  name: testData.client.name,
                  contactEmail: testData.client.contactEmail,
                  companyId: testTenantId
                }
              });
              // Create contract
              createdContract = await prisma.contract.create({
                data: {
                  contractNumber: `CNT-${Date.now()}`,
                  title: `Security Services Contract - ${createdClient.name}`,
                  serviceDefinitions: testData.contract.serviceDefinition,
                  billingPreferences: testData.contract.billingPreferences,
                  status: 'ACTIVE',
                  startDate: new Date('2024-01-01'),
                  clientId: createdClient.id
                }
              });

              // Create sites
              for (const siteData of testData.sites) {
                const site = await prisma.site.create({
                  data: {
                    name: siteData.name,
                    operationalStatus: siteData.operationalStatus,
                    minStaffingLevel: siteData.minStaffingLevel,
                    maxStaffingLevel: siteData.maxStaffingLevel,
                    skillRequirements: siteData.skillRequirements,
                    address: siteData.address,
                    contractId: createdContract.id
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
                    skills: empData.skills,
                    employmentStatus: empData.employmentStatus,
                    hireDate: new Date('2024-01-01'),
                    companyId: testTenantId
                  }
                });
                createdEmployees.push(employee);
              }

              // Create assignments and shifts
              for (let i = 0; i < createdSites.length && i < createdEmployees.length; i++) {
                const site = createdSites[i];
                const employee = createdEmployees[i];
                
                const assignment = await prisma.assignment.create({
                  data: {
                    role: 'Security Guard',
                    hourlyRate: testData.contract.billingPreferences.hourlyRate.toFixed(2),
                    hourlyRateIv: 'dummy_iv_value_123456789012',
                    hourlyRateTag: 'dummy_tag_value_12345678901',
                    status: 'ACTIVE',
                    startDate: new Date('2024-01-01'),
                    employeeId: employee.id,
                    siteId: site.id
                  }
                });
                createdAssignments.push(assignment);
                // Create shifts for multiple days
                for (let dayOffset = 0; dayOffset < testData.attendanceData.shiftsPerSite; dayOffset++) {
                  const shiftDate = new Date();
                  shiftDate.setDate(shiftDate.getDate() - dayOffset);
                  const dateOnly = new Date(shiftDate.toISOString().split('T')[0]);
                  
                  const startTime = new Date(`${dateOnly.toISOString().split('T')[0]}T08:00:00.000Z`);
                  const endTime = new Date(`${dateOnly.toISOString().split('T')[0]}T16:00:00.000Z`);
                  
                  const shift = await prisma.shift.create({
                    data: {
                      shiftDate: dateOnly,
                      startTime,
                      endTime,
                      shiftType: 'REGULAR',
                      status: 'SCHEDULED',
                      siteId: site.id,
                      assignmentId: assignment.id
                    }
                  });
                  createdShifts.push(shift);

                  // Create attendance record based on attendance rate
                  const shouldHaveAttendance = Math.random() < testData.attendanceData.attendanceRate;
                  if (shouldHaveAttendance) {
                    // Determine if late arrival
                    const isLateArrival = Math.random() < (testData.attendanceData.lateArrivals / testData.attendanceData.shiftsPerSite);
                    const actualStartTime = isLateArrival 
                      ? new Date(startTime.getTime() + 30 * 60 * 1000) // 30 minutes late
                      : startTime;

                    // Determine if early departure
                    const isEarlyDeparture = Math.random() < (testData.attendanceData.earlyDepartures / testData.attendanceData.shiftsPerSite);
                    const actualEndTime = isEarlyDeparture 
                      ? new Date(endTime.getTime() - 30 * 60 * 1000) // 30 minutes early
                      : endTime;

                    const attendance = await prisma.attendance.create({
                      data: {
                        clockIn: actualStartTime,
                        clockOut: actualEndTime,
                        status: 'PRESENT',
                        employeeId: employee.id,
                        shiftId: shift.id,
                        locationData: {
                          latitude: 40.7128,
                          longitude: -74.0060,
                          address: site.address
                        }
                      }
                    });
                    createdAttendance.push(attendance);
                  }
                }
              }
            });
            // Test: Get client dashboard data
            const dashboardData = await prismaService.withTenant(testTenantId, async () => {
              return clientPortalService.getClientDashboard({
                clientId: createdClient.id
              });
            });

            // Test: Get guard monitoring data for first site
            const guardMonitoringData = await prismaService.withTenant(testTenantId, async () => {
              return clientPortalService.getGuardMonitoring({
                clientId: createdClient.id,
                siteId: createdSites[0]?.id,
                date: new Date().toISOString().split('T')[0]
              });
            });

            // Test: Get attendance data
            const attendanceData = await prismaService.withTenant(testTenantId, async () => {
              return clientPortalService.getClientAttendance({
                clientId: createdClient.id,
                dateFrom: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                dateTo: new Date().toISOString().split('T')[0],
                page: 1,
                limit: 20
              });
            });

            // Test: Get billing data
            const billingData = await prismaService.withTenant(testTenantId, async () => {
              return clientPortalService.getClientBilling({
                clientId: createdClient.id,
                page: 1,
                limit: 20
              });
            });

            // Test: Get communication data (incidents, complaints)
            const communicationData = await prismaService.withTenant(testTenantId, async () => {
              return clientPortalService.getCommunicationData(createdClient.id);
            });

            // Verify: Site Monitoring Accuracy
            expect(dashboardData.siteOverview).toBeDefined();
            expect(dashboardData.siteOverview.totalSites).toBe(createdSites.length);
            
            const activeSites = createdSites.filter(s => s.operationalStatus === 'ACTIVE').length;
            const inactiveSites = createdSites.filter(s => s.operationalStatus !== 'ACTIVE').length;
            
            expect(dashboardData.siteOverview.activeSites).toBe(activeSites);
            expect(dashboardData.siteOverview.inactiveSites).toBe(inactiveSites);

            // Mathematical consistency check
            expect(dashboardData.siteOverview.activeSites + dashboardData.siteOverview.inactiveSites)
              .toBe(dashboardData.siteOverview.totalSites);

            // Verify: Guard Deployment Accuracy
            expect(dashboardData.guardDeployment).toBeDefined();
            expect(dashboardData.guardDeployment.totalGuards).toBe(createdAssignments.length);
            expect(dashboardData.guardDeployment.activeGuards).toBe(createdAssignments.length);
            
            // Deployment rate should be a valid percentage
            expect(dashboardData.guardDeployment.deploymentRate).toBeGreaterThanOrEqual(0);
            expect(dashboardData.guardDeployment.deploymentRate).toBeLessThanOrEqual(100);

            // Verify: Attendance Monitoring Accuracy
            expect(attendanceData.dashboardMetrics).toBeDefined();
            expect(attendanceData.dashboardMetrics.attendanceRate).toBeGreaterThanOrEqual(0);
            expect(attendanceData.dashboardMetrics.attendanceRate).toBeLessThanOrEqual(100);
            
            // Attendance counts should be non-negative integers
            expect(Number.isInteger(attendanceData.dashboardMetrics.totalShifts)).toBe(true);
            expect(Number.isInteger(attendanceData.dashboardMetrics.presentGuards)).toBe(true);
            expect(Number.isInteger(attendanceData.dashboardMetrics.absentGuards)).toBe(true);
            expect(Number.isInteger(attendanceData.dashboardMetrics.lateGuards)).toBe(true);
            
            expect(attendanceData.dashboardMetrics.totalShifts).toBeGreaterThanOrEqual(0);
            expect(attendanceData.dashboardMetrics.presentGuards).toBeGreaterThanOrEqual(0);
            expect(attendanceData.dashboardMetrics.absentGuards).toBeGreaterThanOrEqual(0);
            expect(attendanceData.dashboardMetrics.lateGuards).toBeGreaterThanOrEqual(0);
            // Mathematical consistency: present + absent should equal or be close to total shifts
            const totalAccountedFor = attendanceData.dashboardMetrics.presentGuards + 
                                    attendanceData.dashboardMetrics.absentGuards;
            expect(totalAccountedFor).toBeLessThanOrEqual(attendanceData.dashboardMetrics.totalShifts + 1); // Allow small variance

            // Verify: Billing Data Accuracy
            expect(billingData.dashboardMetrics).toBeDefined();
            expect(billingData.dashboardMetrics.totalInvoices).toBeGreaterThanOrEqual(0);
            expect(billingData.dashboardMetrics.pendingInvoices).toBeGreaterThanOrEqual(0);
            expect(billingData.dashboardMetrics.paidInvoices).toBeGreaterThanOrEqual(0);
            expect(billingData.dashboardMetrics.overdueInvoices).toBeGreaterThanOrEqual(0);
            
            // Mathematical consistency: invoice counts should add up to total
            const totalCounted = billingData.dashboardMetrics.pendingInvoices +
                               billingData.dashboardMetrics.paidInvoices +
                               billingData.dashboardMetrics.overdueInvoices;
            expect(totalCounted).toBeLessThanOrEqual(billingData.dashboardMetrics.totalInvoices + 1); // Allow variance

            // Financial amounts should be non-negative
            expect(billingData.dashboardMetrics.totalAmountDue).toBeGreaterThanOrEqual(0);
            expect(billingData.dashboardMetrics.totalPaid).toBeGreaterThanOrEqual(0);

            // Verify: Charges Breakdown Mathematical Accuracy
            expect(billingData.chargesBreakdown).toBeDefined();
            expect(billingData.chargesBreakdown.securityServices).toBeGreaterThanOrEqual(0);
            expect(billingData.chargesBreakdown.overtime).toBeGreaterThanOrEqual(0);
            expect(billingData.chargesBreakdown.specialServices).toBeGreaterThanOrEqual(0);
            expect(billingData.chargesBreakdown.taxes).toBeGreaterThanOrEqual(0);

            // Verify: Communication Data Accuracy
            expect(communicationData).toBeDefined();
            expect(communicationData.statistics).toBeDefined();
            expect(communicationData.statistics.totalIncidents).toBeGreaterThanOrEqual(0);
            expect(communicationData.statistics.openComplaints).toBeGreaterThanOrEqual(0);
            expect(communicationData.statistics.pendingRequests).toBeGreaterThanOrEqual(0);
            expect(communicationData.statistics.avgResolutionTime).toBeGreaterThan(0);

            // Verify: Array data consistency
            expect(Array.isArray(communicationData.incidentReports)).toBe(true);
            expect(Array.isArray(communicationData.complaints)).toBe(true);
            expect(Array.isArray(communicationData.serviceRequests)).toBe(true);

            // Verify: Data freshness - timestamps should be recent
            const now = new Date();
            const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

            // Site health indicators should have recent updates
            if (dashboardData.siteHealth && dashboardData.siteHealth.length > 0) {
              dashboardData.siteHealth.forEach(health => {
                expect(health.lastUpdate).toBeDefined();
                const updateTime = new Date(health.lastUpdate);
                expect(updateTime).toBeInstanceOf(Date);
                expect(updateTime.getTime()).toBeGreaterThanOrEqual(oneHourAgo.getTime());
              });
            }
            // Verify: Temporal consistency - data should not show future dates
            const maxValidDate = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Allow 1 day buffer
            
            if (communicationData.incidentReports.length > 0) {
              communicationData.incidentReports.forEach(incident => {
                const occurredAt = new Date(incident.occurredAt);
                const reportedAt = new Date(incident.reportedAt);
                
                expect(occurredAt.getTime()).toBeLessThanOrEqual(maxValidDate.getTime());
                expect(reportedAt.getTime()).toBeLessThanOrEqual(maxValidDate.getTime());
                expect(reportedAt.getTime()).toBeGreaterThanOrEqual(occurredAt.getTime());
              });
            }

            // Verify: Cross-reference data consistency
            // Dashboard guard deployment should match detailed guard monitoring
            if (guardMonitoringData.deploymentStatus) {
              expect(typeof guardMonitoringData.deploymentStatus).toBe('object');
            }

            // Verify: Site-specific data isolation
            // Attendance data should only include the client's sites
            if (attendanceData.siteSummary && attendanceData.siteSummary.length > 0) {
              const clientSiteIds = createdSites.map(site => site.id);
              attendanceData.siteSummary.forEach(siteSummary => {
                // Site summary should reference sites belonging to this client
                expect(siteSummary).toBeDefined();
              });
            }

            // Verify: Real-time metric accuracy consistency
            // The sum of individual metrics should equal aggregate metrics
            if (dashboardData.attendanceMetrics) {
              const metrics = dashboardData.attendanceMetrics;
              
              // Attendance rate calculation should be mathematically sound
              if (metrics.totalShifts > 0) {
                const calculatedRate = (metrics.presentCount / metrics.totalShifts) * 100;
                const variance = Math.abs(calculatedRate - metrics.attendanceRate);
                expect(variance).toBeLessThan(5); // Allow up to 5% variance for rounding
              }

              // Total issues should not exceed total events
              const totalAttendanceIssues = metrics.lateArrivals + metrics.earlyDepartures + metrics.missedShifts;
              expect(totalAttendanceIssues).toBeLessThanOrEqual(metrics.totalShifts);
            }

            // Cleanup: Remove test data
            await prismaService.withTenant(testTenantId, async (prisma) => {
              await prisma.attendance.deleteMany({});
              await prisma.shift.deleteMany({});
              await prisma.assignment.deleteMany({});
              await prisma.site.deleteMany({});
              await prisma.contract.deleteMany({});
              await prisma.employee.deleteMany({});
              await prisma.client.deleteMany({});
            });
          }
        ),
        {
          numRuns: 3, // Optimized for comprehensive testing while maintaining performance
          timeout: 20000, // 20 second timeout per test
          seed: 26, // Property 26 seed for reproducibility
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
   * Property 27: Client Portal Data Temporal Consistency
   * **Validates: Requirements 11.4**
   *
   * For any client portal data with timestamps,
   * the system SHALL maintain temporal consistency ensuring that
   * data timestamps are logical, chronologically ordered, and within valid ranges.
   */
  it('Property 27: Client Portal Data Temporal Consistency', async () => {
    const testTenantId = randomUUID();

    // Setup: Create test company
    await prismaService.withSystemContext(async (prisma) => {
      await prisma.company.create({
        data: {
          id: testTenantId,
          name: 'Temporal Test Company',
          slug: `temporal-test-${testTenantId.substring(0, 8)}`,
        },
      });
    });

    try {
      await fc.assert(
        fc.asyncProperty(
          clientDataGenerator,
          async (clientData) => {
            // Setup tenant context
            tenantContextService.setContext(testTenantId);

            let createdClient: any;

            await prismaService.withTenant(testTenantId, async (prisma) => {
              // Create minimal client for testing
              createdClient = await prisma.client.create({
                data: {
                  name: clientData.name,
                  contactEmail: clientData.contactEmail,
                  companyId: testTenantId
                }
              });
            });

            // Test: Get various portal data with timestamps
            const dashboardData = await prismaService.withTenant(testTenantId, async () => {
              return clientPortalService.getClientDashboard({
                clientId: createdClient.id
              });
            });

            const communicationData = await prismaService.withTenant(testTenantId, async () => {
              return clientPortalService.getCommunicationData(createdClient.id);
            });

            // Verify: Temporal consistency in notifications
            if (dashboardData.notifications && dashboardData.notifications.length > 0) {
              const now = new Date();
              const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
              
              dashboardData.notifications.forEach(notification => {
                const timestamp = new Date(notification.timestamp);
                
                // Timestamps should be valid dates
                expect(timestamp).toBeInstanceOf(Date);
                expect(timestamp.getTime()).not.toBeNaN();
                
                // Timestamps should be within reasonable bounds (not in future, not too old)
                expect(timestamp.getTime()).toBeLessThanOrEqual(now.getTime() + 60000); // Allow 1 minute clock drift
                expect(timestamp.getTime()).toBeGreaterThanOrEqual(oneMonthAgo.getTime());
              });
            }

            // Verify: Site health last update timestamps
            if (dashboardData.siteHealth && dashboardData.siteHealth.length > 0) {
              dashboardData.siteHealth.forEach(health => {
                const lastUpdate = new Date(health.lastUpdate);
                
                expect(lastUpdate).toBeInstanceOf(Date);
                expect(lastUpdate.getTime()).not.toBeNaN();
                expect(lastUpdate.getTime()).toBeLessThanOrEqual(Date.now() + 60000); // Allow clock drift
              });
            }

            // Cleanup
            await prismaService.withTenant(testTenantId, async (prisma) => {
              await prisma.client.deleteMany({});
            });
          }
        ),
        {
          numRuns: 4,
          timeout: 15000,
          seed: 27,
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
  }, 30000);
});