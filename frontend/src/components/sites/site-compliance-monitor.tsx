'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Site } from '@/types'

interface SiteComplianceMonitorProps {
  sites: Site[]
}

export function SiteComplianceMonitor({ sites }: SiteComplianceMonitorProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Safety & Compliance Monitor</CardTitle>
          <CardDescription>
            Track compliance status, safety protocols, and regulatory requirements
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            Compliance monitoring dashboard coming soon
          </div>
        </CardContent>
      </Card>
    </div>
  )
}