import { apiClient } from '@/lib/api/client'

// Client Portal API Interface
export interface ClientGuardData {
  siteId: string
  siteName: string
  requiredGuards: number
  assignedGuards: number
  onDutyGuards: number
  coverageStatus: 'FULLY_COVERED' | 'PARTIALLY_COVERED' | 'UNCOVERED' | 'OVER_STAFFED'
  guards: Array<{
    guardId: string
    guardName: string
    status: 'ON_DUTY' | 'OFF_DUTY' | 'ON_BREAK' | 'LATE' | 'ABSENT' | 'EMERGENCY'
    shiftStart: string
    shiftEnd: string
    lastCheckIn: string | null
    contactNumber: string
    attendanceStatus?: string
  }>
}

export interface ClientIncident {
  id: string
  type: string
  title: string
  siteName: string
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  status: 'RESOLVED' | 'IN_PROGRESS' | 'PENDING'
  reportedAt: string
  description?: string
  response?: string
}

export interface ClientComplaint {
  id: string
  type: string
  subject: string
  status: 'INVESTIGATING' | 'RESOLVED' | 'PENDING'
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  submittedAt: string
  description?: string
  assignedTo?: string
}

export interface ClientServiceRequest {
  id: string
  type: string
  title: string
  status: 'APPROVED' | 'PENDING' | 'REJECTED' | 'IN_PROGRESS'
  urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'EMERGENCY'
  submittedAt: string
  description?: string
  approvedBy?: string
}

// Client Portal API Service
export const clientPortalApi = {
  // Get guard deployment data for client
  getGuards: async (clientId: string): Promise<ClientGuardData[]> => {
    const response = await apiClient.get(`/client-portal/guards?clientId=${clientId}`);
    return response.data.data || response.data;
  },

  // Get incidents for client
  getIncidents: async (clientId?: string): Promise<{ incidents: ClientIncident[]; summary: any }> => {
    const response = await apiClient.get('/client-portal/communication/incidents', {
      params: { clientId }
    });
    return response.data.data || response.data;
  },

  // Get complaints for client
  getComplaints: async (clientId?: string): Promise<{ complaints: ClientComplaint[]; summary: any }> => {
    const response = await apiClient.get('/client-portal/communication/complaints', {
      params: { clientId }
    });
    return response.data.data || response.data;
  },

  // Get service requests for client
  getServiceRequests: async (clientId?: string): Promise<{ requests: ClientServiceRequest[]; summary: any }> => {
    const response = await apiClient.get('/client-portal/communication/requests', {
      params: { clientId }
    });
    return response.data.data || response.data;
  },

  // Submit a complaint
  submitComplaint: async (complaint: {
    type: string;
    subject: string;
    description: string;
    priority: string;
    siteId?: string;
    clientId?: string;
  }): Promise<ClientComplaint> => {
    const response = await apiClient.post('/client-portal/communication/complaints', complaint);
    return response.data.data || response.data;
  },

  // Submit a service request
  submitServiceRequest: async (request: {
    type: string;
    title: string;
    description: string;
    urgency: string;
    siteId?: string;
    clientId?: string;
  }): Promise<ClientServiceRequest> => {
    const response = await apiClient.post('/client-portal/communication/requests', request);
    return response.data.data || response.data;
  }
}