import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { AttendanceStats } from '@/types'
import { 
  Users, 
  Clock, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Timer
} from 'lucide-react'

interface AttendanceStatsCardsProps {
  stats?: AttendanceStats
  loading: boolean
  dateRange: string
}

interface StatCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: React.ReactNode
  trend?: {
    value: number
    isPositive: boolean
  }
  progress?: number
  variant?: 'default' | 'success' | 'warning' | 'danger'
  loading?: boolean
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  progress,
  variant = 'default',
  loading = false
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'success':
        return 'border-green-200 bg-green-50/50'
      case 'warning':
        return 'border-yellow-200 bg-yellow-50/50'
      case 'danger':
        return 'border-red-200 bg-red-50/50'
      default:
        return 'border-gray-200'
    }
  }

  const getIconColor = () => {
    switch (variant) {
      case 'success':
        return 'text-green-600'
      case 'warning':
        return 'text-yellow-600'
      case 'danger':
        return 'text-red-600'
      default:
        return 'text-blue-600'
    }
  }

  if (loading) {
    return (
      <Card className={getVariantStyles()}>
        <CardContent className="p-6">
          <div className="animate-pulse">
            <div className="flex items-center justify-between mb-2">
              <div className="h-4 bg-gray-200 rounded w-24"></div>
              <div className="h-5 w-5 bg-gray-200 rounded"></div>
            </div>
            <div className="h-8 bg-gray-200 rounded w-16 mb-1"></div>
            <div className="h-3 bg-gray-200 rounded w-20"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={getVariantStyles()}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-600">{title}</span>
          <div className={`${getIconColor()}`}>{icon}</div>
        </div>
        
        <div className="space-y-1">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-gray-900">{value}</span>
            {trend && (
              <div className={`flex items-center text-sm ${
                trend.isPositive ? 'text-green-600' : 'text-red-600'
              }`}>
                {trend.isPositive ? (
                  <TrendingUp className="h-3 w-3 mr-1" />
                ) : (
                  <TrendingDown className="h-3 w-3 mr-1" />
                )}
                {Math.abs(trend.value)}%
              </div>
            )}
          </div>
          
          {subtitle && (
            <p className="text-sm text-gray-600">{subtitle}</p>
          )}
          
          {progress !== undefined && (
            <div className="mt-2">
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-gray-500 mt-1">{progress}% of target</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export const AttendanceStatsCards: React.FC<AttendanceStatsCardsProps> = ({
  stats,
  loading,
  dateRange
}) => {
  if (loading || !stats) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <StatCard
            key={i}
            title="Loading..."
            value="--"
            icon={<div className="h-5 w-5 bg-gray-200 rounded" />}
            loading={true}
          />
        ))}
      </div>
    )
  }

  const attendanceRate = stats.attendanceRate || 0
  const getAttendanceVariant = (rate: number) => {
    if (rate >= 95) return 'success'
    if (rate >= 85) return 'warning'
    return 'danger'
  }

  const formatHours = (hours: number) => {
    const h = Math.floor(hours)
    const m = Math.round((hours - h) * 60)
    return `${h}h ${m}m`
  }

  return (
    <div className="space-y-4">
      {/* Period indicator */}
      <div className="flex items-center justify-between">
        <Badge variant="outline" className="text-xs">
          Period: {dateRange}
        </Badge>
        <span className="text-xs text-gray-500">
          Last updated: {new Date().toLocaleTimeString()}
        </span>
      </div>

      {/* Main stats grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Records */}
        <StatCard
          title="Total Records"
          value={stats.totalRecords.toLocaleString()}
          subtitle="Attendance entries"
          icon={<Users className="h-5 w-5" />}
          variant="default"
        />

        {/* Attendance Rate */}
        <StatCard
          title="Attendance Rate"
          value={`${attendanceRate.toFixed(1)}%`}
          subtitle={`${stats.presentCount} present, ${stats.absentCount} absent`}
          icon={<CheckCircle className="h-5 w-5" />}
          progress={attendanceRate}
          variant={getAttendanceVariant(attendanceRate)}
        />

        {/* Average Hours */}
        <StatCard
          title="Avg Hours Worked"
          value={formatHours(stats.averageHoursWorked || 0)}
          subtitle="Per employee"
          icon={<Clock className="h-5 w-5" />}
          variant="default"
        />

        {/* Overtime Hours */}
        <StatCard
          title="Total Overtime"
          value={formatHours(stats.totalOvertimeHours || 0)}
          subtitle={`${stats.overtimeCount} employees`}
          icon={<Timer className="h-5 w-5" />}
          variant={stats.totalOvertimeHours > 100 ? 'warning' : 'default'}
        />
      </div>

      {/* Secondary stats grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Late Arrivals */}
        <StatCard
          title="Late Arrivals"
          value={stats.lateCount}
          subtitle={`${((stats.lateCount / stats.totalRecords) * 100).toFixed(1)}% of total`}
          icon={<AlertTriangle className="h-5 w-5" />}
          variant={stats.lateCount > stats.totalRecords * 0.1 ? 'warning' : 'default'}
        />

        {/* No Shows */}
        <StatCard
          title="Absences"
          value={stats.absentCount}
          subtitle={`${((stats.absentCount / stats.totalRecords) * 100).toFixed(1)}% of total`}
          icon={<XCircle className="h-5 w-5" />}
          variant={stats.absentCount > 0 ? 'danger' : 'success'}
        />

        {/* Overtime Records */}
        <StatCard
          title="Overtime Records"
          value={stats.overtimeCount}
          subtitle={`${((stats.overtimeCount / stats.totalRecords) * 100).toFixed(1)}% of total`}
          icon={<TrendingUp className="h-5 w-5" />}
          variant={stats.overtimeCount > stats.totalRecords * 0.2 ? 'warning' : 'default'}
        />
      </div>
    </div>
  )
}