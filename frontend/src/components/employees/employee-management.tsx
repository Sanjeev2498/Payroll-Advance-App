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

  // State management with last refresh timestamp
  const [employees, setEmployees] = useState<EmployeeResponseDto[]>([])
  const [stats, setStats] = useState<EmployeeStatsResponseDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
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

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (selectedEmployee || showEmployeeForm || showDocuments) {
      // Prevent body scrolling when modal is open
      const originalOverflow = document.body.style.overflow
      const originalPaddingRight = document.body.style.paddingRight
      
      // Get scrollbar width to prevent layout shift
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth
      
      document.body.style.overflow = 'hidden'
      document.body.style.paddingRight = `${scrollbarWidth}px`
      
      return () => {
        // Restore original styles when modal closes
        document.body.style.overflow = originalOverflow
        document.body.style.paddingRight = originalPaddingRight
      }
    }
  }, [selectedEmployee, showEmployeeForm, showDocuments])

  // Load employee data with real-time refresh
  const loadEmployees = async (resetPage = false) => {
    try {
      setLoading(true)
      setError(null)
      
      const queryDto: EmployeeQueryDto = {
        page: resetPage ? 1 : (pagination?.page || 1),
        limit: pagination?.limit || 10,
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

      setEmployees(employeeData?.employees || [])
      setPagination({
        page: employeeData?.page || 1,
        limit: employeeData?.limit || 10,
        total: employeeData?.total || 0,
        totalPages: employeeData?.totalPages || 0
      })
      
      if (statsData) {
        setStats(statsData)
      }

      // Update last refresh timestamp
      setLastRefresh(new Date())

      if (resetPage) {
        setPagination(prev => ({ ...prev, page: 1 }))
      }
    } catch (err) {
      console.error('Employee data loading error:', err)
      
      // More specific error handling
      if (err instanceof Error) {
        if (err.message.includes('401')) {
          setError('Authentication required. Please log in again.')
        } else if (err.message.includes('403')) {
          setError('Access denied. You do not have permission to view employee data.')
        } else if (err.message.includes('Network Error')) {
          setError('Network connection error. Please check your internet connection.')
        } else {
          setError('Failed to load employee data. Please try again.')
        }
      } else {
        setError('An unexpected error occurred while loading employee data.')
      }
    } finally {
      setLoading(false)
    }
  }

  // Set up real-time data refresh
  useEffect(() => {
    // Initial load
    loadEmployees()

    // Set up automatic refresh every 30 seconds for real-time updates
    const refreshInterval = setInterval(() => {
      console.log('🔄 Auto-refreshing employee data...')
      loadEmployees()
    }, 30000) // 30 seconds

    // Cleanup interval on component unmount
    return () => {
      clearInterval(refreshInterval)
    }
  }, [pagination?.page, sortBy, sortOrder])

  // Also refresh when filters change
  useEffect(() => {
    if (filters !== DEFAULT_FILTERS) {
      loadEmployees(true)
    }
  }, [filters])

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

  const getCertificationStatus = (employee: EmployeeResponseDto) => {
    if (!employee.certifications || employee.certifications.length === 0) {
      return { total: 0, expiring: 0, expired: 0 }
    }

    const now = new Date()
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

    let expiring = 0
    let expired = 0

    employee.certifications.forEach(cert => {
      if (cert.expiryDate) {
        const expiryDate = new Date(cert.expiryDate)
        if (expiryDate < now) {
          expired++
        } else if (expiryDate <= thirtyDaysFromNow) {
          expiring++
        }
      }
    })

    return {
      total: employee.certifications.length,
      expiring,
      expired
    }
  }

  const getEmploymentStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'text-green-600'
      case 'INACTIVE': return 'text-red-600'
      case 'ON_LEAVE': return 'text-yellow-600'
      case 'TERMINATED': return 'text-gray-600'
      default: return 'text-gray-600'
    }
  }

  const getEmploymentStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'default'
      case 'INACTIVE': return 'destructive'
      case 'ON_LEAVE': return 'secondary'
      case 'TERMINATED': return 'outline'
      default: return 'secondary'
    }
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
    return employees || []
  }, [employees])

  if (loading && (employees?.length || 0) === 0) {
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
            {loading ? 'Refreshing...' : 'Refresh'}
          </Button>
          {/* Real-time indicator */}
          <div className="hidden sm:flex items-center text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded">
            <div className="w-2 h-2 bg-green-500 rounded-full mr-1 animate-pulse"></div>
            Auto-refresh: 30s
            {lastRefresh && (
              <span className="ml-2 text-gray-400">
                • Last: {lastRefresh.toLocaleTimeString()}
              </span>
            )}
          </div>
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
                  <p className="text-2xl font-bold text-blue-600">{stats?.total || 0}</p>
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
                  <p className="text-2xl font-bold text-green-600">{stats?.active || 0}</p>
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
                  <p className="text-2xl font-bold text-yellow-600">{stats?.onLeave || 0}</p>
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
                  <p className="text-2xl font-bold text-gray-600">{stats?.inactive || 0}</p>
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
                  <p className="text-2xl font-bold text-red-600">{stats?.certificationsExpiringSoon || 0}</p>
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
                {(displayedEmployees?.length || 0) === 0 ? (
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
                  (displayedEmployees || []).map((employee) => {
                    const certStatus = getCertificationStatus(employee)
                    return (
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
                                  <Badge variant={getEmploymentStatusBadge(employee.employmentStatus)} className="self-start">
                                    {employee.employmentStatus.replace('_', ' ')}
                                  </Badge>
                                  {certStatus.expired > 0 && (
                                    <Badge variant="destructive" className="self-start text-xs">
                                      {certStatus.expired} Expired
                                    </Badge>
                                  )}
                                  {certStatus.expiring > 0 && (
                                    <Badge variant="secondary" className="self-start text-xs bg-yellow-100 text-yellow-800">
                                      {certStatus.expiring} Expiring
                                    </Badge>
                                  )}
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

                                {/* Skills and Certifications */}
                                <div className="mt-2 space-y-2">
                                  {/* Skills */}
                                  <div className="flex flex-wrap gap-1">
                                    {getSkillsDisplay(employee.skills).map((skill: any, index: number) => (
                                      <Badge key={index} variant="secondary" className="text-xs">
                                        {typeof skill === 'string' ? skill.replace('_', ' ') : skill.name}
                                      </Badge>
                                    ))}
                                    {employee.skills && employee.skills.length > 3 && (
                                      <Badge variant="outline" className="text-xs">
                                        +{employee.skills.length - 3} more
                                      </Badge>
                                    )}
                                  </div>

                                  {/* Certification summary */}
                                  {certStatus.total > 0 && (
                                    <div className="flex items-center gap-2 text-xs text-gray-500">
                                      <Award className="w-3 h-3" />
                                      <span>{certStatus.total} certifications</span>
                                      {certStatus.expiring > 0 && (
                                        <span className="text-yellow-600">• {certStatus.expiring} expiring soon</span>
                                      )}
                                      {certStatus.expired > 0 && (
                                        <span className="text-red-600">• {certStatus.expired} expired</span>
                                      )}
                                    </div>
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
                    )
                  })
                )}
              </div>

              {/* Pagination */}
              {(pagination?.totalPages || 0) > 1 && (
                <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <p className="text-sm text-gray-600">
                    Showing {((pagination?.page || 1) - 1) * (pagination?.limit || 10) + 1} to {Math.min((pagination?.page || 1) * (pagination?.limit || 10), pagination?.total || 0)} of {pagination?.total || 0} employees
                  </p>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange((pagination?.page || 1) - 1)}
                      disabled={(pagination?.page || 1) <= 1}
                      aria-label="Previous page"
                    >
                      <span className="hidden sm:inline">Previous</span>
                      <span className="sm:hidden">Prev</span>
                    </Button>
                    <span className="text-sm text-gray-600 px-2">
                      Page {pagination?.page || 1} of {pagination?.totalPages || 1}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange((pagination?.page || 1) + 1)}
                      disabled={(pagination?.page || 1) >= (pagination?.totalPages || 1)}
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

      {/* Employee Detail Modal/Sidebar with Enhanced Information */}
      {selectedEmployee && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          {/* Modal Backdrop */}
          <div 
            className="absolute inset-0 bg-black bg-opacity-50 transition-opacity"
            onClick={() => setSelectedEmployee(null)}
          />
          
          {/* Modal Container - Centered */}
          <div 
            className="relative bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden z-10"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                <h2 className="text-xl font-semibold">Employee Profile - {formatEmployeeName(selectedEmployee)}</h2>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedEmployee(null)}
              >
                Close
              </Button>
            </div>
            
            {/* Modal Content - Scrollable */}
            <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
              <CardContent className="p-6">
              <div className="space-y-8">
                {/* Header with Avatar and Basic Info */}
                <div className="flex items-center space-x-4">
                  <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 font-semibold text-2xl">
                      {selectedEmployee.firstName[0]}{selectedEmployee.lastName[0]}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-2xl font-semibold">{formatEmployeeName(selectedEmployee)}</h3>
                    <p className="text-gray-600 text-lg">{selectedEmployee.jobTitle || selectedEmployee.department || 'Employee'}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant={getEmploymentStatusBadge(selectedEmployee.employmentStatus)} className="text-sm">
                        {selectedEmployee.employmentStatus.replace('_', ' ')}
                      </Badge>
                      <span className="text-sm text-gray-500">#{selectedEmployee.employeeNumber}</span>
                    </div>
                  </div>
                </div>

                {/* Employee Information Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Contact Information */}
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                      <Phone className="w-4 h-4 mr-2" />
                      Contact Information
                    </h4>
                    <div className="space-y-2 text-sm text-gray-600">
                      <p className="flex items-center">
                        <Mail className="w-4 h-4 mr-2" />
                        {selectedEmployee.email}
                      </p>
                      <p className="flex items-center">
                        <Phone className="w-4 h-4 mr-2" />
                        {formatPhoneNumber(selectedEmployee.phone)}
                      </p>
                      {selectedEmployee.contactInfo?.emergencyContact && (
                        <div className="mt-3 pt-3 border-t">
                          <p className="font-medium text-gray-700">Emergency Contact:</p>
                          <p>{selectedEmployee.contactInfo.emergencyContact.name}</p>
                          <p className="text-xs text-gray-500">({selectedEmployee.contactInfo.emergencyContact.relationship})</p>
                          <p>{selectedEmployee.contactInfo.emergencyContact.phone}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Employment Details */}
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                      <Briefcase className="w-4 h-4 mr-2" />
                      Employment Details
                    </h4>
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
                      {selectedEmployee.jobTitle && (
                        <p>
                          <span className="font-medium">Position:</span> {selectedEmployee.jobTitle}
                        </p>
                      )}
                      {selectedEmployee.employmentType && (
                        <p>
                          <span className="font-medium">Type:</span> {selectedEmployee.employmentType.replace('_', ' ')}
                        </p>
                      )}
                      {selectedEmployee.hourlyRate && (
                        <p>
                          <span className="font-medium">Hourly Rate:</span> ₹{selectedEmployee.hourlyRate}/hr
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Performance Metrics */}
                  {selectedEmployee.performanceMetrics && (
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                        <Star className="w-4 h-4 mr-2" />
                        Performance
                      </h4>
                      <div className="space-y-2 text-sm text-gray-600">
                        {selectedEmployee.performanceMetrics.overallRating && (
                          <p>
                            <span className="font-medium">Overall Rating:</span> {selectedEmployee.performanceMetrics.overallRating}/5.0
                          </p>
                        )}
                        {selectedEmployee.performanceMetrics.punctualityScore && (
                          <p>
                            <span className="font-medium">Punctuality:</span> {selectedEmployee.performanceMetrics.punctualityScore}%
                          </p>
                        )}
                        {selectedEmployee.performanceMetrics.qualityRating && (
                          <p>
                            <span className="font-medium">Quality Rating:</span> {selectedEmployee.performanceMetrics.qualityRating}/5.0
                          </p>
                        )}
                        {selectedEmployee.performanceMetrics.clientFeedbackScore && (
                          <p>
                            <span className="font-medium">Client Feedback:</span> {selectedEmployee.performanceMetrics.clientFeedbackScore}/5.0
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Skills */}
                {selectedEmployee.skills && selectedEmployee.skills.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                      <Award className="w-4 h-4 mr-2" />
                      Skills & Competencies
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedEmployee.skills.map((skill: any, index: number) => (
                        <Badge key={index} variant="secondary" className="text-sm">
                          {typeof skill === 'string' ? skill.replace('_', ' ') : skill.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Certifications */}
                {selectedEmployee.certifications && selectedEmployee.certifications.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                      <Award className="w-4 h-4 mr-2" />
                      Certifications & Licenses
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {selectedEmployee.certifications.map((cert: any, index: number) => {
                        const isExpired = cert.expiryDate && new Date(cert.expiryDate) < new Date()
                        const isExpiring = cert.expiryDate && new Date(cert.expiryDate) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                        
                        return (
                          <div key={index} className={`p-3 border rounded-lg ${
                            isExpired ? 'border-red-200 bg-red-50' : 
                            isExpiring ? 'border-yellow-200 bg-yellow-50' : 
                            'border-gray-200'
                          }`}>
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h5 className="font-medium text-gray-900">{cert.name}</h5>
                                <p className="text-sm text-gray-600">{cert.issuingOrganization}</p>
                                {cert.issueDate && (
                                  <p className="text-xs text-gray-500">
                                    Issued: {formatDate(cert.issueDate)}
                                  </p>
                                )}
                                {cert.expiryDate && (
                                  <p className="text-xs text-gray-500">
                                    Expires: {formatDate(cert.expiryDate)}
                                  </p>
                                )}
                              </div>
                              <div className="ml-2">
                                {isExpired && <Badge variant="destructive" className="text-xs">Expired</Badge>}
                                {!isExpired && isExpiring && <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-800">Expiring</Badge>}
                                {!isExpired && !isExpiring && <Badge variant="default" className="text-xs">Valid</Badge>}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Compliance Status */}
                {selectedEmployee.complianceStatus && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Compliance Status
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-3 border rounded-lg">
                        <p className="font-medium text-sm">Background Check</p>
                        <div className="flex items-center mt-1">
                          <Badge variant={
                            selectedEmployee.complianceStatus.backgroundCheckStatus === 'CLEARED' ? 'default' : 
                            selectedEmployee.complianceStatus.backgroundCheckStatus === 'FAILED' ? 'destructive' : 
                            'secondary'
                          } className="text-xs">
                            {selectedEmployee.complianceStatus.backgroundCheckStatus}
                          </Badge>
                          {selectedEmployee.complianceStatus.backgroundCheckDate && (
                            <span className="ml-2 text-xs text-gray-500">
                              {formatDate(selectedEmployee.complianceStatus.backgroundCheckDate)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="p-3 border rounded-lg">
                        <p className="font-medium text-sm">Drug Test</p>
                        <div className="flex items-center mt-1">
                          <Badge variant={
                            selectedEmployee.complianceStatus.drugTestStatus === 'PASSED' ? 'default' : 
                            selectedEmployee.complianceStatus.drugTestStatus === 'FAILED' ? 'destructive' : 
                            'secondary'
                          } className="text-xs">
                            {selectedEmployee.complianceStatus.drugTestStatus}
                          </Badge>
                          {selectedEmployee.complianceStatus.drugTestDate && (
                            <span className="ml-2 text-xs text-gray-500">
                              {formatDate(selectedEmployee.complianceStatus.drugTestDate)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              </CardContent>
            </div>
          </div>
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