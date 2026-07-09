'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, Calendar, TrendingUp, Download } from 'lucide-react';

interface AttendanceManagementProps {
  clientId: string;
}

export function AttendanceManagement({ clientId }: AttendanceManagementProps) {
  const [dateRange, setDateRange] = useState('today');

  // Mock attendance data
  const attendanceMetrics = {
    totalShifts: 150,
    presentGuards: 142,
    absentGuards: 5,
    lateGuards: 3,
    attendanceRate: 94.7,
  };

  const recentAttendance = [
    {
      id: 'att-1',
      guardName: 'John Doe',
      siteName: 'Main Office',
      clockIn: '08:00',
      clockOut: '20:00',
      status: 'PRESENT',
      hoursWorked: 12.0,
    },
    {
      id: 'att-2',
      guardName: 'Jane Smith',
      siteName: 'Warehouse A',
      clockIn: '08:15',
      clockOut: '20:00',
      status: 'LATE',
      hoursWorked: 11.75,
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PRESENT': return 'bg-green-100 text-green-800';
      case 'LATE': return 'bg-yellow-100 text-yellow-800';
      case 'ABSENT': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Attendance Dashboard Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Shifts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{attendanceMetrics.totalShifts}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Present Guards</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{attendanceMetrics.presentGuards}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Absent Guards</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{attendanceMetrics.absentGuards}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Late Arrivals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{attendanceMetrics.lateGuards}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Attendance Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{attendanceMetrics.attendanceRate}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Real-time Attendance Dashboard */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Real-time Attendance Dashboard
          </CardTitle>
          <CardDescription>
            Live attendance tracking for all client sites
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentAttendance.map((record) => (
              <div key={record.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">{record.guardName}</h4>
                    <p className="text-sm text-gray-600">{record.siteName}</p>
                  </div>
                  <Badge className={getStatusColor(record.status)}>
                    {record.status}
                  </Badge>
                </div>
                <div className="grid grid-cols-3 gap-4 mt-2 text-sm">
                  <div>
                    <span className="text-gray-500">Clock In:</span>
                    <p className="font-medium">{record.clockIn}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Clock Out:</span>
                    <p className="font-medium">{record.clockOut}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Hours Worked:</span>
                    <p className="font-medium">{record.hoursWorked}h</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Attendance Reports */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Attendance Reports & Analytics
          </CardTitle>
          <CardDescription>
            Attendance patterns, trends, and export functionality
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center">
            <p>Generate detailed attendance reports for custom date ranges</p>
            <Button className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Export Attendance Data
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}