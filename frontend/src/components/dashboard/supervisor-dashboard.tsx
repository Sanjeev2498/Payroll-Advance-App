'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { useAuthPermissions } from '@/components/auth/protected-route'
import { supervisorPortalApi } from '@/lib/api/supervisor-portal'
import Link from 'next/link'

interface SupervisorDashboardProps {
  className?: string
}

export function SupervisorDashboard({ className }: SupervisorDashboardProps) {
  const { user } = useAuthPermissions()
  const [dashboardData, setDashboardData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await supervisorPortalApi.getDashboard()
        setDashboardData(response)
      } catch (error) {
        console.error('Failed to fetch supervisor dashboard data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading || !dashboardData) {
    return (
      <div className={className}>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading dashboard...</p>
          </div>
        </div>
      </div>
    )
  }

  // Use real API data
  const teamMetrics = {
    totalEmployees: dashboardData.overview?.totalGuards || 0,
    activeToday: dashboardData.overview?.guardsOnDuty || 0,
    attendanceRate: dashboardData.attendanceOverview?.attendanceRate || 0,
    sitesManaged: dashboardData.overview?.totalSites || 0,
    hoursThisWeek: dashboardData.todayStats?.activeAssignments * 8 || 0, // Estimate
  }

  const siteStatus: Array<{
    name: string;
    status: string;
    employees: number;
    capacity: number;
  }> = dashboardData.assignedSites?.map((site: any) => ({
    name: site.name,
    status: site.currentGuards === site.requiredGuards ? 'fully-staffed' : 
           site.currentGuards < site.requiredGuards ? 'understaffed' : 'overstaffed',
    employees: site.currentGuards,
    capacity: site.requiredGuards
  })) || []

  const recentAlerts: Array<{
    id: number;
    type: string;
    message: string;
    time: string;
    severity: string;
  }> = dashboardData.activeAlerts?.map((alert: any, index: number) => ({
    id: index + 1,
    type: 'alert',
    message: alert.message,
    time: new Date(alert.timestamp).toLocaleTimeString(),
    severity: alert.severity?.toLowerCase() || 'medium'
  })) || []

  // For team activity, we'll use a placeholder until we have real endpoint
  const teamActivity = [
    { employee: 'Real-time activity', site: 'All Sites', action: 'Data from API', time: new Date().toLocaleTimeString() }
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'fully-staffed':
        return 'bg-green-50 text-green-700 border-green-200'
      case 'understaffed':
        return 'bg-red-50 text-red-700 border-red-200'
      case 'overstaffed':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200'
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200'
    }
  }

  const getAlertColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'border-l-red-500 bg-red-50'
      case 'medium':
        return 'border-l-yellow-500 bg-yellow-50'
      case 'low':
        return 'border-l-blue-500 bg-blue-50'
      default:
        return 'border-l-gray-500 bg-gray-50'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'fully-staffed':
        return '✅'
      case 'understaffed':
        return '⚠️'
      case 'overstaffed':
        return '📈'
      default:
        return '❓'
    }
  }

  return (
    <div className={className}>
      {/* Welcome Section */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Good morning, {user?.firstName}!
        </h1>
        <p className="text-gray-600">
          Here's your team's operational status and recent activity
        </p>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Team Members</p>
                <p className="text-2xl font-bold">{teamMetrics.totalEmployees}</p>
              </div>
              <div className="text-2xl">👥</div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Today</p>
                <p className="text-2xl font-bold text-green-600">{teamMetrics.activeToday}</p>
              </div>
              <div className="text-2xl">✅</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Attendance Rate</p>
                <p className="text-2xl font-bold text-blue-600">{teamMetrics.attendanceRate}%</p>
              </div>
              <div className="text-2xl">📊</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Sites Managed</p>
                <p className="text-2xl font-bold">{teamMetrics.sitesManaged}</p>
              </div>
              <div className="text-2xl">📍</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Hours This Week</p>
                <p className="text-2xl font-bold">{teamMetrics.hoursThisWeek}</p>
              </div>
              <div className="text-2xl">⏰</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Site Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Site Staffing Status
                <Button size="sm" variant="outline" asChild>
                  <Link href="/dashboard/sites">View All Sites</Link>
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {siteStatus.map((site, index) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex items-center space-x-3">
                      <span className="text-xl">{getStatusIcon(site.status)}</span>
                      <div>
                        <h3 className="font-medium">{site.name}</h3>
                        <p className="text-sm text-gray-600">
                          {site.employees} of {site.capacity} positions filled
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Progress 
                        value={(site.employees / site.capacity) * 100} 
                        className="w-20"
                      />
                      <Badge 
                        variant="outline" 
                        className={getStatusColor(site.status)}
                      >
                        {site.status.replace('-', ' ')}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Team Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Recent Team Activity
                <Button size="sm" variant="outline" asChild>
                  <Link href="/dashboard/attendance">View Details</Link>
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {teamActivity.map((activity, index) => (
                  <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                    <div className="flex items-center space-x-3">
                      <div className={`w-2 h-2 rounded-full ${
                        activity.action.includes('Clocked In') ? 'bg-green-400' : 
                        activity.action.includes('Break') ? 'bg-yellow-400' : 'bg-blue-400'
                      }`} />
                      <div>
                        <p className="font-medium text-sm">{activity.employee}</p>
                        <p className="text-xs text-gray-500">{activity.site}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm">{activity.action}</p>
                      <p className="text-xs text-gray-500">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Alerts */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between">
                Active Alerts
                <Badge variant="destructive">{recentAlerts.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentAlerts.map((alert) => (
                  <div key={alert.id} className={`p-3 rounded-lg border-l-4 ${getAlertColor(alert.severity)}`}>
                    <p className="text-sm font-medium">{alert.message}</p>
                    <p className="text-xs text-gray-500 mt-1">{alert.time}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 text-center">
                <Button size="sm" variant="outline" className="w-full">
                  View All Alerts
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Supervisor Tools</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full justify-start" variant="outline" asChild>
                <Link href="/dashboard/attendance">
                  <span className="mr-2">📋</span>
                  Review Attendance
                </Link>
              </Button>
              <Button className="w-full justify-start" variant="outline" asChild>
                <Link href="/dashboard/assignments">
                  <span className="mr-2">📝</span>
                  Manage Assignments
                </Link>
              </Button>
              <Button className="w-full justify-start" variant="outline" asChild>
                <Link href="/dashboard/sites">
                  <span className="mr-2">📍</span>
                  Site Management
                </Link>
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <span className="mr-2">📞</span>
                Contact Team
              </Button>
            </CardContent>
          </Card>

          {/* Team Performance */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Team Performance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Weekly Target</span>
                  <span>85%</span>
                </div>
                <Progress value={85} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Quality Score</span>
                  <span>92%</span>
                </div>
                <Progress value={92} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>On-time Rate</span>
                  <span>95%</span>
                </div>
                <Progress value={95} className="h-2" />
              </div>
            </CardContent>
          </Card>

          {/* Schedule Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Today's Schedule</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Morning Shifts</span>
                  <span className="font-medium">6 active</span>
                </div>
                <div className="flex justify-between">
                  <span>Afternoon Shifts</span>
                  <span className="font-medium">4 scheduled</span>
                </div>
                <div className="flex justify-between">
                  <span>Night Shifts</span>
                  <span className="font-medium">2 scheduled</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-gray-200">
                  <span className="font-medium">Total Coverage</span>
                  <span className="font-bold text-green-600">100%</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}