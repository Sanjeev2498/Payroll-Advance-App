export interface KPIMetrics {
  activeGuards: number
  activeSites: number
  guardsOnDuty: number
  vacantPositions: number
  attendanceStatus: {
    present: number
    late: number
    absent: number
    totalScheduled: number
  }
  payrollStatus: {
    processed: number
    pending: number
    totalAmount: number
    nextRunDate: string
  }
  pendingApprovals: {
    attendance: number
    assignments: number
    payroll: number
    total: number
  }
  billingOverview: {
    monthlyRevenue: number
    outstandingInvoices: number
    paidInvoices: number
    totalBilled: number
  }
}

export interface ActivityTimelineItem {
  id: string
  type: 'attendance' | 'assignment' | 'payroll' | 'billing' | 'alert'
  title: string
  description: string
  timestamp: string
  severity?: 'low' | 'medium' | 'high' | 'critical'
  user?: {
    name: string
    role: string
  }
  metadata?: Record<string, any>
}

export interface NotificationItem {
  id: string
  type: 'system' | 'payroll' | 'compliance' | 'attendance' | 'billing'
  title: string
  message: string
  timestamp: string
  read: boolean
  severity: 'info' | 'warning' | 'error' | 'success'
  actionRequired?: boolean
  actionUrl?: string
}

export interface DeploymentMetrics {
  siteDeployments: Array<{
    siteId: string
    siteName: string
    clientName: string
    requiredGuards: number
    assignedGuards: number
    onDutyGuards: number
    vacancies: number
    operationalStatus: 'optimal' | 'understaffed' | 'critical' | 'offline'
  }>
  totalDeployments: number
  optimalSites: number
  understaffedSites: number
  criticalSites: number
}

export interface GuardAvailability {
  totalGuards: number
  availableNow: number
  onDuty: number
  unavailable: number
  onLeave: number
  unassigned: number
  skillBreakdown: Array<{
    skill: string
    available: number
    required: number
  }>
}

export interface RealTimeAlert {
  id: string
  type: 'attendance' | 'security' | 'system' | 'staffing'
  severity: 'low' | 'medium' | 'high' | 'critical'
  title: string
  description: string
  siteId?: string
  siteName?: string
  employeeId?: string
  employeeName?: string
  timestamp: string
  acknowledged: boolean
  resolvedAt?: string
}

export interface SiteDeploymentDetail {
  siteId: string
  siteName: string
  clientName: string
  requiredGuards: number
  assignedGuards: number
  onDutyGuards: number
  vacancies: number
  operationalStatus: 'optimal' | 'understaffed' | 'critical' | 'offline'
  shiftCoverage?: number // Percentage
  lastUpdate?: string
  address?: string
  contactInfo?: {
    name: string
    phone: string
    email: string
  }
  requirements?: {
    skills: string[]
    minimumExperience: number
    shiftPattern: string
  }
  performance?: {
    attendanceRate: number
    incidentCount: number
    clientSatisfaction: number
  }
}

export interface AssignmentConflict {
  id: string
  type: 'scheduling' | 'skill_mismatch' | 'availability' | 'double_booking'
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  affectedSites: string[]
  affectedGuards: string[]
  suggestedResolution?: string
  createdAt: string
  resolvedAt?: string
}

export interface DeploymentEfficiencyMetrics {
  averageEfficiency: number // Percentage
  deploymentTrend: 'up' | 'down' | 'stable'
  optimizationOpportunities: Array<{
    siteId: string
    siteName: string
    currentEfficiency: number
    potentialEfficiency: number
    recommendations: string[]
  }>
  responseTime: {
    averageAssignmentTime: number // minutes
    emergencyResponseTime: number // minutes
    targetResponseTime: number // minutes
  }
  costMetrics: {
    deploymentCostPerSite: number
    overtimeCosts: number
    replacementCosts: number
    totalMonthlyCost: number
  }
}

export interface GuardAssignmentRequest {
  guardId: string
  siteId: string
  startDate: string
  endDate?: string
  shiftPattern: string
  role: string
  priority: 'low' | 'medium' | 'high' | 'critical'
}

export interface EmergencyReplacementRequest {
  siteId: string
  originalGuardId?: string
  reason: string
  urgency: 'immediate' | 'within_hour' | 'within_shift'
  requiredSkills?: string[]
  minimumExperience?: number
}

export interface DeploymentAnalytics {
  timeframe: '24h' | '7d' | '30d'
  metrics: {
    totalDeployments: number
    successfulAssignments: number
    emergencyReplacements: number
    averageResponseTime: number
    siteCoverageRate: number
    guardUtilizationRate: number
  }
  trends: Array<{
    date: string
    deployments: number
    efficiency: number
    conflicts: number
    alerts: number
  }>
  topPerformingSites: Array<{
    siteId: string
    siteName: string
    efficiency: number
    attendanceRate: number
  }>
  improvementAreas: Array<{
    area: string
    impact: 'high' | 'medium' | 'low'
    recommendation: string
    estimatedSavings?: number
  }>
}

export interface OperationsOverview {
  kpis: KPIMetrics
  deploymentMetrics: DeploymentMetrics
  guardAvailability: GuardAvailability
  recentActivity: ActivityTimelineItem[]
  notifications: NotificationItem[]
  realTimeAlerts: RealTimeAlert[]
}