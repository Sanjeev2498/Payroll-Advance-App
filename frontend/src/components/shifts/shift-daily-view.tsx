'use client';

import { useState, useMemo } from 'react';
import { 
  format, 
  addDays, 
  subDays, 
  startOfDay,
  isSameDay,
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
  MapPin,
  Settings,
  Edit,
  RotateCcw
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CreateShiftDialog } from './create-shift-dialog';
import { ShiftDetailsDialog } from './shift-details-dialog';
import type { Shift, Site, Employee, Assignment } from '@/types';

interface ShiftDailyViewProps {
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

interface TimeSlot {
  hour: number;
  shifts: Shift[];
}

export function ShiftDailyView({
  shifts,
  selectedDate,
  onDateSelect,
  onShiftSelect,
  onShiftSwap,
  sites,
  employees,
  assignments,
  loading = false,
  onRefresh
}: ShiftDailyViewProps) {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [viewMode, setViewMode] = useState<'timeline' | 'list'>('timeline');

  // Filter shifts for the selected date
  const dayShifts = useMemo(() => {
    return shifts.filter(shift => 
      isSameDay(new Date(shift.shiftDate), selectedDate)
    ).sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [shifts, selectedDate]);

  // Create timeline slots (24-hour view)
  const timelineSlots = useMemo((): TimeSlot[] => {
    const slots: TimeSlot[] = [];
    
    for (let hour = 0; hour < 24; hour++) {
      const hourShifts = dayShifts.filter(shift => {
        const startHour = parseInt(shift.startTime.split(':')[0]);
        const endHour = parseInt(shift.endTime.split(':')[0]);
        const endMinute = parseInt(shift.endTime.split(':')[1]);
        
        // Shift is active during this hour
        return startHour <= hour && (endHour > hour || (endHour === hour && endMinute > 0));
      });

      slots.push({
        hour,
        shifts: hourShifts,
      });
    }
    
    return slots;
  }, [dayShifts]);

  const handlePreviousDay = () => {
    onDateSelect(subDays(selectedDate, 1));
  };

  const handleNextDay = () => {
    onDateSelect(addDays(selectedDate, 1));
  };

  const handleCreateShift = () => {
    setShowCreateDialog(true);
  };

  const handleShiftClick = (shift: Shift) => {
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

  const formatHour = (hour: number) => {
    if (hour === 0) return '12 AM';
    if (hour === 12) return '12 PM';
    if (hour > 12) return `${hour - 12} PM`;
    return `${hour} AM`;
  };

  const getDayStats = () => {
    const totalShifts = dayShifts.length;
    const coverageNeeded = dayShifts.filter(s => s.status === 'NEEDS_COVERAGE').length;
    const activeShifts = dayShifts.filter(s => s.status === 'IN_PROGRESS').length;
    const scheduledShifts = dayShifts.filter(s => s.status === 'SCHEDULED' || s.status === 'CONFIRMED').length;
    
    return { totalShifts, coverageNeeded, activeShifts, scheduledShifts };
  };

  const stats = getDayStats();

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="flex justify-center">
            <div className="animate-pulse">Loading daily view...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {/* Header */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={handlePreviousDay}>
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onDateSelect(new Date())}
                  >
                    Today
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleNextDay}>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
                <div>
                  <CardTitle className={`text-xl ${isToday(selectedDate) ? 'text-blue-600' : ''}`}>
                    {format(selectedDate, 'EEEE, MMMM dd, yyyy')}
                    {isToday(selectedDate) && <span className="text-sm font-normal text-blue-600 ml-2">(Today)</span>}
                  </CardTitle>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Settings className="w-4 h-4 mr-2" />
                      View: {viewMode === 'timeline' ? 'Timeline' : 'List'}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => setViewMode('timeline')}>
                      Timeline View
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setViewMode('list')}>
                      List View
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                
                <Button variant="outline" size="sm" onClick={onRefresh}>
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Refresh
                </Button>
                
                <Button size="sm" onClick={handleCreateShift}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Shift
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Day Statistics */}
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Shifts</p>
                  <p className="text-2xl font-bold">{stats.totalShifts}</p>
                </div>
                <Clock className="w-6 h-6 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Active Now</p>
                  <p className="text-2xl font-bold text-green-600">{stats.activeShifts}</p>
                </div>
                <Users className="w-6 h-6 text-green-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Scheduled</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.scheduledShifts}</p>
                </div>
                <Clock className="w-6 h-6 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Need Coverage</p>
                  <p className="text-2xl font-bold text-orange-600">{stats.coverageNeeded}</p>
                </div>
                <AlertTriangle className="w-6 h-6 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        {viewMode === 'timeline' ? (
          /* Timeline View */
          <Card>
            <CardHeader>
              <CardTitle>24-Hour Timeline</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-96 overflow-y-auto">
                {timelineSlots.map((slot) => (
                  <div
                    key={slot.hour}
                    className={`
                      border-b border-gray-100 min-h-[60px] flex
                      ${slot.shifts.length > 0 ? 'bg-gray-50' : ''}
                    `}
                  >
                    {/* Time Column */}
                    <div className="w-20 flex-shrink-0 p-3 border-r border-gray-100 bg-white">
                      <div className="text-sm font-medium text-gray-600">
                        {formatHour(slot.hour)}
                      </div>
                    </div>
                    
                    {/* Shifts Column */}
                    <div className="flex-1 p-3">
                      {slot.shifts.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {slot.shifts.map((shift) => (
                            <div
                              key={shift.id}
                              className={`
                                inline-flex items-center gap-2 px-3 py-1 rounded-full border cursor-pointer
                                hover:shadow-sm transition-shadow text-sm
                                ${getStatusColor(shift.status)}
                              `}
                              onClick={() => handleShiftClick(shift)}
                            >
                              <MapPin className="w-3 h-3" />
                              <span className="font-medium">{getSiteName(shift.siteId)}</span>
                              <span className="text-xs">
                                {new Date(`1970-01-01T${shift.startTime}`).toLocaleTimeString([], { 
                                  hour: '2-digit', 
                                  minute: '2-digit' 
                                })} - 
                                {new Date(`1970-01-01T${shift.endTime}`).toLocaleTimeString([], { 
                                  hour: '2-digit', 
                                  minute: '2-digit' 
                                })}
                              </span>
                              {shift.assignmentId && (
                                <>
                                  <Users className="w-3 h-3" />
                                  <span className="text-xs">
                                    {getAssignedEmployee(shift.assignmentId)}
                                  </span>
                                </>
                              )}
                              {shift.status === 'NEEDS_COVERAGE' && (
                                <AlertTriangle className="w-3 h-3" />
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-sm text-gray-400 italic">No shifts scheduled</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : (
          /* List View */
          <Card>
            <CardHeader>
              <CardTitle>Shifts List</CardTitle>
            </CardHeader>
            <CardContent>
              {dayShifts.length > 0 ? (
                <div className="space-y-3">
                  {dayShifts.map((shift) => (
                    <div
                      key={shift.id}
                      className={`
                        p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors
                        ${getStatusColor(shift.status)}
                      `}
                      onClick={() => handleShiftClick(shift)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-medium text-lg">{getSiteName(shift.siteId)}</h4>
                            <Badge className={getStatusColor(shift.status)}>
                              {shift.status.replace('_', ' ')}
                            </Badge>
                          </div>
                          
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <div className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
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
                              <div className="flex items-center gap-1">
                                <Users className="w-4 h-4" />
                                {getAssignedEmployee(shift.assignmentId)}
                              </div>
                            )}
                            
                            <Badge variant="outline">
                              {shift.shiftType}
                            </Badge>
                          </div>
                          
                          {shift.notes && Object.keys(shift.notes).length > 0 && (
                            <div className="mt-2 text-sm text-gray-600">
                              <strong>Notes:</strong> {JSON.stringify(shift.notes)}
                            </div>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {shift.status === 'NEEDS_COVERAGE' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                onShiftSwap(shift);
                              }}
                            >
                              <AlertTriangle className="w-4 h-4 mr-1" />
                              Find Coverage
                            </Button>
                          )}
                          
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="sm" variant="outline">
                                <Edit className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuItem onClick={() => onShiftSelect(shift)}>
                                Edit Shift
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => onShiftSwap(shift)}>
                                Swap/Coverage
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Clock className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No shifts scheduled for this date</p>
                  <Button className="mt-4" onClick={handleCreateShift}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create First Shift
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Dialogs */}
      <CreateShiftDialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        selectedDate={selectedDate}
        sites={sites}
        assignments={assignments}
        onSuccess={() => {
          setShowCreateDialog(false);
          onRefresh();
        }}
      />

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
          onRefresh();
        }}
      />
    </>
  );
}