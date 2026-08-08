import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from '../common/tenant-context.service';
import { ClientRepository } from '../common/repositories/client.repository';
import { SiteRepository } from '../common/repositories/site.repository';
import { AttendanceRepository } from '../common/repositories/attendance.repository';
import {
  ClientDashboardDto,
  ClientDashboardResponseDto,
  GuardMonitoringQueryDto,
  GuardDeploymentResponseDto,
  ClientAttendanceQueryDto,
  ClientAttendanceResponseDto,
  AttendanceTrendsResponseDto,
  ClientInvoiceQueryDto,
  ClientBillingResponseDto,
  InvoiceDownloadResponseDto,
  ClientReportsQueryDto,
  ClientReportsResponseDto,
  ReportDownloadResponseDto,
  CommunicationResponseDto,
  IncidentStatus,
  CreateComplaintDto,
  CreateServiceRequestDto,
  GuardReplacementRequestDto,
} from './dto';
import { BillingService } from '../billing/billing.service';

@Injectable()
export class ClientPortalService {
  private readonly logger = new Logger(ClientPortalService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
    private readonly clientRepository: ClientRepository,
    private readonly siteRepository: SiteRepository,
    private readonly attendanceRepository: AttendanceRepository,
    private readonly billingService: BillingService,
  ) {}

  /**
   * Get client dashboard with real-time metrics
   */
  async getClientDashboard(dto: ClientDashboardDto): Promise<ClientDashboardResponseDto> {
    this.logger.log(`Getting dashboard for client: ${dto.clientId}`);

    // Verify client access
    await this.validateClientAccess(dto.clientId);

    // Get date range for metrics
    const { startDate, endDate } = this.getDateRange(dto.startDate, dto.endDate);

    // Fetch dashboard data in parallel
    const [
      siteOverview,
      guardDeployment,
      attendanceMetrics,
      recentIncidents,
      notifications,
      siteHealth,
    ] = await Promise.all([
      this.getSiteOverview(dto.clientId),
      this.getGuardDeploymentMetrics(dto.clientId),
      this.getAttendanceMetrics(dto.clientId, startDate, endDate),
      this.getRecentIncidents(dto.clientId),
      this.getNotifications(dto.clientId),
      this.getSiteHealthIndicators(dto.clientId),
    ]);

    return {
      siteOverview,
      guardDeployment,
      attendanceMetrics,
      recentIncidents,
      notifications,
      siteHealth,
    };
  }

  /**
   * Get guard deployment status and monitoring data
   */
  async getGuardMonitoring(dto: GuardMonitoringQueryDto): Promise<GuardDeploymentResponseDto> {
    this.logger.log(`Getting guard monitoring for client: ${dto.clientId}`);

    await this.validateClientAccess(dto.clientId);

    const date = dto.date || new Date().toISOString().split('T')[0];

    // Get deployment status and guard performance
    const [deploymentStatus, guardPerformance, coverageVisualization] = await Promise.all([
      this.getDeploymentStatus(dto.clientId, dto.siteId, date),
      this.getGuardPerformanceMetrics(dto.clientId, dto.siteId),
      this.getCoverageVisualization(dto.clientId),
    ]);

    return {
      deploymentStatus,
      guardPerformance,
      coverageVisualization,
    };
  }
  /**
   * Get client attendance management data
   */
  async getClientAttendance(dto: ClientAttendanceQueryDto): Promise<ClientAttendanceResponseDto> {
    this.logger.log(`Getting attendance data for client: ${dto.clientId}`);

    await this.validateClientAccess(dto.clientId);

    const { startDate, endDate } = this.getDateRange(dto.dateFrom, dto.dateTo);

    // Fetch attendance data
    const [dashboardMetrics, attendanceRecords, anomalies, siteSummary] = await Promise.all([
      this.getAttendanceDashboardMetrics(dto.clientId, startDate, endDate),
      this.getAttendanceRecords(dto),
      this.getAttendanceAnomalies(dto.clientId, startDate, endDate),
      this.getAttendanceSiteSummary(dto.clientId, startDate, endDate),
    ]);

    return {
      dashboardMetrics,
      attendanceRecords: attendanceRecords.records,
      anomalies,
      siteSummary,
      pagination: attendanceRecords.pagination,
    };
  }

  /**
   * Get attendance trends and patterns
   */
  async getAttendanceTrends(dto: ClientAttendanceQueryDto): Promise<AttendanceTrendsResponseDto> {
    this.logger.log(`Getting attendance trends for client: ${dto.clientId}`);

    await this.validateClientAccess(dto.clientId);

    const { startDate, endDate } = this.getDateRange(dto.dateFrom, dto.dateTo);

    const [dailyTrends, sitePatterns] = await Promise.all([
      this.getDailyAttendanceTrends(dto.clientId, startDate, endDate),
      this.getSiteAttendancePatterns(dto.clientId, startDate, endDate),
    ]);

    return {
      dailyTrends,
      sitePatterns,
    };
  }

  /**
   * Get client billing and invoice data
   */
  async getClientBilling(dto: ClientInvoiceQueryDto): Promise<ClientBillingResponseDto> {
    this.logger.log(`Getting billing data for client: ${dto.clientId}`);

    await this.validateClientAccess(dto.clientId);

    // Use existing billing service with client-specific filtering
    const billingData = await this.billingService.listInvoices({
      clientId: dto.clientId,
      status: dto.status as any, // Type assertion to handle enum mismatch
      billingPeriodStart: dto.dateFrom,
      billingPeriodEnd: dto.dateTo,
      page: dto.page,
      limit: dto.limit,
    });

    // Transform and add dashboard metrics
    const [dashboardMetrics, billingHistory, chargesBreakdown] = await Promise.all([
      this.getBillingDashboardMetrics(dto.clientId),
      this.getBillingHistory(dto.clientId),
      this.getChargesBreakdown(dto.clientId, dto.dateFrom, dto.dateTo),
    ]);

    return {
      dashboardMetrics,
      invoices: this.mapInvoiceResponsesToDto(billingData.data),
      billingHistory,
      chargesBreakdown,
      pagination: {
        total: billingData.pagination.total,
        page: billingData.pagination.page,
        limit: billingData.pagination.limit,
        totalPages: billingData.pagination.pages,
      },
    };
  }
  /**
   * Download invoice PDF
   */
  async downloadInvoice(clientId: string, invoiceId: string): Promise<InvoiceDownloadResponseDto> {
    this.logger.log(`Downloading invoice ${invoiceId} for client: ${clientId}`);

    await this.validateClientAccess(clientId);
    await this.validateInvoiceAccess(clientId, invoiceId);

    // Use existing billing service for PDF generation
    const pdfData = await this.billingService.generateInvoicePdf(invoiceId);

    return {
      downloadUrl: pdfData.filePath, // Use filePath instead of downloadUrl
      fileName: pdfData.fileName,
      fileSize: pdfData.fileSize || 0,
      contentType: 'application/pdf',
      generatedAt: pdfData.generatedAt,
    };
  }

  /**
   * Get client reports and analytics
   */
  async getClientReports(dto: ClientReportsQueryDto): Promise<ClientReportsResponseDto> {
    this.logger.log(`Generating reports for client: ${dto.clientId}`);

    await this.validateClientAccess(dto.clientId);

    // Generate comprehensive reports
    const [sitePerformance, deploymentAnalytics, attendanceTrends, serviceCompliance] =
      await Promise.all([
        this.generateSitePerformanceReports(dto),
        this.generateDeploymentAnalytics(dto),
        this.generateAttendanceTrendsAnalysis(dto),
        this.generateServiceComplianceReports(dto),
      ]);

    return {
      sitePerformance,
      deploymentAnalytics,
      attendanceTrends,
      serviceCompliance,
      reportPeriod: {
        startDate: dto.startDate,
        endDate: dto.endDate,
        totalDays: this.calculateDaysBetween(dto.startDate, dto.endDate),
      },
      metadata: {
        generatedAt: new Date().toISOString(),
        generatedBy: 'client-portal',
        reportId: `rpt-${Date.now()}`,
      },
    };
  }

  /**
   * Download report in specified format
   */
  async downloadReport(dto: ClientReportsQueryDto): Promise<ReportDownloadResponseDto> {
    this.logger.log(`Downloading report for client: ${dto.clientId}`);

    await this.validateClientAccess(dto.clientId);

    // Generate report and create download
    const reportData = await this.getClientReports(dto);
    const fileName = this.generateReportFileName(dto);

    // Mock implementation - in production, this would generate actual files
    return {
      downloadUrl: `https://example.com/reports/${fileName}`,
      fileName,
      fileSize: 1048576, // 1MB mock size
      format: (dto.format || 'PDF') as any, // Type assertion for enum
      generatedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
    };
  }
  /**
   * Get communication data (incidents, complaints, requests)
   */
  async getCommunicationData(clientId: string): Promise<CommunicationResponseDto> {
    this.logger.log(`Getting communication data for client: ${clientId}`);

    await this.validateClientAccess(clientId);

    const [incidentReports, complaints, serviceRequests, statistics] = await Promise.all([
      this.getIncidentReports(clientId),
      this.getClientComplaints(clientId),
      this.getServiceRequests(clientId),
      this.getCommunicationStatistics(clientId),
    ]);

    return {
      incidentReports,
      complaints,
      serviceRequests,
      statistics,
    };
  }

  /**
   * Submit a complaint
   */
  async submitComplaint(clientId: string, dto: CreateComplaintDto) {
    this.logger.log(`Submitting complaint for client: ${clientId}`);

    await this.validateClientAccess(clientId);
    await this.validateSiteAccess(clientId, dto.siteId);

    // Create complaint record using ClientInteraction
    const complaint = await this.prisma.clientInteraction.create({
      data: {
        clientId,
        interactionType: 'COMPLAINT_HANDLING',
        subject: dto.subject,
        description: dto.description,
        method: 'PORTAL',
        priority: this.mapComplaintPriorityToInteractionPriority(dto.priority),
        status: 'SCHEDULED',
        metadata: {
          complaintType: dto.type,
          siteId: dto.siteId,
          guardId: dto.guardId,
          priority: dto.priority,
          attachments: dto.attachments,
          submittedVia: 'CLIENT_PORTAL'
        },
        createdBy: clientId, // Using clientId as creator for now
      }
    });

    this.logger.log(`Created complaint ${complaint.id} for client ${clientId}`);

    return {
      id: complaint.id,
      status: 'SUBMITTED',
      submittedAt: complaint.createdAt.toISOString(),
      message: 'Your complaint has been submitted and will be reviewed within 24 hours.',
      trackingNumber: `COMP-${complaint.id.substring(0, 8).toUpperCase()}`,
      estimatedResolution: this.calculateComplaintResolutionTime(dto.priority)
    };
  }

  /**
   * Submit a service request
   */
  async submitServiceRequest(clientId: string, dto: CreateServiceRequestDto) {
    this.logger.log(`Submitting service request for client: ${clientId}`);

    await this.validateClientAccess(clientId);
    await this.validateSiteAccess(clientId, dto.siteId);

    // Create service request record
    const serviceRequest = await this.prisma.clientInteraction.create({
      data: {
        clientId,
        interactionType: 'SERVICE_UPGRADE', // Map to closest available type
        subject: dto.title,
        description: dto.description,
        method: 'PORTAL',
        scheduledAt: dto.preferredDate ? new Date(dto.preferredDate) : null,
        priority: this.mapUrgencyToPriority(dto.urgency),
        status: 'SCHEDULED',
        metadata: {
          requestType: dto.type,
          siteId: dto.siteId,
          urgency: dto.urgency,
          duration: dto.duration,
          specialRequirements: dto.specialRequirements,
          submittedVia: 'CLIENT_PORTAL'
        },
        createdBy: clientId, // Using clientId as creator for now
      }
    });

    this.logger.log(`Created service request ${serviceRequest.id} for client ${clientId}`);

    return {
      id: serviceRequest.id,
      status: 'SUBMITTED',
      submittedAt: serviceRequest.createdAt.toISOString(),
      estimatedResponse: this.calculateResponseTime(dto.urgency),
      message: 'Your service request has been submitted and our team will respond shortly.',
      trackingNumber: `SR-${serviceRequest.id.substring(0, 8).toUpperCase()}`
    };
  }

  /**
   * Request guard replacement
   */
  async requestGuardReplacement(clientId: string, dto: GuardReplacementRequestDto) {
    this.logger.log(`Requesting guard replacement for client: ${clientId}`);

    await this.validateClientAccess(clientId);
    await this.validateSiteAccess(clientId, dto.siteId);

    // Create guard replacement request using service request
    const replacementRequest = await this.prisma.clientInteraction.create({
      data: {
        clientId,
        interactionType: 'SERVICE_UPGRADE',
        subject: `Guard replacement request - ${dto.reason}`,
        description: `Replacement needed for site. Reason: ${dto.reason}. Duration: ${dto.durationHours} hours.`,
        method: 'PORTAL',
        scheduledAt: new Date(dto.preferredStartTime),
        priority: this.mapUrgencyToPriority(dto.urgency),
        status: 'SCHEDULED',
        metadata: {
          requestType: 'GUARD_REPLACEMENT',
          siteId: dto.siteId,
          currentGuardId: dto.currentGuardId,
          reason: dto.reason,
          urgency: dto.urgency,
          preferredStartTime: dto.preferredStartTime,
          durationHours: dto.durationHours,
          specialRequirements: dto.specialRequirements,
          submittedVia: 'CLIENT_PORTAL'
        },
        createdBy: clientId,
      }
    });

    // Find available replacement guards based on skills and availability
    const site = await this.prisma.site.findUnique({
      where: { id: dto.siteId },
      include: {
        contract: {
          include: {
            client: true
          }
        }
      }
    });
    
    const skillRequirements = (site?.skillRequirements as any)?.skills || [];
    
    const availableGuards = await this.prisma.employee.findMany({
      where: {
        employmentStatus: 'ACTIVE',
        skills: skillRequirements.length > 0 ? { hasAll: skillRequirements } : undefined,
        // Not currently assigned to active shifts at the same time
        assignments: {
          none: {
            shifts: {
              some: {
                shiftDate: new Date(dto.preferredStartTime),
                status: { in: ['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS'] }
              }
            }
          }
        }
      },
      take: 5, // Limit to top 5 candidates
      select: {
        id: true,
        firstName: true,
        lastName: true,
        employeeNumber: true,
        skills: true
      }
    });

    return {
      id: replacementRequest.id,
      status: 'PROCESSING',
      submittedAt: replacementRequest.createdAt.toISOString(),
      estimatedFulfillment: this.calculateReplacementTime(dto.urgency),
      message: `Guard replacement request submitted. ${availableGuards.length} suitable candidates found.`,
      trackingNumber: `GR-${replacementRequest.id.substring(0, 8).toUpperCase()}`,
      availableCandidates: availableGuards.length,
      nextUpdate: new Date(Date.now() + (dto.urgency === 'EMERGENCY' ? 30 : 60) * 60 * 1000).toISOString()
    };
  }
  // Private helper methods

  /**
   * Validate client access within tenant context
   */
  private async validateClientAccess(clientId: string): Promise<void> {
    const client = await this.clientRepository.findById(clientId);
    if (!client) {
      throw new NotFoundException(`Client with ID ${clientId} not found`);
    }
  }

  /**
   * Validate site belongs to client
   */
  private async validateSiteAccess(clientId: string, siteId: string): Promise<void> {
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
      include: {
        contracts: {
          include: {
            sites: {
              where: { id: siteId }
            }
          }
        }
      }
    });

    if (!client) {
      throw new BadRequestException(`Client ${clientId} not found`);
    }

    const siteExists = client.contracts.some(contract => 
      contract.sites.some(site => site.id === siteId)
    );

    if (!siteExists) {
      throw new BadRequestException(`Site ${siteId} does not belong to client ${clientId}`);
    }
  }

  /**
   * Validate invoice belongs to client
   */
  private async validateInvoiceAccess(clientId: string, invoiceId: string): Promise<void> {
    const invoice = await this.billingService.getInvoice(invoiceId);
    if (!invoice || invoice.contract.client.id !== clientId) {
      throw new BadRequestException(`Invoice ${invoiceId} does not belong to client ${clientId}`);
    }
  }

  /**
   * Get date range with defaults
   */
  private getDateRange(startDate?: string, endDate?: string) {
    const today = new Date();
    const defaultStart = new Date(today.getFullYear(), today.getMonth(), 1); // First day of month
    const defaultEnd = today;

    return {
      startDate: startDate ? new Date(startDate) : defaultStart,
      endDate: endDate ? new Date(endDate) : defaultEnd,
    };
  }

  /**
   * Get site overview metrics
   */
  private async getSiteOverview(clientId: string) {
    // Get sites through contracts for this client
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
      include: {
        contracts: {
          include: {
            sites: true
          }
        }
      }
    });

    if (!client) {
      throw new NotFoundException('Client not found');
    }

    const allSites = client.contracts.flatMap(contract => contract.sites);
    
    const totalSites = allSites.length;
    const activeSites = allSites.filter(site => site.operationalStatus === 'ACTIVE').length;
    const inactiveSites = allSites.filter(site => site.operationalStatus === 'INACTIVE').length;
    const maintenanceSites = allSites.filter(site => site.operationalStatus === 'MAINTENANCE').length;
    const suspendedSites = allSites.filter(site => site.operationalStatus === 'SUSPENDED').length;
    
    // Sites with issues: those in maintenance, suspended, or with staffing shortages
    const sitesWithIssues = maintenanceSites + suspendedSites;

    return {
      totalSites,
      activeSites,
      inactiveSites: inactiveSites + maintenanceSites + suspendedSites,
      sitesWithIssues,
      breakdown: {
        active: activeSites,
        inactive: inactiveSites,
        maintenance: maintenanceSites,
        suspended: suspendedSites,
      }
    };
  }

  /**
   * Get guard deployment metrics
   */
  private async getGuardDeploymentMetrics(clientId: string) {
    // Get all sites for this client through contracts
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
      include: {
        contracts: {
          include: {
            sites: true
          }
        }
      }
    });

    if (!client) {
      return {
        totalGuards: 0,
        activeGuards: 0,
        onDutyGuards: 0,
        vacantPositions: 0,
        deploymentRate: 0
      };
    }

    const allSites = client.contracts.flatMap(contract => contract.sites);
    const siteIds = allSites.map(site => site.id);
    
    if (siteIds.length === 0) {
      return {
        totalGuards: 0,
        activeGuards: 0,
        onDutyGuards: 0,
        vacantPositions: 0,
        deploymentRate: 0
      };
    }

    // Get active assignments for these sites
    const assignments = await this.prisma.assignment.findMany({
      where: {
        siteId: { in: siteIds },
        status: 'ACTIVE',
        employee: {
          employmentStatus: 'ACTIVE'
        }
      },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employmentStatus: true
          }
        }
      }
    });

    // Get today's shifts to determine who's on duty
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todaysShifts = await this.prisma.shift.findMany({
      where: {
        siteId: { in: siteIds },
        shiftDate: {
          gte: today,
          lt: tomorrow
        },
        status: { in: ['SCHEDULED', 'IN_PROGRESS', 'CONFIRMED'] }
      },
      include: {
        assignment: {
          include: {
            employee: true
          }
        },
        attendanceRecords: {
          where: {
            clockIn: { not: null }
          }
        }
      }
    });

    const totalGuards = assignments.length;
    const activeGuards = assignments.filter(a => a.employee.employmentStatus === 'ACTIVE').length;
    
    // Guards who have clocked in today or have confirmed shifts
    const onDutyGuards = todaysShifts.filter(shift => 
      shift.attendanceRecords.length > 0 || shift.status === 'CONFIRMED'
    ).length;
    
    // Calculate required vs assigned positions
    const totalRequiredPositions = allSites.reduce((sum, site) => sum + (site.minStaffingLevel || 1), 0);
    const vacantPositions = Math.max(0, totalRequiredPositions - activeGuards);
    
    const deploymentRate = totalRequiredPositions > 0 
      ? Math.round((activeGuards / totalRequiredPositions) * 100) 
      : 0;

    return {
      totalGuards,
      activeGuards,
      onDutyGuards,
      vacantPositions,
      deploymentRate,
      requiredPositions: totalRequiredPositions
    };
  }

  /**
   * Get attendance metrics
   */
  private async getAttendanceMetrics(clientId: string, startDate: Date, endDate: Date) {
    // Get all sites for this client through contracts
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
      include: {
        contracts: {
          include: {
            sites: true
          }
        }
      }
    });

    if (!client) {
      return {
        attendanceRate: 0,
        lateArrivals: 0,
        earlyDepartures: 0,
        missedShifts: 0,
        totalShifts: 0,
        presentCount: 0
      };
    }

    const allSites = client.contracts.flatMap(contract => contract.sites);
    const siteIds = allSites.map(site => site.id);
    
    if (siteIds.length === 0) {
      return {
        attendanceRate: 0,
        lateArrivals: 0,
        earlyDepartures: 0,
        missedShifts: 0,
        totalShifts: 0,
        presentCount: 0
      };
    }

    // Get attendance records for the period
    const attendanceStats = await this.attendanceRepository.getStats(
      startDate, 
      endDate, 
      undefined, // siteId - we want all sites
      undefined  // employeeId - we want all employees
    );

    // Get shifts in the period to calculate missed shifts
    const shifts = await this.prisma.shift.findMany({
      where: {
        siteId: { in: siteIds },
        shiftDate: {
          gte: startDate,
          lte: endDate
        }
      },
      include: {
        attendanceRecords: true
      }
    });

    const totalShifts = shifts.length;
    const shiftsWithAttendance = shifts.filter(shift => shift.attendanceRecords.length > 0).length;
    const missedShifts = totalShifts - shiftsWithAttendance;

    return {
      attendanceRate: attendanceStats.attendanceRate,
      lateArrivals: attendanceStats.lateCount,
      earlyDepartures: attendanceStats.earlyDepartureCount,
      missedShifts,
      totalShifts,
      presentCount: attendanceStats.presentCount,
      onTimeRate: attendanceStats.onTimeRate
    };
  }
  /**
   * Get recent incidents
   */
  private async getRecentIncidents(clientId: string) {
    // Get all sites for this client through contracts
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
      include: {
        contracts: {
          include: {
            sites: true
          }
        }
      }
    });

    if (!client) {
      return [];
    }

    const allSites = client.contracts.flatMap(contract => contract.sites);
    const siteIds = allSites.map(site => site.id);
    
    if (siteIds.length === 0) {
      return [];
    }

    // Get attendance anomalies as incidents
    const anomalies = await this.attendanceRepository.detectAnomalies(
      new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
      new Date(),
      ['LATE_ARRIVAL', 'EARLY_DEPARTURE', 'MISSED_CLOCK_OUT'],
      undefined,
      undefined
    );

    // Transform anomalies into incidents format
    const incidents = anomalies.slice(0, 10).map(anomaly => ({
      id: `incident-${anomaly.attendanceId}`,
      type: anomaly.anomalyType,
      siteName: anomaly.attendance.shift.site.name,
      employeeName: `${anomaly.attendance.employee.firstName} ${anomaly.attendance.employee.lastName}`,
      timestamp: anomaly.detectedAt.toISOString(),
      severity: anomaly.severity as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
      description: anomaly.description
    }));

    return incidents;
  }

  /**
   * Get notifications
   */
  private async getNotifications(clientId: string) {
    const notifications = [];
    
    // Get all sites for this client through contracts
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
      include: {
        contracts: {
          include: {
            sites: true
          }
        }
      }
    });

    if (!client) {
      return notifications;
    }

    const allSites = client.contracts.flatMap(contract => contract.sites);
    const siteIds = allSites.map(site => site.id);
    
    if (siteIds.length === 0) {
      return notifications;
    }

    // Check for vacant positions
    const totalRequiredPositions = allSites.reduce((sum, site) => sum + (site.minStaffingLevel || 1), 0);
    const activeAssignments = await this.prisma.assignment.count({
      where: {
        siteId: { in: siteIds },
        status: 'ACTIVE'
      }
    });

    const vacantPositions = totalRequiredPositions - activeAssignments;
    if (vacantPositions > 0) {
      notifications.push({
        id: 'notification-vacant-positions',
        type: 'STAFFING_SHORTAGE',
        message: `${vacantPositions} vacant position${vacantPositions > 1 ? 's' : ''} require${vacantPositions === 1 ? 's' : ''} immediate attention`,
        priority: vacantPositions > 5 ? 'URGENT' : 'HIGH' as 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT',
        timestamp: new Date().toISOString(),
        actionRequired: true,
      });
    }

    // Check for sites in maintenance
    const maintenanceSites = allSites.filter(site => site.operationalStatus === 'MAINTENANCE');
    if (maintenanceSites.length > 0) {
      notifications.push({
        id: 'notification-maintenance',
        type: 'SITE_MAINTENANCE',
        message: `${maintenanceSites.length} site${maintenanceSites.length > 1 ? 's' : ''} currently under maintenance`,
        priority: 'MEDIUM' as 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT',
        timestamp: new Date().toISOString(),
        actionRequired: false,
      });
    }

    // Check for recent attendance issues
    const recentAnomalies = await this.attendanceRepository.detectAnomalies(
      new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
      new Date(),
      ['MISSED_CLOCK_OUT'],
      undefined,
      undefined
    );

    if (recentAnomalies.length > 0) {
      notifications.push({
        id: 'notification-attendance-issues',
        type: 'ATTENDANCE_ALERT',
        message: `${recentAnomalies.length} attendance issue${recentAnomalies.length > 1 ? 's' : ''} need${recentAnomalies.length === 1 ? 's' : ''} supervisor approval`,
        priority: 'HIGH' as 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT',
        timestamp: new Date().toISOString(),
        actionRequired: true,
      });
    }

    return notifications;
  }

  /**
   * Get site health indicators
   */
  private async getSiteHealthIndicators(clientId: string) {
    // Get all sites for this client through contracts
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
      include: {
        contracts: {
          include: {
            sites: true
          }
        }
      }
    });

    if (!client) {
      return [];
    }

    const allSites = client.contracts.flatMap(contract => contract.sites);
    
    const healthIndicators = await Promise.all(
      allSites.map(async (site) => {
        // Calculate health score based on multiple factors
        let healthScore = 100;
        const issues = [];

        // Factor 1: Staffing level
        const requiredStaff = site.minStaffingLevel || 1;
        const assignedStaff = await this.prisma.assignment.count({
          where: {
            siteId: site.id,
            status: 'ACTIVE'
          }
        });

        if (assignedStaff < requiredStaff) {
          const shortage = requiredStaff - assignedStaff;
          healthScore -= (shortage / requiredStaff) * 30; // Up to 30 points for staffing
          issues.push(`${shortage} guard${shortage > 1 ? 's' : ''} short of requirement`);
        }

        // Factor 2: Attendance rate (last 7 days)
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const attendanceStats = await this.attendanceRepository.getStats(
          weekAgo,
          new Date(),
          site.id
        );

        if (attendanceStats.attendanceRate < 95) {
          healthScore -= (95 - attendanceStats.attendanceRate) * 2; // Up to 20 points for attendance
          issues.push(`Attendance rate: ${attendanceStats.attendanceRate.toFixed(1)}%`);
        }

        // Factor 3: Recent incidents
        const recentAnomalies = await this.attendanceRepository.detectAnomalies(
          weekAgo,
          new Date(),
          undefined,
          undefined,
          site.id
        );

        if (recentAnomalies.length > 0) {
          healthScore -= Math.min(recentAnomalies.length * 5, 25); // Up to 25 points for incidents
          issues.push(`${recentAnomalies.length} recent incident${recentAnomalies.length > 1 ? 's' : ''}`);
        }

        // Factor 4: Operational status
        if (site.operationalStatus !== 'ACTIVE') {
          healthScore -= 40;
          issues.push(`Site status: ${site.operationalStatus.toLowerCase()}`);
        }

        // Ensure health score is between 0 and 100
        healthScore = Math.max(0, Math.min(100, Math.round(healthScore)));

        // Determine status based on health score
        let status: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' | 'CRITICAL';
        if (healthScore >= 95) status = 'EXCELLENT';
        else if (healthScore >= 85) status = 'GOOD';
        else if (healthScore >= 70) status = 'FAIR';
        else if (healthScore >= 50) status = 'POOR';
        else status = 'CRITICAL';

        return {
          siteId: site.id,
          siteName: site.name,
          healthScore,
          status,
          lastUpdate: new Date().toISOString(),
          issues,
          operationalStatus: site.operationalStatus,
          assignedStaff,
          requiredStaff,
          attendanceRate: attendanceStats.attendanceRate
        };
      })
    );

    return healthIndicators;
  }

  /**
   * Mock implementations for other data methods
   */
  private async getDeploymentStatus(clientId: string, siteId?: string, date?: string) {
    return [];
  }

  private async getGuardPerformanceMetrics(clientId: string, siteId?: string) {
    return [];
  }

  private async getCoverageVisualization(clientId: string) {
    return {
      totalSites: 15,
      fullyCovered: 12,
      partiallyCovered: 2,
      uncovered: 1,
      overStaffed: 0,
    };
  }

  private async getAttendanceDashboardMetrics(clientId: string, startDate: Date, endDate: Date) {
    return {
      totalShifts: 150,
      presentGuards: 142,
      absentGuards: 5,
      lateGuards: 3,
      attendanceRate: 94.7,
    };
  }

  private async getAttendanceRecords(dto: ClientAttendanceQueryDto) {
    return {
      records: [],
      pagination: {
        total: 0,
        page: dto.page || 1,
        limit: dto.limit || 20,
        totalPages: 0,
      },
    };
  }
  private async getAttendanceAnomalies(clientId: string, startDate: Date, endDate: Date) {
    return [];
  }

  private async getAttendanceSiteSummary(clientId: string, startDate: Date, endDate: Date) {
    return [];
  }

  private async getDailyAttendanceTrends(clientId: string, startDate: Date, endDate: Date) {
    return [];
  }

  private async getSiteAttendancePatterns(clientId: string, startDate: Date, endDate: Date) {
    return [];
  }

  private async getBillingDashboardMetrics(clientId: string) {
    return {
      totalInvoices: 12,
      pendingInvoices: 3,
      paidInvoices: 8,
      overdueInvoices: 1,
      totalAmountDue: 50000.0,
      totalPaid: 200000.0,
    };
  }

  private async getBillingHistory(clientId: string) {
    return [];
  }

  private async getChargesBreakdown(clientId: string, dateFrom?: string, dateTo?: string) {
    return {
      securityServices: 180000.0,
      overtime: 20000.0,
      specialServices: 5000.0,
      taxes: 32400.0,
    };
  }

  private async generateSitePerformanceReports(dto: ClientReportsQueryDto) {
    return [];
  }

  private async generateDeploymentAnalytics(dto: ClientReportsQueryDto) {
    return {
      deploymentEfficiency: {
        averageDeploymentTime: 1.2,
        fillRate: 96.5,
        retentionRate: 87.3,
        replacementFrequency: 2.1,
      },
      guardUtilization: [],
      staffingTrends: [],
    };
  }

  private async generateAttendanceTrendsAnalysis(dto: ClientReportsQueryDto) {
    return {
      overallTrends: {
        averageAttendanceRate: 95.8,
        trendDirection: 'IMPROVING' as const,
        bestMonth: 'January',
        worstMonth: 'March',
      },
      dailyPatterns: [],
      siteComparison: [],
    };
  }

  private async generateServiceComplianceReports(dto: ClientReportsQueryDto) {
    return {
      overallCompliance: 97.5,
      slaMetrics: [],
    };
  }
  /**
   * Get incident reports from recent attendance anomalies and site issues  
   */
  private async getIncidentReports(clientId: string) {
    const sites = await this.siteRepository.findByClientId(clientId);
    const siteIds = sites.map(site => site.id);
    
    if (siteIds.length === 0) {
      return [];
    }

    // Get recent attendance anomalies as incidents
    const anomalies = await this.attendanceRepository.detectAnomalies(
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
      new Date(),
      undefined,
      undefined,
      undefined
    );

    // Transform anomalies to incident reports
    const incidents = anomalies.slice(0, 20).map(anomaly => ({
      id: `inc-${anomaly.attendanceId}`,
      type: anomaly.anomalyType,
      title: this.getIncidentTitle(anomaly.anomalyType),
      description: anomaly.description,
      site: {
        id: anomaly.attendance.shift.site.id,
        name: anomaly.attendance.shift.site.name,
        address: 'Site Address' // Would need to get from site data
      },
      reportedBy: {
        id: anomaly.attendance.employee.id,
        name: `${anomaly.attendance.employee.firstName} ${anomaly.attendance.employee.lastName}`,
        employeeNumber: anomaly.attendance.employee.employeeNumber
      },
      severity: anomaly.severity,
      status: IncidentStatus.OPEN, // Use enum instead of string
      occurredAt: anomaly.attendance.shift.shiftDate.toISOString(),
      reportedAt: anomaly.detectedAt.toISOString(),
      actionsTaken: this.getDefaultAction(anomaly.anomalyType),
      attachments: [],
      followUpRequired: anomaly.severity === 'HIGH' || anomaly.severity === 'CRITICAL' ? 'Supervisor review required' : undefined
    }));

    return incidents;
  }

  /**
   * Get client complaints from interactions
   */
  private async getClientComplaints(clientId: string) {
    const complaints = await this.prisma.clientInteraction.findMany({
      where: {
        clientId,
        interactionType: 'COMPLAINT_HANDLING',
        metadata: {
          path: ['submittedVia'],
          equals: 'CLIENT_PORTAL'
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 20
    });

    return complaints.map(complaint => ({
      id: complaint.id,
      type: (complaint.metadata as any)?.complaintType || 'OTHER',
      subject: complaint.subject,
      status: this.mapInteractionStatusToComplaintStatus(complaint.status),
      submittedAt: complaint.createdAt.toISOString(),
      priority: (complaint.metadata as any)?.priority || 'MEDIUM',
      expectedResolution: complaint.followUpDate?.toISOString(),
      description: complaint.description,
      trackingNumber: `COMP-${complaint.id.substring(0, 8).toUpperCase()}`
    }));
  }

  /**
   * Get service requests from interactions
   */
  private async getServiceRequests(clientId: string) {
    const serviceRequests = await this.prisma.clientInteraction.findMany({
      where: {
        clientId,
        interactionType: 'SERVICE_UPGRADE',
        metadata: {
          path: ['submittedVia'],
          equals: 'CLIENT_PORTAL'
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 20
    });

    return serviceRequests.map(request => ({
      id: request.id,
      type: (request.metadata as any)?.requestType || 'OTHER',
      title: request.subject,
      status: this.mapInteractionStatusToRequestStatus(request.status),
      submittedAt: request.createdAt.toISOString(),
      urgency: (request.metadata as any)?.urgency || 'MEDIUM',
      estimatedCompletion: request.scheduledAt?.toISOString(),
      description: request.description,
      trackingNumber: `SR-${request.id.substring(0, 8).toUpperCase()}`
    }));
  }

  /**
   * Get communication statistics
   */
  private async getCommunicationStatistics(clientId: string) {
    const [totalIncidents, openComplaints, pendingRequests, interactions] = await Promise.all([
      // Count recent attendance incidents
      this.attendanceRepository.detectAnomalies(
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
        new Date()
      ).then(anomalies => anomalies.length),
      
      // Count open complaints
      this.prisma.clientInteraction.count({
        where: {
          clientId,
          interactionType: 'COMPLAINT_HANDLING',
          status: { in: ['SCHEDULED', 'IN_PROGRESS'] }
        }
      }),
      
      // Count pending service requests  
      this.prisma.clientInteraction.count({
        where: {
          clientId,
          interactionType: 'SERVICE_UPGRADE',
          status: { in: ['SCHEDULED', 'IN_PROGRESS'] }
        }
      }),

      // Get completed interactions for resolution time calculation
      this.prisma.clientInteraction.findMany({
        where: {
          clientId,
          status: 'COMPLETED',
          completedAt: { not: null }
        },
        select: {
          createdAt: true,
          completedAt: true
        }
      })
    ]);

    // Calculate average resolution time in hours
    const avgResolutionTime = interactions.length > 0
      ? interactions.reduce((sum, interaction) => {
          const resolutionHours = (interaction.completedAt!.getTime() - interaction.createdAt.getTime()) / (1000 * 60 * 60);
          return sum + resolutionHours;
        }, 0) / interactions.length
      : 24; // Default 24 hours if no data

    return {
      totalIncidents,
      openComplaints,
      pendingRequests,
      avgResolutionTime: Math.round(avgResolutionTime * 10) / 10, // Round to 1 decimal
      totalInteractions: interactions.length
    };
  }

  private calculateDaysBetween(startDate: string, endDate: string): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  private generateReportFileName(dto: ClientReportsQueryDto): string {
    const reportType = dto.reportType || 'COMPREHENSIVE';
    const date = new Date().toISOString().split('T')[0];
    const format = (dto.format || 'PDF').toLowerCase();
    return `${reportType}_Report_${date}.${format}`;
  }

  private calculateResponseTime(urgency: string): string {
    const responseMap = {
      EMERGENCY: '1 hour',
      HIGH: '4 hours',
      MEDIUM: '12 hours',
      LOW: '24 hours',
    };
    return responseMap[urgency] || '24 hours';
  }

  private calculateReplacementTime(urgency: string): string {
    const replacementMap = {
      EMERGENCY: '2 hours',
      HIGH: '6 hours',
      MEDIUM: '12 hours',
      LOW: '24 hours',
    };
    return replacementMap[urgency] || '24 hours';
  }

  private calculateComplaintResolutionTime(priority: string): string {
    const resolutionMap = {
      URGENT: '4 hours',
      HIGH: '12 hours', 
      MEDIUM: '24 hours',
      LOW: '48 hours',
    };
    return resolutionMap[priority] || '24 hours';
  }

  private mapUrgencyToPriority(urgency: string): string {
    const priorityMap = {
      EMERGENCY: 'URGENT',
      HIGH: 'HIGH',
      MEDIUM: 'NORMAL',
      LOW: 'LOW'
    };
    return priorityMap[urgency] || 'NORMAL';
  }

  private mapComplaintPriorityToInteractionPriority(priority: string): string {
    const priorityMap = {
      URGENT: 'URGENT',
      HIGH: 'HIGH',
      MEDIUM: 'NORMAL',
      LOW: 'LOW'
    };
    return priorityMap[priority] || 'NORMAL';
  }

  private mapInteractionStatusToRequestStatus(status: string): string {
    const statusMap = {
      'SCHEDULED': 'SUBMITTED',
      'IN_PROGRESS': 'IN_PROGRESS', 
      'COMPLETED': 'COMPLETED',
      'CANCELLED': 'CANCELLED',
      'RESCHEDULED': 'PENDING'
    };
    return statusMap[status] || 'PENDING';
  }

  private mapInteractionStatusToComplaintStatus(status: string): string {
    const statusMap = {
      'SCHEDULED': 'SUBMITTED',
      'IN_PROGRESS': 'INVESTIGATING',
      'COMPLETED': 'RESOLVED', 
      'CANCELLED': 'CLOSED',
      'RESCHEDULED': 'ACKNOWLEDGED'
    };
    return statusMap[status] || 'SUBMITTED';
  }

  private getIncidentTitle(anomalyType: string): string {
    const titleMap = {
      'LATE_ARRIVAL': 'Late Arrival Detected',
      'EARLY_DEPARTURE': 'Early Departure Detected', 
      'MISSED_CLOCK_OUT': 'Missed Clock Out',
      'OVERTIME_THRESHOLD': 'Overtime Threshold Exceeded'
    };
    return titleMap[anomalyType] || 'Attendance Anomaly';
  }

  private getDefaultAction(anomalyType: string): string {
    const actionMap = {
      'LATE_ARRIVAL': 'Employee notified, supervisor informed',
      'EARLY_DEPARTURE': 'Reason documented, supervisor approval required',
      'MISSED_CLOCK_OUT': 'Automatic notification sent, manual verification needed',
      'OVERTIME_THRESHOLD': 'Overtime recorded, payroll adjustment processed'
    };
    return actionMap[anomalyType] || 'Standard protocol followed';
  }

  /**
   * Map InvoiceResponse to InvoiceDto for client portal
   */
  private mapInvoiceResponsesToDto(invoices: any[]): any[] {
    return invoices.map(invoice => ({
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      client: {
        id: invoice.contract.client.id,
        name: invoice.contract.client?.name || 'Unknown Client',
        contactEmail: invoice.contract.client?.contactEmail || '',
        billingAddress: invoice.contract.client?.contactInfo?.address || '',
      },
      billingPeriod: {
        start: invoice.billingPeriodStart,
        end: invoice.billingPeriodEnd,
      },
      status: invoice.status,
      paymentStatus: this.mapInvoiceStatusToPaymentStatus(invoice.status),
      lineItems: [], // Mock empty for now - would need actual line items
      subtotal: invoice.subtotal || 0,
      taxAmount: invoice.taxAmount || 0,
      totalAmount: invoice.totalAmount || 0,
      amountPaid: invoice.status === 'PAID' ? invoice.totalAmount : 0,
      outstandingAmount: invoice.status === 'PAID' ? 0 : invoice.totalAmount,
      invoiceDate: invoice.createdAt,
      dueDate: invoice.dueDate,
      paymentTerms: '15 days from invoice date',
      notes: invoice.notes,
    }));
  }

  /**
   * Map invoice status to payment status
   */
  private mapInvoiceStatusToPaymentStatus(status: string): string {
    switch (status) {
      case 'PAID': return 'PAID';
      case 'SENT': case 'VIEWED': return 'PENDING';
      case 'OVERDUE': return 'OVERDUE';
      default: return 'PENDING';
    }
  }
}