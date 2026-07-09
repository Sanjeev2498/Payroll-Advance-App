'use client';

import { useEffect, useState } from 'react';
import { 
  Clock, 
  Calendar, 
  DollarSign, 
  MapPin, 
  CheckCircle, 
  XCircle,
  AlertTriangle,
  FileText,
  Bell
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useEmployeePortal } from '@/hooks/use-employee-portal';
import { formatTime, formatDate } from '@/lib/utils';

export function EmployeeDashboard() {
  const { dashboard, isLoading, clockIn, clockOut, markNotificationRead } = useEmployeePortal();

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <p className="text-gray-500">Unable to load dashboard data</p>
        </div>
      </div>
    );
  }

  const handleClockIn = async () => {
    if (dashboard.currentShift) {
      await clockIn(dashboard.currentShift.id);
    }
  };

  const handleClockOut = async () => {
    if (dashboard.currentShift) {
      await clockOut(dashboard.currentShift.id);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Welcome Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Welcome back!</h1>
        <p className="text-gray-600">Here's an overview of your work activity</p>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clock Status</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dashboard.clockStatus.isClockedIn ? (
                <span className="text-green-600">Clocked In</span>
              ) : (
                <span className="text-gray-500">Clocked Out</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {dashboard.clockStatus.lastActionTime && (
                <>Last action: {formatTime(dashboard.clockStatus.lastActionTime)}</>
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard.attendanceSummary.totalDaysWorked}</div>
            <p className="text-xs text-muted-foreground">
              Days worked ({dashboard.attendanceSummary.totalHoursWorked.toFixed(1)} hours)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Attendance Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard.attendanceSummary.attendanceRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              {dashboard.attendanceSummary.lateArrivals} late arrivals
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Notifications</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard.unreadNotifications}</div>
            <p className="text-xs text-muted-foreground">Unread messages</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Current Shift */}
        <Card>
          <CardHeader>
            <CardTitle>Current Shift</CardTitle>
            <CardDescription>Your active or next shift information</CardDescription>
          </CardHeader>
          <CardContent>
            {dashboard.currentShift ? (
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold">{dashboard.currentShift.siteName}</h3>
                    <p className="text-sm text-gray-600 flex items-center">
                      <MapPin className="h-4 w-4 mr-1" />
                      {dashboard.currentShift.siteAddress}
                    </p>
                  </div>
                  <Badge variant="outline" className="bg-green-50 text-green-700">
                    Active
                  </Badge>
                </div>
                
                <div className="text-sm">
                  <p><span className="font-medium">Time:</span> {formatTime(dashboard.currentShift.startTime)} - {formatTime(dashboard.currentShift.endTime)}</p>
                  <p><span className="font-medium">Role:</span> {dashboard.currentShift.role}</p>
                </div>

                <div className="flex gap-2">
                  {!dashboard.clockStatus.isClockedIn ? (
                    <Button onClick={handleClockIn} size="sm" className="bg-green-600 hover:bg-green-700">
                      <Clock className="h-4 w-4 mr-2" />
                      Clock In
                    </Button>
                  ) : (
                    <Button onClick={handleClockOut} size="sm" variant="outline" className="border-red-300 text-red-700 hover:bg-red-50">
                      <Clock className="h-4 w-4 mr-2" />
                      Clock Out
                    </Button>
                  )}
                </div>
              </div>
            ) : dashboard.nextShift ? (
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold">{dashboard.nextShift.siteName}</h3>
                    <p className="text-sm text-gray-600 flex items-center">
                      <MapPin className="h-4 w-4 mr-1" />
                      {dashboard.nextShift.siteAddress}
                    </p>
                  </div>
                  <Badge variant="outline">
                    Next Shift
                  </Badge>
                </div>
                
                <div className="text-sm">
                  <p><span className="font-medium">Date:</span> {formatDate(dashboard.nextShift.shiftDate)}</p>
                  <p><span className="font-medium">Time:</span> {formatTime(dashboard.nextShift.startTime)} - {formatTime(dashboard.nextShift.endTime)}</p>
                  <p><span className="font-medium">Role:</span> {dashboard.nextShift.role}</p>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No upcoming shifts scheduled</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Payslips */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Payslips</CardTitle>
            <CardDescription>Your latest salary information</CardDescription>
          </CardHeader>
          <CardContent>
            {dashboard.recentPayslips && dashboard.recentPayslips.length > 0 ? (
              <div className="space-y-3">
                {dashboard.recentPayslips.slice(0, 3).map((payslip) => (
                  <div key={payslip.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium">
                        {formatDate(payslip.payPeriodStart)} - {formatDate(payslip.payPeriodEnd)}
                      </p>
                      <p className="text-sm text-gray-600">
                        ₹{payslip.netPay.toLocaleString()} • {payslip.status}
                      </p>
                    </div>
                    <Button variant="ghost" size="sm">
                      <FileText className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" className="w-full">
                  View All Payslips
                </Button>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <DollarSign className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No payslips available</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Shifts */}
      <Card>
        <CardHeader>
          <CardTitle>Upcoming Shifts This Week</CardTitle>
          <CardDescription>Your scheduled shifts for the next 7 days</CardDescription>
        </CardHeader>
        <CardContent>
          {dashboard.upcomingShifts && dashboard.upcomingShifts.length > 0 ? (
            <div className="space-y-3">
              {dashboard.upcomingShifts.map((shift) => (
                <div key={shift.id} className="flex justify-between items-center p-3 border rounded-lg">
                  <div>
                    <h4 className="font-medium">{shift.siteName}</h4>
                    <p className="text-sm text-gray-600">
                      {formatDate(shift.shiftDate)} • {formatTime(shift.startTime)} - {formatTime(shift.endTime)}
                    </p>
                    <p className="text-sm text-gray-500">{shift.role}</p>
                  </div>
                  <Badge 
                    variant={shift.status === 'SCHEDULED' ? 'default' : 'secondary'}
                  >
                    {shift.status}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No upcoming shifts this week</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Today's Attendance */}
      {dashboard.todaysAttendance && (
        <Card>
          <CardHeader>
            <CardTitle>Today's Attendance</CardTitle>
            <CardDescription>Your attendance record for today</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
              <div>
                <p className="font-medium">{dashboard.todaysAttendance.siteName}</p>
                <div className="text-sm text-gray-600 space-y-1">
                  {dashboard.todaysAttendance.clockIn && (
                    <p>Clock In: {formatTime(dashboard.todaysAttendance.clockIn)}</p>
                  )}
                  {dashboard.todaysAttendance.clockOut && (
                    <p>Clock Out: {formatTime(dashboard.todaysAttendance.clockOut)}</p>
                  )}
                  {dashboard.todaysAttendance.hoursWorked > 0 && (
                    <p>Hours: {dashboard.todaysAttendance.hoursWorked.toFixed(2)}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center">
                {dashboard.todaysAttendance.locationVerified ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}