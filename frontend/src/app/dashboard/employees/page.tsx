'use client'

import { EmployeeManagement } from '@/components/employees/employee-management'
import { ProtectedRoute } from '@/components/auth/protected-route'

export default function EmployeesPage() {
  return (
    <ProtectedRoute requiredRoles={['SUPER_ADMIN', 'COMPANY_ADMIN', 'SUPERVISOR']}>
      <EmployeeManagement />
    </ProtectedRoute>
  )
}