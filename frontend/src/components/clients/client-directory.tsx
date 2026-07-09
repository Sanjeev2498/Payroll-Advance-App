'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Search, Plus, Filter, Edit, Trash2, Calendar, Mail, Phone, Building } from 'lucide-react'
import { Client, ContractStatus, ClientQueryParams, clientsApi, ClientListResponse } from '@/lib/api/clients'
import { toast } from 'sonner'

interface ClientDirectoryProps {
  onClientSelect?: (client: Client) => void
  onAddClient?: () => void
}

export function ClientDirectory({ onClientSelect, onAddClient }: ClientDirectoryProps) {
  const router = useRouter()
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [totalCount, setTotalCount] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<ContractStatus | 'ALL'>('ALL')
  const [sortBy, setSortBy] = useState('name')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')

  const itemsPerPage = 10

  useEffect(() => {
    loadClients()
  }, [currentPage, searchTerm, statusFilter, sortBy, sortOrder])

  const loadClients = async () => {
    try {
      setLoading(true)
      const params: ClientQueryParams = {
        page: currentPage,
        limit: itemsPerPage,
        sortBy,
        sortOrder,
      }

      if (searchTerm.trim()) {
        params.search = searchTerm.trim()
      }

      if (statusFilter !== 'ALL') {
        params.contractStatus = statusFilter as ContractStatus
      }

      const response: ClientListResponse = await clientsApi.getClients(params)
      setClients(response.clients)
      setTotalCount(response.totalCount)
    } catch (error) {
      console.error('Error loading clients:', error)
      toast.error('Failed to load clients')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteClient = async (clientId: string, clientName: string) => {
    if (!confirm(`Are you sure you want to delete client "${clientName}"?`)) {
      return
    }

    try {
      await clientsApi.deleteClient(clientId)
      toast.success('Client deleted successfully')
      loadClients()
    } catch (error) {
      console.error('Error deleting client:', error)
      toast.error('Failed to delete client')
    }
  }

  const getStatusBadgeVariant = (status: ContractStatus) => {
    switch (status) {
      case ContractStatus.ACTIVE:
        return 'default'
      case ContractStatus.PENDING:
        return 'secondary'
      case ContractStatus.EXPIRED:
        return 'destructive'
      case ContractStatus.TERMINATED:
        return 'outline'
      default:
        return 'secondary'
    }
  }

  const formatDate = (date: Date | string | undefined) => {
    if (!date) return '-'
    return new Date(date).toLocaleDateString()
  }

  const totalPages = Math.ceil(totalCount / itemsPerPage)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Client Directory</h2>
          <p className="text-gray-600">Manage your client relationships and contracts</p>
        </div>
        <Button onClick={onAddClient || (() => router.push('/dashboard/clients/new'))} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Add Client
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search clients by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as ContractStatus | 'ALL')}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Statuses</SelectItem>
                <SelectItem value={ContractStatus.ACTIVE}>Active</SelectItem>
                <SelectItem value={ContractStatus.PENDING}>Pending</SelectItem>
                <SelectItem value={ContractStatus.EXPIRED}>Expired</SelectItem>
                <SelectItem value={ContractStatus.TERMINATED}>Terminated</SelectItem>
              </SelectContent>
            </Select>

            {/* Sort */}
            <Select value={`${sortBy}-${sortOrder}`} onValueChange={(value) => {
              const [field, order] = value.split('-')
              setSortBy(field)
              setSortOrder(order as 'asc' | 'desc')
            }}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name-asc">Name (A-Z)</SelectItem>
                <SelectItem value="name-desc">Name (Z-A)</SelectItem>
                <SelectItem value="createdAt-desc">Newest First</SelectItem>
                <SelectItem value="createdAt-asc">Oldest First</SelectItem>
                <SelectItem value="contractStart-desc">Contract Start (Recent)</SelectItem>
                <SelectItem value="contractEnd-asc">Contract End (Soonest)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Client Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Clients ({totalCount})</span>
            <div className="text-sm text-gray-500">
              Page {currentPage} of {totalPages}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : clients.length === 0 ? (
            <div className="text-center py-12">
              <Building className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-semibold text-gray-900">No clients found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm || statusFilter !== 'ALL' 
                  ? 'Try adjusting your search or filters' 
                  : 'Get started by adding your first client'}
              </p>
              {(!searchTerm && statusFilter === 'ALL') && (
                <Button 
                  className="mt-4" 
                  onClick={onAddClient || (() => router.push('/dashboard/clients/new'))}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Your First Client
                </Button>
              )}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Contact Info</TableHead>
                    <TableHead>Contract Status</TableHead>
                    <TableHead>Contract Period</TableHead>
                    <TableHead>Billing</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clients.map((client) => (
                    <TableRow key={client.id} className="cursor-pointer hover:bg-gray-50" onClick={() => onClientSelect?.(client)}>
                      <TableCell>
                        <div>
                          <div className="font-semibold text-gray-900">{client.name}</div>
                          <div className="text-sm text-gray-500 flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {client.contactEmail}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {client.contactInfo?.contactPerson && (
                            <div className="text-sm font-medium">{client.contactInfo.contactPerson}</div>
                          )}
                          {client.contactInfo?.phone && (
                            <div className="text-sm text-gray-500 flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {client.contactInfo.phone}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(client.contractStatus)}>
                          {client.contractStatus}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="text-sm flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDate(client.contractStart)} - {formatDate(client.contractEnd)}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {client.billingPreferences?.frequency || '-'}
                          {client.billingPreferences?.paymentTerms && (
                            <div className="text-gray-500">
                              Net {client.billingPreferences.paymentTerms} days
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push(`/dashboard/clients/${client.id}/edit`)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteClient(client.id, client.name)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-gray-700">
                    Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount} clients
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}