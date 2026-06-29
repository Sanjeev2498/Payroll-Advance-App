'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { AttendanceFilter } from '@/types'
import { 
  CalendarIcon, 
  X, 
  Search, 
  Filter,
  RotateCcw
} from 'lucide-react'
import { format } from 'date-fns'

interface AttendanceFiltersProps {
  filters: AttendanceFilter
  onChange: (filters: AttendanceFilter) => void
}

interface DateRangePreset {
  label: string
  value: { dateFrom: string; dateTo: string }
}

const DATE_PRESETS: DateRangePreset[] = [
  {
    label: 'Today',
    value: {
      dateFrom: new Date().toISOString().split('T')[0],
      dateTo: new Date().toISOString().split('T')[0]
    }
  },
  {
    label: 'Yesterday',
    value: {
      dateFrom: new Date(Date.now() - 86400000).toISOString().split('T')[0],
      dateTo: new Date(Date.now() - 86400000).toISOString().split('T')[0]
    }
  },
  {
    label: 'This Week',
    value: {
      dateFrom: new Date(Date.now() - (new Date().getDay() * 86400000)).toISOString().split('T')[0],
      dateTo: new Date().toISOString().split('T')[0]
    }
  },
  {
    label: 'Last 7 Days',
    value: {
      dateFrom: new Date(Date.now() - (7 * 86400000)).toISOString().split('T')[0],
      dateTo: new Date().toISOString().split('T')[0]
    }
  },
  {
    label: 'This Month',
    value: {
      dateFrom: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
      dateTo: new Date().toISOString().split('T')[0]
    }
  },
  {
    label: 'Last 30 Days',
    value: {
      dateFrom: new Date(Date.now() - (30 * 86400000)).toISOString().split('T')[0],
      dateTo: new Date().toISOString().split('T')[0]
    }
  }
]

const STATUS_OPTIONS = [
  { value: 'PRESENT', label: 'Present' },
  { value: 'LATE', label: 'Late' },
  { value: 'ABSENT', label: 'Absent' },
  { value: 'EARLY_DEPARTURE', label: 'Early Departure' },
  { value: 'OVERTIME', label: 'Overtime' },
  { value: 'PENDING', label: 'Pending' }
]

export const AttendanceFilters: React.FC<AttendanceFiltersProps> = ({
  filters,
  onChange
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [tempFilters, setTempFilters] = useState<AttendanceFilter>(filters)
  const [showDateFromPicker, setShowDateFromPicker] = useState(false)
  const [showDateToPicker, setShowDateToPicker] = useState(false)

  const updateFilter = (key: keyof AttendanceFilter, value: any) => {
    const newFilters = { ...tempFilters, [key]: value }
    setTempFilters(newFilters)
    onChange(newFilters)
  }

  const applyDatePreset = (preset: DateRangePreset) => {
    const newFilters = { ...tempFilters, ...preset.value }
    setTempFilters(newFilters)
    onChange(newFilters)
  }

  const clearAllFilters = () => {
    const clearedFilters: AttendanceFilter = {
      dateFrom: new Date().toISOString().split('T')[0],
      dateTo: new Date().toISOString().split('T')[0]
    }
    setTempFilters(clearedFilters)
    onChange(clearedFilters)
  }

  const getActiveFilterCount = () => {
    let count = 0
    if (tempFilters.search) count++
    if (tempFilters.employeeId) count++
    if (tempFilters.siteId) count++
    if (tempFilters.status) count++
    if (tempFilters.anomaliesOnly) count++
    if (tempFilters.lateOnly) count++
    if (tempFilters.overtimeOnly) count++
    return count
  }

  const activeFilterCount = getActiveFilterCount()

  return (
    <div className="space-y-4">
      {/* Quick Date Presets */}
      <div className="flex flex-wrap gap-2">
        <Label className="text-sm font-medium mb-1 w-full">Quick Date Ranges:</Label>
        {DATE_PRESETS.map((preset) => (
          <Button
            key={preset.label}
            variant="outline"
            size="sm"
            onClick={() => applyDatePreset(preset)}
            className={`text-xs ${
              tempFilters.dateFrom === preset.value.dateFrom && 
              tempFilters.dateTo === preset.value.dateTo
                ? 'bg-blue-50 border-blue-200 text-blue-700'
                : ''
            }`}
          >
            {preset.label}
          </Button>
        ))}
      </div>

      {/* Primary Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Search */}
        <div className="space-y-2">
          <Label htmlFor="search">Search</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              id="search"
              placeholder="Employee name or ID..."
              value={tempFilters.search || ''}
              onChange={(e) => updateFilter('search', e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Date From */}
        <div className="space-y-2">
          <Label>From Date</Label>
          <Popover open={showDateFromPicker} onOpenChange={setShowDateFromPicker}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-start text-left font-normal"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {tempFilters.dateFrom ? format(new Date(tempFilters.dateFrom), 'MMM dd, yyyy') : 'Select date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={tempFilters.dateFrom ? new Date(tempFilters.dateFrom) : undefined}
                onSelect={(date) => {
                  if (date) {
                    updateFilter('dateFrom', date.toISOString().split('T')[0])
                    setShowDateFromPicker(false)
                  }
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Date To */}
        <div className="space-y-2">
          <Label>To Date</Label>
          <Popover open={showDateToPicker} onOpenChange={setShowDateToPicker}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-start text-left font-normal"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {tempFilters.dateTo ? format(new Date(tempFilters.dateTo), 'MMM dd, yyyy') : 'Select date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={tempFilters.dateTo ? new Date(tempFilters.dateTo) : undefined}
                onSelect={(date) => {
                  if (date) {
                    updateFilter('dateTo', date.toISOString().split('T')[0])
                    setShowDateToPicker(false)
                  }
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Status Filter */}
        <div className="space-y-2">
          <Label>Status</Label>
          <Select
            value={tempFilters.status || ''}
            onValueChange={(value) => updateFilter('status', value || undefined)}
          >
            <SelectTrigger>
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Statuses</SelectItem>
              {STATUS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Advanced Filters Toggle */}
      <div className="flex items-center justify-between pt-2 border-t">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-sm"
        >
          <Filter className="h-4 w-4 mr-2" />
          Advanced Filters
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="ml-2 h-5 w-5 rounded-full p-0 text-xs">
              {activeFilterCount}
            </Badge>
          )}
        </Button>

        <div className="flex items-center gap-2">
          {activeFilterCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              <RotateCcw className="h-4 w-4 mr-1" />
              Clear All
            </Button>
          )}
        </div>
      </div>

      {/* Advanced Filters */}
      {showAdvanced && (
        <div className="space-y-4 p-4 bg-gray-50 rounded-lg border">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Employee ID Filter */}
            <div className="space-y-2">
              <Label htmlFor="employeeId">Employee ID</Label>
              <Input
                id="employeeId"
                placeholder="Enter employee ID..."
                value={tempFilters.employeeId || ''}
                onChange={(e) => updateFilter('employeeId', e.target.value)}
              />
            </div>

            {/* Site Filter */}
            <div className="space-y-2">
              <Label htmlFor="siteId">Site</Label>
              <Select
                value={tempFilters.siteId || ''}
                onValueChange={(value) => updateFilter('siteId', value || undefined)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All sites" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Sites</SelectItem>
                  {/* In a real app, these would come from an API */}
                  <SelectItem value="site1">Downtown Office</SelectItem>
                  <SelectItem value="site2">Shopping Mall</SelectItem>
                  <SelectItem value="site3">Industrial Complex</SelectItem>
                  <SelectItem value="site4">Hospital Campus</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Toggle Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Anomalies Only</Label>
                <p className="text-xs text-gray-600">Show records with detected anomalies</p>
              </div>
              <Switch
                checked={tempFilters.anomaliesOnly || false}
                onCheckedChange={(checked) => updateFilter('anomaliesOnly', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Late Arrivals Only</Label>
                <p className="text-xs text-gray-600">Show only late clock-ins</p>
              </div>
              <Switch
                checked={tempFilters.lateOnly || false}
                onCheckedChange={(checked) => updateFilter('lateOnly', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Overtime Only</Label>
                <p className="text-xs text-gray-600">Show overtime records</p>
              </div>
              <Switch
                checked={tempFilters.overtimeOnly || false}
                onCheckedChange={(checked) => updateFilter('overtimeOnly', checked)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Active Filters Display */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap gap-2 pt-2 border-t">
          <Label className="text-sm text-gray-600 mr-2">Active Filters:</Label>
          
          {tempFilters.search && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Search: "{tempFilters.search}"
              <Button
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0 hover:bg-transparent"
                onClick={() => updateFilter('search', undefined)}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}

          {tempFilters.status && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Status: {STATUS_OPTIONS.find(s => s.value === tempFilters.status)?.label}
              <Button
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0 hover:bg-transparent"
                onClick={() => updateFilter('status', undefined)}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}

          {tempFilters.anomaliesOnly && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Anomalies Only
              <Button
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0 hover:bg-transparent"
                onClick={() => updateFilter('anomaliesOnly', false)}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}

          {tempFilters.lateOnly && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Late Only
              <Button
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0 hover:bg-transparent"
                onClick={() => updateFilter('lateOnly', false)}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}

          {tempFilters.overtimeOnly && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Overtime Only
              <Button
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0 hover:bg-transparent"
                onClick={() => updateFilter('overtimeOnly', false)}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}
        </div>
      )}
    </div>
  )
}