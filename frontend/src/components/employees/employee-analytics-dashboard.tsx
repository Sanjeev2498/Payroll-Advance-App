'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Users, 
  TrendingUp, 
  TrendingDown,
  Award,
  Clock,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Calendar,
  BarChart3,
  PieChart,
  LineChart,
  RefreshCw,
  Download,
  Filter,
  Eye
} from 'lucide-react'
import { employeesApi, EmployeeStatsResponseDto } from '@/lib/api/employees'

interface PerformanceMetric {
  period: string
  value: number
  change: number
  trend: 'up' | 'down' | 'stable'
}

interface SkillDistribution {
  skill: string
  count: number
  percentage: number
  averageLevel: number
}

interface HiringTrend {
  month: string
  hired: number
  terminated: number
  net: number
}

interface DepartmentStats {
  department: string
  totalEmployees: number
  activeEmployees: number
  averageRating: number
  averageTenure: number
  turnoverRate: number
}

interface CertificationCompliance {
  certification: string
  required: number
  compliant: number
  expiring: number
  expired: number
  complianceRate: number
}

export function EmployeeAnalyticsDashboard() {
  const [stats, setStats] = useState<EmployeeStatsResponseDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timeRange, setTimeRange] = useState('last-6-months')
  const [selectedDepartment, setSelectedDepartment] = useState('all')

  // Mock data - in real implementation, these would come from API calls
  const [performanceMetrics] = useState<PerformanceMetric[]>([
    { period: 'This Month', value: 4.2, change: 0.3, trend: 'up' },
    { period: 'Last 3 Months', value: 3.9, change: -0.1, trend: 'down' },
    { period: 'Last 6 Months', value: 4.0, change: 0.2, trend: 'up' },
    { period: 'This Year', value: 3.8, change: 0.1, trend: 'up' }
  ])

  const [skillsDistribution] = useState<SkillDistribution[]>([
    { skill: 'Security Guard', count: 45, percentage: 85, averageLevel: 3.2 },
    { skill: 'Armed Security', count: 28, percentage: 53, averageLevel: 3.8 },
    { skill: 'First Aid', count: 35, percentage: 66, averageLevel: 3.0 },
    { skill: 'CCTV Operation', count: 22, percentage: 42, averageLevel: 3.5 },
    { skill: 'Emergency Response', count: 18, percentage: 34, averageLevel: 4.1 },
    { skill: 'Customer Service', count: 40, percentage: 75, averageLevel: 3.4 },
    { skill: 'Report Writing', count: 33, percentage: 62, averageLevel: 2.9 },
    { skill: 'Radio Communication', count: 25, percentage: 47, averageLevel: 3.3 }
  ])

  const [hiringTrends] = useState<HiringTrend[]>([
    { month: 'Jan 2024', hired: 8, terminated: 3, net: 5 },
    { month: 'Feb 2024', hired: 12, terminated: 2, net: 10 },
    { month: 'Mar 2024', hired: 6, terminated: 5, net: 1 },
    { month: 'Apr 2024', hired: 15, terminated: 4, net: 11 },
    { month: 'May 2024', hired: 9, terminated: 6, net: 3 },
    { month: 'Jun 2024', hired: 11, terminated: 3, net: 8 }
  ])

  const [departmentStats] = useState<DepartmentStats[]>([
    {
      department: 'Security Operations',
      totalEmployees: 35,
      activeEmployees: 32,
      averageRating: 4.1,
      averageTenure: 2.3,
      turnoverRate: 12
    },
    {
      department: 'Armed Security',
      totalEmployees: 18,
      activeEmployees: 16,
      averageRating: 4.5,
      averageTenure: 3.1,
      turnoverRate: 8
    },
    {
      department: 'Event Security',
      totalEmployees: 12,
      activeEmployees: 11,
      averageRating: 3.8,
      averageTenure: 1.8,
      turnoverRate: 18
    },
    {
      department: 'Administration',
      totalEmployees: 8,
      activeEmployees: 8,
      averageRating: 4.2,
      averageTenure: 4.2,
      turnoverRate: 5
    }
  ])

  const [certificationCompliance] = useState<CertificationCompliance[]>([
    {
      certification: 'Security License',
      required: 53,
      compliant: 48,
      expiring: 3,
      expired: 2,
      complianceRate: 91
    },
    {
      certification: 'First Aid/CPR',
      required: 45,
      compliant: 35,
      expiring: 5,
      expired: 5,
      complianceRate: 78
    },
    {
      certification: 'Firearms License',
      required: 18,
      compliant: 16,
      expiring: 1,
      expired: 1,
      complianceRate: 89
    },
    {
      certification: 'Driver License',
      required: 25,
      compliant: 23,
      expiring: 1,
      expired: 1,
      complianceRate: 92
    }
  ])

  // Load stats data
  const loadStats = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const statsData = await employeesApi.getStats()
      setStats(statsData)
    } catch (err) {
      setError('Failed to load analytics data')
      console.error('Analytics loading error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadStats()
  }, [timeRange, selectedDepartment])

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat().format(num)
  }

  const formatPercentage = (num: number) => {
    return `${Math.round(num)}%`
  }

  const getTrendIcon = (trend: 'up' | 'down' | 'stable', change: number) => {
    if (trend === 'up') {
      return <TrendingUp className="w-4 h-4 text-green-500" />
    } else if (trend === 'down') {
      return <TrendingDown className="w-4 h-4 text-red-500" />
    }
    return <div className="w-4 h-4" />
  }

  const getComplianceColor = (rate: number) => {
    if (rate >= 90) return 'text-green-600 bg-green-100'
    if (rate >= 80) return 'text-yellow-600 bg-yellow-100'
    return 'text-red-600 bg-red-100'
  }

  if (loading && !stats) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-500">Loading analytics dashboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <AlertTriangle className="w-8 h-8 mx-auto mb-4 text-red-600" />
          <p className="text-gray-500 mb-4">{error}</p>
          <Button onClick={loadStats} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Workforce Analytics</h2>
          <p className="text-sm text-gray-600 mt-1">
            Comprehensive insights into employee performance, hiring trends, and workforce metrics
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="last-month">Last Month</SelectItem>
              <SelectItem value="last-3-months">Last 3 Months</SelectItem>
              <SelectItem value="last-6-months">Last 6 Months</SelectItem>
              <SelectItem value="last-year">Last Year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" size="sm" onClick={loadStats}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Workforce</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.total}</p>
                </div>
                <Users className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Avg Performance</p>
                  <p className="text-2xl font-bold text-green-600">{stats.averagePerformanceRating.toFixed(1)}</p>
                </div>
                <Award className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Compliance Issues</p>
                  <p className="text-2xl font-bold text-red-600">{stats.complianceIssues}</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-red-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Expiring Certs</p>
                  <p className="text-2xl font-bold text-yellow-600">{stats.certificationsExpiringSoon}</p>
                </div>
                <Clock className="w-8 h-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Active Rate</p>
                  <p className="text-2xl font-bold text-indigo-600">
                    {Math.round((stats.active / stats.total) * 100)}%
                  </p>
                </div>
                <CheckCircle className="w-8 h-8 text-indigo-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Analytics Tabs */}
      <Tabs defaultValue="performance" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="hiring">Hiring Trends</TabsTrigger>
          <TabsTrigger value="skills">Skills</TabsTrigger>
          <TabsTrigger value="departments">Departments</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
        </TabsList>

        {/* Performance Tab */}
        <TabsContent value="performance">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Performance Metrics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {performanceMetrics.map((metric, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">{metric.period}</p>
                        <p className="text-sm text-gray-600">Average Rating</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="font-bold text-lg">{metric.value.toFixed(1)}</p>
                          <div className="flex items-center gap-1 text-sm">
                            {getTrendIcon(metric.trend, metric.change)}
                            <span className={metric.change >= 0 ? 'text-green-600' : 'text-red-600'}>
                              {metric.change >= 0 ? '+' : ''}{metric.change.toFixed(1)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Performance Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Excellent (4.5-5.0)</span>
                    <div className="flex items-center gap-2">
                      <Progress value={25} className="w-24" />
                      <span className="text-sm font-medium">25%</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Good (3.5-4.4)</span>
                    <div className="flex items-center gap-2">
                      <Progress value={45} className="w-24" />
                      <span className="text-sm font-medium">45%</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Average (2.5-3.4)</span>
                    <div className="flex items-center gap-2">
                      <Progress value={25} className="w-24" />
                      <span className="text-sm font-medium">25%</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Below Average (&lt;2.5)</span>
                    <div className="flex items-center gap-2">
                      <Progress value={5} className="w-24" />
                      <span className="text-sm font-medium">5%</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Hiring Trends Tab */}
        <TabsContent value="hiring">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LineChart className="w-5 h-5" />
                  Hiring vs Turnover Trends
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {hiringTrends.map((trend, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">{trend.month}</p>
                      </div>
                      <div className="flex items-center gap-6 text-sm">
                        <div className="text-center">
                          <p className="font-medium text-green-600">+{trend.hired}</p>
                          <p className="text-gray-600">Hired</p>
                        </div>
                        <div className="text-center">
                          <p className="font-medium text-red-600">-{trend.terminated}</p>
                          <p className="text-gray-600">Left</p>
                        </div>
                        <div className="text-center">
                          <p className={`font-bold ${trend.net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {trend.net >= 0 ? '+' : ''}{trend.net}
                          </p>
                          <p className="text-gray-600">Net</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Workforce Insights</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 bg-green-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="w-5 h-5 text-green-600" />
                      <span className="font-medium text-green-900">Growing Team</span>
                    </div>
                    <p className="text-sm text-green-700">
                      Net growth of 38 employees over the last 6 months
                    </p>
                  </div>

                  <div className="p-4 bg-blue-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="w-5 h-5 text-blue-600" />
                      <span className="font-medium text-blue-900">Avg. Tenure</span>
                    </div>
                    <p className="text-sm text-blue-700">
                      Employees stay an average of 2.8 years
                    </p>
                  </div>

                  <div className="p-4 bg-yellow-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="w-5 h-5 text-yellow-600" />
                      <span className="font-medium text-yellow-900">Seasonal Hiring</span>
                    </div>
                    <p className="text-sm text-yellow-700">
                      Higher turnover in Q1 due to seasonal work patterns
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Skills Tab */}
        <TabsContent value="skills">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="w-5 h-5" />
                Skills Distribution Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {skillsDistribution.map((skill, index) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-medium text-gray-900">{skill.skill}</h4>
                      <Badge variant="secondary">
                        {skill.count} employees
                      </Badge>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Coverage</span>
                        <span className="font-medium">{formatPercentage(skill.percentage)}</span>
                      </div>
                      <Progress value={skill.percentage} className="h-2" />
                      
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Avg. Level</span>
                        <span className="font-medium">{skill.averageLevel.toFixed(1)}/5.0</span>
                      </div>
                      <Progress value={(skill.averageLevel / 5) * 100} className="h-2" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Departments Tab */}
        <TabsContent value="departments">
          <Card>
            <CardHeader>
              <CardTitle>Department-wise Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {departmentStats.map((dept, index) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="font-medium text-gray-900 text-lg">{dept.department}</h4>
                      <Badge variant="outline">{dept.totalEmployees} employees</Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-green-600">{dept.activeEmployees}</p>
                        <p className="text-sm text-gray-600">Active</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-blue-600">{dept.averageRating.toFixed(1)}</p>
                        <p className="text-sm text-gray-600">Avg Rating</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-purple-600">{dept.averageTenure.toFixed(1)}y</p>
                        <p className="text-sm text-gray-600">Avg Tenure</p>
                      </div>
                      <div className="text-center">
                        <p className={`text-2xl font-bold ${dept.turnoverRate > 15 ? 'text-red-600' : 'text-green-600'}`}>
                          {dept.turnoverRate}%
                        </p>
                        <p className="text-sm text-gray-600">Turnover</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Compliance Tab */}
        <TabsContent value="compliance">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                Certification Compliance Rates
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {certificationCompliance.map((cert, index) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="font-medium text-gray-900">{cert.certification}</h4>
                      <Badge className={getComplianceColor(cert.complianceRate)}>
                        {formatPercentage(cert.complianceRate)} Compliant
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                      <div>
                        <p className="text-lg font-bold text-gray-700">{cert.required}</p>
                        <p className="text-sm text-gray-600">Required</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold text-green-600">{cert.compliant}</p>
                        <p className="text-sm text-gray-600">Compliant</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold text-yellow-600">{cert.expiring}</p>
                        <p className="text-sm text-gray-600">Expiring Soon</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold text-red-600">{cert.expired}</p>
                        <p className="text-sm text-gray-600">Expired</p>
                      </div>
                    </div>
                    
                    <div className="mt-3">
                      <Progress value={cert.complianceRate} className="h-2" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}