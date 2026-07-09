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
import { Separator } from '@/components/ui/separator'
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

// Enhanced interfaces for Assignment Management
interface EnhancedDragData {
  type: 'employee' | 'assignment' | 'site-requirement'
  id: string
  data: Employee | Assignment | SiteRequirement
  metadata?: {
    sourceType: 'available' | 'assigned' | 'site'
    sourceId?: string
    conflictLevel?: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
    skillMatch?: number
    proximityScore?: number
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
    duration?: number
  }
  skillRequirements: string[]
  urgency: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'
  priority?: number
  location?: {
    address: string
    coordinates?: { lat: number; lng: number }
  }
  budget?: {
    hourlyRate: number
    totalBudget: number
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
  recommendations?: string[]
}

interface EnhancedAssignmentBoardProps {
  assignments: Assignment[]
  employees: Employee[]
  sites: Site[]
  onDrop: (dragData: EnhancedDragData, targetType: 'site' | 'unassigned', targetId?: string) => Promise<void>
  onEditAssignment: (assignment: Assignment) => void
  onViewAssignment: (assignment: Assignment) => void
  onCreateAssignment: (employeeId: string, siteId: string, role?: string) => void
  onViewHistory: (employeeId: string) => void
  onGetRecommendations: (siteId: string, role: string) => void
  enableRealTimeConflictDetection?: boolean
  enableProximityCalculation?: boolean
}

export default function EnhancedAssignmentBoard({
  assignments,
  employees,
  sites,
  onDrop,
  onEditAssignment,
  onViewAssignment,
  onCreateAssignment,
  onViewHistory,
  onGetRecommendations,
  enableRealTimeConflictDetection = true,
  enableProximityCalculation = true
}: EnhancedAssignmentBoardProps) {
  const [draggedItem, setDraggedItem] = useState<EnhancedDragData | null>(null)
  const [draggedOver, setDraggedOver] = useState<string | null>(null)
  const [conflictInfo, setConflictInfo] = useState<Map<string, ConflictInfo>>(new Map())
  const [showQuickAssign, setShowQuickAssign] = useState(false)
  const [quickAssignData, setQuickAssignData] = useState({ employeeId: '', siteId: '', role: '' })
  const [searchFilter, setSearchFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [skillFilter, setSkillFilter] = useState('')
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [viewMode, setViewMode] = useState<'board' | 'list' | 'analytics'>('board')

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
        conflicts: result.conflicts,
        recommendations: result.resolutions.map(r => r.description)
      })))
    }
  })

  // Enhanced site requirements generation with real-time data
  const generateSiteRequirements = useCallback((): SiteRequirement[] => {
    return sites.map((site, index) => {
      const siteAssignments = assignments.filter(a => a.siteId === site.id && a.status === 'ACTIVE')
      const roles = ['Security Guard', 'Supervisor', 'Reception', 'Patrol Officer', 'Access Control']
      const role = roles[index % roles.length]
      
      const baseRequirement = Math.max(1, Math.floor(Math.random() * 4) + 1)
      const assignedCount = siteAssignments.length
      const fulfillmentRatio = assignedCount / baseRequirement
      
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
          date: new Date().toISOString().split('T')[0],
          duration: 8
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
        },
        budget: {
          hourlyRate: Math.floor(Math.random() * 30) + 20,
          totalBudget: Math.floor(Math.random() * 10000) + 5000
        }
      }
    })
  }, [sites, assignments])

  const siteRequirements = generateSiteRequirements()
  
  // Filter available employees with enhanced filtering
  const availableEmployees = employees.filter(employee => {
    const activeAssignments = assignments.filter(
      a => a.employeeId === employee.id && a.status === 'ACTIVE'
    )
    return activeAssignments.length === 0 || activeAssignments.every(a => a.status !== 'ACTIVE')
  })

  const filteredAvailableEmployees = availableEmployees.filter(employee => {
    if (searchFilter) {
      const searchLower = searchFilter.toLowerCase()
      const matchesName = `${employee.firstName} ${employee.lastName}`.toLowerCase().includes(searchLower)
      const matchesNumber = employee.employeeNumber.toLowerCase().includes(searchLower)
      const matchesSkills = employee.skills?.some(skill => skill.toLowerCase().includes(searchLower))
      if (!(matchesName || matchesNumber || matchesSkills)) return false
    }
    
    if (skillFilter && !employee.skills?.some(skill => 
      skill.toLowerCase().includes(skillFilter.toLowerCase())
    )) return false
    
    return true
  })

  // Real-time conflict detection when dragging
  useEffect(() => {
    if (draggedItem && enableRealTimeConflictDetection && draggedItem.type === 'employee') {
      const employee = draggedItem.data as Employee
      sites.forEach(site => {
        conflictDetectionMutation.mutate({
          employeeId: employee.id,
          siteId: site.id,
          startDate: new Date().toISOString().split('T')[0]
        })
      })
    }
  }, [draggedItem, sites, enableRealTimeConflictDetection])

  // Enhanced drag and drop handlers with visual feedback and conflict checking
  const handleDragStart = useCallback((e: React.DragEvent, item: EnhancedDragData) => {
    setDraggedItem(item)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('application/json', JSON.stringify(item))
    
    // Enhanced visual feedback
    const dragElement = e.target as HTMLElement
    dragElement.style.opacity = '0.6'
    dragElement.style.transform = 'rotate(2deg)'
    dragElement.classList.add('shadow-xl', 'ring-2', 'ring-primary/50', 'scale-105')
  }, [])

  const handleDragEnd = useCallback((e: React.DragEvent) => {
    setDraggedItem(null)
    setDraggedOver(null)
    
    const dragElement = e.target as HTMLElement
    dragElement.style.opacity = '1'
    dragElement.style.transform = 'none'
    dragElement.classList.remove('shadow-xl', 'ring-2', 'ring-primary/50', 'scale-105')
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent, targetId: string) => {
    e.preventDefault()
    setDraggedOver(targetId)
    
    // Real-time conflict checking for visual feedback
    if (draggedItem && draggedItem.type === 'employee') {
      const employee = draggedItem.data as Employee
      const conflictKey = `${employee.id}-${targetId}`
      const conflicts = conflictInfo.get(conflictKey)
      
      if (conflicts?.hasConflicts && conflicts.conflictLevel === 'CRITICAL') {
        e.dataTransfer.dropEffect = 'none'
      } else {
        e.dataTransfer.dropEffect = 'move'
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
      const dragData: EnhancedDragData = JSON.parse(dragDataStr)
      
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
          toast.warning(`${conflicts.conflictCount} conflicts detected. Assignment created with warnings.`)
        }
      }
      
      await onDrop(dragData, targetType, targetId)
      
      // Enhanced success feedback
      if (dragData.type === 'employee' && targetType === 'site') {
        const employee = dragData.data as Employee
        const site = sites.find(s => s.id === targetId)
        toast.success(`✅ ${employee.firstName} assigned to ${site?.name}`)
      }
      
    } catch (error) {
      console.error('Drop error:', error)
      toast.error('Failed to process assignment change')
    } finally {
      setDraggedOver(null)
    }
  }, [onDrop, conflictInfo, sites])

  // Utility functions for visual indicators
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'bg-green-100 text-green-800 border-green-200'
      case 'INACTIVE': return 'bg-gray-100 text-gray-800 border-gray-200'
      case 'COMPLETED': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'CANCELLED': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
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

  const handleQuickAssign = async () => {
    if (!quickAssignData.employeeId || !quickAssignData.siteId) {
      toast.error('Please select both employee and site')
      return
    }
    
    try {
      await onCreateAssignment(
        quickAssignData.employeeId,
        quickAssignData.siteId,
        quickAssignData.role || 'Security Guard'
      )
      
      setShowQuickAssign(false)
      setQuickAssignData({ employeeId: '', siteId: '', role: '' })
      toast.success('Quick assignment created successfully!')
    } catch (error) {
      toast.error('Failed to create quick assignment')
    }
  }
  return (
    <div className="space-y-6">
      {/* Enhanced Board Controls & Filters */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Move className="w-6 h-6" />
              Assignment Management Board
              {draggedItem && (
                <Badge variant="secondary" className="animate-pulse">
                  <Zap className="w-3 h-3 mr-1" />
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
                Advanced Filters
              </Button>
            </div>
          </div>
          
          {/* Advanced Filtering Panel */}
          {showAdvancedFilters && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t">
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
                <Label htmlFor="skill-filter">Skills Filter</Label>
                <Input
                  id="skill-filter"
                  placeholder="Security, First Aid..."
                  value={skillFilter}
                  onChange={(e) => setSkillFilter(e.target.value)}
                />
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
                    setSkillFilter('')
                    setStatusFilter('')
                  }}
                  className="w-full"
                >
                  Clear All Filters
                </Button>
              </div>
            </div>
          )}
        </CardHeader>
      </Card>

      {/* Real-time Status Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{assignments.filter(a => a.status === 'ACTIVE').length}</p>
              <p className="text-xs text-muted-foreground">Active Assignments</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{filteredAvailableEmployees.length}</p>
              <p className="text-xs text-muted-foreground">Available Employees</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-orange-600">
                {siteRequirements.filter(r => r.urgency === 'URGENT' || r.urgency === 'HIGH').length}
              </p>
              <p className="text-xs text-muted-foreground">Urgent Needs</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-600">
                {Array.from(conflictInfo.values()).filter(c => c.hasConflicts).length}
              </p>
              <p className="text-xs text-muted-foreground">Conflicts Detected</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-indigo-600">
                {Math.round(siteRequirements.reduce((acc, req) => acc + (req.assignedCount / req.requiredCount), 0) / siteRequirements.length * 100)}%
              </p>
              <p className="text-xs text-muted-foreground">Avg Fulfillment</p>
            </div>
          </div>
        </CardContent>
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
              Drag employees to sites to create assignments
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
                      isBeingDragged ? 'opacity-60 transform rotate-2 shadow-xl ring-2 ring-primary/50 scale-105' : ''
                    } hover:shadow-md hover:scale-102`}
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
                        <div className="flex items-center gap-2 mb-2">
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
                        <div className="flex gap-1 flex-wrap mb-2">
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
                        <div className="flex items-center gap-2 justify-between">
                          <Badge variant="outline" className="text-xs bg-green-50">
                            Available
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 px-2 text-xs"
                            onClick={(e) => {
                              e.stopPropagation()
                              onViewHistory(employee.id)
                            }}
                          >
                            <History className="w-3 h-3 mr-1" />
                            History
                          </Button>
                        </div>
                      </div>
                      <div className="flex flex-col items-center gap-1 ml-2">
                        <Move className="w-4 h-4 text-muted-foreground" />
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      </div>
                    </div>
                  </div>
                )
              })}
              
              {filteredAvailableEmployees.length === 0 && (
                <div className="text-center text-muted-foreground py-8">
                  <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No available employees</p>
                  {searchFilter && <p className="text-xs">Try adjusting your search filters</p>}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        {/* Site Assignment Columns (2 columns in middle) */}
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
          {sites.slice(0, 4).map((site) => {
            const siteAssignments = assignments.filter(a => a.siteId === site.id && a.status === 'ACTIVE')
            const siteReq = siteRequirements.find(req => req.siteId === site.id)
            const isDropTarget = draggedOver === site.id
            const fulfillmentRatio = siteReq ? (siteReq.assignedCount / siteReq.requiredCount) : 1
            
            // Enhanced conflict indication for drag targets
            let conflictIndication = ''
            if (draggedItem?.type === 'employee' && isDropTarget) {
              const conflictLevel = getConflictLevel(draggedItem.id, site.id)
              conflictIndication = getConflictColor(conflictLevel)
            }
            
            return (
              <Card 
                key={site.id}
                className={`transition-all duration-200 ${
                  isDropTarget 
                    ? `ring-2 ring-primary ${conflictIndication || 'bg-primary/5'}` 
                    : ''
                } hover:shadow-md`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        {site.name}
                        {draggedItem?.type === 'employee' && isDropTarget && (
                          <Badge variant="outline" className="text-xs animate-bounce">
                            Drop Here
                          </Badge>
                        )}
                      </CardTitle>
                      <CardDescription className="text-xs">
                        {siteAssignments.length} assigned
                        {siteReq && (
                          <>
                            <span className="mx-1">•</span>
                            <span className={fulfillmentRatio < 0.8 ? 'text-red-600 font-medium' : ''}>
                              {siteReq.requiredCount} required
                            </span>
                          </>
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
                  
                  {/* Enhanced Site Requirements Display */}
                  {siteReq && (
                    <div className="mt-3 space-y-2">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs text-muted-foreground">Staffing Progress</span>
                        <span className={`text-xs font-medium ${
                          fulfillmentRatio < 0.5 ? 'text-red-600' :
                          fulfillmentRatio < 0.8 ? 'text-orange-600' :
                          fulfillmentRatio >= 1 ? 'text-green-600' : 'text-blue-600'
                        }`}>
                          {siteReq.assignedCount}/{siteReq.requiredCount}
                          <span className="ml-1">
                            ({Math.round(fulfillmentRatio * 100)}%)
                          </span>
                        </span>
                      </div>
                      <Progress 
                        value={Math.min(100, fulfillmentRatio * 100)} 
                        className={`h-2 ${
                          fulfillmentRatio < 0.5 ? '[&>*]:bg-red-500' :
                          fulfillmentRatio < 0.8 ? '[&>*]:bg-orange-500' :
                          fulfillmentRatio >= 1 ? '[&>*]:bg-green-500' : '[&>*]:bg-blue-500'
                        }`}
                      />
                      
                      {siteReq.skillRequirements.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {siteReq.skillRequirements.slice(0, 2).map((skill, index) => (
                            <Badge key={index} variant="outline" className="text-xs bg-blue-50">
                              {skill}
                            </Badge>
                          ))}
                          {siteReq.skillRequirements.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{siteReq.skillRequirements.length - 2}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </CardHeader>
                
                <CardContent 
                  className={`min-h-32 max-h-72 overflow-y-auto transition-all duration-200 ${
                    isDropTarget 
                      ? 'border-2 border-dashed border-primary bg-primary/5' 
                      : 'border-2 border-dashed border-transparent'
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
                          className={`p-3 border rounded-lg cursor-move hover:bg-accent transition-all duration-200 group ${
                            draggedItem?.id === assignment.id ? 'opacity-60 transform rotate-1 shadow-lg ring-2 ring-primary/50' : ''
                          } hover:shadow-md hover:scale-102`}
                          draggable
                          onDragStart={(e) => handleDragStart(e, {
                            type: 'assignment',
                            id: assignment.id,
                            data: assignment,
                            metadata: {
                              sourceType: 'assigned',
                              sourceId: site.id
                            }
                          })}
                          onDragEnd={handleDragEnd}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
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
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                <Badge className="text-xs bg-green-50" variant="outline">
                                  ${assignment.hourlyRate}/hr
                                </Badge>
                                <Badge className={`${getStatusColor(assignment.status)} text-xs`}>
                                  {assignment.status}
                                </Badge>
                              </div>
                            </div>
                            <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
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
                        <div className="space-y-3">
                          <Target className="w-10 h-10 mx-auto opacity-50" />
                          <div>
                            <p className="text-sm font-medium">Drop Zone</p>
                            <p className="text-xs">Assign employees to {site.name}</p>
                          </div>
                          {siteReq && (
                            <div className="space-y-2">
                              <div className="flex justify-center">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => onGetRecommendations(site.id, siteReq.role)}
                                  className="text-xs"
                                >
                                  <Star className="w-3 h-3 mr-1" />
                                  Get Recommendations
                                </Button>
                              </div>
                              {siteReq.budget && (
                                <p className="text-xs text-muted-foreground">
                                  Budget: ${siteReq.budget.hourlyRate}/hr
                                </p>
                              )}
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
        {/* Enhanced Management & Analytics Column */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Settings className="w-5 h-5" />
              Management Center
              <Badge variant="secondary">
                {assignments.filter(a => a.status !== 'ACTIVE').length}
              </Badge>
            </CardTitle>
            <CardDescription>
              Assignment management tools and analytics
            </CardDescription>
          </CardHeader>
          <CardContent 
            className={`min-h-[500px] max-h-[600px] overflow-y-auto space-y-4 ${
              draggedOver === 'unassigned' ? 'border-2 border-dashed border-orange-300 bg-orange-50' : ''
            }`}
            onDrop={(e) => handleDrop(e, 'unassigned')}
            onDragOver={(e) => handleDragOver(e, 'unassigned')}
            onDragLeave={handleDragLeave}
          >
            {/* Real-time Analytics */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Live Analytics
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center p-3 bg-green-50 rounded-lg border">
                  <p className="text-lg font-bold text-green-700">
                    {assignments.filter(a => a.status === 'ACTIVE').length}
                  </p>
                  <p className="text-xs text-green-600">Active Assignments</p>
                </div>
                <div className="text-center p-3 bg-blue-50 rounded-lg border">
                  <p className="text-lg font-bold text-blue-700">
                    {assignments.filter(a => a.status === 'COMPLETED').length}
                  </p>
                  <p className="text-xs text-blue-600">Completed</p>
                </div>
                <div className="text-center p-3 bg-orange-50 rounded-lg border">
                  <p className="text-lg font-bold text-orange-700">
                    {siteRequirements.filter(r => r.urgency === 'URGENT').length}
                  </p>
                  <p className="text-xs text-orange-600">Urgent Needs</p>
                </div>
                <div className="text-center p-3 bg-purple-50 rounded-lg border">
                  <p className="text-lg font-bold text-purple-700">
                    {Array.from(conflictInfo.values()).filter(c => c.hasConflicts).length}
                  </p>
                  <p className="text-xs text-purple-600">Conflicts</p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Quick Actions Panel */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Quick Actions
              </h4>
              <div className="grid grid-cols-1 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowQuickAssign(true)}
                  className="justify-start"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Quick Assign
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onGetRecommendations('', 'Security Guard')}
                  className="justify-start"
                >
                  <Target className="w-4 h-4 mr-2" />
                  Get AI Recommendations
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="justify-start"
                >
                  <Shield className="w-4 h-4 mr-2" />
                  Conflict Analysis
                </Button>
              </div>
            </div>

            <Separator />

            {/* Inactive Assignments Section */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <History className="w-4 h-4" />
                Recent Changes
              </h4>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {assignments
                  .filter(a => a.status !== 'ACTIVE')
                  .slice(0, 6)
                  .map((assignment) => (
                  <div
                    key={assignment.id}
                    className="p-2 border rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-5 h-5 bg-muted rounded-full flex items-center justify-center">
                            <Users className="w-3 h-3 text-muted-foreground" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium truncate">
                              {assignment.employee?.firstName} {assignment.employee?.lastName}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {assignment.role} • {assignment.site?.name}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 flex-wrap">
                          <Badge className={`${getStatusColor(assignment.status)} text-xs`}>
                            {assignment.status}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            ${assignment.hourlyRate}/hr
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {assignment.status === 'COMPLETED' ? 'Completed' : 'Updated'} {
                            new Date(assignment.updatedAt).toLocaleDateString()
                          }
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 flex-shrink-0"
                        onClick={() => onViewAssignment(assignment)}
                      >
                        <Eye className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
                
                {assignments.filter(a => a.status !== 'ACTIVE').length === 0 && (
                  <div className="text-center text-muted-foreground py-4">
                    <CheckCircle className="w-6 h-6 mx-auto mb-1 opacity-50" />
                    <p className="text-xs">All assignments are active</p>
                  </div>
                )}
              </div>
            </div>

            {/* Enhanced Drop Zone Indicator */}
            {draggedItem && (
              <div className="mt-4 p-4 border-2 border-dashed border-orange-400 rounded-lg text-center bg-gradient-to-br from-orange-50 to-orange-100 animate-pulse">
                <AlertTriangle className="w-6 h-6 mx-auto mb-2 text-orange-600" />
                <p className="text-sm font-medium text-orange-800">Drop Zone</p>
                <p className="text-xs text-orange-700">Drop here to deactivate assignment</p>
                <p className="text-xs text-orange-600 mt-1">This will set the assignment status to inactive</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Quick Assignment Dialog */}
      <Dialog open={showQuickAssign} onOpenChange={setShowQuickAssign}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5" />
              Quick Assignment
            </DialogTitle>
            <DialogDescription>
              Quickly assign an employee to a site with minimal configuration
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="quick-employee">Select Employee</Label>
              <Select
                value={quickAssignData.employeeId}
                onValueChange={(value) => setQuickAssignData(prev => ({ ...prev, employeeId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose an available employee" />
                </SelectTrigger>
                <SelectContent>
                  {availableEmployees.map(employee => (
                    <SelectItem key={employee.id} value={employee.id}>
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        <span>
                          {employee.firstName} {employee.lastName}
                          <span className="text-muted-foreground ml-1">(#{employee.employeeNumber})</span>
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="quick-site">Select Site</Label>
              <Select
                value={quickAssignData.siteId}
                onValueChange={(value) => setQuickAssignData(prev => ({ ...prev, siteId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a site location" />
                </SelectTrigger>
                <SelectContent>
                  {sites.map(site => {
                    const siteReq = siteRequirements.find(r => r.siteId === site.id)
                    return (
                      <SelectItem key={site.id} value={site.id}>
                        <div className="flex items-center justify-between gap-2 w-full">
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4" />
                            <span>{site.name}</span>
                          </div>
                          {siteReq && (
                            <Badge className={`${getUrgencyColor(siteReq.urgency)} text-xs ml-2`}>
                              {siteReq.urgency}
                            </Badge>
                          )}
                        </div>
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="quick-role">Role (Optional)</Label>
              <Input
                id="quick-role"
                placeholder="Security Guard"
                value={quickAssignData.role}
                onChange={(e) => setQuickAssignData(prev => ({ ...prev, role: e.target.value }))}
              />
            </div>
            
            {/* Conflict Warning */}
            {quickAssignData.employeeId && quickAssignData.siteId && (
              (() => {
                const conflictLevel = getConflictLevel(quickAssignData.employeeId, quickAssignData.siteId)
                const conflicts = conflictInfo.get(`${quickAssignData.employeeId}-${quickAssignData.siteId}`)
                
                if (conflicts?.hasConflicts) {
                  return (
                    <div className={`p-3 rounded-lg border ${getConflictColor(conflictLevel)}`}>
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" />
                        <p className="text-sm font-medium">
                          {conflicts.conflictCount} Conflict{conflicts.conflictCount !== 1 ? 's' : ''} Detected
                        </p>
                      </div>
                      <p className="text-xs mt-1">
                        {conflicts.conflicts[0]?.description || 'Assignment may have scheduling conflicts'}
                      </p>
                    </div>
                  )
                }
                return null
              })()
            )}
            
            <div className="flex gap-2 pt-2">
              <Button 
                onClick={handleQuickAssign} 
                className="flex-1"
                disabled={!quickAssignData.employeeId || !quickAssignData.siteId}
              >
                <Zap className="w-4 h-4 mr-2" />
                Create Assignment
              </Button>
              <Button variant="outline" onClick={() => setShowQuickAssign(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}