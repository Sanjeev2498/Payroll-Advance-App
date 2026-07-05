'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Users, 
  Building2, 
  Shield, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  MapPin,
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  UserPlus,
  UserX,
  Eye,
  Edit,
  Search,
  Filter,
  ArrowUpDown,
  Calendar,
  Activity,
  Zap
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { dashboardApi } from '@/lib/api/dashboard'
import { deploymentApi } from '@/lib/api/deployment'
import { 
  DeploymentMetrics,
  GuardAvailability,
  RealTimeAlert,
  SiteDeploymentDetail,
  AssignmentConflict,
  DeploymentEfficiencyMetrics
} from '@/types/dashboard'
import { useAuthPermissions } from '@/components/auth/protected-route'

interface DeploymentOperationsDashboardProps {
  className?: string
}

export function DeploymentOperationsDashboard({ className }: DeploymentOperationsDashboardProps) {
  const { user } = useAuthPermissions()
  
  const [deploymentMetrics, setDeploymentMetrics] = useState<DeploymentMetrics | null>(null)
  const [guardAvailability, setGuardAvailability] = useState<GuardAvailability | null>(null)
  const [siteDetails, setSiteDetails] = useState<SiteDeploymentDetail[]>([])
  const [conflicts, setConflicts] = useState<AssignmentConflict[]>([])
  const [efficiencyMetrics, setEfficiencyMetrics] = useState<DeploymentEfficiencyMetrics | null>(null)
  const [realTimeAlerts, setRealTimeAlerts] = useState<RealTimeAlert[]>([])
  
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  
  // Filtering and sorting states
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<string>('priority')
  const [selectedSite, setSelectedSite] = useState<string | null>(null)

  const loadDeploymentData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const [
        deploymentData,
        guardData,
        siteDetailsData,
        conflictsData,
        efficiencyData,
        alertsData
      ] = await Promise.all([
        dashboardApi.getDeploymentMetrics(),
        dashboardApi.getGuardAvailability(),
        deploymentApi.getSiteDetails(),
        deploymentApi.getAssignmentConflicts(),
        deploymentApi.getEfficiencyMetrics(),
        dashboardApi.getRealTimeAlerts()
      ])

      setDeploymentMetrics(deploymentData)
      setGuardAvailability(guardData)
      setSiteDetails(siteDetailsData)
      setConflicts(conflictsData)
      setEfficiencyMetrics(efficiencyData)
      setRealTimeAlerts(alertsData.filter(alert => 
        ['staffing', 'deployment'].includes(alert.type)
      ))
      setLastUpdated(new Date())
    } catch (err) {
      setError('Failed to load deployment data')
      console.error('Deployment data loading error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDeploymentData()
    
    // Auto-refresh every 15 seconds for real-time updates
    const interval = setInterval(loadDeploymentData, 15000)
    return () => clearInterval(interval)
  }, [])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'optimal': return 'text-green-600 bg-green-50 border-green-200'
      case 'understaffed': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'critical': return 'text-red-600 bg-red-50 border-red-200'
      case 'offline': return 'text-gray-600 bg-gray-50 border-gray-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'optimal': return 'bg-green-500'
      case 'understaffed': return 'bg-yellow-500'
      case 'critical': return 'bg-red-500'
      case 'offline': return 'bg-gray-500'
      default: return 'bg-gray-500'
    }
  }

  const getTrendIcon = (current: number, total: number) => {
    const percentage = (current / total) * 100
    if (percentage >= 90) return <TrendingUp className="w-4 h-4 text-green-500" />
    if (percentage >= 70) return <Minus className="w-4 h-4 text-yellow-500" />
    return <TrendingDown className="w-4 h-4 text-red-500" />
  }

  const getDeploymentEfficiency = (assigned: number, required: number) => {
    return Math.min(100, (assigned / required) * 100)
  }

  const handleQuickAssign = async (siteId: string) => {
    try {
      await deploymentApi.quickAssign(siteId)
      await loadDeploymentData()
    } catch (error) {
      console.error('Quick assign failed:', error)
    }
  }

  const handleEmergencyReplacement = async (siteId: string) => {
    try {
      await deploymentApi.requestEmergencyReplacement(siteId)
      await loadDeploymentData()
    } catch (error) {
      console.error('Emergency replacement request failed:', error)
    }
  }

  // Filter and sort site details
  const filteredSites = siteDetails.filter(site => {
    const matchesSearch = site.siteName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         site.clientName.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || site.operationalStatus === statusFilter
    return matchesSearch && matchesStatus
  }).sort((a, b) => {
    switch (sortBy) {
      case 'priority':
        const priorityOrder = { critical: 0, offline: 1, understaffed: 2, optimal: 3 }
        return priorityOrder[a.operationalStatus] - priorityOrder[b.operationalStatus]
      case 'name':
        return a.siteName.localeCompare(b.siteName)
      case 'efficiency':
        return getDeploymentEfficiency(b.assignedGuards, b.requiredGuards) - 
               getDeploymentEfficiency(a.assignedGuards, a.requiredGuards)
      default:
        return 0
    }
  })

  if (loading && !deploymentMetrics) {
    return (
      <div className={className}>
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
            <p className="text-sm text-gray-600">Loading Deployment Operations Dashboard...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={className}>
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <AlertTriangle className="w-8 h-8 mx-auto mb-4 text-red-600" />
            <p className="text-sm text-gray-600 mb-4">{error}</p>
            <Button onClick={loadDeploymentData} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={className}>
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Deployment Operations Dashboard
          </h1>
          <p className="text-gray-600">
            Real-time workforce deployment across {deploymentMetrics?.totalDeployments || 0} active sites
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </span>
          <Button 
            onClick={loadDeploymentData} 
            variant="outline" 
            size="sm"
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Critical Alerts Banner */}
      {realTimeAlerts.filter(alert => alert.severity === 'critical').length > 0 && (
        <Card className="mb-6 border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <div>
                <h3 className="font-medium text-red-800">Critical Deployment Issues</h3>
                <p className="text-sm text-red-700">
                  {realTimeAlerts.filter(alert => alert.severity === 'critical').length} critical deployment issues require immediate attention
                </p>
              </div>
              <Button variant="destructive" size="sm" className="ml-auto">
                Address Issues
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Site Coverage */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Site Coverage</p>
                <p className="text-2xl font-bold text-blue-600">
                  {deploymentMetrics ? Math.round(((deploymentMetrics.optimalSites / deploymentMetrics.totalDeployments) * 100)) : 0}%
                </p>
                <p className="text-xs text-blue-600 flex items-center mt-1">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  {deploymentMetrics?.optimalSites} of {deploymentMetrics?.totalDeployments} optimal
                </p>
              </div>
              <div className="text-2xl">🎯</div>
            </div>
          </CardContent>
        </Card>

        {/* Available Guards */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Available Guards</p>
                <p className="text-2xl font-bold text-green-600">{guardAvailability?.availableNow}</p>
                <p className="text-xs text-green-600 flex items-center mt-1">
                  <Users className="w-3 h-3 mr-1" />
                  {guardAvailability?.unassigned} unassigned
                </p>
              </div>
              <div className="text-2xl">🛡️</div>
            </div>
          </CardContent>
        </Card>

        {/* Critical Sites */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Critical Sites</p>
                <p className={`text-2xl font-bold ${(deploymentMetrics?.criticalSites || 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {deploymentMetrics?.criticalSites}
                </p>
                <p className={`text-xs flex items-center mt-1 ${(deploymentMetrics?.criticalSites || 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  {(deploymentMetrics?.criticalSites || 0) === 0 ? 'All sites stable' : 'Immediate action required'}
                </p>
              </div>
              <div className="text-2xl">⚠️</div>
            </div>
          </CardContent>
        </Card>

        {/* Deployment Efficiency */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg Efficiency</p>
                <p className="text-2xl font-bold text-purple-600">
                  {efficiencyMetrics?.averageEfficiency ? Math.round(efficiencyMetrics.averageEfficiency) : 0}%
                </p>
                <p className="text-xs text-purple-600 flex items-center mt-1">
                  <Activity className="w-3 h-3 mr-1" />
                  {efficiencyMetrics?.deploymentTrend === 'up' ? 'Improving' : 'Needs attention'}
                </p>
              </div>
              <div className="text-2xl">📊</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Dashboard Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Site Deployment Overview */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Site Deployment Status */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  Site Deployment Status
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm">
                    <UserPlus className="w-4 h-4 mr-2" />
                    Bulk Assign
                  </Button>
                  <Button variant="outline" size="sm">
                    <Calendar className="w-4 h-4 mr-2" />
                    Schedule View
                  </Button>
                </div>
              </div>
              
              {/* Filters and Search */}
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <div className="flex-1">
                  <Input
                    placeholder="Search sites or clients..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full"
                  />
                </div>
                <div className="flex gap-2">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Sites</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                      <SelectItem value="understaffed">Understaffed</SelectItem>
                      <SelectItem value="optimal">Optimal</SelectItem>
                      <SelectItem value="offline">Offline</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="priority">Priority</SelectItem>
                      <SelectItem value="name">Name</SelectItem>
                      <SelectItem value="efficiency">Efficiency</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <div className="space-y-3">
                  {filteredSites.map((site) => (
                    <div 
                      key={site.siteId} 
                      className={`p-4 rounded-lg border-2 transition-all hover:shadow-md cursor-pointer ${
                        selectedSite === site.siteId ? 'ring-2 ring-blue-500' : ''
                      } ${getStatusColor(site.operationalStatus)}`}
                      onClick={() => setSelectedSite(selectedSite === site.siteId ? null : site.siteId)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className={`w-3 h-3 rounded-full ${getStatusBadgeColor(site.operationalStatus)}`} />
                          <div>
                            <h3 className="font-medium text-gray-900">{site.siteName}</h3>
                            <p className="text-sm text-gray-600">{site.clientName}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center space-x-3">
                            <div className="text-right">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">
                                  {site.assignedGuards}/{site.requiredGuards}
                                </span>
                                {getTrendIcon(site.assignedGuards, site.requiredGuards)}
                              </div>
                              <Progress 
                                value={getDeploymentEfficiency(site.assignedGuards, site.requiredGuards)}
                                className="w-20 h-2 mt-1"
                              />
                            </div>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="sm" onClick={(e) => {
                                e.stopPropagation()
                                // Handle view details
                              }}>
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={(e) => {
                                e.stopPropagation()
                                handleQuickAssign(site.siteId)
                              }}>
                                <UserPlus className="w-4 h-4" />
                              </Button>
                              {site.operationalStatus === 'critical' && (
                                <Button variant="ghost" size="sm" onClick={(e) => {
                                  e.stopPropagation()
                                  handleEmergencyReplacement(site.siteId)
                                }}>
                                  <Zap className="w-4 h-4 text-red-500" />
                                </Button>
                              )}
                            </div>
                          </div>
                          <p className={`text-xs font-medium capitalize mt-1 ${
                            site.operationalStatus === 'optimal' ? 'text-green-600' :
                            site.operationalStatus === 'understaffed' ? 'text-yellow-600' :
                            site.operationalStatus === 'critical' ? 'text-red-600' :
                            'text-gray-600'
                          }`}>
                            {site.operationalStatus}
                          </p>
                        </div>
                      </div>
                      
                      {/* Expanded Details */}
                      {selectedSite === site.siteId && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <span className="text-gray-600">On Duty:</span>
                              <span className="ml-2 font-medium">{site.onDutyGuards}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Vacancies:</span>
                              <span className="ml-2 font-medium text-red-600">{site.vacancies}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Shift Coverage:</span>
                              <span className="ml-2 font-medium">
                                {site.shiftCoverage ? `${Math.round(site.shiftCoverage)}%` : 'N/A'}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-600">Last Update:</span>
                              <span className="ml-2 font-medium">
                                {site.lastUpdate ? new Date(site.lastUpdate).toLocaleTimeString() : 'N/A'}
                              </span>
                            </div>
                          </div>
                          
                          {/* Quick Actions */}
                          <div className="flex gap-2 mt-3">
                            <Button variant="outline" size="sm">
                              <Edit className="w-4 h-4 mr-2" />
                              Edit Requirements
                            </Button>
                            <Button variant="outline" size="sm">
                              <Calendar className="w-4 h-4 mr-2" />
                              View Schedule
                            </Button>
                            <Button variant="outline" size="sm">
                              <Activity className="w-4 h-4 mr-2" />
                              Performance
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {filteredSites.length === 0 && (
                    <div className="text-center py-8">
                      <Building2 className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                      <p className="text-gray-500">No sites match your filters</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

        </div>

        {/* Right Column - Guard Availability & Actions */}
        <div className="space-y-6">
          
          {/* Guard Availability */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Guard Availability
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 rounded-lg bg-green-50 border border-green-200">
                    <p className="text-2xl font-bold text-green-600">{guardAvailability?.availableNow}</p>
                    <p className="text-xs text-green-700">Available Now</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-blue-50 border border-blue-200">
                    <p className="text-2xl font-bold text-blue-600">{guardAvailability?.onDuty}</p>
                    <p className="text-xs text-blue-700">On Duty</p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Unassigned</span>
                    <span className="font-medium">{guardAvailability?.unassigned}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">On Leave</span>
                    <span className="font-medium">{guardAvailability?.onLeave}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Unavailable</span>
                    <span className="font-medium">{guardAvailability?.unavailable}</span>
                  </div>
                </div>

                <Button className="w-full" variant="outline">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Manage Availability
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Assignment Conflicts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  Assignment Conflicts
                </span>
                <Badge variant="destructive">
                  {conflicts.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-48">
                <div className="space-y-3">
                  {conflicts.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">No active conflicts</p>
                  ) : (
                    conflicts.map((conflict) => (
                      <div key={conflict.id} className="p-3 rounded-lg border border-yellow-200 bg-yellow-50">
                        <h4 className="text-sm font-medium text-gray-900">{conflict.type}</h4>
                        <p className="text-xs text-gray-600 mt-1">{conflict.description}</p>
                        <div className="flex justify-between items-center mt-2">
                          <Badge variant="outline" className="text-xs">
                            {conflict.severity}
                          </Badge>
                          <Button size="sm" variant="ghost" className="text-xs">
                            Resolve
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Button className="w-full" variant="outline">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Emergency Assignment
                </Button>
                <Button className="w-full" variant="outline">
                  <UserX className="w-4 h-4 mr-2" />
                  Request Replacement
                </Button>
                <Button className="w-full" variant="outline">
                  <Calendar className="w-4 h-4 mr-2" />
                  Adjust Schedules
                </Button>
                <Button className="w-full" variant="outline">
                  <Shield className="w-4 h-4 mr-2" />
                  Site Health Check
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}