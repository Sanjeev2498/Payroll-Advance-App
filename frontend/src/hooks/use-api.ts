import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient, queryKeys } from '@/lib/api'

// Generic API hook for flexible endpoint usage
interface UseApiOptions {
  endpoint: string;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  params?: Record<string, any>;
  enabled?: boolean;
}

export function useApi<T = any>({
  endpoint,
  method = 'GET',
  params = {},
  enabled = true
}: UseApiOptions) {
  const queryClient = useQueryClient();

  if (method === 'GET') {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, String(value));
      }
    });
    const queryString = queryParams.toString();
    const fullEndpoint = queryString ? `${endpoint}?${queryString}` : endpoint;

    return useQuery({
      queryKey: [endpoint, params],
      queryFn: () => apiClient.get(fullEndpoint),
      enabled,
    });
  }

  // For mutations (POST, PUT, PATCH, DELETE)
  return useMutation({
    mutationFn: (data?: any) => {
      const targetEndpoint = data?.endpoint || endpoint;
      const payload = data?.endpoint ? { ...data, endpoint: undefined } : data;

      switch (method) {
        case 'POST':
          return apiClient.post(targetEndpoint, payload);
        case 'PUT':
          return apiClient.put(targetEndpoint, payload);
        case 'PATCH':
          return apiClient.patch(targetEndpoint, payload);
        case 'DELETE':
          return apiClient.delete(targetEndpoint);
        default:
          throw new Error(`Unsupported method: ${method}`);
      }
    },
    onSuccess: () => {
      // Invalidate related queries on successful mutation
      queryClient.invalidateQueries({ 
        queryKey: [endpoint.split('/')[1]] // Invalidate by resource type
      });
    },
  });
}

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