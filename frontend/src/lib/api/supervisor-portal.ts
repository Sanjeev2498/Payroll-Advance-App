import { apiClient } from '@/lib/api/client'

// Supervisor Portal API Interface
export interface SupervisorDashboardQuery {
  date?: string
  siteIds?: string[]
  includeHistorical?: boolean
}

export interface AttendanceApproval {
  attendanceId: string
  action: 'APPROVE' | 'REJECT'
  notes?: string
}

export interface EmergencyReplacement {
  siteId: string
  shiftId: string
  originalEmployeeId?: string
  replacementEmployeeId?: string
  reason: string
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
}

export interface SiteHealthQuery {
  siteIds?: string[]
  includeDetails?: boolean
}

export interface MusterRollQuery {
  date?: string
  siteIds?: string[]
  shiftPattern?: string
}

export interface SupervisorDashboardData {
  supervisorId: string
  targetDate: string
  assignedSites: any[]
  overview: {
    totalSites: number
    activeSites: number
    totalGuards: number
    guardsOnDuty: number
    pendingApprovals: number
    activeAlerts: number
  }
  sitesOverview: any
  deploymentStatus: any
  attendanceOverview: any
  pendingApprovals: any[]
  activeAlerts: any[]
  todayStats: any
}

export interface SiteHealthData {
  overallHealth: string
  overallScore: number
  sites: Array<{
    siteId: string
    siteName: string
    overallHealth: string
    overallScore: number
    metrics: {
      deployment: any
      attendance: any
      incidents: any
    }
    lastUpdated: string
  }>
  summary: {
    healthySites: number
    warningSites: number
    criticalSites: number
  }
}

export interface MusterRollData {
  date: string
  sites: Array<{
    siteId: string
    siteName: string
    employees: Array<{
      employeeId: string
      employeeNumber: string
      name: string
      role: string
      email: string
      phone: string
      shiftDetails: {
        shiftId: string
        startTime: string
        endTime: string
        status: string
      } | null
      attendanceStatus: string
      clockIn: string | null
      clockOut: string | null
      employmentStatus: string
    }>
  }>
  summary: {
    totalEmployees: number
    presentEmployees: number
    lateEmployees: number
    absentEmployees: number
    attendanceRate: number
  }
}

// Supervisor Portal API Service
export const supervisorPortalApi = {
  // Get supervisor dashboard overview
  getDashboard: async (query?: SupervisorDashboardQuery): Promise<SupervisorDashboardData> => {
    const response = await apiClient.get('/supervisor-portal/dashboard', { params: query });
    return response.data.data || response.data;
  },

  // Get site health monitoring data
  getSiteHealth: async (query?: SiteHealthQuery): Promise<SiteHealthData> => {
    const response = await apiClient.get('/supervisor-portal/sites/health', { params: query });
    return response.data.data || response.data;
  },

  // Get daily muster roll
  getMusterRoll: async (query?: MusterRollQuery): Promise<MusterRollData> => {
    const response = await apiClient.get('/supervisor-portal/muster-roll', { params: query });
    return response.data.data || response.data;
  },

  // Process attendance approval
  processAttendanceApproval: (approval: AttendanceApproval): Promise<any> =>
    apiClient.post('/supervisor-portal/attendance/approval', approval),

  // Handle emergency replacement
  handleEmergencyReplacement: (replacement: EmergencyReplacement): Promise<any> =>
    apiClient.post('/supervisor-portal/emergency-replacement', replacement),

  // Get operational notifications
  getNotifications: async (query?: { priority?: string; type?: string; unreadOnly?: boolean; limit?: number }): Promise<any[]> => {
    const response = await apiClient.get('/supervisor-portal/notifications', { params: query });
    return response.data.data || response.data;
  },

  // Create incident report
  createIncident: (incident: {
    siteId: string
    title: string
    description: string
    category: 'SECURITY' | 'SAFETY' | 'MAINTENANCE' | 'OPERATIONAL' | 'OTHER'
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
    reportedBy?: string
    location?: string
    notes?: string
  }): Promise<any> =>
    apiClient.post('/supervisor-portal/incidents', incident),

  // Get site deployment details
  getDeploymentDetails: (siteId: string): Promise<any> =>
    apiClient.get(`/supervisor-portal/sites/${siteId}/deployment`),

  // Get attendance corrections pending approval
  getPendingAttendanceCorrections: async (): Promise<any[]> => {
    const response = await apiClient.get('/supervisor-portal/attendance/pending');
    return response.data.data || response.data;
  },

  // Get available replacement employees
  getAvailableReplacements: async (siteId: string, shiftId: string): Promise<any[]> => {
    const response = await apiClient.get(`/supervisor-portal/sites/${siteId}/shifts/${shiftId}/replacements`);
    return response.data.data || response.data;
  },

  // Update site status
  updateSiteStatus: async (siteId: string, status: string): Promise<any> => {
    const response = await apiClient.put(`/supervisor-portal/sites/${siteId}/status`, { status });
    return response.data.data || response.data;
  },

  // Mark notification as read
  markNotificationRead: async (notificationId: string): Promise<void> => {
    await apiClient.put(`/supervisor-portal/notifications/${notificationId}/read`);
  },

  // Update attendance status for a specific employee and date
  updateAttendance: async (updateData: {
    employeeId: string;
    shiftId?: string;
    date: string;
    status: string;
    changeType?: 'SAME_DAY' | 'PREVIOUS_DAY';
    reason?: string;
    oldStatus?: string;
    daysDifference?: number;
  }): Promise<any> => {
    const response = await apiClient.post('/supervisor-portal/attendance/update', updateData);
    return response.data.data || response.data;
  },
  getStats: async (period?: 'today' | 'week' | 'month'): Promise<any> => {
    const response = await apiClient.get('/supervisor-portal/stats', { params: { period } });
    return response.data.data || response.data;
  },
}