'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, DollarSign, FileText, Users, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { useBilling } from '@/hooks/use-billing';

export function BillingAnalytics() {
  const { getBillingAnalytics } = useBilling();
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('3months');

  useEffect(() => {
    fetchAnalytics();
  }, [selectedPeriod]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const data = await getBillingAnalytics({ period: selectedPeriod });
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
        </div>
      </div>
    );
  }

  if (!analyticsData) {
    return (
      <div className="text-center py-12">
        <BarChart3 className="h-12 w-12 mx-auto text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No analytics data available</h3>
        <p className="text-gray-600">Analytics will be available after generating invoices.</p>
      </div>
    );
  }

  const { overview, monthlyTrends, clientBreakdown, statusDistribution } = analyticsData;

  return (
    <div className="space-y-6">
      {/* Period Selection */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Revenue Analytics</h2>
        <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1month">Last Month</SelectItem>
            <SelectItem value="3months">Last 3 Months</SelectItem>
            <SelectItem value="6months">Last 6 Months</SelectItem>
            <SelectItem value="12months">Last 12 Months</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{overview.totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Total billed amount</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">₹{overview.totalOutstanding.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Pending collections</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Invoice Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{overview.averageInvoiceValue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Per invoice</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Collection Rate</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview.collectionRate}%</div>
            <p className="text-xs text-muted-foreground">Payment efficiency</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Monthly Trends */}
        <Card>
          <CardHeader>
            <CardTitle>Monthly Revenue Trends</CardTitle>
            <CardDescription>Revenue performance over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {monthlyTrends.map((trend: any, index: number) => (
                <div key={index} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{trend.month}</p>
                    <p className="text-sm text-gray-600">{trend.invoices} invoices</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">₹{trend.revenue.toLocaleString()}</p>
                    <p className="text-sm text-gray-600">₹{trend.avgValue.toLocaleString()} avg</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Invoice Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Invoice Status Distribution</CardTitle>
            <CardDescription>Breakdown by payment status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {statusDistribution.map((status: any, index: number) => (
                <div key={index} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">{status.status}</span>
                    <div className="text-right">
                      <span className="text-sm font-semibold">₹{status.amount.toLocaleString()}</span>
                      <span className="text-xs text-gray-500 ml-2">({status.count} invoices)</span>
                    </div>
                  </div>
                  <Progress 
                    value={status.percentage} 
                    className="h-2"
                  />
                  <p className="text-xs text-gray-600">{status.percentage}% of total revenue</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Client Revenue Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Top Clients by Revenue</CardTitle>
            <CardDescription>Revenue distribution by client</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {clientBreakdown.map((client: any, index: number) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-xs font-semibold text-blue-600">
                        #{index + 1}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium">{client.client}</p>
                      <p className="text-sm text-gray-600">{client.invoices} invoices</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">₹{client.revenue.toLocaleString()}</p>
                    <p className="text-sm text-gray-600">{client.percentage}%</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Revenue Insights */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue Insights</CardTitle>
            <CardDescription>Key performance indicators</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium">Revenue Growth</span>
                </div>
                <span className="text-green-600 font-semibold">+18%</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium">Average Collection Period</span>
                </div>
                <span className="text-blue-600 font-semibold">28 days</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-orange-600" />
                  <span className="text-sm font-medium">Client Retention Rate</span>
                </div>
                <span className="text-orange-600 font-semibold">95%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}