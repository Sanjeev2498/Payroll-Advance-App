'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Users, 
  Phone, 
  Clock, 
  CheckCircle, 
  XCircle,
  Download,
  RefreshCw,
  Calendar,
  Search,
  Mail,
  Eye
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { supervisorPortalApi, MusterRollData as ApiMusterRollData } from '@/lib/api/supervisor-portal'
import Link from 'next/link'

interface LocalMusterRollData {
  date: string
  sites: Array<{
    siteId: string
    siteName: string
    employees: Array<{
      employeeId: string
      employeeNumber: string
      name: string
      role: string
      email: string
      phone: string
      shiftDetails: {
        shiftId: string
        startTime: string
        endTime: string
        status: string
      } | null
      attendanceStatus: string
      clockIn: string | null
      clockOut: string | null
      employmentStatus: string
    }>
  }>
  summary: {
    totalEmployees: number
    presentEmployees: number
    lateEmployees: number
    absentEmployees: number
    attendanceRate: number
  }
}

export default function MusterRollPage() {
  const [musterData, setMusterData] = useState<LocalMusterRollData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const { toast } = useToast()

  const fetchMusterRoll = async (date?: string, showRefreshToast = false) => {
    try {
      console.log('🔄 Fetching muster roll for date:', date || selectedDate)
      
      if (showRefreshToast) {
        setRefreshing(true)
      }

      const response = await supervisorPortalApi.getMusterRoll({
        date: date || selectedDate
      })
      console.log('🔄 Muster Roll API Response:', JSON.stringify(response, null, 2))
      setMusterData(response)

      if (showRefreshToast) {
        toast({
          title: 'Muster Roll Updated',
          description: 'Attendance data has been refreshed.',
        })
      }
    } catch (error) {
      console.error('❌ Failed to fetch muster roll data:', error)
      toast({
        title: 'Error',
        description: 'Failed to load muster roll data. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    console.log('🚀 Muster Roll Component - Initial load for date:', selectedDate)
    fetchMusterRoll()
  }, [selectedDate])

  const getAttendanceBadge = (status: string) => {
    switch (status) {
      case 'PRESENT':
        return <Badge className="bg-green-100 text-green-700">Present</Badge>
      case 'LATE':
        return <Badge className="bg-yellow-100 text-yellow-700">Late</Badge>
      case 'ABSENT':
      case 'NO_SHOW':
        return <Badge className="bg-red-100 text-red-700">Absent</Badge>
      case 'NOT_MARKED':
        return <Badge variant="outline">Not Marked</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const filteredEmployees = (employees: any[]) => {
    return employees.filter(employee => {
      const matchesSearch = employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           employee.employeeNumber.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesStatus = filterStatus === 'all' || 
                           (filterStatus === 'present' && employee.attendanceStatus === 'PRESENT') ||
                           (filterStatus === 'late' && employee.attendanceStatus === 'LATE') ||
                           (filterStatus === 'absent' && ['ABSENT', 'NO_SHOW', 'NOT_MARKED'].includes(employee.attendanceStatus))

      return matchesSearch && matchesStatus
    })
  }

  const handleDateChange = (newDate: string) => {
    setSelectedDate(newDate)
  }

  const handleAttendanceUpdate = async (employeeId: string, shiftId: string | undefined, newStatus: string) => {
    const currentDate = new Date().toISOString().split('T')[0]
    const daysDifference = Math.floor((new Date(currentDate).getTime() - new Date(selectedDate).getTime()) / (1000 * 60 * 60 * 24))
    
    // Find current employee data
    const currentEmployee = musterData?.sites
      .flatMap(site => site.employees)
      .find(emp => emp.employeeId === employeeId)
    
    if (!currentEmployee) return

    if (daysDifference === 0) {
      // Same-day attendance - direct update
      await handleSameDayUpdate(employeeId, shiftId, newStatus, currentEmployee.attendanceStatus)
    } else if (daysDifference <= 3) {
      // Previous-day attendance (1-3 days) - requires reason and audit
      await handlePreviousDayUpdate(employeeId, shiftId, newStatus, currentEmployee.attendanceStatus, daysDifference)
    } else {
      // More than 3 days old - requires higher approval
      toast({
        title: 'Approval Required',
        description: 'Changes to attendance older than 3 days require HR or Management approval.',
        variant: 'destructive',
      })
    }
  }

  const handleSameDayUpdate = async (employeeId: string, shiftId: string | undefined, newStatus: string, oldStatus: string) => {
    try {
      await supervisorPortalApi.updateAttendance({
        employeeId,
        shiftId,
        date: selectedDate,
        status: newStatus,
        changeType: 'SAME_DAY',
        reason: 'Same day correction'
      })

      updateLocalState(employeeId, newStatus)
      
      toast({
        title: 'Attendance Updated',
        description: `Same-day attendance updated from ${oldStatus} to ${newStatus}.`,
      })
    } catch (error) {
      console.error('Failed to update same-day attendance:', error)
      toast({
        title: 'Update Failed',
        description: 'Failed to update attendance. Please try again.',
        variant: 'destructive',
      })
    }
  }

  const handlePreviousDayUpdate = async (employeeId: string, shiftId: string | undefined, newStatus: string, oldStatus: string, daysDifference: number) => {
    // Show reason input dialog
    const reason = await showReasonDialog(oldStatus, newStatus, daysDifference)
    
    if (!reason) {
      toast({
        title: 'Reason Required',
        description: 'A reason is required for previous-day attendance changes.',
        variant: 'destructive',
      })
      return
    }

    try {
      await supervisorPortalApi.updateAttendance({
        employeeId,
        shiftId,
        date: selectedDate,
        status: newStatus,
        changeType: 'PREVIOUS_DAY',
        reason,
        oldStatus,
        daysDifference
      })
    

      updateLocalState(employeeId, newStatus)
      
      toast({
        title: 'Attendance Change Submitted',
        description: `Previous-day attendance change logged with audit trail. Change from ${oldStatus} to ${newStatus}.`,
      })
    } catch (error) {
      console.error('Failed to update previous-day attendance:', error)
      toast({
        title: 'Update Failed',
        description: 'Failed to update attendance. Please try again.',
        variant: 'destructive',
      })
    }
  }

  const showReasonDialog = (oldStatus: string, newStatus: string, daysDifference: number): Promise<string | null> => {
    return new Promise((resolve) => {
      const reason = prompt(`
Updating attendance from "${oldStatus}" to "${newStatus}" for ${daysDifference} day(s) ago.

This change will be logged in the audit trail with:
- Original value: ${oldStatus}  
- New value: ${newStatus}
- Changed by: You (Supervisor)
- Date: ${new Date().toLocaleString()}

Please provide a reason for this change:`
      )
      
      resolve(reason?.trim() || null)
    })
  }

  const updateLocalState = (employeeId: string, newStatus: string) => {
    setMusterData(prevData => {
      if (!prevData) return prevData
      
      const updatedSites = prevData.sites.map(site => ({
        ...site,
        employees: site.employees.map(employee => 
          employee.employeeId === employeeId 
            ? { ...employee, attendanceStatus: newStatus }
            : employee
        )
      }))

      // Recalculate summary statistics
      const allEmployees = updatedSites.flatMap(site => site.employees)
      const presentCount = allEmployees.filter(emp => emp.attendanceStatus === 'PRESENT').length
      const lateCount = allEmployees.filter(emp => emp.attendanceStatus === 'LATE').length
      const absentCount = allEmployees.filter(emp => ['ABSENT', 'NO_SHOW', 'NOT_MARKED'].includes(emp.attendanceStatus)).length
      const totalCount = allEmployees.length
      const attendanceRate = totalCount > 0 ? Math.round(((presentCount + lateCount) / totalCount) * 100) : 100

      console.log('📊 Muster Roll Summary Calculation:', {
        totalEmployees: totalCount,
        presentCount,
        lateCount,
        absentCount,
        attendanceRate,
        allEmployees: allEmployees.map(e => ({ id: e.employeeId, name: e.name, status: e.attendanceStatus }))
      })

      return {
        ...prevData,
        sites: updatedSites,
        summary: {
          totalEmployees: totalCount,
          presentEmployees: presentCount,
          lateEmployees: lateCount,
          absentEmployees: absentCount,
          attendanceRate
        }
      }
    })
  }

  const handleViewEmployee = (employee: any) => {
    toast({
      title: `Employee Details - ${employee.name}`,
      description: `${employee.employeeNumber} | ${employee.role} | ${employee.email}`,
    })
  }

  const handleExport = () => {
    // This would generate and download the muster roll report
    toast({
      title: 'Export Started',
      description: 'Muster roll report is being generated and will download shortly.',
    })
  }

  if (loading || !musterData) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-gray-600">Loading daily muster roll...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center space-x-2 text-sm text-gray-600">
        <Link href="/dashboard" className="hover:text-blue-600 hover:underline">
          Dashboard
        </Link>
        <span>›</span>
        <Link href="/supervisor-portal" className="hover:text-blue-600 hover:underline">
          Supervisor Portal
        </Link>
        <span>›</span>
        <span className="text-gray-900 font-medium">Daily Muster Roll</span>
      </nav>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Daily Muster Roll</h1>
          <p className="text-gray-600 mt-1">
            Daily attendance roster for {new Date(musterData.date).toLocaleDateString()}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/dashboard">
            <Button variant="outline" className="bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700">
              ← Back to Dashboard
            </Button>
          </Link>
          <Link href="/supervisor-portal">
            <Button variant="outline" className="bg-gray-50 hover:bg-gray-100 border-gray-200">
              Supervisor Portal
            </Button>
          </Link>
          <Button 
            onClick={() => window.open('/supervisor-portal/attendance/audit-trail', '_blank')} 
            variant="outline"
          >
            📋 Audit Trail
          </Button>
          <Button onClick={handleExport} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button onClick={() => fetchMusterRoll(selectedDate, true)} disabled={refreshing} variant="outline">
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Controls */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => handleDateChange(e.target.value)}
                className="w-40"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4" />
              <Input
                placeholder="Search by name or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64"
              />
            </div>
            
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="present">Present</SelectItem>
                <SelectItem value="late">Late</SelectItem>
                <SelectItem value="absent">Absent</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Policy-based instructions */}
          {new Date(selectedDate).toDateString() === new Date().toDateString() && (
            <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
              <p className="text-sm text-green-800">
                ✅ <strong>Same-Day Attendance:</strong> You can directly update attendance status. Changes are applied immediately and logged automatically.
              </p>
            </div>
          )}
          
          {new Date(selectedDate) < new Date() && new Date(selectedDate) >= new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) && (
            <div className="mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
              <p className="text-sm text-yellow-800">
                ⚠️ <strong>Previous-Day Attendance (1-3 days):</strong> Changes require a mandatory reason and will be logged in the audit trail with original/new values and your supervisor ID. Payroll will be updated if not yet finalized.
              </p>
            </div>
          )}
          
          {new Date(selectedDate) < new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) && (
            <div className="mt-4 p-3 bg-red-50 rounded-lg border border-red-200">
              <p className="text-sm text-red-800">
                🚫 <strong>Older than 3 days:</strong> Changes require HR or Management approval through the formal attendance correction process.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>Attendance Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="text-center p-4 border rounded">
              <div className="text-2xl font-bold text-gray-900">{musterData.summary.totalEmployees}</div>
              <p className="text-sm text-gray-600">Total Employees</p>
              <Users className="w-6 h-6 text-gray-500 mx-auto mt-2" />
            </div>
            <div className="text-center p-4 border rounded">
              <div className="text-2xl font-bold text-green-600">{musterData.summary.presentEmployees}</div>
              <p className="text-sm text-gray-600">Present</p>
              <CheckCircle className="w-6 h-6 text-green-500 mx-auto mt-2" />
            </div>
            <div className="text-center p-4 border rounded">
              <div className="text-2xl font-bold text-yellow-600">{musterData.summary.lateEmployees}</div>
              <p className="text-sm text-gray-600">Late</p>
              <Clock className="w-6 h-6 text-yellow-500 mx-auto mt-2" />
            </div>
            <div className="text-center p-4 border rounded">
              <div className="text-2xl font-bold text-red-600">{musterData.summary.absentEmployees}</div>
              <p className="text-sm text-gray-600">Absent</p>
              <XCircle className="w-6 h-6 text-red-500 mx-auto mt-2" />
            </div>
            <div className="text-center p-4 border rounded">
              <div className="text-2xl font-bold text-blue-600">{musterData.summary.attendanceRate}%</div>
              <p className="text-sm text-gray-600">Attendance Rate</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Site-wise Muster Roll */}
      <div className="space-y-6">
        {musterData.sites.map((site) => {
          const siteEmployees = filteredEmployees(site.employees)
          
          if (siteEmployees.length === 0 && (searchTerm || filterStatus !== 'all')) {
            return null
          }

          return (
            <Card key={site.siteId}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{site.siteName}</span>
                  <Badge variant="outline">{siteEmployees.length} employees</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {siteEmployees.map((employee) => (
                    <div key={employee.employeeId} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                      <div className="flex-1 grid grid-cols-1 md:grid-cols-6 gap-4 items-center">
                        <div>
                          <p className="font-medium">{employee.name}</p>
                          <p className="text-sm text-gray-600">{employee.employeeNumber}</p>
                        </div>
                        
                        <div>
                          <p className="text-sm font-medium">{employee.role}</p>
                          <p className="text-xs text-gray-600">
                            {employee.shiftDetails ? 
                              `${employee.shiftDetails.startTime} - ${employee.shiftDetails.endTime}` : 
                              'No shift assigned'
                            }
                          </p>
                        </div>
                        
                        <div className="text-center">
                          {getAttendanceBadge(employee.attendanceStatus)}
                          {/* Attendance editing based on policy */}
                          {(() => {
                            const currentDate = new Date().toISOString().split('T')[0]
                            const daysDifference = Math.floor((new Date(currentDate).getTime() - new Date(selectedDate).getTime()) / (1000 * 60 * 60 * 24))
                            
                            // Same day - direct edit
                            if (daysDifference === 0) {
                              return (
                                <div className="mt-2">
                                  <Select 
                                    value={employee.attendanceStatus} 
                                    onValueChange={(newStatus) => handleAttendanceUpdate(employee.employeeId, employee.shiftDetails?.shiftId, newStatus)}
                                  >
                                    <SelectTrigger className="w-24 h-7 text-xs">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="PRESENT">Present</SelectItem>
                                      <SelectItem value="LATE">Late</SelectItem>
                                      <SelectItem value="ABSENT">Absent</SelectItem>
                                      <SelectItem value="NOT_MARKED">Not Marked</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <p className="text-xs text-green-600 mt-1">Same-day</p>
                                </div>
                              )
                            }
                            
                            // Previous 1-3 days - with reason required
                            if (daysDifference >= 1 && daysDifference <= 3) {
                              return (
                                <div className="mt-2">
                                  <Select 
                                    value={employee.attendanceStatus} 
                                    onValueChange={(newStatus) => handleAttendanceUpdate(employee.employeeId, employee.shiftDetails?.shiftId, newStatus)}
                                  >
                                    <SelectTrigger className="w-24 h-7 text-xs">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="PRESENT">Present</SelectItem>
                                      <SelectItem value="LATE">Late</SelectItem>
                                      <SelectItem value="ABSENT">Absent</SelectItem>
                                      <SelectItem value="NOT_MARKED">Not Marked</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <p className="text-xs text-yellow-600 mt-1">Audit req'd</p>
                                </div>
                              )
                            }
                            
                            // More than 3 days - approval required
                            if (daysDifference > 3) {
                              return (
                                <div className="mt-2">
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    onClick={() => handleAttendanceUpdate(employee.employeeId, employee.shiftDetails?.shiftId, employee.attendanceStatus)}
                                    className="text-xs h-7"
                                  >
                                    Request Change
                                  </Button>
                                  <p className="text-xs text-red-600 mt-1">Approval req'd</p>
                                </div>
                              )
                            }
                            
                            return null
                          })()}
                        </div>
                        
                        <div className="text-center">
                          {employee.clockIn ? (
                            <div>
                              <p className="text-sm font-medium">In: {new Date(employee.clockIn).toLocaleTimeString()}</p>
                              {employee.clockOut && (
                                <p className="text-sm text-gray-600">Out: {new Date(employee.clockOut).toLocaleTimeString()}</p>
                              )}
                            </div>
                          ) : (
                            <span className="text-sm text-gray-500">Not clocked in</span>
                          )}
                        </div>
                        
                        <div className="text-center">
                          <p className="text-xs text-gray-600 mb-2">{employee.email}</p>
                          <p className="text-xs text-gray-600 mb-2">{employee.phone}</p>
                        </div>
                        
                        <div className="text-center flex gap-1 justify-center">
                          <Button size="sm" variant="outline" className="h-8 w-8 p-0" asChild>
                            <a href={`tel:${employee.phone}`} title="Call Employee">
                              <Phone className="w-3 h-3" />
                            </a>
                          </Button>
                          <Button size="sm" variant="outline" className="h-8 w-8 p-0" asChild>
                            <a href={`mailto:${employee.email}`} title="Email Employee">
                              <Mail className="w-3 h-3" />
                            </a>
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="h-8 w-8 p-0"
                            onClick={() => handleViewEmployee(employee)}
                            title="View Employee Details"
                          >
                            <Eye className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {siteEmployees.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      No employees found matching the current filters.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}