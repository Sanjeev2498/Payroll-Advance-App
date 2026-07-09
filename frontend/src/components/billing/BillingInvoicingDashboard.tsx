'use client';

import { useState, useEffect } from 'react';
import { 
  FileText, 
  Plus, 
  Download, 
  Filter,
  DollarSign,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  Send,
  Eye
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { CreateInvoiceDialog } from './CreateInvoiceDialog';
import { InvoiceDetails } from './InvoiceDetails';
import { BillingAnalytics } from './BillingAnalytics';
import { PaymentTracker } from './PaymentTracker';
import { useBilling } from '@/hooks/use-billing';
import { formatDate } from '@/lib/utils';

export function BillingInvoicingDashboard() {
  const { 
    invoices, 
    analytics, 
    isLoading, 
    error, 
    fetchInvoices,
    fetchAnalytics,
    createInvoice,
    sendInvoice,
    markPaid,
    generateInvoice
  } = useBilling();

  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [filters, setFilters] = useState({
    status: '',
    client: '',
    startDate: '',
    endDate: ''
  });

  useEffect(() => {
    fetchInvoices();
    fetchAnalytics();
  }, []);

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      DRAFT: { 
        color: 'bg-gray-100 text-gray-800', 
        icon: <Clock className="h-3 w-3" />,
        label: 'Draft' 
      },
      SENT: { 
        color: 'bg-blue-100 text-blue-800', 
        icon: <Send className="h-3 w-3" />,
        label: 'Sent' 
      },
      PAID: { 
        color: 'bg-green-100 text-green-800', 
        icon: <CheckCircle className="h-3 w-3" />,
        label: 'Paid' 
      },
      OVERDUE: { 
        color: 'bg-red-100 text-red-800', 
        icon: <AlertCircle className="h-3 w-3" />,
        label: 'Overdue' 
      },
      CANCELLED: { 
        color: 'bg-red-100 text-red-800', 
        icon: <XCircle className="h-3 w-3" />,
        label: 'Cancelled' 
      },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.DRAFT;
    
    return (
      <Badge className={`${config.color} flex items-center gap-1`}>
        {config.icon}
        {config.label}
      </Badge>
    );
  };

  const handleCreateInvoice = async (data: any) => {
    try {
      await createInvoice(data);
      setShowCreateDialog(false);
      fetchInvoices();
    } catch (error) {
      console.error('Failed to create invoice:', error);
    }
  };

  const handleSendInvoice = async (invoiceId: string) => {
    try {
      await sendInvoice(invoiceId);
      fetchInvoices();
    } catch (error) {
      console.error('Failed to send invoice:', error);
    }
  };

  const handleMarkPaid = async (invoiceId: string, paymentData: any) => {
    try {
      await markPaid(invoiceId, paymentData);
      fetchInvoices();
    } catch (error) {
      console.error('Failed to mark invoice as paid:', error);
    }
  };

  const handleGenerateInvoice = async (invoiceId: string, format: string = 'pdf') => {
    try {
      await generateInvoice(invoiceId, { format });
    } catch (error) {
      console.error('Failed to generate invoice:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid gap-4 md:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
          <div className="h-96 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Billing & Invoicing</h1>
          <p className="text-gray-600">Manage invoices, payments, and client billing</p>
        </div>
        <Button 
          onClick={() => setShowCreateDialog(true)}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Invoice
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{analytics?.totalRevenue?.toLocaleString() || 0}</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{analytics?.outstandingAmount?.toLocaleString() || 0}</div>
            <p className="text-xs text-muted-foreground">Pending payments</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paid Invoices</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.paidInvoices || 0}</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{analytics?.overdueInvoices || 0}</div>
            <p className="text-xs text-muted-foreground">Need attention</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="invoices" className="space-y-6">
        <TabsList>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="payments">Payment Tracking</TabsTrigger>
          <TabsTrigger value="analytics">Revenue Analytics</TabsTrigger>
          <TabsTrigger value="clients">Client Billing</TabsTrigger>
        </TabsList>

        <TabsContent value="invoices" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Filter Invoices</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-5 gap-4">
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select value={filters.status} onValueChange={(value) => setFilters({...filters, status: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All statuses</SelectItem>
                      <SelectItem value="DRAFT">Draft</SelectItem>
                      <SelectItem value="SENT">Sent</SelectItem>
                      <SelectItem value="PAID">Paid</SelectItem>
                      <SelectItem value="OVERDUE">Overdue</SelectItem>
                      <SelectItem value="CANCELLED">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="client">Client</Label>
                  <Select value={filters.client} onValueChange={(value) => setFilters({...filters, client: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="All clients" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All clients</SelectItem>
                      <SelectItem value="client1">TechCorp Ltd</SelectItem>
                      <SelectItem value="client2">Secure Industries</SelectItem>
                      <SelectItem value="client3">Metro Solutions</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="startDate">From Date</Label>
                  <Input
                    type="date"
                    value={filters.startDate}
                    onChange={(e) => setFilters({...filters, startDate: e.target.value})}
                  />
                </div>

                <div>
                  <Label htmlFor="endDate">To Date</Label>
                  <Input
                    type="date"
                    value={filters.endDate}
                    onChange={(e) => setFilters({...filters, endDate: e.target.value})}
                  />
                </div>

                <div className="flex items-end">
                  <Button 
                    variant="outline" 
                    onClick={() => fetchInvoices(filters)}
                    className="w-full"
                  >
                    <Filter className="h-4 w-4 mr-2" />
                    Apply Filters
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Invoices List */}
          <Card>
            <CardHeader>
              <CardTitle>Invoices</CardTitle>
              <CardDescription>
                Manage and track all client invoices
              </CardDescription>
            </CardHeader>
            <CardContent>
              {error && (
                <div className="text-center py-8">
                  <p className="text-red-600">{error}</p>
                  <Button variant="outline" onClick={() => fetchInvoices()} className="mt-2">
                    Retry
                  </Button>
                </div>
              )}

              {invoices.length > 0 ? (
                <div className="space-y-4">
                  {invoices.map((invoice: any) => (
                    <div key={invoice.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="font-semibold text-lg">{invoice.invoiceNumber}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            {getStatusBadge(invoice.status)}
                            <span className="text-sm text-gray-600">
                              {invoice.clientName}
                            </span>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedInvoice(selectedInvoice?.id === invoice.id ? null : invoice)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            {selectedInvoice?.id === invoice.id ? 'Hide' : 'Details'}
                          </Button>
                          
                          {invoice.status === 'DRAFT' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleSendInvoice(invoice.id)}
                            >
                              <Send className="h-4 w-4 mr-1" />
                              Send
                            </Button>
                          )}

                          {invoice.status === 'SENT' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleMarkPaid(invoice.id, { paidDate: new Date().toISOString() })}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Mark Paid
                            </Button>
                          )}

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleGenerateInvoice(invoice.id)}
                          >
                            <Download className="h-4 w-4 mr-1" />
                            Download
                          </Button>
                        </div>
                      </div>

                      <div className="grid md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="font-medium text-gray-700">Amount</p>
                          <p className="text-lg font-semibold">₹{invoice.amount.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="font-medium text-gray-700">Issue Date</p>
                          <p className="text-lg">{formatDate(invoice.issueDate)}</p>
                        </div>
                        <div>
                          <p className="font-medium text-gray-700">Due Date</p>
                          <p className="text-lg">{formatDate(invoice.dueDate)}</p>
                        </div>
                        <div>
                          <p className="font-medium text-gray-700">Period</p>
                          <p className="text-lg">
                            {formatDate(invoice.billingPeriodStart)} - {formatDate(invoice.billingPeriodEnd)}
                          </p>
                        </div>
                      </div>

                      {/* Expanded Details */}
                      {selectedInvoice?.id === invoice.id && (
                        <InvoiceDetails invoiceId={invoice.id} />
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No invoices found</h3>
                  <p className="text-gray-600 mb-4">
                    Create your first invoice to get started.
                  </p>
                  <Button onClick={() => setShowCreateDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Invoice
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="space-y-6">
          <PaymentTracker />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <BillingAnalytics />
        </TabsContent>

        <TabsContent value="clients" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Client Billing Configuration</CardTitle>
              <CardDescription>
                Manage billing rates and payment terms for clients
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Client billing configuration will be implemented here */}
                <p className="text-gray-600">Client billing configuration interface coming soon...</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Invoice Dialog */}
      <CreateInvoiceDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSubmit={handleCreateInvoice}
      />
    </div>
  );
}