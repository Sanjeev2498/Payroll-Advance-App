import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { AttendanceAnomaly } from '@/types'
import { 
  AlertTriangle, 
  Clock, 
  MapPin, 
  Timer, 
  XCircle, 
  TrendingUp,
  Eye,
  CheckCircle
} from 'lucide-react'
import { format, parseISO } from 'date-fns'

interface AttendanceAnomaliesProps {
  anomalies: AttendanceAnomaly[]
  loading: boolean
  total: number
  onViewDetails?: (anomaly: AttendanceAnomaly) => void
  onResolve?: (anomaly: AttendanceAnomaly) => void
}

const AnomalyIcon: React.FC<{ type: string; severity: string }> = ({ type, severity }) => {
  const getIcon = () => {
    switch (type) {
      case 'LATE_ARRIVAL':
        return Clock
      case 'EARLY_DEPARTURE':
        return Timer
      case 'NO_SHOW':
        return XCircle
      case 'EXCESSIVE_HOURS':
        return TrendingUp
      case 'OVERTIME':
        return Timer
      case 'LOCATION_MISMATCH':
        return MapPin
      default:
        return AlertTriangle
    }
  }

  const getColor = () => {
    switch (severity) {
      case 'CRITICAL':
        return 'text-red-600'
      case 'HIGH':
        return 'text-red-500'
      case 'MEDIUM':
        return 'text-yellow-600'
      case 'LOW':
        return 'text-blue-600'
      default:
        return 'text-gray-600'
    }
  }

  const Icon = getIcon()
  
  return <Icon className={`h-4 w-4 ${getColor()}`} />
}

const SeverityBadge: React.FC<{ severity: string }> = ({ severity }) => {
  const getVariant = () => {
    switch (severity) {
      case 'CRITICAL':
        return 'destructive' as const
      case 'HIGH':
        return 'destructive' as const
      case 'MEDIUM':
        return 'warning' as const
      case 'LOW':
        return 'secondary' as const
      default:
        return 'secondary' as const
    }
  }

  return (
    <Badge variant={getVariant()} className="text-xs">
      {severity}
    </Badge>
  )
}

const AnomalyCard: React.FC<{
  anomaly: AttendanceAnomaly
  onViewDetails?: (anomaly: AttendanceAnomaly) => void
  onResolve?: (anomaly: AttendanceAnomaly) => void
}> = ({ anomaly, onViewDetails, onResolve }) => {
  const isResolved = Boolean(anomaly.resolvedAt)

  return (
    <div className={`p-3 border rounded-lg space-y-2 ${
      isResolved ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'
    }`}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <AnomalyIcon type={anomaly.type} severity={anomaly.severity} />
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-medium text-gray-900">
                {anomaly.type.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
              </span>
              <SeverityBadge severity={anomaly.severity} />
            </div>
            <p className="text-xs text-gray-600 mb-2">
              {anomaly.description}
            </p>
          </div>
        </div>
        
        {isResolved && (
          <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
        )}
      </div>

      {/* Metadata */}
      {anomaly.metadata && Object.keys(anomaly.metadata).length > 0 && (
        <div className="text-xs text-gray-500 space-y-1">
          {anomaly.metadata.minutesLate && (
            <div>Late by: {anomaly.metadata.minutesLate} minutes</div>
          )}
          {anomaly.metadata.minutesEarly && (
            <div>Early by: {anomaly.metadata.minutesEarly} minutes</div>
          )}
          {anomaly.metadata.hoursWorked && (
            <div>Hours worked: {anomaly.metadata.hoursWorked}</div>
          )}
          {anomaly.metadata.overtimeHours && (
            <div>Overtime: {anomaly.metadata.overtimeHours} hours</div>
          )}
        </div>
      )}

      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
        <span className="text-xs text-gray-500">
          {format(parseISO(anomaly.detectedAt), 'MMM dd, HH:mm')}
        </span>
        
        <div className="flex items-center gap-1">
          {onViewDetails && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => onViewDetails(anomaly)}
                  >
                    <Eye className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>View details</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          
          {onResolve && !isResolved && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => onResolve(anomaly)}
                  >
                    <CheckCircle className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Mark as resolved</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </div>

      {isResolved && (
        <div className="text-xs text-green-600 pt-1">
          Resolved {anomaly.resolvedBy ? `by ${anomaly.resolvedBy}` : ''} on{' '}
          {format(parseISO(anomaly.resolvedAt!), 'MMM dd, HH:mm')}
        </div>
      )}
    </div>
  )
}

export const AttendanceAnomalies: React.FC<AttendanceAnomaliesProps> = ({
  anomalies,
  loading,
  total,
  onViewDetails,
  onResolve
}) => {
  const [showResolved, setShowResolved] = useState(false)

  const filteredAnomalies = showResolved 
    ? anomalies 
    : anomalies.filter(anomaly => !anomaly.resolvedAt)

  const unresolvedCount = anomalies.filter(anomaly => !anomaly.resolvedAt).length
  const criticalCount = anomalies.filter(
    anomaly => anomaly.severity === 'CRITICAL' && !anomaly.resolvedAt
  ).length

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <AlertTriangle className="h-5 w-5" />
            Anomalies & Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="p-3 border rounded-lg animate-pulse">
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-4 w-4 bg-gray-200 rounded" />
                  <div className="h-4 bg-gray-200 rounded w-24" />
                  <div className="h-4 bg-gray-200 rounded w-16" />
                </div>
                <div className="h-3 bg-gray-200 rounded w-full mb-1" />
                <div className="h-3 bg-gray-200 rounded w-2/3" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <AlertTriangle className="h-5 w-5" />
            Anomalies & Alerts
          </CardTitle>
          <div className="flex items-center gap-2">
            {criticalCount > 0 && (
              <Badge variant="destructive" className="text-xs">
                {criticalCount} Critical
              </Badge>
            )}
            <Badge variant="secondary" className="text-xs">
              {unresolvedCount} Active
            </Badge>
          </div>
        </div>
        
        <div className="flex items-center justify-between pt-2">
          <p className="text-sm text-gray-600">
            {total} total anomalies detected
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowResolved(!showResolved)}
            className="text-xs"
          >
            {showResolved ? 'Hide' : 'Show'} Resolved
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        {filteredAnomalies.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
            <h3 className="text-sm font-medium text-gray-900 mb-1">
              {showResolved ? 'No Anomalies Found' : 'All Clear!'}
            </h3>
            <p className="text-xs text-gray-600">
              {showResolved 
                ? 'No anomalies detected in the current period.' 
                : 'No active anomalies require attention.'}
            </p>
          </div>
        ) : (
          <ScrollArea className="h-96">
            <div className="space-y-3 pr-4">
              {filteredAnomalies.map((anomaly) => (
                <AnomalyCard
                  key={anomaly.id}
                  anomaly={anomaly}
                  onViewDetails={onViewDetails}
                  onResolve={onResolve}
                />
              ))}
            </div>
          </ScrollArea>
        )}

        {filteredAnomalies.length > 0 && (
          <div className="pt-3 mt-3 border-t">
            <div className="flex items-center justify-between text-xs text-gray-600">
              <span>
                Showing {filteredAnomalies.length} of {total} anomalies
              </span>
              <Button variant="ghost" size="sm" className="text-xs">
                View All
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}