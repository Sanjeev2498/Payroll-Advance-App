'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Site } from '@/types'

interface SiteOperationalDashboardProps {
  sites: Site[]
}

export function SiteOperationalDashboard({ sites }: SiteOperationalDashboardProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Site Performance Analytics</CardTitle>
          <CardDescription>
            Monitor operational metrics across all sites
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            Performance analytics dashboard coming soon
          </div>
        </CardContent>
      </Card>
    </div>
  )
}