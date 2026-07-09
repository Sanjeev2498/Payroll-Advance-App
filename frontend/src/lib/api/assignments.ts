import { apiClient } from '../api'
import { Assignment } from '@/types'

export interface AssignmentFilters {
  search?: string
  employeeId?: string
  siteId?: string
  status?: string
  role?: string
  startDateFrom?: string
  startDateTo?: string
  minHourlyRate?: number
  maxHourlyRate?: number
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface CreateAssignmentRequest {
  employeeId: string
  siteId: string
  role: string
  responsibilities?: Array<{
    name: string
    description?: string
    priority?: number
    requiredSkills?: string[]
  }>
  hourlyRate: number
  status?: 'ACTIVE' | 'INACTIVE' | 'COMPLETED' | 'CANCELLED'
  startDate: string
  endDate?: string
  shiftPatterns?: Array<{
    dayOfWeek: number
    startTime: string
    endTime: string
    breakDuration?: number
  }>
  priority?: number
  urgency?: number
  requiredCertifications?: string[]
  requiredSkills?: string[]
  notes?: string
  metadata?: any
}

export interface UpdateAssignmentRequest {
  role?: string
  responsibilities?: Array<{
    name: string
    description?: string
    priority?: number
    requiredSkills?: string[]
  }>
  hourlyRate?: number
  status?: 'ACTIVE' | 'INACTIVE' | 'COMPLETED' | 'CANCELLED'
  startDate?: string
  endDate?: string
  shiftPatterns?: Array<{
    dayOfWeek: number
    startTime: string
    endTime: string
    breakDuration?: number
  }>
  priority?: number
  urgency?: number
  requiredCertifications?: string[]
  requiredSkills?: string[]
  notes?: string
  metadata?: any
}

export interface AssignmentRecommendationRequest {
  siteId: string
  role: string
  requiredSkills?: string[]
  requiredCertifications?: string[]
  startDate: string
  endDate?: string
  maxHourlyRate?: number
  minPerformanceRating?: number
  minExperienceYears?: number
  limit?: number
  criteria?: string[]
}

export interface ConflictDetectionRequest {
  employeeId?: string
  siteId?: string
  startDate?: string
  endDate?: string
  role?: string
  hourlyRate?: number
  requiredSkills?: string[]
  requiredCertifications?: string[]
  assignmentId?: string
}

export interface AssignmentRecommendation {
  employee: any
  overallScore: number
  rank: number
  confidenceLevel: number
  skillMatching: {
    matchedSkills: string[]
    missingSkills: string[]
    matchPercentage: number
    skillScore: number
  }
  certificationMatching: {
    matchedCertifications: string[]
    missingCertifications: string[]
    expiredCertifications: string[]
    matchPercentage: number
  }
  availability: {
    isAvailable: boolean
    conflicts: any[]
    availableHoursPerWeek: number
    availabilityScore: number
  }
  proximity: {
    distanceKm: number
    travelTimeMinutes: number
    proximityScore: number
  }
  performance: {
    overallRating: number
    punctualityRating: number
    qualityRating: number
    customerFeedbackRating: number
    performanceScore: number
  }
  experience: {
    totalYears: number
    relevantYears: number
    assignmentsCount: number
    experienceScore: number
  }
  costEffectiveness: {
    hourlyRate: number
    marketRateComparison: number
    valueRatio: number
    costScore: number
  }
  notes: string[]
  risks: Array<{
    type: string
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
    description: string
  }>
  successProbability: number
}

export interface ConflictDetectionResult {
  hasConflicts: boolean
  conflictCount: number
  highestSeverity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  conflicts: Array<{
    type: string
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
    description: string
    suggestions: string[]
  }>
  resolutions: Array<{
    strategy: string
    description: string
    steps: string[]
    estimatedCost: number
    implementationTime: string
    successProbability: number
  }>
  riskScore: number
  canProceed: boolean
  proceedWarnings: string[]
  analyzedAt: string
  insights: string[]
}

export const assignmentsApi = {
  // Get all assignments with filtering
  async getAssignments(filters: AssignmentFilters = {}): Promise<{
    assignments: Assignment[]
    total: number
    page: number
    limit: number
    totalPages: number
  }> {
    const params = new URLSearchParams()
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value.toString())
      }
    })

    const response = await apiClient.get<{
      assignments: Assignment[]
      total: number
      page: number
      limit: number
      totalPages: number
    }>(`/assignments?${params.toString()}`)
    
    return response.data!
  },

  // Get assignment by ID
  async getAssignment(id: string): Promise<Assignment> {
    const response = await apiClient.get<Assignment>(`/assignments/${id}`)
    return response.data!
  },

  // Get assignments by employee
  async getAssignmentsByEmployee(employeeId: string): Promise<Assignment[]> {
    const response = await apiClient.get<Assignment[]>(`/assignments/by-employee/${employeeId}`)
    return response.data!
  },

  // Get assignments by site
  async getAssignmentsBySite(siteId: string): Promise<Assignment[]> {
    const response = await apiClient.get<Assignment[]>(`/assignments/by-site/${siteId}`)
    return response.data!
  },

  // Create new assignment
  async createAssignment(assignmentData: CreateAssignmentRequest): Promise<Assignment> {
    const response = await apiClient.post<Assignment>('/assignments', assignmentData)
    return response.data!
  },

  // Update assignment
  async updateAssignment(id: string, updateData: UpdateAssignmentRequest): Promise<Assignment> {
    const response = await apiClient.patch<Assignment>(`/assignments/${id}`, updateData)
    return response.data!
  },

  // Cancel assignment
  async cancelAssignment(id: string): Promise<Assignment> {
    const response = await apiClient.delete<Assignment>(`/assignments/${id}`)
    return response.data!
  },

  // Get assignment statistics
  async getAssignmentStats(): Promise<{
    total: number
    active: number
    inactive: number
    completed: number
    cancelled: number
    conflicted: number
    urgent: number
    averageHourlyRate: number
    uniqueEmployees: number
    uniqueSites: number
    roleDistribution: Record<string, number>
    averageSkillMatchScore: number
  }> {
    const response = await apiClient.get<{
      total: number
      active: number
      inactive: number
      completed: number
      cancelled: number
      conflicted: number
      urgent: number
      averageHourlyRate: number
      uniqueEmployees: number
      uniqueSites: number
      roleDistribution: Record<string, number>
      averageSkillMatchScore: number
    }>('/assignments/stats')
    
    return response.data!
  },

  // Get assignment recommendations
  async getAssignmentRecommendations(request: AssignmentRecommendationRequest): Promise<{
    siteId: string
    role: string
    recommendations: AssignmentRecommendation[]
    totalEvaluated: number
    recommendationsCount: number
    criteriaUsed: string[]
    generatedAt: string
    insights: string[]
    warnings: string[]
  }> {
    const response = await apiClient.post<{
      siteId: string
      role: string
      recommendations: AssignmentRecommendation[]
      totalEvaluated: number
      recommendationsCount: number
      criteriaUsed: string[]
      generatedAt: string
      insights: string[]
      warnings: string[]
    }>('/assignments/recommend', request)
    
    return response.data!
  },

  // Detect assignment conflicts
  async detectConflicts(request: ConflictDetectionRequest): Promise<ConflictDetectionResult> {
    const response = await apiClient.post<ConflictDetectionResult>('/assignments/conflicts', request)
    return response.data!
  },
}