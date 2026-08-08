import { Test, TestingModule } from '@nestjs/testing';
import { SupervisorPortalController } from './supervisor-portal.controller';
import { SupervisorPortalService } from './supervisor-portal.service';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from '../common/tenant-context.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SupervisorOrAbove } from '../common/tenant.guard';

// Mock the SupervisorPortalService properly with all required methods
const mockSupervisorPortalService = {
  getDashboardOverview: jest.fn(),
  processAttendanceApproval: jest.fn(),
  getSiteHealthMonitoring: jest.fn(),
  getDailyMusterRoll: jest.fn(),
  handleEmergencyReplacement: jest.fn(),
};

// Mock PrismaService for SupervisorPortalService dependencies
const mockPrismaService = {
  site: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
  },
  assignment: {
    findMany: jest.fn(),
    count: jest.fn(),
  },
  attendance: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  shift: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    count: jest.fn(),
  },
  employee: {
    findMany: jest.fn(),
  },
};

// Mock TenantContextService for SupervisorPortalService dependencies
const mockTenantContextService = {
  getTenantId: jest.fn().mockReturnValue('test-tenant-id'),
  getUserId: jest.fn().mockReturnValue('test-user-id'),
  getUserRole: jest.fn().mockReturnValue('SUPERVISOR'),
  hasContext: jest.fn().mockReturnValue(true),
  getContext: jest.fn().mockReturnValue({
    tenantId: 'test-tenant-id',
    userId: 'test-user-id',
    userRole: 'SUPERVISOR',
    isSet: true,
  }),
  validateTenantAccess: jest.fn().mockReturnValue(true),
  isAdmin: jest.fn().mockReturnValue(false),
  hasRole: jest.fn().mockReturnValue(true),
  hasAnyRole: jest.fn().mockReturnValue(true),
  clearContext: jest.fn(),
  getContextSnapshot: jest.fn().mockReturnValue('Context[tenant:test-tenant-id,user:test-user-id,role:SUPERVISOR,set:true]'),
  setContext: jest.fn(),
};

describe('SupervisorPortalController', () => {
  let controller: SupervisorPortalController;
  let service: SupervisorPortalService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SupervisorPortalController],
      providers: [
        {
          provide: SupervisorPortalService,
          useValue: mockSupervisorPortalService,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: TenantContextService,
          useValue: mockTenantContextService,
        },
      ],
    })
    .overrideGuard(JwtAuthGuard)
    .useValue({ canActivate: jest.fn().mockReturnValue(true) })
    .overrideGuard(SupervisorOrAbove)
    .useValue({ canActivate: jest.fn().mockReturnValue(true) })
    .compile();

    controller = module.get<SupervisorPortalController>(SupervisorPortalController);
    service = module.get<SupervisorPortalService>(SupervisorPortalService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
    expect(service).toBeDefined();
  });

  describe('getDashboard', () => {
    it('should return supervisor dashboard data', async () => {
      const mockDashboardData = {
        supervisorId: 'test-supervisor-id',
        targetDate: new Date().toISOString(),
        assignedSites: [],
        overview: {
          totalSites: 0,
          activeSites: 0,
          totalGuards: 0,
          guardsOnDuty: 0,
          pendingApprovals: 0,
          activeAlerts: 0,
        },
        sitesOverview: { activeSites: 0, sites: [] },
        deploymentStatus: { totalRequired: 0, totalAssigned: 0, deployments: [] },
        attendanceOverview: { expectedCount: 0, presentCount: 0, lateCount: 0, absentCount: 0, anomalies: [] },
        pendingApprovals: [],
        activeAlerts: [],
        todayStats: {},
        lastUpdated: new Date().toISOString(),
      };

      // Mock the service method
      mockSupervisorPortalService.getDashboardOverview.mockResolvedValue(mockDashboardData);

      const result = await controller.getDashboard({}, { user: { userId: 'test-supervisor-id' } });

      expect(result).toEqual(mockDashboardData);
      expect(mockSupervisorPortalService.getDashboardOverview).toHaveBeenCalledWith({}, 'test-supervisor-id');
    });
  });

  describe('processAttendanceApproval', () => {
    it('should process attendance approval successfully', async () => {
      const approvalDto = {
        attendanceId: 'test-attendance-id',
        action: 'APPROVE' as const,
        notes: 'Approved by supervisor',
      };

      const mockApprovalResult = {
        attendanceId: 'test-attendance-id',
        action: 'APPROVE' as const,
        status: 'PRESENT',
        processedBy: 'test-supervisor-id',
        processedAt: new Date().toISOString(),
        notes: 'Approved by supervisor',
      };

      mockSupervisorPortalService.processAttendanceApproval.mockResolvedValue(mockApprovalResult);

      const result = await controller.processAttendanceApproval(
        approvalDto,
        { user: { userId: 'test-supervisor-id' } }
      );

      expect(result).toEqual(mockApprovalResult);
      expect(mockSupervisorPortalService.processAttendanceApproval).toHaveBeenCalledWith(approvalDto, 'test-supervisor-id');
    });
  });
});