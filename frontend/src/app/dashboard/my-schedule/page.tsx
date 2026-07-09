'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Calendar, Clock, MapPin, User, Bell } from 'lucide-react'

export default function MySchedulePage() {
  // Mock data - this would come from API
  const todayShift = {
    site: 'Tech Plaza - Main Entrance',
    startTime: '09:00 AM',
    endTime: '06:00 PM',
    supervisor: 'Rohit Supervisor',
    status: 'active'
  }

  const upcomingShifts = [
    {
      date: '2026-07-10',
      site: 'Tech Plaza - Main Entrance',
      time: '09:00 AM - 06:00 PM',
      supervisor: 'Rohit Supervisor'
    },
    {
      date: '2026-07-11',
      site: 'Tech Plaza - Parking Area',
      time: '10:00 AM - 07:00 PM', 
      supervisor: 'Rohit Supervisor'
    },
    {
      date: '2026-07-12',
      site: 'Tech Plaza - Main Entrance',
      time: '09:00 AM - 06:00 PM',
      supervisor: 'Rohit Supervisor'
    }
  ]

  const notifications = [
    {
      type: 'shift_change',
      message: 'Your shift for July 11 has been moved to Parking Area',
      time: '2 hours ago'
    },
    {
      type: 'assignment',
      message: 'You have been assigned additional evening patrol',
      time: '5 hours ago'
    }
  ]

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Schedule</h1>
          <p className="text-gray-600">View your shifts and assignments</p>
        </div>
        <Badge variant="outline" className="text-green-600">
          On Duty
        </Badge>
      </div>

      {/* Today's Shift */}
      <Card className="border-l-4 border-l-blue-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Today's Shift
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-gray-500" />
              <div>
                <p className="text-sm text-gray-500">Site</p>
                <p className="font-medium">{todayShift.site}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-gray-500" />
              <div>
                <p className="text-sm text-gray-500">Time</p>
                <p className="font-medium">{todayShift.startTime} - {todayShift.endTime}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-gray-500" />
              <div>
                <p className="text-sm text-gray-500">Supervisor</p>
                <p className="font-medium">{todayShift.supervisor}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div>
                <p className="text-sm text-gray-500">Status</p>
                <Badge variant="default" className="bg-green-100 text-green-800">
                  Active
                </Badge>
              </div>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button size="sm" variant="outline">
              View Site Details
            </Button>
            <Button size="sm" variant="outline">
              Contact Supervisor
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Shifts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Upcoming Shifts
            </CardTitle>
            <CardDescription>
              Your scheduled assignments for the next 7 days
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {upcomingShifts.map((shift, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{new Date(shift.date).toLocaleDateString('en-IN', { weekday: 'long', month: 'short', day: 'numeric' })}</p>
                    <p className="text-sm text-gray-600">{shift.site}</p>
                    <p className="text-sm text-gray-500">{shift.time}</p>
                  </div>
                  <Badge variant="outline">
                    Scheduled
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications
            </CardTitle>
            <CardDescription>
              Recent updates and alerts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {notifications.map((notification, index) => (
                <div key={index} className="flex items-start gap-3 p-3 border rounded-lg">
                  <div className="mt-1">
                    {notification.type === 'shift_change' && (
                      <Calendar className="h-4 w-4 text-orange-500" />
                    )}
                    {notification.type === 'assignment' && (
                      <Bell className="h-4 w-4 text-blue-500" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm">{notification.message}</p>
                    <p className="text-xs text-gray-500 mt-1">{notification.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Common tasks you might need to perform
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button variant="outline" className="h-20 flex-col">
              <Clock className="h-6 w-6 mb-2" />
              Clock In/Out
            </Button>
            <Button variant="outline" className="h-20 flex-col">
              <Calendar className="h-6 w-6 mb-2" />
              Request Leave
            </Button>
            <Button variant="outline" className="h-20 flex-col">
              <User className="h-6 w-6 mb-2" />
              Update Profile
            </Button>
            <Button variant="outline" className="h-20 flex-col">
              <Bell className="h-6 w-6 mb-2" />
              Report Incident
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}