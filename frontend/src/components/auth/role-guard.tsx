'use client'

import { useAuthPermissions } from './protected-route'

interface RoleGuardProps {
  children: React.ReactNode
  roles: string | string[]
  fallback?: React.ReactNode
  showFallback?: boolean
}

export function RoleGuard({ 
  children, 
  roles, 
  fallback,
  showFallback = false 
}: RoleGuardProps) {
  const { hasRole } = useAuthPermissions()

  if (!hasRole(roles)) {
    if (showFallback && fallback) {
      return <>{fallback}</>
    }
    return null
  }

  return <>{children}</>
}

// Pre-configured role components for common use cases
export function AdminOnly({ children, fallback }: { children: React.ReactNode, fallback?: React.ReactNode }) {
  return (
    <RoleGuard roles={['SUPER_ADMIN', 'COMPANY_ADMIN']} fallback={fallback}>
      {children}
    </RoleGuard>
  )
}

export function ManagerOnly({ children, fallback }: { children: React.ReactNode, fallback?: React.ReactNode }) {
  return (
    <RoleGuard roles={['SUPER_ADMIN', 'COMPANY_ADMIN', 'MANAGER']} fallback={fallback}>
      {children}
    </RoleGuard>
  )
}

export function SupervisorOnly({ children, fallback }: { children: React.ReactNode, fallback?: React.ReactNode }) {
  return (
    <RoleGuard roles={['SUPER_ADMIN', 'COMPANY_ADMIN', 'MANAGER', 'SUPERVISOR']} fallback={fallback}>
      {children}
    </RoleGuard>
  )
}