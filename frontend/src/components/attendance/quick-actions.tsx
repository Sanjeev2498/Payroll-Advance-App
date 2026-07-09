'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { AttendanceFilter } from '@/types'
import { 
  Clock, 
  UserCheck, 
  AlertTriangle, 
  Download,
  Filter,
  Search,
  Plus,
  Zap,
  BarChart3,
  Settings,
  MapPin,
  Users
} from 'lucide-react'

interface QuickActionsProps {
  onFiltersChange: (filters: AttendanceFilter) => void
  onRefresh: () => void
}

interface QuickClockAction {
  employeeId: string
  action: 'CLOCK_IN' | 'CLOCK_OUT'
  notes?: string
  overrideLocation?: boolean
}

export const QuickActions: React.FC<QuickActionsProps> = ({
  onFiltersChange,
  onRefresh
}) => {
  const [quickClockDialog, setQuickClockDialog] = useState(false)
  const [bulkActionDialog, setBulkActionDialog] = useState(false)
  const [quickClockData, setQuickClockData] = useState<QuickClockAction>({
    employeeId: '',
    action: 'CLOCK_IN'
  })

  const handleQuickFilter = (filterType: string) => {
    const today = new Date().toISOString().split('T')[0]
    
    switch (filterType) {
      case 'late-today':
        onFiltersChange({
          dateFrom: today,
          dateTo: today,
          lateOnly: true
        })
        break
      case 'anomalies-today':
        onFiltersChange({
          dateFrom: today,
          dateTo: today,
          anomaliesOnly: true
        })
        break
      case 'overtime-today':
        onFiltersChange({
          dateFrom: today,
          dateTo: today,
          overtimeOnly: true
        })
        break
      case 'present-today':
        onFiltersChange({
          dateFrom: today,
          dateTo: today,
          status: 'PRESENT'
        })
        break
      case 'absent-today':
        onFiltersChange({
          dateFrom: today,
          dateTo: today,
          status: 'ABSENT'
        })
        break
      default:
        break
    }
  }

  const handleQuickClock = async () => {
    // In a real implementation, this would call the attendance API
    console.log('Quick clock action:', quickClockData)
    setQuickClockDialog(false)
    setQuickClockData({ employeeId: '', action: 'CLOCK_IN' })
    onRefresh()
  }

  const quickFilterActions = [
    {
      id: 'late-today',
      label: 'Late Today',
      icon: AlertTriangle,
      description: 'Show late arrivals for today',
      color: 'text-yellow-600 bg-yellow-50 border-yellow-200 hover:bg-yellow-100'
    },
    {
      id: 'anomalies-today',
      label: 'Anomalies',
      icon: AlertTriangle,
      description: 'Show detected anomalies',
      color: 'text-red-600 bg-red-50 border-red-200 hover:bg-red-100'
    },
    {
      id: 'overtime-today',
      label: 'Overtime',
      icon: Clock,
      description: 'Show overtime records',
      color: 'text-orange-600 bg-orange-50 border-orange-200 hover:bg-orange-100'
    },
    {
      id: 'present-today',
      label: 'Present',
      icon: UserCheck,
      description: 'Show present employees',
      color: 'text-green-600 bg-green-50 border-green-200 hover:bg-green-100'
    }
  ]

  const actionButtons = [
    {
      id: 'quick-clock',
      label: 'Quick Clock',
      icon: Clock,
      description: 'Manual clock in/out',
      action: () => setQuickClockDialog(true)
    },
    {
      id: 'bulk-actions',
      label: 'Bulk Actions',
      icon: Users,
      description: 'Update multiple records',
      action: () => setBulkActionDialog(true)
    },
    {
      id: 'generate-report',
      label: 'Generate Report',
      icon: BarChart3,
      description: 'Create attendance report',
      action: () => console.log('Generate report')
    }
  ]

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Zap className="h-5 w-5" />
          Quick Actions
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Quick Filter Actions */}
        <div>
          <Label className="text-sm font-medium mb-2 block">Quick Filters</Label>
          <div className="grid grid-cols-2 gap-2">
            {quickFilterActions.map((action) => {
              const Icon = action.icon
              return (
                <Button
                  key={action.id}
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickFilter(action.id)}
                  className={`flex items-center gap-2 h-auto p-2 text-left justify-start ${action.color}`}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  <div className="flex flex-col items-start min-w-0 flex-1">
                    <span className="text-sm font-medium truncate w-full">{action.label}</span>
                    <span className="text-xs opacity-75 truncate w-full">{action.description}</span>
                  </div>
                </Button>
              )
            })}
          </div>
        </div>

        {/* Action Buttons */}
        <div>
          <Label className="text-sm font-medium mb-2 block">Actions</Label>
          <div className="flex flex-wrap gap-2">
            {actionButtons.map((button) => {
              const Icon = button.icon
              return (
                <Button
                  key={button.id}
                  variant="outline"
                  size="sm"
                  onClick={button.action}
                  className="flex items-center gap-2"
                >
                  <Icon className="h-4 w-4" />
                  {button.label}
                </Button>
              )
            })}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t">
          <div className="text-center">
            <div className="text-lg font-semibold text-blue-600">24</div>
            <div className="text-xs text-gray-600">Active Now</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-green-600">89%</div>
            <div className="text-xs text-gray-600">On Time Rate</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-yellow-600">3</div>
            <div className="text-xs text-gray-600">Late Today</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-red-600">1</div>
            <div className="text-xs text-gray-600">Anomalies</div>
          </div>
        </div>
      </CardContent>

      {/* Quick Clock Dialog */}
      <Dialog open={quickClockDialog} onOpenChange={setQuickClockDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Quick Clock Action</DialogTitle>
            <DialogDescription>
              Manually process a clock-in or clock-out for an employee
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="employee-search">Employee</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  id="employee-search"
                  placeholder="Search by name or employee ID..."
                  value={quickClockData.employeeId}
                  onChange={(e) => setQuickClockData(prev => ({ ...prev, employeeId: e.target.value }))}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Action</Label>
              <Select
                value={quickClockData.action}
                onValueChange={(value: 'CLOCK_IN' | 'CLOCK_OUT') => 
                  setQuickClockData(prev => ({ ...prev, action: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CLOCK_IN">Clock In</SelectItem>
                  <SelectItem value="CLOCK_OUT">Clock Out</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="quick-notes">Notes (Optional)</Label>
              <Textarea
                id="quick-notes"
                placeholder="Add any notes about this manual clock action..."
                value={quickClockData.notes || ''}
                onChange={(e) => setQuickClockData(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="override-location"
                checked={quickClockData.overrideLocation || false}
                onChange={(e) => setQuickClockData(prev => ({ ...prev, overrideLocation: e.target.checked }))}
              />
              <Label htmlFor="override-location" className="text-sm">
                Override location validation
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setQuickClockDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleQuickClock}
              disabled={!quickClockData.employeeId}
            >
              <Clock className="h-4 w-4 mr-2" />
              {quickClockData.action === 'CLOCK_IN' ? 'Clock In' : 'Clock Out'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Actions Dialog */}
      <Dialog open={bulkActionDialog} onOpenChange={setBulkActionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Actions</DialogTitle>
            <DialogDescription>
              Perform actions on multiple attendance records
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="text-sm text-gray-600 p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-4 w-4 text-blue-600" />
                <span className="font-medium">Bulk Operations</span>
              </div>
              <p>Select records in the table first, then choose an action to apply.</p>
            </div>

            <div className="space-y-2">
              <Label>Action Type</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Choose action..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="approve-corrections">Approve Corrections</SelectItem>
                  <SelectItem value="reject-corrections">Reject Corrections</SelectItem>
                  <SelectItem value="update-status">Update Status</SelectItem>
                  <SelectItem value="export-selected">Export Selected</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bulk-reason">Reason</Label>
              <Textarea
                id="bulk-reason"
                placeholder="Explain why this bulk action is being performed..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkActionDialog(false)}>
              Cancel
            </Button>
            <Button>
              Apply Action
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}