import { apiClient } from './client';

export interface CreateInvoiceRequest {
  clientId: string;
  billingModel: string;
  billingPeriodStart: string;
  billingPeriodEnd: string;
  dueDate: string;
  paymentTerms: string;
  lineItems: any[];
  subtotal: number;
  tax: number;
  total: number;
  notes?: string;
  template: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  clientId: string;
  clientName: string;
  amount: number;
  status: string;
  dueDate: string;
  issueDate: string;
  paidDate?: string;
  billingPeriodStart: string;
  billingPeriodEnd: string;
}

export interface BillingAnalytics {
  totalRevenue: number;
  outstandingAmount: number;
  paidInvoices: number;
  overdueInvoices: number;
}

export const billingApi = {
  async getInvoices(filters?: any): Promise<Invoice[]> {
    try {
      const params = new URLSearchParams();
      if (filters?.status) params.append('status', filters.status);
      if (filters?.client) params.append('clientId', filters.client);
      if (filters?.startDate) params.append('startDate', filters.startDate);
      if (filters?.endDate) params.append('endDate', filters.endDate);
      
      const response = await apiClient.get(`/billing/invoices?${params.toString()}`);
      return response.data.data || [];
    } catch (error) {
      console.error('Failed to fetch invoices:', error);
      // Return mock data for development
      return [
        {
          id: '1',
          invoiceNumber: 'INV-2024-001',
          clientId: 'client1',
          clientName: 'TechCorp Ltd',
          amount: 47200,
          status: 'SENT',
          dueDate: '2024-02-15',
          issueDate: '2024-01-15',
          billingPeriodStart: '2024-01-01',
          billingPeriodEnd: '2024-01-31'
        },
        {
          id: '2',
          invoiceNumber: 'INV-2024-002',
          clientId: 'client2',
          clientName: 'Secure Industries',
          amount: 35400,
          status: 'PAID',
          dueDate: '2024-02-10',
          issueDate: '2024-01-10',
          paidDate: '2024-02-08',
          billingPeriodStart: '2024-01-01',
          billingPeriodEnd: '2024-01-31'
        },
        {
          id: '3',
          invoiceNumber: 'INV-2024-003',
          clientId: 'client3',
          clientName: 'Metro Solutions',
          amount: 59000,
          status: 'OVERDUE',
          dueDate: '2024-01-20',
          issueDate: '2023-12-20',
          billingPeriodStart: '2023-12-01',
          billingPeriodEnd: '2023-12-31'
        }
      ];
    }
  },

  async getAnalytics(): Promise<BillingAnalytics> {
    try {
      const response = await apiClient.get('/billing/analytics');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch billing analytics:', error);
      // Return mock data for development
      return {
        totalRevenue: 141600,
        outstandingAmount: 106200,
        paidInvoices: 1,
        overdueInvoices: 1
      };
    }
  },

  async createInvoice(data: CreateInvoiceRequest): Promise<any> {
    try {
      const response = await apiClient.post('/billing/invoices', data);
      return response.data;
    } catch (error) {
      console.error('Failed to create invoice:', error);
      // Mock success for development
      return {
        id: Date.now().toString(),
        invoiceNumber: `INV-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`,
        ...data,
        status: 'DRAFT',
        issueDate: new Date().toISOString().split('T')[0]
      };
    }
  },

  async sendInvoice(invoiceId: string): Promise<any> {
    try {
      const response = await apiClient.post(`/billing/invoices/${invoiceId}/send`);
      return response.data;
    } catch (error) {
      console.error('Failed to send invoice:', error);
      // Mock success for development
      return { success: true, sentAt: new Date().toISOString() };
    }
  },

  async markPaid(invoiceId: string, paymentData: any): Promise<any> {
    try {
      const response = await apiClient.post(`/billing/invoices/${invoiceId}/mark-paid`, paymentData);
      return response.data;
    } catch (error) {
      console.error('Failed to mark invoice as paid:', error);
      // Mock success for development
      return { success: true, paidAt: new Date().toISOString() };
    }
  },

  async generateInvoice(invoiceId: string, options: any): Promise<any> {
    try {
      const response = await apiClient.post(`/billing/invoices/${invoiceId}/generate`, options, {
        responseType: 'blob'
      });
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      
      const filename = `invoice-${invoiceId}.${options.format || 'pdf'}`;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      return { success: true };
    } catch (error) {
      console.error('Failed to generate invoice:', error);
      throw new Error('Invoice generation failed. Please try again.');
    }
  },

  async getInvoiceDetails(invoiceId: string): Promise<any> {
    try {
      const response = await apiClient.get(`/billing/invoices/${invoiceId}`);
      return response.data;
    } catch (error) {
      console.error('Failed to get invoice details:', error);
      // Return mock data for development
      return {
        id: invoiceId,
        invoiceNumber: 'INV-2024-001',
        clientName: 'TechCorp Ltd',
        amount: 47200,
        status: 'SENT',
        dueDate: '2024-02-15',
        issueDate: '2024-01-15',
        billingPeriodStart: '2024-01-01',
        billingPeriodEnd: '2024-01-31',
        lineItems: [
          {
            description: 'Security Guard Services - Site A',
            quantity: 160,
            rate: 250,
            amount: 40000
          }
        ],
        subtotal: 40000,
        tax: 7200,
        total: 47200,
        notes: 'Payment due within 30 days'
      };
    }
  },

  async getBillingAnalytics(params: any): Promise<any> {
    try {
      const searchParams = new URLSearchParams(params);
      const response = await apiClient.get(`/billing/analytics/detailed?${searchParams.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Failed to get billing analytics:', error);
      // Return mock data for development
      return {
        overview: {
          totalRevenue: 141600,
          totalOutstanding: 106200,
          averageInvoiceValue: 47200,
          collectionRate: 25.0
        },
        monthlyTrends: [
          { month: 'Oct 2024', revenue: 120000, invoices: 3, avgValue: 40000 },
          { month: 'Nov 2024', revenue: 135000, invoices: 3, avgValue: 45000 },
          { month: 'Dec 2024', revenue: 141600, invoices: 3, avgValue: 47200 }
        ],
        clientBreakdown: [
          { client: 'TechCorp Ltd', revenue: 47200, invoices: 1, percentage: 33.3 },
          { client: 'Secure Industries', revenue: 35400, invoices: 1, percentage: 25.0 },
          { client: 'Metro Solutions', revenue: 59000, invoices: 1, percentage: 41.7 }
        ],
        statusDistribution: [
          { status: 'PAID', count: 1, amount: 35400, percentage: 25.0 },
          { status: 'SENT', count: 1, amount: 47200, percentage: 33.3 },
          { status: 'OVERDUE', count: 1, amount: 59000, percentage: 41.7 }
        ]
      };
    }
  },

  async getPaymentTracking(): Promise<any> {
    try {
      const response = await apiClient.get('/billing/payments/tracking');
      return response.data;
    } catch (error) {
      console.error('Failed to get payment tracking:', error);
      // Return mock data for development
      return {
        upcomingPayments: [
          {
            invoiceId: '1',
            invoiceNumber: 'INV-2024-001',
            clientName: 'TechCorp Ltd',
            amount: 47200,
            dueDate: '2024-02-15',
            daysUntilDue: 5
          }
        ],
        overduePayments: [
          {
            invoiceId: '3',
            invoiceNumber: 'INV-2024-003',
            clientName: 'Metro Solutions',
            amount: 59000,
            dueDate: '2024-01-20',
            daysOverdue: 25
          }
        ],
        recentPayments: [
          {
            invoiceId: '2',
            invoiceNumber: 'INV-2024-002',
            clientName: 'Secure Industries',
            amount: 35400,
            paidDate: '2024-02-08',
            paymentMethod: 'Bank Transfer'
          }
        ],
        paymentSummary: {
          totalReceivables: 106200,
          totalOverdue: 59000,
          collectionEfficiency: 75.0,
          averageCollectionPeriod: 28
        }
      };
    }
  }
};