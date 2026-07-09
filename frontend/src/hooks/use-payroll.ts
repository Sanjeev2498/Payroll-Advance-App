import { useState, useCallback } from 'react';
import { payrollApi } from '@/lib/api/payroll';

interface PayrollRun {
  id: string;
  runNumber: string;
  payPeriodStart: string;
  payPeriodEnd: string;
  status: 'DRAFT' | 'PROCESSING' | 'COMPLETED' | 'CANCELLED';
  totalAmount: number;
  employeeCount: number;
  createdAt: string;
  processedAt?: string;
}

interface PayrollAnalytics {
  totalEmployees: number;
  monthlyPayroll: number;
  pendingApprovals: number;
  avgProcessingTime: string;
}

export function usePayroll() {
  const [payrollRuns, setPayrollRuns] = useState<PayrollRun[]>([]);
  const [analytics, setAnalytics] = useState<PayrollAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPayrollRuns = useCallback(async (filters?: any) => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await payrollApi.getPayrollRuns(filters);
      setPayrollRuns(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch payroll runs');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchAnalytics = useCallback(async () => {
    try {
      const data = await payrollApi.getAnalytics();
      setAnalytics(data);
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
    }
  }, []);

  const createPayrollRun = useCallback(async (data: any) => {
    try {
      setIsLoading(true);
      const result = await payrollApi.createPayrollRun(data);
      await fetchPayrollRuns(); // Refresh the list
      return result;
    } catch (err: any) {
      setError(err.message || 'Failed to create payroll run');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [fetchPayrollRuns]);

  const approvePayrollRun = useCallback(async (runId: string, approval: any) => {
    try {
      const result = await payrollApi.approvePayrollRun(runId, approval);
      await fetchPayrollRuns(); // Refresh the list
      return result;
    } catch (err: any) {
      setError(err.message || 'Failed to approve payroll run');
      throw err;
    }
  }, [fetchPayrollRuns]);

  const exportPayrollRun = useCallback(async (runId: string, options: any) => {
    try {
      const result = await payrollApi.exportPayrollRun(runId, options);
      return result;
    } catch (err: any) {
      setError(err.message || 'Failed to export payroll run');
      throw err;
    }
  }, []);

  const getPayrollRunDetails = useCallback(async (runId: string) => {
    try {
      const result = await payrollApi.getPayrollRunDetails(runId);
      return result;
    } catch (err: any) {
      setError(err.message || 'Failed to get payroll run details');
      throw err;
    }
  }, []);

  const getPayrollAnalytics = useCallback(async (params: any) => {
    try {
      const result = await payrollApi.getPayrollAnalytics(params);
      return result;
    } catch (err: any) {
      setError(err.message || 'Failed to get payroll analytics');
      throw err;
    }
  }, []);

  return {
    payrollRuns,
    analytics,
    isLoading,
    error,
    fetchPayrollRuns,
    fetchAnalytics,
    createPayrollRun,
    approvePayrollRun,
    exportPayrollRun,
    getPayrollRunDetails,
    getPayrollAnalytics,
  };
}