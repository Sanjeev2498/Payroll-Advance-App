'use client';

import { useState, useMemo } from 'react';
import { format, addDays, eachDayOfInterval, startOfWeek, endOfWeek, addWeeks, isSameDay } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  Users, 
  AlertTriangle,
  Plus,
  MoreHorizontal,
  Calendar,
  Eye
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Shift, Site, Employee, Assignment } from '@/types';

interface ShiftWeeklyViewProps {
  shifts: Shift[];
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  onShiftSelect: (shift: Shift) => void;
  onShiftSwap: (shift: Shift) => void;
  sites: Site[];
  employees: Employee[];
  assignments: Assignment[];
  loading?: boolean;
  onRefresh: () => void;
}

interface DayColumn {
  date: Date;
  dayName: string;
  shifts: Shift[];
  totalHours: number;
  coverageStatus: 'good' | 'warning' | 'critical';
}

interface TimeSlot {
  hour: number;
  displayTime: string;
  shifts: { [dayIndex: number]: Shift[] };
}

export function ShiftWeeklyView({
  shifts,
  selectedDate,
  onDateSelect,
  onShiftSelect,
  onShiftSwap,
  sites,
  employees,
  assignments,
  loading = false,
  onRefresh,
}: ShiftWeeklyViewProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'timeline'>('grid');

  // Calculate week range
  const weekStart = startOfWeek(selectedDate);
  const weekEnd = endOfWeek(selectedDate);
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  // Filter shifts for the current week
  const weekShifts = useMemo(() => {
    return shifts.filter(shift => {
      const shiftDate = new Date(shift.shiftDate);
      return weekDays.some(day => isSameDay(shiftDate, day));
    });
  }, [shifts, weekDays]);

  // Organize shifts by day
  const dayColumns = useMemo((): DayColumn[] => {
    return weekDays.map(date => {
      const dayShifts = weekShifts.filter(shift => 
        isSameDay(new Date(shift.shiftDate), date)
      );

      const totalHours = dayShifts.reduce((sum, shift) => {
        const duration = calculateShiftDuration(shift.startTime, shift.endTime);
        return sum + duration;
      }, 0);

      const uncoveredShifts = dayShifts.filter(shift => 
        shift.status === 'NEEDS_COVERAGE' || !shift.assignmentId
      ).length;

      let coverageStatus: 'good' | 'warning' | 'critical' = 'good';
      if (uncoveredShifts > 0) {
        coverageStatus = uncoveredShifts > 2 ? 'critical' : 'warning';
      }

      return {
        date,
        dayName: format(date, 'EEEE'),
        shifts: dayShifts,
        totalHours,
        coverageStatus,
      };
    });
  }, [weekDays, weekShifts]);

  // Create timeline view with hourly slots
  const timeSlots = useMemo((): TimeSlot[] => {
    const slots: TimeSlot[] = [];
    
    for (let hour = 0; hour < 24; hour++) {
      const shifts: { [dayIndex: number]: Shift[] } = {};
      
      weekDays.forEach((date, dayIndex) => {
        const dayShifts = weekShifts.filter(shift => {
          if (!isSameDay(new Date(shift.shiftDate), date)) return false;
          
          const startHour = parseInt(shift.startTime.split(':')[0]);
          const endHour = parseInt(shift.endTime.split(':')[0]);
          
          // Check if shift spans this hour
          if (startHour <= endHour) {
            return hour >= startHour && hour < endHour;
          } else {
            // Overnight shift
            return hour >= startHour || hour < endHour;
          }
        });
        
        shifts[dayIndex] = dayShifts;
      });

      slots.push({
        hour,
        displayTime: format(new Date().setHours(hour, 0, 0, 0), 'HH:mm'),
        shifts,
      });
    }
    
    return slots;
  }, [weekDays, weekShifts]);

  const calculateShiftDuration = (startTime: string, endTime: string): number => {
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    
    const duration = endMinutes >= startMinutes 
      ? endMinutes - startMinutes 
      : (24 * 60) - startMinutes + endMinutes;
    
    return duration / 60;
  };

  const handlePreviousWeek = () => {
    onDateSelect(addWeeks(selectedDate, -1));
  };

  const handleNextWeek = () => {
    onDateSelect(addWeeks(selectedDate, 1));
  };

  const getSiteName = (siteId: string) => {
    return sites.find(site => site.id === siteId)?.name || 'Unknown Site';
  };

  const getEmployeeName = (assignmentId: string | null) => {
    if (!assignmentId) return null;
    const assignment = assignments.find(a => a.id === assignmentId);
    if (!assignment) return null;
    const employee = employees.find(e => e.id === assignment.employeeId);
    return employee ? `${employee.firstName} ${employee.lastName}` : null;
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

  const getCoverageStatusColor = (status: string) => {
    switch (status) {
      case 'good': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'critical': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="flex justify-center">
            <div className="animate-pulse">Loading weekly view...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Weekly Header */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="outline" size="sm" onClick={handlePreviousWeek}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <div className="text-center">
                <CardTitle className="text-xl">
                  {format(weekStart, 'MMM dd')} - {format(weekEnd, 'MMM dd, yyyy')}
                </CardTitle>
                <p className="text-sm text-gray-600">Week View</p>
              </div>
              <Button variant="outline" size="sm" onClick={handleNextWeek}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('grid')}
              >
                <Calendar className="w-4 h-4 mr-2" />
                Grid View
              </Button>
              <Button
                variant={viewMode === 'timeline' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('timeline')}
              >
                <Clock className="w-4 h-4 mr-2" />
                Timeline
              </Button>
              <Button variant="outline" size="sm" onClick={onRefresh}>
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Week Summary Stats */}
      <div className="grid grid-cols-7 gap-4">
        {dayColumns.map((day, index) => (
          <Card key={index} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-medium">
                    {format(day.date, 'EEE')}
                  </CardTitle>
                  <p className="text-xs text-gray-600">
                    {format(day.date, 'MMM dd')}
                  </p>
                </div>
                <div className={`text-xs font-medium ${getCoverageStatusColor(day.coverageStatus)}`}>
                  {day.shifts.length} shifts
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-center">
                <div className="text-2xl font-bold">{day.totalHours.toFixed(1)}h</div>
                <div className="text-xs text-gray-600">Total Hours</div>
                <Progress 
                  value={Math.min((day.totalHours / 24) * 100, 100)} 
                  className="mt-2 h-1"
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {viewMode === 'grid' ? (
        /* Grid View */
        <div className="grid grid-cols-7 gap-4">
          {dayColumns.map((day, dayIndex) => (
            <Card key={dayIndex} className="min-h-[500px]">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm">{day.dayName}</CardTitle>
                    <p className="text-xs text-gray-600">{format(day.date, 'MMM dd')}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => console.log('Create shift for', day.date)}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-3 pt-0">
                <div className="space-y-2">
                  {day.shifts.map((shift) => (
                    <div
                      key={shift.id}
                      className={`p-3 rounded-lg border cursor-pointer hover:shadow-md transition-shadow ${getStatusColor(shift.status)}`}
                      onClick={() => onShiftSelect(shift)}
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between">
                          <h4 className="text-sm font-medium truncate">
                            {getSiteName(shift.siteId)}
                          </h4>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                                <MoreHorizontal className="w-3 h-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => onShiftSelect(shift)}>
                                <Eye className="w-4 h-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => onShiftSwap(shift)}>
                                <Users className="w-4 h-4 mr-2" />
                                Find Coverage
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-red-600">
                                Cancel Shift
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        <div className="flex items-center gap-1 text-xs">
                          <Clock className="w-3 h-3" />
                          {new Date(`1970-01-01T${shift.startTime}`).toLocaleTimeString([], { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })} - 
                          {new Date(`1970-01-01T${shift.endTime}`).toLocaleTimeString([], { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </div>

                        {shift.assignmentId && (
                          <div className="flex items-center gap-1 text-xs">
                            <Users className="w-3 h-3" />
                            <span className="truncate">
                              {getEmployeeName(shift.assignmentId)}
                            </span>
                          </div>
                        )}

                        <div className="flex items-center justify-between">
                          <Badge variant="secondary" className="text-xs">
                            {shift.shiftType}
                          </Badge>
                          {shift.status === 'NEEDS_COVERAGE' && (
                            <AlertTriangle className="w-4 h-4 text-orange-600" />
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  {day.shifts.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <div className="text-sm">No shifts scheduled</div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        /* Timeline View */
        <Card>
          <CardHeader>
            <CardTitle>Weekly Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <div className="grid grid-cols-8 gap-2 min-w-[800px]">
                {/* Header */}
                <div className="font-medium text-sm">Time</div>
                {weekDays.map((day, index) => (
                  <div key={index} className="text-center">
                    <div className="font-medium text-sm">{format(day, 'EEE')}</div>
                    <div className="text-xs text-gray-600">{format(day, 'MMM dd')}</div>
                  </div>
                ))}

                {/* Time slots */}
                {timeSlots.map((slot) => (
                  <>
                    <div key={`time-${slot.hour}`} className="text-xs text-gray-600 py-1">
                      {slot.displayTime}
                    </div>
                    {weekDays.map((_, dayIndex) => (
                      <div key={`${slot.hour}-${dayIndex}`} className="min-h-[40px] border-t border-gray-100">
                        <div className="space-y-1">
                          {slot.shifts[dayIndex]?.map((shift) => (
                            <div
                              key={shift.id}
                              className={`text-xs p-1 rounded cursor-pointer ${getStatusColor(shift.status)}`}
                              onClick={() => onShiftSelect(shift)}
                            >
                              <div className="truncate">{getSiteName(shift.siteId)}</div>
                              {shift.assignmentId && (
                                <div className="truncate text-xs opacity-75">
                                  {getEmployeeName(shift.assignmentId)}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}