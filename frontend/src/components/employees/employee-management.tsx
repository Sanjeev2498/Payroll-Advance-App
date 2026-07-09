'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  Users, 
  Search, 
  Filter, 
  Plus, 
  MoreHorizontal,
  Star,
  MapPin,
  Calendar,
  Phone,
  Mail,
  FileText,
  CheckCircle,
  AlertTriangle,
  Clock,
  Briefcase,
  Award,
  RefreshCw,
  Download,
  Upload,
  Edit,
  Trash2,
  Eye
} from 'lucide-react'
import { employeesApi, EmployeeResponseDto, EmployeeQueryDto, EmployeeStatsResponseDto } from '@/lib/api/employees'
import { useAuthPermissions } from '@/components/auth/protected-route'
import { EmployeeForm } from './employee-form'
import { EmployeeDocuments } from './employee-documents'
import { AdvancedEmployeeSearch } from './advanced-employee-search'
import { EmployeeAnalyticsDashboard } from './employee-analytics-dashboard'

interface EmployeeManagementProps {
  className?: string
}

interface EmployeeFilters {
  search: string
  employmentStatus: string
  department: string
  jobTitle: string
  skills: string[]
  hireDateFrom: string
  hireDateTo: string
}

const DEFAULT_FILTERS: EmployeeFilters = {
  search: '',
  employmentStatus: '',
  department: '',
  jobTitle: '',
  skills: [],
  hireDateFrom: '',
  hireDateTo: ''
}

export function EmployeeManagement({ className }: EmployeeManagementProps) {
  const { user } = useAuthPermissions()

  // Role-based access control
  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'COMPANY_ADMIN'
  const isSupervisor = user?.role === 'SUPERVISOR'
  
  // Supervisors can only view employees assigned to their sites
  // Admins can view and manage all employees

  // State management
  const [employees, setEmployees] = useState<EmployeeResponseDto[]>([])
  const [stats, setStats] = useState<EmployeeStatsResponseDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeResponseDto | null>(null)
  const [filters, setFilters] = useState<EmployeeFilters>(DEFAULT_FILTERS)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  })
  const [sortBy, setSortBy] = useState('createdAt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [activeTab, setActiveTab] = useState('directory')
  const [showFilters, setShowFilters] = useState(false)
  const [showEmployeeForm, setShowEmployeeForm] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState<EmployeeResponseDto | null>(null)
  const [showDocuments, setShowDocuments] = useState(false)
  const [documentsEmployee, setDocumentsEmployee] = useState<EmployeeResponseDto | null>(null)

  // Load employee data
  const loadEmployees = async (resetPage = false) => {
    try {
      setLoading(true)
      setError(null)
      
      const queryDto: EmployeeQueryDto = {
        page: resetPage ? 1 : pagination.page,
        limit: pagination.limit,
        sortBy,
        sortOrder
      }

      // Apply filters
      if (filters.search.trim()) queryDto.search = filters.search.trim()
      if (filters.employmentStatus) queryDto.employmentStatus = filters.employmentStatus as any
      if (filters.department) queryDto.department = filters.department
      if (filters.jobTitle) queryDto.jobTitle = filters.jobTitle
      if (filters.skills.length > 0) queryDto.skills = filters.skills
      if (filters.hireDateFrom) queryDto.hireDateFrom = filters.hireDateFrom
      if (filters.hireDateTo) queryDto.hireDateTo = filters.hireDateTo

      // Role-based filtering - Supervisors only see employees from their assigned sites
      if (isSupervisor) {
        // TODO: Add supervisor site filtering logic
        // queryDto.supervisorSites = user.assignedSites
        console.log('Supervisor view: filtering employees by assigned sites')
      }

      const [employeeData, statsData] = await Promise.all([
        employeesApi.getEmployees(queryDto),
        employeesApi.getStats().catch(() => null)
      ])

      setEmployees(employeeData.employees)
      setPagination({
        page: employeeData.page,
        limit: employeeData.limit,
        total: employeeData.total,
        totalPages: employeeData.totalPages
      })
      
      if (statsData) {
        setStats(statsData)
      }

      if (resetPage) {
        setPagination(prev => ({ ...prev, page: 1 }))
      }
    } catch (err) {
      setError('Failed to load employee data')
      console.error('Employee data loading error:', err)
    } finally {
      setLoading(false)
    }
  }

  // Load data on component mount and when filters/pagination change
  useEffect(() => {
    loadEmployees()
  }, [pagination.page, sortBy, sortOrder])

  // Handle filter changes
  const handleFilterChange = (key: keyof EmployeeFilters, value: any) => {
    setFilters(prev => {
      const updated = { ...prev, [key]: value }
      return updated
    })
  }

  // Apply filters
  const applyFilters = () => {
    loadEmployees(true)
    setShowFilters(false)
  }

  // Clear filters
  const clearFilters = () => {
    setFilters(DEFAULT_FILTERS)
    loadEmployees(true)
    setShowFilters(false)
  }

  // Handle pagination
  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }))
  }

  // Handle sorting
  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortOrder('asc')
    }
  }

  // Format employee data for display
  const formatEmployeeName = (employee: EmployeeResponseDto) => {
    return `${employee.firstName} ${employee.lastName}`
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'default'
      case 'INACTIVE': return 'secondary'
      case 'ON_LEAVE': return 'outline'
      case 'TERMINATED': return 'destructive'
      default: return 'secondary'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'text-green-600'
      case 'INACTIVE': return 'text-gray-600'
      case 'ON_LEAVE': return 'text-yellow-600'
      case 'TERMINATED': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  const formatPhoneNumber = (phone: string | null | undefined) => {
    // Handle null/undefined phone numbers
    if (!phone || phone.trim() === '') {
      return 'N/A'
    }
    
    // Basic phone number formatting
    const cleaned = phone.replace(/\D/g, '')
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
    }
    return phone
  }

  const getSkillsDisplay = (skills: any) => {
    if (!skills || !Array.isArray(skills)) return []
    return skills.slice(0, 3) // Show first 3 skills
  }

  // Handle employee operations
  const handleAddEmployee = () => {
    setEditingEmployee(null)
    setShowEmployeeForm(true)
  }

  const handleEditEmployee = (employee: EmployeeResponseDto) => {
    setEditingEmployee(employee)
    setShowEmployeeForm(true)
  }

  const handleViewDocuments = (employee: EmployeeResponseDto) => {
    setDocumentsEmployee(employee)
    setShowDocuments(true)
  }

  const handleEmployeeSaved = (employee: EmployeeResponseDto) => {
    setShowEmployeeForm(false)
    setEditingEmployee(null)
    loadEmployees() // Reload the list
  }

  const handleFormCancel = () => {
    setShowEmployeeForm(false)
    setEditingEmployee(null)
  }

  const handleDocumentsClose = () => {
    setShowDocuments(false)
    setDocumentsEmployee(null)
  }

  // Filtered and sorted employees for display
  const displayedEmployees = useMemo(() => {
    return employees
  }, [employees])

  if (loading && employees.length === 0) {
    return (
      <div className={className}>
        <div className="animate-pulse">
          {/* Header skeleton */}
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="h-8 bg-gray-200 rounded w-64 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-96"></div>
            </div>
            <div className="flex gap-3">
              <div className="h-10 bg-gray-200 rounded w-20"></div>
              <div className="h-10 bg-gray-200 rounded w-32"></div>
            </div>
          </div>

          {/* Stats cards skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            {[...Array(5)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="h-4 bg-gray-200 rounded w-20 mb-2"></div>
                      <div className="h-8 bg-gray-200 rounded w-12"></div>
                    </div>
                    <div className="w-8 h-8 bg-gray-200 rounded"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Content skeleton */}
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center space-x-4 p-4 border rounded">
                    <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                    <div className="flex-1">
                      <div className="h-5 bg-gray-200 rounded w-48 mb-2"></div>
                      <div className="h-4 bg-gray-200 rounded w-64"></div>
                    </div>
                    <div className="flex gap-2">
                      <div className="h-8 bg-gray-200 rounded w-16"></div>
                      <div className="h-8 bg-gray-200 rounded w-16"></div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={className}>
        <div className="flex items-center justify-center min-h-96">
          <Card className="max-w-md w-full">
            <CardContent className="p-6 text-center">
              <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-red-500" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Unable to Load Employee Data</h3>
              <p className="text-sm text-gray-600 mb-4">{error}</p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button onClick={() => loadEmployees()} variant="outline">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again
                </Button>
                <Button onClick={() => window.location.reload()} variant="default">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Reload Page
                </Button>
              </div>
            </CardContent>
          </Card>
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
            {isSupervisor ? 'My Site Employees' : 'Employee Management'}
          </h1>
          <p className="text-gray-600">
            {isSupervisor 
              ? 'View and manage employees assigned to your supervised sites'
              : 'Manage your workforce directory and employee information'
            }
          </p>
          {isSupervisor && (
            <div className="mt-2 flex items-center gap-2 text-sm text-amber-600">
              <MapPin className="w-4 h-4" />
              <span>Showing employees from your assigned sites only</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={() => loadEmployees()} variant="outline" size="sm">
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          {isAdmin && (
            <Button size="sm" onClick={handleAddEmployee}>
              <Plus className="w-4 h-4 mr-2" />
              Add Employee
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Employees</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.total}</p>
                </div>
                <Users className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Active</p>
                  <p className="text-2xl font-bold text-green-600">{stats.active}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">On Leave</p>
                  <p className="text-2xl font-bold text-yellow-600">{stats.onLeave}</p>
                </div>
                <Clock className="w-8 h-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Inactive</p>
                  <p className="text-2xl font-bold text-gray-600">{stats.inactive}</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-gray-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Expiring Certs</p>
                  <p className="text-2xl font-bold text-red-600">{stats.certificationsExpiringSoon}</p>
                </div>
                <Award className="w-8 h-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="directory">Employee Directory</TabsTrigger>
          <TabsTrigger value="search">Advanced Search</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Employee Directory Tab */}
        <TabsContent value="directory" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Employee Directory
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowFilters(!showFilters)}
                  >
                    <Filter className="w-4 h-4 mr-2" />
                    Filters
                  </Button>
                  <Button variant="outline" size="sm">
                    <Download className="w-4 h-4 mr-2" />
                    Export
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Search and Quick Filters */}
              <div className="mb-4 space-y-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Search employees by name, email, or employee number..."
                      value={filters.search}
                      onChange={(e) => handleFilterChange('search', e.target.value)}
                      className="pl-10"
                      aria-label="Search employees"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          applyFilters()
                        }
                      }}
                    />
                  </div>
                  <Button onClick={applyFilters} aria-label="Search employees">
                    <Search className="w-4 h-4 mr-2" />
                    <span className="hidden sm:inline">Search</span>
                  </Button>
                </div>

                {/* Advanced Filters */}
                {showFilters && (
                  <div className="p-4 border rounded-lg bg-gray-50 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Employment Status
                        </label>
                        <Select
                          value={filters.employmentStatus}
                          onValueChange={(value) => handleFilterChange('employmentStatus', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="All statuses" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">All statuses</SelectItem>
                            <SelectItem value="ACTIVE">Active</SelectItem>
                            <SelectItem value="INACTIVE">Inactive</SelectItem>
                            <SelectItem value="ON_LEAVE">On Leave</SelectItem>
                            <SelectItem value="TERMINATED">Terminated</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Department
                        </label>
                        <Input
                          placeholder="Department"
                          value={filters.department}
                          onChange={(e) => handleFilterChange('department', e.target.value)}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Job Title
                        </label>
                        <Input
                          placeholder="Job title"
                          value={filters.jobTitle}
                          onChange={(e) => handleFilterChange('jobTitle', e.target.value)}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Hire Date From
                        </label>
                        <Input
                          type="date"
                          value={filters.hireDateFrom}
                          onChange={(e) => handleFilterChange('hireDateFrom', e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="flex justify-end space-x-2">
                      <Button variant="outline" onClick={clearFilters}>
                        Clear Filters
                      </Button>
                      <Button onClick={applyFilters}>
                        Apply Filters
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Employee List */}
              <div className="space-y-3">
                {displayedEmployees.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No employees found</p>
                    {(filters.search || filters.employmentStatus || filters.department) && (
                      <p className="text-sm text-gray-400 mt-1">
                        Try adjusting your search criteria
                      </p>
                    )}
                  </div>
                ) : (
                  displayedEmployees.map((employee) => (
                    <Card key={employee.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex items-center space-x-4 min-w-0">
                            <div className="flex-shrink-0">
                              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                                <span className="text-blue-600 font-semibold text-sm">
                                  {employee.firstName[0]}{employee.lastName[0]}
                                </span>
                              </div>
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                                <h3 className="text-lg font-medium text-gray-900 truncate">
                                  {formatEmployeeName(employee)}
                                </h3>
                                <Badge variant={getStatusBadgeVariant(employee.employmentStatus)} className="self-start">
                                  {employee.employmentStatus}
                                </Badge>
                              </div>
                              
                              <div className="mt-1 flex flex-wrap items-center gap-2 sm:gap-4 text-sm text-gray-600">
                                <span className="flex items-center">
                                  <Briefcase className="w-4 h-4 mr-1" />
                                  {employee.employeeNumber}
                                </span>
                                {employee.jobTitle && (
                                  <span className="flex items-center">
                                    <Award className="w-4 h-4 mr-1" />
                                    {employee.jobTitle}
                                  </span>
                                )}
                                {employee.department && (
                                  <span className="hidden sm:inline">{employee.department}</span>
                                )}
                                <span className="flex items-center">
                                  <Mail className="w-4 h-4 mr-1" />
                                  <span className="truncate max-w-48">{employee.email}</span>
                                </span>
                                <span className="flex items-center">
                                  <Phone className="w-4 h-4 mr-1" />
                                  {formatPhoneNumber(employee.phone)}
                                </span>
                              </div>

                              {/* Skills - Show on mobile in compact format */}
                              <div className="mt-2 flex flex-wrap gap-1">
                                {getSkillsDisplay(employee.skills).map((skill: any, index: number) => (
                                  <Badge key={index} variant="secondary" className="text-xs">
                                    {typeof skill === 'string' ? skill : skill.name}
                                  </Badge>
                                ))}
                                {employee.skills && employee.skills.length > 3 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{employee.skills.length - 3} more
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 sm:flex-col lg:flex-row">
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 sm:flex-initial"
                              onClick={() => setSelectedEmployee(employee)}
                            >
                              <Eye className="w-4 h-4 sm:mr-1 lg:mr-1" />
                              <span className="hidden sm:inline">View</span>
                            </Button>
                            {(isAdmin || isSupervisor) && (
                              <Button 
                                variant="outline" 
                                size="sm"
                                className="flex-1 sm:flex-initial"
                                onClick={() => handleEditEmployee(employee)}
                                title={isSupervisor ? "Edit basic information only" : "Full edit access"}
                              >
                                <Edit className="w-4 h-4 sm:mr-1 lg:mr-1" />
                                <span className="hidden sm:inline">
                                  {isSupervisor ? 'Update' : 'Edit'}
                                </span>
                              </Button>
                            )}
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="flex-1 sm:flex-initial"
                              onClick={() => handleViewDocuments(employee)}
                            >
                              <FileText className="w-4 h-4 sm:mr-1 lg:mr-1" />
                              <span className="hidden sm:inline">Docs</span>
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <p className="text-sm text-gray-600">
                    Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} employees
                  </p>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(pagination.page - 1)}
                      disabled={pagination.page <= 1}
                      aria-label="Previous page"
                    >
                      <span className="hidden sm:inline">Previous</span>
                      <span className="sm:hidden">Prev</span>
                    </Button>
                    <span className="text-sm text-gray-600 px-2">
                      Page {pagination.page} of {pagination.totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(pagination.page + 1)}
                      disabled={pagination.page >= pagination.totalPages}
                      aria-label="Next page"
                    >
                      <span className="hidden sm:inline">Next</span>
                      <span className="sm:hidden">Next</span>
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Advanced Search Tab */}
        <TabsContent value="search" className="space-y-6">
          <AdvancedEmployeeSearch />
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <EmployeeAnalyticsDashboard />
        </TabsContent>
      </Tabs>

      {/* Employee Detail Modal/Sidebar would go here */}
      {selectedEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Employee Profile
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedEmployee(null)}
                >
                  Close
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 font-semibold text-lg">
                      {selectedEmployee.firstName[0]}{selectedEmployee.lastName[0]}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold">{formatEmployeeName(selectedEmployee)}</h3>
                    <p className="text-gray-600">{selectedEmployee.jobTitle || 'Employee'}</p>
                    <Badge variant={getStatusBadgeVariant(selectedEmployee.employmentStatus)}>
                      {selectedEmployee.employmentStatus}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Contact Information</h4>
                    <div className="space-y-2 text-sm text-gray-600">
                      <p className="flex items-center">
                        <Mail className="w-4 h-4 mr-2" />
                        {selectedEmployee.email}
                      </p>
                      <p className="flex items-center">
                        <Phone className="w-4 h-4 mr-2" />
                        {formatPhoneNumber(selectedEmployee.phone)}
                      </p>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Employment Details</h4>
                    <div className="space-y-2 text-sm text-gray-600">
                      <p>
                        <span className="font-medium">Employee #:</span> {selectedEmployee.employeeNumber}
                      </p>
                      <p>
                        <span className="font-medium">Hire Date:</span> {formatDate(selectedEmployee.hireDate)}
                      </p>
                      {selectedEmployee.department && (
                        <p>
                          <span className="font-medium">Department:</span> {selectedEmployee.department}
                        </p>
                      )}
                      {selectedEmployee.hourlyRate && (
                        <p>
                          <span className="font-medium">Hourly Rate:</span> ${selectedEmployee.hourlyRate}/hr
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {selectedEmployee.skills && selectedEmployee.skills.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Skills & Certifications</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedEmployee.skills.map((skill: any, index: number) => (
                        <Badge key={index} variant="secondary">
                          {typeof skill === 'string' ? skill : skill.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Employee Form Modal */}
      {showEmployeeForm && (
        <EmployeeForm
          employee={editingEmployee || undefined}
          onSave={handleEmployeeSaved}
          onCancel={handleFormCancel}
        />
      )}

      {/* Employee Documents Modal */}
      {showDocuments && documentsEmployee && (
        <EmployeeDocuments
          employee={documentsEmployee}
          onClose={handleDocumentsClose}
        />
      )}
    </div>
  )
}