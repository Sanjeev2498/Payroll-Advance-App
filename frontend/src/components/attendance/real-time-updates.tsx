'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { 
  Bell, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  XCircle,
  Activity,
  Users,
  TrendingUp,
  Zap
} from 'lucide-react'
import { format } from 'date-fns'
import { apiClient } from '@/lib/api/client'

interface RealtimeEvent {
  id: string
  type: 'CLOCK_IN' | 'CLOCK_OUT' | 'LATE_ARRIVAL' | 'NO_SHOW' | 'OVERTIME_START' | 'ANOMALY_DETECTED'
  employeeName: string
  employeeId: string
  siteName: string
  timestamp: string
  metadata?: Record<string, any>
  severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
}

interface LiveStats {
  activeEmployees: number
  totalClockedIn: number
  lateArrivals: number
  pendingClockOuts: number
  averageResponseTime: number
  lastUpdate: string
}

export const RealTimeUpdates: React.FC = () => {
  const [events, setEvents] = useState<RealtimeEvent[]>([])
  const [liveStats, setLiveStats] = useState<LiveStats>({
    activeEmployees: 0,
    totalClockedIn: 0,
    lateArrivals: 0,
    pendingClockOuts: 0,
    averageResponseTime: 0,
    lastUpdate: new Date().toISOString()
  })
  const [isConnected, setIsConnected] = useState(false)
  const [notifications, setNotifications] = useState<RealtimeEvent[]>([])
  const [showNotifications, setShowNotifications] = useState(false)

  // Fetch real-time data from API instead of generating mock data
  const fetchRealTimeData = async () => {
    try {
      const response = await apiClient.get('/attendance/real-time-events')
      const data = response.data.data || response.data
      const { events: apiEvents = [], liveStats: apiStats } = data || {}
      
      // Update events (keep most recent first)
      setEvents(prevEvents => {
        const newEvents = (apiEvents || []).filter((newEvent: RealtimeEvent) => 
          !prevEvents.find(existing => existing.id === newEvent.id)
        )
        return [...newEvents, ...prevEvents].slice(0, 20)
      })
      
      // Update live stats
      if (apiStats) {
        setLiveStats(apiStats)
      }
      
      // Add important events to notifications
      const importantEvents = (apiEvents || []).filter((event: RealtimeEvent) => 
        event.severity && ['MEDIUM', 'HIGH', 'CRITICAL'].includes(event.severity)
      )
      
      if (importantEvents.length > 0) {
        setNotifications(prev => [...importantEvents, ...prev].slice(0, 5))
      }
      
      setIsConnected(true)
    } catch (error) {
      console.error('Failed to fetch real-time data:', error)
      setIsConnected(false)
    }
  }

  useEffect(() => {
    // Initial fetch
    fetchRealTimeData()
    
    // Set up interval to poll for new events (in production, use WebSocket)
    const interval = setInterval(fetchRealTimeData, 15000) // Poll every 15 seconds
    
    return () => {
      clearInterval(interval)
      setIsConnected(false)
    }
  }, [])

  const getEventIcon = (type: RealtimeEvent['type']) => {
    switch (type) {
      case 'CLOCK_IN':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'CLOCK_OUT':
        return <Clock className="h-4 w-4 text-blue-600" />
      case 'LATE_ARRIVAL':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />
      case 'NO_SHOW':
        return <XCircle className="h-4 w-4 text-red-600" />
      case 'OVERTIME_START':
        return <TrendingUp className="h-4 w-4 text-orange-600" />
      case 'ANOMALY_DETECTED':
        return <AlertTriangle className="h-4 w-4 text-red-600" />
      default:
        return <Activity className="h-4 w-4 text-gray-600" />
    }
  }

  const getEventColor = (type: RealtimeEvent['type'], severity?: string) => {
    if (severity === 'CRITICAL') return 'text-red-700 bg-red-50 border-red-200'
    if (severity === 'HIGH') return 'text-orange-700 bg-orange-50 border-orange-200'
    if (severity === 'MEDIUM') return 'text-yellow-700 bg-yellow-50 border-yellow-200'
    
    switch (type) {
      case 'CLOCK_IN':
        return 'text-green-700 bg-green-50 border-green-200'
      case 'CLOCK_OUT':
        return 'text-blue-700 bg-blue-50 border-blue-200'
      default:
        return 'text-gray-700 bg-gray-50 border-gray-200'
    }
  }

  const formatEventMessage = (event: RealtimeEvent) => {
    const baseName = event.employeeName
    const site = event.siteName
    
    switch (event.type) {
      case 'CLOCK_IN':
        return `${baseName} clocked in at ${site}`
      case 'CLOCK_OUT':
        return `${baseName} clocked out from ${site}`
      case 'LATE_ARRIVAL':
        const minutes = event.metadata?.minutesLate || 'several'
        return `${baseName} arrived ${minutes} minutes late at ${site}`
      case 'NO_SHOW':
        return `${baseName} missed shift at ${site}`
      case 'OVERTIME_START':
        return `${baseName} started overtime at ${site}`
      case 'ANOMALY_DETECTED':
        return `Attendance anomaly detected for ${baseName} at ${site}`
      default:
        return `${baseName} - ${event.type} at ${site}`
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Live Statistics */}
      <Card className="lg:col-span-1">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
              <span>Live Stats</span>
            </div>
            <Badge variant="secondary" className="text-xs ml-auto">
              {isConnected ? 'Connected' : 'Disconnected'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-700">{liveStats.totalClockedIn}</div>
              <div className="text-xs text-blue-600">Clocked In</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-700">{liveStats.activeEmployees}</div>
              <div className="text-xs text-green-600">Active Today</div>
            </div>
            <div className="text-center p-3 bg-yellow-50 rounded-lg">
              <div className="text-2xl font-bold text-yellow-700">{liveStats.lateArrivals}</div>
              <div className="text-xs text-yellow-600">Late Today</div>
            </div>
            <div className="text-center p-3 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-700">{liveStats.pendingClockOuts}</div>
              <div className="text-xs text-purple-600">Pending Out</div>
            </div>
          </div>
          
          <div className="text-xs text-gray-500 text-center">
            Updated {format(new Date(liveStats.lastUpdate), 'HH:mm:ss')}
          </div>
        </CardContent>
      </Card>

      {/* Real-time Activity Feed */}
      <Card className="lg:col-span-2">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Activity className="h-5 w-5" />
              Live Activity Feed
            </CardTitle>
            <div className="flex items-center gap-2">
              {notifications.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative"
                >
                  <Bell className="h-4 w-4" />
                  {notifications.length > 0 && (
                    <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs">
                      {notifications.length}
                    </Badge>
                  )}
                </Button>
              )}
              <Badge variant="outline" className="text-xs">
                <Zap className="h-3 w-3 mr-1" />
                Real-time
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {events.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <Activity className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">Waiting for activity...</p>
              </div>
            </div>
          ) : (
            <ScrollArea className="h-80">
              <div className="p-4 space-y-3">
                {events.map((event) => (
                  <div
                    key={event.id}
                    className={`flex items-start gap-3 p-3 rounded-lg border ${getEventColor(event.type, event.severity)}`}
                  >
                    <div className="flex-shrink-0 mt-0.5">
                      {getEventIcon(event.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-xs">
                            {event.employeeName.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium">
                          {formatEventMessage(event)}
                        </span>
                        {event.severity && event.severity !== 'LOW' && (
                          <Badge variant="secondary" className="text-xs">
                            {event.severity}
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs opacity-75">
                        {format(new Date(event.timestamp), 'HH:mm:ss')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Notifications Popup */}
      {showNotifications && notifications.length > 0 && (
        <Card className="absolute right-4 top-20 w-80 z-50 shadow-lg">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Recent Notifications</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowNotifications(false)}
              >
                ×
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {notifications.map((notification) => (
              <div key={notification.id} className="p-2 bg-gray-50 rounded text-sm">
                <div className="flex items-center gap-2">
                  {getEventIcon(notification.type)}
                  <span className="font-medium">{notification.employeeName}</span>
                  <Badge variant="outline" className="text-xs ml-auto">
                    {notification.severity}
                  </Badge>
                </div>
                <div className="text-xs text-gray-600 mt-1">
                  {formatEventMessage(notification)}
                </div>
              </div>
            ))}
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs"
              onClick={() => setNotifications([])}
            >
              Clear All
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}