import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  role: 'SUPER_ADMIN' | 'COMPANY_ADMIN' | 'MANAGER' | 'SUPERVISOR' | 'EMPLOYEE'
  tenantId: string
  tenantName: string
  companyId: string
  status: 'ACTIVE' | 'INACTIVE' | 'PENDING'
  createdAt: string
  updatedAt: string
}

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  
  // Actions
  setAuth: (user: User, token: string) => void
  logout: () => void
  updateUser: (user: Partial<User>) => void
  validateStoredAuth: () => void
}

function isValidJWTFormat(token: string): boolean {
  if (!token || typeof token !== 'string') {
    return false
  }
  const parts = token.split('.')
  return parts.length === 3 && parts.every(part => part.length > 0)
}

function isTokenExpired(token: string): boolean {
  try {
    if (!isValidJWTFormat(token)) {
      return true
    }
    const payloadBase64 = token.split('.')[1]
    const payload = JSON.parse(atob(payloadBase64))
    const currentTime = Math.floor(Date.now() / 1000)
    return currentTime >= payload.exp
  } catch {
    return true
  }
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      setAuth: (user, token) => {
        console.log('🔍 Auth Store - setAuth called with:', { 
          user: user ? { id: user.id, email: user.email } : 'NO_USER', 
          token: token ? 'TOKEN_PROVIDED' : 'NO_TOKEN',
          tokenLength: token ? token.length : 0
        })
        
        // Validate token before setting
        if (!isValidJWTFormat(token) || isTokenExpired(token)) {
          console.warn('🚨 Auth Store - Invalid or expired token provided to setAuth')
          console.warn('🚨 Auth Store - Token format valid:', isValidJWTFormat(token))
          console.warn('🚨 Auth Store - Token expired:', isTokenExpired(token))
          return
        }

        console.log('🔍 Auth Store - Token validation passed, setting state...')
        set({
          user,
          token,
          isAuthenticated: true,
        })
        
        // Set cookie for middleware access
        if (typeof document !== 'undefined') {
          console.log('🔍 Auth Store - Setting auth-token cookie for middleware...')
          document.cookie = `auth-token=${token}; path=/; SameSite=Lax; secure=${location.protocol === 'https:'}`
        }
        
        console.log('🔍 Auth Store - State set successfully')
        const newState = get()
        console.log('🔍 Auth Store - New state:', {
          isAuthenticated: newState.isAuthenticated,
          hasUser: !!newState.user,
          hasToken: !!newState.token,
          userEmail: newState.user?.email || 'NO_EMAIL'
        })
      },

      logout: () => {
        console.log('🔍 Auth Store - logout called')
        
        // Clear cookie for middleware
        if (typeof document !== 'undefined') {
          console.log('🔍 Auth Store - Clearing auth-token cookie...')
          document.cookie = 'auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; SameSite=Lax'
        }
        
        set({
          user: null,
          token: null,
          isAuthenticated: false,
        })
        
        console.log('🔍 Auth Store - Logout complete')
      },

      updateUser: (updatedUser) => {
        const currentUser = get().user
        if (currentUser) {
          set({
            user: { ...currentUser, ...updatedUser },
          })
        }
      },

      validateStoredAuth: () => {
        const state = get()
        console.log('🔍 Auth Store - validateStoredAuth called')
        
        if (state.token) {
          if (!isValidJWTFormat(state.token) || isTokenExpired(state.token)) {
            console.log('🚨 Auth Store - Stored token is invalid or expired, logging out')
            state.logout()
          } else {
            // Token is valid, ensure cookie is set for middleware
            if (typeof document !== 'undefined') {
              console.log('🔍 Auth Store - Ensuring cookie is set for valid token')
              document.cookie = `auth-token=${state.token}; path=/; SameSite=Lax; secure=${location.protocol === 'https:'}`
            }
          }
        }
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        console.log('🔍 Auth Store - onRehydrateStorage called')
        // Validate stored token on rehydration
        if (state?.token) {
          if (!isValidJWTFormat(state.token) || isTokenExpired(state.token)) {
            console.log('🚨 Auth Store - Stored token is invalid or expired on rehydration, clearing auth')
            state.logout()
          } else if (typeof document !== 'undefined') {
            // Token is valid, set cookie for middleware
            console.log('🔍 Auth Store - Setting cookie on rehydration for valid token')
            document.cookie = `auth-token=${state.token}; path=/; SameSite=Lax; secure=${location.protocol === 'https:'}`
          }
        }
      },
    }
  )
)