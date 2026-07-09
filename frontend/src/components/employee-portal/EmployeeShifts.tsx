'use client';

import { useEffect, useState } from 'react';
import { Calendar, Clock, MapPin, Filter, Eye } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useEmployeePortal, ShiftSchedule } from '@/hooks/use-employee-portal';
import { formatTime, formatDate } from '@/lib/utils';

const filterOptions = [
  { value: 'current', label: 'Current' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'past', label: 'Past' },
  { value: 'this_week', label: 'This Week' },
  { value: 'next_week', label: 'Next Week' },
  { value: 'custom', label: 'Custom Range' },
];

export function EmployeeShifts() {
  const { shifts, isLoading, error, fetchShifts } = useEmployeePortal();
  
  const [filter, setFilter] = useState('upcoming');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showCustomRange, setShowCustomRange] = useState(false);
  const [selectedShift, setSelectedShift] = useState<ShiftSchedule | null>(null);

  useEffect(() => {
    handleFilterChange(filter);
  }, []);

  const handleFilterChange = (newFilter: string) => {
    setFilter(newFilter);
    setShowCustomRange(newFilter === 'custom');
    
    if (newFilter !== 'custom') {
      fetchShifts(newFilter);
    }
  };

  const handleCustomRangeSubmit = () => {
    if (startDate && endDate) {
      fetchShifts('custom', startDate, endDate);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      SCHEDULED: { color: 'bg-blue-100 text-blue-800' },
      CONFIRMED: { color: 'bg-green-100 text-green-800' },
      IN_PROGRESS: { color: 'bg-yellow-100 text-yellow-800' },
      COMPLETED: { color: 'bg-gray-100 text-gray-800' },
      CANCELLED: { color: 'bg-red-100 text-red-800' },
      NO_SHOW: { color: 'bg-red-100 text-red-800' },
      NEEDS_COVERAGE: { color: 'bg-orange-100 text-orange-800' },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.SCHEDULED;
    
    return (
      <Badge className={config.color}>
        {status.replace('_', ' ')}
      </Badge>
    );
  };

  const getShiftTypeBadge = (type: string) => {
    const typeConfig = {
      REGULAR: { color: 'bg-gray-100 text-gray-800' },
      OVERTIME: { color: 'bg-purple-100 text-purple-800' },
      HOLIDAY: { color: 'bg-green-100 text-green-800' },
      EMERGENCY: { color: 'bg-red-100 text-red-800' },
      TRAINING: { color: 'bg-blue-100 text-blue-800' },
      MAINTENANCE: { color: 'bg-yellow-100 text-yellow-800' },
    };

    const config = typeConfig[type as keyof typeof typeConfig] || typeConfig.REGULAR;
    
    return (
      <Badge variant="outline" className={config.color}>
        {type}
      </Badge>
    );
  };

  const calculateDuration = (startTime: string, endTime: string) => {
    const start = new Date(`2000-01-01T${startTime}`);
    const end = new Date(`2000-01-01T${endTime}`);
    let diff = end.getTime() - start.getTime();
    
    // Handle overnight shifts
    if (diff < 0) {
      diff += 24 * 60 * 60 * 1000;
    }
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    return hours + (minutes > 0 ? ` hrs ${minutes} min` : ' hrs');
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-32 bg-gray-200 rounded-lg"></div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Shift Schedule</h1>
        <p className="text-gray-600">View your current and upcoming work schedules</p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filter Shifts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1">
              <Label htmlFor="filter">Time Period</Label>
              <Select value={filter} onValueChange={handleFilterChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select time period" />
                </SelectTrigger>
                <SelectContent>
                  {filterOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {showCustomRange && (
              <>
                <div className="flex-1">
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="flex-1">
                  <Label htmlFor="endDate">End Date</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
                <Button onClick={handleCustomRangeSubmit}>
                  Apply
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Shifts List */}
      <Card>
        <CardHeader>
          <CardTitle>Your Shifts</CardTitle>
          <CardDescription>
            {filter === 'upcoming' && 'Scheduled shifts coming up'}
            {filter === 'current' && 'Today\'s shifts'}
            {filter === 'past' && 'Recently completed shifts'}
            {filter === 'this_week' && 'This week\'s shifts'}
            {filter === 'next_week' && 'Next week\'s shifts'}
            {filter === 'custom' && 'Shifts in selected date range'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="text-center py-8">
              <p className="text-red-600">{error}</p>
              <Button variant="outline" onClick={() => handleFilterChange(filter)} className="mt-2">
                Retry
              </Button>
            </div>
          )}

          {shifts.length > 0 ? (
            <div className="space-y-4">
              {shifts.map((shift) => (
                <div key={shift.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-lg">{shift.siteName}</h3>
                        {getStatusBadge(shift.status)}
                        {getShiftTypeBadge(shift.shiftType)}
                      </div>
                      
                      <div className="flex items-center text-sm text-gray-600 mb-1">
                        <MapPin className="h-4 w-4 mr-1" />
                        {shift.siteAddress}
                      </div>
                      
                      <div className="flex items-center text-sm text-gray-600">
                        <Calendar className="h-4 w-4 mr-1" />
                        {formatDate(shift.shiftDate)}
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedShift(selectedShift?.id === shift.id ? null : shift)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      {selectedShift?.id === shift.id ? 'Hide' : 'Details'}
                    </Button>
                  </div>

                  <div className="grid md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="font-medium text-gray-700">Time</p>
                      <p className="text-gray-900 flex items-center">
                        <Clock className="h-4 w-4 mr-1" />
                        {formatTime(shift.startTime)} - {formatTime(shift.endTime)}
                      </p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-700">Duration</p>
                      <p className="text-gray-900">
                        {calculateDuration(shift.startTime, shift.endTime)}
                      </p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-700">Role</p>
                      <p className="text-gray-900">{shift.role}</p>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {selectedShift?.id === shift.id && (
                    <div className="mt-4 pt-4 border-t bg-gray-50 -mx-4 -mb-4 p-4 rounded-b-lg">
                      <div className="space-y-3">
                        <div>
                          <p className="font-medium text-gray-700 mb-1">Shift Requirements</p>
                          <div className="flex flex-wrap gap-2">
                            {shift.requiresCheckIn && (
                              <Badge variant="outline" className="bg-blue-50">Check-in Required</Badge>
                            )}
                          </div>
                        </div>

                        {shift.instructions && (
                          <div>
                            <p className="font-medium text-gray-700 mb-1">Special Instructions</p>
                            <p className="text-sm text-gray-600 bg-white p-2 rounded border">
                              {shift.instructions}
                            </p>
                          </div>
                        )}

                        <div className="flex justify-between items-center pt-2">
                          <div className="text-xs text-gray-500">
                            Shift ID: {shift.id}
                          </div>
                          
                          {(shift.status === 'SCHEDULED' || shift.status === 'CONFIRMED') && (
                            <div className="space-x-2">
                              {shift.requiresCheckIn && (
                                <Button size="sm" variant="outline">
                                  Request Change
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No shifts found</h3>
              <p className="text-gray-600">
                No shifts scheduled for the selected time period.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Stats */}
      {shifts.length > 0 && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Shifts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{shifts.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Hours</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {shifts.reduce((total, shift) => {
                  const start = new Date(`2000-01-01T${shift.startTime}`);
                  const end = new Date(`2000-01-01T${shift.endTime}`);
                  let diff = end.getTime() - start.getTime();
                  
                  if (diff < 0) {
                    diff += 24 * 60 * 60 * 1000;
                  }
                  
                  return total + (diff / (1000 * 60 * 60));
                }, 0).toFixed(1)}
              </div>
              <p className="text-xs text-muted-foreground">Hours scheduled</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Sites</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {new Set(shifts.map(shift => shift.siteName)).size}
              </div>
              <p className="text-xs text-muted-foreground">Different locations</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}