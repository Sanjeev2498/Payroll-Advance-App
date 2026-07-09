'use client';

import { useState, useEffect } from 'react';
import { 
  DollarSign, 
  Plus, 
  Download, 
  Filter,
  Calendar,
  Users,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  BarChart3,
  FileText,
  Eye
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { CreatePayrollRunDialog } from './CreatePayrollRunDialog';
import { PayrollRunDetails } from './PayrollRunDetails';
import { PayrollAnalytics } from './PayrollAnalytics';
import { usePayroll } from '@/hooks/use-payroll';
import { formatDate, formatCurrency } from '@/lib/utils';

interface PayrollRun {
  id: string;
  runNumber: string;
  payPeriodStart: string;
  payPeriodEnd: string;
  status: 'DRAFT' | 'PROCESSING' | 'COMPLETED' | 'CANCELLED';
  totalAmount: number;
  employeeCount: number;
  createdAt: string;
  processedAt?: string;
}

export function PayrollOperationsDashboard() {
  const { 
    payrollRuns, 
    analytics, 
    isLoading, 
    error, 
    fetchPayrollRuns,
    fetchAnalytics,
    createPayrollRun,
    approvePayrollRun,
    exportPayrollRun
  } = usePayroll();

  const [selectedRun, setSelectedRun] = useState<PayrollRun | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [filters, setFilters] = useState({
    status: '',
    startDate: '',
    endDate: ''
  });

  useEffect(() => {
    fetchPayrollRuns();
    fetchAnalytics();
  }, []);

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      DRAFT: { 
        color: 'bg-gray-100 text-gray-800', 
        icon: <Clock className="h-3 w-3" />,
        label: 'Draft' 
      },
      PROCESSING: { 
        color: 'bg-yellow-100 text-yellow-800', 
        icon: <Clock className="h-3 w-3" />,
        label: 'Processing' 
      },
      COMPLETED: { 
        color: 'bg-green-100 text-green-800', 
        icon: <CheckCircle className="h-3 w-3" />,
        label: 'Completed' 
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

  const handleCreateRun = async (data: any) => {
    try {
      await createPayrollRun(data);
      setShowCreateDialog(false);
      fetchPayrollRuns();
    } catch (error) {
      console.error('Failed to create payroll run:', error);
    }
  };

  const handleApproveRun = async (runId: string) => {
    try {
      await approvePayrollRun(runId, { approved: true });
      fetchPayrollRuns();
    } catch (error) {
      console.error('Failed to approve payroll run:', error);
    }
  };

  const handleExportRun = async (runId: string, format: string = 'xlsx') => {
    try {
      await exportPayrollRun(runId, { format });
    } catch (error) {
      console.error('Failed to export payroll run:', error);
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
          <h1 className="text-2xl font-bold text-gray-900">Payroll Operations</h1>
          <p className="text-gray-600">Manage payroll runs, approvals, and salary processing</p>
        </div>
        <Button 
          onClick={() => setShowCreateDialog(true)}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Payroll Run
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.totalEmployees || 0}</div>
            <p className="text-xs text-muted-foreground">Active employees</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Payroll</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₹{analytics?.monthlyPayroll?.toLocaleString() || 0}
            </div>
            <p className="text-xs text-muted-foreground">Current month total</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.pendingApprovals || 0}</div>
            <p className="text-xs text-muted-foreground">Awaiting approval</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Processing Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.avgProcessingTime || '0'}h</div>
            <p className="text-xs text-muted-foreground">Average processing</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="runs" className="space-y-6">
        <TabsList>
          <TabsTrigger value="runs">Payroll Runs</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="runs" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Filter Payroll Runs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select value={filters.status} onValueChange={(value) => setFilters({...filters, status: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All statuses</SelectItem>
                      <SelectItem value="DRAFT">Draft</SelectItem>
                      <SelectItem value="PROCESSING">Processing</SelectItem>
                      <SelectItem value="COMPLETED">Completed</SelectItem>
                      <SelectItem value="CANCELLED">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    type="date"
                    value={filters.startDate}
                    onChange={(e) => setFilters({...filters, startDate: e.target.value})}
                  />
                </div>

                <div>
                  <Label htmlFor="endDate">End Date</Label>
                  <Input
                    type="date"
                    value={filters.endDate}
                    onChange={(e) => setFilters({...filters, endDate: e.target.value})}
                  />
                </div>

                <div className="flex items-end">
                  <Button 
                    variant="outline" 
                    onClick={() => fetchPayrollRuns(filters)}
                    className="w-full"
                  >
                    <Filter className="h-4 w-4 mr-2" />
                    Apply Filters
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payroll Runs List */}
          <Card>
            <CardHeader>
              <CardTitle>Payroll Runs</CardTitle>
              <CardDescription>
                Manage and track all payroll processing runs
              </CardDescription>
            </CardHeader>
            <CardContent>
              {error && (
                <div className="text-center py-8">
                  <p className="text-red-600">{error}</p>
                  <Button variant="outline" onClick={() => fetchPayrollRuns()} className="mt-2">
                    Retry
                  </Button>
                </div>
              )}

              {payrollRuns.length > 0 ? (
                <div className="space-y-4">
                  {payrollRuns.map((run) => (
                    <div key={run.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="font-semibold text-lg">{run.runNumber}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            {getStatusBadge(run.status)}
                            <span className="text-sm text-gray-600">
                              {formatDate(run.payPeriodStart)} - {formatDate(run.payPeriodEnd)}
                            </span>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedRun(selectedRun?.id === run.id ? null : run)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            {selectedRun?.id === run.id ? 'Hide' : 'Details'}
                          </Button>
                          
                          {run.status === 'PROCESSING' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleApproveRun(run.id)}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                          )}

                          {run.status === 'COMPLETED' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleExportRun(run.id)}
                            >
                              <Download className="h-4 w-4 mr-1" />
                              Export
                            </Button>
                          )}
                        </div>
                      </div>

                      <div className="grid md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="font-medium text-gray-700">Total Amount</p>
                          <p className="text-lg font-semibold">₹{run.totalAmount.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="font-medium text-gray-700">Employees</p>
                          <p className="text-lg">{run.employeeCount}</p>
                        </div>
                        <div>
                          <p className="font-medium text-gray-700">Created</p>
                          <p className="text-lg">{formatDate(run.createdAt)}</p>
                        </div>
                        <div>
                          <p className="font-medium text-gray-700">Processed</p>
                          <p className="text-lg">
                            {run.processedAt ? formatDate(run.processedAt) : 'Pending'}
                          </p>
                        </div>
                      </div>

                      {/* Expanded Details */}
                      {selectedRun?.id === run.id && (
                        <PayrollRunDetails runId={run.id} />
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <DollarSign className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No payroll runs found</h3>
                  <p className="text-gray-600 mb-4">
                    Create your first payroll run to get started.
                  </p>
                  <Button onClick={() => setShowCreateDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Payroll Run
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <PayrollAnalytics />
        </TabsContent>

        <TabsContent value="reports" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Payroll Reports</CardTitle>
              <CardDescription>
                Generate and download various payroll reports
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="font-semibold">Standard Reports</h3>
                  <div className="space-y-2">
                    <Button variant="outline" className="w-full justify-start">
                      <FileText className="h-4 w-4 mr-2" />
                      Monthly Payroll Summary
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <BarChart3 className="h-4 w-4 mr-2" />
                      Employee Salary Report
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <TrendingUp className="h-4 w-4 mr-2" />
                      Payroll Trends Analysis
                    </Button>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold">Tax & Compliance</h3>
                  <div className="space-y-2">
                    <Button variant="outline" className="w-full justify-start">
                      <FileText className="h-4 w-4 mr-2" />
                      Tax Deduction Summary
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <FileText className="h-4 w-4 mr-2" />
                      Provident Fund Report
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <FileText className="h-4 w-4 mr-2" />
                      ESI Contribution Report
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Payroll Run Dialog */}
      <CreatePayrollRunDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSubmit={handleCreateRun}
      />
    </div>
  );
}