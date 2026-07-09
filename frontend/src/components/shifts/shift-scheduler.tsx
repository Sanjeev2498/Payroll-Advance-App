'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
// Note: Using click-based interactions instead of drag-drop for React 19 compatibility
import {
  Users,
  Clock,
  MapPin,
  AlertTriangle,
  Plus,
  Search,
  Calendar,
  CheckCircle2,
} from 'lucide-react';
import { format, addDays, startOfWeek, isSameDay } from 'date-fns';
import { CreateShiftDialog } from './create-shift-dialog';
import { useApi } from '@/hooks/use-api';
import type { Shift, Site, Employee, Assignment } from '@/types';

interface ShiftSchedulerProps {
  shifts: Shift[];
  sites: Site[];
  employees: Employee[];
  assignments: Assignment[];
  onShiftCreate: () => void;
  onShiftUpdate: () => void;
  loading?: boolean;
}

interface SchedulerColumn {
  id: string;
  title: string;
  date: Date;
  shifts: Shift[];
}

interface EmployeeAvailabilitySlot {
  employeeId: string;
  employeeName: string;
  assignment: Assignment;
  isAvailable: boolean;
  conflictingShifts: Shift[];
  skills: string[];
}

export function ShiftScheduler({
  shifts,
  sites,
  employees,
  assignments,
  onShiftCreate,
  onShiftUpdate,
  loading = false
}: ShiftSchedulerProps) {
  const [selectedWeek, setSelectedWeek] = useState(startOfWeek(new Date()));
  const [selectedSite, setSelectedSite] = useState<string>('all');
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const updateShiftMutation = useApi<any>({
    endpoint: '/shifts',
    method: 'PATCH',
  }) as any;

  // Generate week columns
  const weekColumns = useMemo((): SchedulerColumn[] => {
    const columns: SchedulerColumn[] = [];
    
    for (let i = 0; i < 7; i++) {
      const date = addDays(selectedWeek, i);
      const dayShifts = shifts.filter(shift => 
        isSameDay(new Date(shift.shiftDate), date) &&
        (selectedSite === 'all' || shift.siteId === selectedSite)
      );
      
      columns.push({
        id: `day-${i}`,
        title: format(date, 'EEE dd'),
        date,
        shifts: dayShifts,
      });
    }
    
    return columns;
  }, [selectedWeek, shifts, selectedSite]);

  // Get available employees for scheduling
  const availableEmployees = useMemo(() => {
    return employees.filter(employee => {
      if (selectedEmployee !== 'all' && employee.id !== selectedEmployee) {
        return false;
      }
      
      if (searchTerm && !`${employee.firstName} ${employee.lastName}`.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }
      
      return employee.employmentStatus === 'ACTIVE';
    });
  }, [employees, selectedEmployee, searchTerm]);

  // Get employee availability for each day
  const getEmployeeAvailability = (date: Date): EmployeeAvailabilitySlot[] => {
    return availableEmployees.map(employee => {
      const employeeAssignments = assignments.filter(a => a.employeeId === employee.id && a.status === 'ACTIVE');
      const dayShifts = shifts.filter(shift => 
        isSameDay(new Date(shift.shiftDate), date) && 
        employeeAssignments.some(a => a.id === shift.assignmentId)
      );
      
      return {
        employeeId: employee.id,
        employeeName: `${employee.firstName} ${employee.lastName}`,
        assignment: employeeAssignments[0], // Get primary assignment
        isAvailable: dayShifts.length === 0,
        conflictingShifts: dayShifts,
        skills: employee.skills || [],
      };
    });
  };

  const handleShiftClick = async (shift: Shift, targetDate: Date) => {
    if (window.confirm(`Move this shift to ${format(targetDate, 'PPP')}?`)) {
      try {
        await updateShiftMutation.mutateAsync({
          endpoint: `/shifts/${shift.id}`,
          data: {
            shiftDate: format(targetDate, 'yyyy-MM-dd'),
            modificationReason: {
              action: 'DATE_CHANGED',
              reason: 'Rescheduled via scheduler',
              changedBy: 'user',
            },
          },
        });

        onShiftUpdate();
      } catch (error) {
        console.error('Failed to update shift:', error);
      }
    }
  };

  const handleCreateShift = (date: Date) => {
    setSelectedDate(date);
    setShowCreateDialog(true);
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

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="flex justify-center">
            <div className="animate-pulse">Loading scheduler...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Scheduler Controls */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col lg:flex-row gap-4 items-center">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => setSelectedWeek(addDays(selectedWeek, -7))}
                >
                  Previous Week
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setSelectedWeek(startOfWeek(new Date()))}
                >
                  This Week
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setSelectedWeek(addDays(selectedWeek, 7))}
                >
                  Next Week
                </Button>
              </div>

              <div className="flex gap-2 flex-1">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search employees..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <Select value={selectedSite} onValueChange={setSelectedSite}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="All Sites" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sites</SelectItem>
                    {sites.map((site) => (
                      <SelectItem key={site.id} value={site.id}>
                        {site.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="All Employees" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Employees</SelectItem>
                    {employees.map((employee) => (
                      <SelectItem key={employee.id} value={employee.id}>
                        {employee.firstName} {employee.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Week Header */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Week of {format(selectedWeek, 'MMM dd, yyyy')}
            </CardTitle>
          </CardHeader>
        </Card>

        {/* Scheduler Grid */}
        <div className="grid grid-cols-7 gap-4">
          {weekColumns.map((column) => (
            <Card key={column.id} className="min-h-[600px]">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">
                    {column.title}
                  </CardTitle>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleCreateShift(column.date)}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-3 pt-0">
                <div className="min-h-[500px] space-y-2 rounded-lg transition-colors">
                  {/* Shifts for this day */}
                  {column.shifts.map((shift, index) => (
                    <div
                      key={shift.id}
                      className={`
                        p-3 rounded-lg border bg-white shadow-sm cursor-pointer transition-shadow hover:shadow-md
                        ${getStatusColor(shift.status)}
                      `}
                      onClick={() => {
                        // Allow rescheduling by clicking on a different day
                        const availableDays = weekColumns.filter(col => 
                          !isSameDay(col.date, new Date(shift.shiftDate))
                        );
                        if (availableDays.length > 0) {
                          // For now, just show shift details
                          console.log('Shift clicked:', shift);
                        }
                      }}
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-medium truncate">
                              {getSiteName(shift.siteId)}
                            </h4>
                            <div className="flex items-center gap-1 text-xs text-gray-600">
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
                          </div>
                          {shift.status === 'NEEDS_COVERAGE' && (
                            <AlertTriangle className="w-4 h-4 text-orange-600 flex-shrink-0" />
                          )}
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
                          {shift.coverageRequired > 1 && (
                            <Badge variant="outline" className="text-xs">
                              {shift.coverageAssigned || 0}/{shift.coverageRequired}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Employee Availability */}
                  {column.shifts.length === 0 && (
                    <div className="space-y-1">
                      <h5 className="text-xs font-medium text-gray-600 mb-2">Available Staff</h5>
                      {getEmployeeAvailability(column.date)
                        .filter(slot => slot.isAvailable)
                        .slice(0, 5)
                        .map((slot) => (
                        <div
                          key={slot.employeeId}
                          className="p-2 bg-green-50 border border-green-200 rounded text-xs"
                        >
                          <div className="flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-green-600" />
                            <span className="font-medium">{slot.employeeName}</span>
                          </div>
                          {slot.skills.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {slot.skills.slice(0, 2).map((skill) => (
                                <Badge key={skill} variant="outline" className="text-xs">
                                  {skill}
                                </Badge>
                              ))}
                              {slot.skills.length > 2 && (
                                <span className="text-xs text-gray-500">+{slot.skills.length - 2}</span>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Employee Availability Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Weekly Availability Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {availableEmployees.slice(0, 6).map((employee) => {
                const weekAvailability = weekColumns.map(column => {
                  const availability = getEmployeeAvailability(column.date)
                    .find(slot => slot.employeeId === employee.id);
                  return {
                    date: column.date,
                    isAvailable: availability?.isAvailable || false,
                    conflictCount: availability?.conflictingShifts.length || 0,
                  };
                });

                const availableDays = weekAvailability.filter(day => day.isAvailable).length;
                const totalShifts = weekAvailability.reduce((sum, day) => sum + day.conflictCount, 0);

                return (
                  <div key={employee.id} className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">{employee.firstName} {employee.lastName}</h4>
                      <Badge variant={availableDays >= 5 ? 'default' : availableDays >= 3 ? 'secondary' : 'destructive'}>
                        {availableDays}/7 available
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-600">
                      {totalShifts} shifts this week
                    </div>
                    <div className="flex gap-1 mt-2">
                      {weekAvailability.map((day, index) => (
                        <div
                          key={index}
                          className={`
                            w-6 h-6 rounded text-xs flex items-center justify-center
                            ${day.isAvailable 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                            }
                          `}
                          title={`${format(day.date, 'EEE')} - ${day.isAvailable ? 'Available' : `${day.conflictCount} shifts`}`}
                        >
                          {day.conflictCount || (day.isAvailable ? '✓' : '✗')}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Create Shift Dialog */}
      <CreateShiftDialog
        open={showCreateDialog}
        onClose={() => {
          setShowCreateDialog(false);
          setSelectedDate(null);
        }}
        selectedDate={selectedDate}
        sites={sites}
        assignments={assignments}
        onSuccess={() => {
          onShiftCreate();
          setShowCreateDialog(false);
          setSelectedDate(null);
        }}
      />
    </>
  );
}