'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Users, 
  MapPin, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  Calendar,
  Phone,
  Mail,
  Shield,
  Eye,
  Activity,
  TrendingUp,
  UserCheck,
  Building,
  RefreshCw
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { supervisorPortalApi, SupervisorDashboardData } from '@/lib/api/supervisor-portal'

interface DashboardData extends SupervisorDashboardData {}

export default function SupervisorPortalPage() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  const fetchDashboardData = async (showRefreshToast = false) => {
    try {
      if (showRefreshToast) {
        setRefreshing(true)
      }

      // Use real API data instead of hardcoded mock data
      const response = await supervisorPortalApi.getDashboard()
      console.log('📊 Supervisor Portal API Response:', JSON.stringify(response, null, 2))
      
      setDashboardData(response)

      if (showRefreshToast) {
        toast({
          title: 'Dashboard Updated',
          description: 'All data has been refreshed successfully.',
        })
      }
    } catch (error) {
      console.error('❌ Failed to fetch dashboard data:', error)
      
      // Fallback to minimal data structure to prevent crashes
      setDashboardData({
        supervisorId: 'fallback',
        targetDate: new Date().toISOString(),
        overview: {
          totalSites: 0,
          activeSites: 0,
          guardsOnDuty: 0,
          totalGuards: 0,
          pendingApprovals: 0,
          activeAlerts: 0
        },
        assignedSites: [],
        sitesOverview: {},
        attendanceOverview: {
          expectedCount: 0,
          presentCount: 0,
          lateCount: 0,
          absentCount: 0,
          attendanceRate: 0,
          anomalies: []
        },
        deploymentStatus: { deployments: [] },
        todayStats: {
          totalShifts: 0,
          activeAssignments: 0,
          reportedIncidents: 0
        },
        activeAlerts: [],
        pendingApprovals: []
      })

      toast({
        title: 'Error',
        description: 'Failed to load dashboard data. Using fallback data.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchDashboardData()
  }, [])

  if (loading || !dashboardData) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-gray-600">Loading supervisor dashboard...</p>
        </div>
      </div>
    )
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PRESENT':
      case 'on_duty':
        return <Badge className="bg-green-100 text-green-700">On Duty</Badge>
      case 'LATE':
        return <Badge className="bg-yellow-100 text-yellow-700">Late</Badge>
      case 'ABSENT':
      case 'off_duty':
        return <Badge variant="secondary">Off Duty</Badge>
      case 'on_leave':
        return <Badge className="bg-orange-100 text-orange-700">On Leave</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getSiteStatusBadge = (site: any) => {
    const { requiredGuards, currentGuards } = site
    if (currentGuards === requiredGuards) {
      return <Badge className="bg-green-100 text-green-700">Fully Staffed</Badge>
    } else if (currentGuards < requiredGuards) {
      return <Badge className="bg-red-100 text-red-700">Short Staffed</Badge>
    } else {
      return <Badge className="bg-blue-100 text-blue-700">Over Staffed</Badge>
    }
  }

  const handleRefresh = () => {
    fetchDashboardData(true)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Supervisor Operations Portal</h1>
          <p className="text-gray-600 mt-1">
            Manage your assigned sites and teams - {new Date(dashboardData.targetDate).toLocaleDateString()}
          </p>
        </div>
        <Button onClick={handleRefresh} disabled={refreshing} variant="outline">
          <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Quick Actions Panel */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={() => router.push('/supervisor-portal/muster-roll')}
            >
              <Calendar className="h-4 w-4 mr-2" />
              Mark Attendance
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={() => toast({
                title: "Request Coverage",
                description: "This feature will open a coverage request form.",
              })}
            >
              <Users className="h-4 w-4 mr-2" />
              Request Coverage
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={() => toast({
                title: "Report Incident",
                description: "This feature will open an incident report form.",
              })}
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              Report Incident
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={() => toast({
                title: "Site Check-in",
                description: "This feature will open the check-in interface.",
              })}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Site Check-in
            </Button>
          </div>
        </CardContent>
      </Card>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Sites</p>
                <p className="text-2xl font-bold text-gray-900">{dashboardData?.overview?.totalSites || 0}</p>
              </div>
              <Building className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Guards on Duty</p>
                <p className="text-2xl font-bold text-gray-900">
                  {dashboardData?.overview?.guardsOnDuty || 0}/{dashboardData?.overview?.totalGuards || 0}
                </p>
              </div>
              <UserCheck className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Approvals</p>
                <p className="text-2xl font-bold text-gray-900">{dashboardData?.overview?.pendingApprovals || 0}</p>
              </div>
              <Clock className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Alerts</p>
                <p className="text-2xl font-bold text-gray-900">{dashboardData?.overview?.activeAlerts || 0}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Today's Summary */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Today's Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-sm text-gray-600">Sites Supervised</p>
              <p className="text-2xl font-bold">{dashboardData?.assignedSites?.length || 0}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600">Guards on Duty</p>
              <p className="text-2xl font-bold">{dashboardData?.overview?.guardsOnDuty || 0}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600">Coverage Status</p>
              <Badge className="bg-green-100 text-green-700">Good</Badge>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600">Active Alerts</p>
              <p className="text-2xl font-bold text-red-600">{dashboardData?.overview?.activeAlerts || 0}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="sites">Sites</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
          <TabsTrigger value="approvals">Approvals</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Site Overview Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {(dashboardData?.assignedSites || []).map((site) => (
              <Card key={site.id} className="border-l-4 border-l-blue-500">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-5 w-5" />
                      {site.name}
                    </div>
                    {getSiteStatusBadge(site)}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Guards on Duty</span>
                      <span className="font-medium">{site.currentGuards}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Client</span>
                      <span className="font-medium">{site.client?.name || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Status</span>
                      <Badge variant="outline" className="text-green-600">{site.status}</Badge>
                    </div>
                    <Button size="sm" variant="outline" className="w-full mt-3">
                      <Eye className="h-4 w-4 mr-2" />
                      View Site Details
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Today's Statistics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Today's Operations Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="text-center">
                  <p className="text-sm text-gray-600">Total Shifts</p>
                  <p className="text-2xl font-bold text-gray-900">{dashboardData?.todayStats?.totalShifts || 0}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600">Attendance Rate</p>
                  <p className="text-2xl font-bold text-green-600">
                    {dashboardData?.attendanceOverview?.attendanceRate || 0}%
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600">Active Assignments</p>
                  <p className="text-2xl font-bold text-blue-600">{dashboardData?.todayStats?.activeAssignments || 0}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600">Reported Incidents</p>
                  <p className="text-2xl font-bold text-orange-600">{dashboardData?.todayStats?.reportedIncidents || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sites" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Site Deployment Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {(dashboardData?.deploymentStatus?.deployments || []).map((deployment: any) => (
                  <div key={deployment.siteId} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-semibold">{deployment.siteName}</h4>
                      <div className="flex gap-2">
                        <Badge variant="outline">
                          {deployment.assignedGuards}/{deployment.requiredGuards} Guards
                        </Badge>
                        {deployment.vacancy > 0 && (
                          <Badge variant="destructive">{deployment.vacancy} Vacant</Badge>
                        )}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {deployment.assignments?.map((assignment: any) => (
                        <div key={assignment.id} className="flex items-center gap-3 p-3 border rounded">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <Shield className="w-4 h-4 text-blue-600" />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-sm">
                              {assignment.employee.firstName} {assignment.employee.lastName}
                            </p>
                            <p className="text-xs text-gray-600">{assignment.role}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attendance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Attendance Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="text-center p-4 border rounded">
                  <p className="text-sm text-gray-600">Expected</p>
                  <p className="text-xl font-bold">{dashboardData?.attendanceOverview?.expectedCount || 0}</p>
                </div>
                <div className="text-center p-4 border rounded">
                  <p className="text-sm text-gray-600">Present</p>
                  <p className="text-xl font-bold text-green-600">{dashboardData?.attendanceOverview?.presentCount || 0}</p>
                </div>
                <div className="text-center p-4 border rounded">
                  <p className="text-sm text-gray-600">Late</p>
                  <p className="text-xl font-bold text-yellow-600">{dashboardData?.attendanceOverview?.lateCount || 0}</p>
                </div>
                <div className="text-center p-4 border rounded">
                  <p className="text-sm text-gray-600">Absent</p>
                  <p className="text-xl font-bold text-red-600">{dashboardData?.attendanceOverview?.absentCount || 0}</p>
                </div>
              </div>

              {(dashboardData?.attendanceOverview?.anomalies || []).length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-medium">Attendance Anomalies</h4>
                  {(dashboardData?.attendanceOverview?.anomalies || []).map((anomaly: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <p className="font-medium">
                          {anomaly.employee.firstName} {anomaly.employee.lastName}
                        </p>
                        <p className="text-sm text-gray-600">{anomaly.site} - {anomaly.type}</p>
                      </div>
                      {anomaly.requiresApproval && (
                        <Button size="sm" variant="outline">Review</Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Active Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(dashboardData?.activeAlerts || []).length > 0 ? (
                <div className="space-y-3">
                  {(dashboardData?.activeAlerts || []).map((alert, index) => (
                    <div key={index} className="flex items-start gap-3 p-4 border rounded-lg">
                      <div className="mt-1">
                        <AlertTriangle className={`h-4 w-4 ${
                          alert.severity === 'CRITICAL' ? 'text-red-500' :
                          alert.severity === 'HIGH' ? 'text-orange-500' :
                          'text-yellow-500'
                        }`} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="font-medium">{alert.message}</p>
                          <Badge variant={alert.severity === 'CRITICAL' ? 'destructive' : 'secondary'}>
                            {alert.severity}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{alert.siteName}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(alert.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                  <p className="text-gray-600">No active alerts</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="approvals" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Pending Approvals</CardTitle>
            </CardHeader>
            <CardContent>
              {(dashboardData?.pendingApprovals || []).length > 0 ? (
                <div className="space-y-3">
                  {(dashboardData?.pendingApprovals || []).map((approval, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <p className="font-medium">
                          {approval.employee.firstName} {approval.employee.lastName}
                        </p>
                        <p className="text-sm text-gray-600">
                          {approval.site} - {approval.type.replace('_', ' ').toLowerCase()}
                        </p>
                        <p className="text-xs text-gray-500">
                          Submitted: {new Date(approval.submittedAt).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">
                          <Eye className="h-4 w-4 mr-1" />
                          Review
                        </Button>
                        <Button size="sm" className="bg-green-600 hover:bg-green-700">
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                  <p className="text-gray-600">No pending approvals</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}