'use client';

import { useEffect, useState } from 'react';
import { Calendar, Clock, MapPin, Filter, Download, CheckCircle, XCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useEmployeePortal } from '@/hooks/use-employee-portal';
import { formatTime, formatDate } from '@/lib/utils';

const filterOptions = [
  { value: 'today', label: 'Today' },
  { value: 'this_week', label: 'This Week' },
  { value: 'this_month', label: 'This Month' },
  { value: 'custom', label: 'Custom Range' },
];

export function EmployeeAttendance() {
  const { 
    attendanceRecords, 
    attendanceSummary, 
    isLoading, 
    error, 
    fetchAttendance 
  } = useEmployeePortal();

  const [filter, setFilter] = useState('this_month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showCustomRange, setShowCustomRange] = useState(false);

  useEffect(() => {
    handleFilterChange(filter);
  }, []);

  const handleFilterChange = (newFilter: string) => {
    setFilter(newFilter);
    setShowCustomRange(newFilter === 'custom');
    
    if (newFilter !== 'custom') {
      fetchAttendance(newFilter);
    }
  };

  const handleCustomRangeSubmit = () => {
    if (startDate && endDate) {
      fetchAttendance('custom', startDate, endDate);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      PRESENT: { variant: 'default', color: 'bg-green-100 text-green-800' },
      ABSENT: { variant: 'destructive', color: 'bg-red-100 text-red-800' },
      LATE: { variant: 'secondary', color: 'bg-yellow-100 text-yellow-800' },
      EARLY_DEPARTURE: { variant: 'secondary', color: 'bg-orange-100 text-orange-800' },
      OVERTIME: { variant: 'outline', color: 'bg-blue-100 text-blue-800' },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.PRESENT;
    
    return (
      <Badge className={config.color}>
        {status.replace('_', ' ')}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid gap-6 md:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
          <div className="h-64 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Attendance Records</h1>
          <p className="text-gray-600">View and track your attendance history</p>
        </div>
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filter Records</CardTitle>
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

      {/* Summary Cards */}
      {attendanceSummary && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Days Worked</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{attendanceSummary.totalDaysWorked}</div>
              <p className="text-xs text-muted-foreground">
                {attendanceSummary.totalHoursWorked.toFixed(1)} hours total
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Attendance Rate</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{attendanceSummary.attendanceRate.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">
                Punctuality score
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Overtime Hours</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{attendanceSummary.overtimeHours.toFixed(1)}</div>
              <p className="text-xs text-muted-foreground">
                Extra hours worked
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Late Arrivals</CardTitle>
              <XCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{attendanceSummary.lateArrivals}</div>
              <p className="text-xs text-muted-foreground">
                {attendanceSummary.earlyDepartures} early departures
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Attendance Records */}
      <Card>
        <CardHeader>
          <CardTitle>Attendance History</CardTitle>
          <CardDescription>
            Detailed record of your daily attendance
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

          {attendanceRecords.length > 0 ? (
            <div className="space-y-4">
              {attendanceRecords.map((record) => (
                <div key={record.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-semibold text-lg">{record.siteName}</h3>
                      <p className="text-sm text-gray-600">
                        {formatDate(record.shiftDate)}
                      </p>
                    </div>
                    <div className="text-right">
                      {getStatusBadge(record.status)}
                      {record.locationVerified && (
                        <div className="flex items-center mt-1 text-sm text-green-600">
                          <MapPin className="h-3 w-3 mr-1" />
                          Location verified
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="font-medium text-gray-700">Clock In</p>
                      <p className="text-gray-900">
                        {record.clockIn ? formatTime(record.clockIn) : 'Not recorded'}
                      </p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-700">Clock Out</p>
                      <p className="text-gray-900">
                        {record.clockOut ? formatTime(record.clockOut) : 'Not recorded'}
                      </p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-700">Hours Worked</p>
                      <p className="text-gray-900">
                        {record.hoursWorked > 0 ? `${record.hoursWorked.toFixed(2)} hrs` : '-'}
                      </p>
                    </div>
                  </div>

                  {record.notes && (
                    <div className="mt-3 p-2 bg-gray-50 rounded text-sm">
                      <p className="font-medium text-gray-700">Notes:</p>
                      <p className="text-gray-600">{record.notes}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Clock className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No attendance records</h3>
              <p className="text-gray-600">
                No attendance records found for the selected time period.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}