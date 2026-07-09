'use client'

import { useAuthPermissions } from '@/components/auth/protected-route'
import { EmployeeDashboard } from './employee-dashboard'
import { SupervisorDashboard as SupervisorOperationsDashboard } from './supervisor-dashboard'
import { SupervisorDashboard } from '@/components/supervisor/supervisor-dashboard'
import { AdminDashboard } from './admin-dashboard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface RoleBasedDashboardProps {
  className?: string
}

export function RoleBasedDashboard({ className }: RoleBasedDashboardProps) {
  const { user, hasRole } = useAuthPermissions()

  // If no user is available, show loading state
  if (!user) {
    return (
      <div className={className}>
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-blue-600 mx-auto mb-4" />
            <p className="text-sm text-gray-600">Loading dashboard...</p>
          </div>
        </div>
      </div>
    )
  }

  // Render role-specific dashboard based on user's role
  // Higher privilege roles get access to their specific dashboards
  if (hasRole(['SUPER_ADMIN', 'COMPANY_ADMIN'])) {
    return <AdminDashboard className={className} />
  }

  if (hasRole(['SUPERVISOR'])) {
    return <SupervisorDashboard className={className} />
  }

  if (hasRole(['MANAGER'])) {
    return <SupervisorOperationsDashboard className={className} />
  }

  if (hasRole(['EMPLOYEE'])) {
    return <EmployeeDashboard className={className} />
  }

  // Fallback for unknown roles
  return (
    <div className={className}>
      <div className="flex items-center justify-center min-h-96">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-xl text-gray-900">
              Access Restricted
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <div className="text-6xl">🔒</div>
            <div>
              <p className="text-gray-600 mb-2">
                Your role ({user.role}) does not have access to a dashboard interface.
              </p>
              <p className="text-sm text-gray-500">
                Please contact your administrator if you believe this is an error.
              </p>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="text-sm text-gray-600">
                <p><strong>User:</strong> {user.firstName} {user.lastName}</p>
                <p><strong>Email:</strong> {user.email}</p>
                <p><strong>Role:</strong> {user.role}</p>
                <p><strong>Company:</strong> {user.tenantName || 'N/A'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}