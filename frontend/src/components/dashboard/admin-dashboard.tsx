'use client'

import { EnterpriseOperationsCenter } from './enterprise-operations-center'
import { useAuthPermissions } from '@/components/auth/protected-route'

interface AdminDashboardProps {
  className?: string
}

export function AdminDashboard({ className }: AdminDashboardProps) {
  const { user } = useAuthPermissions()

  return (
    <div className={className}>
      <EnterpriseOperationsCenter />
    </div>
  )
}