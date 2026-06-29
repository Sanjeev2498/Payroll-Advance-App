import { api } from './client'
import { 
  Attendance, 
  AttendanceAnomaly, 
  AttendanceStats, 
  AttendanceFilter, 
  ClockAction,
  PaginatedResponse 
} from '@/types'

export interface AttendanceQueryParams extends AttendanceFilter {
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface ClockInData {
  employeeId: string
  shiftId: string
  clockInTime?: string
  locationData?: Record<string, any>
  verificationData?: Record<string, any>
  notes?: string
}

export interface ClockOutData {
  employeeId: string
  shiftId: string
  clockOutTime?: string
  locationData?: Record<string, any>
  verificationData?: Record<string, any>
  notes?: string
}

export interface AttendanceCorrectionData {
  correctionType: 'CLOCK_IN' | 'CLOCK_OUT' | 'BOTH' | 'LOCATION'
  reason: string
  correctedClockIn?: string
  correctedClockOut?: string
  correctedLocationData?: Record<string, any>
  supportingEvidence?: string[]
  emergencyOverride?: boolean
}

export const attendanceService = {
  // Get attendance records with filtering and pagination
  async getAttendance(params: AttendanceQueryParams = {}): Promise<PaginatedResponse<Attendance> & { stats: AttendanceStats }> {
    const searchParams = new URLSearchParams()
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, value.toString())
      }
    })

    const response = await api.get(`/attendance?${searchParams.toString()}`)
    return response.data
  },

  // Get single attendance record
  async getAttendanceById(id: string): Promise<Attendance> {
    const response = await api.get(`/attendance/${id}`)
    return response.data
  },

  // Get attendance statistics
  async getStats(
    dateFrom?: string, 
    dateTo?: string, 
    siteId?: string, 
    employeeId?: string
  ): Promise<AttendanceStats> {
    const params = new URLSearchParams()
    
    if (dateFrom) params.append('dateFrom', dateFrom)
    if (dateTo) params.append('dateTo', dateTo)
    if (siteId) params.append('siteId', siteId)
    if (employeeId) params.append('employeeId', employeeId)

    const response = await api.get(`/attendance/stats?${params.toString()}`)
    return response.data
  },

  // Clock in employee
  async clockIn(data: ClockInData): Promise<ClockAction> {
    const response = await api.post('/attendance/clock-in', data)
    return response.data
  },

  // Clock out employee
  async clockOut(data: ClockOutData): Promise<ClockAction> {
    const response = await api.post('/attendance/clock-out', data)
    return response.data
  },

  // Get employee current status
  async getEmployeeCurrentStatus(employeeId: string) {
    const response = await api.get(`/attendance/employee/${employeeId}/current-status`)
    return response.data
  },

  // Get employee today's attendance
  async getEmployeeTodayAttendance(employeeId: string): Promise<PaginatedResponse<Attendance>> {
    const response = await api.get(`/attendance/employee/${employeeId}/today`)
    return response.data
  },

  // Detect anomalies
  async detectAnomalies(params: {
    dateFrom?: string
    dateTo?: string
    employeeId?: string
    siteId?: string
    anomalyTypes?: string[]
    minSeverity?: string
    page?: number
    limit?: number
  } = {}) {
    const searchParams = new URLSearchParams()
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        if (Array.isArray(value)) {
          value.forEach(v => searchParams.append(key, v))
        } else {
          searchParams.append(key, value.toString())
        }
      }
    })

    const response = await api.get(`/attendance/anomalies?${searchParams.toString()}`)
    return response.data
  },

  // Request attendance correction
  async requestCorrection(attendanceId: string, data: AttendanceCorrectionData) {
    const response = await api.post(`/attendance/${attendanceId}/correction`, data)
    return response.data
  },

  // Update attendance record
  async updateAttendance(id: string, data: Partial<Attendance>) {
    const response = await api.patch(`/attendance/${id}`, data)
    return response.data
  },

  // Bulk update attendance records
  async bulkUpdateAttendance(data: {
    attendanceIds: string[]
    operation: 'UPDATE_STATUS' | 'APPROVE_CORRECTIONS' | 'REJECT_CORRECTIONS' | 'BULK_EDIT'
    newStatus?: string
    updateData?: Record<string, any>
    reason?: string
  }) {
    const response = await api.post('/attendance/bulk-update', data)
    return response.data
  },

  // Export attendance data
  async exportAttendance(params: AttendanceQueryParams & { format?: 'csv' | 'xlsx' | 'pdf' }) {
    const searchParams = new URLSearchParams()
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, value.toString())
      }
    })

    const response = await api.get(`/attendance/export?${searchParams.toString()}`, {
      responseType: 'blob'
    })
    
    return response.data
  }
}