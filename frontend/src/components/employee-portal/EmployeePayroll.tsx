'use client';

import { useEffect, useState } from 'react';
import { DollarSign, Download, Calendar, Eye, Filter } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useEmployeePortal, PayrollItem } from '@/hooks/use-employee-portal';
import { formatDate, formatCurrency } from '@/lib/utils';

export function EmployeePayroll() {
  const { payroll, isLoading, error, fetchPayroll, downloadPayslip } = useEmployeePortal();
  
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedPayslip, setSelectedPayslip] = useState<PayrollItem | null>(null);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => (currentYear - i).toString());
  const months = [
    { value: '1', label: 'January' },
    { value: '2', label: 'February' },
    { value: '3', label: 'March' },
    { value: '4', label: 'April' },
    { value: '5', label: 'May' },
    { value: '6', label: 'June' },
    { value: '7', label: 'July' },
    { value: '8', label: 'August' },
    { value: '9', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' },
  ];

  useEffect(() => {
    fetchPayroll(selectedYear, selectedMonth);
  }, [selectedYear, selectedMonth]);

  const handleYearChange = (year: string) => {
    setSelectedYear(year);
  };

  const handleMonthChange = (month: string) => {
    setSelectedMonth(month);
  };

  const handleDownload = async (payslipId: string) => {
    await downloadPayslip(payslipId);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      DRAFT: { color: 'bg-gray-100 text-gray-800' },
      PROCESSING: { color: 'bg-yellow-100 text-yellow-800' },
      COMPLETED: { color: 'bg-green-100 text-green-800' },
      CANCELLED: { color: 'bg-red-100 text-red-800' },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.DRAFT;
    
    return (
      <Badge className={config.color}>
        {status}
      </Badge>
    );
  };

  const calculateTotalEarnings = () => {
    return payroll.reduce((total, item) => total + item.grossPay, 0);
  };

  const calculateTotalDeductions = () => {
    return payroll.reduce((total, item) => total + item.taxDeductions + item.otherDeductions, 0);
  };

  const calculateNetPay = () => {
    return payroll.reduce((total, item) => total + item.netPay, 0);
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-32 bg-gray-200 rounded-lg"></div>
          <div className="grid gap-4 md:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Payroll & Salary</h1>
        <p className="text-gray-600">View your salary details, payslips, and payment history</p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filter Payslips</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="year">Year</Label>
              <Select value={selectedYear} onValueChange={handleYearChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select year" />
                </SelectTrigger>
                <SelectContent>
                  {years.map(year => (
                    <SelectItem key={year} value={year}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="month">Month (Optional)</Label>
              <Select value={selectedMonth} onValueChange={handleMonthChange}>
                <SelectTrigger>
                  <SelectValue placeholder="All months" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All months</SelectItem>
                  {months.map(month => (
                    <SelectItem key={month.value} value={month.value}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button 
                variant="outline" 
                onClick={() => fetchPayroll(selectedYear, selectedMonth)}
                className="w-full"
              >
                <Filter className="h-4 w-4 mr-2" />
                Apply Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      {payroll.length > 0 && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{calculateTotalEarnings().toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Gross pay for the period</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Deductions</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{calculateTotalDeductions().toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Taxes and other deductions</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Net Pay</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">₹{calculateNetPay().toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Take-home salary</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Payslips List */}
      <Card>
        <CardHeader>
          <CardTitle>Payslips</CardTitle>
          <CardDescription>
            Your salary statements and payment details
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="text-center py-8">
              <p className="text-red-600">{error}</p>
              <Button variant="outline" onClick={() => fetchPayroll(selectedYear, selectedMonth)} className="mt-2">
                Retry
              </Button>
            </div>
          )}

          {payroll.length > 0 ? (
            <div className="space-y-4">
              {payroll.map((item) => (
                <div key={item.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-semibold text-lg">
                        {formatDate(item.payPeriodStart)} - {formatDate(item.payPeriodEnd)}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        {getStatusBadge(item.status)}
                        {item.paidDate && (
                          <span className="text-sm text-gray-600">
                            Paid on {formatDate(item.paidDate)}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedPayslip(selectedPayslip?.id === item.id ? null : item)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        {selectedPayslip?.id === item.id ? 'Hide' : 'Details'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownload(item.id)}
                        disabled={item.status !== 'COMPLETED'}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Download
                      </Button>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="font-medium text-gray-700">Gross Pay</p>
                      <p className="text-lg font-semibold">₹{item.grossPay.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-700">Deductions</p>
                      <p className="text-lg">₹{(item.taxDeductions + item.otherDeductions).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-700">Net Pay</p>
                      <p className="text-lg font-semibold text-green-600">₹{item.netPay.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-700">Hours</p>
                      <p className="text-lg">
                        {item.regularHours + item.overtimeHours} hrs
                        {item.overtimeHours > 0 && (
                          <span className="text-sm text-gray-500"> ({item.overtimeHours} OT)</span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {selectedPayslip?.id === item.id && (
                    <div className="mt-4 pt-4 border-t">
                      <div className="grid md:grid-cols-2 gap-6">
                        {/* Earnings Breakdown */}
                        <div>
                          <h4 className="font-semibold mb-3">Earnings</h4>
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span>Regular Hours ({item.regularHours} hrs)</span>
                              <span>₹{(item.grossPay - item.overtimePay).toLocaleString()}</span>
                            </div>
                            {item.overtimeHours > 0 && (
                              <div className="flex justify-between">
                                <span>Overtime Hours ({item.overtimeHours} hrs)</span>
                                <span>₹{item.overtimePay.toLocaleString()}</span>
                              </div>
                            )}
                            <Separator />
                            <div className="flex justify-between font-semibold">
                              <span>Gross Pay</span>
                              <span>₹{item.grossPay.toLocaleString()}</span>
                            </div>
                          </div>
                        </div>

                        {/* Deductions Breakdown */}
                        <div>
                          <h4 className="font-semibold mb-3">Deductions</h4>
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span>Tax Deductions</span>
                              <span>₹{item.taxDeductions.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Other Deductions</span>
                              <span>₹{item.otherDeductions.toLocaleString()}</span>
                            </div>
                            <Separator />
                            <div className="flex justify-between font-semibold">
                              <span>Total Deductions</span>
                              <span>₹{(item.taxDeductions + item.otherDeductions).toLocaleString()}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="mt-6 pt-4 border-t bg-gray-50 -mx-4 -mb-4 p-4 rounded-b-lg">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-semibold text-lg">Net Pay</p>
                            <p className="text-xs text-gray-500">Amount transferred to your account</p>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-green-600">₹{item.netPay.toLocaleString()}</p>
                            {item.paidDate && (
                              <p className="text-xs text-gray-500">Paid on {formatDate(item.paidDate)}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <DollarSign className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No payslips found</h3>
              <p className="text-gray-600">
                No payroll records found for the selected time period.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}