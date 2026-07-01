'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useAuthPermissions } from '@/components/auth/protected-route'
import Link from 'next/link'

interface EmployeeDashboardProps {
  className?: string
}

export function EmployeeDashboard({ className }: EmployeeDashboardProps) {
  const { user } = useAuthPermissions()
  const [currentShift] = useState({
    id: '1',
    site: 'Downtown Office Building',
    startTime: '09:00 AM',
    endTime: '05:00 PM',
    status: 'scheduled' as const,
    location: '123 Main St, City',
  })

  const [recentActivity] = useState([
    { date: '2024-01-15', action: 'Clocked In', time: '09:02 AM', site: 'Downtown Office' },
    { date: '2024-01-15', action: 'Clocked Out', time: '05:01 PM', site: 'Downtown Office' },
    { date: '2024-01-14', action: 'Clocked In', time: '09:00 AM', site: 'Mall Security' },
    { date: '2024-01-14', action: 'Clocked Out', time: '05:00 PM', site: 'Mall Security' },
  ])

  const [upcomingShifts] = useState([
    { date: '2024-01-16', site: 'Downtown Office Building', time: '09:00 AM - 05:00 PM' },
    { date: '2024-01-17', site: 'Mall Security Post', time: '10:00 AM - 06:00 PM' },
    { date: '2024-01-18', site: 'Downtown Office Building', time: '09:00 AM - 05:00 PM' },
  ])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    })
  }

  const getShiftStatusBadge = (status: string) => {
    switch (status) {
      case 'scheduled':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Scheduled</Badge>
      case 'active':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Active</Badge>
      case 'completed':
        return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">Completed</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <div className={className}>
      {/* Welcome Section */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {user?.firstName}!
        </h1>
        <p className="text-gray-600">
          Here's what's happening with your schedule today
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Shift */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Today's Shift
                {getShiftStatusBadge(currentShift.status)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {currentShift ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h3 className="font-medium text-gray-900">{currentShift.site}</h3>
                      <p className="text-sm text-gray-600">{currentShift.location}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {currentShift.startTime} - {currentShift.endTime}
                      </p>
                      <p className="text-sm text-gray-600">8 hours scheduled</p>
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-blue-900">Ready to start your shift?</h4>
                        <p className="text-sm text-blue-700">Clock in when you arrive at the site</p>
                      </div>
                      <Button size="sm" asChild>
                        <Link href="/dashboard/attendance/clock">
                          Clock In
                        </Link>
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Break Time:</span>
                      <p className="font-medium">12:00 PM - 1:00 PM</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Supervisor:</span>
                      <p className="font-medium">Sarah Johnson</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-gray-400 mb-2">📅</div>
                  <p className="text-gray-600">No shifts scheduled for today</p>
                  <p className="text-sm text-gray-500">Enjoy your day off!</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentActivity.map((activity, index) => (
                  <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                    <div className="flex items-center space-x-3">
                      <div className={`w-2 h-2 rounded-full ${
                        activity.action === 'Clocked In' ? 'bg-green-400' : 'bg-red-400'
                      }`} />
                      <div>
                        <p className="font-medium text-sm">{activity.action}</p>
                        <p className="text-xs text-gray-500">{activity.site}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{activity.time}</p>
                      <p className="text-xs text-gray-500">{formatDate(activity.date)}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 text-center">
                <Button variant="outline" size="sm" asChild>
                  <Link href="/dashboard/attendance">
                    View All Activity
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">This Week</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Hours Worked</span>
                <span className="font-bold text-lg">32.5</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Shifts Completed</span>
                <span className="font-bold text-lg">4</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">On-time Rate</span>
                <span className="font-bold text-lg text-green-600">100%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Overtime</span>
                <span className="font-bold text-lg">0.5h</span>
              </div>
            </CardContent>
          </Card>

          {/* Upcoming Shifts */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Upcoming Shifts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {upcomingShifts.map((shift, index) => (
                  <div key={index} className="border-l-4 border-blue-500 pl-3 py-2">
                    <p className="font-medium text-sm">{formatDate(shift.date)}</p>
                    <p className="text-sm text-gray-600">{shift.site}</p>
                    <p className="text-xs text-gray-500">{shift.time}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 text-center">
                <Button variant="outline" size="sm" asChild>
                  <Link href="/dashboard/my-schedule">
                    View Full Schedule
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full justify-start" variant="outline" asChild>
                <Link href="/dashboard/attendance/clock">
                  <span className="mr-2">⏰</span>
                  Clock In/Out
                </Link>
              </Button>
              <Button className="w-full justify-start" variant="outline" asChild>
                <Link href="/dashboard/profile">
                  <span className="mr-2">👤</span>
                  Update Profile
                </Link>
              </Button>
              <Button className="w-full justify-start" variant="outline" asChild>
                <Link href="/dashboard/my-schedule">
                  <span className="mr-2">📅</span>
                  View Schedule
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Important Notice */}
          <Card className="border-amber-200 bg-amber-50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-amber-800">Important Notice</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-amber-700">
                New security protocols are in effect starting next week. 
                Please review the updated guidelines in your profile.
              </p>
              <Button size="sm" variant="outline" className="mt-2 border-amber-300 text-amber-800 hover:bg-amber-100">
                Learn More
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}