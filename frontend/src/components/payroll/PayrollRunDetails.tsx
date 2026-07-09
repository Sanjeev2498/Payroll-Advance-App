'use client';

import { useState, useEffect } from 'react';
import { 
  Users, 
  DollarSign, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  Download,
  Edit,
  Eye,
  Calculator
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { usePayroll } from '@/hooks/use-payroll';
import { formatDate, formatCurrency } from '@/lib/utils';

interface PayrollRunDetailsProps {
  runId: string;
}

interface PayrollEmployee {
  id: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  regularHours: number;
  overtimeHours: number;
  grossPay: number;
  totalDeductions: number;
  netPay: number;
  status: 'CALCULATED' | 'APPROVED' | 'PAID' | 'ERROR';
  calculationDate: string;
}

interface PayrollRunDetail {
  id: string;
  runNumber: string;
  payPeriodStart: string;
  payPeriodEnd: string;
  status: string;
  totalAmount: number;
  employeeCount: number;
  createdAt: string;
  processedAt?: string;
  approvedAt?: string;
  approvedBy?: string;
  description?: string;
  employees: PayrollEmployee[];
  summary: {
    totalGross: number;
    totalDeductions: number;
    totalNet: number;
    totalHours: number;
    totalOvertimeHours: number;
    avgSalary: number;
  };
}

export function PayrollRunDetails({ runId }: PayrollRunDetailsProps) {
  const { getPayrollRunDetails, exportPayrollRun } = usePayroll();
  const [runDetails, setRunDetails] = useState<PayrollRunDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRunDetails();
  }, [runId]);

  const fetchRunDetails = async () => {
    try {
      setLoading(true);
      const details = await getPayrollRunDetails(runId);
      setRunDetails(details);
      setError(null);
    } catch (err) {
      setError('Failed to load payroll run details');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportPayslips = async (format: string = 'pdf') => {
    try {
      await exportPayrollRun(runId, { format, type: 'payslips' });
    } catch (error) {
      console.error('Failed to export payslips:', error);
    }
  };

  const handleExportSummary = async (format: string = 'xlsx') => {
    try {
      await exportPayrollRun(runId, { format, type: 'summary' });
    } catch (error) {
      console.error('Failed to export summary:', error);
    }
  };

  const getEmployeeStatusBadge = (status: string) => {
    const statusConfig = {
      CALCULATED: { color: 'bg-blue-100 text-blue-800', label: 'Calculated' },
      APPROVED: { color: 'bg-green-100 text-green-800', label: 'Approved' },
      PAID: { color: 'bg-green-100 text-green-800', label: 'Paid' },
      ERROR: { color: 'bg-red-100 text-red-800', label: 'Error' },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.CALCULATED;
    
    return (
      <Badge className={config.color}>
        {config.label}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="mt-4 pt-4 border-t">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/3"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error || !runDetails) {
    return (
      <div className="mt-4 pt-4 border-t">
        <div className="text-center py-8">
          <AlertTriangle className="h-12 w-12 mx-auto text-red-400 mb-4" />
          <p className="text-red-600">{error || 'Failed to load details'}</p>
          <Button variant="outline" onClick={fetchRunDetails} className="mt-2">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const completionPercentage = runDetails.status === 'COMPLETED' ? 100 : 
    runDetails.status === 'PROCESSING' ? 50 : 25;

  return (
    <div className="mt-4 pt-4 border-t space-y-6">
      {/* Summary Cards */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gross Amount</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{runDetails.summary.totalGross.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Amount</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">₹{runDetails.summary.totalNet.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Hours</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{runDetails.summary.totalHours}</div>
            <p className="text-xs text-muted-foreground">
              +{runDetails.summary.totalOvertimeHours} overtime
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Salary</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{runDetails.summary.avgSalary.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      {/* Processing Status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Processing Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Progress</span>
              <span className="text-sm text-gray-500">{completionPercentage}%</span>
            </div>
            <Progress value={completionPercentage} className="w-full" />
            
            <div className="grid md:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="font-medium">Created</p>
                <p className="text-gray-600">{formatDate(runDetails.createdAt)}</p>
              </div>
              {runDetails.processedAt && (
                <div>
                  <p className="font-medium">Processed</p>
                  <p className="text-gray-600">{formatDate(runDetails.processedAt)}</p>
                </div>
              )}
              {runDetails.approvedAt && (
                <div>
                  <p className="font-medium">Approved</p>
                  <p className="text-gray-600">{formatDate(runDetails.approvedAt)}</p>
                  {runDetails.approvedBy && (
                    <p className="text-xs text-gray-500">by {runDetails.approvedBy}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Tabs */}
      <Tabs defaultValue="employees" className="space-y-4">
        <div className="flex justify-between items-center">
          <TabsList>
            <TabsTrigger value="employees">Employee Details</TabsTrigger>
            <TabsTrigger value="breakdown">Breakdown</TabsTrigger>
            <TabsTrigger value="audit">Audit Trail</TabsTrigger>
          </TabsList>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExportPayslips('pdf')}
            >
              <Download className="h-4 w-4 mr-1" />
              Export Payslips
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExportSummary('xlsx')}
            >
              <Download className="h-4 w-4 mr-1" />
              Export Summary
            </Button>
          </div>
        </div>

        <TabsContent value="employees" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Employee Payroll Details</CardTitle>
              <CardDescription>
                Individual employee calculations for this payroll run
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Hours</TableHead>
                    <TableHead>Gross Pay</TableHead>
                    <TableHead>Deductions</TableHead>
                    <TableHead>Net Pay</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {runDetails.employees.map((employee) => (
                    <TableRow key={employee.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {employee.firstName} {employee.lastName}
                          </p>
                          <p className="text-sm text-gray-500">
                            {employee.employeeNumber}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p>{employee.regularHours + employee.overtimeHours}</p>
                          {employee.overtimeHours > 0 && (
                            <p className="text-xs text-gray-500">
                              +{employee.overtimeHours} OT
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>₹{employee.grossPay.toLocaleString()}</TableCell>
                      <TableCell>₹{employee.totalDeductions.toLocaleString()}</TableCell>
                      <TableCell className="font-semibold">
                        ₹{employee.netPay.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {getEmployeeStatusBadge(employee.status)}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm">
                            <Eye className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Edit className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="breakdown" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Earnings Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Earnings Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span>Regular Pay</span>
                    <span className="font-semibold">
                      ₹{(runDetails.summary.totalGross * 0.85).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Overtime Pay</span>
                    <span className="font-semibold">
                      ₹{(runDetails.summary.totalGross * 0.15).toLocaleString()}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-semibold">
                    <span>Total Gross</span>
                    <span>₹{runDetails.summary.totalGross.toLocaleString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Deductions Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Deductions Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span>Income Tax</span>
                    <span className="font-semibold">
                      ₹{(runDetails.summary.totalDeductions * 0.6).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Provident Fund</span>
                    <span className="font-semibold">
                      ₹{(runDetails.summary.totalDeductions * 0.3).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>ESI</span>
                    <span className="font-semibold">
                      ₹{(runDetails.summary.totalDeductions * 0.1).toLocaleString()}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-semibold">
                    <span>Total Deductions</span>
                    <span>₹{runDetails.summary.totalDeductions.toLocaleString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="audit" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Audit Trail</CardTitle>
              <CardDescription>
                Complete history of changes and approvals for this payroll run
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                  <div className="flex-1">
                    <p className="font-medium">Payroll run created</p>
                    <p className="text-sm text-gray-600">{formatDate(runDetails.createdAt)}</p>
                    <p className="text-xs text-gray-500">System automatically generated run {runDetails.runNumber}</p>
                  </div>
                </div>

                {runDetails.processedAt && (
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                    <div className="flex-1">
                      <p className="font-medium">Calculations completed</p>
                      <p className="text-sm text-gray-600">{formatDate(runDetails.processedAt)}</p>
                      <p className="text-xs text-gray-500">
                        Processed {runDetails.employeeCount} employees
                      </p>
                    </div>
                  </div>
                )}

                {runDetails.approvedAt && (
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                    <div className="flex-1">
                      <p className="font-medium">Payroll approved</p>
                      <p className="text-sm text-gray-600">{formatDate(runDetails.approvedAt)}</p>
                      {runDetails.approvedBy && (
                        <p className="text-xs text-gray-500">Approved by {runDetails.approvedBy}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}