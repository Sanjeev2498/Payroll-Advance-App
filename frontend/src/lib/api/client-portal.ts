/**
 * Client Portal API Service
 * Handles all client self-service portal API interactions
 */

import { apiClient } from './client';

// Types for API responses
export interface ClientDashboardData {
  siteOverview: {
    totalSites: number;
    activeSites: number;
    inactiveSites: number;
    sitesWithIssues: number;
  };
  guardDeployment: {
    totalGuards: number;
    activeGuards: number;
    onDutyGuards: number;
    vacantPositions: number;
  };
  attendanceMetrics: {
    attendanceRate: number;
    lateArrivals: number;
    earlyDepartures: number;
    missedShifts: number;
  };
  recentIncidents: Array<{
    id: string;
    type: string;
    siteName: string;
    employeeName?: string;
    timestamp: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  }>;
  notifications: Array<{
    id: string;
    type: string;
    message: string;
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
    timestamp: string;
    actionRequired: boolean;
  }>;
  siteHealth: Array<{
    siteId: string;
    siteName: string;
    healthScore: number;
    status: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' | 'CRITICAL';
    lastUpdate: string;
    issues: string[];
  }>;
}

export interface GuardMonitoringData {
  deploymentStatus: Array<{
    siteId: string;
    siteName: string;
    requiredGuards: number;
    assignedGuards: number;
    onDutyGuards: number;
    coverageStatus: 'FULLY_COVERED' | 'PARTIALLY_COVERED' | 'UNCOVERED' | 'OVER_STAFFED';
    guards: Array<{
      guardId: string;
      guardName: string;
      status: 'ON_DUTY' | 'OFF_DUTY' | 'ON_BREAK' | 'LATE' | 'ABSENT' | 'EMERGENCY';
      shiftStart: string;
      shiftEnd: string;
      location?: { lat: number; lng: number };
      lastCheckIn: string;
      photo?: string;
      contactNumber?: string;
      emergencyContact?: string;
    }>;
  }>;
  guardPerformance: Array<{
    guardId: string;
    guardName: string;
    attendanceRate: number;
    punctualityScore: number;
    recentIncidents: number;
    clientRating: number;
    lastPerformanceReview: string;
  }>;
  coverageVisualization: {
    totalSites: number;
    fullyCovered: number;
    partiallyCovered: number;
    uncovered: number;
    overStaffed: number;
  };
}

export interface AttendanceData {
  dashboardMetrics: {
    totalShifts: number;
    presentGuards: number;
    absentGuards: number;
    lateGuards: number;
    attendanceRate: number;
  };
  attendanceRecords: Array<{
    id: string;
    guard: {
      id: string;
      name: string;
      employeeNumber: string;
      photo?: string;
    };
    site: {
      id: string;
      name: string;
      address: string;
    };
    shift: {
      id: string;
      date: string;
      startTime: string;
      endTime: string;
    };
    clockIn: string;
    clockOut?: string;
    status: 'PRESENT' | 'LATE' | 'EARLY_DEPARTURE' | 'ABSENT' | 'ON_LEAVE' | 'OVERTIME';
    hoursWorked: number;
    overtimeHours: number;
    gpsVerification: {
      clockInLocation?: { lat: number; lng: number; accuracy: number };
      clockOutLocation?: { lat: number; lng: number; accuracy: number };
      verified: boolean;
    };
    anomalies: string[];
  }>;
  anomalies: Array<{
    type: string;
    guardName: string;
    siteName: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    timestamp: string;
    details: string;
  }>;
  siteSummary: Array<{
    siteId: string;
    siteName: string;
    totalGuards: number;
    presentGuards: number;
    attendanceRate: number;
    issues: number;
  }>;
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

/**
 * Client Portal API Service Class
 */
export class ClientPortalService {
  private baseUrl = '/client-portal';

  /**
   * Get client dashboard data
   */
  async getDashboard(clientId: string, startDate?: string, endDate?: string): Promise<ClientDashboardData> {
    const params = new URLSearchParams({ clientId });
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);

    const response = await apiClient.get(`${this.baseUrl}/dashboard?${params}`);
    return response.data;
  }

  /**
   * Get guard monitoring data
   */
  async getGuardMonitoring(
    clientId: string, 
    siteId?: string, 
    status?: string, 
    date?: string
  ): Promise<GuardMonitoringData> {
    const params = new URLSearchParams({ clientId });
    if (siteId) params.append('siteId', siteId);
    if (status) params.append('status', status);
    if (date) params.append('date', date);

    const response = await apiClient.get(`${this.baseUrl}/guard-monitoring?${params}`);
    return response.data;
  }

  /**
   * Request guard replacement
   */
  async requestGuardReplacement(clientId: string, requestData: {
    siteId: string;
    currentGuardId?: string;
    reason: string;
    urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'EMERGENCY';
    preferredStartTime: string;
    durationHours: number;
    specialRequirements?: string;
  }) {
    const response = await apiClient.post(
      `${this.baseUrl}/guard-replacement?clientId=${clientId}`, 
      requestData
    );
    return response.data;
  }

  /**
   * Get attendance management data
   */
  async getAttendance(
    clientId: string,
    siteId?: string,
    dateFrom?: string,
    dateTo?: string,
    guardId?: string,
    page: number = 1,
    limit: number = 20
  ): Promise<AttendanceData> {
    const params = new URLSearchParams({ 
      clientId, 
      page: page.toString(), 
      limit: limit.toString() 
    });
    if (siteId) params.append('siteId', siteId);
    if (dateFrom) params.append('dateFrom', dateFrom);
    if (dateTo) params.append('dateTo', dateTo);
    if (guardId) params.append('guardId', guardId);

    const response = await apiClient.get(`${this.baseUrl}/attendance?${params}`);
    return response.data;
  }

  /**
   * Get attendance trends
   */
  async getAttendanceTrends(
    clientId: string,
    dateFrom?: string,
    dateTo?: string
  ) {
    const params = new URLSearchParams({ clientId });
    if (dateFrom) params.append('dateFrom', dateFrom);
    if (dateTo) params.append('dateTo', dateTo);

    const response = await apiClient.get(`${this.baseUrl}/attendance/trends?${params}`);
    return response.data;
  }

  /**
   * Get billing data
   */
  async getBilling(
    clientId: string,
    status?: string,
    dateFrom?: string,
    dateTo?: string,
    page: number = 1,
    limit: number = 20
  ) {
    const params = new URLSearchParams({ 
      clientId, 
      page: page.toString(), 
      limit: limit.toString() 
    });
    if (status) params.append('status', status);
    if (dateFrom) params.append('dateFrom', dateFrom);
    if (dateTo) params.append('dateTo', dateTo);

    const response = await apiClient.get(`${this.baseUrl}/billing?${params}`);
    return response.data;
  }

  /**
   * Download invoice PDF
   */
  async downloadInvoice(clientId: string, invoiceId: string) {
    const response = await apiClient.post(
      `${this.baseUrl}/invoices/${invoiceId}/download?clientId=${clientId}`
    );
    return response.data;
  }

  /**
   * Get reports and analytics
   */
  async getReports(
    clientId: string,
    reportType?: string,
    startDate: string,
    endDate: string,
    siteIds?: string[],
    format: 'PDF' | 'EXCEL' | 'CSV' = 'PDF'
  ) {
    const params = new URLSearchParams({ 
      clientId, 
      startDate, 
      endDate, 
      format 
    });
    if (reportType) params.append('reportType', reportType);
    if (siteIds?.length) {
      siteIds.forEach(id => params.append('siteIds', id));
    }

    const response = await apiClient.get(`${this.baseUrl}/reports?${params}`);
    return response.data;
  }

  /**
   * Download report
   */
  async downloadReport(reportData: {
    clientId: string;
    reportType?: string;
    startDate: string;
    endDate: string;
    siteIds?: string[];
    format?: 'PDF' | 'EXCEL' | 'CSV';
  }) {
    const response = await apiClient.post(`${this.baseUrl}/reports/download`, reportData);
    return response.data;
  }

  /**
   * Get communication data
   */
  async getCommunicationData(clientId: string) {
    const response = await apiClient.get(`${this.baseUrl}/communication?clientId=${clientId}`);
    return response.data;
  }

  /**
   * Submit complaint
   */
  async submitComplaint(clientId: string, complaintData: {
    type: string;
    subject: string;
    description: string;
    siteId: string;
    guardId?: string;
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
    attachments?: string[];
  }) {
    const response = await apiClient.post(
      `${this.baseUrl}/complaints?clientId=${clientId}`, 
      complaintData
    );
    return response.data;
  }

  /**
   * Submit service request
   */
  async submitServiceRequest(clientId: string, requestData: {
    type: string;
    title: string;
    description: string;
    siteId: string;
    urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'EMERGENCY';
    preferredDate: string;
    duration?: string;
    specialRequirements?: string;
  }) {
    const response = await apiClient.post(
      `${this.baseUrl}/service-requests?clientId=${clientId}`, 
      requestData
    );
    return response.data;
  }
}

// Export singleton instance
export const clientPortalService = new ClientPortalService();