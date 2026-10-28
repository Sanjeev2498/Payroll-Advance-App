import { apiClient } from './client'
import { ApiResponse } from './client'

// ✅ PHASE 3 - Option D: Contracts Module Integration (COMPLETE NEW MODULE)
// Created comprehensive contracts API to match backend capabilities

// Types based on backend DTOs and Prisma models
export enum ContractStatus {
  DRAFT = 'DRAFT',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  TERMINATED = 'TERMINATED',
  SUSPENDED = 'SUSPENDED'
}

export enum AmendmentStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED'
}

export enum RenewalStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  AUTO_RENEWED = 'AUTO_RENEWED'
}

export interface ContractTerms {
  duration: number
  durationType: 'MONTHS' | 'YEARS'
  serviceLevel: string
  paymentTerms: string
  terminationClause: string
  renewalTerms?: string
  penaltyClause?: string
  specialConditions?: string[]
}

export interface BillingPreferences {
  billingFrequency: 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'ANNUALLY'
  billingCycle?: number
  paymentMethod?: 'BANK_TRANSFER' | 'CHECK' | 'ONLINE'
  billingContact?: string
  billingEmail?: string
  invoiceDelivery?: 'EMAIL' | 'PORTAL' | 'MAIL'
  paymentTermsDays?: number
  lateFeePercentage?: number
  discountPercentage?: number
}

export interface SLAMetrics {
  responseTime?: number
  resolutionTime?: number
  uptime?: number
  qualityScore?: number
  customMetrics?: Record<string, any>
}

export interface Contract {
  id: string
  clientId: string
  contractNumber: string
  title: string
  description?: string
  status: ContractStatus
  startDate: Date
  endDate: Date
  value: number
  currency: string
  terms: ContractTerms
  billingPreferences: BillingPreferences
  slaRequirements?: SLAMetrics
  autoRenewal: boolean
  renewalNotificationDays?: number
  metadata?: Record<string, any>
  createdAt: Date
  updatedAt: Date
  // Relations
  client?: {
    id: string
    name: string
    contactEmail: string
  }
  sites?: Array<{
    id: string
    name: string
    operationalStatus: string
  }>
  amendments?: ContractAmendment[]
  renewals?: ContractRenewal[]
}

export interface ContractAmendment {
  id: string
  contractId: string
  amendmentNumber: string
  description: string
  changes: Record<string, any>
  reason: string
  status: AmendmentStatus
  requestedBy: string
  requestedAt: Date
  reviewedBy?: string
  reviewedAt?: Date
  approvalNotes?: string
  effectiveDate?: Date
}

export interface ContractRenewal {
  id: string
  contractId: string
  renewalNumber: string
  proposedStartDate: Date
  proposedEndDate: Date
  proposedValue?: number
  proposedChanges?: Record<string, any>
  status: RenewalStatus
  initiatedBy: string
  initiatedAt: Date
  reviewedBy?: string
  reviewedAt?: Date
  approvalNotes?: string
  autoRenewed: boolean
}

export interface SLAComplianceReport {
  id: string
  contractId: string
  reportingPeriod: {
    startDate: Date
    endDate: Date
  }
  siteId?: string
  metrics: SLAMetrics
  complianceStatus: 'COMPLIANT' | 'NON_COMPLIANT' | 'WARNING'
  issues?: string[]
  improvementActions?: string[]
  nextReviewDate?: Date
  createdBy: string
  createdAt: Date
}

// Request/Response DTOs
export interface CreateContractDto {
  clientId: string
  title: string
  description?: string
  startDate: Date
  endDate: Date
  value: number
  currency?: string
  terms: ContractTerms
  billingPreferences: BillingPreferences
  slaRequirements?: SLAMetrics
  autoRenewal?: boolean
  renewalNotificationDays?: number
  metadata?: Record<string, any>
}

export interface UpdateContractDto extends Partial<CreateContractDto> {
  status?: ContractStatus
}

export interface ContractQueryParams {
  page?: number
  limit?: number
  status?: ContractStatus
  clientId?: string
  startDate?: Date
  endDate?: Date
  search?: string
  sortBy?: 'title' | 'startDate' | 'endDate' | 'value' | 'status' | 'createdAt'
  sortOrder?: 'asc' | 'desc'
}

export interface ContractListResponse {
  contracts: Contract[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface CreateContractAmendmentDto {
  contractId: string
  description: string
  changes: Record<string, any>
  reason: string
  effectiveDate?: Date
}

export interface ApproveAmendmentDto {
  approved: boolean
  approvalNotes?: string
}

export interface InitiateRenewalDto {
  contractId: string
  proposedStartDate: Date
  proposedEndDate: Date
  proposedValue?: number
  proposedChanges?: Record<string, any>
}

export interface ApproveRenewalDto {
  approved: boolean
  approvalNotes?: string
}

export interface CreateSLAComplianceReportDto {
  contractId: string
  reportingPeriod: {
    startDate: Date
    endDate: Date
  }
  siteId?: string
  metrics: SLAMetrics
  complianceStatus: 'COMPLIANT' | 'NON_COMPLIANT' | 'WARNING'
  issues?: string[]
  improvementActions?: string[]
  nextReviewDate?: Date
}

export interface SLAComplianceQueryDto {
  startDate?: Date
  endDate?: Date
  status?: 'COMPLIANT' | 'NON_COMPLIANT' | 'WARNING'
  siteId?: string
}

export interface ContractPerformanceMetrics {
  contractId: string
  period: {
    startDate: string
    endDate: string
  }
  financialMetrics: {
    totalRevenue: number
    averageMonthlyRevenue: number
    outstandingAmount: number
  }
  operationalMetrics: {
    activeSites: number
    totalSites: number
    activeAssignments: number
    staffingEfficiency: number
  }
  complianceMetrics: {
    slaCompliance: number
    qualityScore: number
    incidentCount: number
  }
}

export interface ContractBillingSummary {
  contractId: string
  year: number
  totalBilled: number
  totalPaid: number
  totalOutstanding: number
  invoiceCount: number
  averageInvoiceAmount: number
  billingFrequency: string
  monthlyBreakdown: Array<{
    month: number
    billed: number
    paid: number
    outstanding: number
  }>
  paymentMetrics: {
    onTimePaymentRate: number
    averagePaymentDays: number
    overdueAmount: number
  }
}

// Contracts API functions
export const contractsApi = {
  // Get all contracts with filtering and pagination
  async getContracts(params: ContractQueryParams = {}): Promise<ContractListResponse> {
    const queryString = new URLSearchParams(
      Object.entries(params).reduce((acc, [key, value]) => {
        if (value !== undefined && value !== null) {
          if (value instanceof Date) {
            acc[key] = value.toISOString()
          } else {
            acc[key] = String(value)
          }
        }
        return acc
      }, {} as Record<string, string>)
    ).toString()

    const response = await apiClient.get<ApiResponse<ContractListResponse>>(
      `/contracts${queryString ? `?${queryString}` : ''}`
    )
    
    return response.data.data!
  },

  // Get contract by ID
  async getContract(id: string): Promise<Contract> {
    const response = await apiClient.get<ApiResponse<Contract>>(`/contracts/${id}`)
    return response.data.data!
  },

  // Create new contract
  async createContract(data: CreateContractDto): Promise<Contract> {
    const response = await apiClient.post<ApiResponse<Contract>>('/contracts', data)
    return response.data.data!
  },

  // Update contract
  async updateContract(id: string, data: UpdateContractDto): Promise<Contract> {
    const response = await apiClient.patch<ApiResponse<Contract>>(`/contracts/${id}`, data)
    return response.data.data!
  },

  // Delete contract (soft delete)
  async deleteContract(id: string): Promise<void> {
    await apiClient.delete(`/contracts/${id}`)
  },

  // Contract Amendments
  async createAmendment(contractId: string, data: Omit<CreateContractAmendmentDto, 'contractId'>): Promise<ContractAmendment> {
    const response = await apiClient.post<ApiResponse<ContractAmendment>>(
      `/contracts/${contractId}/amendments`, 
      data
    )
    return response.data.data!
  },

  async approveAmendment(contractId: string, amendmentId: string, data: ApproveAmendmentDto): Promise<ContractAmendment> {
    const response = await apiClient.patch<ApiResponse<ContractAmendment>>(
      `/contracts/${contractId}/amendments/${amendmentId}/approve`,
      data
    )
    return response.data.data!
  },

  // Contract Renewals
  async initiateRenewal(contractId: string, data: Omit<InitiateRenewalDto, 'contractId'>): Promise<ContractRenewal> {
    const response = await apiClient.post<ApiResponse<ContractRenewal>>(
      `/contracts/${contractId}/renewals`,
      data
    )
    return response.data.data!
  },

  async approveRenewal(contractId: string, renewalId: string, data: ApproveRenewalDto): Promise<ContractRenewal> {
    const response = await apiClient.patch<ApiResponse<ContractRenewal>>(
      `/contracts/${contractId}/renewals/${renewalId}/approve`,
      data
    )
    return response.data.data!
  },

  // SLA Compliance
  async createSLAReport(contractId: string, data: Omit<CreateSLAComplianceReportDto, 'contractId'>): Promise<SLAComplianceReport> {
    const response = await apiClient.post<ApiResponse<SLAComplianceReport>>(
      `/contracts/${contractId}/sla-reports`,
      data
    )
    return response.data.data!
  },

  async getSLACompliance(contractId: string, params: SLAComplianceQueryDto = {}): Promise<SLAComplianceReport[]> {
    const queryString = new URLSearchParams(
      Object.entries(params).reduce((acc, [key, value]) => {
        if (value !== undefined && value !== null) {
          if (value instanceof Date) {
            acc[key] = value.toISOString()
          } else {
            acc[key] = String(value)
          }
        }
        return acc
      }, {} as Record<string, string>)
    ).toString()

    const response = await apiClient.get<ApiResponse<SLAComplianceReport[]>>(
      `/contracts/${contractId}/sla-compliance${queryString ? `?${queryString}` : ''}`
    )
    
    return response.data.data!
  },

  // Analytics and Reports
  async getPerformanceMetrics(
    contractId: string, 
    startDate?: string, 
    endDate?: string
  ): Promise<ContractPerformanceMetrics> {
    const params = new URLSearchParams()
    if (startDate) params.append('startDate', startDate)
    if (endDate) params.append('endDate', endDate)

    const response = await apiClient.get<ApiResponse<ContractPerformanceMetrics>>(
      `/contracts/${contractId}/performance-metrics${params.toString() ? `?${params.toString()}` : ''}`
    )
    
    return response.data.data!
  },

  async getBillingSummary(contractId: string, year?: number): Promise<ContractBillingSummary> {
    const params = new URLSearchParams()
    if (year) params.append('year', year.toString())

    const response = await apiClient.get<ApiResponse<ContractBillingSummary>>(
      `/contracts/${contractId}/billing-summary${params.toString() ? `?${params.toString()}` : ''}`
    )
    
    return response.data.data!
  }
}