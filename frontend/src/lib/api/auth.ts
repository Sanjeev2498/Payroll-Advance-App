import { apiClient } from './client'
import { User, LoginForm } from '@/types'

export interface LoginResponse {
  success: boolean;
  data: {
    user: User;
    tokens: {
      accessToken: string;
      refreshToken: string;
      expiresIn: number;
    };
  };
  message: string;
}

export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export const authApi = {
  login: async (credentials: LoginForm): Promise<LoginResponse> => {
    console.log('🔍 Auth API - Starting login request')
    console.log('🔍 Auth API - Credentials:', { email: credentials.email, password: credentials.password })
    console.log('🔍 Auth API - API Base URL:', process.env.NEXT_PUBLIC_API_BASE_URL)
    
    // First test connectivity
    const isConnected = await apiClient.healthCheck()
    if (!isConnected) {
      throw new Error('Backend server is not accessible. Please check if the server is running.')
    }
    
    try {
      console.log('🔍 Auth API - Making POST request to /auth/login...')
      const response = await apiClient.post<any>('/auth/login', credentials)
      
      console.log('🔍 Auth API - Raw response received:')
      console.log('🔍 Auth API - Response status:', response.status)
      console.log('🔍 Auth API - Response data:', response.data)
      
      if (!response.data) {
        console.error('🚨 Auth API - No data in response!')
        throw new Error('No data received from login API')
      }
      
      // Simplified response unwrapping with validation
      let loginData: {
        user: User;
        tokens: {
          accessToken: string;
          refreshToken: string; 
          expiresIn: number;
        };
      }
      
      // Handle various response wrapping patterns
      const responseData = response.data
      
      if (responseData?.data?.data?.user) {
        // Handle triple-wrapped response structure
        console.log('🔍 Auth API - Extracting from triple-wrapped response')
        loginData = responseData.data.data
      } else if (responseData?.data?.user) {
        // Handle double-wrapped response structure
        console.log('🔍 Auth API - Extracting from double-wrapped response')  
        loginData = responseData.data
      } else if (responseData?.user) {
        // Handle single-wrapped response structure
        console.log('🔍 Auth API - Using direct response structure')
        loginData = responseData
      } else {
        // Invalid response structure
        console.error('🚨 Auth API - Invalid response structure:', responseData)
        throw new Error('Invalid login response structure - missing user data')
      }
      
      // Validate the extracted data
      if (!loginData?.user || !loginData?.tokens) {
        console.error('🚨 Auth API - Missing required login data:', loginData)
        throw new Error('Login response missing user or token data')
      }
      
      console.log('🔍 Auth API - Successfully extracted login data:', {
        hasUser: !!loginData.user,
        hasTokens: !!loginData.tokens,
        userEmail: loginData.user.email
      })
      
      // Return properly formatted LoginResponse
      return {
        success: true,
        data: loginData,
        message: 'Login successful'
      }
    } catch (error) {
      console.error('🚨 Auth API - Login error:', error)
      
      // Enhanced error classification and message generation
      const errorResponse = (error as any)?.response
      const errorCode = (error as any)?.code
      const errorMessage = (error as any)?.message
      
      // Network connectivity errors
      if (errorCode === 'ECONNREFUSED') {
        throw new Error('Connection refused: Backend server is not running or not accessible on the configured port.')
      } else if (errorCode === 'ENOTFOUND') {
        throw new Error('DNS resolution failed: Cannot find the backend server. Please check the API URL configuration.')
      } else if (errorCode === 'ETIMEDOUT') {
        throw new Error('Connection timeout: The backend server is taking too long to respond.')
      } else if (errorCode === 'ERR_NETWORK') {
        throw new Error('Network error: Please check your internet connection and CORS settings.')
      } else if (errorCode === 'ERR_INTERNET_DISCONNECTED') {
        throw new Error('No internet connection: Please check your network connectivity.')
      }
      
      // HTTP response errors with detailed messages
      if (errorResponse) {
        const status = errorResponse.status
        const responseData = errorResponse.data
        
        if (status === 401) {
          // Attempt to extract meaningful error message from response
          const authError = responseData?.error?.message || 
                           responseData?.message || 
                           'Invalid email or password.'
          throw new Error(authError)
        } else if (status === 403) {
          throw new Error('Access forbidden: Your account may be suspended or you lack permission to login.')
        } else if (status === 429) {
          throw new Error('Too many login attempts: Please wait a moment before trying again.')
        } else if (status === 500) {
          throw new Error('Server error: The authentication system is experiencing issues. Please try again later.')
        } else if (status === 502 || status === 503) {
          throw new Error('Service unavailable: The authentication service is temporarily down.')
        } else if (status >= 400) {
          // Generic client/server error with response data if available
          const serverMessage = responseData?.error?.message || 
                               responseData?.message || 
                               `Authentication failed with status ${status}.`
          throw new Error(serverMessage)
        }
      }
      
      // Handle parsing errors and other unexpected errors
      if (errorMessage?.includes('JSON') || errorMessage?.includes('parse')) {
        throw new Error('Response parsing error: Received invalid data from the server.')
      } else if (errorMessage?.includes('No data received')) {
        throw new Error('Empty response: The server returned no data.')
      } else if (errorMessage?.includes('Invalid response structure')) {
        throw new Error('Invalid response format: The server response format is unexpected.')
      }
      
      // Fallback error message
      throw new Error(errorMessage || 'Authentication failed: An unexpected error occurred.')
    }
  },

  logout: async (): Promise<void> => {
    await apiClient.post('/auth/logout')
  },

  refreshToken: async (): Promise<RefreshTokenResponse> => {
    // Get refresh token from storage
    let refreshToken: string | null = null
    
    if (typeof window !== 'undefined') {
      try {
        const authStorage = localStorage.getItem('auth-storage')
        if (authStorage) {
          const parsed = JSON.parse(authStorage)
          refreshToken = parsed.state?.refreshToken || null
        }
      } catch (error) {
        console.error('Failed to get refresh token from storage:', error)
        throw new Error('No refresh token found')
      }
    }
    
    if (!refreshToken) {
      throw new Error('No refresh token available')
    }
    
    const response = await apiClient.post<RefreshTokenResponse>('/auth/refresh', {
      refreshToken: refreshToken
    })
    return response.data
  },

  getProfile: async (): Promise<User> => {
    const response = await apiClient.get<any>('/auth/profile')
    
    // Handle response unwrapping with validation
    if (response.data?.data?.data) {
      return response.data.data.data as User
    } else if (response.data?.data) {
      return response.data.data as User
    } else if (response.data) {
      return response.data as User
    } else {
      throw new Error('Invalid profile response structure')
    }
  },

  updateProfile: async (data: Partial<User>): Promise<User> => {
    const response = await apiClient.patch<any>('/auth/profile', data)
    
    // Handle response unwrapping with validation  
    if (response.data?.data?.data) {
      return response.data.data.data as User
    } else if (response.data?.data) {
      return response.data.data as User
    } else if (response.data) {
      return response.data as User
    } else {
      throw new Error('Invalid profile update response structure')
    }
  },
}