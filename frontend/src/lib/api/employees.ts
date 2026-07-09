import { apiClient } from '@/lib/api/client'

// Employee-related types
export interface EmployeeSkill {
  name: string
  level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT'
  certificationRequired: boolean
}

export interface EmployeeCertification {
  id: string
  name: string
  issuingOrganization: string
  issueDate: string
  expiryDate?: string
  documentUrl?: string
  verificationStatus: 'PENDING' | 'VERIFIED' | 'EXPIRED' | 'REJECTED'
}

export interface EmployeeAvailability {
  daysAvailable: string[]
  shiftPreferences: string[]
  maxHoursPerWeek?: number
  unavailableDates?: string[]
  notes?: string
}

export interface EmployeePerformanceMetrics {
  overallRating?: number
  punctualityScore?: number
  qualityRating?: number
  clientFeedbackScore?: number
  lastReviewDate?: string
  nextReviewDate?: string
}

export interface EmployeeComplianceStatus {
  backgroundCheckStatus: 'PENDING' | 'CLEARED' | 'FAILED' | 'EXPIRED'
  backgroundCheckDate?: string
  drugTestStatus: 'PENDING' | 'PASSED' | 'FAILED' | 'EXPIRED'
  drugTestDate?: string
  trainingCompleted: string[]
  trainingPending: string[]
  complianceScore?: number
}

export interface EmployeeContactInfo {
  primaryPhone: string
  secondaryPhone?: string
  emergencyContact: {
    name: string
    relationship: string
    phone: string
    email?: string
  }
  address: {
    street: string
    city: string
    state: string
    zipCode: string
    country?: string
  }
  preferredContactMethod: 'EMAIL' | 'PHONE' | 'SMS'
}

export interface EmployeeResponseDto {
  id: string
  companyId: string
  employeeNumber: string
  firstName: string
  lastName: string
  email: string
  phone?: string | null
  contactInfo?: EmployeeContactInfo
  employmentStatus: 'ACTIVE' | 'INACTIVE' | 'ON_LEAVE' | 'TERMINATED'
  employmentType?: 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'TEMPORARY'
  department?: string
  jobTitle?: string
  hireDate: string
  terminationDate?: string
  skills?: EmployeeSkill[]
  certifications?: EmployeeCertification[]
  complianceStatus?: EmployeeComplianceStatus
  availability?: EmployeeAvailability
  performanceMetrics?: EmployeePerformanceMetrics
  hourlyRate?: number
  metadata?: Record<string, any>
  createdAt: string
  updatedAt: string
}

export interface CreateEmployeeDto {
  employeeNumber: string
  firstName: string
  lastName: string
  email: string
  phone: string
  contactInfo?: EmployeeContactInfo
  employmentType?: 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'TEMPORARY'
  department?: string
  jobTitle?: string
  hireDate: string
  skills?: EmployeeSkill[]
  certifications?: EmployeeCertification[]
  complianceStatus?: EmployeeComplianceStatus
  availability?: EmployeeAvailability
  hourlyRate?: number
  metadata?: Record<string, any>
}

export interface UpdateEmployeeDto extends Partial<CreateEmployeeDto> {
  employmentStatus?: 'ACTIVE' | 'INACTIVE' | 'ON_LEAVE' | 'TERMINATED'
  terminationDate?: string
  performanceMetrics?: EmployeePerformanceMetrics
}

export interface EmployeeQueryDto {
  search?: string
  employmentStatus?: 'ACTIVE' | 'INACTIVE' | 'ON_LEAVE' | 'TERMINATED'
  skills?: string[]
  department?: string
  jobTitle?: string
  hireDateFrom?: string
  hireDateTo?: string
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface EmployeeListResponseDto {
  employees: EmployeeResponseDto[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface EmployeeStatsResponseDto {
  total: number
  active: number
  inactive: number
  onLeave: number
  terminated: number
  certificationsExpiringSoon: number
  complianceIssues: number
  averagePerformanceRating: number
}

export interface EmployeeSearchDto {
  requiredSkills?: string[]
  location?: string
  maxDistance?: number
  availableFrom?: string
  availableUntil?: string
  minPerformanceRating?: number
}

export interface SkillMatchDto {
  employee: EmployeeResponseDto
  matchPercentage: number
  matchedSkills: string[]
  missingSkills: string[]
  availabilityScore: number
}

export interface DocumentResponseDto {
  id: string
  employeeId: string
  type: string
  name: string
  filePath: string
  fileSize: number
  uploadedAt: string
  status: string
  expiryDate?: string
  metadata?: Record<string, any>
}

export interface DocumentUploadDto {
  type: string
  name: string
  expiryDate?: string
  metadata?: Record<string, any>
}

export interface DocumentQueryDto {
  type?: string
  status?: string
}

export const employeesApi = {
  // Get all employees with filtering and pagination
  async getEmployees(queryDto: EmployeeQueryDto = {}): Promise<EmployeeListResponseDto> {
    const params = new URLSearchParams()
    
    if (queryDto.search) params.append('search', queryDto.search)
    if (queryDto.employmentStatus) params.append('employmentStatus', queryDto.employmentStatus)
    if (queryDto.skills?.length) params.append('skills', queryDto.skills.join(','))
    if (queryDto.department) params.append('department', queryDto.department)
    if (queryDto.jobTitle) params.append('jobTitle', queryDto.jobTitle)
    if (queryDto.hireDateFrom) params.append('hireDateFrom', queryDto.hireDateFrom)
    if (queryDto.hireDateTo) params.append('hireDateTo', queryDto.hireDateTo)
    if (queryDto.page) params.append('page', queryDto.page.toString())
    if (queryDto.limit) params.append('limit', queryDto.limit.toString())
    if (queryDto.sortBy) params.append('sortBy', queryDto.sortBy)
    if (queryDto.sortOrder) params.append('sortOrder', queryDto.sortOrder)
    
    const url = `/employees${params.toString() ? `?${params.toString()}` : ''}`
    const response = await apiClient.get<EmployeeListResponseDto>(url)
    return response.data
  },

  // Get employee by ID
  async getEmployee(id: string): Promise<EmployeeResponseDto> {
    const response = await apiClient.get<EmployeeResponseDto>(`/employees/${id}`)
    return response.data
  },

  // Create new employee
  async createEmployee(employeeData: CreateEmployeeDto): Promise<EmployeeResponseDto> {
    const response = await apiClient.post<EmployeeResponseDto>('/employees', employeeData)
    return response.data
  },

  // Update employee
  async updateEmployee(id: string, employeeData: UpdateEmployeeDto): Promise<EmployeeResponseDto> {
    const response = await apiClient.patch<EmployeeResponseDto>(`/employees/${id}`, employeeData)
    return response.data
  },

  // Delete employee (soft delete)
  async deleteEmployee(id: string): Promise<EmployeeResponseDto> {
    const response = await apiClient.delete<EmployeeResponseDto>(`/employees/${id}`)
    return response.data
  },

  // Get employee statistics
  async getStats(): Promise<EmployeeStatsResponseDto> {
    const response = await apiClient.get<EmployeeStatsResponseDto>('/employees/stats')
    return response.data
  },

  // Search employees with advanced criteria
  async searchEmployees(searchDto: EmployeeSearchDto): Promise<SkillMatchDto[]> {
    const params = new URLSearchParams()
    
    if (searchDto.requiredSkills?.length) params.append('requiredSkills', searchDto.requiredSkills.join(','))
    if (searchDto.location) params.append('location', searchDto.location)
    if (searchDto.maxDistance) params.append('maxDistance', searchDto.maxDistance.toString())
    if (searchDto.availableFrom) params.append('availableFrom', searchDto.availableFrom)
    if (searchDto.availableUntil) params.append('availableUntil', searchDto.availableUntil)
    if (searchDto.minPerformanceRating) params.append('minPerformanceRating', searchDto.minPerformanceRating.toString())
    
    const url = `/employees/search${params.toString() ? `?${params.toString()}` : ''}`
    const response = await apiClient.get<SkillMatchDto[]>(url)
    return response.data
  },

  // Find employees by skills
  async getEmployeesBySkills(skills: string[]): Promise<EmployeeResponseDto[]> {
    const params = new URLSearchParams()
    params.append('skills', skills.join(','))
    
    const response = await apiClient.get<EmployeeResponseDto[]>(`/employees/by-skills?${params.toString()}`)
    return response.data
  },

  // Find available employees
  async getAvailableEmployees(startDate?: string, endDate?: string, requiredSkills?: string[]): Promise<EmployeeResponseDto[]> {
    const params = new URLSearchParams()
    
    if (startDate) params.append('startDate', startDate)
    if (endDate) params.append('endDate', endDate)
    if (requiredSkills?.length) params.append('requiredSkills', requiredSkills.join(','))
    
    const url = `/employees/available${params.toString() ? `?${params.toString()}` : ''}`
    const response = await apiClient.get<EmployeeResponseDto[]>(url)
    return response.data
  },

  // Find employees with expiring certifications
  async getEmployeesWithExpiringCertifications(days: number = 30): Promise<EmployeeResponseDto[]> {
    const response = await apiClient.get<EmployeeResponseDto[]>(`/employees/expiring-certifications?days=${days}`)
    return response.data
  },

  // Get employee documents
  async getEmployeeDocuments(employeeId: string, queryDto: DocumentQueryDto = {}): Promise<DocumentResponseDto[]> {
    const params = new URLSearchParams()
    
    if (queryDto.type) params.append('type', queryDto.type)
    if (queryDto.status) params.append('status', queryDto.status)
    
    const url = `/employees/${employeeId}/documents${params.toString() ? `?${params.toString()}` : ''}`
    const response = await apiClient.get<DocumentResponseDto[]>(url)
    return response.data
  },

  // Upload employee document
  async uploadEmployeeDocument(employeeId: string, documentData: DocumentUploadDto): Promise<DocumentResponseDto> {
    const response = await apiClient.post<DocumentResponseDto>(`/employees/${employeeId}/documents`, documentData)
    return response.data
  }
}