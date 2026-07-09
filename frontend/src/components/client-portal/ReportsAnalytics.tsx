'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Download, Calendar, TrendingUp } from 'lucide-react';

interface ReportsAnalyticsProps {
  clientId: string;
}

export function ReportsAnalytics({ clientId }: ReportsAnalyticsProps) {
  const [reportType, setReportType] = useState('SITE_PERFORMANCE');
  const [dateRange, setDateRange] = useState('last_month');

  const reportTypes = [
    { value: 'SITE_PERFORMANCE', label: 'Site Performance Report' },
    { value: 'GUARD_DEPLOYMENT', label: 'Guard Deployment Analytics' },
    { value: 'ATTENDANCE_TRENDS', label: 'Attendance Trends Analysis' },
    { value: 'SERVICE_COMPLIANCE', label: 'Service Level Compliance' },
    { value: 'BILLING_SUMMARY', label: 'Billing Summary Report' },
    { value: 'INCIDENT_ANALYSIS', label: 'Incident Analysis Report' },
  ];

  return (
    <div className="space-y-6">
      {/* Report Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart className="h-5 w-5" />
            Reports & Analytics
          </CardTitle>
          <CardDescription>
            Generate comprehensive reports and analyze performance metrics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Select value={reportType} onValueChange={setReportType}>
              <SelectTrigger>
                <SelectValue placeholder="Select report type" />
              </SelectTrigger>
              <SelectContent>
                {reportTypes.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger>
                <SelectValue placeholder="Select date range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="last_week">Last Week</SelectItem>
                <SelectItem value="last_month">Last Month</SelectItem>
                <SelectItem value="last_quarter">Last Quarter</SelectItem>
                <SelectItem value="last_year">Last Year</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>

            <Button className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Generate Report
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Site Performance Reports */}
      <Card>
        <CardHeader>
          <CardTitle>Site Performance Metrics</CardTitle>
          <CardDescription>
            Performance scores and compliance metrics for all sites
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="border rounded-lg p-4">
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-medium">Main Office</h4>
                <span className="text-lg font-bold text-green-600">95.5/100</span>
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Attendance:</span>
                  <p className="font-medium">96.8%</p>
                </div>
                <div>
                  <span className="text-gray-500">Punctuality:</span>
                  <p className="font-medium">94.2%</p>
                </div>
                <div>
                  <span className="text-gray-500">Completion:</span>
                  <p className="font-medium">99.1%</p>
                </div>
              </div>
            </div>

            <div className="border rounded-lg p-4">
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-medium">Warehouse A</h4>
                <span className="text-lg font-bold text-blue-600">88.2/100</span>
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Attendance:</span>
                  <p className="font-medium">92.1%</p>
                </div>
                <div>
                  <span className="text-gray-500">Punctuality:</span>
                  <p className="font-medium">89.5%</p>
                </div>
                <div>
                  <span className="text-gray-500">Completion:</span>
                  <p className="font-medium">96.8%</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Service Level Compliance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Service Level Compliance
          </CardTitle>
          <CardDescription>
            SLA metrics and compliance tracking
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span>Overall Compliance Score</span>
              <span className="text-2xl font-bold text-green-600">97.5%</span>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between">
                <span>Response Time (Target: 5min)</span>
                <span className="font-medium text-green-600">3.2min ✓</span>
              </div>
              <div className="flex justify-between">
                <span>Guard Deployment (Target: 95%)</span>
                <span className="font-medium text-green-600">98.1% ✓</span>
              </div>
              <div className="flex justify-between">
                <span>Incident Resolution (Target: 24h)</span>
                <span className="font-medium text-yellow-600">18h ⚠</span>
              </div>
              <div className="flex justify-between">
                <span>Client Satisfaction (Target: 4.5/5)</span>
                <span className="font-medium text-green-600">4.7/5 ✓</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Custom Date Range Filtering */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Custom Analytics
          </CardTitle>
          <CardDescription>
            Filter data by custom date ranges and generate specialized reports
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button variant="outline">Daily Reports</Button>
            <Button variant="outline">Weekly Trends</Button>
            <Button variant="outline">Monthly Summary</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}