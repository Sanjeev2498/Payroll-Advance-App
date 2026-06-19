'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function EmployeesPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Employees</h1>
          <p className="text-gray-600">Manage your workforce and employee information</p>
        </div>
        <Button>Add New Employee</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Employee Directory</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">Employee management functionality will be implemented in future tasks.</p>
        </CardContent>
      </Card>
    </div>
  )
}