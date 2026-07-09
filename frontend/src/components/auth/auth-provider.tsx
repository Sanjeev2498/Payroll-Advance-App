'use client'

import { createContext, useContext, useEffect, useRef, ReactNode } from 'react'
import { useAuthStore } from '@/stores/auth-store'
import { authApi } from '@/lib/api/auth'
import { isValidJWTFormat, decodeJWTPayload, isTokenExpired } from '@/lib/utils/token'

interface AuthContextType {
  refreshToken: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function useAuthContext() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const { token, setAuth, logout, user, validateStoredAuth } = useAuthStore()
  const refreshTimeoutRef = useRef<NodeJS.Timeout>()

  // Validate stored authentication on component mount
  useEffect(() => {
    validateStoredAuth()
  }, [validateStoredAuth])

  const refreshToken = async () => {
    if (!token) return

    try {
      const response = await authApi.refreshToken()
      if (user) {
        setAuth(user, response.accessToken, response.refreshToken)
      }
    } catch (error) {
      console.error('Token refresh failed:', error)
      logout()
    }
  }

  const scheduleTokenRefresh = (token: string) => {
    // Clear any existing timeout
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current)
    }

    // Validate token format and decode payload
    if (!isValidJWTFormat(token)) {
      console.warn('Invalid JWT token format, logging out')
      logout()
      return
    }

    const payload = decodeJWTPayload(token)
    if (!payload) {
      console.warn('Failed to decode JWT payload, logging out')
      logout()
      return
    }

    // Check if token is already expired
    if (isTokenExpired(token)) {
      console.log('Token expired, refreshing immediately')
      refreshToken()
      return
    }

    try {
      const expirationTime = payload.exp * 1000
      const currentTime = Date.now()
      const timeUntilExpiry = expirationTime - currentTime
      
      // Refresh 5 minutes before expiry
      const refreshTime = Math.max(0, timeUntilExpiry - 5 * 60 * 1000)
      
      refreshTimeoutRef.current = setTimeout(() => {
        refreshToken()
      }, refreshTime)
      
      console.log(`Token refresh scheduled in ${Math.round(refreshTime / 1000 / 60)} minutes`)
    } catch (error) {
      console.error('Failed to schedule token refresh:', error)
      logout()
    }
  }

  useEffect(() => {
    if (token) {
      scheduleTokenRefresh(token)
    }

    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current)
      }
    }
  }, [token])

  // Handle tab visibility change to refresh token when user returns
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && token) {
        // Validate token and check expiry when user returns
        if (!isValidJWTFormat(token)) {
          console.warn('Invalid JWT token format detected on visibility change')
          logout()
          return
        }

        if (isTokenExpired(token)) {
          console.log('Token expired on visibility change, refreshing')
          refreshToken()
          return
        }

        const payload = decodeJWTPayload(token)
        if (!payload) {
          console.warn('Failed to decode token on visibility change')
          logout()
          return
        }

        const expirationTime = payload.exp * 1000
        const currentTime = Date.now()
        const timeUntilExpiry = expirationTime - currentTime
        
        // If token expires in less than 10 minutes, refresh it
        if (timeUntilExpiry < 10 * 60 * 1000) {
          console.log('Token expires soon, refreshing proactively')
          refreshToken()
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [token])

  const contextValue: AuthContextType = {
    refreshToken,
  }

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  )
}