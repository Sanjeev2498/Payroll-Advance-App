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
  const { isAuthenticated, user, token, refreshToken, setAuth, logout } = useAuthStore()
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null)

  useEffect(() => {
    console.log('🔍 ProtectedRoute effect running:', { isAuthenticated, hasToken: !!token, hasUser: !!user, requiredRoles })
    
    const validateAuth = async () => {
      try {
        // If not authenticated at all, redirect immediately
        if (!isAuthenticated || !token) {
          console.log('❌ No authentication found, redirecting to login')
          router.push('/auth/login')
          return
        }

        // Check role authorization first (before API calls)
        if (requiredRoles.length > 0 && user) {
          const hasRequiredRole = requiredRoles.includes(user.role)
          if (!hasRequiredRole) {
            console.log('❌ User does not have required role, access denied')
            setIsAuthorized(false)
            setIsLoading(false)
            return
          }
        }

        // Verify token is still valid (but don't block UI during this check)
        try {
          const profile = await authApi.getProfile()
          
          // Update user data if different
          if (JSON.stringify(profile) !== JSON.stringify(user)) {
            setAuth(profile, token, refreshToken || '')
          }
        } catch (error) {
          // Token invalid, logout user (only if we're sure it's invalid)
          console.log('❌ Token validation failed, redirecting to login')
          logout()
          router.push('/auth/login')
          return
        }

        // All checks passed - allow access
        console.log('✅ Authorization successful')
        setIsAuthorized(true)
        setIsLoading(false)
      } catch (error) {
        console.error('Auth validation error:', error)
        // Only logout if we're sure there's an auth error
        if (!isAuthenticated) {
          logout()
          router.push('/auth/login')
        } else {
          // If user is authenticated but there's an API error, still allow access
          setIsAuthorized(true)
          setIsLoading(false)
        }
      }
    }

    validateAuth()
  }, [isAuthenticated, token, user, requiredRoles, router, setAuth, logout, refreshToken])

  // Show loading while checking authentication (but only initially)
  if (isLoading) {
    console.log('🔄 Rendering loading state')
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-blue-600 mx-auto mb-4" />
          <p className="text-sm text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  // Show access denied only if authorization explicitly failed
  if (isAuthorized === false) {
    console.log('❌ Rendering access denied')
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
              onClick={() => router.push('/auth/login')}
              className="text-blue-600 hover:text-blue-500"
            >
              Return to Login
            </button>
          </div>
        </div>
      )
    )
  }

  // Only render children if explicitly authorized
  if (isAuthorized === true) {
    console.log('✅ Rendering authorized content')
    return <>{children}</>
  }

  // Fallback loading state (should not happen)
  console.log('⚠️ Rendering fallback null state')
  return null
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