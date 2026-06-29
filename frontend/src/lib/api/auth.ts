import { apiClient } from '../api'
import { User, LoginForm } from '@/types'

export interface LoginResponse {
  user: User
  token: string
}

export interface RefreshTokenResponse {
  token: string
}

export const authApi = {
  login: async (credentials: LoginForm): Promise<LoginResponse> => {
    const response = await apiClient.post<LoginResponse>('/auth/login', credentials)
    return response.data!
  },

  logout: async (): Promise<void> => {
    await apiClient.post('/auth/logout')
  },

  refreshToken: async (): Promise<RefreshTokenResponse> => {
    const response = await apiClient.post<RefreshTokenResponse>('/auth/refresh')
    return response.data!
  },

  getProfile: async (): Promise<User> => {
    const response = await apiClient.get<User>('/auth/profile')
    return response.data!
  },

  updateProfile: async (data: Partial<User>): Promise<User> => {
    const response = await apiClient.patch<User>('/auth/profile', data)
    return response.data!
  },
}