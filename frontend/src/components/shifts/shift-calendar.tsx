'use client';

import { useState, useMemo } from 'react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameDay,
  isSameMonth,
  addMonths,
  subMonths,
  isToday
} from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Users,
  Clock,
  AlertTriangle,
  MoreHorizontal
} from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CreateShiftDialog } from './create-shift-dialog';
import { ShiftDetailsDialog } from './shift-details-dialog';
import type { Shift, Site, Employee, Assignment } from '@/types';

interface ShiftCalendarProps {
  shifts: Shift[];
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  onShiftSelect: (shift: Shift) => void;
  onShiftSwap: (shift: Shift) => void;
  sites: Site[];
  employees: Employee[];
  assignments: Assignment[];
  loading?: boolean;
}

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  shifts: Shift[];
}

export function ShiftCalendar({
  shifts,
  selectedDate,
  onDateSelect,
  onShiftSelect,
  onShiftSwap,
  sites,
  employees,
  assignments,
  loading = false
}: ShiftCalendarProps) {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [selectedDayForNew, setSelectedDayForNew] = useState<Date | null>(null);

  // Calendar calculations
  const monthStart = startOfMonth(selectedDate);
  const monthEnd = endOfMonth(selectedDate);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  
  const calendarDays = useMemo(() => {
    const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
    
    return days.map((date): CalendarDay => {
      const dayShifts = shifts.filter(shift => 
        isSameDay(new Date(shift.shiftDate), date)
      );

      return {
        date,
        isCurrentMonth: isSameMonth(date, selectedDate),
        isToday: isToday(date),
        shifts: dayShifts,
      };
    });
  }, [calendarStart, calendarEnd, selectedDate, shifts]);

  const handlePreviousMonth = () => {
    onDateSelect(subMonths(selectedDate, 1));
  };

  const handleNextMonth = () => {
    onDateSelect(addMonths(selectedDate, 1));
  };

  const handleDateClick = (date: Date) => {
    onDateSelect(date);
  };

  const handleCreateShift = (date: Date) => {
    setSelectedDayForNew(date);
    setShowCreateDialog(true);
  };

  const handleShiftClick = (shift: Shift, event: React.MouseEvent) => {
    event.stopPropagation();
    setSelectedShift(shift);
    setShowDetailsDialog(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SCHEDULED': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'CONFIRMED': return 'bg-green-100 text-green-800 border-green-200';
      case 'IN_PROGRESS': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'COMPLETED': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'CANCELLED': return 'bg-red-100 text-red-800 border-red-200';
      case 'NEEDS_COVERAGE': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getShiftTypeColor = (type: string) => {
    switch (type) {
      case 'REGULAR': return 'bg-blue-50';
      case 'OVERTIME': return 'bg-purple-50';
      case 'HOLIDAY': return 'bg-green-50';
      case 'EMERGENCY': return 'bg-red-50';
      default: return 'bg-gray-50';
    }
  };

  const getSiteName = (siteId: string) => {
    return sites.find(site => site.id === siteId)?.name || 'Unknown Site';
  };

  const getAssignedEmployee = (assignmentId: string | null) => {
    if (!assignmentId) return null;
    const assignment = assignments.find(a => a.id === assignmentId);
    if (!assignment) return null;
    const employee = employees.find(e => e.id === assignment.employeeId);
    return employee ? `${employee.firstName} ${employee.lastName}` : null;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="flex justify-center">
            <div className="animate-pulse">Loading calendar...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl">
              {format(selectedDate, 'MMMM yyyy')}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePreviousMonth}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onDateSelect(new Date())}
              >
                Today
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNextMonth}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {/* Calendar Grid */}
          <div className="grid grid-cols-7 border-t">
            {/* Day Headers */}
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="p-2 text-center text-sm font-medium bg-gray-50 border-b border-r">
                {day}
              </div>
            ))}

            {/* Calendar Days */}
            {calendarDays.map((calendarDay, index) => (
              <div
                key={calendarDay.date.toISOString()}
                className={`
                  group min-h-[120px] border-b border-r cursor-pointer hover:bg-gray-50 transition-colors
                  ${!calendarDay.isCurrentMonth ? 'bg-gray-50/50 text-gray-400' : ''}
                  ${calendarDay.isToday ? 'bg-blue-50' : ''}
                `}
                onClick={() => handleDateClick(calendarDay.date)}
              >
                <div className="p-2">
                  {/* Enhanced Quick Actions */}
                  <div className="flex items-center justify-between mb-1">
                    <span className={`
                      text-sm font-medium
                      ${calendarDay.isToday ? 'bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center' : ''}
                    `}>
                      {format(calendarDay.date, 'd')}
                    </span>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 hover:opacity-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCreateShift(calendarDay.date);
                        }}
                        title="Create new shift"
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                      {calendarDay.shifts.some(s => s.status === 'NEEDS_COVERAGE') && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0 text-orange-600 opacity-75 hover:opacity-100"
                          onClick={(e) => {
                            e.stopPropagation();
                            const needsCoverage = calendarDay.shifts.find(s => s.status === 'NEEDS_COVERAGE');
                            if (needsCoverage) onShiftSwap(needsCoverage);
                          }}
                          title="Find coverage for uncovered shifts"
                        >
                          <Users className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Shifts for this day */}
                  <div className="space-y-1">
                    {calendarDay.shifts.slice(0, 3).map((shift) => (
                      <div
                        key={shift.id}
                        className={`
                          text-xs p-1 rounded border cursor-pointer hover:shadow-sm transition-shadow
                          ${getStatusColor(shift.status)}
                          ${getShiftTypeColor(shift.shiftType)}
                        `}
                        onClick={(e) => handleShiftClick(shift, e)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="truncate flex-1">
                            <div className="font-medium truncate">
                              {getSiteName(shift.siteId)}
                            </div>
                            <div className="flex items-center gap-1 text-xs opacity-75">
                              <Clock className="w-3 h-3" />
                              {new Date(`1970-01-01T${shift.startTime}`).toLocaleTimeString([], { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}
                            </div>
                            {shift.assignmentId && (
                              <div className="flex items-center gap-1 text-xs opacity-75">
                                <Users className="w-3 h-3" />
                                <span className="truncate">
                                  {getAssignedEmployee(shift.assignmentId) || 'Assigned'}
                                </span>
                              </div>
                            )}
                          </div>
                          {shift.status === 'NEEDS_COVERAGE' && (
                            <AlertTriangle className="w-3 h-3 text-orange-600 ml-1" />
                          )}
                        </div>
                      </div>
                    ))}

                    {/* Show more indicator */}
                    {calendarDay.shifts.length > 3 && (
                      <Popover>
                        <PopoverTrigger asChild>
                          <div className="text-xs text-gray-600 hover:text-gray-800 cursor-pointer p-1 text-center">
                            +{calendarDay.shifts.length - 3} more
                          </div>
                        </PopoverTrigger>
                        <PopoverContent className="w-80 p-0" side="right">
                          <div className="p-3">
                            <div className="font-medium mb-2">
                              All shifts for {format(calendarDay.date, 'MMM dd')}
                            </div>
                            <div className="space-y-2 max-h-60 overflow-y-auto">
                              {calendarDay.shifts.map((shift) => (
                                <div
                                  key={shift.id}
                                  className={`
                                    text-xs p-2 rounded border cursor-pointer hover:shadow-sm
                                    ${getStatusColor(shift.status)}
                                  `}
                                  onClick={() => handleShiftClick(shift, {} as any)}
                                >
                                  <div className="font-medium">{getSiteName(shift.siteId)}</div>
                                  <div className="flex items-center justify-between text-xs opacity-75">
                                    <span>
                                      {new Date(`1970-01-01T${shift.startTime}`).toLocaleTimeString([], { 
                                        hour: '2-digit', 
                                        minute: '2-digit' 
                                      })} - 
                                      {new Date(`1970-01-01T${shift.endTime}`).toLocaleTimeString([], { 
                                        hour: '2-digit', 
                                        minute: '2-digit' 
                                      })}
                                    </span>
                                    <Badge variant="secondary" className="text-xs">
                                      {shift.status.replace('_', ' ')}
                                    </Badge>
                                  </div>
                                  {shift.assignmentId && (
                                    <div className="text-xs opacity-75">
                                      {getAssignedEmployee(shift.assignmentId) || 'Assigned'}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Create Shift Dialog */}
      <CreateShiftDialog
        open={showCreateDialog}
        onClose={() => {
          setShowCreateDialog(false);
          setSelectedDayForNew(null);
        }}
        selectedDate={selectedDayForNew}
        sites={sites}
        assignments={assignments}
        onSuccess={() => {
          setShowCreateDialog(false);
          setSelectedDayForNew(null);
          // Refresh will be handled by parent component
        }}
      />

      {/* Shift Details Dialog */}
      <ShiftDetailsDialog
        open={showDetailsDialog}
        onClose={() => {
          setShowDetailsDialog(false);
          setSelectedShift(null);
        }}
        shift={selectedShift}
        sites={sites}
        employees={employees}
        assignments={assignments}
        onEdit={onShiftSelect}
        onSwap={onShiftSwap}
        onUpdate={() => {
          // Refresh will be handled by parent component
        }}
      />
    </>
  );
}