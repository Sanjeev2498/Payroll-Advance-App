// Core business entities
export interface Company {
  id: string
  name: string
  slug: string
  settings: Record<string, any>
  branding: Record<string, any>
  createdAt: string
  updatedAt: string
}

export interface Client {
  id: string
  companyId: string
  name: string
  contactEmail: string
  contactInfo: Record<string, any>
  contractStatus: 'ACTIVE' | 'PENDING' | 'EXPIRED' | 'CANCELLED'
  contractStart: string
  contractEnd: string
  billingPreferences: Record<string, any>
  createdAt: string
  updatedAt: string
}

export interface Site {
  id: string
  clientId: string
  name: string
  address: Record<string, any>
  accessRequirements: Record<string, any>
  safetyProtocols: Record<string, any>
  operationalStatus: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE'
  contactInfo: Record<string, any>
  createdAt: string
  updatedAt: string
  
  // Relations
  client?: Client
}

export interface Employee {
  id: string
  companyId: string
  employeeNumber: string
  firstName: string
  lastName: string
  email: string
  phone: string
  address: Record<string, any>
  certifications: Record<string, any>
  skills: string[]
  employmentStatus: 'ACTIVE' | 'INACTIVE' | 'TERMINATED'
  hireDate: string
  createdAt: string
  updatedAt: string
}

export interface Assignment {
  id: string
  employeeId: string
  siteId: string
  role: string
  responsibilities: Record<string, any>
  hourlyRate: number
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED'
  startDate: string
  endDate?: string
  createdAt: string
  updatedAt: string
  
  // Relations
  employee?: Employee
  site?: Site
}

export interface Shift {
  id: string
  assignmentId?: string | null
  siteId: string
  templateId?: string | null
  shiftDate: string
  startTime: string
  endTime: string
  shiftType: 'REGULAR' | 'OVERTIME' | 'HOLIDAY' | 'EMERGENCY'
  status: 'SCHEDULED' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'NEEDS_COVERAGE'
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'
  isRecurring: boolean
  recurringPattern?: Record<string, any>
  coverageRequired: number
  coverageAssigned: number
  skillRequirements?: string[] | Record<string, any>
  shiftRequirements?: Record<string, any>
  breakSchedule?: Record<string, any>
  notes: Record<string, any>
  modificationLog?: Array<Record<string, any>>
  createdAt: string
  updatedAt: string
  
  // Relations
  assignment?: Assignment
  site?: Site
}

export interface Attendance {
  id: string
  employeeId: string
  shiftId: string
  clockIn?: string
  clockOut?: string
  locationData: Record<string, any>
  status: 'PRESENT' | 'LATE' | 'ABSENT' | 'EARLY_DEPARTURE' | 'OVERTIME' | 'PENDING'
  verificationData: Record<string, any>
  notes?: string
  createdAt: string
  updatedAt: string
  
  // Calculated fields
  hoursWorked?: number
  overtimeHours?: number
  isLate?: boolean
  isEarlyDeparture?: boolean
  
  // Relations
  employee?: Employee
  shift?: Shift
}

export interface AttendanceAnomaly {
  id: string
  attendanceId: string
  type: 'LATE_ARRIVAL' | 'EARLY_DEPARTURE' | 'NO_SHOW' | 'EXCESSIVE_HOURS' | 'OVERTIME' | 'LOCATION_MISMATCH'
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  description: string
  metadata: Record<string, any>
  detectedAt: string
  resolvedAt?: string
  resolvedBy?: string
}

export interface AttendanceStats {
  totalRecords: number
  presentCount: number
  lateCount: number
  absentCount: number
  overtimeCount: number
  attendanceRate: number
  averageHoursWorked: number
  totalOvertimeHours: number
}

export interface ClockAction {
  success: boolean
  action: 'CLOCK_IN' | 'CLOCK_OUT'
  timestamp: string
  attendance?: Attendance
  warnings?: string[]
  anomalies?: AttendanceAnomaly[]
  nextExpectedAction: 'CLOCK_IN' | 'CLOCK_OUT' | 'NONE'
  hoursWorked?: number
  overtimeHours?: number
}

export interface AttendanceFilter {
  search?: string
  employeeId?: string
  shiftId?: string
  siteId?: string
  status?: string
  dateFrom?: string
  dateTo?: string
  anomaliesOnly?: boolean
  lateOnly?: boolean
  overtimeOnly?: boolean
  page?: number
  limit?: number
}

export interface PayrollRun {
  id: string
  companyId: string
  runNumber: string
  payPeriodStart: string
  payPeriodEnd: string
  status: 'DRAFT' | 'PROCESSING' | 'COMPLETED' | 'CANCELLED'
  totalAmount: number
  processedAt?: string
  createdAt: string
  updatedAt: string
}

export interface PayrollItem {
  id: string
  payrollRunId: string
  employeeId: string
  itemType: 'BASIC_PAY' | 'OVERTIME' | 'BONUS' | 'DEDUCTION' | 'TAX'
  description: string
  amount: number
  calculationData: Record<string, any>
  createdAt: string
  updatedAt: string
  
  // Relations
  payrollRun?: PayrollRun
  employee?: Employee
}

export interface Invoice {
  id: string
  clientId: string
  invoiceNumber: string
  billingPeriodStart: string
  billingPeriodEnd: string
  subtotal: number
  taxAmount: number
  totalAmount: number
  status: 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE' | 'CANCELLED'
  dueDate: string
  createdAt: string
  updatedAt: string
  
  // Relations
  client?: Client
}

// User management
export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  COMPANY_ADMIN = 'COMPANY_ADMIN',
  MANAGER = 'MANAGER',
  SUPERVISOR = 'SUPERVISOR',
  EMPLOYEE = 'EMPLOYEE',
}

export interface User {
  id: string
  companyId: string
  email: string
  firstName: string
  lastName: string
  role: UserRole
  status: 'ACTIVE' | 'INACTIVE' | 'PENDING'
  lastLoginAt?: string
  createdAt: string
  updatedAt: string
  
  // Multi-tenant fields (for compatibility with auth store)
  tenantId: string
  tenantName: string
  
  // Relations
  company?: Company
}

// API Response types
export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    hasNext: boolean
    hasPrevious: boolean
  }
}

// Specific attendance response type
export interface AttendancePaginatedResponse extends PaginatedResponse<Attendance> {
  attendance: Attendance[]
  stats: AttendanceStats
  page: number
  limit: number
  total: number
  hasNext: boolean
  hasPrevious: boolean
}

// Dashboard types
export interface DashboardMetrics {
  totalEmployees: number
  activeAssignments: number
  sitesOperational: number
  attendanceRate: number
  totalRevenue: number
  pendingPayroll: number
  
  // Trend data
  employeeCountTrend: Array<{ date: string; count: number }>
  attendanceTrend: Array<{ date: string; rate: number }>
  revenueTrend: Array<{ date: string; amount: number }>
}

// Form types
export interface LoginForm {
  email: string
  password: string
}

export interface CreateClientForm {
  name: string
  contactEmail: string
  contractStart: string
  contractEnd: string
  contactInfo: {
    primaryContact: string
    phone: string
    address: {
      street: string
      city: string
      state: string
      zipCode: string
    }
  }
  billingPreferences: {
    billingCycle: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY'
    paymentTerms: number
  }
}

export interface CreateEmployeeForm {
  employeeNumber: string
  firstName: string
  lastName: string
  email: string
  phone: string
  hireDate: string
  skills: string[]
  address: {
    street: string
    city: string
    state: string
    zipCode: string
  }
}