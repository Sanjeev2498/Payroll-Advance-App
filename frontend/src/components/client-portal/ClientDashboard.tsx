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
import { clientPortalApi, ClientGuardData } from '@/lib/api/client-portal';

interface ClientDashboardProps {
  clientId: string;
}

export function ClientDashboard({ clientId }: ClientDashboardProps) {
  const [dashboardData, setDashboardData] = useState<ClientGuardData[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, [clientId]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Use the actual API service
      const data = await clientPortalApi.getGuards(clientId);
      setDashboardData(data);
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
            <div className="text-2xl font-bold">{dashboardData.length}</div>
            <p className="text-xs text-muted-foreground">
              {dashboardData.filter(site => site.coverageStatus === 'FULLY_COVERED').length} active, {dashboardData.filter(site => site.coverageStatus === 'UNCOVERED').length} with issues
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
            <div className="text-2xl font-bold">{dashboardData.reduce((total, site) => total + site.onDutyGuards, 0)}</div>
            <p className="text-xs text-muted-foreground">
              of {dashboardData.reduce((total, site) => total + site.assignedGuards, 0)} guards on duty
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
            <div className="text-2xl font-bold">
              {dashboardData.length > 0 ? Math.round((dashboardData.reduce((total, site) => total + site.onDutyGuards, 0) / dashboardData.reduce((total, site) => total + site.assignedGuards, 0)) * 100) : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              {dashboardData.reduce((total, site) => total + site.guards.filter(g => g.status === 'LATE').length, 0)} late arrivals today
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
            <div className="text-2xl font-bold text-red-600">
              {dashboardData.reduce((total, site) => total + (site.requiredGuards - site.onDutyGuards), 0)}
            </div>
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
            {/* Display placeholder since we don't have notifications in the current data structure */}
            <p className="text-gray-500 text-center py-4">No new notifications</p>
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
            {/* Display placeholder since we don't have incidents in the current data structure */}
            <p className="text-gray-500 text-center py-4">No recent incidents</p>
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
            {dashboardData.map((site) => (
              <div key={site.siteId} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h4 className="font-medium">{site.siteName}</h4>
                    <p className="text-sm text-gray-600">Guards: {site.onDutyGuards}/{site.requiredGuards}</p>
                  </div>
                  <div className="text-right">
                    <Badge className={`${site.coverageStatus === 'FULLY_COVERED' ? 'text-green-800 border-green-200' : 'text-yellow-800 border-yellow-200'} bg-transparent border`}>
                      {site.coverageStatus.replace('_', ' ')}
                    </Badge>
                    <p className="text-xs text-gray-500 mt-1">
                      Coverage: {Math.round((site.onDutyGuards / site.requiredGuards) * 100)}%
                    </p>
                  </div>
                </div>
                
                {/* Coverage Progress Bar */}
                <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                  <div 
                    className={`h-2 rounded-full ${
                      (site.onDutyGuards / site.requiredGuards) >= 1 ? 'bg-green-600' :
                      (site.onDutyGuards / site.requiredGuards) >= 0.7 ? 'bg-yellow-500' :
                      'bg-red-500'
                    }`}
                    style={{ width: `${Math.round((site.onDutyGuards / site.requiredGuards) * 100)}%` }}
                  ></div>
                </div>

                {/* Guard Status Summary */}
                <div className="mt-2">
                  <p className="text-xs font-medium text-gray-700 mb-1">Guard Status:</p>
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="outline" className="text-xs">
                      {site.guards.filter(g => g.status === 'ON_DUTY').length} On Duty
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {site.guards.filter(g => g.status === 'LATE').length} Late
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {site.guards.filter(g => g.status === 'OFF_DUTY').length} Off Duty
                    </Badge>
                  </div>
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