import { apiClient } from '@/lib/api/client'
import { Site } from '@/types'

export interface SiteQueryDto {
  search?: string
  contractId?: string  // FIXED: Changed from clientId to contractId
  operationalStatus?: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE'
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface SiteListResponseDto {
  sites: Site[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface CreateSiteDto {
  contractId: string
  name: string
  address: Record<string, any>
  accessRequirements: Record<string, any>
  safetyProtocols: Record<string, any>
  operationalStatus?: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE'
  contactInfo: Record<string, any>
}

export interface UpdateSiteDto extends Partial<CreateSiteDto> {
  operationalStatus?: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE'
}

export const sitesApi = {
  // Get all sites with filtering
  async getSites(queryDto: SiteQueryDto = {}): Promise<SiteListResponseDto> {
    const params = new URLSearchParams()
    
    if (queryDto.search) params.append('search', queryDto.search)
    if (queryDto.contractId) params.append('contractId', queryDto.contractId)  // FIXED: Changed from clientId to contractId
    if (queryDto.operationalStatus) params.append('operationalStatus', queryDto.operationalStatus)
    if (queryDto.page) params.append('page', queryDto.page.toString())
    if (queryDto.limit) params.append('limit', queryDto.limit.toString())
    if (queryDto.sortBy) params.append('sortBy', queryDto.sortBy)
    if (queryDto.sortOrder) params.append('sortOrder', queryDto.sortOrder)
    
    const url = `/sites${params.toString() ? `?${params.toString()}` : ''}`
    const response = await apiClient.get<{
      success: boolean;
      data: SiteListResponseDto;
      metadata: any;
    }>(url)
    return response.data.data
  },

  // Get site by ID
  async getSite(id: string): Promise<Site> {
    const response = await apiClient.get<{
      success: boolean;
      data: Site;
      metadata: any;
    }>(`/sites/${id}`)
    return response.data.data
  },

  // Create new site
  async createSite(siteData: CreateSiteDto): Promise<Site> {
    const response = await apiClient.post<{
      success: boolean;
      data: Site;
      metadata: any;
    }>('/sites', siteData)
    return response.data.data
  },

  // Update site
  async updateSite(id: string, siteData: UpdateSiteDto): Promise<Site> {
    const response = await apiClient.patch<{
      success: boolean;
      data: Site;
      metadata: any;
    }>(`/sites/${id}`, siteData)
    return response.data.data
  },

  // Delete site
  async deleteSite(id: string): Promise<Site> {
    const response = await apiClient.delete<{
      success: boolean;
      data: Site;
      metadata: any;
    }>(`/sites/${id}`)
    return response.data.data
  },

  // Get employees assigned to site
  async getSiteEmployees(siteId: string): Promise<any[]> {
    const response = await apiClient.get<{
      success: boolean;
      data: any[];
      metadata: any;
    }>(`/sites/${siteId}/employees`)
    return response.data.data
  },

  // Get attendance records for site
  async getSiteAttendance(siteId: string, date?: string): Promise<any[]> {
    const url = `/sites/${siteId}/attendance${date ? `?date=${date}` : ''}`
    const response = await apiClient.get<{
      success: boolean;
      data: any[];
      metadata: any;
    }>(url)
    return response.data.data
  },

  // Get assignments for site
  async getSiteAssignments(siteId: string): Promise<any[]> {
    const response = await apiClient.get<{
      success: boolean;
      data: any[];
      metadata: any;
    }>(`/sites/${siteId}/assignments`)
    return response.data.data
  },

  // Get shifts for site
  async getSiteShifts(siteId: string, date?: string): Promise<any[]> {
    const url = `/sites/${siteId}/shifts${date ? `?date=${date}` : ''}`
    const response = await apiClient.get<{
      success: boolean;
      data: any[];
      metadata: any;
    }>(url)
    return response.data.data
  },

  // Get performance metrics for site
  async getSitePerformance(siteId: string): Promise<any> {
    const response = await apiClient.get<{
      success: boolean;
      data: any;
      metadata: any;
    }>(`/sites/${siteId}/performance`)
    return response.data.data
  }
}