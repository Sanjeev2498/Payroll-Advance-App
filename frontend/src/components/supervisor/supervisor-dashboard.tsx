'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Users, 
  MapPin, 
  Clock, 
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
  // Mock data - this would come from API based on supervisor's assigned sites
  const assignedSites = [
    {
      id: '1',
      name: 'Tech Plaza - Main Entrance',
      status: 'active',
      requiredGuards: 2,
      currentGuards: 2,
      address: 'MG Road, Bangalore'
    },
    {
      id: '2', 
      name: 'Tech Plaza - Parking Area',
      status: 'active',
      requiredGuards: 1,
      currentGuards: 1,
      address: 'MG Road, Bangalore'
    }
  ]

  const siteEmployees = [
    {
      id: '1',
      employeeNumber: 'EMP001',
      name: 'Rajesh Kumar',
      email: 'rajesh.kumar@demosecurity.co.in',
      phone: '+91-98765-12345',
      currentSite: 'Tech Plaza - Main Entrance',
      status: 'on_duty',
      shift: '09:00 AM - 06:00 PM',
      joiningDate: '2024-01-15',
      certifications: ['Basic Security', 'Fire Safety']
    },
    {
      id: '2',
      name: 'Priya Sharma',
      employeeNumber: 'EMP002',
      email: 'priya.sharma@demosecurity.co.in', 
      phone: '+91-98765-12346',
      currentSite: 'Tech Plaza - Main Entrance',
      status: 'on_duty',
      shift: '09:00 AM - 06:00 PM',
      joiningDate: '2024-02-01',
      certifications: ['Basic Security', 'First Aid']
    },
    {
      id: '3',
      name: 'Amit Singh',
      employeeNumber: 'EMP003',
      email: 'amit.singh@demosecurity.co.in',
      phone: '+91-98765-12347',
      currentSite: 'Tech Plaza - Parking Area',
      status: 'off_duty',
      shift: '10:00 AM - 07:00 PM',
      joiningDate: '2024-01-20',
      certifications: ['Basic Security']
    }
  ]

  const todayAlerts = [
    {
      type: 'late_arrival',
      message: 'Rajesh Kumar arrived 5 minutes late',
      time: '09:05 AM',
      severity: 'low'
    },
    {
      type: 'coverage_gap',
      message: 'Parking Area will be short-staffed from 3-4 PM',
      time: '2 hours ahead',
      severity: 'medium'
    }
  ]

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'on_duty':
        return <Badge className="bg-green-100 text-green-700">On Duty</Badge>
      case 'off_duty':
        return <Badge variant="secondary">Off Duty</Badge>
      case 'on_leave':
        return <Badge className="bg-orange-100 text-orange-700">On Leave</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
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

  return (
    <div className={className}>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Supervisor Dashboard</h1>
        <p className="text-gray-600">Manage your assigned sites and employees</p>
      </div>

      {/* Site Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {assignedSites.map((site) => (
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
                  <Badge variant="outline" className="text-green-600">Active</Badge>
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
                {siteEmployees.map((employee) => (
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
                      {getStatusBadge(employee.status)}
                    </div>

                    <div className="flex gap-2">
                      <Button size="sm" variant="outline">
                        <Phone className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline">
                        <Mail className="h-4 w-4" />
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
                {todayAlerts.map((alert, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 border rounded-lg">
                    <div className="mt-1">
                      {alert.severity === 'medium' ? (
                        <AlertTriangle className="h-4 w-4 text-orange-500" />
                      ) : (
                        <Clock className="h-4 w-4 text-blue-500" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm">{alert.message}</p>
                      <p className="text-xs text-gray-500 mt-1">{alert.time}</p>
                    </div>
                  </div>
                ))}
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
                <Button variant="outline" className="w-full justify-start">
                  <Calendar className="h-4 w-4 mr-2" />
                  Mark Attendance
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Users className="h-4 w-4 mr-2" />
                  Request Coverage
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Report Incident
                </Button>
                <Button variant="outline" className="w-full justify-start">
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
                  <span className="font-medium">{siteEmployees.filter(e => e.status === 'on_duty').length}</span>
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