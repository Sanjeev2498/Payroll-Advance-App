'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/auth-store'
import { authApi } from '@/lib/api/auth'
import { queryKeys } from '@/lib/api'
import type { LoginForm, User } from '@/types'

export function useAuth(): {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (credentials: LoginForm) => void;
  logout: () => void;
  updateProfile: (data: Partial<User>) => void;
  refreshToken: () => void;
  loginLoading: boolean;
  loginError: any;
  logoutLoading: boolean;
  updateProfileLoading: boolean;
  updateProfileError: any;
} {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { isAuthenticated, user, token, setAuth, logout: logoutStore } = useAuthStore()

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: (credentials: LoginForm) => {
      console.log('🔍 Login Mutation - Starting with credentials:', { email: credentials.email, password: '***' })
      console.log('🔍 Login Mutation - Calling authApi.login...')
      return authApi.login(credentials)
    },
    onSuccess: (response) => {
      console.log('🎉 Login Success - Full Response:', response)
      console.log('🎉 Login Success - Response type:', typeof response)
      console.log('🎉 Login Success - Response keys:', Object.keys(response))
      
      try {
        // Check if response structure is correct
        if (!response || !response.data) {
          console.error('🚨 Invalid response structure:', response)
          throw new Error('Invalid response structure from server')
        }

        // Extract user and token from the nested response structure
        const { user, tokens } = response.data
        console.log('🎉 Login Success - User:', user)
        console.log('🎉 Login Success - Tokens:', tokens)
        
        if (!user || !tokens || !tokens.accessToken) {
          console.error('🚨 Missing user or token data:', { user, tokens })
          throw new Error('Missing user or token data in response')
        }
        
        console.log('🎉 Login Success - Setting auth state...')
        setAuth(user, tokens.accessToken, tokens.refreshToken)
        console.log('🎉 Login Success - Auth state set, updating query cache...')
        queryClient.setQueryData(queryKeys.profile(), user)
        
        console.log('🎉 Login Success - Auth store state after setAuth:', { 
          isAuthenticated: useAuthStore.getState().isAuthenticated,
          user: useAuthStore.getState().user,
          token: useAuthStore.getState().token ? 'TOKEN_EXISTS' : 'NO_TOKEN'
        })
        
        console.log('🎉 Login Success - Preparing to redirect to dashboard...')
        
        // Immediate check of authentication status
        const currentAuthState = useAuthStore.getState()
        console.log('🔍 Current auth state before redirect:', {
          isAuthenticated: currentAuthState.isAuthenticated,
          hasUser: !!currentAuthState.user,
          hasToken: !!currentAuthState.token
        })
        
        // Force redirect after a small delay to ensure state is updated
        console.log('🎉 Login Success - Starting redirect process...')
        setTimeout(() => {
          console.log('🔄 Redirect timeout - checking auth state again...')
          const finalAuthState = useAuthStore.getState()
          console.log('🔍 Final auth state:', {
            isAuthenticated: finalAuthState.isAuthenticated,
            hasUser: !!finalAuthState.user,
            hasToken: !!finalAuthState.token
          })
          
          console.log('🔄 Attempting router.push to /dashboard...')
          router.push('/dashboard')
          
          // Backup: force page navigation if router.push doesn't work
          console.log('🔄 Setting backup redirect with window.location.href...')
          setTimeout(() => {
            console.log('🔄 Backup redirect executing...')
            window.location.href = '/dashboard'
          }, 500)
        }, 100)
        
      } catch (error) {
        console.error('🚨 Login Success Handler Error:', error)
        console.error('🚨 Error stack:', error instanceof Error ? error.stack : 'No stack available')
      }
    },
    onError: (error: any) => {
      console.error('🚨 Login failed:', error)
      console.error('🚨 Error response:', error?.response)
      console.error('🚨 Error data:', error?.response?.data)
      console.error('🚨 Error status:', error?.response?.status)
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
        setAuth(currentUser, response.accessToken, response.refreshToken)
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
    user: profileQuery.data || user || null,
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