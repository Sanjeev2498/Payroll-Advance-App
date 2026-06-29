import { useAuthStore } from '@/stores/auth-store'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'

interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: any[]
  }
  metadata?: {
    timestamp: string
    requestId: string
    pagination?: {
      page: number
      limit: number
      total: number
      hasNext: boolean
    }
  }
}

class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
    public details?: any[]
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

class ApiClient {
  private baseURL: string

  constructor(baseURL: string) {
    this.baseURL = baseURL
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const token = useAuthStore.getState().token

    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    }

    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, config)
      
      let data
      try {
        data = await response.json()
      } catch (error) {
        throw new ApiError(
          'Invalid JSON response from server',
          response.status
        )
      }

      if (!response.ok) {
        // Handle specific error cases
        if (response.status === 401) {
          // Unauthorized - token expired or invalid
          useAuthStore.getState().logout()
          throw new ApiError(
            'Authentication required',
            401,
            'UNAUTHORIZED'
          )
        }

        throw new ApiError(
          data.error?.message || `HTTP ${response.status}: ${response.statusText}`,
          response.status,
          data.error?.code,
          data.error?.details
        )
      }

      return data
    } catch (error) {
      if (error instanceof ApiError) {
        throw error
      }
      
      // Network or other errors
      console.error('API request failed:', error)
      throw new ApiError(
        'Network error - please check your connection',
        0,
        'NETWORK_ERROR'
      )
    }
  }

  // HTTP Methods
  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET' })
  }

  async post<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async put<T>(endpoint: string, data: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async patch<T>(endpoint: string, data: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' })
  }
}

export const apiClient = new ApiClient(API_BASE_URL)

// Query key factory for TanStack Query
export const queryKeys = {
  all: ['api'] as const,
  
  // Auth
  auth: () => [...queryKeys.all, 'auth'] as const,
  profile: () => [...queryKeys.auth(), 'profile'] as const,
  
  // Companies
  companies: () => [...queryKeys.all, 'companies'] as const,
  company: (id: string) => [...queryKeys.companies(), id] as const,
  
  // Clients
  clients: () => [...queryKeys.all, 'clients'] as const,
  client: (id: string) => [...queryKeys.clients(), id] as const,
  clientSites: (id: string) => [...queryKeys.client(id), 'sites'] as const,
  
  // Sites
  sites: () => [...queryKeys.all, 'sites'] as const,
  site: (id: string) => [...queryKeys.sites(), id] as const,
  siteAssignments: (id: string) => [...queryKeys.site(id), 'assignments'] as const,
  
  // Employees
  employees: () => [...queryKeys.all, 'employees'] as const,
  employee: (id: string) => [...queryKeys.employees(), id] as const,
  employeeSchedule: (id: string) => [...queryKeys.employee(id), 'schedule'] as const,
  
  // Assignments
  assignments: () => [...queryKeys.all, 'assignments'] as const,
  assignment: (id: string) => [...queryKeys.assignments(), id] as const,
  
  // Attendance
  attendance: () => [...queryKeys.all, 'attendance'] as const,
  attendanceByEmployee: (employeeId: string, date: string) => 
    [...queryKeys.attendance(), 'employee', employeeId, date] as const,
  
  // Payroll
  payroll: () => [...queryKeys.all, 'payroll'] as const,
  payrollRuns: () => [...queryKeys.payroll(), 'runs'] as const,
  payrollRun: (id: string) => [...queryKeys.payrollRuns(), id] as const,
  
  // Dashboard
  dashboard: () => [...queryKeys.all, 'dashboard'] as const,
  dashboardMetrics: (dateRange: { from: string; to: string }) =>
    [...queryKeys.dashboard(), 'metrics', dateRange] as const,
}