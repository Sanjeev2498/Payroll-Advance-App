import { apiClient } from '@/lib/api/client'
import { Site } from '@/types'

export interface SiteQueryDto {
  search?: string
  clientId?: string
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
  clientId: string
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
    if (queryDto.clientId) params.append('clientId', queryDto.clientId)
    if (queryDto.operationalStatus) params.append('operationalStatus', queryDto.operationalStatus)
    if (queryDto.page) params.append('page', queryDto.page.toString())
    if (queryDto.limit) params.append('limit', queryDto.limit.toString())
    if (queryDto.sortBy) params.append('sortBy', queryDto.sortBy)
    if (queryDto.sortOrder) params.append('sortOrder', queryDto.sortOrder)
    
    const url = `/sites${params.toString() ? `?${params.toString()}` : ''}`
    const response = await apiClient.get<SiteListResponseDto>(url)
    return response.data
  },

  // Get site by ID
  async getSite(id: string): Promise<Site> {
    const response = await apiClient.get<Site>(`/sites/${id}`)
    return response.data
  },

  // Create new site
  async createSite(siteData: CreateSiteDto): Promise<Site> {
    const response = await apiClient.post<Site>('/sites', siteData)
    return response.data
  },

  // Update site
  async updateSite(id: string, siteData: UpdateSiteDto): Promise<Site> {
    const response = await apiClient.patch<Site>(`/sites/${id}`, siteData)
    return response.data
  },

  // Delete site
  async deleteSite(id: string): Promise<Site> {
    const response = await apiClient.delete<Site>(`/sites/${id}`)
    return response.data
  }
}