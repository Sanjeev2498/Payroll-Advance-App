'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Calendar } from '@/components/ui/calendar'
import { Clock, Calendar as CalendarIcon, MapPin, CheckCircle, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function MyAttendancePage() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
  const [clockedIn, setClockedIn] = useState(false)

  // Mock data - this would come from API
  const currentStatus = {
    clockedIn: clockedIn,
    clockInTime: '09:00 AM',
    site: 'Tech Plaza - Main Entrance',
    hoursWorked: '7.5',
    breakTime: '1.0'
  }

  const attendanceHistory = [
    {
      date: '2026-07-08',
      clockIn: '09:00 AM',
      clockOut: '06:00 PM',
      hoursWorked: '8.0',
      site: 'Tech Plaza - Main Entrance',
      status: 'present'
    },
    {
      date: '2026-07-07',
      clockIn: '09:05 AM',
      clockOut: '06:05 PM',
      hoursWorked: '8.0',
      site: 'Tech Plaza - Main Entrance',
      status: 'late'
    },
    {
      date: '2026-07-06',
      clockIn: '09:00 AM',
      clockOut: '06:00 PM',
      hoursWorked: '8.0',
      site: 'Tech Plaza - Parking Area',
      status: 'present'
    },
    {
      date: '2026-07-05',
      clockIn: '-',
      clockOut: '-',
      hoursWorked: '0',
      site: '-',
      status: 'absent'
    }
  ]

  const monthlyStats = {
    totalDays: 20,
    presentDays: 18,
    lateDays: 2,
    absentDays: 2,
    totalHours: 144
  }

  const handleClockIn = () => {
    setClockedIn(true)
  }

  const handleClockOut = () => {
    setClockedIn(false)
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Attendance</h1>
          <p className="text-gray-600">Track your working hours and attendance history</p>
        </div>
        <Badge variant={clockedIn ? "default" : "secondary"} className={clockedIn ? "bg-green-100 text-green-800" : ""}>
          {clockedIn ? "Clocked In" : "Not Clocked In"}
        </Badge>
      </div>

      {/* Clock In/Out Section */}
      <Card className="border-l-4 border-l-green-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Today's Attendance
          </CardTitle>
          <CardDescription>
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-500">Status</p>
              <div className="flex items-center gap-2 mt-1">
                {clockedIn ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-gray-400" />
                )}
                <span className="font-medium">
                  {clockedIn ? "Clocked In" : "Not Started"}
                </span>
              </div>
            </div>
            
            <div>
              <p className="text-sm text-gray-500">Clock In Time</p>
              <p className="font-medium">
                {clockedIn ? currentStatus.clockInTime : "-"}
              </p>
            </div>
            
            <div>
              <p className="text-sm text-gray-500">Hours Worked</p>
              <p className="font-medium">
                {clockedIn ? currentStatus.hoursWorked : "0.0"}
              </p>
            </div>
            
            <div>
              <p className="text-sm text-gray-500">Current Site</p>
              <p className="font-medium text-sm">
                {clockedIn ? currentStatus.site : "-"}
              </p>
            </div>
          </div>
          
          <div className="flex gap-4">
            {!clockedIn ? (
              <Button onClick={handleClockIn} className="bg-green-600 hover:bg-green-700">
                <Clock className="h-4 w-4 mr-2" />
                Clock In
              </Button>
            ) : (
              <Button onClick={handleClockOut} variant="outline" className="border-red-200 text-red-600 hover:bg-red-50">
                <Clock className="h-4 w-4 mr-2" />
                Clock Out
              </Button>
            )}
            <Button variant="outline">
              <MapPin className="h-4 w-4 mr-2" />
              View Site Location
            </Button>
            <Button variant="outline">
              Request Correction
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Statistics */}
        <Card>
          <CardHeader>
            <CardTitle>Monthly Summary</CardTitle>
            <CardDescription>July 2026</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <p className="text-2xl font-bold text-green-600">{monthlyStats.presentDays}</p>
                <p className="text-sm text-gray-600">Present Days</p>
              </div>
              <div className="text-center p-3 bg-orange-50 rounded-lg">
                <p className="text-2xl font-bold text-orange-600">{monthlyStats.lateDays}</p>
                <p className="text-sm text-gray-600">Late Days</p>
              </div>
              <div className="text-center p-3 bg-red-50 rounded-lg">
                <p className="text-2xl font-bold text-red-600">{monthlyStats.absentDays}</p>
                <p className="text-sm text-gray-600">Absent Days</p>
              </div>
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <p className="text-2xl font-bold text-blue-600">{monthlyStats.totalHours}</p>
                <p className="text-sm text-gray-600">Total Hours</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Calendar */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              Attendance Calendar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              className="rounded-md border"
            />
          </CardContent>
        </Card>

        {/* Recent History */}
        <Card>
          <CardHeader>
            <CardTitle>Recent History</CardTitle>
            <CardDescription>Last 4 working days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {attendanceHistory.map((record, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium text-sm">
                      {new Date(record.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                    </p>
                    <p className="text-xs text-gray-500">{record.site}</p>
                    <p className="text-xs text-gray-500">{record.hoursWorked}h</p>
                  </div>
                  <Badge 
                    variant="outline" 
                    className={cn(
                      record.status === 'present' && "border-green-200 text-green-700",
                      record.status === 'late' && "border-orange-200 text-orange-700",
                      record.status === 'absent' && "border-red-200 text-red-700"
                    )}
                  >
                    {record.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed History Table */}
      <Card>
        <CardHeader>
          <CardTitle>Attendance History</CardTitle>
          <CardDescription>Detailed record of your attendance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Date</th>
                  <th className="text-left p-2">Clock In</th>
                  <th className="text-left p-2">Clock Out</th>
                  <th className="text-left p-2">Hours</th>
                  <th className="text-left p-2">Site</th>
                  <th className="text-left p-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {attendanceHistory.map((record, index) => (
                  <tr key={index} className="border-b">
                    <td className="p-2">
                      {new Date(record.date).toLocaleDateString('en-IN')}
                    </td>
                    <td className="p-2">{record.clockIn}</td>
                    <td className="p-2">{record.clockOut}</td>
                    <td className="p-2">{record.hoursWorked}h</td>
                    <td className="p-2 text-sm">{record.site}</td>
                    <td className="p-2">
                      <Badge 
                        variant="outline" 
                        className={cn(
                          record.status === 'present' && "border-green-200 text-green-700",
                          record.status === 'late' && "border-orange-200 text-orange-700", 
                          record.status === 'absent' && "border-red-200 text-red-700"
                        )}
                      >
                        {record.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}