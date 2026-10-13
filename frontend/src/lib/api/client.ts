import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios'

// Enhanced network error classification types
export interface NetworkErrorInfo {
  type: 'network' | 'server' | 'client' | 'timeout' | 'parsing'
  code?: string
  status?: number
  message: string
  retryable: boolean
}

// Retry configuration interface
interface RetryConfig {
  maxRetries: number
  retryDelay: number
  retryableErrors: string[]
  retryableStatuses: number[]
}

// Default retry configuration for transient network failures
const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  retryDelay: 1000, // Start with 1 second
  retryableErrors: [
    'ECONNREFUSED',
    'ENOTFOUND', 
    'ETIMEDOUT',
    'ECONNRESET',
    'ERR_NETWORK',
    'ERR_INTERNET_DISCONNECTED'
  ],
  retryableStatuses: [
    408, // Request Timeout
    429, // Too Many Requests
    502, // Bad Gateway
    503, // Service Unavailable
    504  // Gateway Timeout
  ]
}

// API Configuration with fallback handling
const getApiBaseUrl = (): string => {
  const envUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  const fallbackUrl = 'http://localhost:3005/api/v1';
  
  if (!envUrl) {
    console.warn('🚨 API Client - NEXT_PUBLIC_API_BASE_URL not set, using fallback:', fallbackUrl);
    return fallbackUrl;
  }
  
  // Validate URL format
  try {
    new URL(envUrl);
    return envUrl;
  } catch (error) {
    console.error('🚨 API Client - Invalid API_BASE_URL format:', envUrl, 'using fallback:', fallbackUrl);
    return fallbackUrl;
  }
};

const API_BASE_URL = getApiBaseUrl();

// Debug: Log the API base URL at startup
console.log('🔧 API Client - Environment variable NEXT_PUBLIC_API_BASE_URL:', process.env.NEXT_PUBLIC_API_BASE_URL)
console.log('🔧 API Client - Final API_BASE_URL:', API_BASE_URL)

// Classify network errors for better handling and user messaging
function classifyError(error: AxiosError): NetworkErrorInfo {
  const code = error.code
  const status = error.response?.status
  const message = error.message
  
  // Network connectivity errors (retryable)
  if (code === 'ECONNREFUSED') {
    return {
      type: 'network',
      code,
      message: 'Connection refused - server may be down or unreachable',
      retryable: true
    }
  } else if (code === 'ENOTFOUND') {
    return {
      type: 'network', 
      code,
      message: 'DNS resolution failed - check server address',
      retryable: true
    }
  } else if (code === 'ETIMEDOUT' || code === 'ECONNRESET') {
    return {
      type: 'timeout',
      code,
      message: 'Connection timeout - server taking too long to respond',
      retryable: true
    }
  } else if (code === 'ERR_NETWORK' || code === 'ERR_INTERNET_DISCONNECTED') {
    return {
      type: 'network',
      code,
      message: 'Network error - check internet connection and CORS settings',
      retryable: true
    }
  }
  
  // HTTP status code errors
  if (status) {
    if (status >= 500) {
      return {
        type: 'server',
        status,
        message: 'Server error - please try again later',
        retryable: status === 502 || status === 503 || status === 504
      }
    } else if (status === 429) {
      return {
        type: 'client',
        status,
        message: 'Too many requests - please wait before retrying',
        retryable: true
      }
    } else if (status === 408) {
      return {
        type: 'timeout',
        status,
        message: 'Request timeout - please try again',
        retryable: true
      }
    } else if (status >= 400) {
      return {
        type: 'client',
        status,
        message: (error.response?.data as any)?.error?.message || 
                (error.response?.data as any)?.message || 
                'Client error',
        retryable: false
      }
    }
  }
  
  // Parsing errors
  if (message?.includes('JSON') || message?.includes('parse')) {
    return {
      type: 'parsing',
      message: 'Response parsing error - invalid server response format',
      retryable: false
    }
  }
  
  // Generic error
  return {
    type: 'network',
    message: message || 'Unknown network error',
    retryable: false
  }
}

// Exponential backoff delay calculation
function calculateRetryDelay(retryCount: number, baseDelay: number): number {
  return Math.min(baseDelay * Math.pow(2, retryCount), 10000) // Max 10 seconds
}

// Retry mechanism for transient failures
async function withRetry<T>(
  operation: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<T> {
  let lastError: any
  
  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error
      
      if (attempt === config.maxRetries) {
        // Max retries reached, throw the last error
        break
      }
      
      const errorInfo = classifyError(error as AxiosError)
      
      // Check if error is retryable
      const isRetryableError = config.retryableErrors.includes(errorInfo.code || '')
      const isRetryableStatus = errorInfo.status ? config.retryableStatuses.includes(errorInfo.status) : false
      
      if (!errorInfo.retryable && !isRetryableError && !isRetryableStatus) {
        // Not retryable, throw immediately
        throw error
      }
      
      // Calculate delay with exponential backoff
      const delay = calculateRetryDelay(attempt, config.retryDelay)
      
      console.warn(`🔄 API Client - Retry attempt ${attempt + 1}/${config.maxRetries} after ${delay}ms for error:`, errorInfo.message)
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  
  throw lastError
}

// Create axios instance with enhanced error handling and reliability
export const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 seconds for overall request timeout
  headers: {
    'Content-Type': 'application/json',
  },
  // Enhanced timeout configuration for different phases
  validateStatus: (status) => {
    // Consider 2xx and 3xx as successful, handle 4xx and 5xx as errors
    return status >= 200 && status < 400
  }
})

// Request interceptor for auth token
api.interceptors.request.use(
  (config) => {
    console.log('🔍 API Request:', {
      method: config.method?.toUpperCase(),
      url: config.url,
      baseURL: config.baseURL,
      fullUrl: `${config.baseURL || ''}${config.url || ''}`,
      headers: config.headers
    })
    
    // Get auth token from zustand store in localStorage
    let token: string | null = null
    
    if (typeof window !== 'undefined') {
      try {
        const authStorage = localStorage.getItem('auth-storage')
        if (authStorage) {
          const parsed = JSON.parse(authStorage)
          token = parsed.state?.token || null
        }
      } catch (error) {
        console.error('Failed to parse auth storage:', error)
      }
    }
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
      console.log('🔐 Token added to request headers')
    } else {
      console.log('🔓 No token found in storage')
    }
    
    return config
  },
  (error) => {
    console.error('🚨 API Request Error:', error)
    return Promise.reject(error)
  }
)

// Response interceptor for error handling and validation
api.interceptors.response.use(
  (response: AxiosResponse) => {
    console.log('🔍 API Response Success:', {
      status: response.status,
      statusText: response.statusText,
      url: response.config.url,
      dataType: typeof response.data,
      hasData: !!response.data
    })
    
    // Response validation to prevent empty error objects
    if (response.data === null || response.data === undefined) {
      console.warn('🚨 API Response Warning: Received null/undefined response data')
      response.data = { 
        success: false, 
        error: { 
          message: 'Empty response received from server',
          code: 'EMPTY_RESPONSE' 
        } 
      }
    }
    
    return response
  },
  (error: AxiosError) => {
    const errorInfo = classifyError(error)
    
    console.error('🚨 API Response Error:', {
      type: errorInfo.type,
      status: error.response?.status,
      statusText: error.response?.statusText,
      url: error.config?.url,
      data: error.response?.data,
      message: errorInfo.message,
      code: errorInfo.code || error.code,
      retryable: errorInfo.retryable
    })
    
    // Enhanced error logging for debugging
    if (errorInfo.type === 'network') {
      console.error('🌐 Network Error Details:', {
        message: 'Network connectivity issue detected',
        apiUrl: API_BASE_URL,
        errorCode: errorInfo.code,
        retryable: errorInfo.retryable,
        suggestion: errorInfo.code === 'ECONNREFUSED' 
          ? 'Check if backend server is running on the correct port'
          : 'Check network connectivity and CORS configuration'
      })
    } else if (errorInfo.type === 'server') {
      console.error('🔥 Server Error Details:', {
        message: 'Server-side error occurred',
        status: errorInfo.status,
        retryable: errorInfo.retryable,
        suggestion: 'Server may be experiencing issues - check server logs'
      })
    } else if (errorInfo.type === 'parsing') {
      console.error('📄 Response Parsing Error:', {
        message: 'Failed to parse server response',
        suggestion: 'Server may be returning invalid JSON or unexpected content type'
      })
    }
    
    // Handle common error scenarios with automatic actions
    if (error.response?.status === 401) {
      // Unauthorized - clear auth storage and redirect to login
      console.warn('🔐 Unauthorized access detected - clearing auth and redirecting')
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth-storage')
        // Only redirect if not already on login page
        if (!window.location.pathname.includes('/auth/login')) {
          window.location.href = '/auth/login'
        }
      }
    }
    
    // Enhance error object with classification info for better handling
    const enhancedError = {
      ...error,
      errorInfo,
      isRetryable: errorInfo.retryable,
      userMessage: errorInfo.message
    }
    
    return Promise.reject(enhancedError)
  }
)

// API Response wrapper type
export interface ApiResponse<T = any> {
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
      hasPrevious: boolean
    }
  }
}

// Generic API methods with retry support for transient failures
export const apiClient = {
  get: <T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> =>
    withRetry(() => api.get(url, config)),
    
  post: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> =>
    withRetry(() => api.post(url, data, config)),
    
  put: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> =>
    withRetry(() => api.put(url, data, config)),
    
  patch: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> =>
    withRetry(() => api.patch(url, data, config)),
    
  delete: <T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> =>
    withRetry(() => api.delete(url, config)),

  // Health check function for connectivity testing with custom timeout
  healthCheck: async (): Promise<boolean> => {
    try {
      console.log('🔍 API Client - Testing backend connectivity...')
      const response = await api.get('/auth/health', { 
        timeout: 5000,  // Shorter timeout for health check
        // Skip retry for health check to get faster feedback
        validateStatus: (status) => status >= 200 && status < 300
      })
      console.log('✅ API Client - Backend connectivity successful:', response.data)
      return true
    } catch (error) {
      const errorInfo = classifyError(error as AxiosError)
      console.error('❌ API Client - Backend connectivity failed:', {
        type: errorInfo.type,
        message: errorInfo.message,
        retryable: errorInfo.retryable
      })
      return false
    }
  },

  // Direct methods without retry for specific use cases
  direct: {
    get: <T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> =>
      api.get(url, config),
      
    post: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> =>
      api.post(url, data, config),
      
    put: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> =>
      api.put(url, data, config),
      
    patch: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> =>
      api.patch(url, data, config),
      
    delete: <T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> =>
      api.delete(url, config),
  }
}

export default api

// Export utility functions for external use
export { classifyError, calculateRetryDelay, withRetry, DEFAULT_RETRY_CONFIG }