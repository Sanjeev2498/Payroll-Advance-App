'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function ClientsPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Clients</h1>
          <p className="text-gray-600">Manage your client relationships and contracts</p>
        </div>
        <Button>Add New Client</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Client Portfolio</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">Client management functionality will be implemented in future tasks.</p>
        </CardContent>
      </Card>
    </div>
  )
}