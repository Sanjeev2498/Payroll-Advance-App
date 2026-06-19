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
  assignmentId: string
  siteId: string
  shiftDate: string
  startTime: string
  endTime: string
  shiftType: 'REGULAR' | 'OVERTIME' | 'HOLIDAY'
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
  notes: Record<string, any>
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
  status: 'CLOCKED_IN' | 'CLOCKED_OUT' | 'NO_SHOW' | 'LATE' | 'EARLY_DEPARTURE'
  verificationData: Record<string, any>
  createdAt: string
  updatedAt: string
  
  // Relations
  employee?: Employee
  shift?: Shift
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
export interface User {
  id: string
  companyId: string
  email: string
  firstName: string
  lastName: string
  role: 'SUPER_ADMIN' | 'COMPANY_ADMIN' | 'MANAGER' | 'SUPERVISOR' | 'EMPLOYEE'
  status: 'ACTIVE' | 'INACTIVE' | 'PENDING'
  lastLoginAt?: string
  createdAt: string
  updatedAt: string
  
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