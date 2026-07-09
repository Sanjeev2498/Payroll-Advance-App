import { apiClient } from './client'
import { ApiResponse } from './client'

// Types based on backend DTOs
export interface ContactInfo {
  contactPerson: string
  phone?: string
  secondaryEmail?: string
  address?: {
    street: string
    city: string
    state: string
    zipCode: string
    country: string
  }
  notes?: string
}

export interface BillingPreferences {
  frequency: 'MONTHLY' | 'QUARTERLY' | 'YEARLY'
  method?: 'EMAIL' | 'MAIL' | 'PORTAL'
  paymentTerms?: number
  billingEmail?: string
  instructions?: string
}

export enum ContractStatus {
  ACTIVE = 'ACTIVE',
  PENDING = 'PENDING',
  EXPIRED = 'EXPIRED',
  TERMINATED = 'TERMINATED'
}

export interface Client {
  id: string
  name: string
  contactEmail: string
  contactInfo?: ContactInfo
  contractStatus: ContractStatus
  contractStart?: Date
  contractEnd?: Date
  billingPreferences?: BillingPreferences
  createdAt: Date
  updatedAt: Date
}

export interface CreateClientData {
  name: string
  contactEmail: string
  contactInfo?: ContactInfo
  contractStatus: ContractStatus
  contractStart?: Date
  contractEnd?: Date
  billingPreferences?: BillingPreferences
}

export interface UpdateClientData {
  name?: string
  contactEmail?: string
  contactInfo?: ContactInfo
  contractStatus?: ContractStatus
  contractStart?: Date
  contractEnd?: Date
  billingPreferences?: BillingPreferences
}

export interface ClientQueryParams {
  page?: number
  limit?: number
  search?: string
  contractStatus?: ContractStatus
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface ClientStats {
  totalClients: number
  activeClients: number
  pendingClients: number
  expiredClients: number
  terminatedClients: number
  contractsExpiringInMonth: number
  averageContractDuration: number
  recentSignups: number
}

export interface ClientListResponse {
  clients: Client[]
  totalCount: number
  page: number
  limit: number
  totalPages: number
}

// Client API functions
export const clientsApi = {
  // Get all clients with filtering and pagination
  async getClients(params: ClientQueryParams = {}): Promise<ClientListResponse> {
    const queryString = new URLSearchParams(
      Object.entries(params).reduce((acc, [key, value]) => {
        if (value !== undefined && value !== null) {
          acc[key] = String(value)
        }
        return acc
      }, {} as Record<string, string>)
    ).toString()

    const response = await apiClient.get<ApiResponse<ClientListResponse>>(
      `/clients${queryString ? `?${queryString}` : ''}`
    )
    
    return response.data.data!
  },

  // Get client statistics
  async getClientStats(): Promise<ClientStats> {
    const response = await apiClient.get<ApiResponse<ClientStats>>('/clients/stats')
    return response.data.data!
  },

  // Get clients with expiring contracts
  async getExpiringContracts(daysUntilExpiry: number = 30): Promise<Client[]> {
    const response = await apiClient.get<ApiResponse<Client[]>>(
      `/clients/expiring?daysUntilExpiry=${daysUntilExpiry}`
    )
    return response.data.data!
  },

  // Get clients by contract status
  async getClientsByStatus(status: ContractStatus): Promise<Client[]> {
    const response = await apiClient.get<ApiResponse<Client[]>>(`/clients/status/${status}`)
    return response.data.data!
  },

  // Get a single client by ID
  async getClient(id: string): Promise<Client> {
    const response = await apiClient.get<ApiResponse<Client>>(`/clients/${id}`)
    return response.data.data!
  },

  // Create a new client
  async createClient(data: CreateClientData): Promise<Client> {
    const response = await apiClient.post<ApiResponse<Client>>('/clients', data)
    return response.data.data!
  },

  // Update a client
  async updateClient(id: string, data: UpdateClientData): Promise<Client> {
    const response = await apiClient.put<ApiResponse<Client>>(`/clients/${id}`, data)
    return response.data.data!
  },

  // Delete (soft delete) a client
  async deleteClient(id: string): Promise<Client> {
    const response = await apiClient.delete<ApiResponse<Client>>(`/clients/${id}`)
    return response.data.data!
  }
}