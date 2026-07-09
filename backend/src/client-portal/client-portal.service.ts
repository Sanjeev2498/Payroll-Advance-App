import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
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
  CreateComplaintDto,
  CreateServiceRequestDto,
  GuardReplacementRequestDto,
} from './dto';
import { BillingService } from '../billing/billing.service';

@Injectable()
export class ClientPortalService {
  private readonly logger = new Logger(ClientPortalService.name);

  constructor(
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

    // Mock implementation - in production, this would create actual complaint records
    const complaintId = `comp-${Date.now()}`;

    this.logger.log(`Created complaint ${complaintId} for client ${clientId}`);

    return {
      id: complaintId,
      status: 'SUBMITTED',
      submittedAt: new Date().toISOString(),
      message: 'Your complaint has been submitted and will be reviewed within 24 hours.',
    };
  }

  /**
   * Submit a service request
   */
  async submitServiceRequest(clientId: string, dto: CreateServiceRequestDto) {
    this.logger.log(`Submitting service request for client: ${clientId}`);

    await this.validateClientAccess(clientId);
    await this.validateSiteAccess(clientId, dto.siteId);

    // Mock implementation
    const requestId = `req-${Date.now()}`;

    this.logger.log(`Created service request ${requestId} for client ${clientId}`);

    return {
      id: requestId,
      status: 'SUBMITTED',
      submittedAt: new Date().toISOString(),
      estimatedResponse: this.calculateResponseTime(dto.urgency),
      message: 'Your request has been submitted and our team will respond shortly.',
    };
  }

  /**
   * Request guard replacement
   */
  async requestGuardReplacement(clientId: string, dto: GuardReplacementRequestDto) {
    this.logger.log(`Requesting guard replacement for client: ${clientId}`);

    await this.validateClientAccess(clientId);
    await this.validateSiteAccess(clientId, dto.siteId);

    // Mock implementation
    const requestId = `repl-${Date.now()}`;

    return {
      id: requestId,
      status: 'PROCESSING',
      submittedAt: new Date().toISOString(),
      estimatedFulfillment: this.calculateReplacementTime(dto.urgency),
      message: 'Guard replacement request is being processed. We will confirm availability shortly.',
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
    const site = await this.siteRepository.findById(siteId);
    if (!site || site.clientId !== clientId) {
      throw new BadRequestException(`Site ${siteId} does not belong to client ${clientId}`);
    }
  }

  /**
   * Validate invoice belongs to client
   */
  private async validateInvoiceAccess(clientId: string, invoiceId: string): Promise<void> {
    const invoice = await this.billingService.getInvoice(invoiceId);
    if (!invoice || invoice.client.id !== clientId) {
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
    // Mock implementation - in production, this would query actual data
    return {
      totalSites: 15,
      activeSites: 12,
      inactiveSites: 3,
      sitesWithIssues: 1,
    };
  }

  /**
   * Get guard deployment metrics
   */
  private async getGuardDeploymentMetrics(clientId: string) {
    return {
      totalGuards: 45,
      activeGuards: 42,
      onDutyGuards: 38,
      vacantPositions: 3,
    };
  }

  /**
   * Get attendance metrics
   */
  private async getAttendanceMetrics(clientId: string, startDate: Date, endDate: Date) {
    return {
      attendanceRate: 96.5,
      lateArrivals: 5,
      earlyDepartures: 2,
      missedShifts: 1,
    };
  }
  /**
   * Get recent incidents
   */
  private async getRecentIncidents(clientId: string) {
    return [
      {
        id: 'incident-1',
        type: 'LATE_ARRIVAL',
        siteName: 'Main Office',
        employeeName: 'John Doe',
        timestamp: '2024-01-15T08:15:00Z',
        severity: 'LOW' as const,
      },
    ];
  }

  /**
   * Get notifications
   */
  private async getNotifications(clientId: string) {
    return [
      {
        id: 'notification-1',
        type: 'GUARD_REPLACEMENT_REQUEST',
        message: 'Guard replacement needed at Site A',
        priority: 'HIGH' as const,
        timestamp: '2024-01-15T09:00:00Z',
        actionRequired: true,
      },
    ];
  }

  /**
   * Get site health indicators
   */
  private async getSiteHealthIndicators(clientId: string) {
    return [
      {
        siteId: 'site-1',
        siteName: 'Main Office',
        healthScore: 95,
        status: 'EXCELLENT' as const,
        lastUpdate: '2024-01-15T10:00:00Z',
        issues: [],
      },
    ];
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
  private async getIncidentReports(clientId: string) {
    return [];
  }

  private async getClientComplaints(clientId: string) {
    return [];
  }

  private async getServiceRequests(clientId: string) {
    return [];
  }

  private async getCommunicationStatistics(clientId: string) {
    return {
      totalIncidents: 12,
      openComplaints: 2,
      pendingRequests: 1,
      avgResolutionTime: 24,
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

  /**
   * Map InvoiceResponse to InvoiceDto for client portal
   */
  private mapInvoiceResponsesToDto(invoices: any[]): any[] {
    return invoices.map(invoice => ({
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      client: {
        id: invoice.clientId,
        name: invoice.client?.name || 'Unknown Client',
        contactEmail: invoice.client?.contactEmail || '',
        billingAddress: invoice.client?.contactInfo?.address || '',
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