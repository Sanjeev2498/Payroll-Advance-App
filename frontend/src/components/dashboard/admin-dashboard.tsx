'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { useAuthPermissions } from '@/components/auth/protected-route'
import Link from 'next/link'

interface AdminDashboardProps {
  className?: string
}

export function AdminDashboard({ className }: AdminDashboardProps) {
  const { user } = useAuthPermissions()
  
  const [businessMetrics] = useState({
    totalRevenue: 125000,
    monthlyGrowth: 12.5,
    totalEmployees: 48,
    activeClients: 12,
    sitesManaged: 18,
    payrollPending: 8500,
    operationalCosts: 89000,
    profitMargin: 28.8,
  })

  const [recentTransactions] = useState([
    { id: 1, type: 'invoice', client: 'Acme Corp', amount: 15000, status: 'paid', date: '2024-01-15' },
    { id: 2, type: 'payroll', description: 'Weekly Payroll Run #2024-03', amount: -8500, status: 'processed', date: '2024-01-15' },
    { id: 3, type: 'invoice', client: 'TechStart Inc', amount: 8200, status: 'pending', date: '2024-01-14' },
    { id: 4, type: 'expense', description: 'Insurance Premium', amount: -2500, status: 'paid', date: '2024-01-14' },
  ])

  const [systemAlerts] = useState([
    { id: 1, type: 'payroll', message: 'Payroll run due in 2 days', severity: 'medium', time: '1 hour ago' },
    { id: 2, type: 'compliance', message: '3 employee certifications expiring soon', severity: 'high', time: '3 hours ago' },
    { id: 3, type: 'billing', message: '2 invoices overdue', severity: 'high', time: '1 day ago' },
    { id: 4, type: 'system', message: 'Backup completed successfully', severity: 'low', time: '1 day ago' },
  ])

  const [topPerformingSites] = useState([
    { name: 'Corporate Campus Alpha', revenue: 28000, efficiency: 94, employees: 8 },
    { name: 'Downtown Financial District', revenue: 22000, efficiency: 91, employees: 6 },
    { name: 'Shopping Mall Central', revenue: 18000, efficiency: 89, employees: 5 },
    { name: 'Industrial Complex West', revenue: 15000, efficiency: 87, employees: 4 },
  ])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD' 
    }).format(amount)
  }

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'invoice': return '💰'
      case 'payroll': return '💸'
      case 'expense': return '📊'
      default: return '💼'
    }
  }

  const getTransactionColor = (type: string, amount: number) => {
    if (amount > 0) return 'text-green-600'
    return 'text-red-600'
  }

  const getAlertColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'border-l-red-500 bg-red-50'
      case 'medium':
        return 'border-l-yellow-500 bg-yellow-50'
      case 'low':
        return 'border-l-blue-500 bg-blue-50'
      default:
        return 'border-l-gray-500 bg-gray-50'
    }
  }

  return (
    <div className={className}>
      {/* Welcome Section */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Executive Dashboard
        </h1>
        <p className="text-gray-600">
          Complete business overview and financial performance for {user?.company?.name}
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Monthly Revenue</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(businessMetrics.totalRevenue)}
                </p>
                <p className="text-xs text-green-600 flex items-center mt-1">
                  ↗ +{businessMetrics.monthlyGrowth}% vs last month
                </p>
              </div>
              <div className="text-2xl">💰</div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Employees</p>
                <p className="text-2xl font-bold">{businessMetrics.totalEmployees}</p>
                <p className="text-xs text-gray-500">Across {businessMetrics.sitesManaged} sites</p>
              </div>
              <div className="text-2xl">👥</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Clients</p>
                <p className="text-2xl font-bold text-blue-600">{businessMetrics.activeClients}</p>
                <p className="text-xs text-blue-600">100% retention rate</p>
              </div>
              <div className="text-2xl">🏢</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Profit Margin</p>
                <p className="text-2xl font-bold text-purple-600">{businessMetrics.profitMargin}%</p>
                <p className="text-xs text-purple-600">Above industry avg</p>
              </div>
              <div className="text-2xl">📈</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Financial Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Financial Overview
                <Button size="sm" variant="outline" asChild>
                  <Link href="/dashboard/reports">View Details</Link>
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <p className="text-sm text-gray-600">Total Revenue</p>
                  <p className="text-xl font-bold text-green-600">
                    {formatCurrency(businessMetrics.totalRevenue)}
                  </p>
                  <div className="mt-2">
                    <Progress value={75} className="h-2" />
                    <p className="text-xs text-gray-500 mt-1">75% of monthly target</p>
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600">Operating Costs</p>
                  <p className="text-xl font-bold text-red-600">
                    {formatCurrency(businessMetrics.operationalCosts)}
                  </p>
                  <div className="mt-2">
                    <Progress value={65} className="h-2" />
                    <p className="text-xs text-gray-500 mt-1">65% of budget</p>
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600">Pending Payroll</p>
                  <p className="text-xl font-bold text-yellow-600">
                    {formatCurrency(businessMetrics.payrollPending)}
                  </p>
                  <div className="mt-2">
                    <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                      Due in 2 days
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Top Performing Sites */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Top Performing Sites
                <Button size="sm" variant="outline" asChild>
                  <Link href="/dashboard/sites">View All Sites</Link>
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topPerformingSites.map((site, index) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-600 rounded-full font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <h3 className="font-medium">{site.name}</h3>
                        <p className="text-sm text-gray-600">{site.employees} employees</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-600">{formatCurrency(site.revenue)}</p>
                      <div className="flex items-center space-x-2">
                        <Progress value={site.efficiency} className="w-16 h-1" />
                        <span className="text-xs text-gray-500">{site.efficiency}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Transactions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Recent Financial Activity
                <Button size="sm" variant="outline" asChild>
                  <Link href="/dashboard/payroll">Manage Payroll</Link>
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentTransactions.map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                    <div className="flex items-center space-x-3">
                      <span className="text-lg">{getTransactionIcon(transaction.type)}</span>
                      <div>
                        <p className="font-medium text-sm">
                          {transaction.client || transaction.description}
                        </p>
                        <p className="text-xs text-gray-500 flex items-center space-x-2">
                          <span>{transaction.date}</span>
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${
                              transaction.status === 'paid' ? 'bg-green-50 text-green-700 border-green-200' :
                              transaction.status === 'pending' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                              'bg-blue-50 text-blue-700 border-blue-200'
                            }`}
                          >
                            {transaction.status}
                          </Badge>
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold ${getTransactionColor(transaction.type, transaction.amount)}`}>
                        {transaction.amount > 0 ? '+' : ''}{formatCurrency(Math.abs(transaction.amount))}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* System Alerts */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between">
                System Alerts
                <Badge variant="destructive">
                  {systemAlerts.filter(alert => alert.severity === 'high').length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {systemAlerts.map((alert) => (
                  <div key={alert.id} className={`p-3 rounded-lg border-l-4 ${getAlertColor(alert.severity)}`}>
                    <p className="text-sm font-medium">{alert.message}</p>
                    <p className="text-xs text-gray-500 mt-1">{alert.time}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 text-center">
                <Button size="sm" variant="outline" className="w-full">
                  View All Alerts
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Administrative Tools</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full justify-start" variant="outline" asChild>
                <Link href="/dashboard/payroll">
                  <span className="mr-2">💰</span>
                  Process Payroll
                </Link>
              </Button>
              <Button className="w-full justify-start" variant="outline" asChild>
                <Link href="/dashboard/clients">
                  <span className="mr-2">🏢</span>
                  Manage Clients
                </Link>
              </Button>
              <Button className="w-full justify-start" variant="outline" asChild>
                <Link href="/dashboard/employees">
                  <span className="mr-2">👥</span>
                  Employee Management
                </Link>
              </Button>
              <Button className="w-full justify-start" variant="outline" asChild>
                <Link href="/dashboard/reports">
                  <span className="mr-2">📊</span>
                  Financial Reports
                </Link>
              </Button>
              <Button className="w-full justify-start" variant="outline" asChild>
                <Link href="/dashboard/settings">
                  <span className="mr-2">⚙️</span>
                  System Settings
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Company Performance */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Company Performance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Monthly Target</span>
                  <span>75%</span>
                </div>
                <Progress value={75} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Client Satisfaction</span>
                  <span>94%</span>
                </div>
                <Progress value={94} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Operational Efficiency</span>
                  <span>88%</span>
                </div>
                <Progress value={88} className="h-2" />
              </div>
            </CardContent>
          </Card>

          {/* Financial Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">This Month Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span>Gross Revenue</span>
                  <span className="font-medium text-green-600">
                    {formatCurrency(businessMetrics.totalRevenue)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Operating Costs</span>
                  <span className="font-medium text-red-600">
                    {formatCurrency(businessMetrics.operationalCosts)}
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t border-gray-200">
                  <span className="font-medium">Net Profit</span>
                  <span className="font-bold text-green-600">
                    {formatCurrency(businessMetrics.totalRevenue - businessMetrics.operationalCosts)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Profit Margin</span>
                  <span className="font-bold text-purple-600">
                    {businessMetrics.profitMargin}%
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}