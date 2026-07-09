'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DollarSign, FileText, Download, Eye } from 'lucide-react';

interface InvoiceBillingProps {
  clientId: string;
}

export function InvoiceBilling({ clientId }: InvoiceBillingProps) {
  // Mock billing data
  const billingMetrics = {
    totalInvoices: 12,
    pendingInvoices: 3,
    paidInvoices: 8,
    overdueInvoices: 1,
    totalAmountDue: 50000.0,
    totalPaid: 200000.0,
  };

  const recentInvoices = [
    {
      id: 'inv-1',
      invoiceNumber: 'INV-2024-001',
      amount: 25000,
      status: 'PAID',
      dueDate: '2024-01-15',
      period: 'January 2024',
    },
    {
      id: 'inv-2',
      invoiceNumber: 'INV-2024-002',
      amount: 27500,
      status: 'PENDING',
      dueDate: '2024-02-15',
      period: 'February 2024',
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PAID': return 'bg-green-100 text-green-800';
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      case 'OVERDUE': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Billing Dashboard Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Invoices</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{billingMetrics.totalInvoices}</div>
            <p className="text-sm text-gray-600">{billingMetrics.paidInvoices} paid, {billingMetrics.pendingInvoices} pending</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Amount Due</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              ₹{billingMetrics.totalAmountDue.toLocaleString()}
            </div>
            <p className="text-sm text-gray-600">{billingMetrics.overdueInvoices} overdue</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Paid</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ₹{billingMetrics.totalPaid.toLocaleString()}
            </div>
            <p className="text-sm text-gray-600">This year</p>
          </CardContent>
        </Card>
      </div>

      {/* Invoice Dashboard */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Invoice Dashboard
          </CardTitle>
          <CardDescription>
            View and download invoices with payment tracking
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentInvoices.map((invoice) => (
              <div key={invoice.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">{invoice.invoiceNumber}</h4>
                    <p className="text-sm text-gray-600">{invoice.period}</p>
                  </div>
                  <Badge className={getStatusColor(invoice.status)}>
                    {invoice.status}
                  </Badge>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <div>
                    <p className="text-lg font-semibold">₹{invoice.amount.toLocaleString()}</p>
                    <p className="text-sm text-gray-600">Due: {invoice.dueDate}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="flex items-center gap-1">
                      <Eye className="h-3 w-3" />
                      View
                    </Button>
                    <Button size="sm" className="flex items-center gap-1">
                      <Download className="h-3 w-3" />
                      Download PDF
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Service Charges Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Service Charges Breakdown
          </CardTitle>
          <CardDescription>
            Detailed breakdown of service charges and billing components
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span>Security Services</span>
              <span className="font-medium">₹180,000</span>
            </div>
            <div className="flex justify-between">
              <span>Overtime Charges</span>
              <span className="font-medium">₹20,000</span>
            </div>
            <div className="flex justify-between">
              <span>Special Services</span>
              <span className="font-medium">₹5,000</span>
            </div>
            <hr />
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span className="font-medium">₹205,000</span>
            </div>
            <div className="flex justify-between">
              <span>GST (18%)</span>
              <span className="font-medium">₹36,900</span>
            </div>
            <hr />
            <div className="flex justify-between text-lg font-bold">
              <span>Total</span>
              <span>₹241,900</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}