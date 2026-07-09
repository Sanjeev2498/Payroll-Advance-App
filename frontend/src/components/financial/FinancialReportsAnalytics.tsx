'use client';

import { useState, useEffect } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  Users, 
  BarChart3, 
  PieChart,
  FileText,
  Download,
  Calendar,
  Target,
  AlertTriangle,
  CheckCircle,
  Activity,
  Building,
  Clock
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  useFinancialReports, 
  type FinancialDashboardData,
  type FinancialReportsFilter,
  type SiteProfitabilityAnalysis,
  type CostOptimizationInsight,
  type FinancialForecast
} from '@/hooks/use-financial-reports';
import { formatCurrency, formatDate, formatPercentage } from '@/lib/utils';

export function FinancialReportsAnalytics() {
  const { 
    loading, 
    error,
    getFinancialDashboardData,
    getFinancialForecasts,
    getCostOptimizationInsights,
    exportPayrollReport,
    exportBillingReport,
    exportProfitabilityReport
  } = useFinancialReports();

  const [dashboardData, setDashboardData] = useState<FinancialDashboardData | null>(null);
  const [forecasts, setForecasts] = useState<FinancialForecast[]>([]);
  const [optimizationInsights, setOptimizationInsights] = useState<CostOptimizationInsight[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState('3months');
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchData();
  }, [selectedPeriod]);

  const fetchData = async () => {
    try {
      const endDate = new Date();
      const startDate = new Date();
      
      // Set date range based on selected period
      switch (selectedPeriod) {
        case '1month':
          startDate.setMonth(endDate.getMonth() - 1);
          break;
        case '3months':
          startDate.setMonth(endDate.getMonth() - 3);
          break;
        case '6months':
          startDate.setMonth(endDate.getMonth() - 6);
          break;
        case '12months':
          startDate.setFullYear(endDate.getFullYear() - 1);
          break;
        case 'ytd':
          startDate.setMonth(0, 1);
          break;
      }

      const filter: FinancialReportsFilter = {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      };

      const [dashboardResult, forecastsResult, optimizationResult] = await Promise.all([
        getFinancialDashboardData(filter),
        getFinancialForecasts(6),
        getCostOptimizationInsights(),
      ]);

      setDashboardData(dashboardResult);
      setForecasts(forecastsResult);
      setOptimizationInsights(optimizationResult);
    } catch (error) {
      console.error('Failed to fetch financial data:', error);
    }
  };
  const handleExportReport = async (type: 'payroll' | 'billing' | 'profitability') => {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setMonth(endDate.getMonth() - 3); // Default to 3 months

      const filter: FinancialReportsFilter = {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      };

      let result;
      switch (type) {
        case 'payroll':
          result = await exportPayrollReport(filter);
          break;
        case 'billing':
          result = await exportBillingReport(filter);
          break;
        case 'profitability':
          result = await exportProfitabilityReport(filter);
          break;
      }

      if ((result as any)?.downloadUrl) {
        // In a real implementation, this would trigger a file download
        console.log('Download URL:', (result as any).downloadUrl);
        alert(`${type} report exported successfully! File: ${(result as any).fileName}`);
      }
    } catch (error) {
      console.error(`Failed to export ${type} report:`, error);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="grid gap-4 md:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-64 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="h-12 w-12 mx-auto text-red-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Financial Data</h3>
        <p className="text-gray-600 mb-4">{error}</p>
        <Button onClick={fetchData}>Try Again</Button>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="text-center py-12">
        <BarChart3 className="h-12 w-12 mx-auto text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Financial Data Available</h3>
        <p className="text-gray-600">Financial reports will be available after processing payroll and invoices.</p>
      </div>
    );
  }

  const { kpis, payrollSummary, billingSummary, siteProfitability } = dashboardData;
  return (
    <div className="space-y-6">
      {/* Header with Period Selection and Export Options */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Financial Reports & Analytics</h1>
          <p className="text-gray-600">Comprehensive financial reporting with drill-down capabilities</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1month">Last Month</SelectItem>
              <SelectItem value="3months">Last 3 Months</SelectItem>
              <SelectItem value="6months">Last 6 Months</SelectItem>
              <SelectItem value="12months">Last 12 Months</SelectItem>
              <SelectItem value="ytd">Year to Date</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => handleExportReport('payroll')}>
            <Download className="h-4 w-4 mr-2" />
            Export Reports
          </Button>
        </div>
      </div>

      {/* Key Performance Indicators */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(kpis.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">
              {billingSummary.growthPercentage > 0 ? (
                <span className="text-green-600 flex items-center">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  +{formatPercentage(billingSummary.growthPercentage)} from last period
                </span>
              ) : (
                <span className="text-red-600 flex items-center">
                  <TrendingDown className="h-3 w-3 mr-1" />
                  {formatPercentage(billingSummary.growthPercentage)} from last period
                </span>
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Payroll</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(kpis.totalPayroll)}</div>
            <p className="text-xs text-muted-foreground">
              {payrollSummary.growthPercentage > 0 ? (
                <span className="text-orange-600 flex items-center">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  +{formatPercentage(payrollSummary.growthPercentage)} from last period
                </span>
              ) : (
                <span className="text-green-600 flex items-center">
                  <TrendingDown className="h-3 w-3 mr-1" />
                  {formatPercentage(Math.abs(payrollSummary.growthPercentage))} from last period
                </span>
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gross Profit</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(kpis.grossProfit)}</div>
            <p className="text-xs text-muted-foreground">
              Profit margin: {formatPercentage(kpis.profitMargin)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Employee Productivity</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(kpis.employeeProductivity)}</div>
            <p className="text-xs text-muted-foreground">
              Revenue per employee
            </p>
          </CardContent>
        </Card>
      </div>
      {/* Detailed Analytics Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="payroll">Payroll Reports</TabsTrigger>
          <TabsTrigger value="billing">Billing Analysis</TabsTrigger>
          <TabsTrigger value="profitability">Site Profitability</TabsTrigger>
          <TabsTrigger value="forecasting">Forecasting</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Financial Overview Cards */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Revenue vs Payroll Trends</CardTitle>
                <CardDescription>Monthly comparison of revenue and payroll expenses</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {billingSummary.monthlyTrends.slice(-6).map((trend, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{trend.month} {trend.year}</p>
                        <p className="text-sm text-gray-600">{trend.invoiceCount} invoices</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-green-600">{formatCurrency(trend.totalRevenue)}</p>
                        <p className="text-sm text-orange-600">
                          {formatCurrency(payrollSummary.monthlyTrends[index]?.totalPayroll || 0)} payroll
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Collection Performance</CardTitle>
                <CardDescription>Invoice status and collection metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Collection Rate</span>
                    <span className="text-sm font-semibold">{formatPercentage(billingSummary.collectionRate)}</span>
                  </div>
                  <Progress value={billingSummary.collectionRate} className="h-2" />
                  
                  <div className="space-y-3 mt-4">
                    {billingSummary.statusDistribution.map((status, index) => (
                      <div key={index} className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: `hsl(${index * 120}, 70%, 50%)` }}
                          />
                          <span className="text-sm">{status.status}</span>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold">{formatCurrency(status.amount)}</p>
                          <p className="text-xs text-gray-500">
                            {status.count} invoices ({formatPercentage(status.percentage)})
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Cost Optimization Opportunities</CardTitle>
                <CardDescription>Potential savings and improvement areas</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {optimizationInsights.slice(0, 3).map((insight, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium">{insight.category}</h4>
                        <Badge variant={
                          insight.priority === 'high' ? 'destructive' :
                          insight.priority === 'medium' ? 'default' : 'secondary'
                        }>
                          {insight.priority}
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Current Cost:</span>
                          <span className="font-semibold">{formatCurrency(insight.currentCost)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Potential Savings:</span>
                          <span className="font-semibold text-green-600">
                            {formatCurrency(insight.potentialSavings)} ({formatPercentage(insight.savingsPercentage)})
                          </span>
                        </div>
                        <div className="mt-3">
                          <p className="text-xs text-gray-600 mb-1">Key Actions:</p>
                          <ul className="text-xs text-gray-600 space-y-1">
                            {insight.actionItems.slice(0, 2).map((action, actionIndex) => (
                              <li key={actionIndex} className="flex items-start gap-2">
                                <span>•</span>
                                <span>{action}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Performing Sites</CardTitle>
                <CardDescription>Sites with highest profitability</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {siteProfitability.slice(0, 5).map((site, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <Building className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium">{site.siteName}</p>
                          <p className="text-sm text-gray-600">{site.clientName}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{formatPercentage(site.profitMargin)}</p>
                        <p className="text-sm text-gray-600">{formatCurrency(site.grossProfit)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        <TabsContent value="payroll" className="space-y-6">
          {/* Payroll Reports */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Payroll Summary</CardTitle>
                  <CardDescription>Comprehensive payroll breakdown and analysis</CardDescription>
                </div>
                <Button variant="outline" onClick={() => handleExportReport('payroll')}>
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Total Payroll</p>
                      <p className="text-xl font-bold">{formatCurrency(payrollSummary.totalPayroll)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Net Payroll</p>
                      <p className="text-xl font-bold">{formatCurrency(payrollSummary.netPayroll)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Employee Count</p>
                      <p className="text-xl font-bold">{payrollSummary.employeeCount}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Avg Salary</p>
                      <p className="text-xl font-bold">{formatCurrency(payrollSummary.avgSalaryPerEmployee)}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Regular Hours</span>
                        <span>{payrollSummary.totalRegularHours.toLocaleString()} hrs</span>
                      </div>
                      <Progress value={85} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Overtime Hours</span>
                        <span>{payrollSummary.totalOvertimeHours.toLocaleString()} hrs</span>
                      </div>
                      <Progress value={15} className="h-2 bg-orange-100" />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Deductions</span>
                        <span>{formatCurrency(payrollSummary.totalDeductions)}</span>
                      </div>
                      <Progress value={10} className="h-2 bg-red-100" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Department Breakdown</CardTitle>
                <CardDescription>Payroll distribution across departments</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {payrollSummary.departmentBreakdown.map((dept, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">{dept.department}</span>
                        <div className="text-right">
                          <p className="text-sm font-semibold">{formatCurrency(dept.totalPayroll)}</p>
                          <p className="text-xs text-gray-500">{dept.employeeCount} employees</p>
                        </div>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ width: `${dept.percentage}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-600">{formatPercentage(dept.percentage)} of total payroll</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Monthly Payroll Trends</CardTitle>
                <CardDescription>Payroll expenses and employee count over time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {payrollSummary.monthlyTrends.map((trend, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{trend.month} {trend.year}</p>
                        <p className="text-sm text-gray-600">{trend.employeeCount} employees</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{formatCurrency(trend.totalPayroll)}</p>
                        <p className="text-sm text-gray-600">{formatCurrency(trend.avgSalary)} avg</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        <TabsContent value="billing" className="space-y-6">
          {/* Billing Analysis */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Revenue Analysis</CardTitle>
                  <CardDescription>Billing performance and revenue metrics</CardDescription>
                </div>
                <Button variant="outline" onClick={() => handleExportReport('billing')}>
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Total Revenue</p>
                      <p className="text-xl font-bold">{formatCurrency(billingSummary.totalRevenue)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Outstanding</p>
                      <p className="text-xl font-bold text-orange-600">{formatCurrency(billingSummary.totalOutstanding)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Total Invoices</p>
                      <p className="text-xl font-bold">{billingSummary.totalInvoices}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Avg Invoice Value</p>
                      <p className="text-xl font-bold">{formatCurrency(billingSummary.avgInvoiceValue)}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Collection Rate</span>
                      <span className="text-sm font-semibold">{formatPercentage(billingSummary.collectionRate)}</span>
                    </div>
                    <Progress value={billingSummary.collectionRate} className="h-3" />
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Revenue Growth</span>
                      <span className={`text-sm font-semibold ${billingSummary.growthPercentage > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {billingSummary.growthPercentage > 0 ? '+' : ''}{formatPercentage(billingSummary.growthPercentage)}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Clients by Revenue</CardTitle>
                <CardDescription>Revenue contribution by client</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {billingSummary.clientBreakdown.slice(0, 5).map((client, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                          <span className="text-xs font-semibold text-green-600">#{index + 1}</span>
                        </div>
                        <div>
                          <p className="font-medium">{client.clientName}</p>
                          <p className="text-sm text-gray-600">{client.invoiceCount} invoices</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{formatCurrency(client.totalRevenue)}</p>
                        <p className="text-sm text-gray-600">{formatPercentage(client.percentage)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Monthly Revenue Trends</CardTitle>
                <CardDescription>Revenue performance over time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {billingSummary.monthlyTrends.map((trend, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{trend.month} {trend.year}</p>
                        <p className="text-sm text-gray-600">{trend.invoiceCount} invoices</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{formatCurrency(trend.totalRevenue)}</p>
                        <p className="text-sm text-gray-600">{formatCurrency(trend.avgValue)} avg</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        <TabsContent value="profitability" className="space-y-6">
          {/* Site Profitability Analysis */}
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold">Site Profitability Analysis</h3>
                <p className="text-gray-600">Analyze cost optimization and profitability by site</p>
              </div>
              <Button variant="outline" onClick={() => handleExportReport('profitability')}>
                <Download className="h-4 w-4 mr-2" />
                Export Analysis
              </Button>
            </div>

            <div className="grid gap-4">
              {siteProfitability.map((site, index) => (
                <Card key={index}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{site.siteName}</CardTitle>
                        <CardDescription>{site.clientName}</CardDescription>
                      </div>
                      <div className="text-right">
                        <div className={`text-2xl font-bold ${site.profitMargin > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatPercentage(site.profitMargin)}
                        </div>
                        <p className="text-sm text-gray-600">Profit Margin</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-3 gap-6">
                      <div className="space-y-4">
                        <h4 className="font-medium text-gray-900">Financial Metrics</h4>
                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Revenue</span>
                            <span className="font-semibold">{formatCurrency(site.revenue)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Payroll Costs</span>
                            <span className="font-semibold text-orange-600">{formatCurrency(site.payrollCosts)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Operational Costs</span>
                            <span className="font-semibold text-red-600">{formatCurrency(site.operationalCosts)}</span>
                          </div>
                          <div className="flex justify-between border-t pt-2">
                            <span className="text-sm font-medium">Gross Profit</span>
                            <span className={`font-bold ${site.grossProfit > 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {formatCurrency(site.grossProfit)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h4 className="font-medium text-gray-900">Operational Metrics</h4>
                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Employee Count</span>
                            <span className="font-semibold">{site.employeeCount}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Hours Worked</span>
                            <span className="font-semibold">{site.hoursWorked.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Utilization Rate</span>
                            <span className="font-semibold">{formatPercentage(site.utilizationRate)}</span>
                          </div>
                          <div className="mt-2">
                            <div className="flex justify-between text-sm mb-1">
                              <span>Capacity Utilization</span>
                              <span>{formatPercentage(site.utilizationRate)}</span>
                            </div>
                            <Progress value={site.utilizationRate} className="h-2" />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h4 className="font-medium text-gray-900">Optimization Recommendations</h4>
                        <div className="space-y-2">
                          {site.recommendations.map((recommendation, recIndex) => (
                            <div key={recIndex} className="flex items-start gap-2 text-sm">
                              <CheckCircle className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                              <span className="text-gray-700">{recommendation}</span>
                            </div>
                          ))}
                          {site.recommendations.length === 0 && (
                            <p className="text-sm text-gray-500 italic">Site is performing optimally</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </TabsContent>
        <TabsContent value="forecasting" className="space-y-6">
          {/* Financial Forecasting and Budget Planning */}
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold">Financial Forecasting & Budget Planning</h3>
              <p className="text-gray-600">Predictive analytics and budget planning tools</p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>6-Month Financial Forecast</CardTitle>
                  <CardDescription>Projected revenue, costs, and profitability</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {forecasts.slice(0, 6).map((forecast, index) => (
                      <div key={index} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="font-medium">{forecast.period}</span>
                          <div className="text-right">
                            <p className="text-sm font-semibold">{formatCurrency(forecast.projectedProfit)}</p>
                            <p className="text-xs text-gray-500">
                              Confidence: {formatPercentage(forecast.confidence * 100)}
                            </p>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div>
                            <p className="text-gray-600">Revenue</p>
                            <p className="font-semibold text-green-600">{formatCurrency(forecast.projectedRevenue)}</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Payroll</p>
                            <p className="font-semibold text-orange-600">{formatCurrency(forecast.projectedPayroll)}</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Profit</p>
                            <p className={`font-semibold ${forecast.projectedProfit > 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {formatCurrency(forecast.projectedProfit)}
                            </p>
                          </div>
                        </div>
                        <Progress value={forecast.confidence * 100} className="h-1" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Budget Planning Tools</CardTitle>
                  <CardDescription>Analysis and planning recommendations</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Target className="h-4 w-4 text-blue-600" />
                        <span className="font-medium text-blue-900">Revenue Target</span>
                      </div>
                      <p className="text-2xl font-bold text-blue-900">
                        {formatCurrency(forecasts[0]?.projectedRevenue * 1.1 || 0)}
                      </p>
                      <p className="text-sm text-blue-700">
                        Recommended target (+10% growth)
                      </p>
                    </div>

                    <div className="p-4 bg-orange-50 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="h-4 w-4 text-orange-600" />
                        <span className="font-medium text-orange-900">Cost Control</span>
                      </div>
                      <p className="text-2xl font-bold text-orange-900">
                        {formatCurrency(forecasts[0]?.projectedPayroll * 0.95 || 0)}
                      </p>
                      <p className="text-sm text-orange-700">
                        Target payroll cost (-5% optimization)
                      </p>
                    </div>

                    <div className="space-y-3">
                      <h4 className="font-medium">Forecast Factors</h4>
                      {forecasts[0]?.factors.map((factor, index) => (
                        <div key={index} className="flex items-start gap-2 text-sm">
                          <span className="w-2 h-2 bg-gray-400 rounded-full mt-2 flex-shrink-0" />
                          <span className="text-gray-700">{factor}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle>Strategic Recommendations</CardTitle>
                  <CardDescription>Data-driven insights for business growth</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-3 gap-6">
                    <div>
                      <h4 className="font-medium text-green-900 mb-3">Growth Opportunities</h4>
                      <div className="space-y-2">
                        <p className="text-sm">• Expand high-margin client contracts</p>
                        <p className="text-sm">• Optimize pricing for underperforming sites</p>
                        <p className="text-sm">• Invest in employee training programs</p>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium text-orange-900 mb-3">Cost Management</h4>
                      <div className="space-y-2">
                        <p className="text-sm">• Reduce overtime dependency</p>
                        <p className="text-sm">• Implement better shift planning</p>
                        <p className="text-sm">• Negotiate better operational rates</p>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium text-blue-900 mb-3">Risk Mitigation</h4>
                      <div className="space-y-2">
                        <p className="text-sm">• Diversify client portfolio</p>
                        <p className="text-sm">• Build emergency cash reserves</p>
                        <p className="text-sm">• Monitor collection performance</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}