'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/auth-store'
import { authApi } from '@/lib/api/auth'
import { queryKeys } from '@/lib/api'
import type { LoginForm, User } from '@/types'

export function useAuth() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { isAuthenticated, user, token, setAuth, logout: logoutStore } = useAuthStore()

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: (response) => {
      setAuth(response.user, response.token)
      queryClient.setQueryData(queryKeys.profile(), response.user)
      router.push('/dashboard')
    },
    onError: (error: any) => {
      console.error('Login failed:', error)
    },
  })

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: authApi.logout,
    onSuccess: () => {
      logoutStore()
      queryClient.clear()
      router.push('/auth/login')
    },
    onError: () => {
      // Even if API call fails, clear local state
      logoutStore()
      queryClient.clear()
      router.push('/auth/login')
    },
  })

  // Profile query - only run when authenticated
  const profileQuery = useQuery({
    queryKey: queryKeys.profile(),
    queryFn: authApi.getProfile,
    enabled: isAuthenticated && !!token,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: (failureCount, error: any) => {
      // Don't retry if unauthorized
      if (error?.response?.status === 401) {
        return false
      }
      return failureCount < 2
    },
    onError: (error: any) => {
      if (error?.response?.status === 401) {
        // Token expired or invalid
        logoutStore()
        router.push('/auth/login')
      }
    },
  })

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: authApi.updateProfile,
    onSuccess: (updatedUser) => {
      // Update auth store
      useAuthStore.getState().updateUser(updatedUser)
      
      // Update query cache
      queryClient.setQueryData(queryKeys.profile(), updatedUser)
    },
  })

  // Refresh token mutation
  const refreshTokenMutation = useMutation({
    mutationFn: authApi.refreshToken,
    onSuccess: (response) => {
      // Update token in store
      const currentUser = useAuthStore.getState().user
      if (currentUser) {
        setAuth(currentUser, response.token)
      }
    },
    onError: () => {
      // Refresh failed, logout user
      logoutStore()
      router.push('/auth/login')
    },
  })

  return {
    // State
    isAuthenticated,
    user: profileQuery.data || user,
    token,
    isLoading: profileQuery.isLoading,
    
    // Actions
    login: (credentials: LoginForm) => loginMutation.mutate(credentials),
    logout: () => logoutMutation.mutate(),
    updateProfile: (data: Partial<User>) => updateProfileMutation.mutate(data),
    refreshToken: () => refreshTokenMutation.mutate(),
    
    // Mutation states
    loginLoading: loginMutation.isPending,
    loginError: loginMutation.error,
    logoutLoading: logoutMutation.isPending,
    updateProfileLoading: updateProfileMutation.isPending,
    updateProfileError: updateProfileMutation.error,
  }
}

// Hook for automatic token refresh
export function useTokenRefresh() {
  const { refreshToken } = useAuth()
  const { token } = useAuthStore()

  // Automatically refresh token when it's about to expire
  // This would typically be triggered by an interceptor or timer
  const scheduleTokenRefresh = () => {
    if (!token) return

    try {
      // Decode JWT to get expiration time
      const payload = JSON.parse(atob(token.split('.')[1]))
      const expirationTime = payload.exp * 1000
      const currentTime = Date.now()
      const timeUntilExpiry = expirationTime - currentTime
      
      // Refresh 5 minutes before expiry
      const refreshTime = timeUntilExpiry - 5 * 60 * 1000
      
      if (refreshTime > 0) {
        setTimeout(() => {
          refreshToken()
        }, refreshTime)
      }
    } catch (error) {
      console.error('Failed to parse token for auto-refresh:', error)
    }
  }

  return { scheduleTokenRefresh }
}