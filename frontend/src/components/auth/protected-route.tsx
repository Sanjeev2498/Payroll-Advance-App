'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/auth-store'
import { authApi } from '@/lib/api/auth'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRoles?: string[]
  fallback?: React.ReactNode
}

export function ProtectedRoute({ 
  children, 
  requiredRoles = [],
  fallback 
}: ProtectedRouteProps) {
  const router = useRouter()
  const { isAuthenticated, user, token, setAuth, logout } = useAuthStore()
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthorized, setIsAuthorized] = useState(false)

  useEffect(() => {
    const validateAuth = async () => {
      try {
        if (!isAuthenticated || !token) {
          router.push('/auth/login')
          return
        }

        // Verify token is still valid by fetching profile
        try {
          const profile = await authApi.getProfile()
          
          // Update user data if different
          if (JSON.stringify(profile) !== JSON.stringify(user)) {
            setAuth(profile, token)
          }
        } catch (error) {
          // Token invalid, logout user
          logout()
          router.push('/auth/login')
          return
        }

        // Check role authorization if roles are specified
        if (requiredRoles.length > 0 && user) {
          const hasRequiredRole = requiredRoles.includes(user.role)
          if (!hasRequiredRole) {
            setIsAuthorized(false)
            setIsLoading(false)
            return
          }
        }

        setIsAuthorized(true)
      } catch (error) {
        console.error('Auth validation error:', error)
        logout()
        router.push('/auth/login')
      } finally {
        setIsLoading(false)
      }
    }

    validateAuth()
  }, [isAuthenticated, token, user, requiredRoles, router, setAuth, logout])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-blue-600 mx-auto mb-4" />
          <p className="text-sm text-gray-600">Verifying authentication...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated || !isAuthorized) {
    return (
      fallback || (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Access Denied
            </h2>
            <p className="text-gray-600 mb-4">
              You don't have permission to access this page.
            </p>
            <button
              onClick={() => router.push('/dashboard')}
              className="text-blue-600 hover:text-blue-500"
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      )
    )
  }

  return <>{children}</>
}

// Hook for role-based conditional rendering
export function useAuthPermissions() {
  const user = useAuthStore((state) => state.user)

  const hasRole = (roles: string | string[]) => {
    if (!user) return false
    const roleArray = Array.isArray(roles) ? roles : [roles]
    return roleArray.includes(user.role)
  }

  const isAdmin = () => hasRole(['SUPER_ADMIN', 'COMPANY_ADMIN'])
  const isManager = () => hasRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'MANAGER'])
  const isSupervisor = () => hasRole(['SUPER_ADMIN', 'COMPANY_ADMIN', 'MANAGER', 'SUPERVISOR'])

  return {
    user,
    hasRole,
    isAdmin,
    isManager,
    isSupervisor,
  }
}