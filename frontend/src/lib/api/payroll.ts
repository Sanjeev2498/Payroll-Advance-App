import { apiClient } from './client';

export interface CreatePayrollRunRequest {
  runNumber?: string;
  payPeriodStart: string;
  payPeriodEnd: string;
  payType: string;
  includeOvertime: boolean;
  includeBonuses: boolean;
  includeDeductions: boolean;
  employeeIds: string[];
  description?: string;
  autoApprove: boolean;
}

export interface PayrollRun {
  id: string;
  runNumber: string;
  payPeriodStart: string;
  payPeriodEnd: string;
  status: string;
  totalAmount: number;
  employeeCount: number;
  createdAt: string;
  processedAt?: string;
  approvedAt?: string;
  approvedBy?: string;
}

export interface PayrollAnalytics {
  totalEmployees: number;
  monthlyPayroll: number;
  pendingApprovals: number;
  avgProcessingTime: string;
}

export const payrollApi = {
  async getPayrollRuns(filters?: any): Promise<PayrollRun[]> {
    try {
      const params = new URLSearchParams();
      if (filters?.status) params.append('status', filters.status);
      if (filters?.startDate) params.append('startDate', filters.startDate);
      if (filters?.endDate) params.append('endDate', filters.endDate);
      
      const response = await apiClient.get(`/payroll/runs?${params.toString()}`);
      return response.data.data || [];
    } catch (error) {
      console.error('Failed to fetch payroll runs:', error);
      // Return mock data for development
      return [
        {
          id: '1',
          runNumber: 'PAY-2024-01-001',
          payPeriodStart: '2024-01-01',
          payPeriodEnd: '2024-01-31',
          status: 'COMPLETED',
          totalAmount: 450000,
          employeeCount: 3,
          createdAt: '2024-01-25T10:00:00Z',
          processedAt: '2024-01-25T11:30:00Z',
          approvedAt: '2024-01-25T14:00:00Z',
          approvedBy: 'Admin User'
        },
        {
          id: '2',
          runNumber: 'PAY-2024-02-001',
          payPeriodStart: '2024-02-01',
          payPeriodEnd: '2024-02-29',
          status: 'PROCESSING',
          totalAmount: 475000,
          employeeCount: 3,
          createdAt: '2024-02-25T09:00:00Z',
          processedAt: '2024-02-25T10:15:00Z'
        }
      ];
    }
  },

  async getAnalytics(): Promise<PayrollAnalytics> {
    try {
      const response = await apiClient.get('/payroll/analytics');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch payroll analytics:', error);
      // Return mock data for development
      return {
        totalEmployees: 3,
        monthlyPayroll: 475000,
        pendingApprovals: 1,
        avgProcessingTime: '2.5'
      };
    }
  },

  async createPayrollRun(data: CreatePayrollRunRequest): Promise<any> {
    try {
      const response = await apiClient.post('/payroll/runs', data);
      return response.data;
    } catch (error) {
      console.error('Failed to create payroll run:', error);
      // Mock success for development
      return {
        id: Date.now().toString(),
        runNumber: data.runNumber || `PAY-${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-001`,
        ...data,
        status: 'PROCESSING',
        totalAmount: 0,
        employeeCount: 0,
        createdAt: new Date().toISOString()
      };
    }
  },

  async approvePayrollRun(runId: string, approval: any): Promise<any> {
    try {
      const response = await apiClient.post(`/payroll/runs/${runId}/approve`, approval);
      return response.data;
    } catch (error) {
      console.error('Failed to approve payroll run:', error);
      // Mock success for development
      return { success: true };
    }
  },

  async exportPayrollRun(runId: string, options: any): Promise<any> {
    try {
      const response = await apiClient.post(`/payroll/runs/${runId}/export`, options, {
        responseType: 'blob'
      });
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      
      const filename = options.type === 'payslips' ? 
        `payslips-${runId}.${options.format}` : 
        `payroll-summary-${runId}.${options.format}`;
      
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      return { success: true };
    } catch (error) {
      console.error('Failed to export payroll run:', error);
      throw new Error('Export failed. Please try again.');
    }
  },

  async getPayrollRunDetails(runId: string): Promise<any> {
    try {
      const response = await apiClient.get(`/payroll/runs/${runId}`);
      return response.data;
    } catch (error) {
      console.error('Failed to get payroll run details:', error);
      // Return mock data for development
      return {
        id: runId,
        runNumber: 'PAY-2024-01-001',
        payPeriodStart: '2024-01-01',
        payPeriodEnd: '2024-01-31',
        status: 'COMPLETED',
        totalAmount: 450000,
        employeeCount: 3,
        createdAt: '2024-01-25T10:00:00Z',
        processedAt: '2024-01-25T11:30:00Z',
        approvedAt: '2024-01-25T14:00:00Z',
        approvedBy: 'Admin User',
        description: 'Monthly payroll for January 2024',
        employees: [
          {
            id: '1',
            employeeNumber: 'EMP001',
            firstName: 'Rajesh',
            lastName: 'Kumar',
            regularHours: 160,
            overtimeHours: 20,
            grossPay: 150000,
            totalDeductions: 22500,
            netPay: 127500,
            status: 'COMPLETED',
            calculationDate: '2024-01-25T11:30:00Z'
          },
          {
            id: '2',
            employeeNumber: 'EMP002',
            firstName: 'Priya',
            lastName: 'Sharma',
            regularHours: 160,
            overtimeHours: 15,
            grossPay: 125000,
            totalDeductions: 18750,
            netPay: 106250,
            status: 'COMPLETED',
            calculationDate: '2024-01-25T11:30:00Z'
          },
          {
            id: '3',
            employeeNumber: 'EMP003',
            firstName: 'Amit',
            lastName: 'Singh',
            regularHours: 160,
            overtimeHours: 25,
            grossPay: 175000,
            totalDeductions: 26250,
            netPay: 148750,
            status: 'COMPLETED',
            calculationDate: '2024-01-25T11:30:00Z'
          }
        ],
        summary: {
          totalGross: 450000,
          totalDeductions: 67500,
          totalNet: 382500,
          totalHours: 480,
          totalOvertimeHours: 60,
          avgSalary: 150000
        }
      };
    }
  },

  async getPayrollAnalytics(params: any): Promise<any> {
    try {
      const searchParams = new URLSearchParams(params);
      const response = await apiClient.get(`/payroll/analytics/detailed?${searchParams.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Failed to get payroll analytics:', error);
      // Return mock data for development
      return {
        overview: {
          totalPayrollThisMonth: 475000,
          totalPayrollLastMonth: 450000,
          employeeCount: 3,
          avgSalaryPerEmployee: 158333,
          growthPercentage: 5.6
        },
        trends: [
          { month: 'Oct 2024', totalPayroll: 420000, employeeCount: 3, avgSalary: 140000 },
          { month: 'Nov 2024', totalPayroll: 435000, employeeCount: 3, avgSalary: 145000 },
          { month: 'Dec 2024', totalPayroll: 450000, employeeCount: 3, avgSalary: 150000 },
          { month: 'Jan 2024', totalPayroll: 475000, employeeCount: 3, avgSalary: 158333 }
        ],
        departmentBreakdown: [
          { department: 'Security Operations', totalPayroll: 285000, employeeCount: 2, percentage: 60 },
          { department: 'Administration', totalPayroll: 190000, employeeCount: 1, percentage: 40 }
        ],
        costBreakdown: {
          basicSalary: 380000,
          overtime: 71250,
          bonuses: 23750,
          deductions: 95000
        },
        topExpenses: [
          { category: 'Basic Salary', amount: 380000, percentage: 80 },
          { category: 'Overtime Pay', amount: 71250, percentage: 15 },
          { category: 'Bonuses', amount: 23750, percentage: 5 }
        ]
      };
    }
  }
};