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
    console.log('🔍 Auth API - Credentials type check:', {
      emailType: typeof credentials.email,
      passwordType: typeof credentials.password,
      emailLength: credentials.email?.length,
      passwordLength: credentials.password?.length,
      emailTrimmed: credentials.email?.trim(),
      passwordTrimmed: credentials.password?.trim()
    })
    console.log('🔍 Auth API - API Base URL from env:', process.env.NEXT_PUBLIC_API_BASE_URL)
    
    try {
      console.log('🔍 Auth API - Making POST request to /auth/login...')
      const response = await apiClient.post<LoginResponse>('/auth/login', credentials)
      
      console.log('🔍 Auth API - Raw response received:')
      console.log('🔍 Auth API - Response status:', response.status)
      console.log('🔍 Auth API - Response headers:', response.headers)
      console.log('🔍 Auth API - Response data:', response.data)
      console.log('🔍 Auth API - Response data type:', typeof response.data)
      console.log('🔍 Auth API - Response data keys:', response.data ? Object.keys(response.data) : 'NO_DATA')
      
      if (!response.data) {
        console.error('🚨 Auth API - No data in response!')
        throw new Error('No data received from login API')
      }
      
      console.log('🔍 Auth API - Returning response.data:', response.data)
      return response.data!
    } catch (error) {
      console.error('🚨 Auth API - Login error:', error)
      console.error('🚨 Auth API - Error type:', typeof error)
      console.error('🚨 Auth API - Error details:', {
        message: (error as any)?.message,
        response: (error as any)?.response,
        status: (error as any)?.response?.status,
        data: (error as any)?.response?.data
      })
      throw error
    }
  },

  logout: async (): Promise<void> => {
    await apiClient.post('/auth/logout')
  },

  refreshToken: async (): Promise<RefreshTokenResponse> => {
    const response = await apiClient.post<{ success: boolean; data: RefreshTokenResponse }>('/auth/refresh')
    return response.data.data!
  },

  getProfile: async (): Promise<User> => {
    const response = await apiClient.get<{ success: boolean; data: User }>('/auth/profile')
    return response.data.data!
  },

  updateProfile: async (data: Partial<User>): Promise<User> => {
    const response = await apiClient.patch<{ success: boolean; data: User }>('/auth/profile', data)
    return response.data.data!
  },
}