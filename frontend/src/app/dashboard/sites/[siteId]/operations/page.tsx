'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  ArrowLeft, 
  Users, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  MapPin,
  Phone,
  Mail,
  Calendar,
  TrendingUp,
  Activity,
  UserCheck,
  ClockIcon,
  ChevronRight,
  Home
} from 'lucide-react'
import { sitesApi } from '@/lib/api/sites'
import { useToast } from '@/hooks/use-toast'
import { Site } from '@/types'

export default function SiteOperationsPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  
  const siteId = params.siteId as string
  const [site, setSite] = useState<Site | null>(null)
  const [employees, setEmployees] = useState<any[]>([])
  const [attendance, setAttendance] = useState<any[]>([])
  const [assignments, setAssignments] = useState<any[]>([])
  const [shifts, setShifts] = useState<any[]>([])
  const [performance, setPerformance] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('employees')

  useEffect(() => {
    if (siteId) {
      loadSiteData()
    }
  }, [siteId])

  const loadSiteData = async () => {
    try {
      setLoading(true)
      
      // Load all site-specific data in parallel
      const [
        siteData,
        employeesData,
        attendanceData,
        assignmentsData,
        shiftsData,
        performanceData
      ] = await Promise.all([
        sitesApi.getSite(siteId),
        sitesApi.getSiteEmployees(siteId),
        sitesApi.getSiteAttendance(siteId),
        sitesApi.getSiteAssignments(siteId),
        sitesApi.getSiteShifts(siteId),
        sitesApi.getSitePerformance(siteId)
      ])

      setSite(siteData)
      setEmployees(employeesData)
      setAttendance(attendanceData)
      setAssignments(assignmentsData)
      setShifts(shiftsData)
      setPerformance(performanceData)
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load site operations data',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
      case 'PRESENT':
        return 'bg-green-100 text-green-800'
      case 'INACTIVE':
      case 'ABSENT':
        return 'bg-red-100 text-red-800'
      case 'MAINTENANCE':
      case 'LATE':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ACTIVE':
      case 'PRESENT':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'INACTIVE':
      case 'ABSENT':
        return <AlertTriangle className="h-4 w-4 text-red-500" />
      case 'MAINTENANCE':
      case 'LATE':
        return <Clock className="h-4 w-4 text-yellow-500" />
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-500" />
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 bg-gray-100 min-h-full">
        <div className="flex items-center gap-4">
          <div className="h-8 w-8 bg-gray-200 rounded animate-pulse" />
          <div className="h-8 w-64 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (!site) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4 bg-gray-100">
        <AlertTriangle className="h-12 w-12 text-gray-400" />
        <h2 className="text-xl font-semibold text-gray-600">Site Not Found</h2>
        <p className="text-gray-500">The requested site could not be found.</p>
        <Button onClick={() => router.push('/dashboard/sites')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Sites
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6 bg-gray-100 min-h-full">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center space-x-2 text-sm text-muted-foreground">
        <Link href="/dashboard" className="flex items-center hover:text-foreground">
          <Home className="h-4 w-4 mr-1" />
          Dashboard
        </Link>
        <ChevronRight className="h-4 w-4" />
        <Link href="/dashboard/sites" className="hover:text-foreground">
          Sites
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground font-medium">{site.name} Operations</span>
      </nav>

      {/* Header with Site Info */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => router.push('/dashboard/sites')}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Sites
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{site.name}</h1>
            <p className="text-muted-foreground">
              Site Operations Management - {site.client?.name || 'No client assigned'}
            </p>
          </div>
        </div>
        <Badge className={getStatusColor(site.operationalStatus)}>
          <div className="flex items-center gap-1">
            {getStatusIcon(site.operationalStatus)}
            {site.operationalStatus}
          </div>
        </Badge>
      </div>

      {/* Site Details Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Site Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <h4 className="font-medium text-sm text-muted-foreground mb-2">Address</h4>
              <div className="space-y-1">
                {typeof site.address === 'object' && site.address ? (
                  <>
                    <p className="text-sm">{(site.address as any).street || 'N/A'}</p>
                    <p className="text-sm">
                      {(site.address as any).city || ''}, {(site.address as any).state || ''} {(site.address as any).postalCode || ''}
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">Address not available</p>
                )}
              </div>
            </div>
            <div>
              <h4 className="font-medium text-sm text-muted-foreground mb-2">Contact Information</h4>
              <div className="space-y-1">
                {typeof site.contactInfo === 'object' && site.contactInfo ? (
                  <>
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-3 w-3" />
                      {(site.contactInfo as any).phone || 'N/A'}
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-3 w-3" />
                      {(site.contactInfo as any).email || 'N/A'}
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">Contact info not available</p>
                )}
              </div>
            </div>
            <div>
              <h4 className="font-medium text-sm text-muted-foreground mb-2">Statistics</h4>
              <div className="space-y-1">
                <p className="text-sm">
                  <span className="font-medium">{assignments.length}</span> Active Assignments
                </p>
                <p className="text-sm">
                  <span className="font-medium">{shifts.length}</span> Shifts Today
                </p>
                <p className="text-sm">
                  <span className="font-medium">{attendance.filter(a => a.status === 'PRESENT').length}</span> Present Today
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance KPIs */}
      {performance && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <UserCheck className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Attendance Rate</p>
                  <p className="text-2xl font-bold">{performance.attendanceRate}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Clock className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Shift Coverage</p>
                  <p className="text-2xl font-bold">{performance.shiftCoverage}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Calendar className="h-5 w-5 text-purple-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Total Shifts</p>
                  <p className="text-2xl font-bold">{performance.totalShifts}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5 text-orange-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Overall Score</p>
                  <p className="text-2xl font-bold">{performance.overallScore}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="employees">Site Employees</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="shifts">Shifts</TabsTrigger>
          <TabsTrigger value="assignments">Assignments</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="employees" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Site Employees ({employees.length})</CardTitle>
              <CardDescription>
                Employees currently assigned to this site
              </CardDescription>
            </CardHeader>
            <CardContent>
              {employees.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No employees assigned to this site</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {employees.map((employee) => (
                    <Card key={employee.id} className="transition-shadow hover:shadow-md">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium text-lg">
                              {employee.firstName} {employee.lastName}
                            </h4>
                            <p className="text-sm text-muted-foreground mb-2">
                              {employee.employeeNumber}
                            </p>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 text-sm">
                                <Phone className="h-3 w-3 text-muted-foreground" />
                                <span>{employee.phone}</span>
                              </div>
                              <div className="flex items-center gap-2 text-sm">
                                <Mail className="h-3 w-3 text-muted-foreground" />
                                <span>{employee.email}</span>
                              </div>
                            </div>
                            {employee.skills && employee.skills.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-3">
                                {employee.skills.slice(0, 3).map((skill: string) => (
                                  <Badge key={skill} variant="secondary" className="text-xs">
                                    {skill}
                                  </Badge>
                                ))}
                                {employee.skills.length > 3 && (
                                  <Badge variant="secondary" className="text-xs">
                                    +{employee.skills.length - 3} more
                                  </Badge>
                                )}
                              </div>
                            )}
                          </div>
                          {employee.assignments && employee.assignments[0] && (
                            <div className="text-right ml-4">
                              <Badge className={`${getStatusColor(employee.assignments[0].status)} mb-2`}>
                                {employee.assignments[0].status}
                              </Badge>
                              <div className="text-sm space-y-1">
                                <p className="font-medium">{employee.assignments[0].role}</p>
                                <p className="text-muted-foreground">
                                  ₹{employee.assignments[0].hourlyRate}/hr
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Since {new Date(employee.assignments[0].startDate).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attendance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Today's Attendance ({attendance.length})</CardTitle>
              <CardDescription>
                Real-time attendance tracking for site employees
              </CardDescription>
            </CardHeader>
            <CardContent>
              {attendance.length === 0 ? (
                <div className="text-center py-8">
                  <ClockIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No attendance records for today</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {attendance.map((record) => (
                    <div key={record.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div>
                          <h4 className="font-medium">
                            {record.employee.firstName} {record.employee.lastName}
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            {record.employee.employeeNumber}
                          </p>
                        </div>
                        <div className="text-sm">
                          <p className="font-medium">
                            {record.shift.startTime} - {record.shift.endTime}
                          </p>
                          <p className="text-muted-foreground">{record.shift.shiftType}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          {record.clockIn && (
                            <p className="text-sm">
                              <span className="text-muted-foreground">In:</span>{' '}
                              {new Date(record.clockIn).toLocaleTimeString()}
                            </p>
                          )}
                          {record.clockOut && (
                            <p className="text-sm">
                              <span className="text-muted-foreground">Out:</span>{' '}
                              {new Date(record.clockOut).toLocaleTimeString()}
                            </p>
                          )}
                        </div>
                        <Badge className={getStatusColor(record.status)}>
                          <div className="flex items-center gap-1">
                            {getStatusIcon(record.status)}
                            {record.status}
                          </div>
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="shifts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Today's Shifts ({shifts.length})</CardTitle>
              <CardDescription>
                Scheduled shifts for this site
              </CardDescription>
            </CardHeader>
            <CardContent>
              {shifts.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No shifts scheduled for today</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {shifts.map((shift) => (
                    <div key={shift.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div>
                          <h4 className="font-medium">
                            {shift.startTime} - {shift.endTime}
                          </h4>
                          <p className="text-sm text-muted-foreground">{shift.shiftType}</p>
                        </div>
                        {shift.assignment?.employee && (
                          <div>
                            <p className="font-medium">
                              {shift.assignment.employee.firstName} {shift.assignment.employee.lastName}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {shift.assignment.employee.employeeNumber}
                            </p>
                          </div>
                        )}
                      </div>
                      <Badge className={getStatusColor(shift.status)}>
                        {shift.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assignments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Active Assignments ({assignments.length})</CardTitle>
              <CardDescription>
                Current employee assignments for this site
              </CardDescription>
            </CardHeader>
            <CardContent>
              {assignments.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No active assignments for this site</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {assignments.map((assignment) => (
                    <div key={assignment.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div>
                          <h4 className="font-medium">
                            {assignment.employee.firstName} {assignment.employee.lastName}
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            {assignment.employee.employeeNumber}
                          </p>
                        </div>
                        <div>
                          <p className="font-medium">{assignment.role}</p>
                          <p className="text-sm text-muted-foreground">
                            Since {new Date(assignment.startDate).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge className={getStatusColor(assignment.status)}>
                          {assignment.status}
                        </Badge>
                        <p className="text-sm text-muted-foreground mt-1">
                          ₹{assignment.hourlyRate}/hr
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Site Performance Metrics
              </CardTitle>
              <CardDescription>
                Performance analysis for the last 30 days
              </CardDescription>
            </CardHeader>
            <CardContent>
              {performance ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-medium">Attendance Metrics</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Attendance Rate</span>
                        <span className="font-medium">{performance.attendanceRate}%</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Present Count</span>
                        <span className="font-medium">{performance.presentCount}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Total Records</span>
                        <span className="font-medium">{performance.totalAttendanceRecords}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <h4 className="font-medium">Shift Metrics</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Shift Coverage</span>
                        <span className="font-medium">{performance.shiftCoverage}%</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Covered Shifts</span>
                        <span className="font-medium">{performance.coveredShifts}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Total Shifts</span>
                        <span className="font-medium">{performance.totalShifts}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">Performance data not available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}