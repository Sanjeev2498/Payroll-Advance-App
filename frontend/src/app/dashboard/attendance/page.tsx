'use client'

import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { attendanceService } from '@/lib/api/attendance'
import { AttendanceFilter } from '@/types'
import { 
  Users, 
  AlertTriangle, 
  RefreshCw,
  Clock,
  CheckCircle,
  Timer
} from 'lucide-react'

export default function AttendancePage() {
  const [filters] = useState<AttendanceFilter>({
    dateFrom: new Date().toISOString().split('T')[0],
    dateTo: new Date().toISOString().split('T')[0],
    page: 1,
    limit: 20
  })

  // Fetch attendance statistics
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['attendanceStats', filters.dateFrom, filters.dateTo, filters.siteId, filters.employeeId],
    queryFn: () => attendanceService.getStats(
      filters.dateFrom, 
      filters.dateTo, 
      filters.siteId, 
      filters.employeeId
    ),
    refetchInterval: 30000,
    staleTime: 30000,
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Attendance Dashboard
          </h1>
          <p className="text-gray-600 mt-1">
            Real-time attendance monitoring and analytics
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge variant="default">
            <div className="w-2 h-2 rounded-full mr-2 bg-green-400 animate-pulse" />
            Live
          </Badge>
          <Button variant="outline" size="sm">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Live Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600">Total Records</span>
              <Users className="h-5 w-5 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {statsLoading ? '--' : (statsData?.totalRecords || 0)}
            </div>
            <p className="text-sm text-gray-600">Attendance entries</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600">Attendance Rate</span>
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">
              {statsLoading ? '--' : `${(statsData?.attendanceRate || 0).toFixed(1)}%`}
            </div>
            <p className="text-sm text-gray-600">Present today</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600">Late Arrivals</span>
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-700">
              {statsLoading ? '--' : (statsData?.lateCount || 0)}
            </div>
            <p className="text-sm text-gray-600">Late today</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600">Overtime Hours</span>
              <Timer className="h-5 w-5 text-orange-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-700">
              {statsLoading ? '--' : Math.floor(statsData?.totalOvertimeHours || 0)}
            </div>
            <p className="text-sm text-gray-600">Hours today</p>
          </CardContent>
        </Card>
      </div>

      {/* Live Activity Feed */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Live Activity Feed
          </CardTitle>
          <CardDescription>
            Real-time attendance events and alerts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium">John Smith clocked in at Downtown Office</span>
                </div>
                <div className="text-xs text-green-600">
                  {new Date().toLocaleTimeString()}
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
              <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium">Sarah Johnson arrived 15 minutes late</span>
                  <Badge variant="secondary" className="text-xs">MEDIUM</Badge>
                </div>
                <div className="text-xs text-yellow-600">
                  {new Date(Date.now() - 300000).toLocaleTimeString()}
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <Clock className="h-4 w-4 text-blue-600 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium">Mike Davis clocked out from Shopping Mall</span>
                </div>
                <div className="text-xs text-blue-600">
                  {new Date(Date.now() - 600000).toLocaleTimeString()}
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-4 pt-4 border-t">
            <Button variant="outline" className="w-full">
              View All Activity
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Coming Soon Notice */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-900">Enhanced Features Coming Soon</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-blue-800 text-sm space-y-2">
            <p>• Advanced filtering and search capabilities</p>
            <p>• Detailed attendance table with employee records</p>
            <p>• Anomaly detection and automated alerts</p>
            <p>• Export and reporting functionality</p>
            <p>• Real-time WebSocket updates</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}