'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Search, 
  Plus, 
  Filter, 
  Download,
  Users,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Calendar,
  FileText,
  Phone,
  Mail,
  MapPin,
  Building2,
  DollarSign
} from 'lucide-react'

interface Client {
  id: string
  name: string
  contactEmail: string
  contractStatus: 'ACTIVE' | 'PENDING' | 'EXPIRED' | 'TERMINATED'
  contractStart?: Date
  contractEnd?: Date
  industry?: string
  sitesCount: number
  totalRevenue: number
  accountManager?: {
    name: string
    email: string
  }
  performanceScore: number
  renewalRisk: 'LOW' | 'MEDIUM' | 'HIGH'
}

// Mock data - would come from API
const mockClients: Client[] = [
  {
    id: '1',
    name: 'Acme Manufacturing Corp',
    contactEmail: 'contact@acme-manufacturing.com',
    contractStatus: 'ACTIVE',
    contractStart: new Date('2024-01-01'),
    contractEnd: new Date('2024-12-31'),
    industry: 'Manufacturing',
    sitesCount: 5,
    totalRevenue: 125000,
    accountManager: { name: 'John Smith', email: 'john@company.com' },
    performanceScore: 8.5,
    renewalRisk: 'LOW',
  },
  {
    id: '2',
    name: 'TechCorp Office Complex',
    contactEmail: 'security@techcorp.com',
    contractStatus: 'ACTIVE',
    contractStart: new Date('2023-06-15'),
    contractEnd: new Date('2025-06-14'),
    industry: 'Technology',
    sitesCount: 3,
    totalRevenue: 95000,
    accountManager: { name: 'Sarah Johnson', email: 'sarah@company.com' },
    performanceScore: 9.2,
    renewalRisk: 'LOW',
  },
  {
    id: '3',
    name: 'Retail Plaza Group',
    contactEmail: 'ops@retailplaza.com',
    contractStatus: 'ACTIVE',
    contractStart: new Date('2024-03-01'),
    contractEnd: new Date('2024-11-30'),
    industry: 'Retail',
    sitesCount: 8,
    totalRevenue: 180000,
    accountManager: { name: 'Mike Wilson', email: 'mike@company.com' },
    performanceScore: 7.8,
    renewalRisk: 'MEDIUM',
  },
  {
    id: '4',
    name: 'City Hospital Network',
    contactEmail: 'security@cityhospital.org',
    contractStatus: 'PENDING',
    industry: 'Healthcare',
    sitesCount: 2,
    totalRevenue: 0,
    accountManager: { name: 'Lisa Davis', email: 'lisa@company.com' },
    performanceScore: 0,
    renewalRisk: 'LOW',
  },
]

const clientStats = {
  total: 24,
  active: 18,
  pending: 4,
  expiring: 2,
  totalRevenue: 1250000,
  avgContractValue: 52000,
}

export default function ClientsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)

  const filteredClients = mockClients.filter(client => {
    const matchesSearch = client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         client.contactEmail.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = selectedStatus === 'all' || client.contractStatus === selectedStatus
    return matchesSearch && matchesStatus
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'bg-green-100 text-green-800'
      case 'PENDING': return 'bg-yellow-100 text-yellow-800'
      case 'EXPIRED': return 'bg-red-100 text-red-800'
      case 'TERMINATED': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'LOW': return 'bg-green-100 text-green-800'
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800'
      case 'HIGH': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Client Portfolio</h1>
          <p className="text-gray-600">Manage client relationships, contracts, and performance metrics</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Add New Client
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Clients</p>
                <p className="text-3xl font-bold text-gray-900">{clientStats.total}</p>
              </div>
              <Users className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Contracts</p>
                <p className="text-3xl font-bold text-green-600">{clientStats.active}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Expiring Soon</p>
                <p className="text-3xl font-bold text-orange-600">{clientStats.expiring}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                <p className="text-3xl font-bold text-blue-600">
                  ${clientStats.totalRevenue.toLocaleString()}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Client Directory</TabsTrigger>
          <TabsTrigger value="onboarding">Onboarding Pipeline</TabsTrigger>
          <TabsTrigger value="renewals">Contract Renewals</TabsTrigger>
          <TabsTrigger value="performance">Performance Metrics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Search and Filters */}
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search clients by name or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="flex gap-2">
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                  >
                    <option value="all">All Status</option>
                    <option value="ACTIVE">Active</option>
                    <option value="PENDING">Pending</option>
                    <option value="EXPIRED">Expired</option>
                    <option value="TERMINATED">Terminated</option>
                  </select>
                  <Button variant="outline" size="sm">
                    <Filter className="w-4 h-4 mr-2" />
                    More Filters
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Client List */}
          <div className="grid gap-4">
            {filteredClients.map((client) => (
              <Card key={client.id} className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">{client.name}</h3>
                        <Badge className={getStatusColor(client.contractStatus)}>
                          {client.contractStatus}
                        </Badge>
                        {client.renewalRisk !== 'LOW' && (
                          <Badge className={getRiskColor(client.renewalRisk)}>
                            {client.renewalRisk} RISK
                          </Badge>
                        )}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4" />
                          {client.contactEmail}
                        </div>
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4" />
                          {client.industry || 'N/A'}
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4" />
                          {client.sitesCount} Sites
                        </div>
                        <div className="flex items-center gap-2">
                          <DollarSign className="w-4 h-4" />
                          ${client.totalRevenue.toLocaleString()}
                        </div>
                      </div>
                      {client.accountManager && (
                        <div className="mt-2 text-sm text-gray-500">
                          Account Manager: {client.accountManager.name}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {client.performanceScore > 0 && (
                        <div className="text-right">
                          <div className="text-sm font-medium">Performance Score</div>
                          <div className="text-2xl font-bold text-blue-600">
                            {client.performanceScore}/10
                          </div>
                        </div>
                      )}
                      {client.contractEnd && (
                        <div className="text-right">
                          <div className="text-sm text-gray-500">Contract Expires</div>
                          <div className="text-sm font-medium">
                            {client.contractEnd.toLocaleDateString()}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="onboarding">
          <Card>
            <CardHeader>
              <CardTitle>Client Onboarding Pipeline</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-500">Onboarding workflow and document collection tracking will be implemented here.</p>
              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border-dashed">
                  <CardContent className="p-4">
                    <h4 className="font-medium text-gray-900">New Clients</h4>
                    <p className="text-2xl font-bold text-blue-600">3</p>
                    <p className="text-sm text-gray-500">Starting onboarding</p>
                  </CardContent>
                </Card>
                <Card className="border-dashed">
                  <CardContent className="p-4">
                    <h4 className="font-medium text-gray-900">In Progress</h4>
                    <p className="text-2xl font-bold text-yellow-600">5</p>
                    <p className="text-sm text-gray-500">Document collection</p>
                  </CardContent>
                </Card>
                <Card className="border-dashed">
                  <CardContent className="p-4">
                    <h4 className="font-medium text-gray-900">Ready to Launch</h4>
                    <p className="text-2xl font-bold text-green-600">2</p>
                    <p className="text-sm text-gray-500">Onboarding complete</p>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="renewals">
          <Card>
            <CardHeader>
              <CardTitle>Contract Renewal Management</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-500">Contract renewal tracking and automation will be implemented here.</p>
              <div className="mt-4">
                <h4 className="font-medium mb-2">Upcoming Renewals</h4>
                <div className="space-y-2">
                  {filteredClients
                    .filter(c => c.contractEnd && c.contractEnd > new Date())
                    .map(client => (
                    <div key={client.id} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                      <div>
                        <div className="font-medium">{client.name}</div>
                        <div className="text-sm text-gray-500">
                          Expires: {client.contractEnd?.toLocaleDateString()}
                        </div>
                      </div>
                      <Badge className={getRiskColor(client.renewalRisk)}>
                        {client.renewalRisk} RISK
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance">
          <Card>
            <CardHeader>
              <CardTitle>Client Performance Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-500">Performance metrics and client satisfaction analytics will be implemented here.</p>
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="border-dashed">
                  <CardContent className="p-4">
                    <h4 className="font-medium text-gray-900">Average Performance Score</h4>
                    <p className="text-3xl font-bold text-green-600">8.2/10</p>
                  </CardContent>
                </Card>
                <Card className="border-dashed">
                  <CardContent className="p-4">
                    <h4 className="font-medium text-gray-900">Client Satisfaction</h4>
                    <p className="text-3xl font-bold text-blue-600">94%</p>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}