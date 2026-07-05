'use client'

import React, { useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Attendance } from '@/types'
import { 
  Clock, 
  MapPin, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  MoreVertical,
  Edit,
  FileText,
  Timer,
  Calendar
} from 'lucide-react'
import { format, parseISO, differenceInMinutes, differenceInHours } from 'date-fns'

interface AttendanceTableProps {
  data: Attendance[]
  loading: boolean
  pagination?: {
    page: number
    limit: number
    total: number
    hasNext: boolean
    hasPrevious: boolean
  }
  onPageChange?: (page: number) => void
  onRowClick?: (attendance: Attendance) => void
  onEdit?: (attendance: Attendance) => void
  onRequestCorrection?: (attendance: Attendance) => void
}

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'PRESENT':
        return { variant: 'success' as const, icon: CheckCircle, label: 'Present' }
      case 'LATE':
        return { variant: 'warning' as const, icon: AlertTriangle, label: 'Late' }
      case 'ABSENT':
        return { variant: 'destructive' as const, icon: XCircle, label: 'Absent' }
      case 'EARLY_DEPARTURE':
        return { variant: 'warning' as const, icon: Timer, label: 'Early Departure' }
      case 'OVERTIME':
        return { variant: 'default' as const, icon: Timer, label: 'Overtime' }
      case 'PENDING':
        return { variant: 'secondary' as const, icon: Clock, label: 'Pending' }
      default:
        return { variant: 'secondary' as const, icon: Clock, label: status }
    }
  }

  const config = getStatusConfig(status)
  const Icon = config.icon

  return (
    <Badge variant={config.variant} className="flex items-center gap-1">
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  )
}

const LocationIndicator: React.FC<{ locationData?: Record<string, any> }> = ({ locationData }) => {
  if (!locationData) return null

  const hasLocation = locationData.clockIn?.latitude && locationData.clockIn?.longitude
  const isVerified = locationData.verified === true

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded ${
            isVerified ? 'bg-green-100 text-green-700' : 
            hasLocation ? 'bg-yellow-100 text-yellow-700' : 
            'bg-gray-100 text-gray-600'
          }`}>
            <MapPin className="h-3 w-3" />
            {isVerified ? 'Verified' : hasLocation ? 'GPS' : 'No Location'}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-xs">
            {isVerified ? 'Location verified at site' : 
             hasLocation ? 'GPS coordinates captured' : 
             'No location data available'}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

const TimeCell: React.FC<{ 
  time?: string
  scheduledTime?: string
  type: 'clockIn' | 'clockOut'
}> = ({ time, scheduledTime, type }) => {
  if (!time) return <span className="text-gray-400">--</span>

  const actualTime = parseISO(time)
  const displayTime = format(actualTime, 'HH:mm')
  
  let variance = null
  let isLate = false
  let isEarly = false

  if (scheduledTime) {
    const scheduled = parseISO(scheduledTime)
    const diffMinutes = differenceInMinutes(actualTime, scheduled)
    
    if (type === 'clockIn' && diffMinutes > 15) {
      isLate = true
      variance = `+${diffMinutes}m`
    } else if (type === 'clockOut' && diffMinutes < -15) {
      isEarly = true
      variance = `${diffMinutes}m`
    }
  }

  return (
    <div className="flex flex-col">
      <span className={`font-medium ${isLate || isEarly ? 'text-red-600' : 'text-gray-900'}`}>
        {displayTime}
      </span>
      {variance && (
        <span className={`text-xs ${isLate ? 'text-red-500' : 'text-yellow-600'}`}>
          {variance}
        </span>
      )}
    </div>
  )
}

const HoursWorked: React.FC<{ 
  clockIn?: string
  clockOut?: string
  scheduledHours?: number
}> = ({ clockIn, clockOut, scheduledHours }) => {
  if (!clockIn || !clockOut) {
    return <span className="text-gray-400">--</span>
  }

  const start = parseISO(clockIn)
  const end = parseISO(clockOut)
  const minutesWorked = differenceInMinutes(end, start)
  const hoursWorked = Math.round((minutesWorked / 60) * 100) / 100 // Round to 2 decimal places
  
  const isOvertime = scheduledHours && hoursWorked > scheduledHours
  const overtimeHours = isOvertime ? hoursWorked - scheduledHours! : 0

  return (
    <div className="flex flex-col">
      <span className="font-medium text-gray-900">
        {hoursWorked.toFixed(1)}h
      </span>
      {isOvertime && (
        <span className="text-xs text-orange-600">
          +{overtimeHours.toFixed(1)}h OT
        </span>
      )}
    </div>
  )
}

export const AttendanceTable: React.FC<AttendanceTableProps> = ({
  data,
  loading,
  pagination,
  onPageChange,
  onRowClick,
  onEdit,
  onRequestCorrection
}) => {
  const [selectedRows, setSelectedRows] = useState<string[]>([])

  if (loading) {
    return (
      <div className="space-y-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Site</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Clock In</TableHead>
              <TableHead>Clock Out</TableHead>
              <TableHead>Hours</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Location</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...Array(5)].map((_, i) => (
              <TableRow key={i}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 bg-gray-200 rounded-full animate-pulse" />
                    <div className="h-4 bg-gray-200 rounded w-24 animate-pulse" />
                  </div>
                </TableCell>
                <TableCell><div className="h-4 bg-gray-200 rounded w-20 animate-pulse" /></TableCell>
                <TableCell><div className="h-4 bg-gray-200 rounded w-16 animate-pulse" /></TableCell>
                <TableCell><div className="h-4 bg-gray-200 rounded w-12 animate-pulse" /></TableCell>
                <TableCell><div className="h-4 bg-gray-200 rounded w-12 animate-pulse" /></TableCell>
                <TableCell><div className="h-4 bg-gray-200 rounded w-10 animate-pulse" /></TableCell>
                <TableCell><div className="h-6 bg-gray-200 rounded w-16 animate-pulse" /></TableCell>
                <TableCell><div className="h-6 bg-gray-200 rounded w-12 animate-pulse" /></TableCell>
                <TableCell><div className="h-8 w-8 bg-gray-200 rounded animate-pulse" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Calendar className="h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Attendance Records</h3>
        <p className="text-gray-600 mb-4">No attendance data found for the selected period.</p>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Refresh
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Employee</TableHead>
            <TableHead>Site</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Clock In</TableHead>
            <TableHead>Clock Out</TableHead>
            <TableHead>Hours</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Location</TableHead>
            <TableHead className="w-10"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((attendance) => {
            const employee = attendance.employee
            const shift = attendance.shift
            const site = shift?.site

            return (
              <TableRow
                key={attendance.id}
                className="cursor-pointer hover:bg-gray-50"
                onClick={() => onRowClick?.(attendance)}
              >
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs">
                        {employee?.firstName?.[0]}{employee?.lastName?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="font-medium text-sm">
                        {employee?.firstName} {employee?.lastName}
                      </span>
                      <span className="text-xs text-gray-500">
                        {employee?.employeeNumber}
                      </span>
                    </div>
                  </div>
                </TableCell>

                <TableCell>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{site?.name}</span>
                    <span className="text-xs text-gray-500">{site?.client?.name}</span>
                  </div>
                </TableCell>

                <TableCell>
                  <div className="flex flex-col">
                    <span className="text-sm">
                      {shift?.shiftDate ? format(parseISO(shift.shiftDate), 'MMM dd') : '--'}
                    </span>
                    <span className="text-xs text-gray-500">
                      {shift?.startTime}-{shift?.endTime}
                    </span>
                  </div>
                </TableCell>

                <TableCell>
                  <TimeCell
                    time={attendance.clockIn}
                    scheduledTime={shift ? `${shift.shiftDate}T${shift.startTime}` : undefined}
                    type="clockIn"
                  />
                </TableCell>

                <TableCell>
                  <TimeCell
                    time={attendance.clockOut}
                    scheduledTime={shift ? `${shift.shiftDate}T${shift.endTime}` : undefined}
                    type="clockOut"
                  />
                </TableCell>

                <TableCell>
                  <HoursWorked
                    clockIn={attendance.clockIn}
                    clockOut={attendance.clockOut}
                    scheduledHours={8} // Could be calculated from shift times
                  />
                </TableCell>

                <TableCell>
                  <StatusBadge status={attendance.status} />
                </TableCell>

                <TableCell>
                  <LocationIndicator locationData={attendance.locationData} />
                </TableCell>

                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onRowClick?.(attendance)}>
                        <FileText className="h-4 w-4 mr-2" />
                        View Details
                      </DropdownMenuItem>
                      {onEdit && (
                        <DropdownMenuItem onClick={() => onEdit(attendance)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit Record
                        </DropdownMenuItem>
                      )}
                      {onRequestCorrection && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => onRequestCorrection(attendance)}>
                            <AlertTriangle className="h-4 w-4 mr-2" />
                            Request Correction
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>

      {/* Pagination */}
      {pagination && pagination.total > pagination.limit && (
        <div className="flex items-center justify-between px-4 py-3 bg-white border-t">
          <div className="flex items-center text-sm text-gray-700">
            Showing{' '}
            <span className="font-medium mx-1">
              {((pagination.page - 1) * pagination.limit) + 1}
            </span>
            to{' '}
            <span className="font-medium mx-1">
              {Math.min(pagination.page * pagination.limit, pagination.total)}
            </span>
            of{' '}
            <span className="font-medium mx-1">{pagination.total}</span>
            results
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange?.(pagination.page - 1)}
              disabled={!pagination.hasPrevious}
            >
              Previous
            </Button>
            
            <span className="text-sm text-gray-700">
              Page {pagination.page} of {Math.ceil(pagination.total / pagination.limit)}
            </span>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange?.(pagination.page + 1)}
              disabled={!pagination.hasNext}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}