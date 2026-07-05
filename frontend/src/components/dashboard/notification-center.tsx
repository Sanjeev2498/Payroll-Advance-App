'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Bell, 
  Check, 
  CheckCheck, 
  X,
  AlertTriangle,
  Info,
  CheckCircle2,
  Clock
} from 'lucide-react'
import { NotificationItem } from '@/types/dashboard'
import { dashboardApi } from '@/lib/api/dashboard'

interface NotificationCenterProps {
  notifications: NotificationItem[]
  onNotificationUpdate?: (notifications: NotificationItem[]) => void
  className?: string
}

export function NotificationCenter({ 
  notifications, 
  onNotificationUpdate, 
  className 
}: NotificationCenterProps) {
  const [loadingActions, setLoadingActions] = useState<Set<string>>(new Set())

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'error': return <AlertTriangle className="w-4 h-4 text-red-500" />
      case 'warning': return <AlertTriangle className="w-4 h-4 text-yellow-500" />
      case 'success': return <CheckCircle2 className="w-4 h-4 text-green-500" />
      case 'info': 
      default: return <Info className="w-4 h-4 text-blue-500" />
    }
  }

  const getSeverityBadgeColor = (severity: string) => {
    switch (severity) {
      case 'error': return 'bg-red-100 text-red-800 border-red-200'
      case 'warning': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'success': return 'bg-green-100 text-green-800 border-green-200'
      case 'info': 
      default: return 'bg-blue-100 text-blue-800 border-blue-200'
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'payroll': return 'text-purple-600'
      case 'attendance': return 'text-blue-600'
      case 'compliance': return 'text-red-600'
      case 'billing': return 'text-green-600'
      case 'system': 
      default: return 'text-gray-600'
    }
  }

  const getTimeAgo = (timestamp: string) => {
    const now = new Date()
    const time = new Date(timestamp)
    const diffInSeconds = Math.floor((now.getTime() - time.getTime()) / 1000)
    
    if (diffInSeconds < 60) return `${diffInSeconds}s ago`
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
    return `${Math.floor(diffInSeconds / 86400)}d ago`
  }

  const handleMarkAsRead = async (notificationId: string) => {
    setLoadingActions(prev => new Set([...prev, notificationId]))
    
    try {
      await dashboardApi.markNotificationRead(notificationId)
      
      // Update the notifications list
      const updatedNotifications = notifications.map(notification =>
        notification.id === notificationId
          ? { ...notification, read: true }
          : notification
      )
      
      onNotificationUpdate?.(updatedNotifications)
    } catch (error) {
      console.error('Failed to mark notification as read:', error)
    } finally {
      setLoadingActions(prev => {
        const newSet = new Set(prev)
        newSet.delete(notificationId)
        return newSet
      })
    }
  }

  const handleMarkAllAsRead = async () => {
    setLoadingActions(prev => new Set([...prev, 'mark-all']))
    
    try {
      await dashboardApi.markAllNotificationsRead()
      
      // Update all notifications to read
      const updatedNotifications = notifications.map(notification => ({
        ...notification,
        read: true
      }))
      
      onNotificationUpdate?.(updatedNotifications)
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error)
    } finally {
      setLoadingActions(prev => {
        const newSet = new Set(prev)
        newSet.delete('mark-all')
        return newSet
      })
    }
  }

  const unreadCount = notifications.filter(n => !n.read).length
  const actionRequiredCount = notifications.filter(n => n.actionRequired && !n.read).length

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Notification Center
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {unreadCount}
              </Badge>
            )}
          </div>
          {unreadCount > 0 && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleMarkAllAsRead}
              disabled={loadingActions.has('mark-all')}
            >
              <CheckCheck className="w-4 h-4 mr-2" />
              Mark All Read
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Summary */}
        {(unreadCount > 0 || actionRequiredCount > 0) && (
          <div className="mb-4 p-3 rounded-lg bg-gray-50 border">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">
                {unreadCount} unread notifications
                {actionRequiredCount > 0 && `, ${actionRequiredCount} require action`}
              </span>
            </div>
          </div>
        )}

        {/* Notifications List */}
        <ScrollArea className="h-96">
          <div className="space-y-3">
            {notifications.length === 0 ? (
              <div className="text-center py-8">
                <Bell className="w-8 h-8 mx-auto mb-3 text-gray-400" />
                <p className="text-sm text-gray-500">No notifications</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div 
                  key={notification.id} 
                  className={`p-4 rounded-lg border transition-colors ${
                    notification.read 
                      ? 'bg-white border-gray-200' 
                      : 'bg-blue-50 border-blue-200'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Icon */}
                    <div className="flex-shrink-0 mt-0.5">
                      {getSeverityIcon(notification.severity)}
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          {/* Header */}
                          <div className="flex items-center gap-2 mb-1">
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${getSeverityBadgeColor(notification.severity)}`}
                            >
                              {notification.type}
                            </Badge>
                            <span className="text-xs text-gray-500">
                              {getTimeAgo(notification.timestamp)}
                            </span>
                            {notification.actionRequired && (
                              <Badge variant="destructive" className="text-xs">
                                Action Required
                              </Badge>
                            )}
                          </div>
                          
                          {/* Title & Message */}
                          <h4 className={`text-sm font-medium ${
                            notification.read ? 'text-gray-700' : 'text-gray-900'
                          }`}>
                            {notification.title}
                          </h4>
                          <p className="text-sm text-gray-600 mt-1">
                            {notification.message}
                          </p>
                          
                          {/* Action Button */}
                          {notification.actionRequired && notification.actionUrl && (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="mt-2"
                              onClick={() => window.open(notification.actionUrl, '_blank')}
                            >
                              Take Action
                            </Button>
                          )}
                        </div>
                        
                        {/* Mark as Read Button */}
                        {!notification.read && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleMarkAsRead(notification.id)}
                            disabled={loadingActions.has(notification.id)}
                            className="flex-shrink-0"
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}