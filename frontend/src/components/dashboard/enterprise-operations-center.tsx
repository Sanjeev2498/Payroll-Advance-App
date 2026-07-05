'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Users, 
  Building2, 
  Shield, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  DollarSign, 
  FileText, 
  Bell,
  Activity,
  MapPin,
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw
} from 'lucide-react'
import { dashboardApi } from '@/lib/api/dashboard'
import { 
  KPIMetrics, 
  ActivityTimelineItem, 
  NotificationItem, 
  RealTimeAlert,
  DeploymentMetrics,
  GuardAvailability 
} from '@/types/dashboard'
import { useAuthPermissions } from '@/components/auth/protected-route'

interface EnterpriseOperationsCenterProps {
  className?: string
}

export function EnterpriseOperationsCenter({ className }: EnterpriseOperationsCenterProps) {
  const { user } = useAuthPermissions()
  
  const [kpis, setKpis] = useState<KPIMetrics | null>(null)
  const [deploymentMetrics, setDeploymentMetrics] = useState<DeploymentMetrics | null>(null)
  const [activityTimeline, setActivityTimeline] = useState<ActivityTimelineItem[]>([])
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [realTimeAlerts, setRealTimeAlerts] = useState<RealTimeAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const [kpiData, deploymentData, activityData, notificationData, alertData] = 
        await Promise.all([
          dashboardApi.getKPIMetrics().catch(() => null),
          dashboardApi.getDeploymentMetrics().catch(() => null),
          dashboardApi.getActivityTimeline(15).catch(() => []),
          dashboardApi.getNotifications(true).catch(() => []), // Only unread
          dashboardApi.getRealTimeAlerts().catch(() => [])
        ])

      setKpis(kpiData)
      setDeploymentMetrics(deploymentData)
      setActivityTimeline(Array.isArray(activityData) ? activityData : [])
      setNotifications(Array.isArray(notificationData) ? notificationData : [])
      setRealTimeAlerts(Array.isArray(alertData) ? alertData : [])
      setLastUpdated(new Date())
    } catch (err) {
      setError('Failed to load dashboard data')
      console.error('Dashboard data loading error:', err)
      
      // Set safe defaults on complete failure
      setKpis(null)
      setDeploymentMetrics(null)
      setActivityTimeline([])
      setNotifications([])
      setRealTimeAlerts([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDashboardData()
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadDashboardData, 30000)
    return () => clearInterval(interval)
  }, [])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD' 
    }).format(amount)
  }

  const getTimeAgo = (timestamp: string) => {
    const now = new Date()
    const time = new Date(timestamp)
    const diffInSeconds = Math.floor((now.getTime() - time.getTime()) / 1000)
    
    if (diffInSeconds < 60) return `${diffInSeconds}s ago`
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
    return `${Math.floor(diffInSeconds / 86400)}d ago`
  }

  const getSeverityBadgeColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500 text-white'
      case 'high': return 'bg-red-400 text-white'
      case 'medium': return 'bg-yellow-500 text-white'
      case 'low': return 'bg-blue-500 text-white'
      case 'info': return 'bg-blue-100 text-blue-800'
      case 'warning': return 'bg-yellow-100 text-yellow-800'
      case 'error': return 'bg-red-100 text-red-800'
      case 'success': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getOperationalStatusColor = (status: string) => {
    switch (status) {
      case 'optimal': return 'text-green-600'
      case 'understaffed': return 'text-yellow-600'
      case 'critical': return 'text-red-600'
      case 'offline': return 'text-gray-600'
      default: return 'text-gray-600'
    }
  }

  const getTrendIcon = (current: number, total: number) => {
    const percentage = (current / total) * 100
    if (percentage >= 90) return <TrendingUp className="w-4 h-4 text-green-500" />
    if (percentage >= 70) return <Minus className="w-4 h-4 text-yellow-500" />
    return <TrendingDown className="w-4 h-4 text-red-500" />
  }

  if (loading && !kpis) {
    return (
      <div className={className}>
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
            <p className="text-sm text-gray-600">Loading Operations Command Center...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={className}>
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <AlertTriangle className="w-8 h-8 mx-auto mb-4 text-red-600" />
            <p className="text-sm text-gray-600 mb-4">{error}</p>
            <Button onClick={loadDashboardData} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={className}>
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Enterprise Operations Command Center
          </h1>
          <p className="text-gray-600">
            Real-time oversight for {user?.tenantName || 'your organization'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </span>
          <Button 
            onClick={loadDashboardData} 
            variant="outline" 
            size="sm"
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Critical Alerts Banner */}
      {realTimeAlerts && Array.isArray(realTimeAlerts) && realTimeAlerts.filter(alert => alert.severity === 'critical').length > 0 && (
        <Card className="mb-6 border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <div>
                <h3 className="font-medium text-red-800">Critical Alerts Require Attention</h3>
                <p className="text-sm text-red-700">
                  {realTimeAlerts && Array.isArray(realTimeAlerts) ? realTimeAlerts.filter(alert => alert.severity === 'critical').length : 0} critical issues detected
                </p>
              </div>
              <Button variant="destructive" size="sm" className="ml-auto">
                View Alerts
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* KPI Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Active Guards */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Guards</p>
                <p className="text-2xl font-bold text-blue-600">{kpis?.activeGuards}</p>
                <p className="text-xs text-blue-600 flex items-center mt-1">
                  <Users className="w-3 h-3 mr-1" />
                  {kpis?.guardsOnDuty} currently on duty
                </p>
              </div>
              <div className="text-2xl">🛡️</div>
            </div>
          </CardContent>
        </Card>

        {/* Active Sites */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Sites</p>
                <p className="text-2xl font-bold text-green-600">{kpis?.activeSites}</p>
                <p className="text-xs text-green-600 flex items-center mt-1">
                  <Building2 className="w-3 h-3 mr-1" />
                  {deploymentMetrics?.optimalSites} operating optimally
                </p>
              </div>
              <div className="text-2xl">🏢</div>
            </div>
          </CardContent>
        </Card>

        {/* Vacant Positions */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Vacant Positions</p>
                <p className={`text-2xl font-bold ${(kpis?.vacantPositions || 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {kpis?.vacantPositions}
                </p>
                <p className={`text-xs flex items-center mt-1 ${(kpis?.vacantPositions || 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  <Shield className="w-3 h-3 mr-1" />
                  {(kpis?.vacantPositions || 0) === 0 ? 'Fully staffed' : 'Immediate action needed'}
                </p>
              </div>
              <div className="text-2xl">⚠️</div>
            </div>
          </CardContent>
        </Card>

        {/* Pending Approvals */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending Approvals</p>
                <p className={`text-2xl font-bold ${(kpis?.pendingApprovals.total || 0) > 0 ? 'text-yellow-600' : 'text-green-600'}`}>
                  {kpis?.pendingApprovals.total}
                </p>
                <p className="text-xs text-yellow-600 flex items-center mt-1">
                  <FileText className="w-3 h-3 mr-1" />
                  {kpis?.pendingApprovals.payroll} payroll, {kpis?.pendingApprovals.attendance} attendance
                </p>
              </div>
              <div className="text-2xl">📋</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Dashboard Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Main Metrics */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Attendance Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Attendance Status
                </span>
                <Badge variant="outline">
                  Today
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <span className="text-sm text-gray-600">Present</span>
                  </div>
                  <p className="text-2xl font-bold text-green-600">{kpis?.attendanceStatus.present}</p>
                  <Progress 
                    value={(kpis?.attendanceStatus.present || 0) / (kpis?.attendanceStatus.totalScheduled || 1) * 100} 
                    className="h-2 mt-2" 
                  />
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Clock className="w-4 h-4 text-yellow-500" />
                    <span className="text-sm text-gray-600">Late</span>
                  </div>
                  <p className="text-2xl font-bold text-yellow-600">{kpis?.attendanceStatus.late}</p>
                  <Progress 
                    value={(kpis?.attendanceStatus.late || 0) / (kpis?.attendanceStatus.totalScheduled || 1) * 100} 
                    className="h-2 mt-2" 
                  />
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                    <span className="text-sm text-gray-600">Absent</span>
                  </div>
                  <p className="text-2xl font-bold text-red-600">{kpis?.attendanceStatus.absent}</p>
                  <Progress 
                    value={(kpis?.attendanceStatus.absent || 0) / (kpis?.attendanceStatus.totalScheduled || 1) * 100} 
                    className="h-2 mt-2" 
                  />
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Users className="w-4 h-4 text-blue-500" />
                    <span className="text-sm text-gray-600">Scheduled</span>
                  </div>
                  <p className="text-2xl font-bold text-blue-600">{kpis?.attendanceStatus.totalScheduled}</p>
                  <Progress value={100} className="h-2 mt-2" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Site Deployment Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  Site Deployment Overview
                </span>
                <Button variant="outline" size="sm">
                  View All Sites
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {deploymentMetrics?.siteDeployments && Array.isArray(deploymentMetrics.siteDeployments) && 
                 deploymentMetrics.siteDeployments.slice(0, 8).map((site, index) => (
                  <div key={site.siteId} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex items-center space-x-3">
                      <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-white ${
                        site.operationalStatus === 'optimal' ? 'bg-green-500' :
                        site.operationalStatus === 'understaffed' ? 'bg-yellow-500' :
                        site.operationalStatus === 'critical' ? 'bg-red-500' : 'bg-gray-500'
                      }`}>
                        {index + 1}
                      </div>
                      <div>
                        <h3 className="font-medium">{site.siteName}</h3>
                        <p className="text-sm text-gray-600">{site.clientName}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-600">
                          {site.assignedGuards}/{site.requiredGuards}
                        </span>
                        {getTrendIcon(site.assignedGuards, site.requiredGuards)}
                      </div>
                      <p className={`text-xs font-medium capitalize ${getOperationalStatusColor(site.operationalStatus)}`}>
                        {site.operationalStatus}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Payroll & Billing Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Financial Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Payroll Status</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Processed Items</span>
                      <span className="font-medium">{kpis?.payrollStatus.processed}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Pending Items</span>
                      <span className="font-medium text-yellow-600">{kpis?.payrollStatus.pending}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Total Amount</span>
                      <span className="font-bold text-green-600">
                        {formatCurrency(kpis?.payrollStatus.totalAmount || 0)}
                      </span>
                    </div>
                    <div className="pt-2 border-t">
                      <span className="text-xs text-gray-500">
                        Next run: {kpis?.payrollStatus.nextRunDate ? 
                          new Date(kpis.payrollStatus.nextRunDate).toLocaleDateString() : 'TBD'}
                      </span>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Billing Summary</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Monthly Revenue</span>
                      <span className="font-bold text-green-600">
                        {formatCurrency(kpis?.billingOverview.monthlyRevenue || 0)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Outstanding</span>
                      <span className="font-medium text-red-600">{kpis?.billingOverview.outstandingInvoices}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Paid Invoices</span>
                      <span className="font-medium text-green-600">{kpis?.billingOverview.paidInvoices}</span>
                    </div>
                    <div className="pt-2 border-t">
                      <span className="text-xs text-gray-500">
                        Total Billed: {formatCurrency(kpis?.billingOverview.totalBilled || 0)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Activity & Alerts */}
        <div className="space-y-6">
          
          {/* Real-time Alerts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Bell className="w-5 h-5" />
                  Active Alerts
                </span>
                <Badge variant="destructive">
                  {realTimeAlerts && Array.isArray(realTimeAlerts) ? realTimeAlerts.length : 0}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-48">
                <div className="space-y-3">
                  {!realTimeAlerts || !Array.isArray(realTimeAlerts) || realTimeAlerts.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">No active alerts</p>
                  ) : (
                    realTimeAlerts.map((alert) => (
                      <div key={alert.id} className="p-3 rounded-lg border border-red-200 bg-red-50">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge className={getSeverityBadgeColor(alert.severity)}>
                                {alert.severity}
                              </Badge>
                              <span className="text-xs text-gray-500">{getTimeAgo(alert.timestamp)}</span>
                            </div>
                            <h4 className="text-sm font-medium text-gray-900">{alert.title}</h4>
                            <p className="text-xs text-gray-600 mt-1">{alert.description}</p>
                            {alert.siteName && (
                              <p className="text-xs text-gray-500 mt-1">Site: {alert.siteName}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Activity Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-64">
                <div className="space-y-3">
                  {!activityTimeline || !Array.isArray(activityTimeline) || activityTimeline.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">No recent activity</p>
                  ) : (
                    activityTimeline.map((activity) => (
                      <div key={activity.id} className="flex items-start space-x-3 pb-3 border-b border-gray-100 last:border-0">
                        <div className={`flex items-center justify-center w-8 h-8 rounded-full text-white text-xs font-bold ${
                          activity.type === 'attendance' ? 'bg-blue-500' :
                          activity.type === 'assignment' ? 'bg-green-500' :
                          activity.type === 'payroll' ? 'bg-purple-500' :
                          activity.type === 'billing' ? 'bg-orange-500' : 'bg-gray-500'
                        }`}>
                          {activity.type === 'attendance' ? <Clock className="w-4 h-4" /> :
                           activity.type === 'assignment' ? <Users className="w-4 h-4" /> :
                           activity.type === 'payroll' ? <DollarSign className="w-4 h-4" /> :
                           activity.type === 'billing' ? <FileText className="w-4 h-4" /> :
                           <Activity className="w-4 h-4" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                          <p className="text-xs text-gray-600">{activity.description}</p>
                          <p className="text-xs text-gray-500 mt-1">{getTimeAgo(activity.timestamp)}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Notifications */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Bell className="w-5 h-5" />
                  Notifications
                </span>
                {notifications && Array.isArray(notifications) && notifications.length > 0 && (
                  <Badge variant="outline">
                    {notifications.length} unread
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-48">
                <div className="space-y-3">
                  {!notifications || !Array.isArray(notifications) || notifications.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">No new notifications</p>
                  ) : (
                    notifications.map((notification) => (
                      <div key={notification.id} className="p-3 rounded-lg border">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge className={getSeverityBadgeColor(notification.severity)}>
                                {notification.type}
                              </Badge>
                              <span className="text-xs text-gray-500">{getTimeAgo(notification.timestamp)}</span>
                            </div>
                            <h4 className="text-sm font-medium text-gray-900">{notification.title}</h4>
                            <p className="text-xs text-gray-600 mt-1">{notification.message}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}