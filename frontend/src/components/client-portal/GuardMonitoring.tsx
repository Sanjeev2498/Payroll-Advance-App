'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Users, 
  MapPin, 
  Clock, 
  Phone, 
  AlertCircle,
  CheckCircle,
  Search,
  Filter
} from 'lucide-react';

interface GuardMonitoringProps {
  clientId: string;
}

interface GuardData {
  guardId: string;
  guardName: string;
  status: 'ON_DUTY' | 'OFF_DUTY' | 'ON_BREAK' | 'LATE' | 'ABSENT' | 'EMERGENCY';
  shiftStart: string;
  shiftEnd: string;
  location?: { lat: number; lng: number };
  lastCheckIn: string;
  photo?: string;
  contactNumber?: string;
  emergencyContact?: string;
}

interface SiteData {
  siteId: string;
  siteName: string;
  requiredGuards: number;
  assignedGuards: number;
  onDutyGuards: number;
  coverageStatus: 'FULLY_COVERED' | 'PARTIALLY_COVERED' | 'UNCOVERED' | 'OVER_STAFFED';
  guards: GuardData[];
}

interface GuardPerformance {
  guardId: string;
  guardName: string;
  attendanceRate: number;
  punctualityScore: number;
  recentIncidents: number;
  clientRating: number;
  lastPerformanceReview: string;
}

export function GuardMonitoring({ clientId }: GuardMonitoringProps) {
  const [deploymentData, setDeploymentData] = useState<SiteData[]>([]);
  const [performanceData, setPerformanceData] = useState<GuardPerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedSite, setSelectedSite] = useState<string>('all');

  useEffect(() => {
    fetchGuardMonitoringData();
  }, [clientId]);

  const fetchGuardMonitoringData = async () => {
    try {
      // Mock data for demonstration
      const mockDeploymentData: SiteData[] = [
        {
          siteId: 'site-1',
          siteName: 'Main Office',
          requiredGuards: 4,
          assignedGuards: 4,
          onDutyGuards: 3,
          coverageStatus: 'PARTIALLY_COVERED',
          guards: [
            {
              guardId: 'emp-1',
              guardName: 'John Doe',
              status: 'ON_DUTY',
              shiftStart: '08:00',
              shiftEnd: '20:00',
              location: { lat: 12.9716, lng: 77.5946 },
              lastCheckIn: '2024-01-15T08:00:00Z',
              photo: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face',
              contactNumber: '+91 9876543210',
            },
            {
              guardId: 'emp-2',
              guardName: 'Jane Smith',
              status: 'ON_BREAK',
              shiftStart: '08:00',
              shiftEnd: '20:00',
              lastCheckIn: '2024-01-15T14:30:00Z',
              contactNumber: '+91 9876543211',
            },
            {
              guardId: 'emp-3',
              guardName: 'Mike Wilson',
              status: 'LATE',
              shiftStart: '20:00',
              shiftEnd: '08:00',
              lastCheckIn: '2024-01-15T20:15:00Z',
              contactNumber: '+91 9876543212',
            },
          ],
        },
        {
          siteId: 'site-2',
          siteName: 'Warehouse A',
          requiredGuards: 2,
          assignedGuards: 2,
          onDutyGuards: 2,
          coverageStatus: 'FULLY_COVERED',
          guards: [
            {
              guardId: 'emp-4',
              guardName: 'David Brown',
              status: 'ON_DUTY',
              shiftStart: '08:00',
              shiftEnd: '20:00',
              lastCheckIn: '2024-01-15T08:00:00Z',
              contactNumber: '+91 9876543213',
            },
            {
              guardId: 'emp-5',
              guardName: 'Sarah Davis',
              status: 'ON_DUTY',
              shiftStart: '20:00',
              shiftEnd: '08:00',
              lastCheckIn: '2024-01-15T20:00:00Z',
              contactNumber: '+91 9876543214',
            },
          ],
        },
      ];

      const mockPerformanceData: GuardPerformance[] = [
        {
          guardId: 'emp-1',
          guardName: 'John Doe',
          attendanceRate: 98.5,
          punctualityScore: 95.2,
          recentIncidents: 0,
          clientRating: 4.8,
          lastPerformanceReview: '2024-01-01',
        },
        {
          guardId: 'emp-2',
          guardName: 'Jane Smith',
          attendanceRate: 97.2,
          punctualityScore: 98.1,
          recentIncidents: 1,
          clientRating: 4.6,
          lastPerformanceReview: '2024-01-01',
        },
      ];

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      setDeploymentData(mockDeploymentData);
      setPerformanceData(mockPerformanceData);
    } catch (error) {
      console.error('Failed to fetch guard monitoring data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ON_DUTY': return 'bg-green-100 text-green-800';
      case 'OFF_DUTY': return 'bg-gray-100 text-gray-800';
      case 'ON_BREAK': return 'bg-blue-100 text-blue-800';
      case 'LATE': return 'bg-yellow-100 text-yellow-800';
      case 'ABSENT': return 'bg-red-100 text-red-800';
      case 'EMERGENCY': return 'bg-red-100 text-red-800 animate-pulse';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCoverageStatusColor = (status: string) => {
    switch (status) {
      case 'FULLY_COVERED': return 'bg-green-100 text-green-800';
      case 'PARTIALLY_COVERED': return 'bg-yellow-100 text-yellow-800';
      case 'UNCOVERED': return 'bg-red-100 text-red-800';
      case 'OVER_STAFFED': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ON_DUTY': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'LATE': case 'ABSENT': case 'EMERGENCY': 
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default: return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const filteredData = deploymentData.filter(site => {
    const siteMatch = selectedSite === 'all' || site.siteId === selectedSite;
    const guardMatch = site.guards.some(guard => 
      guard.guardName.toLowerCase().includes(searchTerm.toLowerCase()) &&
      (statusFilter === 'all' || guard.status === statusFilter)
    );
    return siteMatch && (searchTerm === '' || guardMatch);
  });

  if (loading) {
    return (
      <div className="space-y-6">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-6 bg-gray-200 rounded w-1/3"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="h-20 bg-gray-200 rounded"></div>
                <div className="h-20 bg-gray-200 rounded"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle>Guard Monitoring & Deployment</CardTitle>
          <CardDescription>
            Real-time monitoring of guard deployment, status, and site coverage
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search guards..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedSite} onValueChange={setSelectedSite}>
              <SelectTrigger>
                <SelectValue placeholder="Select site" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sites</SelectItem>
                {deploymentData.map(site => (
                  <SelectItem key={site.siteId} value={site.siteId}>
                    {site.siteName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="ON_DUTY">On Duty</SelectItem>
                <SelectItem value="OFF_DUTY">Off Duty</SelectItem>
                <SelectItem value="ON_BREAK">On Break</SelectItem>
                <SelectItem value="LATE">Late</SelectItem>
                <SelectItem value="ABSENT">Absent</SelectItem>
              </SelectContent>
            </Select>
            <Button className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Apply Filters
            </Button>
          </div>
        </CardContent>
      </Card>
      {/* Site Deployment Status */}
      <div className="space-y-6">
        {filteredData.map((site) => (
          <Card key={site.siteId}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    {site.siteName}
                  </CardTitle>
                  <CardDescription>
                    {site.onDutyGuards} of {site.requiredGuards} guards on duty
                  </CardDescription>
                </div>
                <div className="text-right space-y-2">
                  <Badge className={getCoverageStatusColor(site.coverageStatus)}>
                    {site.coverageStatus.replace('_', ' ')}
                  </Badge>
                  <div className="text-sm text-gray-500">
                    Coverage: {Math.round((site.onDutyGuards / site.requiredGuards) * 100)}%
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Guards List */}
              <div className="space-y-4">
                {site.guards
                  .filter(guard => 
                    guard.guardName.toLowerCase().includes(searchTerm.toLowerCase()) &&
                    (statusFilter === 'all' || guard.status === statusFilter)
                  )
                  .map((guard) => (
                  <div key={guard.guardId} className="border rounded-lg p-4">
                    <div className="flex items-start space-x-4">
                      {/* Guard Photo */}
                      <div className="relative">
                        {guard.photo ? (
                          <img 
                            src={guard.photo} 
                            alt={guard.guardName}
                            className="w-16 h-16 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center">
                            <Users className="h-8 w-8 text-gray-400" />
                          </div>
                        )}
                        <div className="absolute -bottom-1 -right-1">
                          {getStatusIcon(guard.status)}
                        </div>
                      </div>

                      {/* Guard Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-lg font-semibold">{guard.guardName}</h4>
                          <Badge className={getStatusColor(guard.status)}>
                            {guard.status.replace('_', ' ')}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-gray-500">Shift Time:</span>
                            <p className="font-medium">{guard.shiftStart} - {guard.shiftEnd}</p>
                          </div>
                          <div>
                            <span className="text-gray-500">Last Check-in:</span>
                            <p className="font-medium">
                              {new Date(guard.lastCheckIn).toLocaleTimeString()}
                            </p>
                          </div>
                          <div>
                            <span className="text-gray-500">Contact:</span>
                            <p className="font-medium">{guard.contactNumber}</p>
                          </div>
                          {guard.location && (
                            <div>
                              <span className="text-gray-500">Location:</span>
                              <p className="font-medium text-green-600">Verified</p>
                            </div>
                          )}
                        </div>

                        {/* Quick Actions */}
                        <div className="flex gap-2 mt-3">
                          <Button size="sm" variant="outline" className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            Call
                          </Button>
                          <Button size="sm" variant="outline">
                            View Details
                          </Button>
                          {guard.status === 'LATE' || guard.status === 'ABSENT' && (
                            <Button size="sm" variant="destructive">
                              Request Replacement
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Site Actions */}
              <div className="flex justify-between items-center mt-6 pt-4 border-t">
                <div className="text-sm text-gray-500">
                  Last updated: {new Date().toLocaleTimeString()}
                </div>
                <div className="space-x-2">
                  <Button variant="outline" size="sm">
                    View Site Details
                  </Button>
                  <Button size="sm">
                    Request Additional Guard
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Guard Performance Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Guard Performance Summary</CardTitle>
          <CardDescription>
            Performance metrics and ratings for deployed guards
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-4">Guard Name</th>
                  <th className="text-center p-4">Attendance Rate</th>
                  <th className="text-center p-4">Punctuality Score</th>
                  <th className="text-center p-4">Recent Incidents</th>
                  <th className="text-center p-4">Client Rating</th>
                  <th className="text-center p-4">Last Review</th>
                </tr>
              </thead>
              <tbody>
                {performanceData.map((guard) => (
                  <tr key={guard.guardId} className="border-b hover:bg-gray-50">
                    <td className="p-4 font-medium">{guard.guardName}</td>
                    <td className="p-4 text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        guard.attendanceRate >= 95 ? 'bg-green-100 text-green-800' :
                        guard.attendanceRate >= 90 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {guard.attendanceRate}%
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        guard.punctualityScore >= 95 ? 'bg-green-100 text-green-800' :
                        guard.punctualityScore >= 90 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {guard.punctualityScore}%
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        guard.recentIncidents === 0 ? 'bg-green-100 text-green-800' :
                        guard.recentIncidents <= 2 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {guard.recentIncidents}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center">
                        <span className="text-yellow-400">★</span>
                        <span className="ml-1 font-medium">{guard.clientRating}</span>
                      </div>
                    </td>
                    <td className="p-4 text-center text-gray-600">
                      {new Date(guard.lastPerformanceReview).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}