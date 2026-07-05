'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { AttendanceFilter } from '@/types'
import { 
  Filter, 
  X, 
  Search,
  Calendar,
  MapPin,
  Users,
  Clock,
  AlertTriangle
} from 'lucide-react'

interface AttendanceFiltersProps {
  filters: AttendanceFilter
  onFiltersChange: (filters: AttendanceFilter) => void
  onReset: () => void
}

export const AttendanceFilters: React.FC<AttendanceFiltersProps> = ({
  filters,
  onFiltersChange,
  onReset
}) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const [tempFilters, setTempFilters] = useState<AttendanceFilter>(filters)

  const handleTempFilterChange = (key: keyof AttendanceFilter, value: any) => {
    setTempFilters(prev => ({ ...prev, [key]: value }))
  }

  const applyFilters = () => {
    onFiltersChange(tempFilters)
    setIsExpanded(false)
  }

  const resetFilters = () => {
    onReset()
    setTempFilters({
      dateFrom: new Date().toISOString().split('T')[0],
      dateTo: new Date().toISOString().split('T')[0],
      page: 1,
      limit: 50
    })
    setIsExpanded(false)
  }

  const getActiveFiltersCount = () => {
    let count = 0
    if (filters.search) count++
    if (filters.status) count++
    if (filters.siteId) count++
    if (filters.employeeId) count++
    if (filters.lateOnly) count++
    if (filters.overtimeOnly) count++
    if (filters.anomaliesOnly) count++
    return count
  }

  const activeFiltersCount = getActiveFiltersCount()

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Filter className="h-5 w-5" />
            Filters & Search
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {activeFiltersCount} active
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? 'Less Filters' : 'More Filters'}
            </Button>
            {activeFiltersCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={resetFilters}
              >
                <X className="h-4 w-4 mr-1" />
                Clear All
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Basic Filters - Always Visible */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Date Range */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">From Date</Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                type="date"
                value={tempFilters.dateFrom}
                onChange={(e) => handleTempFilterChange('dateFrom', e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">To Date</Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                type="date"
                value={tempFilters.dateTo}
                onChange={(e) => handleTempFilterChange('dateTo', e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Search */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Search</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Employee name, site..."
                value={tempFilters.search || ''}
                onChange={(e) => handleTempFilterChange('search', e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Status</Label>
            <Select 
              value={tempFilters.status || 'all'} 
              onValueChange={(value) => handleTempFilterChange('status', value === 'all' ? undefined : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="PRESENT">Present</SelectItem>
                <SelectItem value="LATE">Late</SelectItem>
                <SelectItem value="ABSENT">Absent</SelectItem>
                <SelectItem value="EARLY_DEPARTURE">Early Departure</SelectItem>
                <SelectItem value="OVERTIME">Overtime</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Advanced Filters - Expandable */}
        {isExpanded && (
          <>
            <Separator />
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Site Filter */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Site</Label>
                <Select 
                  value={tempFilters.siteId || 'all'} 
                  onValueChange={(value) => handleTempFilterChange('siteId', value === 'all' ? undefined : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All sites" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sites</SelectItem>
                    <SelectItem value="site-1">Downtown Office</SelectItem>
                    <SelectItem value="site-2">Shopping Mall</SelectItem>
                    <SelectItem value="site-3">Industrial Complex</SelectItem>
                    <SelectItem value="site-4">Hospital Campus</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Employee Filter */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Employee</Label>
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Employee ID or name..."
                    value={tempFilters.employeeId || ''}
                    onChange={(e) => handleTempFilterChange('employeeId', e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Time Range */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Time Range</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Any time" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any Time</SelectItem>
                    <SelectItem value="morning">Morning (6-12)</SelectItem>
                    <SelectItem value="afternoon">Afternoon (12-18)</SelectItem>
                    <SelectItem value="evening">Evening (18-24)</SelectItem>
                    <SelectItem value="night">Night (0-6)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Quick Filter Toggles */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Quick Filters</Label>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={tempFilters.lateOnly ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleTempFilterChange('lateOnly', !tempFilters.lateOnly)}
                  className="flex items-center gap-2"
                >
                  <Clock className="h-4 w-4" />
                  Late Arrivals Only
                </Button>
                
                <Button
                  variant={tempFilters.overtimeOnly ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleTempFilterChange('overtimeOnly', !tempFilters.overtimeOnly)}
                  className="flex items-center gap-2"
                >
                  <Clock className="h-4 w-4" />
                  Overtime Only
                </Button>
                
                <Button
                  variant={tempFilters.anomaliesOnly ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleTempFilterChange('anomaliesOnly', !tempFilters.anomaliesOnly)}
                  className="flex items-center gap-2"
                >
                  <AlertTriangle className="h-4 w-4" />
                  Anomalies Only
                </Button>
              </div>
            </div>

            {/* Location & Verification Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Location Verification</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Any verification status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any Status</SelectItem>
                    <SelectItem value="verified">GPS Verified</SelectItem>
                    <SelectItem value="unverified">Not Verified</SelectItem>
                    <SelectItem value="failed">Verification Failed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Hours Worked Range</Label>
                <div className="flex items-center gap-2">
                  <Input 
                    type="number" 
                    placeholder="Min hours" 
                    className="w-20" 
                    min="0" 
                    max="24"
                  />
                  <span className="text-gray-400">to</span>
                  <Input 
                    type="number" 
                    placeholder="Max hours" 
                    className="w-20" 
                    min="0" 
                    max="24"
                  />
                </div>
              </div>
            </div>
          </>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="text-sm text-gray-600">
            {activeFiltersCount > 0 && (
              <span>{activeFiltersCount} filter(s) active</span>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={resetFilters} size="sm">
              Reset
            </Button>
            <Button onClick={applyFilters} size="sm">
              Apply Filters
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}