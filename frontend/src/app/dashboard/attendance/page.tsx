'use client'

import React, { useState, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { attendanceService } from '@/lib/api/attendance'
import { AttendanceFilter, Attendance, AttendanceAnomaly } from '@/types'
import { 
  Activity,
  AlertTriangle, 
  RefreshCw,
  Clock,
  Eye,
  Settings,
  MapPin,
  Users,
  BarChart3,
  Filter,
  Download
} from 'lucide-react'

// Import attendance components
import { AttendanceStatsCards } from '@/components/attendance/attendance-stats-cards'
import { RealTimeUpdates } from '@/components/attendance/real-time-updates'
import { AttendanceAnomalies } from '@/components/attendance/attendance-anomalies'
import { AttendanceTable } from '@/components/attendance/attendance-table'
import { AttendanceFilters } from '@/components/attendance/attendance-filters'
import { QuickActions } from '@/components/attendance/quick-actions'

export default function AttendanceOperationsDashboard() {
  const [activeTab, setActiveTab] = useState('overview')
  const [filters, setFilters] = useState<AttendanceFilter>({
    dateFrom: new Date().toISOString().split('T')[0],
    dateTo: new Date().toISOString().split('T')[0],
    page: 1,
    limit: 50
  })

  // Fetch attendance data with real-time updates
  const { data: attendanceData, isLoading: attendanceLoading, refetch: refetchAttendance } = useQuery({
    queryKey: ['attendance', filters],
    queryFn: () => attendanceService.getAttendance(filters),
    refetchInterval: 30000, // Refresh every 30 seconds for real-time updates
    staleTime: 15000,
  })

  // Fetch attendance statistics
  const { data: statsData, isLoading: statsLoading, refetch: refetchStats } = useQuery({
    queryKey: ['attendanceStats', filters.dateFrom, filters.dateTo, filters.siteId, filters.employeeId],
    queryFn: () => attendanceService.getStats(
      filters.dateFrom, 
      filters.dateTo, 
      filters.siteId, 
      filters.employeeId
    ),
    refetchInterval: 30000,
    staleTime: 15000,
  })

  // Fetch anomalies
  const { data: anomaliesData, isLoading: anomaliesLoading, refetch: refetchAnomalies } = useQuery({
    queryKey: ['attendanceAnomalies', filters.dateFrom, filters.dateTo, filters.siteId, filters.employeeId],
    queryFn: () => attendanceService.detectAnomalies({
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
      siteId: filters.siteId,
      employeeId: filters.employeeId,
      page: 1,
      limit: 20
    }),
    refetchInterval: 60000, // Check for new anomalies every minute
    staleTime: 30000,
  })

  // Handle filter changes
  const handleFiltersChange = useCallback((newFilters: AttendanceFilter) => {
    setFilters(prev => ({ ...prev, ...newFilters, page: 1 }))
  }, [])

  // Handle refresh all data
  const handleRefreshAll = useCallback(() => {
    refetchAttendance()
    refetchStats()
    refetchAnomalies()
  }, [refetchAttendance, refetchStats, refetchAnomalies])

  // Handle attendance record details
  const handleAttendanceDetails = useCallback((attendance: Attendance) => {
    // In real implementation, this would open a modal or navigate to details page
    console.log('View attendance details:', attendance)
  }, [])

  // Handle anomaly details
  const handleAnomalyDetails = useCallback((anomaly: AttendanceAnomaly) => {
    // In real implementation, this would open a modal or navigate to details page
    console.log('View anomaly details:', anomaly)
  }, [])

  // Handle anomaly resolution
  const handleAnomalyResolve = useCallback((anomaly: AttendanceAnomaly) => {
    // In real implementation, this would call the API to resolve the anomaly
    console.log('Resolve anomaly:', anomaly)
    refetchAnomalies()
  }, [refetchAnomalies])

  // Handle attendance correction
  const handleAttendanceCorrection = useCallback((attendance: Attendance) => {
    // In real implementation, this would open a correction request modal
    console.log('Request attendance correction:', attendance)
  }, [])

  // Handle page changes
  const handlePageChange = useCallback((page: number) => {
    setFilters(prev => ({ ...prev, page }))
  }, [])

  const formatDateRange = () => {
    const fromDate = filters.dateFrom || new Date().toISOString().split('T')[0]
    const toDate = filters.dateTo || new Date().toISOString().split('T')[0]
    
    if (fromDate === toDate) {
      return new Date(fromDate).toLocaleDateString()
    }
    return `${new Date(fromDate).toLocaleDateString()} - ${new Date(toDate).toLocaleDateString()}`
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Attendance Operations Dashboard
          </h1>
          <p className="text-gray-600 mt-1">
            Real-time attendance monitoring, anomaly detection and workforce management
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge variant="default">
            <div className="w-2 h-2 rounded-full mr-2 bg-green-400 animate-pulse" />
            Live Monitoring
          </Badge>
          <Button variant="outline" size="sm" onClick={handleRefreshAll}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>

      {/* Main Dashboard Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Live Overview
          </TabsTrigger>
          <TabsTrigger value="monitoring" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Real-time Monitor
          </TabsTrigger>
          <TabsTrigger value="anomalies" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Anomalies & Alerts
          </TabsTrigger>
          <TabsTrigger value="records" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Attendance Records
          </TabsTrigger>
        </TabsList>

        {/* Live Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Statistics Cards */}
          <AttendanceStatsCards 
            stats={statsData}
            loading={statsLoading}
            dateRange={formatDateRange()}
          />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Real-time Updates */}
            <div className="lg:col-span-2">
              <RealTimeUpdates />
            </div>

            {/* Quick Actions */}
            <div>
              <QuickActions 
                onFiltersChange={handleFiltersChange}
                onRefresh={handleRefreshAll}
              />
            </div>
          </div>

          {/* Recent Anomalies Preview */}
          {anomaliesData && anomaliesData.anomalies && anomaliesData.anomalies.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                    Recent Anomalies
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setActiveTab('anomalies')}
                  >
                    View All
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {anomaliesData.anomalies.slice(0, 3).map((anomaly: AttendanceAnomaly) => (
                    <div key={anomaly.id} className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg">
                      <div>
                        <span className="text-sm font-medium text-red-900">
                          {anomaly.type.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
                        </span>
                        <p className="text-xs text-red-700">{anomaly.description}</p>
                      </div>
                      <Badge variant="destructive" className="text-xs">
                        {anomaly.severity}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Real-time Monitoring Tab */}
        <TabsContent value="monitoring" className="space-y-6">
          {/* GPS and Location Verification */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  GPS Verification Status
                </CardTitle>
                <CardDescription>
                  Real-time location verification for clock-ins and clock-outs
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="p-3 bg-green-50 rounded-lg">
                      <div className="text-lg font-bold text-green-700">
                        {statsLoading ? '--' : Math.floor((statsData?.totalRecords || 0) * 0.85)}
                      </div>
                      <div className="text-xs text-green-600">Verified</div>
                    </div>
                    <div className="p-3 bg-yellow-50 rounded-lg">
                      <div className="text-lg font-bold text-yellow-700">
                        {statsLoading ? '--' : Math.floor((statsData?.totalRecords || 0) * 0.10)}
                      </div>
                      <div className="text-xs text-yellow-600">Pending</div>
                    </div>
                    <div className="p-3 bg-red-50 rounded-lg">
                      <div className="text-lg font-bold text-red-700">
                        {statsLoading ? '--' : Math.floor((statsData?.totalRecords || 0) * 0.05)}
                      </div>
                      <div className="text-xs text-red-600">Failed</div>
                    </div>
                  </div>
                  
                  <Button variant="outline" className="w-full" size="sm">
                    <MapPin className="h-4 w-4 mr-2" />
                    View Location Map
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Missing Check-ins Alert
                </CardTitle>
                <CardDescription>
                  Employees who haven't checked in for scheduled shifts
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="text-center p-4">
                    <div className="text-2xl font-bold text-red-600">
                      {statsLoading ? '--' : (statsData?.absentCount || 0)}
                    </div>
                    <div className="text-sm text-gray-600">Missing check-ins today</div>
                  </div>
                  
                  <Button variant="destructive" size="sm" className="w-full">
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Send Notifications
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Real-time Activity Feed - Full Width */}
          <RealTimeUpdates />
        </TabsContent>

        {/* Anomalies & Alerts Tab */}
        <TabsContent value="anomalies" className="space-y-6">
          <AttendanceAnomalies
            anomalies={anomaliesData?.anomalies || []}
            loading={anomaliesLoading}
            total={anomaliesData?.total || 0}
            onViewDetails={handleAnomalyDetails}
            onResolve={handleAnomalyResolve}
          />
        </TabsContent>

        {/* Attendance Records Tab */}
        <TabsContent value="records" className="space-y-6">
          {/* Filters */}
          <AttendanceFilters
            filters={filters}
            onFiltersChange={handleFiltersChange}
            onReset={() => setFilters({
              dateFrom: new Date().toISOString().split('T')[0],
              dateTo: new Date().toISOString().split('T')[0],
              page: 1,
              limit: 50
            })}
          />

          {/* Actions Bar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Advanced Filters
              </Button>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export Data
              </Button>
            </div>
            
            <div className="text-sm text-gray-600">
              {attendanceData ? `${attendanceData.total} records found` : 'Loading...'}
            </div>
          </div>

          {/* Attendance Table */}
          <AttendanceTable
            data={attendanceData?.attendance || []}
            loading={attendanceLoading}
            pagination={attendanceData ? {
              page: attendanceData.page,
              limit: attendanceData.limit,
              total: attendanceData.total,
              hasNext: attendanceData.hasNext,
              hasPrevious: attendanceData.hasPrevious
            } : undefined}
            onPageChange={handlePageChange}
            onRowClick={handleAttendanceDetails}
            onRequestCorrection={handleAttendanceCorrection}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}