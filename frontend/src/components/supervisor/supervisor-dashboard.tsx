'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { supervisorPortalApi } from '@/lib/api/supervisor-portal'
import { 
  Users, 
  MapPin, 
  AlertTriangle, 
  CheckCircle, 
  Calendar,
  Phone,
  Mail,
  Shield,
  Eye
} from 'lucide-react'

interface SupervisorDashboardProps {
  className?: string
}

export function SupervisorDashboard({ className }: SupervisorDashboardProps) {
  const { toast } = useToast()
  const router = useRouter()
  const [dashboardData, setDashboardData] = useState<any>(null)
  const [musterData, setMusterData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [dashboard, muster] = await Promise.all([
          supervisorPortalApi.getDashboard(),
          supervisorPortalApi.getMusterRoll()
        ])
        setDashboardData(dashboard)
        setMusterData(muster)
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error)
      } finally {
        setLoading(false)
      }
    }
    
    fetchData()
  }, [])
  
  // Quick Actions handlers
  const handleMarkAttendance = () => {
    router.push('/supervisor-portal/muster-roll')
  }
  
  const handleRequestCoverage = () => {
    toast({
      title: "Request Coverage",
      description: "Opening coverage request form...",
    })
    // Add navigation or modal logic here
  }
  
  const handleReportIncident = () => {
    toast({
      title: "Report Incident",
      description: "Opening incident report form...",
    })
    // Add navigation or modal logic here
  }
  
  const handleSiteCheckIn = () => {
    toast({
      title: "Site Check-in",
      description: "Opening check-in interface...",
    })
    // Add navigation or modal logic here
  }
  // Use real data from API instead of hardcoded mock data
  const assignedSites = dashboardData?.assignedSites || []
  
  // Get employees from muster roll data with proper status mapping
  const siteEmployees = musterData?.sites?.flatMap((site: any) => 
    site.employees.map((emp: any) => ({
      id: emp.employeeId,
      employeeNumber: emp.employeeNumber,
      name: emp.name,
      email: emp.email,
      phone: emp.phone,
      currentSite: site.siteName,
      status: ['PRESENT', 'LATE'].includes(emp.attendanceStatus) ? 'on_duty' : 'off_duty',
      shift: emp.shiftDetails ? `${emp.shiftDetails.startTime} - ${emp.shiftDetails.endTime}` : ' - ',
      attendanceStatus: emp.attendanceStatus,
      joiningDate: '2024-01-15', // Mock data for now
      certifications: ['Basic Security'] // Mock data for now
    }))
  ) || []

  const todayAlerts = dashboardData?.activeAlerts || []

  const getStatusBadge = (status: string, attendanceStatus?: string) => {
    if (status === 'on_duty') {
      if (attendanceStatus === 'LATE') {
        return <Badge className="bg-yellow-100 text-yellow-700">On Duty (Late)</Badge>
      }
      return <Badge className="bg-green-100 text-green-700">On Duty</Badge>
    } else if (status === 'off_duty') {
      return <Badge variant="secondary">Off Duty</Badge>
    } else if (status === 'on_leave') {
      return <Badge className="bg-orange-100 text-orange-700">On Leave</Badge>
    }
    return <Badge variant="outline">{status}</Badge>
  }

  const getSiteStatusBadge = (current: number, required: number) => {
    if (current === required) {
      return <Badge className="bg-green-100 text-green-700">Fully Staffed</Badge>
    } else if (current < required) {
      return <Badge className="bg-red-100 text-red-700">Short Staffed</Badge>
    } else {
      return <Badge className="bg-blue-100 text-blue-700">Over Staffed</Badge>
    }
  }

  if (loading) {
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

  return (
    <div className={className}>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Supervisor Dashboard</h1>
        <p className="text-gray-600">Manage your assigned sites and employees</p>
      </div>

      {/* Site Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {assignedSites.map((site: any) => (
          <Card key={site.id} className="border-l-4 border-l-blue-500">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  {site.name}
                </div>
                {getSiteStatusBadge(site.currentGuards, site.requiredGuards)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Guards on Duty</span>
                  <span className="font-medium">{site.currentGuards} / {site.requiredGuards}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Status</span>
                  <Badge variant="outline" className="text-green-600">{site.status}</Badge>
                </div>
                <div className="text-xs text-gray-500 mt-2">{site.address}</div>
                <Button size="sm" variant="outline" className="w-full mt-3">
                  <Eye className="h-4 w-4 mr-2" />
                  View Site Details
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Site Employees */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Site Employees ({siteEmployees.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {siteEmployees.map((employee: any) => (
                  <div key={employee.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <Shield className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium">{employee.name}</p>
                          <p className="text-sm text-gray-600">{employee.employeeNumber}</p>
                          <p className="text-sm text-gray-500">{employee.currentSite}</p>
                        </div>
                      </div>
                    </div>

                    <div className="text-center mx-4">
                      <p className="text-sm text-gray-600">Shift</p>
                      <p className="text-sm font-medium">{employee.shift}</p>
                    </div>

                    <div className="text-center mx-4">
                      {getStatusBadge(employee.status, employee.attendanceStatus)}
                    </div>

                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" asChild>
                        <a href={`tel:${employee.phone}`}>
                          <Phone className="h-4 w-4" />
                        </a>
                      </Button>
                      <Button size="sm" variant="outline" asChild>
                        <a href={`mailto:${employee.email}`}>
                          <Mail className="h-4 w-4" />
                        </a>
                      </Button>
                      <Button size="sm" variant="outline">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Today's Alerts & Quick Actions */}
        <div className="space-y-6">
          {/* Alerts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Today's Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {todayAlerts.length > 0 ? (
                  todayAlerts.map((alert: any, index: number) => (
                    <div key={index} className="flex items-start gap-3 p-3 border rounded-lg">
                      <div className="mt-1">
                        <AlertTriangle className="h-4 w-4 text-orange-500" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm">{alert.message}</p>
                        <p className="text-xs text-gray-500 mt-1">{alert.timestamp ? new Date(alert.timestamp).toLocaleTimeString() : 'Just now'}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4 text-gray-500">
                    <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                    <p className="text-sm">No alerts today</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={handleMarkAttendance}
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Mark Attendance
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={handleRequestCoverage}
                >
                  <Users className="h-4 w-4 mr-2" />
                  Request Coverage
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={handleReportIncident}
                >
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Report Incident
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={handleSiteCheckIn}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Site Check-in
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Summary Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Today's Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Sites Supervised</span>
                  <span className="font-medium">{assignedSites.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Guards on Duty</span>
                  <span className="font-medium">{dashboardData?.overview?.guardsOnDuty || 0}/{dashboardData?.overview?.totalGuards || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Coverage Status</span>
                  <Badge className="bg-green-100 text-green-700">Good</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Active Alerts</span>
                  <span className="font-medium text-orange-600">{todayAlerts.length}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}