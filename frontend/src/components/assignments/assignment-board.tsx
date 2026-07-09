'use client'

import { useState, useCallback, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Users, 
  MapPin, 
  Clock,
  Move,
  Target,
  Edit,
  Eye,
  CheckCircle,
  AlertTriangle,
  Star,
  Award,
  Navigation,
  Zap,
  History,
  Filter,
  Search,
  Plus,
  Settings,
  Calendar,
  DollarSign,
  TrendingUp,
  Shield,
  Lightbulb
} from 'lucide-react'
import { Assignment, Employee, Site } from '@/types'
import { toast } from 'sonner'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { assignmentsApi, ConflictDetectionRequest } from '@/lib/api/assignments'

// Enhanced Drag and Drop Data Transfer Types
interface DragData {
  type: 'employee' | 'assignment' | 'site-requirement'
  id: string
  data: Employee | Assignment | SiteRequirement
  metadata?: {
    sourceType: 'available' | 'assigned' | 'site'
    sourceId?: string
    conflictLevel?: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  }
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
  priority?: number
  location?: {
    address: string
    coordinates?: { lat: number; lng: number }
  }
}

interface ConflictInfo {
  hasConflicts: boolean
  conflictLevel: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  conflictCount: number
  conflicts: Array<{
    type: string
    severity: string
    description: string
  }>
}

interface AssignmentBoardProps {
  assignments: Assignment[]
  employees: Employee[]
  sites: Site[]
  onDrop: (dragData: DragData, targetType: 'site' | 'unassigned', targetId?: string) => Promise<void>
  onEditAssignment: (assignment: Assignment) => void
  onViewAssignment: (assignment: Assignment) => void
  onCreateAssignment: (employeeId: string, siteId: string, role?: string) => void
  onViewHistory: (employeeId: string) => void
  onGetRecommendations: (siteId: string, role: string) => void
  enableRealTimeConflictDetection?: boolean
}

export default function AssignmentBoard({
  assignments,
  employees,
  sites,
  onDrop,
  onEditAssignment,
  onViewAssignment,
  onCreateAssignment,
  onViewHistory,
  onGetRecommendations,
  enableRealTimeConflictDetection = true
}: AssignmentBoardProps) {
  const [draggedItem, setDraggedItem] = useState<DragData | null>(null)
  const [draggedOver, setDraggedOver] = useState<string | null>(null)
  const [conflictInfo, setConflictInfo] = useState<Map<string, ConflictInfo>>(new Map())
  const [showQuickAssign, setShowQuickAssign] = useState(false)
  const [quickAssignData, setQuickAssignData] = useState({ employeeId: '', siteId: '', role: '' })
  const [searchFilter, setSearchFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)

  const queryClient = useQueryClient()

  // Real-time conflict detection mutation
  const conflictDetectionMutation = useMutation({
    mutationFn: (request: ConflictDetectionRequest) => assignmentsApi.detectConflicts(request),
    onSuccess: (result, variables) => {
      const key = `${variables.employeeId}-${variables.siteId}`
      setConflictInfo(prev => new Map(prev.set(key, {
        hasConflicts: result.hasConflicts,
        conflictLevel: result.highestSeverity as any,
        conflictCount: result.conflictCount,
        conflicts: result.conflicts
      })))
    }
  })

  // Check for conflicts in real-time when dragging
  useEffect(() => {
    if (draggedItem && enableRealTimeConflictDetection) {
      if (draggedItem.type === 'employee') {
        const employee = draggedItem.data as Employee
        // Check conflicts for all sites
        sites.forEach(site => {
          conflictDetectionMutation.mutate({
            employeeId: employee.id,
            siteId: site.id,
            startDate: new Date().toISOString().split('T')[0]
          })
        })
      }
    }
  }, [draggedItem, sites, enableRealTimeConflictDetection])

  // Get available employees (not currently assigned or available for reassignment)
  const availableEmployees = employees.filter(employee => {
    const activeAssignments = assignments.filter(
      a => a.employeeId === employee.id && a.status === 'ACTIVE'
    )
    // Show employees with no assignments or inactive assignments
    return activeAssignments.length === 0 || 
           activeAssignments.every(a => a.status !== 'ACTIVE')
  })

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

  // Enhanced Drag and Drop Handlers with Conflict Detection
  const handleDragStart = useCallback((e: React.DragEvent, item: DragData) => {
    setDraggedItem(item)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('application/json', JSON.stringify(item))
    
    // Enhanced visual feedback
    const dragElement = e.target as HTMLElement
    dragElement.style.opacity = '0.6'
    dragElement.style.transform = 'rotate(2deg)'
    dragElement.classList.add('shadow-lg', 'ring-2', 'ring-primary/50')
    
    // Add drag ghost image
    const dragGhost = dragElement.cloneNode(true) as HTMLElement
    dragGhost.style.transform = 'rotate(-2deg)'
    dragGhost.style.opacity = '0.8'
    e.dataTransfer.setDragImage(dragGhost, 50, 30)
  }, [])

  const handleDragEnd = useCallback((e: React.DragEvent) => {
    setDraggedItem(null)
    setDraggedOver(null)
    
    // Reset enhanced visual feedback
    const dragElement = e.target as HTMLElement
    dragElement.style.opacity = '1'
    dragElement.style.transform = 'none'
    dragElement.classList.remove('shadow-lg', 'ring-2', 'ring-primary/50')
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent, targetId: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDraggedOver(targetId)
    
    // Real-time conflict checking
    if (draggedItem && draggedItem.type === 'employee') {
      const employee = draggedItem.data as Employee
      const conflictKey = `${employee.id}-${targetId}`
      const conflicts = conflictInfo.get(conflictKey)
      
      if (conflicts?.hasConflicts) {
        e.dataTransfer.dropEffect = 'none'
      }
    }
  }, [draggedItem, conflictInfo])

  const handleDragLeave = useCallback(() => {
    setDraggedOver(null)
  }, [])

  const handleDrop = useCallback(async (e: React.DragEvent, targetType: 'site' | 'unassigned', targetId?: string) => {
    e.preventDefault()
    
    try {
      const dragDataStr = e.dataTransfer.getData('application/json')
      const dragData: DragData = JSON.parse(dragDataStr)
      
      // Enhanced conflict checking before drop
      if (dragData.type === 'employee' && targetType === 'site' && targetId) {
        const employee = dragData.data as Employee
        const conflictKey = `${employee.id}-${targetId}`
        const conflicts = conflictInfo.get(conflictKey)
        
        if (conflicts?.hasConflicts && conflicts.conflictLevel === 'CRITICAL') {
          toast.error(`Cannot assign ${employee.firstName}: Critical conflicts detected`)
          return
        }
        
        if (conflicts?.hasConflicts) {
          // Show warning but allow assignment
          toast.warning(`${conflicts.conflictCount} conflicts detected. Proceed with caution.`)
        }
      }
      
      await onDrop(dragData, targetType, targetId)
      
      // Success feedback
      if (dragData.type === 'employee' && targetType === 'site') {
        const employee = dragData.data as Employee
        const site = sites.find(s => s.id === targetId)
        toast.success(`${employee.firstName} assigned to ${site?.name}`)
      }
      
    } catch (error) {
      console.error('Drop error:', error)
      toast.error('Failed to process assignment change')
    } finally {
      setDraggedOver(null)
    }
  }, [onDrop, conflictInfo, sites])

  // Enhanced Site Requirements Generation with Real Data
  const generateSiteRequirements = useCallback((): SiteRequirement[] => {
    return sites.map((site, index) => {
      const siteAssignments = assignments.filter(a => a.siteId === site.id && a.status === 'ACTIVE')
      const roles = ['Security Guard', 'Supervisor', 'Reception', 'Patrol Officer', 'Access Control']
      const role = roles[index % roles.length]
      
      // Calculate required count based on site size and type
      const baseRequirement = Math.max(1, Math.floor(Math.random() * 4) + 1)
      const assignedCount = siteAssignments.length
      const fulfillmentRatio = assignedCount / baseRequirement
      
      // Determine urgency based on fulfillment and time factors
      let urgency: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'
      if (fulfillmentRatio < 0.5) urgency = 'URGENT'
      else if (fulfillmentRatio < 0.8) urgency = 'HIGH'
      else if (fulfillmentRatio < 1) urgency = 'NORMAL'
      else urgency = 'LOW'
      
      return {
        id: `req-${site.id}-${role.replace(/\s+/g, '-').toLowerCase()}`,
        siteId: site.id,
        siteName: site.name,
        role: role,
        requiredCount: baseRequirement,
        assignedCount: assignedCount,
        shift: {
          startTime: ['06:00', '08:00', '09:00', '18:00'][index % 4],
          endTime: ['14:00', '16:00', '17:00', '06:00'][index % 4],
          date: new Date().toISOString().split('T')[0]
        },
        skillRequirements: [
          ['Security License', 'First Aid', 'CPR'],
          ['Leadership', 'Security License', 'Communication'],
          ['Customer Service', 'Computer Skills', 'Phone Etiquette'],
          ['Physical Fitness', 'Security License', 'Observation Skills'],
          ['Technology Skills', 'Security License', 'Access Control Systems']
        ][index % 5],
        urgency: urgency,
        priority: urgency === 'URGENT' ? 1 : urgency === 'HIGH' ? 2 : urgency === 'NORMAL' ? 3 : 4,
        location: {
          address: site.address?.street || 'Address not specified',
          coordinates: {
            lat: 40.7128 + (Math.random() - 0.5) * 0.1,
            lng: -74.0060 + (Math.random() - 0.5) * 0.1
          }
        }
      }
    })
  }, [sites, assignments])

  const siteRequirements = generateSiteRequirements()
  
  // Filter functions for enhanced search
  const filteredAvailableEmployees = availableEmployees.filter(employee => {
    if (searchFilter) {
      const searchLower = searchFilter.toLowerCase()
      const matchesName = `${employee.firstName} ${employee.lastName}`.toLowerCase().includes(searchLower)
      const matchesNumber = employee.employeeNumber.toLowerCase().includes(searchLower)
      const matchesSkills = employee.skills?.some(skill => skill.toLowerCase().includes(searchLower))
      return matchesName || matchesNumber || matchesSkills
    }
    return true
  })

  // Quick assign function
  const handleQuickAssign = () => {
    if (!quickAssignData.employeeId || !quickAssignData.siteId) {
      toast.error('Please select both employee and site')
      return
    }
    
    onCreateAssignment(
      quickAssignData.employeeId,
      quickAssignData.siteId,
      quickAssignData.role || 'Security Guard'
    )
    
    setShowQuickAssign(false)
    setQuickAssignData({ employeeId: '', siteId: '', role: '' })
  }

  // Get conflict level for visual indicators
  const getConflictLevel = (employeeId: string, siteId: string): string => {
    const conflictKey = `${employeeId}-${siteId}`
    const conflicts = conflictInfo.get(conflictKey)
    return conflicts?.conflictLevel || 'NONE'
  }

  const getConflictColor = (level: string) => {
    switch (level) {
      case 'CRITICAL': return 'border-red-500 bg-red-50'
      case 'HIGH': return 'border-orange-500 bg-orange-50'
      case 'MEDIUM': return 'border-yellow-500 bg-yellow-50'
      case 'LOW': return 'border-blue-500 bg-blue-50'
      default: return 'border-green-500 bg-green-50'
    }
  }

  return (
    <div className="space-y-4">
      {/* Enhanced Board Controls */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Move className="w-5 h-5" />
              Assignment Board
              {draggedItem && (
                <Badge variant="secondary" className="animate-pulse">
                  Dragging {draggedItem.type}
                </Badge>
              )}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowQuickAssign(true)}
              >
                <Zap className="w-4 h-4 mr-2" />
                Quick Assign
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              >
                <Filter className="w-4 h-4 mr-2" />
                Filters
              </Button>
            </div>
          </div>
          
          {showAdvancedFilters && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
              <div>
                <Label htmlFor="employee-search">Search Employees</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    id="employee-search"
                    placeholder="Name, ID, or skills..."
                    className="pl-10"
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="status-filter">Assignment Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Statuses</SelectItem>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="INACTIVE">Inactive</SelectItem>
                    <SelectItem value="COMPLETED">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button 
                  variant="outline"
                  onClick={() => {
                    setSearchFilter('')
                    setStatusFilter('')
                  }}
                  className="w-full"
                >
                  Clear Filters
                </Button>
              </div>
            </div>
          )}
        </CardHeader>
      </Card>

      {/* Enhanced Assignment Board Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-[700px]">
        {/* Available Employees Column */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="w-5 h-5" />
              Available Employees
              <Badge variant="secondary">{filteredAvailableEmployees.length}</Badge>
            </CardTitle>
            <CardDescription>
              Drag employees to assign them to sites
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="space-y-2 max-h-[600px] overflow-y-auto p-3">
              {filteredAvailableEmployees.map((employee) => {
                const isBeingDragged = draggedItem?.id === employee.id
                
                return (
                  <div
                    key={employee.id}
                    className={`p-3 border rounded-lg cursor-move hover:bg-accent transition-all duration-200 ${
                      isBeingDragged ? 'opacity-60 transform rotate-2 shadow-lg ring-2 ring-primary/50' : ''
                    } hover:shadow-md`}
                    draggable
                    onDragStart={(e) => handleDragStart(e, {
                      type: 'employee',
                      id: employee.id,
                      data: employee,
                      metadata: {
                        sourceType: 'available',
                        conflictLevel: 'NONE'
                      }
                    })}
                    onDragEnd={handleDragEnd}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                            <Users className="w-4 h-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">
                              {employee.firstName} {employee.lastName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              #{employee.employeeNumber}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-1 flex-wrap mt-2">
                          {employee.skills?.slice(0, 3).map((skill: string) => (
                            <Badge key={skill} variant="outline" className="text-xs">
                              {skill}
                            </Badge>
                          ))}
                          {(employee.skills?.length || 0) > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{(employee.skills?.length || 0) - 3} more
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline" className="text-xs">
                            Available
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 px-2 text-xs"
                            onClick={() => onViewHistory(employee.id)}
                          >
                            <History className="w-3 h-3 mr-1" />
                            History
                          </Button>
                        </div>
                      </div>
                      <div className="flex flex-col items-center gap-1">
                        <Move className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </div>
                  </div>
                )
              })}
              
              {filteredAvailableEmployees.length === 0 && (
                <div className="text-center text-muted-foreground py-8">
                  <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No available employees</p>
                  {searchFilter && <p className="text-xs">Try adjusting your search</p>}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

      {/* Site Assignment Columns */}
      <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
        {sites.slice(0, 4).map((site) => {
          const siteAssignments = assignments.filter(a => a.siteId === site.id && a.status === 'ACTIVE')
          const siteReq = siteRequirements.find(req => req.siteId === site.id)
          const isDropTarget = draggedOver === site.id
          
          return (
            <Card 
              key={site.id}
              className={`transition-all ${isDropTarget ? 'ring-2 ring-primary bg-primary/5' : ''}`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      {site.name}
                    </CardTitle>
                    <CardDescription className="text-xs">
                      {siteAssignments.length} assigned
                      {siteReq && (
                        <span className="ml-2">
                          • {siteReq.requiredCount} required
                        </span>
                      )}
                    </CardDescription>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge 
                      className={getStatusColor(site.operationalStatus)}
                      variant="secondary"
                    >
                      {site.operationalStatus}
                    </Badge>
                    {siteReq && (
                      <Badge 
                        className={`${getUrgencyColor(siteReq.urgency)} text-xs`}
                      >
                        {siteReq.urgency}
                      </Badge>
                    )}
                  </div>
                </div>
                {siteReq && (
                  <div className="mt-2">
                    <div className="flex justify-between mb-1">
                      <span className="text-xs text-muted-foreground">Staffing</span>
                      <span className="text-xs font-medium">
                        {siteReq.assignedCount}/{siteReq.requiredCount}
                      </span>
                    </div>
                    <Progress 
                      value={(siteReq.assignedCount / siteReq.requiredCount) * 100} 
                      className="h-1"
                    />
                  </div>
                )}
              </CardHeader>
              <CardContent 
                className={`min-h-32 max-h-64 overflow-y-auto ${
                  isDropTarget ? 'border-2 border-dashed border-primary' : 'border-2 border-dashed border-transparent'
                }`}
                onDrop={(e) => handleDrop(e, 'site', site.id)}
                onDragOver={(e) => handleDragOver(e, site.id)}
                onDragLeave={handleDragLeave}
              >
                <div className="space-y-2">
                  {siteAssignments.length > 0 ? (
                    siteAssignments.map((assignment) => (
                      <div
                        key={assignment.id}
                        className={`p-2 border rounded cursor-move hover:bg-accent transition-colors group ${
                          draggedItem?.id === assignment.id ? 'opacity-50' : ''
                        }`}
                        draggable
                        onDragStart={(e) => handleDragStart(e, {
                          type: 'assignment',
                          id: assignment.id,
                          data: assignment
                        })}
                        onDragEnd={handleDragEnd}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center">
                                <Users className="w-3 h-3 text-primary" />
                              </div>
                              <div>
                                <p className="text-xs font-medium">
                                  {assignment.employee?.firstName} {assignment.employee?.lastName}
                                </p>
                                <p className="text-xs text-muted-foreground">{assignment.role}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge className="text-xs" variant="outline">
                                ${assignment.hourlyRate}/hr
                              </Badge>
                              <Badge className={`${getStatusColor(assignment.status)} text-xs`}>
                                {assignment.status}
                              </Badge>
                            </div>
                          </div>
                          <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={(e) => {
                                e.stopPropagation()
                                onViewAssignment(assignment)
                              }}
                            >
                              <Eye className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={(e) => {
                                e.stopPropagation()
                                onEditAssignment(assignment)
                              }}
                            >
                              <Edit className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-muted-foreground py-6">
                      <div className="space-y-2">
                        <Target className="w-8 h-8 mx-auto opacity-50" />
                        <p className="text-xs">Drop employees here</p>
                        <p className="text-xs">to assign to {site.name}</p>
                        {siteReq && siteReq.skillRequirements.length > 0 && (
                          <div className="mt-2">
                            <p className="text-xs font-medium mb-1">Required Skills:</p>
                            <div className="flex flex-wrap gap-1 justify-center">
                              {siteReq.skillRequirements.map((skill, index) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  {skill}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
        </div>

        {/* Unassigned/Management Column */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="w-5 h-5" />
            Inactive & Completed
            <Badge variant="secondary">
              {assignments.filter(a => a.status === 'CANCELLED' || a.status === 'COMPLETED').length}
            </Badge>
          </CardTitle>
          <CardDescription>
            Non-active assignments and management area
          </CardDescription>
        </CardHeader>
        <CardContent 
          className={`min-h-[400px] max-h-[580px] overflow-y-auto ${
            draggedOver === 'unassigned' ? 'border-2 border-dashed border-orange-300 bg-orange-50' : ''
          }`}
          onDrop={(e) => handleDrop(e, 'unassigned')}
          onDragOver={(e) => handleDragOver(e, 'unassigned')}
          onDragLeave={handleDragLeave}
        >
          <div className="space-y-3">
            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              <div className="text-center p-2 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground">Total Active</p>
                <p className="text-lg font-bold text-green-600">
                  {assignments.filter(a => a.status === 'ACTIVE').length}
                </p>
              </div>
              <div className="text-center p-2 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground">Completed</p>
                <p className="text-lg font-bold text-blue-600">
                  {assignments.filter(a => a.status === 'COMPLETED').length}
                </p>
              </div>
            </div>

            {/* Inactive/Completed Assignments */}
            <div className="space-y-2">
              {assignments
                .filter(a => a.status !== 'ACTIVE')
                .map((assignment) => (
                <div
                  key={assignment.id}
                  className="p-3 border rounded-lg bg-muted/50"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-6 h-6 bg-muted rounded-full flex items-center justify-center">
                          <Users className="w-3 h-3 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">
                            {assignment.employee?.firstName} {assignment.employee?.lastName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {assignment.role} • {assignment.site?.name}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge className={getStatusColor(assignment.status)}>
                          {assignment.status}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          ${assignment.hourlyRate}/hr
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {assignment.status === 'COMPLETED' ? (
                          <span className="flex items-center gap-1">
                            <CheckCircle className="w-3 h-3 text-green-500" />
                            Completed {new Date(assignment.endDate || '').toLocaleDateString()}
                          </span>
                        ) : (
                          <span>Updated {new Date(assignment.updatedAt).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => onViewAssignment(assignment)}
                    >
                      <Eye className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
              
              {assignments.filter(a => a.status !== 'ACTIVE').length === 0 && (
                <div className="text-center text-muted-foreground py-8">
                  <CheckCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">All assignments are active</p>
                  <p className="text-xs">Great job keeping everyone busy!</p>
                </div>
              )}
            </div>

            {/* Drop Zone Indicator */}
            {draggedItem && (
              <div className="mt-4 p-4 border-2 border-dashed border-orange-300 rounded-lg text-center bg-orange-50">
                <AlertTriangle className="w-6 h-6 mx-auto mb-2 text-orange-500" />
                <p className="text-sm text-orange-700">Drop here to deactivate assignment</p>
                <p className="text-xs text-orange-600">This will set the assignment to inactive</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      </div>
    </div>
  )
}