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
import { 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Clock, 
  Calendar,
  Target,
  Zap,
  CheckCircle2,
  XCircle,
  Search,
  Filter
} from 'lucide-react';
import { format, addDays, eachDayOfInterval, startOfMonth, endOfMonth } from 'date-fns';
import { Progress } from '@/components/ui/progress';
import type { Shift, Site, Employee, Assignment } from '@/types';

interface CoverageGapAnalyzerProps {
  shifts: Shift[];
  sites: Site[];
  employees: Employee[];
  assignments: Assignment[];
  selectedDate: Date;
}

interface GapAnalysis {
  date: string;
  siteId: string;
  siteName: string;
  timeSlot: string;
  requiredStaff: number;
  assignedStaff: number;
  gap: number;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  skills: string[];
  duration: number;
  impactScore: number;
}

interface SiteMetrics {
  siteId: string;
  siteName: string;
  totalShifts: number;
  coveredShifts: number;
  gapCount: number;
  coverageRate: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  avgGapDuration: number;
  criticalGaps: number;
}

interface CoverageForecast {
  date: string;
  predictedGaps: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  recommendedActions: string[];
}

export function CoverageGapAnalyzer({
  shifts,
  sites,
  employees,
  assignments,
  selectedDate,
}: CoverageGapAnalyzerProps) {
  const [viewMode, setViewMode] = useState<'gaps' | 'metrics' | 'forecast'>('gaps');
  const [selectedSite, setSelectedSite] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Analysis period - current month
  const monthStart = startOfMonth(selectedDate);
  const monthEnd = endOfMonth(selectedDate);
  const analysisDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Analyze coverage gaps
  const gapAnalysis = useMemo((): GapAnalysis[] => {
    const gaps: GapAnalysis[] = [];

    shifts.forEach(shift => {
      const site = sites.find(s => s.id === shift.siteId);
      if (!site) return;

      if (selectedSite !== 'all' && shift.siteId !== selectedSite) return;

      const requiredStaff = shift.coverageRequired || 1;
      const assignedStaff = shift.coverageAssigned || (shift.assignmentId ? 1 : 0);
      
      if (assignedStaff < requiredStaff) {
        const gap = requiredStaff - assignedStaff;
        const duration = calculateShiftDuration(shift.startTime, shift.endTime);
        
        // Calculate impact score based on multiple factors
        let impactScore = gap * 10; // Base score for staff shortage
        impactScore += duration * 2; // Longer gaps are worse
        
        if (shift.shiftType === 'EMERGENCY') impactScore *= 2;
        if (shift.priority === 'URGENT') impactScore *= 1.8;
        if (shift.priority === 'HIGH') impactScore *= 1.5;

        // Determine priority based on impact
        let priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
        if (impactScore >= 50) priority = 'CRITICAL';
        else if (impactScore >= 30) priority = 'HIGH';
        else if (impactScore >= 15) priority = 'MEDIUM';
        else priority = 'LOW';

        gaps.push({
          date: shift.shiftDate,
          siteId: shift.siteId,
          siteName: site.name,
          timeSlot: `${shift.startTime} - ${shift.endTime}`,
          requiredStaff,
          assignedStaff,
          gap,
          priority,
          skills: (shift.skillRequirements as string[]) || [],
          duration,
          impactScore,
        });
      }
    });

    return gaps
      .filter(gap => {
        if (priorityFilter !== 'all' && gap.priority !== priorityFilter) return false;
        if (searchTerm && !gap.siteName.toLowerCase().includes(searchTerm.toLowerCase())) return false;
        return true;
      })
      .sort((a, b) => b.impactScore - a.impactScore);
  }, [shifts, sites, selectedSite, priorityFilter, searchTerm]);

  // Calculate site metrics
  const siteMetrics = useMemo((): SiteMetrics[] => {
    const metrics = new Map<string, SiteMetrics>();

    // Initialize metrics for each site
    const targetSites = selectedSite === 'all' ? sites : sites.filter(s => s.id === selectedSite);
    targetSites.forEach(site => {
      metrics.set(site.id, {
        siteId: site.id,
        siteName: site.name,
        totalShifts: 0,
        coveredShifts: 0,
        gapCount: 0,
        coverageRate: 0,
        riskLevel: 'LOW',
        avgGapDuration: 0,
        criticalGaps: 0,
      });
    });

    // Calculate metrics from shifts
    shifts.forEach(shift => {
      const metric = metrics.get(shift.siteId);
      if (!metric) return;

      metric.totalShifts++;
      
      const requiredStaff = shift.coverageRequired || 1;
      const assignedStaff = shift.coverageAssigned || (shift.assignmentId ? 1 : 0);
      
      if (assignedStaff >= requiredStaff) {
        metric.coveredShifts++;
      } else {
        metric.gapCount++;
        const duration = calculateShiftDuration(shift.startTime, shift.endTime);
        metric.avgGapDuration = (metric.avgGapDuration * (metric.gapCount - 1) + duration) / metric.gapCount;
        
        if (shift.priority === 'URGENT' || shift.priority === 'HIGH') {
          metric.criticalGaps++;
        }
      }
    });

    // Calculate final metrics
    metrics.forEach(metric => {
      metric.coverageRate = metric.totalShifts > 0 
        ? (metric.coveredShifts / metric.totalShifts) * 100 
        : 0;
      
      // Determine risk level
      if (metric.coverageRate < 70 || metric.criticalGaps > 5) {
        metric.riskLevel = 'CRITICAL';
      } else if (metric.coverageRate < 85 || metric.criticalGaps > 2) {
        metric.riskLevel = 'HIGH';
      } else if (metric.coverageRate < 95 || metric.gapCount > 3) {
        metric.riskLevel = 'MEDIUM';
      } else {
        metric.riskLevel = 'LOW';
      }
    });

    return Array.from(metrics.values()).sort((a, b) => a.coverageRate - b.coverageRate);
  }, [shifts, sites, selectedSite]);

  // Generate coverage forecast for next 7 days
  const coverageForecast = useMemo((): CoverageForecast[] => {
    const forecast: CoverageForecast[] = [];
    const forecastDays = 7;

    for (let i = 1; i <= forecastDays; i++) {
      const forecastDate = addDays(new Date(), i);
      const dateStr = format(forecastDate, 'yyyy-MM-dd');
      
      // Analyze historical patterns to predict gaps
      const dayOfWeek = forecastDate.getDay();
      const historicalShifts = shifts.filter(s => new Date(s.shiftDate).getDay() === dayOfWeek);
      const historicalGaps = historicalShifts.filter(s => 
        (s.coverageAssigned || 0) < (s.coverageRequired || 1)
      );
      
      const gapRate = historicalShifts.length > 0 
        ? historicalGaps.length / historicalShifts.length 
        : 0;
      
      const predictedGaps = Math.round(gapRate * 10); // Scale prediction
      
      let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
      if (predictedGaps >= 5) riskLevel = 'CRITICAL';
      else if (predictedGaps >= 3) riskLevel = 'HIGH';
      else if (predictedGaps >= 1) riskLevel = 'MEDIUM';
      else riskLevel = 'LOW';

      const recommendedActions: string[] = [];
      if (riskLevel === 'CRITICAL') {
        recommendedActions.push('Activate emergency coverage protocols');
        recommendedActions.push('Contact backup staff immediately');
      } else if (riskLevel === 'HIGH') {
        recommendedActions.push('Schedule additional recruitment');
        recommendedActions.push('Review shift patterns');
      } else if (riskLevel === 'MEDIUM') {
        recommendedActions.push('Monitor closely for changes');
      }

      forecast.push({
        date: dateStr,
        predictedGaps,
        riskLevel,
        recommendedActions,
      });
    }

    return forecast;
  }, [shifts]);

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

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'CRITICAL': return 'bg-red-100 text-red-800 border-red-200';
      case 'HIGH': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'LOW': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'CRITICAL': return 'text-red-600';
      case 'HIGH': return 'text-orange-600';
      case 'MEDIUM': return 'text-yellow-600';
      case 'LOW': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Coverage Gap Analysis</h2>
            <div className="flex gap-2">
              <Button
                variant={viewMode === 'gaps' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('gaps')}
              >
                <AlertTriangle className="w-4 h-4 mr-2" />
                Gaps
              </Button>
              <Button
                variant={viewMode === 'metrics' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('metrics')}
              >
                <Target className="w-4 h-4 mr-2" />
                Site Metrics
              </Button>
              <Button
                variant={viewMode === 'forecast' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('forecast')}
              >
                <TrendingUp className="w-4 h-4 mr-2" />
                Forecast
              </Button>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search sites..."
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

            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="All Priorities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="CRITICAL">Critical</SelectItem>
                <SelectItem value="HIGH">High</SelectItem>
                <SelectItem value="MEDIUM">Medium</SelectItem>
                <SelectItem value="LOW">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Summary Statistics */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Gaps</p>
                <p className="text-2xl font-bold text-red-600">{gapAnalysis.length}</p>
              </div>
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Critical Gaps</p>
                <p className="text-2xl font-bold text-red-600">
                  {gapAnalysis.filter(g => g.priority === 'CRITICAL').length}
                </p>
              </div>
              <Zap className="w-6 h-6 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">High-Risk Sites</p>
                <p className="text-2xl font-bold text-orange-600">
                  {siteMetrics.filter(s => s.riskLevel === 'HIGH' || s.riskLevel === 'CRITICAL').length}
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
                <p className="text-sm text-gray-600">Avg Coverage Rate</p>
                <p className="text-2xl font-bold text-blue-600">
                  {siteMetrics.length > 0 
                    ? (siteMetrics.reduce((sum, s) => sum + s.coverageRate, 0) / siteMetrics.length).toFixed(1)
                    : '0'}%
                </p>
              </div>
              <Target className="w-6 h-6 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Content based on view mode */}
      {viewMode === 'gaps' && (
        <Card>
          <CardHeader>
            <CardTitle>Coverage Gaps</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {gapAnalysis.map((gap, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-medium">{gap.siteName}</h4>
                        <Badge className={getPriorityColor(gap.priority)}>
                          {gap.priority}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Date:</span>
                          <p className="font-medium">{format(new Date(gap.date), 'MMM dd, yyyy')}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Time:</span>
                          <p className="font-medium">{gap.timeSlot}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Staffing:</span>
                          <p className="font-medium text-red-600">
                            {gap.assignedStaff}/{gap.requiredStaff} ({gap.gap} short)
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-500">Duration:</span>
                          <p className="font-medium">{gap.duration.toFixed(1)}h</p>
                        </div>
                      </div>

                      {gap.skills.length > 0 && (
                        <div className="mt-2">
                          <span className="text-gray-500 text-sm">Required Skills:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {gap.skills.map((skill, skillIndex) => (
                              <Badge key={skillIndex} variant="outline" className="text-xs">
                                {skill}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="text-right">
                      <div className="text-sm text-gray-500">Impact Score</div>
                      <div className="text-xl font-bold">{gap.impactScore.toFixed(0)}</div>
                    </div>
                  </div>
                </div>
              ))}

              {gapAnalysis.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-green-600" />
                  <p>No coverage gaps found for the selected criteria</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {viewMode === 'metrics' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {siteMetrics.map((metric) => (
            <Card key={metric.siteId}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{metric.siteName}</CardTitle>
                  <div className={`font-medium ${getRiskColor(metric.riskLevel)}`}>
                    {metric.riskLevel} Risk
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span>Coverage Rate</span>
                    <span className="font-medium">{metric.coverageRate.toFixed(1)}%</span>
                  </div>
                  <Progress value={metric.coverageRate} className="h-2" />
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Total Shifts</span>
                    <p className="font-medium text-lg">{metric.totalShifts}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Covered</span>
                    <p className="font-medium text-lg text-green-600">{metric.coveredShifts}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Gaps</span>
                    <p className="font-medium text-lg text-red-600">{metric.gapCount}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Critical Gaps</span>
                    <p className="font-medium text-lg text-red-600">{metric.criticalGaps}</p>
                  </div>
                </div>

                {metric.avgGapDuration > 0 && (
                  <div className="text-sm">
                    <span className="text-gray-500">Avg Gap Duration:</span>
                    <span className="ml-2 font-medium">{metric.avgGapDuration.toFixed(1)}h</span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {viewMode === 'forecast' && (
        <Card>
          <CardHeader>
            <CardTitle>7-Day Coverage Forecast</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {coverageForecast.map((forecast, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="font-medium">{format(new Date(forecast.date), 'EEEE, MMM dd')}</h4>
                      <p className="text-sm text-gray-600">Predicted gaps: {forecast.predictedGaps}</p>
                    </div>
                    <Badge className={getPriorityColor(forecast.riskLevel)}>
                      {forecast.riskLevel} Risk
                    </Badge>
                  </div>

                  {forecast.recommendedActions.length > 0 && (
                    <div>
                      <h5 className="text-sm font-medium mb-2">Recommended Actions:</h5>
                      <ul className="text-sm space-y-1">
                        {forecast.recommendedActions.map((action, actionIndex) => (
                          <li key={actionIndex} className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 bg-gray-400 rounded-full flex-shrink-0" />
                            {action}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}