'use client';

import { useState, useMemo } from 'react';
import { format, addDays, eachDayOfInterval, startOfWeek, endOfWeek } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  AlertTriangle, 
  Users, 
  Clock, 
  TrendingUp,
  TrendingDown,
  Target,
  CheckCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Filter,
  Download
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import type { Shift, Site, Employee, Assignment } from '@/types';

interface ShiftAvailabilityAnalysisProps {
  shifts: Shift[];
  sites: Site[];
  employees: Employee[];
  assignments: Assignment[];
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
}

interface SiteCoverageAnalysis {
  siteId: string;
  siteName: string;
  requiredCoverage: number;
  actualCoverage: number;
  coveragePercentage: number;
  gaps: CoverageGap[];
  overstaffed: boolean;
  understaffed: boolean;
}

interface CoverageGap {
  date: string;
  timeSlot: string;
  requiredStaff: number;
  assignedStaff: number;
  deficit: number;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

interface EmployeeAvailability {
  employeeId: string;
  employeeName: string;
  totalHours: number;
  scheduledHours: number;
  availableHours: number;
  utilizationRate: number;
  skills: string[];
  conflictingShifts: string[];
}

interface WeeklyAnalysis {
  weekStart: Date;
  totalRequiredHours: number;
  totalScheduledHours: number;
  coveragePercentage: number;
  criticalGaps: number;
  sitesUnderstaffed: number;
  employeesOverutilized: number;
}

export function ShiftAvailabilityAnalysis({
  shifts,
  sites,
  employees,
  assignments,
  selectedDate,
  onDateSelect,
}: ShiftAvailabilityAnalysisProps) {
  const [viewMode, setViewMode] = useState<'coverage' | 'availability' | 'gaps'>('coverage');
  const [selectedSite, setSelectedSite] = useState<string>('all');
  const [timeRange, setTimeRange] = useState<'week' | 'month'>('week');

  // Calculate date range based on selection
  const dateRange = useMemo(() => {
    if (timeRange === 'week') {
      const weekStart = startOfWeek(selectedDate);
      const weekEnd = endOfWeek(selectedDate);
      return eachDayOfInterval({ start: weekStart, end: weekEnd });
    } else {
      // Month view - simplified to 4 weeks for analysis
      const weekStart = startOfWeek(selectedDate);
      const monthEnd = addDays(weekStart, 27);
      return eachDayOfInterval({ start: weekStart, end: monthEnd });
    }
  }, [selectedDate, timeRange]);

  // Filter shifts for the selected period
  const periodShifts = useMemo(() => {
    return shifts.filter(shift => {
      const shiftDate = new Date(shift.shiftDate);
      return dateRange.some(date => 
        date.getTime() === shiftDate.getTime()
      );
    });
  }, [shifts, dateRange]);

  // Site coverage analysis
  const siteCoverageAnalysis = useMemo((): SiteCoverageAnalysis[] => {
    const siteAnalysis = new Map<string, SiteCoverageAnalysis>();

    // Initialize analysis for each site
    const targetSites = selectedSite === 'all' ? sites : sites.filter(s => s.id === selectedSite);
    targetSites.forEach(site => {
      siteAnalysis.set(site.id, {
        siteId: site.id,
        siteName: site.name,
        requiredCoverage: 0,
        actualCoverage: 0,
        coveragePercentage: 0,
        gaps: [],
        overstaffed: false,
        understaffed: false,
      });
    });

    // Analyze shifts by site and time
    periodShifts.forEach(shift => {
      const analysis = siteAnalysis.get(shift.siteId);
      if (!analysis) return;

      const shiftHours = calculateShiftHours(shift.startTime, shift.endTime);
      analysis.requiredCoverage += shiftHours * (shift.coverageRequired || 1);
      
      if (shift.assignmentId && shift.status !== 'CANCELLED') {
        analysis.actualCoverage += shiftHours;
      }

      // Identify gaps
      if (shift.status === 'NEEDS_COVERAGE' || !shift.assignmentId) {
        const deficit = (shift.coverageRequired || 1) - (shift.coverageAssigned || 0);
        if (deficit > 0) {
          analysis.gaps.push({
            date: shift.shiftDate,
            timeSlot: `${shift.startTime} - ${shift.endTime}`,
            requiredStaff: shift.coverageRequired || 1,
            assignedStaff: shift.coverageAssigned || 0,
            deficit,
            priority: shift.priority as any || 'MEDIUM',
          });
        }
      }
    });

    // Calculate percentages and flags
    siteAnalysis.forEach(analysis => {
      if (analysis.requiredCoverage > 0) {
        analysis.coveragePercentage = (analysis.actualCoverage / analysis.requiredCoverage) * 100;
        analysis.understaffed = analysis.coveragePercentage < 90;
        analysis.overstaffed = analysis.coveragePercentage > 110;
      }
    });

    return Array.from(siteAnalysis.values()).sort((a, b) => a.siteName.localeCompare(b.siteName));
  }, [periodShifts, sites, selectedSite]);

  // Employee availability analysis
  const employeeAvailability = useMemo((): EmployeeAvailability[] => {
    return employees.map(employee => {
      const employeeAssignments = assignments.filter(a => a.employeeId === employee.id && a.status === 'ACTIVE');
      const employeeShifts = periodShifts.filter(shift => 
        employeeAssignments.some(a => a.id === shift.assignmentId)
      );

      const scheduledHours = employeeShifts.reduce((total, shift) => 
        total + calculateShiftHours(shift.startTime, shift.endTime), 0
      );

      const totalAvailableHours = dateRange.length * 8; // Assume 8 hours max per day
      const utilizationRate = totalAvailableHours > 0 ? (scheduledHours / totalAvailableHours) * 100 : 0;

      // Find conflicting shifts (overlapping times)
      const conflictingShifts: string[] = [];
      employeeShifts.forEach((shift, index) => {
        employeeShifts.slice(index + 1).forEach(otherShift => {
          if (shift.shiftDate === otherShift.shiftDate && 
              isTimeOverlapping(shift.startTime, shift.endTime, otherShift.startTime, otherShift.endTime)) {
            conflictingShifts.push(`${shift.shiftDate} ${shift.startTime}-${shift.endTime}`);
          }
        });
      });

      return {
        employeeId: employee.id,
        employeeName: `${employee.firstName} ${employee.lastName}`,
        totalHours: totalAvailableHours,
        scheduledHours,
        availableHours: totalAvailableHours - scheduledHours,
        utilizationRate,
        skills: employee.skills || [],
        conflictingShifts,
      };
    }).sort((a, b) => b.utilizationRate - a.utilizationRate);
  }, [employees, assignments, periodShifts, dateRange]);

  // Weekly analysis summary
  const weeklyAnalysis = useMemo((): WeeklyAnalysis => {
    const totalRequired = siteCoverageAnalysis.reduce((sum, site) => sum + site.requiredCoverage, 0);
    const totalScheduled = siteCoverageAnalysis.reduce((sum, site) => sum + site.actualCoverage, 0);
    const criticalGaps = siteCoverageAnalysis.reduce((sum, site) => 
      sum + site.gaps.filter(gap => gap.priority === 'HIGH' || gap.priority === 'CRITICAL').length, 0
    );
    const sitesUnderstaffed = siteCoverageAnalysis.filter(site => site.understaffed).length;
    const employeesOverutilized = employeeAvailability.filter(emp => emp.utilizationRate > 100).length;

    return {
      weekStart: dateRange[0],
      totalRequiredHours: totalRequired,
      totalScheduledHours: totalScheduled,
      coveragePercentage: totalRequired > 0 ? (totalScheduled / totalRequired) * 100 : 0,
      criticalGaps,
      sitesUnderstaffed,
      employeesOverutilized,
    };
  }, [siteCoverageAnalysis, employeeAvailability, dateRange]);

  const calculateShiftHours = (startTime: string, endTime: string): number => {
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    
    // Handle overnight shifts
    const totalMinutes = endMinutes >= startMinutes 
      ? endMinutes - startMinutes 
      : (24 * 60) - startMinutes + endMinutes;
    
    return totalMinutes / 60;
  };

  const isTimeOverlapping = (start1: string, end1: string, start2: string, end2: string): boolean => {
    const toMinutes = (time: string) => {
      const [hour, min] = time.split(':').map(Number);
      return hour * 60 + min;
    };

    const s1 = toMinutes(start1);
    const e1 = toMinutes(end1);
    const s2 = toMinutes(start2);
    const e2 = toMinutes(end2);

    return s1 < e2 && s2 < e1;
  };

  const handlePreviousPeriod = () => {
    const days = timeRange === 'week' ? -7 : -28;
    onDateSelect(addDays(selectedDate, days));
  };

  const handleNextPeriod = () => {
    const days = timeRange === 'week' ? 7 : 28;
    onDateSelect(addDays(selectedDate, days));
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'CRITICAL': return 'bg-red-100 text-red-800';
      case 'HIGH': return 'bg-orange-100 text-orange-800';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800';
      case 'LOW': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getUtilizationColor = (rate: number) => {
    if (rate > 100) return 'text-red-600';
    if (rate > 80) return 'text-orange-600';
    if (rate > 60) return 'text-green-600';
    return 'text-blue-600';
  };

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handlePreviousPeriod}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <h2 className="text-lg font-semibold">
                  {timeRange === 'week' ? 'Week of' : 'Month of'} {format(dateRange[0], 'MMM dd, yyyy')}
                </h2>
                <Button variant="outline" size="sm" onClick={handleNextPeriod}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Select value={timeRange} onValueChange={(value: 'week' | 'month') => setTimeRange(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">Week</SelectItem>
                  <SelectItem value="month">Month</SelectItem>
                </SelectContent>
              </Select>

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

              <Button variant="outline" size="sm" onClick={() => {
                // Export site coverage analysis to CSV
                const csvData = siteCoverageAnalysis.map(site => ({
                  site: site.siteName,
                  requiredCoverage: site.requiredCoverage.toFixed(1),
                  actualCoverage: site.actualCoverage.toFixed(1),
                  coveragePercentage: site.coveragePercentage.toFixed(1),
                  gapCount: site.gaps.length,
                  understaffed: site.understaffed,
                  overstaffed: site.overstaffed
                }));
                
                // Create CSV content
                const headers = Object.keys(csvData[0] || {});
                const csvContent = [
                  headers.join(','),
                  ...csvData.map(row => headers.map(header => row[header as keyof typeof row]).join(','))
                ].join('\n');
                
                // Download CSV
                const blob = new Blob([csvContent], { type: 'text/csv' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `coverage-analysis-${format(new Date(), 'yyyy-MM-dd')}.csv`;
                a.click();
                window.URL.revokeObjectURL(url);
              }}>
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
              
              <Button 
                variant="outline"
                size="sm"
                onClick={() => {
                  // Auto-suggest coverage options for understaffed sites
                  const understaffedSites = siteCoverageAnalysis.filter(s => s.understaffed);
                  if (understaffedSites.length > 0) {
                    alert(`Found ${understaffedSites.length} understaffed sites. Use the scheduler to find available employees for coverage.`);
                  } else {
                    alert('No understaffed sites found.');
                  }
                }}
                disabled={siteCoverageAnalysis.filter(s => s.understaffed).length === 0}
              >
                <Users className="w-4 h-4 mr-2" />
                Auto-Suggest Coverage
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Coverage Rate</p>
                <p className="text-2xl font-bold">
                  {weeklyAnalysis.coveragePercentage.toFixed(1)}%
                </p>
              </div>
              {weeklyAnalysis.coveragePercentage >= 90 ? (
                <CheckCircle className="w-6 h-6 text-green-600" />
              ) : (
                <XCircle className="w-6 h-6 text-red-600" />
              )}
            </div>
            <Progress 
              value={Math.min(weeklyAnalysis.coveragePercentage, 100)} 
              className="mt-2"
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Critical Gaps</p>
                <p className="text-2xl font-bold text-red-600">
                  {weeklyAnalysis.criticalGaps}
                </p>
              </div>
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Understaffed Sites</p>
                <p className="text-2xl font-bold text-orange-600">
                  {weeklyAnalysis.sitesUnderstaffed}
                </p>
              </div>
              <TrendingDown className="w-6 h-6 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Overutilized Staff</p>
                <p className="text-2xl font-bold text-purple-600">
                  {weeklyAnalysis.employeesOverutilized}
                </p>
              </div>
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* View Toggle */}
      <div className="flex gap-2">
        <Button
          variant={viewMode === 'coverage' ? 'default' : 'outline'}
          onClick={() => setViewMode('coverage')}
        >
          <Target className="w-4 h-4 mr-2" />
          Site Coverage
        </Button>
        <Button
          variant={viewMode === 'availability' ? 'default' : 'outline'}
          onClick={() => setViewMode('availability')}
        >
          <Users className="w-4 h-4 mr-2" />
          Staff Availability
        </Button>
        <Button
          variant={viewMode === 'gaps' ? 'default' : 'outline'}
          onClick={() => setViewMode('gaps')}
        >
          <AlertTriangle className="w-4 h-4 mr-2" />
          Coverage Gaps
        </Button>
      </div>

      {/* Content based on view mode */}
      {viewMode === 'coverage' && (
        <Card>
          <CardHeader>
            <CardTitle>Site Coverage Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Site</TableHead>
                  <TableHead>Required Hours</TableHead>
                  <TableHead>Scheduled Hours</TableHead>
                  <TableHead>Coverage %</TableHead>
                  <TableHead>Gaps</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {siteCoverageAnalysis.map((site) => (
                  <TableRow key={site.siteId}>
                    <TableCell className="font-medium">{site.siteName}</TableCell>
                    <TableCell>{site.requiredCoverage.toFixed(1)}h</TableCell>
                    <TableCell>{site.actualCoverage.toFixed(1)}h</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className={getUtilizationColor(site.coveragePercentage)}>
                          {site.coveragePercentage.toFixed(1)}%
                        </span>
                        <Progress 
                          value={Math.min(site.coveragePercentage, 100)} 
                          className="w-20"
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {site.gaps.length} gaps
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {site.understaffed && (
                        <Badge className="bg-red-100 text-red-800">Understaffed</Badge>
                      )}
                      {site.overstaffed && (
                        <Badge className="bg-blue-100 text-blue-800">Overstaffed</Badge>
                      )}
                      {!site.understaffed && !site.overstaffed && (
                        <Badge className="bg-green-100 text-green-800">Adequate</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {viewMode === 'availability' && (
        <Card>
          <CardHeader>
            <CardTitle>Employee Availability & Utilization</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Scheduled Hours</TableHead>
                  <TableHead>Available Hours</TableHead>
                  <TableHead>Utilization %</TableHead>
                  <TableHead>Skills</TableHead>
                  <TableHead>Conflicts</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employeeAvailability.slice(0, 20).map((employee) => (
                  <TableRow key={employee.employeeId}>
                    <TableCell className="font-medium">{employee.employeeName}</TableCell>
                    <TableCell>{employee.scheduledHours.toFixed(1)}h</TableCell>
                    <TableCell>{employee.availableHours.toFixed(1)}h</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className={getUtilizationColor(employee.utilizationRate)}>
                          {employee.utilizationRate.toFixed(1)}%
                        </span>
                        <Progress 
                          value={Math.min(employee.utilizationRate, 100)} 
                          className="w-20"
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {employee.skills.slice(0, 3).map((skill) => (
                          <Badge key={skill} variant="secondary" className="text-xs">
                            {skill}
                          </Badge>
                        ))}
                        {employee.skills.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{employee.skills.length - 3}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {employee.conflictingShifts.length > 0 ? (
                        <Badge className="bg-red-100 text-red-800">
                          {employee.conflictingShifts.length} conflicts
                        </Badge>
                      ) : (
                        <Badge className="bg-green-100 text-green-800">
                          No conflicts
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {viewMode === 'gaps' && (
        <Card>
          <CardHeader>
            <CardTitle>Coverage Gaps & Staffing Issues</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {siteCoverageAnalysis
                .filter(site => site.gaps.length > 0)
                .map((site) => (
                <div key={site.siteId} className="border rounded-lg p-4">
                  <h4 className="font-medium text-lg mb-3">{site.siteName}</h4>
                  <div className="space-y-2">
                    {site.gaps.map((gap, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                        <div className="flex items-center gap-4">
                          <div>
                            <p className="font-medium">{format(new Date(gap.date), 'EEE, MMM dd')}</p>
                            <p className="text-sm text-gray-600">{gap.timeSlot}</p>
                          </div>
                          <div className="text-sm">
                            <p>Assigned: {gap.assignedStaff}/{gap.requiredStaff}</p>
                            <p className="text-red-600">Deficit: {gap.deficit}</p>
                          </div>
                        </div>
                        <Badge className={getPriorityColor(gap.priority)}>
                          {gap.priority}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              
              {siteCoverageAnalysis.every(site => site.gaps.length === 0) && (
                <div className="text-center py-8 text-gray-500">
                  <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-600" />
                  <p>No coverage gaps detected for the selected period</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}