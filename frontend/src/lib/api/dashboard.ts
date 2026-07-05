import { apiClient } from '@/lib/api/client'
import { 
  OperationsOverview, 
  KPIMetrics, 
  ActivityTimelineItem, 
  NotificationItem,
  DeploymentMetrics,
  GuardAvailability,
  RealTimeAlert
} from '@/types/dashboard'

export const dashboardApi = {
  // Get complete operations overview
  async getOperationsOverview(): Promise<OperationsOverview> {
    const response = await apiClient.get<{ success: boolean; data: OperationsOverview }>('/dashboard/operations')
    return response.data.data!
  },

  // Get real-time KPI metrics
  async getKPIMetrics(): Promise<KPIMetrics> {
    const response = await apiClient.get<{ success: boolean; data: KPIMetrics }>('/dashboard/kpis')
    return response.data.data!
  },

  // Get deployment metrics
  async getDeploymentMetrics(): Promise<DeploymentMetrics> {
    const response = await apiClient.get<{ success: boolean; data: DeploymentMetrics }>('/dashboard/deployments')
    return response.data.data!
  },

  // Get guard availability
  async getGuardAvailability(): Promise<GuardAvailability> {
    const response = await apiClient.get<{ success: boolean; data: GuardAvailability }>('/dashboard/guards')
    return response.data.data!
  },

  // Get activity timeline
  async getActivityTimeline(limit = 20): Promise<ActivityTimelineItem[]> {
    const response = await apiClient.get<{ success: boolean; data: ActivityTimelineItem[] }>(`/dashboard/activity?limit=${limit}`)
    return response.data.data!
  },

  // Get notifications
  async getNotifications(unreadOnly = false): Promise<NotificationItem[]> {
    const response = await apiClient.get<{ success: boolean; data: NotificationItem[] }>(`/dashboard/notifications?unreadOnly=${unreadOnly}`)
    return response.data.data!
  },

  // Get real-time alerts
  async getRealTimeAlerts(): Promise<RealTimeAlert[]> {
    const response = await apiClient.get<{ success: boolean; data: RealTimeAlert[] }>('/dashboard/alerts')
    return response.data.data!
  },

  // Mark notification as read
  async markNotificationRead(notificationId: string): Promise<void> {
    await apiClient.patch(`/dashboard/notifications/${notificationId}/read`, {})
  },

  // Mark all notifications as read
  async markAllNotificationsRead(): Promise<void> {
    await apiClient.patch('/dashboard/notifications/mark-all-read', {})
  },

  // Acknowledge alert
  async acknowledgeAlert(alertId: string): Promise<void> {
    await apiClient.patch(`/dashboard/alerts/${alertId}/acknowledge`, {})
  },

  // Resolve alert
  async resolveAlert(alertId: string, resolution?: string): Promise<void> {
    await apiClient.patch(`/dashboard/alerts/${alertId}/resolve`, { resolution })
  }
}