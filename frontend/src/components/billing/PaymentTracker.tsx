'use client';

import { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, Clock, DollarSign, Calendar, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useBilling } from '@/hooks/use-billing';
import { formatDate } from '@/lib/utils';

export function PaymentTracker() {
  const { getPaymentTracking } = useBilling();
  const [paymentData, setPaymentData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPaymentData();
  }, []);

  const fetchPaymentData = async () => {
    try {
      setLoading(true);
      const data = await getPaymentTracking();
      setPaymentData(data);
    } catch (error) {
      console.error('Failed to fetch payment data:', error);
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

  if (!paymentData) {
    return (
      <div className="text-center py-12">
        <DollarSign className="h-12 w-12 mx-auto text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No payment data available</h3>
        <p className="text-gray-600">Payment tracking will show data once invoices are created.</p>
      </div>
    );
  }

  const { upcomingPayments, overduePayments, recentPayments, paymentSummary } = paymentData;

  const getUrgencyBadge = (daysUntilDue: number) => {
    if (daysUntilDue < 0) {
      return <Badge className="bg-red-100 text-red-800">Overdue</Badge>;
    } else if (daysUntilDue <= 3) {
      return <Badge className="bg-orange-100 text-orange-800">Due Soon</Badge>;
    } else if (daysUntilDue <= 7) {
      return <Badge className="bg-yellow-100 text-yellow-800">Due This Week</Badge>;
    } else {
      return <Badge className="bg-green-100 text-green-800">On Track</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Receivables</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{paymentSummary.totalReceivables.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Outstanding amounts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue Amount</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">₹{paymentSummary.totalOverdue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Requires attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Collection Efficiency</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{paymentSummary.collectionEfficiency}%</div>
            <p className="text-xs text-muted-foreground">Payment success rate</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Collection Period</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{paymentSummary.averageCollectionPeriod} days</div>
            <p className="text-xs text-muted-foreground">Time to collect</p>
          </CardContent>
        </Card>
      </div>

      {/* Payment Tracking Tabs */}
      <Tabs defaultValue="upcoming" className="space-y-4">
        <TabsList>
          <TabsTrigger value="upcoming">Upcoming Payments</TabsTrigger>
          <TabsTrigger value="overdue">Overdue Payments</TabsTrigger>
          <TabsTrigger value="recent">Recent Payments</TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Payments</CardTitle>
              <CardDescription>
                Payments due in the next 30 days
              </CardDescription>
            </CardHeader>
            <CardContent>
              {upcomingPayments.length > 0 ? (
                <div className="space-y-4">
                  {upcomingPayments.map((payment: any) => (
                    <div key={payment.invoiceId} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <Clock className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium">{payment.invoiceNumber}</p>
                          <p className="text-sm text-gray-600">{payment.clientName}</p>
                          <p className="text-xs text-gray-500">Due: {formatDate(payment.dueDate)}</p>
                        </div>
                      </div>
                      <div className="text-right flex items-center gap-4">
                        <div>
                          <p className="font-semibold">₹{payment.amount.toLocaleString()}</p>
                          <p className="text-xs text-gray-500">{payment.daysUntilDue} days left</p>
                        </div>
                        {getUrgencyBadge(payment.daysUntilDue)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Clock className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No upcoming payments</h3>
                  <p className="text-gray-600">All invoices are either paid or overdue</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="overdue" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Overdue Payments</CardTitle>
              <CardDescription>
                Payments that are past their due date
              </CardDescription>
            </CardHeader>
            <CardContent>
              {overduePayments.length > 0 ? (
                <div className="space-y-4">
                  {overduePayments.map((payment: any) => (
                    <div key={payment.invoiceId} className="flex items-center justify-between p-4 border border-red-200 rounded-lg bg-red-50">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                          <AlertCircle className="h-5 w-5 text-red-600" />
                        </div>
                        <div>
                          <p className="font-medium">{payment.invoiceNumber}</p>
                          <p className="text-sm text-gray-600">{payment.clientName}</p>
                          <p className="text-xs text-red-600">Due: {formatDate(payment.dueDate)}</p>
                        </div>
                      </div>
                      <div className="text-right flex items-center gap-4">
                        <div>
                          <p className="font-semibold">₹{payment.amount.toLocaleString()}</p>
                          <p className="text-xs text-red-600">{payment.daysOverdue} days overdue</p>
                        </div>
                        <Button variant="outline" size="sm" className="border-red-300 text-red-600">
                          Follow Up
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 mx-auto text-green-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No overdue payments</h3>
                  <p className="text-gray-600">All invoices are up to date</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recent" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Payments</CardTitle>
              <CardDescription>
                Payments received in the last 30 days
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recentPayments.length > 0 ? (
                <div className="space-y-4">
                  {recentPayments.map((payment: any) => (
                    <div key={payment.invoiceId} className="flex items-center justify-between p-4 border border-green-200 rounded-lg bg-green-50">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <p className="font-medium">{payment.invoiceNumber}</p>
                          <p className="text-sm text-gray-600">{payment.clientName}</p>
                          <p className="text-xs text-green-600">Paid: {formatDate(payment.paidDate)}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">₹{payment.amount.toLocaleString()}</p>
                        <p className="text-xs text-gray-500">{payment.paymentMethod}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <DollarSign className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No recent payments</h3>
                  <p className="text-gray-600">No payments received in the last 30 days</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}