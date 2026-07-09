'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { 
  Users, 
  MapPin, 
  Plus, 
  Search, 
  Filter, 
  AlertTriangle, 
  CheckCircle,
  Calendar,
  Clock,
  DollarSign,
  Settings,
  Zap,
  Eye,
  Edit,
  Trash2,
  Move,
  Target,
  Activity,
  TrendingUp,
  RefreshCw,
  History,
  ChevronRight,
  ChevronDown,
  Globe,
  Shield,
  Award,
  Star,
  Navigation,
  FileText,
  Save,
  X
} from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { assignmentsApi, AssignmentFilters, CreateAssignmentRequest, UpdateAssignmentRequest } from '@/lib/api/assignments'
import { sitesApi } from '@/lib/api/sites'
import { employeesApi } from '@/lib/api/employees'
import { queryKeys } from '@/lib/api'
import { Assignment, Employee, Site } from '@/types'
import { toast } from 'sonner'
import AssignmentBoard from '@/components/assignments/assignment-board'
import EnhancedAssignmentBoard from '@/components/assignments/enhanced-assignment-board'
import AssignmentRecommendations from '@/components/assignments/assignment-recommendations'
import ConflictDetection from '@/components/assignments/conflict-detection'

// Drag and Drop Data Transfer Types
interface DragData {
  type: 'employee' | 'assignment' | 'site-requirement'
  id: string
  data: Employee | Assignment | SiteRequirement
}

interface SiteRequirement {
  id: string
  siteId: string
  siteName: string
  role: string
  requiredCount: number
  assignedCount: number
  shift: {
    startTime: string
    endTime: string
    date: string
  }
  skillRequirements: string[]
  urgency: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'
}

interface AssignmentFormData {
  employeeId: string
  siteId: string
  role: string
  hourlyRate: number
  startDate: string
  endDate?: string
  shiftPatterns: Array<{
    dayOfWeek: number
    startTime: string
    endTime: string
    breakDuration?: number
  }>
  responsibilities: string[]
  requiredSkills: string[]
  notes: string
}

export default function AssignmentsPage() {
  const [activeTab, setActiveTab] = useState('board')
  const [filters, setFilters] = useState<AssignmentFilters>({
    page: 1,
    limit: 20,
    sortBy: 'startDate',
    sortOrder: 'desc'
  })
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<string>('')
  const [showRecommendations, setShowRecommendations] = useState(false)
  const [recommendationParams, setRecommendationParams] = useState({ siteId: '', role: '' })
  
  // Drag and Drop State
  const [draggedItem, setDraggedItem] = useState<DragData | null>(null)
  const [dropTarget, setDropTarget] = useState<string | null>(null)
  const [draggedOver, setDraggedOver] = useState<string | null>(null)
  
  // Assignment Form State
  const [showAssignmentForm, setShowAssignmentForm] = useState(false)
  const [assignmentFormData, setAssignmentFormData] = useState<AssignmentFormData>({
    employeeId: '',
    siteId: '',
    role: '',
    hourlyRate: 25,
    startDate: new Date().toISOString().split('T')[0],
    shiftPatterns: [{
      dayOfWeek: 1,
      startTime: '09:00',
      endTime: '17:00'
    }],
    responsibilities: [],
    requiredSkills: [],
    notes: ''
  })
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null)
  
  // Detail Views
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null)
  const [showAssignmentHistory, setShowAssignmentHistory] = useState(false)
  const [selectedEmployeeForHistory, setSelectedEmployeeForHistory] = useState<string>('')
  
  // Real-time updates
  const [lastUpdateTime, setLastUpdateTime] = useState(new Date())
  const [autoRefresh, setAutoRefresh] = useState(true)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const queryClient = useQueryClient()

  // Fetch assignments data
  const {
    data: assignmentsData,
    isLoading: assignmentsLoading,
    error: assignmentsError,
    refetch: refetchAssignments
  } = useQuery({
    queryKey: [...queryKeys.assignments(), filters],
    queryFn: () => assignmentsApi.getAssignments(filters),
    placeholderData: (previousData) => previousData,
    refetchInterval: autoRefresh ? 30000 : false, // Auto-refresh every 30 seconds
    refetchIntervalInBackground: true
  })

  // Fetch sites data for drag and drop board
  const {
    data: sitesData,
    isLoading: sitesLoading
  } = useQuery({
    queryKey: ['sites'],
    queryFn: () => sitesApi.getSites(),
    placeholderData: (previousData) => previousData
  })

  // Fetch employees data for assignments
  const {
    data: employeesData,
    isLoading: employeesLoading
  } = useQuery({
    queryKey: ['employees', 'available'],
    queryFn: () => employeesApi.getEmployees({ employmentStatus: 'ACTIVE', limit: 100 }),
    placeholderData: (previousData) => previousData
  })

  // Fetch assignment statistics
  const { 
    data: stats,
    isLoading: statsLoading
  } = useQuery({
    queryKey: [...queryKeys.assignments(), 'stats'],
    queryFn: () => assignmentsApi.getAssignmentStats()
  })

  const assignments = assignmentsData?.assignments || []
  const sites = sitesData?.sites || []
  const employees = employeesData?.employees || []

  // Auto-refresh setup
  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(() => {
        refetchAssignments()
        setLastUpdateTime(new Date())
      }, 30000)
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [autoRefresh, refetchAssignments])

  // Create Assignment Mutation
  const createAssignmentMutation = useMutation({
    mutationFn: (data: CreateAssignmentRequest) => assignmentsApi.createAssignment(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.assignments() })
      setShowAssignmentForm(false)
      setAssignmentFormData({
        employeeId: '',
        siteId: '',
        role: '',
        hourlyRate: 25,
        startDate: new Date().toISOString().split('T')[0],
        shiftPatterns: [{
          dayOfWeek: 1,
          startTime: '09:00',
          endTime: '17:00'
        }],
        responsibilities: [],
        requiredSkills: [],
        notes: ''
      })
      toast.success('Assignment created successfully')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create assignment')
    }
  })

  // Update Assignment Mutation
  const updateAssignmentMutation = useMutation({
    mutationFn: ({ id, data }: { id: string, data: UpdateAssignmentRequest }) => 
      assignmentsApi.updateAssignment(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.assignments() })
      setEditingAssignment(null)
      toast.success('Assignment updated successfully')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update assignment')
    }
  })

  // Cancel Assignment Mutation
  const cancelAssignmentMutation = useMutation({
    mutationFn: (id: string) => assignmentsApi.cancelAssignment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.assignments() })
      toast.success('Assignment cancelled successfully')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to cancel assignment')
    }
  })

  const handleFilterChange = (key: keyof AssignmentFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: 1 // Reset to first page when filters change
    }))
  }

  const handleSearch = () => {
    handleFilterChange('search', searchTerm)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'bg-green-100 text-green-800'
      case 'INACTIVE': return 'bg-gray-100 text-gray-800'
      case 'COMPLETED': return 'bg-blue-100 text-blue-800'
      case 'CANCELLED': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'URGENT': return 'bg-red-500 text-white'
      case 'HIGH': return 'bg-orange-500 text-white'
      case 'NORMAL': return 'bg-blue-500 text-white'
      case 'LOW': return 'bg-gray-500 text-white'
      default: return 'bg-gray-500 text-white'
    }
  }

  // Drag and Drop Handlers
  const handleDragStart = useCallback((e: React.DragEvent, item: DragData) => {
    setDraggedItem(item)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('application/json', JSON.stringify(item))
    
    // Add visual feedback
    const dragElement = e.target as HTMLElement
    dragElement.style.opacity = '0.5'
  }, [])

  const handleDragEnd = useCallback((e: React.DragEvent) => {
    setDraggedItem(null)
    setDropTarget(null)
    setDraggedOver(null)
    
    // Reset visual feedback
    const dragElement = e.target as HTMLElement
    dragElement.style.opacity = '1'
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent, targetId: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDraggedOver(targetId)
  }, [])

  const handleDragLeave = useCallback(() => {
    setDraggedOver(null)
  }, [])

  // Enhanced drop handler for EnhancedAssignmentBoard
  const handleEnhancedDrop = useCallback(async (dragData: any, targetType: 'site' | 'unassigned', targetId?: string) => {
    try {
      if (dragData.type === 'employee' && targetType === 'site' && targetId) {
        // Assign employee to site
        const employee = dragData.data as Employee
        const targetSite = sites.find(s => s.id === targetId)
        
        if (!targetSite) {
          toast.error('Target site not found')
          return
        }

        // Open assignment form with pre-filled data
        setAssignmentFormData(prev => ({
          ...prev,
          employeeId: employee.id,
          siteId: targetId,
          role: 'Security Guard', // Default role
        }))
        setShowAssignmentForm(true)
        
      } else if (dragData.type === 'assignment') {
        // Move assignment between sites or unassign
        const assignment = dragData.data as Assignment
        
        if (targetType === 'site' && targetId && targetId !== assignment.siteId) {
          // Cannot move assignment to different site directly
          // This would require canceling current and creating new
          toast.error("Assignments cannot be moved between sites. Please cancel this assignment and create a new one.")
          return
          
        } else if (targetType === 'unassigned') {
          // Unassign from site (set to inactive)
          await updateAssignmentMutation.mutateAsync({
            id: assignment.id,
            data: { status: 'INACTIVE' }
          })
        }
      }
      
    } catch (error) {
      console.error('Drop error:', error)
      toast.error('Failed to process assignment change')
    }
  }, [sites, updateAssignmentMutation])

  const handleCreateAssignment = async () => {
    if (!assignmentFormData.employeeId || !assignmentFormData.siteId || !assignmentFormData.role) {
      toast.error('Please fill in all required fields')
      return
    }

    const createData: CreateAssignmentRequest = {
      employeeId: assignmentFormData.employeeId,
      siteId: assignmentFormData.siteId,
      role: assignmentFormData.role,
      hourlyRate: assignmentFormData.hourlyRate,
      startDate: assignmentFormData.startDate,
      endDate: assignmentFormData.endDate,
      shiftPatterns: assignmentFormData.shiftPatterns,
      responsibilities: assignmentFormData.responsibilities.map(r => ({
        name: r,
        description: r,
        priority: 1
      })),
      requiredSkills: assignmentFormData.requiredSkills,
      notes: assignmentFormData.notes
    }

    await createAssignmentMutation.mutateAsync(createData)
  }

  const handleUpdateAssignment = async (assignment: Assignment) => {
    if (!editingAssignment) return

    const updateData: UpdateAssignmentRequest = {
      role: assignmentFormData.role,
      hourlyRate: assignmentFormData.hourlyRate,
      startDate: assignmentFormData.startDate,
      endDate: assignmentFormData.endDate,
      shiftPatterns: assignmentFormData.shiftPatterns,
      responsibilities: assignmentFormData.responsibilities.map(r => ({
        name: r,
        description: r,
        priority: 1
      })),
      requiredSkills: assignmentFormData.requiredSkills,
      notes: assignmentFormData.notes
    }

    await updateAssignmentMutation.mutateAsync({
      id: assignment.id,
      data: updateData
    })
  }

  const openEditForm = (assignment: Assignment) => {
    setEditingAssignment(assignment)
    setAssignmentFormData({
      employeeId: assignment.employeeId,
      siteId: assignment.siteId,
      role: assignment.role,
      hourlyRate: assignment.hourlyRate,
      startDate: assignment.startDate.split('T')[0],
      endDate: assignment.endDate?.split('T')[0],
      shiftPatterns: (assignment as any).metadata?.shiftPatterns || [{
        dayOfWeek: 1,
        startTime: '09:00',
        endTime: '17:00'
      }],
      responsibilities: (assignment as any).responsibilities?.map((r: any) => r.name || r) || [],
      requiredSkills: (assignment as any).metadata?.requiredSkills || [],
      notes: (assignment as any).notes || ''
    })
    setShowAssignmentForm(true)
  }

  const generateSiteRequirements = (): SiteRequirement[] => {
    // Mock data for site requirements - in real app this would come from API
    return sites.slice(0, 6).map((site, index) => ({
      id: `req-${site.id}`,
      siteId: site.id,
      siteName: site.name,
      role: ['Security Guard', 'Supervisor', 'Reception'][index % 3],
      requiredCount: [2, 1, 3][index % 3],
      assignedCount: assignments.filter(a => a.siteId === site.id && a.status === 'ACTIVE').length,
      shift: {
        startTime: '08:00',
        endTime: '20:00',
        date: new Date().toISOString().split('T')[0]
      },
      skillRequirements: [
        ['Security Certification', 'First Aid'],
        ['Leadership', 'Security Certification'],
        ['Customer Service', 'Computer Skills']
      ][index % 3],
      urgency: (['LOW', 'NORMAL', 'HIGH', 'URGENT'] as const)[index % 4]
    }))
  }

  const siteRequirements = generateSiteRequirements()

  return (
    <div className="space-y-6">
      {/* Header with Real-time Status */}
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold tracking-tight">Assignment Management</h1>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${autoRefresh ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
              <span className="text-sm text-muted-foreground">
                {autoRefresh ? 'Live Updates' : 'Manual Refresh'}
              </span>
            </div>
          </div>
          <p className="text-muted-foreground">
            Comprehensive workforce assignment management with drag & drop, conflict detection, and real-time tracking.
          </p>
          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
            <span>Last updated: {lastUpdateTime.toLocaleTimeString()}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
              className="h-6 px-2"
            >
              <Activity className="w-3 h-3 mr-1" />
              {autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refetchAssignments()}
              className="h-6 px-2"
            >
              <RefreshCw className="w-3 h-3 mr-1" />
              Refresh Now
            </Button>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowAssignmentForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Assignment
          </Button>
          <Button 
            variant="outline"
            onClick={() => {
              setRecommendationParams({ siteId: '', role: 'Security Guard' })
              setShowRecommendations(true)
            }}
          >
            <Target className="w-4 h-4 mr-2" />
            Get Recommendations
          </Button>
          <Button 
            variant="outline"
            onClick={() => setShowAssignmentHistory(true)}
          >
            <History className="w-4 h-4 mr-2" />
            Assignment History
          </Button>
        </div>
      </div>

      {/* Enhanced Statistics Cards with Real-time Data */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Assignments</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-xs text-muted-foreground">
                    {stats.uniqueEmployees} employees • {stats.uniqueSites} sites
                  </p>
                </div>
                <Users className="w-5 h-5 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Active Now</p>
                  <p className="text-2xl font-bold text-green-600">{stats.active}</p>
                  <p className="text-xs text-green-600">
                    +{Math.round(((stats.active / stats.total) * 100))}% of total
                  </p>
                </div>
                <CheckCircle className="w-5 h-5 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Conflicts</p>
                  <p className="text-2xl font-bold text-red-600">{stats.conflicted || 0}</p>
                  <p className="text-xs text-red-600">
                    Require attention
                  </p>
                </div>
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Avg Rate</p>
                  <p className="text-2xl font-bold">${stats.averageHourlyRate?.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">
                    Per hour
                  </p>
                </div>
                <DollarSign className="w-5 h-5 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Skill Match</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.averageSkillMatchScore || 85}%</p>
                  <p className="text-xs text-blue-600">
                    Average compatibility
                  </p>
                </div>
                <Award className="w-5 h-5 text-blue-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Search & Filter</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search by employee name, site name, or role..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>
            </div>
            <Button onClick={handleSearch}>
              <Search className="w-4 h-4 mr-2" />
              Search
            </Button>
          </div>
          
          <div className="flex gap-4 flex-wrap">
            <Select value={selectedStatus} onValueChange={(value) => {
              setSelectedStatus(value)
              handleFilterChange('status', value || undefined)
            }}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Statuses</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="INACTIVE">Inactive</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>

            <Select onValueChange={(value) => handleFilterChange('sortBy', value)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="startDate">Start Date</SelectItem>
                <SelectItem value="hourlyRate">Hourly Rate</SelectItem>
                <SelectItem value="role">Role</SelectItem>
                <SelectItem value="status">Status</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline">
              <Filter className="w-4 h-4 mr-2" />
              More Filters
            </Button>
          </div>
        </CardContent>
      </Card>
      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="board">
            <Move className="w-4 h-4 mr-2" />
            Assignment Board
          </TabsTrigger>
          <TabsTrigger value="requirements">
            <Target className="w-4 h-4 mr-2" />
            Site Requirements
          </TabsTrigger>
          <TabsTrigger value="list">
            <FileText className="w-4 h-4 mr-2" />
            List View
          </TabsTrigger>
          <TabsTrigger value="conflicts">
            <AlertTriangle className="w-4 h-4 mr-2" />
            Conflicts
          </TabsTrigger>
          <TabsTrigger value="analytics">
            <TrendingUp className="w-4 h-4 mr-2" />
            Analytics
          </TabsTrigger>
        </TabsList>

        {/* Assignment Board - Enhanced Drag & Drop Interface */}
        <TabsContent value="board">
          <EnhancedAssignmentBoard
            assignments={assignments}
            employees={employees as unknown as Employee[]}
            sites={sites}
            onDrop={handleEnhancedDrop}
            onEditAssignment={openEditForm}
            onViewAssignment={(assignment) => setSelectedAssignment(assignment)}
            onCreateAssignment={(employeeId, siteId, role) => {
              setAssignmentFormData(prev => ({
                ...prev,
                employeeId,
                siteId,
                role: role || 'Security Guard'
              }))
              setShowAssignmentForm(true)
            }}
            onViewHistory={(employeeId) => {
              setSelectedEmployeeForHistory(employeeId)
              setShowAssignmentHistory(true)
            }}
            onGetRecommendations={(siteId, role) => {
              setRecommendationParams({ siteId, role })
              setShowRecommendations(true)
            }}
            enableRealTimeConflictDetection={true}
            enableProximityCalculation={true}
          />
        </TabsContent>

        {/* Site Requirements View */}
        <TabsContent value="requirements">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {siteRequirements.map((requirement) => (
              <Card key={requirement.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <MapPin className="w-5 h-5" />
                        {requirement.siteName}
                      </CardTitle>
                      <CardDescription>
                        {requirement.role} • {requirement.shift.startTime} - {requirement.shift.endTime}
                      </CardDescription>
                    </div>
                    <Badge className={getUrgencyColor(requirement.urgency)}>
                      {requirement.urgency}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm font-medium">Staffing</span>
                        <span className="text-sm">
                          {requirement.assignedCount}/{requirement.requiredCount}
                        </span>
                      </div>
                      <Progress 
                        value={(requirement.assignedCount / requirement.requiredCount) * 100}
                        className="h-2"
                      />
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium mb-2">Required Skills</h4>
                      <div className="flex flex-wrap gap-1">
                        {requirement.skillRequirements.map((skill, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => {
                          setRecommendationParams({ 
                            siteId: requirement.siteId, 
                            role: requirement.role 
                          })
                          setShowRecommendations(true)
                        }}
                        className="flex-1"
                      >
                        <Target className="w-4 h-4 mr-2" />
                        Get Recommendations
                      </Button>
                      <Button 
                        size="sm"
                        onClick={() => {
                          setAssignmentFormData(prev => ({
                            ...prev,
                            siteId: requirement.siteId,
                            role: requirement.role
                          }))
                          setShowAssignmentForm(true)
                        }}
                        className="flex-1"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Assign
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
        <TabsContent value="list">
          <Card>
            <CardHeader>
              <CardTitle>All Assignments</CardTitle>
              <CardDescription>
                Showing {assignments.length} of {assignmentsData?.total || 0} assignments
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {assignmentsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : assignments.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No assignments found</p>
                    <p className="text-sm">Try adjusting your filters or create a new assignment</p>
                  </div>
                ) : (
                  assignments.map((assignment) => (
                    <div key={assignment.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="flex-shrink-0">
                          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                            <Users className="w-5 h-5 text-primary" />
                          </div>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">
                            {assignment.employee?.firstName} {assignment.employee?.lastName}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {assignment.role} at {assignment.site?.name || 'Unknown Site'}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge className={getStatusColor(assignment.status)}>
                              {assignment.status}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              ${assignment.hourlyRate}/hr
                            </span>
                            <span className="text-xs text-muted-foreground">
                              Started {new Date(assignment.startDate).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button variant="outline" size="sm">
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" size="sm">
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" size="sm">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        {/* Conflicts View */}
        <TabsContent value="conflicts">
          <ConflictDetection />
        </TabsContent>
        
        {/* Analytics View */}
        <TabsContent value="analytics">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Assignment Trends
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <p className="text-2xl font-bold text-green-600">{assignments.filter(a => a.status === 'ACTIVE').length}</p>
                      <p className="text-sm text-green-600">Active Assignments</p>
                    </div>
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <p className="text-2xl font-bold text-blue-600">{assignments.filter(a => a.status === 'COMPLETED').length}</p>
                      <p className="text-sm text-blue-600">Completed This Month</p>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium mb-2">Assignment Status Distribution</h4>
                    <div className="space-y-2">
                      {['ACTIVE', 'COMPLETED', 'INACTIVE', 'CANCELLED'].map(status => {
                        const count = assignments.filter(a => a.status === status).length
                        const percentage = assignments.length > 0 ? (count / assignments.length) * 100 : 0
                        return (
                          <div key={status} className="flex items-center justify-between">
                            <span className="text-sm">{status}</span>
                            <div className="flex items-center gap-2">
                              <div className="w-20 bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-primary h-2 rounded-full transition-all duration-300"
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                              <span className="text-xs text-muted-foreground w-8">{count}</span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="w-5 h-5" />
                  Performance Metrics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4">
                    <div className="text-center p-4 bg-purple-50 rounded-lg">
                      <p className="text-xl font-bold text-purple-600">
                        ${(assignments.reduce((sum, a) => sum + a.hourlyRate, 0) / assignments.length || 0).toFixed(2)}
                      </p>
                      <p className="text-sm text-purple-600">Average Hourly Rate</p>
                    </div>
                    
                    <div className="text-center p-4 bg-orange-50 rounded-lg">
                      <p className="text-xl font-bold text-orange-600">
                        {Math.round(siteRequirements.reduce((acc, req) => acc + (req.assignedCount / req.requiredCount), 0) / siteRequirements.length * 100)}%
                      </p>
                      <p className="text-sm text-orange-600">Average Site Fulfillment</p>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium mb-2">Role Distribution</h4>
                    <div className="space-y-2">
                      {stats?.roleDistribution && Object.entries(stats.roleDistribution).map(([role, count]) => {
                        const percentage = assignments.length > 0 ? (Number(count) / assignments.length) * 100 : 0
                        return (
                          <div key={role} className="flex items-center justify-between">
                            <span className="text-sm">{role}</span>
                            <div className="flex items-center gap-2">
                              <div className="w-20 bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                              <span className="text-xs text-muted-foreground w-8">{count}</span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Assignment Form Dialog */}
      <Dialog open={showAssignmentForm} onOpenChange={setShowAssignmentForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingAssignment ? 'Edit Assignment' : 'Create New Assignment'}
            </DialogTitle>
            <DialogDescription>
              {editingAssignment 
                ? 'Update assignment details and requirements'
                : 'Create a new employee assignment with role and schedule details'
              }
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="employee">Employee</Label>
                <Select 
                  value={assignmentFormData.employeeId}
                  onValueChange={(value) => setAssignmentFormData(prev => ({ ...prev, employeeId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map(employee => (
                      <SelectItem key={employee.id} value={employee.id}>
                        {employee.firstName} {employee.lastName} (#{employee.employeeNumber})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="site">Site</Label>
                <Select 
                  value={assignmentFormData.siteId}
                  onValueChange={(value) => setAssignmentFormData(prev => ({ ...prev, siteId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select site" />
                  </SelectTrigger>
                  <SelectContent>
                    {sites.map(site => (
                      <SelectItem key={site.id} value={site.id}>
                        {site.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="role">Role</Label>
                <Input
                  id="role"
                  placeholder="Security Guard"
                  value={assignmentFormData.role}
                  onChange={(e) => setAssignmentFormData(prev => ({ ...prev, role: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="hourlyRate">Hourly Rate ($)</Label>
                <Input
                  id="hourlyRate"
                  type="number"
                  step="0.01"
                  value={assignmentFormData.hourlyRate}
                  onChange={(e) => setAssignmentFormData(prev => ({ ...prev, hourlyRate: Number(e.target.value) }))}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={assignmentFormData.startDate}
                  onChange={(e) => setAssignmentFormData(prev => ({ ...prev, startDate: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="endDate">End Date (Optional)</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={assignmentFormData.endDate || ''}
                  onChange={(e) => setAssignmentFormData(prev => ({ ...prev, endDate: e.target.value }))}
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Additional notes or requirements..."
                value={assignmentFormData.notes}
                onChange={(e) => setAssignmentFormData(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
              />
            </div>
            
            <div className="flex gap-2">
              <Button 
                onClick={editingAssignment ? () => handleUpdateAssignment(editingAssignment) : handleCreateAssignment}
                disabled={createAssignmentMutation.isPending || updateAssignmentMutation.isPending}
                className="flex-1"
              >
                {(createAssignmentMutation.isPending || updateAssignmentMutation.isPending) ? (
                  <>
                    <div className="animate-spin w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full" />
                    {editingAssignment ? 'Updating...' : 'Creating...'}
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    {editingAssignment ? 'Update Assignment' : 'Create Assignment'}
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={() => setShowAssignmentForm(false)}>
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Assignment Recommendations Modal */}
      <AssignmentRecommendations
        isOpen={showRecommendations}
        onClose={() => setShowRecommendations(false)}
        siteId={recommendationParams.siteId}
        role={recommendationParams.role}
      />

      {/* Assignment Details Dialog */}
      <Dialog open={!!selectedAssignment} onOpenChange={() => setSelectedAssignment(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Assignment Details</DialogTitle>
            <DialogDescription>
              Complete assignment information and history
            </DialogDescription>
          </DialogHeader>
          {selectedAssignment && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Employee</Label>
                  <p className="text-sm">
                    {selectedAssignment.employee?.firstName} {selectedAssignment.employee?.lastName}
                  </p>
                </div>
                <div>
                  <Label>Site</Label>
                  <p className="text-sm">{selectedAssignment.site?.name}</p>
                </div>
                <div>
                  <Label>Role</Label>
                  <p className="text-sm">{selectedAssignment.role}</p>
                </div>
                <div>
                  <Label>Hourly Rate</Label>
                  <p className="text-sm">${selectedAssignment.hourlyRate}/hr</p>
                </div>
                <div>
                  <Label>Start Date</Label>
                  <p className="text-sm">{new Date(selectedAssignment.startDate).toLocaleDateString()}</p>
                </div>
                <div>
                  <Label>Status</Label>
                  <Badge className={getStatusColor(selectedAssignment.status)}>
                    {selectedAssignment.status}
                  </Badge>
                </div>
              </div>
              
              {selectedAssignment.employee?.skills && (
                <div>
                  <Label>Employee Skills</Label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedAssignment.employee.skills.map((skill: string) => (
                      <Badge key={skill} variant="outline" className="text-xs">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="flex gap-2">
                <Button onClick={() => openEditForm(selectedAssignment)} className="flex-1">
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Assignment
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setSelectedAssignment(null)}
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Assignment History Dialog */}
      <Dialog open={showAssignmentHistory} onOpenChange={setShowAssignmentHistory}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="w-5 h-5" />
              Assignment History
            </DialogTitle>
            <DialogDescription>
              {selectedEmployeeForHistory 
                ? `Assignment history for selected employee`
                : 'Complete assignment history and tracking'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* History filters */}
            <div className="flex gap-4">
              <Select 
                value={selectedEmployeeForHistory}
                onValueChange={setSelectedEmployeeForHistory}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filter by employee" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Employees</SelectItem>
                  {employees.map(employee => (
                    <SelectItem key={employee.id} value={employee.id}>
                      {employee.firstName} {employee.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* History timeline */}
            <div className="space-y-3">
              {assignments
                .filter(a => !selectedEmployeeForHistory || a.employeeId === selectedEmployeeForHistory)
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .slice(0, 20)
                .map((assignment) => (
                <div key={assignment.id} className="flex items-start gap-4 p-4 border rounded-lg">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                    <Users className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-medium">
                        {assignment.employee?.firstName} {assignment.employee?.lastName}
                      </p>
                      <Badge className={getStatusColor(assignment.status)}>
                        {assignment.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {assignment.role} at {assignment.site?.name}
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span>Rate: ${assignment.hourlyRate}/hr</span>
                      <span>Started: {new Date(assignment.startDate).toLocaleDateString()}</span>
                      {assignment.endDate && (
                        <span>Ended: {new Date(assignment.endDate).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedAssignment(assignment)
                      setShowAssignmentHistory(false)
                    }}
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              
              {assignments.filter(a => !selectedEmployeeForHistory || a.employeeId === selectedEmployeeForHistory).length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No assignment history found</p>
                  {selectedEmployeeForHistory && <p className="text-sm">Try selecting a different employee</p>}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}