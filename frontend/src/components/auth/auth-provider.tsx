'use client'

import { createContext, useContext, useEffect, useRef, ReactNode } from 'react'
import { useAuthStore } from '@/stores/auth-store'
import { authApi } from '@/lib/api/auth'

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
  const { token, setAuth, logout, user } = useAuthStore()
  const refreshTimeoutRef = useRef<NodeJS.Timeout>()

  const refreshToken = async () => {
    if (!token) return

    try {
      const response = await authApi.refreshToken()
      if (user) {
        setAuth(user, response.token)
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

    try {
      // Decode JWT to get expiration time
      const payload = JSON.parse(atob(token.split('.')[1]))
      const expirationTime = payload.exp * 1000
      const currentTime = Date.now()
      const timeUntilExpiry = expirationTime - currentTime
      
      // Refresh 5 minutes before expiry
      const refreshTime = Math.max(0, timeUntilExpiry - 5 * 60 * 1000)
      
      refreshTimeoutRef.current = setTimeout(() => {
        refreshToken()
      }, refreshTime)
    } catch (error) {
      console.error('Failed to parse token for auto-refresh:', error)
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
        // Check if token is close to expiry when user returns
        try {
          const payload = JSON.parse(atob(token.split('.')[1]))
          const expirationTime = payload.exp * 1000
          const currentTime = Date.now()
          const timeUntilExpiry = expirationTime - currentTime
          
          // If token expires in less than 10 minutes, refresh it
          if (timeUntilExpiry < 10 * 60 * 1000) {
            refreshToken()
          }
        } catch (error) {
          console.error('Failed to check token expiry:', error)
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