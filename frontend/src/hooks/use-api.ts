import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient, queryKeys } from '@/lib/api'

// Auth hooks
export function useProfile() {
  return useQuery({
    queryKey: queryKeys.profile(),
    queryFn: () => apiClient.get('/auth/profile'),
  })
}

// Client hooks
export function useClients() {
  return useQuery({
    queryKey: queryKeys.clients(),
    queryFn: () => apiClient.get('/clients'),
  })
}

export function useClient(id: string) {
  return useQuery({
    queryKey: queryKeys.client(id),
    queryFn: () => apiClient.get(`/clients/${id}`),
    enabled: !!id,
  })
}

export function useCreateClient() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (data: any) => apiClient.post('/clients', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.clients() })
    },
  })
}

// Employee hooks
export function useEmployees() {
  return useQuery({
    queryKey: queryKeys.employees(),
    queryFn: () => apiClient.get('/employees'),
  })
}

export function useEmployee(id: string) {
  return useQuery({
    queryKey: queryKeys.employee(id),
    queryFn: () => apiClient.get(`/employees/${id}`),
    enabled: !!id,
  })
}

export function useCreateEmployee() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (data: any) => apiClient.post('/employees', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.employees() })
    },
  })
}

// Site hooks
export function useSites() {
  return useQuery({
    queryKey: queryKeys.sites(),
    queryFn: () => apiClient.get('/sites'),
  })
}

export function useSite(id: string) {
  return useQuery({
    queryKey: queryKeys.site(id),
    queryFn: () => apiClient.get(`/sites/${id}`),
    enabled: !!id,
  })
}

// Dashboard hooks
export function useDashboardMetrics(dateRange: { from: string; to: string }) {
  return useQuery({
    queryKey: queryKeys.dashboardMetrics(dateRange),
    queryFn: () => apiClient.get(`/dashboard/metrics?from=${dateRange.from}&to=${dateRange.to}`),
  })
}

// Payroll hooks
export function usePayrollRuns() {
  return useQuery({
    queryKey: queryKeys.payrollRuns(),
    queryFn: () => apiClient.get('/payroll/runs'),
  })
}

export function usePayrollRun(id: string) {
  return useQuery({
    queryKey: queryKeys.payrollRun(id),
    queryFn: () => apiClient.get(`/payroll/runs/${id}`),
    enabled: !!id,
  })
}