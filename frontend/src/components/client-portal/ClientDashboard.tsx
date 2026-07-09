'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Shield, 
  Users, 
  Clock, 
  AlertTriangle, 
  MapPin, 
  TrendingUp,
  Bell,
  Activity,
  MessageSquare,
  FileText,
  Download
} from 'lucide-react';

interface ClientDashboardProps {
  clientId: string;
}

interface DashboardData {
  siteOverview: {
    totalSites: number;
    activeSites: number;
    inactiveSites: number;
    sitesWithIssues: number;
  };
  guardDeployment: {
    totalGuards: number;
    activeGuards: number;
    onDutyGuards: number;
    vacantPositions: number;
  };
  attendanceMetrics: {
    attendanceRate: number;
    lateArrivals: number;
    earlyDepartures: number;
    missedShifts: number;
  };
  recentIncidents: Array<{
    id: string;
    type: string;
    siteName: string;
    employeeName?: string;
    timestamp: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  }>;
  notifications: Array<{
    id: string;
    type: string;
    message: string;
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
    timestamp: string;
    actionRequired: boolean;
  }>;
  siteHealth: Array<{
    siteId: string;
    siteName: string;
    healthScore: number;
    status: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' | 'CRITICAL';
    lastUpdate: string;
    issues: string[];
  }>;
}

export function ClientDashboard({ clientId }: ClientDashboardProps) {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, [clientId]);

  const fetchDashboardData = async () => {
    try {
      // Mock data for demonstration
      const mockData: DashboardData = {
        siteOverview: {
          totalSites: 15,
          activeSites: 12,
          inactiveSites: 3,
          sitesWithIssues: 1,
        },
        guardDeployment: {
          totalGuards: 45,
          activeGuards: 42,
          onDutyGuards: 38,
          vacantPositions: 3,
        },
        attendanceMetrics: {
          attendanceRate: 96.5,
          lateArrivals: 5,
          earlyDepartures: 2,
          missedShifts: 1,
        },
        recentIncidents: [
          {
            id: 'inc-1',
            type: 'LATE_ARRIVAL',
            siteName: 'Main Office',
            employeeName: 'John Doe',
            timestamp: '2024-01-15T08:15:00Z',
            severity: 'LOW',
          },
          {
            id: 'inc-2',
            type: 'EQUIPMENT_MALFUNCTION',
            siteName: 'Warehouse A',
            timestamp: '2024-01-15T10:30:00Z',
            severity: 'MEDIUM',
          },
        ],
        notifications: [
          {
            id: 'notif-1',
            type: 'GUARD_REPLACEMENT_REQUEST',
            message: 'Guard replacement needed at Site A - urgent',
            priority: 'HIGH',
            timestamp: '2024-01-15T09:00:00Z',
            actionRequired: true,
          },
        ],
        siteHealth: [
          {
            siteId: 'site-1',
            siteName: 'Main Office',
            healthScore: 95,
            status: 'EXCELLENT',
            lastUpdate: '2024-01-15T10:00:00Z',
            issues: [],
          },
          {
            siteId: 'site-2',
            siteName: 'Warehouse A',
            healthScore: 78,
            status: 'GOOD',
            lastUpdate: '2024-01-15T10:00:00Z',
            issues: ['Equipment maintenance due'],
          },
        ],
      };

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      setDashboardData(mockData);
    } catch (err) {
      setError('Failed to load dashboard data');
      console.error('Dashboard error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid gap-6">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="space-y-2">
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-gray-200 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error || !dashboardData) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-600">{error || 'Failed to load dashboard data'}</p>
            <Button onClick={fetchDashboardData} className="mt-4" variant="outline">
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'LOW': return 'bg-green-100 text-green-800';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800';
      case 'HIGH': return 'bg-orange-100 text-orange-800';
      case 'CRITICAL': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'LOW': return 'bg-blue-100 text-blue-800';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800';
      case 'HIGH': return 'bg-orange-100 text-orange-800';
      case 'URGENT': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getHealthStatusColor = (status: string) => {
    switch (status) {
      case 'EXCELLENT': return 'text-green-600';
      case 'GOOD': return 'text-blue-600';
      case 'FAIR': return 'text-yellow-600';
      case 'POOR': return 'text-orange-600';
      case 'CRITICAL': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="space-y-6">
      {/* Key Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Site Overview */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Site Overview</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData.siteOverview.totalSites}</div>
            <p className="text-xs text-muted-foreground">
              {dashboardData.siteOverview.activeSites} active, {dashboardData.siteOverview.sitesWithIssues} with issues
            </p>
          </CardContent>
        </Card>

        {/* Guard Deployment */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Guard Deployment</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData.guardDeployment.onDutyGuards}</div>
            <p className="text-xs text-muted-foreground">
              of {dashboardData.guardDeployment.totalGuards} guards on duty
            </p>
          </CardContent>
        </Card>

        {/* Attendance Rate */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Attendance Rate</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData.attendanceMetrics.attendanceRate}%</div>
            <p className="text-xs text-muted-foreground">
              {dashboardData.attendanceMetrics.lateArrivals} late arrivals today
            </p>
          </CardContent>
        </Card>

        {/* Vacant Positions */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vacant Positions</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{dashboardData.guardDeployment.vacantPositions}</div>
            <p className="text-xs text-muted-foreground">
              Positions need immediate attention
            </p>
          </CardContent>
        </Card>
      </div>
      {/* Notifications and Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications & Alerts
            </CardTitle>
            <CardDescription>
              Important updates and action items
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {dashboardData.notifications.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No new notifications</p>
            ) : (
              dashboardData.notifications.map((notification) => (
                <div key={notification.id} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <p className="font-medium text-sm">{notification.message}</p>
                    <Badge className={getPriorityColor(notification.priority)}>
                      {notification.priority}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{new Date(notification.timestamp).toLocaleString()}</span>
                    {notification.actionRequired && (
                      <Button size="sm" variant="outline">
                        Take Action
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Recent Incidents */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Recent Incidents
            </CardTitle>
            <CardDescription>
              Latest incidents and their status
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {dashboardData.recentIncidents.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No recent incidents</p>
            ) : (
              dashboardData.recentIncidents.map((incident) => (
                <div key={incident.id} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-sm">{incident.type.replace('_', ' ')}</p>
                      <p className="text-sm text-gray-600">{incident.siteName}</p>
                      {incident.employeeName && (
                        <p className="text-xs text-gray-500">Employee: {incident.employeeName}</p>
                      )}
                    </div>
                    <Badge className={getSeverityColor(incident.severity)}>
                      {incident.severity}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-500">
                    {new Date(incident.timestamp).toLocaleString()}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Site Health Indicators */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Site Health Indicators
          </CardTitle>
          <CardDescription>
            Real-time health and performance scores for all sites
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {dashboardData.siteHealth.map((site) => (
              <div key={site.siteId} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h4 className="font-medium">{site.siteName}</h4>
                    <p className="text-sm text-gray-600">Health Score: {site.healthScore}/100</p>
                  </div>
                  <div className="text-right">
                    <Badge className={`${getHealthStatusColor(site.status)} bg-transparent border`}>
                      {site.status}
                    </Badge>
                    <p className="text-xs text-gray-500 mt-1">
                      Updated: {new Date(site.lastUpdate).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
                
                {/* Health Score Progress Bar */}
                <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                  <div 
                    className={`h-2 rounded-full ${
                      site.healthScore >= 90 ? 'bg-green-600' :
                      site.healthScore >= 70 ? 'bg-yellow-500' :
                      'bg-red-500'
                    }`}
                    style={{ width: `${site.healthScore}%` }}
                  ></div>
                </div>

                {/* Issues */}
                {site.issues.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs font-medium text-gray-700 mb-1">Issues:</p>
                    <div className="flex flex-wrap gap-1">
                      {site.issues.map((issue, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {issue}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Common tasks and quick access to important features
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button variant="outline" className="h-20 flex flex-col items-center justify-center space-y-2">
              <Users className="h-6 w-6" />
              <span className="text-sm">Request Guard</span>
            </Button>
            <Button variant="outline" className="h-20 flex flex-col items-center justify-center space-y-2">
              <MessageSquare className="h-6 w-6" />
              <span className="text-sm">Submit Issue</span>
            </Button>
            <Button variant="outline" className="h-20 flex flex-col items-center justify-center space-y-2">
              <FileText className="h-6 w-6" />
              <span className="text-sm">View Reports</span>
            </Button>
            <Button variant="outline" className="h-20 flex flex-col items-center justify-center space-y-2">
              <Download className="h-6 w-6" />
              <span className="text-sm">Download Invoice</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}