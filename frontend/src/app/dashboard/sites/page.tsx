'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Plus, Search, Filter, MoreHorizontal, MapPin, Users, Clock, AlertTriangle, CheckCircle, XCircle, Wrench } from 'lucide-react'
import { Site, Assignment, Employee } from '@/types'
import { sitesApi } from '@/lib/api/sites'
import { useToast } from '@/hooks/use-toast'
import { SiteDetailsDialog } from '@/components/sites/site-details-dialog'
import { CreateSiteDialog } from '@/components/sites/create-site-dialog'
import { SiteOperationalDashboard } from '@/components/sites/site-operational-dashboard'
import { GuardDeploymentTracker } from '@/components/sites/guard-deployment-tracker'
import { SiteComplianceMonitor } from '@/components/sites/site-compliance-monitor'

export default function SitesManagementPage() {
  const [sites, setSites] = useState<Site[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [selectedSite, setSelectedSite] = useState<Site | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const { toast } = useToast()

  useEffect(() => {
    loadSites()
  }, [searchTerm, statusFilter])

  const loadSites = async () => {
    try {
      setLoading(true)
      const queryParams = {
        search: searchTerm || undefined,
        operationalStatus: statusFilter !== 'ALL' ? statusFilter as any : undefined,
        limit: 50
      }
      const response = await sitesApi.getSites(queryParams)
      setSites(response.sites)
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load sites',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'INACTIVE':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'MAINTENANCE':
        return <Wrench className="h-4 w-4 text-yellow-500" />
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800'
      case 'INACTIVE':
        return 'bg-red-100 text-red-800'
      case 'MAINTENANCE':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const filteredSites = sites.filter(site => {
    const matchesSearch = !searchTerm || 
      site.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (site.client?.name || '').toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === 'ALL' || site.operationalStatus === statusFilter
    
    return matchesSearch && matchesStatus
  })

  const siteStats = {
    total: sites.length,
    active: sites.filter(s => s.operationalStatus === 'ACTIVE').length,
    inactive: sites.filter(s => s.operationalStatus === 'INACTIVE').length,
    maintenance: sites.filter(s => s.operationalStatus === 'MAINTENANCE').length
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Site Management</h1>
          <p className="text-muted-foreground">
            Manage sites, operational status, and guard deployment across all locations
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Site
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <MapPin className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Total Sites</p>
                <p className="text-2xl font-bold">{siteStats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Active Sites</p>
                <p className="text-2xl font-bold">{siteStats.active}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Wrench className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-sm text-muted-foreground">Maintenance</p>
                <p className="text-2xl font-bold">{siteStats.maintenance}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <XCircle className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-sm text-muted-foreground">Inactive</p>
                <p className="text-2xl font-bold">{siteStats.inactive}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Site Overview</TabsTrigger>
          <TabsTrigger value="deployment">Guard Deployment</TabsTrigger>
          <TabsTrigger value="compliance">Safety & Compliance</TabsTrigger>
          <TabsTrigger value="analytics">Performance Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Search and Filter */}
          <div className="flex gap-4 items-center">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search sites or clients..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Statuses</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="INACTIVE">Inactive</SelectItem>
                <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Sites Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="space-y-3">
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                      <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              filteredSites.map((site) => (
                <Card key={site.id} className="hover:shadow-lg transition-shadow cursor-pointer"
                      onClick={() => {
                        setSelectedSite(site)
                        setIsDetailsDialogOpen(true)
                      }}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-lg">{site.name}</CardTitle>
                        <CardDescription>
                          {site.client?.name || 'No client assigned'}
                        </CardDescription>
                      </div>
                      <Badge className={getStatusColor(site.operationalStatus)}>
                        <div className="flex items-center gap-1">
                          {getStatusIcon(site.operationalStatus)}
                          {site.operationalStatus}
                        </div>
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center text-sm text-muted-foreground">
                      <MapPin className="mr-2 h-4 w-4" />
                      {typeof site.address === 'object' && site.address ? 
                        `${(site.address as any).city || ''}, ${(site.address as any).state || ''}` :
                        'Address not available'
                      }
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <div className="flex items-center text-muted-foreground">
                        <Users className="mr-1 h-4 w-4" />
                        {(site as any)._count?.assignments || 0} Guards
                      </div>
                      <div className="flex items-center text-muted-foreground">
                        <Clock className="mr-1 h-4 w-4" />
                        24/7
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="deployment">
          <GuardDeploymentTracker sites={filteredSites} />
        </TabsContent>

        <TabsContent value="compliance">
          <SiteComplianceMonitor sites={filteredSites} />
        </TabsContent>

        <TabsContent value="analytics">
          <SiteOperationalDashboard sites={filteredSites} />
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <CreateSiteDialog 
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSiteCreated={() => {
          loadSites()
          setIsCreateDialogOpen(false)
        }}
      />

      <SiteDetailsDialog
        site={selectedSite}
        open={isDetailsDialogOpen}
        onOpenChange={setIsDetailsDialogOpen}
        onSiteUpdated={loadSites}
      />
    </div>
  )
}