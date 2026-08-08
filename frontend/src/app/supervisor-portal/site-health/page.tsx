'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  Activity, 
  Shield, 
  Users, 
  AlertTriangle, 
  CheckCircle, 
  TrendingUp,
  RefreshCw,
  Eye
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { supervisorPortalApi, SiteHealthData as ApiSiteHealthData } from '@/lib/api/supervisor-portal'
import Link from 'next/link'

interface SiteHealthData {
  overallHealth: string
  overallScore: number
  sites: Array<{
    siteId: string
    siteName: string
    overallHealth: string
    overallScore: number
    metrics: {
      deployment: any
      attendance: any
      incidents: any
    }
    lastUpdated: string
  }>
  summary: {
    healthySites: number
    warningSites: number
    criticalSites: number
  }
}

export default function SiteHealthPage() {
  const [healthData, setHealthData] = useState<SiteHealthData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const { toast } = useToast()

  const fetchHealthData = async (showRefreshToast = false) => {
    try {
      if (showRefreshToast) {
        setRefreshing(true)
      }

      const response = await supervisorPortalApi.getSiteHealth({
        includeDetails: true
      })
      setHealthData(response)

      if (showRefreshToast) {
        toast({
          title: 'Site Health Updated',
          description: 'All site health data has been refreshed.',
        })
      }
    } catch (error) {
      console.error('Failed to fetch site health data:', error)
      toast({
        title: 'Error',
        description: 'Failed to load site health data. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchHealthData()
  }, [])

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'GOOD':
        return 'bg-green-500'
      case 'WARNING':
        return 'bg-yellow-500'
      case 'CRITICAL':
        return 'bg-red-500'
      default:
        return 'bg-gray-500'
    }
  }

  const getHealthBadge = (health: string) => {
    switch (health) {
      case 'GOOD':
        return <Badge className="bg-green-100 text-green-700">Good</Badge>
      case 'WARNING':
        return <Badge className="bg-yellow-100 text-yellow-700">Warning</Badge>
      case 'CRITICAL':
        return <Badge className="bg-red-100 text-red-700">Critical</Badge>
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  if (loading || !healthData) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-gray-600">Loading site health monitoring...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Site Health Monitoring</h1>
          <p className="text-gray-600 mt-1">
            Real-time health status and performance metrics for all assigned sites
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/supervisor-portal">
            <Button variant="outline">Back to Dashboard</Button>
          </Link>
          <Button onClick={() => fetchHealthData(true)} disabled={refreshing} variant="outline">
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Overall Health Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-6 w-6" />
            Overall Health Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <div className={`w-16 h-16 rounded-full ${getHealthColor(healthData.overallHealth)} flex items-center justify-center`}>
                  <span className="text-white font-bold text-xl">{healthData.overallScore}</span>
                </div>
              </div>
              <p className="text-sm text-gray-600">Overall Score</p>
              {getHealthBadge(healthData.overallHealth)}
            </div>

            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 mb-2">{healthData.summary.healthySites}</div>
              <p className="text-sm text-gray-600">Healthy Sites</p>
              <CheckCircle className="w-6 h-6 text-green-500 mx-auto mt-2" />
            </div>

            <div className="text-center">
              <div className="text-3xl font-bold text-yellow-600 mb-2">{healthData.summary.warningSites}</div>
              <p className="text-sm text-gray-600">Warning Sites</p>
              <AlertTriangle className="w-6 h-6 text-yellow-500 mx-auto mt-2" />
            </div>

            <div className="text-center">
              <div className="text-3xl font-bold text-red-600 mb-2">{healthData.summary.criticalSites}</div>
              <p className="text-sm text-gray-600">Critical Sites</p>
              <AlertTriangle className="w-6 h-6 text-red-500 mx-auto mt-2" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Individual Site Health */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {healthData.sites.map((site) => (
          <Card key={site.siteId} className={`border-l-4 ${
            site.overallHealth === 'GOOD' ? 'border-l-green-500' :
            site.overallHealth === 'WARNING' ? 'border-l-yellow-500' :
            'border-l-red-500'
          }`}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  {site.siteName}
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-lg">{site.overallScore}%</span>
                  {getHealthBadge(site.overallHealth)}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Deployment Health */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Deployment ({site.metrics.deployment.score}%)
                  </span>
                  <Badge variant={site.metrics.deployment.status === 'GOOD' ? 'secondary' : 'destructive'}>
                    {site.metrics.deployment.status}
                  </Badge>
                </div>
                <Progress value={site.metrics.deployment.score} className="h-2" />
                <div className="text-xs text-gray-600 mt-1">
                  {site.metrics.deployment.details.assigned}/{site.metrics.deployment.details.required} guards assigned
                </div>
              </div>

              {/* Attendance Health */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    Attendance ({site.metrics.attendance.score}%)
                  </span>
                  <Badge variant={site.metrics.attendance.status === 'GOOD' ? 'secondary' : 'destructive'}>
                    {site.metrics.attendance.status}
                  </Badge>
                </div>
                <Progress value={site.metrics.attendance.score} className="h-2" />
                <div className="text-xs text-gray-600 mt-1">
                  {site.metrics.attendance.details.attendanceRate}% attendance rate ({site.metrics.attendance.details.period})
                </div>
              </div>

              {/* Incidents Health */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Incidents ({site.metrics.incidents.score}%)
                  </span>
                  <Badge variant={site.metrics.incidents.status === 'GOOD' ? 'secondary' : 'destructive'}>
                    {site.metrics.incidents.status}
                  </Badge>
                </div>
                <Progress value={site.metrics.incidents.score} className="h-2" />
                <div className="text-xs text-gray-600 mt-1">
                  {site.metrics.incidents.details.incidents} incidents ({site.metrics.incidents.details.period})
                </div>
              </div>

              <div className="flex justify-between items-center pt-2">
                <span className="text-xs text-gray-500">
                  Last updated: {new Date(site.lastUpdated).toLocaleString()}
                </span>
                <Button size="sm" variant="outline">
                  <Eye className="w-4 h-4 mr-1" />
                  Details
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}