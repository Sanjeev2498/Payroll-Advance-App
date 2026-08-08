import { Test, TestingModule } from '@nestjs/testing';
import { ClientPortalController } from './client-portal.controller';
import { ClientPortalService } from './client-portal.service';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from '../common/tenant-context.service';
import { ClientRepository } from '../common/repositories/client.repository';
import { SiteRepository } from '../common/repositories/site.repository';
import { AttendanceRepository } from '../common/repositories/attendance.repository';
import { BillingService } from '../billing/billing.service';
import { RbacService } from '../auth/rbac/rbac.service';
import { Reflector } from '@nestjs/core';
import { 
  GuardStatus, 
  SiteCoverageStatus, 
  AttendanceStatus, 
  AttendanceAnomalyType,
  InvoiceStatus,
  PaymentStatus,
  IncidentType,
  IncidentSeverity,
  IncidentStatus,
  ComplaintType,
  ComplaintStatus,
  RequestType,
  RequestUrgency
} from './dto';

describe('ClientPortalController', () => {
  let controller: ClientPortalController;
  let service: ClientPortalService;

  // Mock client ID for testing
  const mockClientId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClientPortalController],
      providers: [
        {
          provide: ClientPortalService,
          useValue: {
            getClientDashboard: jest.fn(),
            getGuardMonitoring: jest.fn(),
            requestGuardReplacement: jest.fn(),
            getClientAttendance: jest.fn(),
            getAttendanceTrends: jest.fn(),
            getClientBilling: jest.fn(),
            downloadInvoice: jest.fn(),
            getClientReports: jest.fn(),
            downloadReport: jest.fn(),
            getCommunicationData: jest.fn(),
            submitComplaint: jest.fn(),
            submitServiceRequest: jest.fn(),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            client: { findUnique: jest.fn() },
            site: { findMany: jest.fn() },
            assignment: { findMany: jest.fn() },
            attendance: { findMany: jest.fn() },
          },
        },
        {
          provide: TenantContextService,
          useValue: {
            getTenantId: jest.fn().mockReturnValue('tenant-123'),
          },
        },
        {
          provide: ClientRepository,
          useValue: {
            findById: jest.fn(),
          },
        },
        {
          provide: SiteRepository,
          useValue: {
            findByClient: jest.fn(),
          },
        },
        {
          provide: AttendanceRepository,
          useValue: {
            getStats: jest.fn(),
            detectAnomalies: jest.fn(),
          },
        },
        {
          provide: BillingService,
          useValue: {
            listInvoices: jest.fn(),
            getInvoice: jest.fn(),
            generateInvoicePdf: jest.fn(),
          },
        },
        {
          provide: RbacService,
          useValue: {
            hasPermission: jest.fn().mockReturnValue(true),
            getUserRoles: jest.fn().mockReturnValue(['client_admin']),
            validateAccess: jest.fn().mockReturnValue(true),
          },
        },
        {
          provide: Reflector,
          useValue: {
            get: jest.fn(),
            getAll: jest.fn(),
            getAllAndOverride: jest.fn(),
            getAllAndMerge: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<ClientPortalController>(ClientPortalController);
    service = module.get<ClientPortalService>(ClientPortalService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
    expect(service).toBeDefined();
  });

  describe('Client Dashboard', () => {
    it('should provide operational overview', async () => {
      const mockDashboardData = {
        siteOverview: {
          totalSites: 5,
          activeSites: 4,
          inactiveSites: 1,
          sitesWithIssues: 1,
        },
        guardDeployment: {
          totalGuards: 20,
          activeGuards: 18,
          onDutyGuards: 15,
          vacantPositions: 2,
        },
        attendanceMetrics: {
          attendanceRate: 94.5,
          lateArrivals: 2,
          earlyDepartures: 1,
          missedShifts: 1,
        },
        recentIncidents: [],
        notifications: [
          {
            id: 'notif-1',
            type: 'STAFFING_SHORTAGE',
            message: '2 vacant positions require immediate attention',
            priority: 'HIGH' as const,
            timestamp: new Date().toISOString(),
            actionRequired: true,
          }
        ],
        siteHealth: [
          {
            siteId: 'site-1',
            siteName: 'Main Office',
            healthScore: 85,
            status: 'GOOD' as const,
            lastUpdate: new Date().toISOString(),
            issues: ['Staffing shortage'],
          }
        ],
      };

      jest.spyOn(service, 'getClientDashboard').mockResolvedValue(mockDashboardData);

      const result = await controller.getDashboard({ clientId: mockClientId });

      expect(result).toEqual(mockDashboardData);
      expect(result.siteOverview.totalSites).toBe(5);
      expect(result.guardDeployment.vacantPositions).toBe(2);
      expect(result.attendanceMetrics.attendanceRate).toBe(94.5);
      expect(result.notifications).toHaveLength(1);
      expect(result.siteHealth).toHaveLength(1);
    });

    it('should show site health indicators', async () => {
      const mockDashboard = {
        siteHealth: [
          {
            siteId: 'site-1',
            siteName: 'Main Office',
            healthScore: 92,
            status: 'EXCELLENT' as const,
            lastUpdate: new Date().toISOString(),
            issues: [],
          },
          {
            siteId: 'site-2',
            siteName: 'Warehouse A',
            healthScore: 75,
            status: 'FAIR' as const,
            lastUpdate: new Date().toISOString(),
            issues: ['Late arrivals', 'Equipment maintenance'],
          }
        ]
      };

      jest.spyOn(service, 'getClientDashboard').mockResolvedValue(mockDashboard as any);

      const result = await controller.getDashboard({ clientId: mockClientId });

      expect(result.siteHealth).toHaveLength(2);
      expect(result.siteHealth[0].healthScore).toBe(92);
      expect(result.siteHealth[1].issues).toContain('Late arrivals');
    });
  });

  describe('Guard Monitoring', () => {
    it('should show deployed guards by site and shift', async () => {
      const mockGuardMonitoring = {
        deploymentStatus: [
          {
            siteId: 'site-1',
            siteName: 'Main Office',
            requiredGuards: 4,
            assignedGuards: 4,
            onDutyGuards: 3,
            coverageStatus: SiteCoverageStatus.PARTIALLY_COVERED,
            guards: [
              {
                guardId: 'emp-1',
                guardName: 'John Doe',
                status: GuardStatus.ON_DUTY,
                shiftStart: '08:00',
                shiftEnd: '20:00',
                lastCheckIn: new Date().toISOString(),
                contactNumber: '+91 9876543210',
              }
            ],
          }
        ],
        guardPerformance: [],
        coverageVisualization: {
          totalSites: 2,
          fullyCovered: 1,
          partiallyCovered: 1,
          uncovered: 0,
          overStaffed: 0,
        },
      };

      jest.spyOn(service, 'getGuardMonitoring').mockResolvedValue(mockGuardMonitoring);

      const result = await controller.getGuardMonitoring({ clientId: mockClientId });

      expect(result.deploymentStatus).toHaveLength(1);
      expect(result.deploymentStatus[0].guards[0].guardName).toBe('John Doe');
      expect(result.deploymentStatus[0].guards[0].status).toBe(GuardStatus.ON_DUTY);
      expect(result.coverageVisualization.partiallyCovered).toBe(1);
    });

    it('should support guard replacement requests', async () => {
      const mockReplacementRequest = {
        id: 'req-123',
        status: 'PROCESSING',
        submittedAt: new Date().toISOString(),
        estimatedFulfillment: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
        message: 'Guard replacement request submitted. 3 suitable candidates found.',
        trackingNumber: 'GR-12345678',
        availableCandidates: 3,
        nextUpdate: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      };

      jest.spyOn(service, 'requestGuardReplacement').mockResolvedValue(mockReplacementRequest);

      const requestData = {
        siteId: 'site-1',
        currentGuardId: 'emp-1',
        reason: 'Medical emergency',
        urgency: 'EMERGENCY' as const,
        preferredStartTime: new Date().toISOString(),
        durationHours: 12,
        specialRequirements: 'Security clearance required',
      };

      const result = await controller.requestGuardReplacement(requestData, mockClientId);

      expect(result.status).toBe('PROCESSING');
      expect(result.trackingNumber).toBe('GR-12345678');
      expect(result.availableCandidates).toBe(3);
    });
  });

  describe('Attendance Monitoring', () => {
    it('should show attendance with absentee and late arrival alerts', async () => {
      const mockAttendanceData = {
        dashboardMetrics: {
          totalShifts: 20,
          presentGuards: 17,
          absentGuards: 2,
          lateGuards: 1,
          attendanceRate: 85,
        },
        attendanceRecords: [
          {
            id: 'att-1',
            guard: {
              id: 'emp-1',
              name: 'John Doe',
              employeeNumber: 'EMP001',
            },
            site: {
              id: 'site-1',
              name: 'Main Office',
              address: '123 Business St',
            },
            shift: {
              id: 'shift-1',
              date: '2024-01-15',
              startTime: '08:00',
              endTime: '20:00',
            },
            clockIn: '2024-01-15T08:15:00Z', // Late arrival
            clockOut: '2024-01-15T20:00:00Z',
            status: AttendanceStatus.LATE,
            hoursWorked: 11.75,
            overtimeHours: 0,
            gpsVerification: {
              clockInLocation: { lat: 12.9716, lng: 77.5946, accuracy: 5 },
              verified: true,
            },
            anomalies: [AttendanceAnomalyType.LATE_ARRIVAL],
          }
        ],
        anomalies: [
          {
            type: AttendanceAnomalyType.LATE_ARRIVAL,
            guardName: 'John Doe',
            siteName: 'Main Office',
            severity: 'MEDIUM' as const,
            timestamp: '2024-01-15T08:15:00Z',
            details: 'Arrived 15 minutes late',
          }
        ],
        siteSummary: [
          {
            siteId: 'site-1',
            siteName: 'Main Office',
            totalGuards: 4,
            presentGuards: 3,
            attendanceRate: 75,
            issues: 1,
          }
        ],
        pagination: {
          total: 20,
          page: 1,
          limit: 20,
          totalPages: 1,
        },
      };

      jest.spyOn(service, 'getClientAttendance').mockResolvedValue(mockAttendanceData);

      const result = await controller.getAttendance({
        clientId: mockClientId,
        page: 1,
        limit: 20,
      });

      expect(result.dashboardMetrics.absentGuards).toBe(2);
      expect(result.dashboardMetrics.lateGuards).toBe(1);
      expect(result.attendanceRecords[0].status).toBe(AttendanceStatus.LATE);
      expect(result.anomalies[0].type).toBe(AttendanceAnomalyType.LATE_ARRIVAL);
      expect(result.siteSummary[0].issues).toBe(1);
    });
  });

  describe('Billing and Invoicing', () => {
    it('should provide invoice access and download capability', async () => {
      const mockBillingData = {
        dashboardMetrics: {
          totalInvoices: 12,
          paidInvoices: 10,
          pendingInvoices: 2,
          overdueInvoices: 0,
          totalAmountDue: 20000,
          totalPaid: 105000,
        },
        invoices: [
          {
            id: 'inv-1',
            invoiceNumber: 'INV-2024-001',
            client: {
              id: mockClientId,
              name: 'Test Client Corp',
              contactEmail: 'billing@testclient.com',
              billingAddress: '123 Test Street, Test City',
            },
            billingPeriod: {
              start: '2024-01-01',
              end: '2024-01-31',
            },
            status: InvoiceStatus.PAID,
            paymentStatus: PaymentStatus.PAID,
            lineItems: [],
            subtotal: 12000,
            taxAmount: 2160,
            totalAmount: 14160,
            amountPaid: 14160,
            outstandingAmount: 0,
            invoiceDate: '2024-02-01T00:00:00Z',
            dueDate: '2024-02-15T00:00:00Z',
            paymentTerms: '15 days',
          }
        ],
        billingHistory: [
          {
            month: '2024-01',
            totalAmount: 14160,
            status: PaymentStatus.PAID,
            paymentDate: '2024-02-15',
          }
        ],
        chargesBreakdown: {
          securityServices: 10000,
          overtime: 2000,
          specialServices: 0,
          taxes: 2160,
        },
        pagination: {
          total: 12,
          page: 1,
          limit: 10,
          totalPages: 2,
        },
      };

      jest.spyOn(service, 'getClientBilling').mockResolvedValue(mockBillingData);

      const result = await controller.getBilling({
        clientId: mockClientId,
        page: 1,
        limit: 10,
      });

      expect(result.dashboardMetrics.totalInvoices).toBe(12);
      expect(result.invoices[0].status).toBe(InvoiceStatus.PAID);
      expect(typeof result.chargesBreakdown).toBe('object');
      expect(Object.keys(result.chargesBreakdown)).toContain('securityServices');
    });

    it('should support invoice PDF download', async () => {
      const mockDownloadData = {
        downloadUrl: '/path/to/invoice.pdf',
        fileName: 'INV-2024-001.pdf',
        fileSize: 245760,
        contentType: 'application/pdf',
        generatedAt: new Date().toISOString(),
      };

      jest.spyOn(service, 'downloadInvoice').mockResolvedValue(mockDownloadData);

      const result = await controller.downloadInvoice('inv-1', mockClientId);

      expect(result.fileName).toBe('INV-2024-001.pdf');
      expect(result.contentType).toBe('application/pdf');
    });
  });

  describe('Reports and Analytics', () => {
    it('should provide comprehensive reporting capabilities', async () => {
      const mockReportsData = {
        sitePerformance: [
          {
            siteId: 'site-1',
            siteName: 'Main Office',
            site: {
              id: 'site-1',
              name: 'Main Office',
              address: '123 Business St',
            },
            performanceScore: 94.5,
            attendanceMetrics: {
              averageAttendance: 94.5,
              punctualityRate: 92.3,
              completionRate: 98.8,
            },
            serviceMetrics: {
              responseTime: 4.2,
              incidentResolution: 87.5,
              clientSatisfaction: 4.2,
            },
            complianceMetrics: {
              documentCompliance: 96.8,
              trainingCompliance: 95.0,
              certificationStatus: 98.5,
            },
          }
        ],
        deploymentAnalytics: {
          deploymentEfficiency: {
            averageDeploymentTime: 1.2,
            fillRate: 87.5,
            retentionRate: 85.0,
            replacementFrequency: 2.1,
          },
          guardUtilization: [],
          staffingTrends: [],
        },
        attendanceTrends: {
          overallTrends: {
            averageAttendanceRate: 94.2,
            trendDirection: 'IMPROVING' as const,
            bestMonth: 'January',
            worstMonth: 'March',
          },
          dailyPatterns: [],
          siteComparison: [],
        },
        serviceCompliance: {
          overallCompliance: 96.8,
          slaMetrics: [
            {
              metric: 'Response Time',
              target: 15,
              actual: 12.5,
              compliance: 98.2,
            },
            {
              metric: 'Attendance Rate',
              target: 95,
              actual: 94.5,
              compliance: 96.8,
            },
          ],
        },
        reportPeriod: {
          startDate: '2024-01-01',
          endDate: '2024-01-31',
          totalDays: 31,
        },
        metadata: {
          generatedAt: new Date().toISOString(),
          generatedBy: 'client-portal',
          reportId: 'rpt-123456',
        },
      };

      jest.spyOn(service, 'getClientReports').mockResolvedValue(mockReportsData);

      const result = await controller.getReports({
        clientId: mockClientId,
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      });

      expect(result.sitePerformance).toHaveLength(1);
      expect(result.deploymentAnalytics.deploymentEfficiency.fillRate).toBe(87.5);
      expect(result.serviceCompliance.overallCompliance).toBe(96.8);
    });
  });

  describe('Communication and Incident Management', () => {
    it('should support complaint submission', async () => {
      const mockComplaintResponse = {
        id: 'comp-123',
        status: 'SUBMITTED',
        submittedAt: new Date().toISOString(),
        message: 'Your complaint has been submitted and will be reviewed within 24 hours.',
        trackingNumber: 'COMP-12345678',
        estimatedResolution: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      };

      jest.spyOn(service, 'submitComplaint').mockResolvedValue(mockComplaintResponse);

      const complaintData = {
        type: ComplaintType.SERVICE_QUALITY,
        subject: 'Guard performance issue',
        description: 'Guard was not following protocols',
        siteId: 'site-1',
        guardId: 'emp-1',
        priority: 'HIGH' as const,
        attachments: ['photo1.jpg'],
      };

      const result = await controller.submitComplaint(complaintData, mockClientId);

      expect(result.status).toBe('SUBMITTED');
      expect(result.trackingNumber).toBe('COMP-12345678');
    });

    it('should support service request submission', async () => {
      const mockServiceRequestResponse = {
        id: 'sr-123',
        status: 'SUBMITTED',
        submittedAt: new Date().toISOString(),
        estimatedResponse: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
        message: 'Your service request has been submitted and our team will respond shortly.',
        trackingNumber: 'SR-12345678',
      };

      jest.spyOn(service, 'submitServiceRequest').mockResolvedValue(mockServiceRequestResponse);

      const serviceRequestData = {
        type: RequestType.ADDITIONAL_COVERAGE,
        title: 'Additional guard for weekend',
        description: 'Need an extra guard for special event',
        siteId: 'site-1',
        urgency: RequestUrgency.MEDIUM,
        preferredDate: '2024-01-20',
        duration: '48 hours',
        specialRequirements: 'Event security experience',
      };

      const result = await controller.submitServiceRequest(serviceRequestData, mockClientId);

      expect(result.status).toBe('SUBMITTED');
      expect(result.trackingNumber).toBe('SR-12345678');
    });

    it('should provide incident reporting and tracking', async () => {
      const mockCommunicationData = {
        incidentReports: [
          {
            id: 'inc-1',
            type: IncidentType.SECURITY_BREACH,
            title: 'Unauthorized access attempt',
            description: 'Someone tried to enter restricted area',
            site: {
              id: 'site-1',
              name: 'Main Office',
              address: '123 Business St',
            },
            severity: IncidentSeverity.HIGH,
            status: IncidentStatus.IN_PROGRESS,
            occurredAt: '2024-01-15T14:30:00Z',
            reportedAt: '2024-01-15T14:35:00Z',
            attachments: [],
          }
        ],
        complaints: [
          {
            id: 'comp-1',
            type: ComplaintType.SERVICE_QUALITY,
            subject: 'Guard performance issue',
            status: ComplaintStatus.INVESTIGATING,
            priority: 'HIGH' as const,
            submittedAt: '2024-01-15T10:00:00Z',
          }
        ],
        serviceRequests: [
          {
            id: 'sr-1',
            type: RequestType.GUARD_REPLACEMENT,
            title: 'Additional guard request',
            status: 'APPROVED' as const,
            urgency: RequestUrgency.MEDIUM,
            submittedAt: '2024-01-15T09:00:00Z',
          }
        ],
        statistics: {
          totalIncidents: 5,
          openComplaints: 2,
          pendingRequests: 3,
          avgResolutionTime: 4.5,
        },
      };

      jest.spyOn(service, 'getCommunicationData').mockResolvedValue(mockCommunicationData);

      const result = await controller.getCommunicationData(mockClientId);

      expect(result.incidentReports).toHaveLength(1);
      expect(result.incidentReports[0].type).toBe(IncidentType.SECURITY_BREACH);
      expect(result.complaints).toHaveLength(1);
      expect(result.serviceRequests).toHaveLength(1);
      expect(result.statistics.totalIncidents).toBe(5);
    });
  });

  describe('Notification Center', () => {
    it('should provide operational notifications and alerts', async () => {
      const mockDashboard = {
        notifications: [
          {
            id: 'notif-1',
            type: 'STAFFING_SHORTAGE',
            message: '2 vacant positions require immediate attention',
            priority: 'HIGH',
            timestamp: new Date().toISOString(),
            actionRequired: true,
          },
          {
            id: 'notif-2',
            type: 'ATTENDANCE_ALERT',
            message: '3 attendance issues need supervisor approval',
            priority: 'MEDIUM',
            timestamp: new Date().toISOString(),
            actionRequired: true,
          },
          {
            id: 'notif-3',
            type: 'SITE_MAINTENANCE',
            message: '1 site currently under maintenance',
            priority: 'LOW',
            timestamp: new Date().toISOString(),
            actionRequired: false,
          }
        ]
      };

      jest.spyOn(service, 'getClientDashboard').mockResolvedValue(mockDashboard as any);

      const result = await controller.getDashboard({ clientId: mockClientId });

      expect(result.notifications).toHaveLength(3);
      expect(result.notifications[0].type).toBe('STAFFING_SHORTAGE');
      expect(result.notifications[1].actionRequired).toBe(true);
      expect(result.notifications[2].priority).toBe('LOW');
    });
  });
});