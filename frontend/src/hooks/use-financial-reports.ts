import { useState, useCallback } from 'react';
import { apiClient } from '@/lib/api';

export interface PayrollReportSummary {
  totalPayroll: number;
  employeeCount: number;
  avgSalaryPerEmployee: number;
  totalRegularHours: number;
  totalOvertimeHours: number;
  totalDeductions: number;
  netPayroll: number;
  growthPercentage: number;
  departmentBreakdown: {
    department: string;
    totalPayroll: number;
    employeeCount: number;
    percentage: number;
  }[];
  monthlyTrends: {
    month: string;
    year: number;
    totalPayroll: number;
    employeeCount: number;
    avgSalary: number;
  }[];
}

export interface BillingReportSummary {
  totalRevenue: number;
  totalInvoices: number;
  avgInvoiceValue: number;
  totalOutstanding: number;
  collectionRate: number;
  growthPercentage: number;
  clientBreakdown: {
    clientId: string;
    clientName: string;
    totalRevenue: number;
    invoiceCount: number;
    percentage: number;
    outstandingAmount: number;
  }[];
  monthlyTrends: {
    month: string;
    year: number;
    totalRevenue: number;
    invoiceCount: number;
    avgValue: number;
  }[];
  statusDistribution: {
    status: string;
    count: number;
    amount: number;
    percentage: number;
  }[];
}

export interface SiteProfitabilityAnalysis {
  siteId: string;
  siteName: string;
  clientName: string;
  revenue: number;
  payrollCosts: number;
  operationalCosts: number;
  grossProfit: number;
  profitMargin: number;
  employeeCount: number;
  hoursWorked: number;
  utilizationRate: number;
  recommendations: string[];
}

export interface FinancialForecast {
  period: string;
  projectedRevenue: number;
  projectedPayroll: number;
  projectedProfit: number;
  confidence: number;
  factors: string[];
}

export interface CostOptimizationInsight {
  category: string;
  currentCost: number;
  potentialSavings: number;
  savingsPercentage: number;
  actionItems: string[];
  priority: 'high' | 'medium' | 'low';
}

export interface FinancialDashboardData {
  payrollSummary: PayrollReportSummary;
  billingSummary: BillingReportSummary;
  siteProfitability: SiteProfitabilityAnalysis[];
  forecasts: FinancialForecast[];
  costOptimization: CostOptimizationInsight[];
  kpis: {
    totalRevenue: number;
    totalPayroll: number;
    grossProfit: number;
    profitMargin: number;
    employeeProductivity: number;
    clientSatisfaction: number;
  };
}

export interface FinancialReportsFilter {
  startDate: string;
  endDate: string;
  employeeIds?: string[];
  clientIds?: string[];
  siteIds?: string[];
  departmentIds?: string[];
}

export const useFinancialReports = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getPayrollReports = useCallback(async (filter: FinancialReportsFilter): Promise<PayrollReportSummary> => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        startDate: filter.startDate,
        endDate: filter.endDate,
        ...(filter.employeeIds?.length && { employeeIds: filter.employeeIds.join(',') }),
        ...(filter.siteIds?.length && { siteIds: filter.siteIds.join(',') }),
        ...(filter.departmentIds?.length && { departmentIds: filter.departmentIds.join(',') }),
      });

      const response = await apiClient.get(`/financial-reports/payroll-reports?${params}`);
      return response.data as PayrollReportSummary;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch payroll reports';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getBillingReports = useCallback(async (filter: FinancialReportsFilter): Promise<BillingReportSummary> => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        startDate: filter.startDate,
        endDate: filter.endDate,
        ...(filter.clientIds?.length && { clientIds: filter.clientIds.join(',') }),
        ...(filter.siteIds?.length && { siteIds: filter.siteIds.join(',') }),
      });

      const response = await apiClient.get(`/financial-reports/billing-reports?${params}`);
      return response.data as BillingReportSummary;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch billing reports';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getSiteProfitabilityAnalysis = useCallback(async (filter: FinancialReportsFilter): Promise<SiteProfitabilityAnalysis[]> => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        startDate: filter.startDate,
        endDate: filter.endDate,
        ...(filter.siteIds?.length && { siteIds: filter.siteIds.join(',') }),
      });

      const response = await apiClient.get(`/financial-reports/site-profitability?${params}`);
      return response.data as SiteProfitabilityAnalysis[];
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch site profitability analysis';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getFinancialForecasts = useCallback(async (periods: number = 6): Promise<FinancialForecast[]> => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get(`/financial-reports/financial-forecasts?periods=${periods}`);
      return response.data as FinancialForecast[];
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch financial forecasts';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getCostOptimizationInsights = useCallback(async (): Promise<CostOptimizationInsight[]> => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get('/financial-reports/cost-optimization');
      return response.data as CostOptimizationInsight[];
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch cost optimization insights';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getFinancialDashboardData = useCallback(async (filter: FinancialReportsFilter): Promise<FinancialDashboardData> => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        startDate: filter.startDate,
        endDate: filter.endDate,
      });

      const response = await apiClient.get(`/financial-reports/dashboard?${params}`);
      return response.data as FinancialDashboardData;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch financial dashboard data';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const exportPayrollReport = useCallback(async (filter: FinancialReportsFilter) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        startDate: filter.startDate,
        endDate: filter.endDate,
        ...(filter.employeeIds?.length && { employeeIds: filter.employeeIds.join(',') }),
        ...(filter.siteIds?.length && { siteIds: filter.siteIds.join(',') }),
        ...(filter.departmentIds?.length && { departmentIds: filter.departmentIds.join(',') }),
      });

      const response = await apiClient.get(`/financial-reports/export/payroll-report?${params}`);
      return response.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to export payroll report';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const exportBillingReport = useCallback(async (filter: FinancialReportsFilter) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        startDate: filter.startDate,
        endDate: filter.endDate,
        ...(filter.clientIds?.length && { clientIds: filter.clientIds.join(',') }),
        ...(filter.siteIds?.length && { siteIds: filter.siteIds.join(',') }),
      });

      const response = await apiClient.get(`/financial-reports/export/billing-report?${params}`);
      return response.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to export billing report';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const exportProfitabilityReport = useCallback(async (filter: FinancialReportsFilter) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        startDate: filter.startDate,
        endDate: filter.endDate,
        ...(filter.siteIds?.length && { siteIds: filter.siteIds.join(',') }),
      });

      const response = await apiClient.get(`/financial-reports/export/profitability-report?${params}`);
      return response.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to export profitability report';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    getPayrollReports,
    getBillingReports,
    getSiteProfitabilityAnalysis,
    getFinancialForecasts,
    getCostOptimizationInsights,
    getFinancialDashboardData,
    exportPayrollReport,
    exportBillingReport,
    exportProfitabilityReport,
  };
};