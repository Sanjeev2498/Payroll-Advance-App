'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Download, Eye, CreditCard, IndianRupee, Calendar } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

export default function MyPayslipsPage() {
  // Mock data - this would come from API
  const currentSalary = {
    basicSalary: 25000,
    hra: 5000,
    transport: 2000,
    other: 1000,
    gross: 33000,
    pf: 1800,
    esi: 578,
    tax: 0,
    deductions: 2378,
    netPay: 30622
  }

  const payslips = [
    {
      id: '1',
      month: 'June 2026',
      payPeriod: '01 Jun - 30 Jun 2026',
      grossPay: 33000,
      deductions: 2378,
      netPay: 30622,
      status: 'paid',
      paidDate: '2026-07-01'
    },
    {
      id: '2',
      month: 'May 2026',
      payPeriod: '01 May - 31 May 2026',
      grossPay: 33000,
      deductions: 2378,
      netPay: 30622,
      status: 'paid',
      paidDate: '2026-06-01'
    },
    {
      id: '3',
      month: 'April 2026',
      payPeriod: '01 Apr - 30 Apr 2026',
      grossPay: 33000,
      deductions: 2378,
      netPay: 30622,
      status: 'paid',
      paidDate: '2026-05-01'
    },
    {
      id: '4',
      month: 'March 2026',
      payPeriod: '01 Mar - 31 Mar 2026',
      grossPay: 33000,
      deductions: 2378,
      netPay: 30622,
      status: 'paid',
      paidDate: '2026-04-01'
    }
  ]

  const ytdSummary = {
    totalGross: 198000,
    totalDeductions: 14268,
    totalNet: 183732,
    totalTax: 0,
    totalPF: 10800,
    totalESI: 3468
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Payslips</h1>
          <p className="text-gray-600">View and download your salary statements</p>
        </div>
        <Badge variant="outline" className="text-green-600">
          <CreditCard className="h-4 w-4 mr-1" />
          Salary Account Active
        </Badge>
      </div>

      {/* Current Salary Breakdown */}
      <Card className="border-l-4 border-l-green-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IndianRupee className="h-5 w-5" />
            Current Salary Structure
          </CardTitle>
          <CardDescription>
            Monthly salary breakdown as per your employment contract
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Earnings */}
            <div className="space-y-3">
              <h4 className="font-semibold text-green-600">Earnings</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">Basic Salary</span>
                  <span className="font-medium">{formatCurrency(currentSalary.basicSalary)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">HRA</span>
                  <span className="font-medium">{formatCurrency(currentSalary.hra)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Transport Allowance</span>
                  <span className="font-medium">{formatCurrency(currentSalary.transport)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Other Allowances</span>
                  <span className="font-medium">{formatCurrency(currentSalary.other)}</span>
                </div>
                <div className="border-t pt-2">
                  <div className="flex justify-between font-semibold">
                    <span>Gross Pay</span>
                    <span className="text-green-600">{formatCurrency(currentSalary.gross)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Deductions */}
            <div className="space-y-3">
              <h4 className="font-semibold text-red-600">Deductions</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">Provident Fund (PF)</span>
                  <span className="font-medium">{formatCurrency(currentSalary.pf)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">ESI</span>
                  <span className="font-medium">{formatCurrency(currentSalary.esi)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Income Tax</span>
                  <span className="font-medium">{formatCurrency(currentSalary.tax)}</span>
                </div>
                <div className="border-t pt-2">
                  <div className="flex justify-between font-semibold">
                    <span>Total Deductions</span>
                    <span className="text-red-600">{formatCurrency(currentSalary.deductions)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Net Pay */}
            <div className="space-y-3">
              <h4 className="font-semibold text-blue-600">Net Pay</h4>
              <div className="p-4 bg-blue-50 rounded-lg text-center">
                <p className="text-2xl font-bold text-blue-600">
                  {formatCurrency(currentSalary.netPay)}
                </p>
                <p className="text-sm text-gray-600 mt-1">Monthly Take Home</p>
              </div>
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">Bank Account</p>
                <p className="font-medium">HDFC Bank ****4567</p>
                <p className="text-xs text-gray-500">Salary credited on 1st of every month</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* YTD Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Year-to-Date Summary</CardTitle>
            <CardDescription>January - July 2026</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm">Total Gross</span>
                <span className="font-medium text-green-600">{formatCurrency(ytdSummary.totalGross)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Total Deductions</span>
                <span className="font-medium text-red-600">{formatCurrency(ytdSummary.totalDeductions)}</span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="font-semibold">Total Net Pay</span>
                <span className="font-semibold text-blue-600">{formatCurrency(ytdSummary.totalNet)}</span>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <h5 className="font-medium text-sm">Tax & Statutory Deductions</h5>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>PF Contribution</span>
                  <span>{formatCurrency(ytdSummary.totalPF)}</span>
                </div>
                <div className="flex justify-between">
                  <span>ESI Contribution</span>
                  <span>{formatCurrency(ytdSummary.totalESI)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Income Tax</span>
                  <span>{formatCurrency(ytdSummary.totalTax)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Payslips */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Payslip History
              </CardTitle>
              <CardDescription>
                Download your salary slips and view payment history
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {payslips.map((payslip) => (
                  <div key={payslip.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div>
                          <p className="font-medium">{payslip.month}</p>
                          <p className="text-sm text-gray-600">{payslip.payPeriod}</p>
                        </div>
                        <Badge variant="outline" className="border-green-200 text-green-700">
                          {payslip.status}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="text-right mr-4">
                      <p className="font-semibold">{formatCurrency(payslip.netPay)}</p>
                      <p className="text-sm text-gray-500">
                        Paid on {new Date(payslip.paidDate).toLocaleDateString('en-IN')}
                      </p>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline">
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      <Button size="sm" variant="outline">
                        <Download className="h-4 w-4 mr-1" />
                        Download
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-6 text-center">
                <Button variant="outline">
                  View All Payslips
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Important Information */}
      <Card>
        <CardHeader>
          <CardTitle>Important Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h5 className="font-medium mb-2">Salary Payment</h5>
              <ul className="space-y-1 text-gray-600">
                <li>• Salary is credited on 1st of every month</li>
                <li>• For weekends/holidays, payment is made on next working day</li>
                <li>• Direct bank transfer to your registered account</li>
              </ul>
            </div>
            <div>
              <h5 className="font-medium mb-2">Tax & Statutory Deductions</h5>
              <ul className="space-y-1 text-gray-600">
                <li>• PF: 12% of basic salary (Employee + Employer contribution)</li>
                <li>• ESI: 1.75% of gross salary (Employee contribution)</li>
                <li>• Income Tax: As per applicable tax slab</li>
              </ul>
            </div>
            <div>
              <h5 className="font-medium mb-2">Payslip Access</h5>
              <ul className="space-y-1 text-gray-600">
                <li>• Payslips are available by 5th of every month</li>
                <li>• Download PDF copies for your records</li>
                <li>• Contact HR for any salary-related queries</li>
              </ul>
            </div>
            <div>
              <h5 className="font-medium mb-2">Bank Account Updates</h5>
              <ul className="space-y-1 text-gray-600">
                <li>• Submit bank account changes to HR</li>
                <li>• Allow 1 month for processing changes</li>
                <li>• Provide cancelled cheque for verification</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}