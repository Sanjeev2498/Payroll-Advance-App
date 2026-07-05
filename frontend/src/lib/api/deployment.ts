import { apiClient } from '@/lib/api/client'
import { 
  SiteDeploymentDetail,
  AssignmentConflict,
  DeploymentEfficiencyMetrics,
  GuardAssignmentRequest,
  EmergencyReplacementRequest,
  DeploymentAnalytics
} from '@/types/dashboard'

export const deploymentApi = {
  // Get detailed site deployment information
  async getSiteDetails(): Promise<SiteDeploymentDetail[]> {
    const response = await apiClient.get<{ success: boolean; data: SiteDeploymentDetail[] }>('/deployment/sites')
    return response.data.data!
  },

  // Get assignment conflicts
  async getAssignmentConflicts(): Promise<AssignmentConflict[]> {
    const response = await apiClient.get<{ success: boolean; data: AssignmentConflict[] }>('/deployment/conflicts')
    return response.data.data!
  },

  // Get deployment efficiency metrics
  async getEfficiencyMetrics(): Promise<DeploymentEfficiencyMetrics> {
    const response = await apiClient.get<{ success: boolean; data: DeploymentEfficiencyMetrics }>('/deployment/efficiency')
    return response.data.data!
  },

  // Get deployment analytics
  async getAnalytics(timeframe: '24h' | '7d' | '30d' = '24h'): Promise<DeploymentAnalytics> {
    const response = await apiClient.get<{ success: boolean; data: DeploymentAnalytics }>(`/deployment/analytics?timeframe=${timeframe}`)
    return response.data.data!
  },

  // Quick assign available guard to site
  async quickAssign(siteId: string, guardId?: string): Promise<void> {
    await apiClient.post('/deployment/quick-assign', {
      siteId,
      guardId // Optional - system will find best match if not provided
    })
  },

  // Request emergency replacement for a site
  async requestEmergencyReplacement(siteId: string, reason?: string): Promise<void> {
    await apiClient.post('/deployment/emergency-replacement', {
      siteId,
      reason,
      priority: 'critical'
    })
  },

  // Bulk assignment operations
  async bulkAssign(requests: GuardAssignmentRequest[]): Promise<void> {
    await apiClient.post('/deployment/bulk-assign', { assignments: requests })
  },

  // Get optimal assignment recommendations
  async getAssignmentRecommendations(siteId: string): Promise<{
    recommendedGuards: Array<{
      guardId: string
      guardName: string
      matchScore: number
      skills: string[]
      availability: string
      distance?: number
    }>
  }> {
    const response = await apiClient.get<{ 
      success: boolean; 
      data: {
        recommendedGuards: Array<{
          guardId: string
          guardName: string
          matchScore: number
          skills: string[]
          availability: string
          distance?: number
        }>
      }
    }>(`/deployment/recommendations/${siteId}`)
    return response.data.data!
  },

  // Update site requirements
  async updateSiteRequirements(siteId: string, requirements: {
    requiredGuards: number
    skills: string[]
    shiftPattern: string
    minimumExperience?: number
  }): Promise<void> {
    await apiClient.patch(`/deployment/sites/${siteId}/requirements`, requirements)
  },

  // Resolve assignment conflict
  async resolveConflict(conflictId: string, resolution: {
    action: 'reassign' | 'adjust_schedule' | 'split_assignment'
    details: Record<string, any>
  }): Promise<void> {
    await apiClient.post(`/deployment/conflicts/${conflictId}/resolve`, resolution)
  },

  // Get site operational health
  async getSiteHealth(siteId: string): Promise<{
    overallHealth: number
    metrics: {
      staffingLevel: number
      attendanceRate: number
      performanceScore: number
      incidentRate: number
    }
    recommendations: string[]
  }> {
    const response = await apiClient.get<{ 
      success: boolean; 
      data: {
        overallHealth: number
        metrics: {
          staffingLevel: number
          attendanceRate: number
          performanceScore: number
          incidentRate: number
        }
        recommendations: string[]
      }
    }>(`/deployment/sites/${siteId}/health`)
    return response.data.data!
  },

  // Schedule deployment optimization
  async optimizeDeployments(params: {
    timeHorizon: number // hours
    priorities: string[]
    constraints: Record<string, any>
  }): Promise<{
    optimizedAssignments: Array<{
      siteId: string
      guardId: string
      startTime: string
      endTime: string
      confidence: number
    }>
    efficiencyGain: number
    costSavings: number
  }> {
    const response = await apiClient.post<{ 
      success: boolean; 
      data: {
        optimizedAssignments: Array<{
          siteId: string
          guardId: string
          startTime: string
          endTime: string
          confidence: number
        }>
        efficiencyGain: number
        costSavings: number
      }
    }>('/deployment/optimize', params)
    return response.data.data!
  },

  // Real-time deployment status updates
  async subscribeToUpdates(callback: (update: {
    type: 'assignment' | 'conflict' | 'alert' | 'status_change'
    data: any
  }) => void): Promise<void> {
    // WebSocket implementation would go here
    // For now, this is a placeholder
    console.log('WebSocket subscription for deployment updates', callback)
  },

  // Export deployment report
  async exportReport(format: 'pdf' | 'excel', filters: {
    dateRange: { start: string; end: string }
    siteIds?: string[]
    includeAnalytics: boolean
  }): Promise<Blob> {
    const response = await apiClient.post('/deployment/export', filters, {
      responseType: 'blob',
      headers: {
        'Accept': format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      }
    })
    return response.data
  }
}