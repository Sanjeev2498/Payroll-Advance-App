'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Site } from '@/types'

interface GuardDeploymentTrackerProps {
  sites: Site[]
}

export function GuardDeploymentTracker({ sites }: GuardDeploymentTrackerProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Guard Deployment Tracker</CardTitle>
          <CardDescription>
            Monitor guard assignments and deployment status across all sites
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            Guard deployment tracking dashboard coming soon
          </div>
        </CardContent>
      </Card>
    </div>
  )
}