'use client';

import { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown,
  DollarSign,
  Users,
  Calendar,
  BarChart3,
  PieChart,
  Activity
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { usePayroll } from '@/hooks/use-payroll';

interface PayrollAnalyticsData {
  overview: {
    totalPayrollThisMonth: number;
    totalPayrollLastMonth: number;
    employeeCount: number;
    avgSalaryPerEmployee: number;
    growthPercentage: number;
  };
  trends: {
    month: string;
    totalPayroll: number;
    employeeCount: number;
    avgSalary: number;
  }[];
  departmentBreakdown: {
    department: string;
    totalPayroll: number;
    employeeCount: number;
    percentage: number;
  }[];
  costBreakdown: {
    basicSalary: number;
    overtime: number;
    bonuses: number;
    deductions: number;
  };
  topExpenses: {
    category: string;
    amount: number;
    percentage: number;
  }[];
}

export function PayrollAnalytics() {
  const { getPayrollAnalytics } = usePayroll();
  const [analyticsData, setAnalyticsData] = useState<PayrollAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('6months');

  useEffect(() => {
    fetchAnalytics();
  }, [selectedPeriod]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const data = await getPayrollAnalytics({ period: selectedPeriod });
      setAnalyticsData(data);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="grid gap-4 md:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-64 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!analyticsData) {
    return (
      <div className="text-center py-12">
        <BarChart3 className="h-12 w-12 mx-auto text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No analytics data available</h3>
        <p className="text-gray-600">Analytics will be available after processing payroll runs.</p>
      </div>
    );
  }

  const { overview, trends, departmentBreakdown, costBreakdown, topExpenses } = analyticsData;

  return (
    <div className="space-y-6">
      {/* Period Selection */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Payroll Analytics</h2>
        <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="3months">Last 3 Months</SelectItem>
            <SelectItem value="6months">Last 6 Months</SelectItem>
            <SelectItem value="12months">Last 12 Months</SelectItem>
            <SelectItem value="ytd">Year to Date</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Payroll</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₹{overview.totalPayrollThisMonth.toLocaleString()}
            </div>
            <div className="flex items-center text-xs text-muted-foreground">
              {overview.growthPercentage > 0 ? (
                <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-500 mr-1" />
              )}
              <span className={overview.growthPercentage > 0 ? 'text-green-600' : 'text-red-600'}>
                {Math.abs(overview.growthPercentage)}% from last month
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Employee Count</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview.employeeCount}</div>
            <p className="text-xs text-muted-foreground">Active employees</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Salary</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₹{overview.avgSalaryPerEmployee.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Per employee</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Growth Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${overview.growthPercentage > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {overview.growthPercentage > 0 ? '+' : ''}{overview.growthPercentage}%
            </div>
            <p className="text-xs text-muted-foreground">Month over month</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Payroll Trends */}
        <Card>
          <CardHeader>
            <CardTitle>Payroll Trends</CardTitle>
            <CardDescription>Monthly payroll expenses over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {trends.map((trend, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{trend.month}</p>
                    <p className="text-sm text-gray-600">{trend.employeeCount} employees</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">₹{trend.totalPayroll.toLocaleString()}</p>
                    <p className="text-sm text-gray-600">₹{trend.avgSalary.toLocaleString()} avg</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Cost Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Cost Breakdown</CardTitle>
            <CardDescription>Distribution of payroll components</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Basic Salary</span>
                  <span className="text-sm font-semibold">₹{costBreakdown.basicSalary.toLocaleString()}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full" 
                    style={{ width: '70%' }}
                  ></div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Overtime</span>
                  <span className="text-sm font-semibold">₹{costBreakdown.overtime.toLocaleString()}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full" 
                    style={{ width: '15%' }}
                  ></div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Bonuses</span>
                  <span className="text-sm font-semibold">₹{costBreakdown.bonuses.toLocaleString()}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-yellow-500 h-2 rounded-full" 
                    style={{ width: '10%' }}
                  ></div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Deductions</span>
                  <span className="text-sm font-semibold text-red-600">-₹{costBreakdown.deductions.toLocaleString()}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-red-500 h-2 rounded-full" 
                    style={{ width: '20%' }}
                  ></div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Department Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Department Wise Distribution</CardTitle>
            <CardDescription>Payroll expenses by department</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {departmentBreakdown.map((dept, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-4 h-4 rounded-full"
                      style={{ 
                        backgroundColor: `hsl(${index * 60}, 70%, 50%)` 
                      }}
                    ></div>
                    <div>
                      <p className="font-medium">{dept.department}</p>
                      <p className="text-sm text-gray-600">{dept.employeeCount} employees</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">₹{dept.totalPayroll.toLocaleString()}</p>
                    <p className="text-sm text-gray-600">{dept.percentage}%</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Expenses */}
        <Card>
          <CardHeader>
            <CardTitle>Top Expense Categories</CardTitle>
            <CardDescription>Highest cost components</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topExpenses.map((expense, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-xs font-semibold text-blue-600">
                        #{index + 1}
                      </span>
                    </div>
                    <span className="font-medium">{expense.category}</span>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">₹{expense.amount.toLocaleString()}</p>
                    <p className="text-sm text-gray-600">{expense.percentage}% of total</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-center gap-4">
        <Button variant="outline">
          <Calendar className="h-4 w-4 mr-2" />
          Schedule Report
        </Button>
        <Button variant="outline">
          <PieChart className="h-4 w-4 mr-2" />
          Detailed Analysis
        </Button>
      </div>
    </div>
  );
}