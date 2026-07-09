'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  CalendarDays, 
  Clock, 
  Users, 
  Plus,
  Search,
  Filter,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  BarChart3,
  Grid3X3,
  List,
  Calendar
} from 'lucide-react';
import { ShiftCalendar } from '@/components/shifts/shift-calendar';
import { ShiftScheduler } from '@/components/shifts/shift-scheduler';
import { ShiftDailyView } from '@/components/shifts/shift-daily-view';
import { ShiftAvailabilityAnalysis } from '@/components/shifts/shift-availability-analysis';
import { BulkShiftOperations } from '@/components/shifts/bulk-shift-operations';
import { RecurringShiftDialog } from '@/components/shifts/recurring-shift-dialog';
import { ShiftSwapDialog } from '@/components/shifts/shift-swap-dialog';
import { ShiftWeeklyView } from '@/components/shifts/shift-weekly-view';
import { ShiftTemplateManager } from '@/components/shifts/shift-template-manager';
import { useApi } from '@/hooks/use-api';
import { format } from 'date-fns';
import type { Shift, Site, Employee, Assignment } from '@/types';

interface ShiftStats {
  totalShifts: number;
  scheduledShifts: number;
  completedShifts: number;
  cancelledShifts: number;
  shiftsNeedingCoverage: number;
  coveragePercentage: number;
}

interface ShiftResponse {
  shifts: Shift[];
  total: number;
  stats: ShiftStats;
}

export default function ShiftManagementPage() {
  const [activeView, setActiveView] = useState<'calendar' | 'daily' | 'weekly' | 'list' | 'scheduler' | 'analysis'>('calendar');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [siteFilter, setSiteFilter] = useState<string>('all');
  const [showRecurringDialog, setShowRecurringDialog] = useState(false);
  const [showSwapDialog, setShowSwapDialog] = useState(false);
  const [showBulkOperations, setShowBulkOperations] = useState(false);
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [selectedShifts, setSelectedShifts] = useState<Shift[]>([]);
  const [selectionMode, setSelectionMode] = useState(false);
  const [showTemplateManager, setShowTemplateManager] = useState(false);
  
  const shiftsQuery = useApi<ShiftResponse>({
    endpoint: '/shifts',
    params: {
      search: searchTerm || undefined,
      status: statusFilter !== 'all' ? statusFilter : undefined,
      siteId: siteFilter !== 'all' ? siteFilter : undefined,
      dateFrom: new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1).toISOString().split('T')[0],
      dateTo: new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0).toISOString().split('T')[0],
      limit: 100,
    }
  });

  const sitesQuery = useApi<Site[]>({
    endpoint: '/sites',
    params: { limit: 100 }
  });

  const employeesQuery = useApi<Employee[]>({
    endpoint: '/employees',
    params: { limit: 100 }
  });

  const assignmentsQuery = useApi<Assignment[]>({
    endpoint: '/assignments',
    params: { limit: 100 }
  });

  const coverageQuery = useApi<Shift[]>({
    endpoint: '/shifts/coverage-needed'
  });

  // Extract data from API responses with proper type checking
  const shiftsData = shiftsQuery.data?.data as ShiftResponse | undefined;
  const sites = (sitesQuery.data?.data as Site[]) || [];
  const employees = (employeesQuery.data?.data as Employee[]) || [];
  const assignments = (assignmentsQuery.data?.data as Assignment[]) || [];
  const shiftsNeedingCoverage = (coverageQuery.data?.data as Shift[]) || [];
  
  // Check if queries have refetch method (only queries, not mutations)
  const hasRefetch = (query: any): query is { refetch: () => void } => {
    return query && typeof query.refetch === 'function';
  };

  const shiftsLoading = shiftsQuery && 'isLoading' in shiftsQuery ? shiftsQuery.isLoading : false;

  const stats = shiftsData?.stats || {
    totalShifts: 0,
    scheduledShifts: 0,
    completedShifts: 0,
    cancelledShifts: 0,
    shiftsNeedingCoverage: 0,
    coveragePercentage: 0,
  };

  useEffect(() => {
    if (hasRefetch(shiftsQuery)) {
      shiftsQuery.refetch();
    }
  }, [selectedDate, searchTerm, statusFilter, siteFilter]);

  const handleShiftSelect = (shift: Shift) => {
    setSelectedShift(shift);
  };

  const handleCreateRecurringShift = () => {
    setShowRecurringDialog(true);
  };

  const handleShiftSwap = (shift: Shift) => {
    setSelectedShift(shift);
    setShowSwapDialog(true);
  };

  const handleRefresh = () => {
    if (hasRefetch(shiftsQuery)) {
      shiftsQuery.refetch();
    }
    if (hasRefetch(coverageQuery)) {
      coverageQuery.refetch();
    }
  };

  const handleShiftToggle = (shift: Shift, selected: boolean) => {
    if (selected) {
      setSelectedShifts(prev => [...prev, shift]);
    } else {
      setSelectedShifts(prev => prev.filter(s => s.id !== shift.id));
    }
  };

  const handleBulkOperations = () => {
    if (selectedShifts.length > 0) {
      setShowBulkOperations(true);
    }
  };

  const toggleSelectionMode = () => {
    setSelectionMode(!selectionMode);
    setSelectedShifts([]);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SCHEDULED': return 'bg-blue-100 text-blue-800';
      case 'CONFIRMED': return 'bg-green-100 text-green-800';
      case 'IN_PROGRESS': return 'bg-yellow-100 text-yellow-800';
      case 'COMPLETED': return 'bg-gray-100 text-gray-800';
      case 'CANCELLED': return 'bg-red-100 text-red-800';
      case 'NEEDS_COVERAGE': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Shift Management</h1>
          <p className="text-gray-600">Manage shifts, schedules, and coverage assignments</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={shiftsLoading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${shiftsLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowTemplateManager(true)}
          >
            <Grid3X3 className="w-4 h-4 mr-2" />
            Templates
          </Button>
          {selectionMode && selectedShifts.length > 0 && (
            <Button
              variant="outline"
              onClick={handleBulkOperations}
            >
              <Users className="w-4 h-4 mr-2" />
              Bulk Actions ({selectedShifts.length})
            </Button>
          )}
          <Button
            variant="outline"
            onClick={toggleSelectionMode}
          >
            {selectionMode ? 'Exit Selection' : 'Select Multiple'}
          </Button>
          <Button
            onClick={handleCreateRecurringShift}
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Recurring Shifts
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Shifts</p>
                <p className="text-2xl font-bold">{stats.totalShifts}</p>
              </div>
              <CalendarDays className="w-8 h-8 text-blue-600" />
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
              <Clock className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Coverage</p>
                <p className="text-2xl font-bold text-green-600">{stats.coveragePercentage}%</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Need Coverage</p>
                <p className="text-2xl font-bold text-orange-600">{stats.shiftsNeedingCoverage}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions Toolbar */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-gray-900">Quick Actions</h3>
              <p className="text-sm text-gray-600">Streamline your shift management workflow</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // Find shifts needing immediate coverage
                  const urgentShifts = shiftsData?.shifts.filter(s => 
                    s.status === 'NEEDS_COVERAGE' && 
                    new Date(s.shiftDate) <= new Date(Date.now() + 24 * 60 * 60 * 1000) // Next 24 hours
                  ) || [];
                  
                  if (urgentShifts.length > 0) {
                    alert(`Found ${urgentShifts.length} shifts needing coverage in the next 24 hours. Use the scheduler to assign coverage.`);
                    setActiveView('scheduler');
                  } else {
                    alert('No urgent coverage gaps found.');
                  }
                }}
              >
                <AlertTriangle className="w-4 h-4 mr-2" />
                Check Urgent Gaps
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // Auto-suggest optimal shift distribution
                  const totalShifts = shiftsData?.shifts.length || 0;
                  const coveredShifts = shiftsData?.shifts.filter(s => s.assignmentId).length || 0;
                  const coverageRate = totalShifts > 0 ? (coveredShifts / totalShifts * 100).toFixed(1) : '0';
                  
                  alert(`Current coverage: ${coverageRate}% (${coveredShifts}/${totalShifts} shifts covered)`);
                  setActiveView('analysis');
                }}
              >
                <BarChart3 className="w-4 h-4 mr-2" />
                Coverage Summary
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // Quick template application
                  setShowTemplateManager(true);
                }}
              >
                <Grid3X3 className="w-4 h-4 mr-2" />
                Apply Template
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4 items-center">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search shifts by site or employee..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="SCHEDULED">Scheduled</SelectItem>
                  <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                  <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                  <SelectItem value="NEEDS_COVERAGE">Needs Coverage</SelectItem>
                </SelectContent>
              </Select>

              <Select value={siteFilter} onValueChange={setSiteFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Site" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sites</SelectItem>
                  {sites?.map((site) => (
                    <SelectItem key={site.id} value={site.id}>
                      {site.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* View Toggle */}
      <div className="flex gap-2 flex-wrap">
        <Button
          variant={activeView === 'calendar' ? 'default' : 'outline'}
          onClick={() => setActiveView('calendar')}
          size="sm"
        >
          <Calendar className="w-4 h-4 mr-2" />
          Monthly Calendar
        </Button>
        <Button
          variant={activeView === 'weekly' ? 'default' : 'outline'}
          onClick={() => setActiveView('weekly')}
          size="sm"
        >
          <Grid3X3 className="w-4 h-4 mr-2" />
          Weekly View
        </Button>
        <Button
          variant={activeView === 'daily' ? 'default' : 'outline'}
          onClick={() => setActiveView('daily')}
          size="sm"
        >
          <Clock className="w-4 h-4 mr-2" />
          Daily View
        </Button>
        <Button
          variant={activeView === 'list' ? 'default' : 'outline'}
          onClick={() => setActiveView('list')}
          size="sm"
        >
          <List className="w-4 h-4 mr-2" />
          List View
        </Button>
        <Button
          variant={activeView === 'scheduler' ? 'default' : 'outline'}
          onClick={() => setActiveView('scheduler')}
          size="sm"
        >
          <Users className="w-4 h-4 mr-2" />
          Interactive Scheduler
        </Button>
        <Button
          variant={activeView === 'analysis' ? 'default' : 'outline'}
          onClick={() => setActiveView('analysis')}
          size="sm"
        >
          <BarChart3 className="w-4 h-4 mr-2" />
          Gap Analysis
        </Button>
      </div>

      {/* Main Content */}
      <div className="space-y-6">
        {activeView === 'calendar' && (
          <ShiftCalendar
            shifts={shiftsData?.shifts || []}
            selectedDate={selectedDate}
            onDateSelect={setSelectedDate}
            onShiftSelect={handleShiftSelect}
            onShiftSwap={handleShiftSwap}
            sites={sites}
            employees={employees}
            assignments={assignments}
            loading={shiftsLoading}
          />
        )}

        {activeView === 'weekly' && (
          <ShiftWeeklyView
            shifts={shiftsData?.shifts || []}
            selectedDate={selectedDate}
            onDateSelect={setSelectedDate}
            onShiftSelect={handleShiftSelect}
            onShiftSwap={handleShiftSwap}
            sites={sites}
            employees={employees}
            assignments={assignments}
            loading={shiftsLoading}
            onRefresh={handleRefresh}
          />
        )}

        {activeView === 'daily' && (
          <ShiftDailyView
            shifts={shiftsData?.shifts || []}
            selectedDate={selectedDate}
            onDateSelect={setSelectedDate}
            onShiftSelect={handleShiftSelect}
            onShiftSwap={handleShiftSwap}
            sites={sites}
            employees={employees}
            assignments={assignments}
            loading={shiftsLoading}
            onRefresh={handleRefresh}
          />
        )}

        {activeView === 'list' && (
          <Card>
            <CardHeader>
              <CardTitle>Shift List</CardTitle>
            </CardHeader>
            <CardContent>
              {shiftsLoading ? (
                <div className="flex justify-center p-8">
                  <RefreshCw className="w-6 h-6 animate-spin" />
                </div>
              ) : (
                <div className="space-y-2">
                  {shiftsData?.shifts.map((shift) => (
                    <div
                      key={shift.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
                      onClick={() => handleShiftSelect(shift)}
                    >
                      <div className="flex items-center gap-4">
                        {selectionMode && (
                          <input
                            type="checkbox"
                            checked={selectedShifts.some(s => s.id === shift.id)}
                            onChange={(e) => {
                              e.stopPropagation();
                              handleShiftToggle(shift, e.target.checked);
                            }}
                            className="w-4 h-4"
                          />
                        )}
                        <div>
                          <p className="font-medium">
                            {sites.find(s => s.id === shift.siteId)?.name || 'Unknown Site'}
                          </p>
                          <p className="text-sm text-gray-600">
                            {new Date(shift.shiftDate).toLocaleDateString()} • 
                            {new Date(`1970-01-01T${shift.startTime}`).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - 
                            {new Date(`1970-01-01T${shift.endTime}`).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={getStatusColor(shift.status)}>
                          {shift.status.replace('_', ' ')}
                        </Badge>
                        {shift.status === 'NEEDS_COVERAGE' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleShiftSwap(shift);
                            }}
                          >
                            Find Coverage
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                  {(!shiftsData?.shifts.length) && (
                    <div className="text-center p-8 text-gray-500">
                      No shifts found for the selected criteria
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {activeView === 'scheduler' && (
          <ShiftScheduler
            shifts={shiftsData?.shifts || []}
            sites={sites}
            employees={employees}
            assignments={assignments}
            onShiftCreate={() => hasRefetch(shiftsQuery) && shiftsQuery.refetch()}
            onShiftUpdate={() => hasRefetch(shiftsQuery) && shiftsQuery.refetch()}
            loading={shiftsLoading}
          />
        )}

        {activeView === 'analysis' && (
          <ShiftAvailabilityAnalysis
            shifts={shiftsData?.shifts || []}
            sites={sites}
            employees={employees}
            assignments={assignments}
            selectedDate={selectedDate}
            onDateSelect={setSelectedDate}
          />
        )}
      </div>

      {/* Enhanced Coverage Alert with Actions */}
      {shiftsNeedingCoverage && shiftsNeedingCoverage.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-orange-600" />
                <div>
                  <p className="font-medium text-orange-900">
                    {shiftsNeedingCoverage.length} shift(s) need coverage
                  </p>
                  <p className="text-sm text-orange-700">
                    Immediate action required to ensure adequate staffing
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="border-orange-300"
                  onClick={() => setActiveView('analysis')}
                >
                  View Analysis
                </Button>
                <Button
                  size="sm"
                  className="bg-orange-600 hover:bg-orange-700"
                  onClick={() => setActiveView('scheduler')}
                >
                  Auto-Assign
                </Button>
              </div>
            </div>
            {/* Quick coverage summary */}
            <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2">
              {shiftsNeedingCoverage.slice(0, 4).map((shift) => (
                <div key={shift.id} className="text-xs bg-white/50 p-2 rounded border border-orange-200">
                  <div className="font-medium">{sites.find(s => s.id === shift.siteId)?.name}</div>
                  <div className="text-orange-700">
                    {format(new Date(shift.shiftDate), 'MMM dd')} • {shift.startTime}
                  </div>
                </div>
              ))}
              {shiftsNeedingCoverage.length > 4 && (
                <div className="text-xs bg-white/50 p-2 rounded border border-orange-200 flex items-center justify-center">
                  <span className="font-medium">+{shiftsNeedingCoverage.length - 4} more</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dialogs */}
      <RecurringShiftDialog
        open={showRecurringDialog}
        onClose={() => setShowRecurringDialog(false)}
        sites={sites}
        assignments={assignments}
        onSuccess={() => {
          if (hasRefetch(shiftsQuery)) {
            shiftsQuery.refetch();
          }
          setShowRecurringDialog(false);
        }}
      />

      <ShiftSwapDialog
        open={showSwapDialog}
        onClose={() => {
          setShowSwapDialog(false);
          setSelectedShift(null);
        }}
        shift={selectedShift}
        employees={employees}
        assignments={assignments}
        onSuccess={() => {
          if (hasRefetch(shiftsQuery)) {
            shiftsQuery.refetch();
          }
          setShowSwapDialog(false);
          setSelectedShift(null);
        }}
      />

      <BulkShiftOperations
        open={showBulkOperations}
        onClose={() => {
          setShowBulkOperations(false);
          setSelectedShifts([]);
        }}
        selectedShifts={selectedShifts}
        sites={sites}
        assignments={assignments}
        onSuccess={() => {
          if (hasRefetch(shiftsQuery)) {
            shiftsQuery.refetch();
          }
          setShowBulkOperations(false);
          setSelectedShifts([]);
          setSelectionMode(false);
        }}
      />

      <ShiftTemplateManager
        open={showTemplateManager}
        onClose={() => setShowTemplateManager(false)}
        sites={sites}
        assignments={assignments}
        onTemplateApply={(templateId) => {
          if (hasRefetch(shiftsQuery)) {
            shiftsQuery.refetch();
          }
          setShowTemplateManager(false);
        }}
      />
    </div>
  );
}