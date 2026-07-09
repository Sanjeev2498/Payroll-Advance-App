import { useState, useCallback } from 'react';
import { billingApi } from '@/lib/api/billing';

interface Invoice {
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

interface BillingAnalytics {
  totalRevenue: number;
  outstandingAmount: number;
  paidInvoices: number;
  overdueInvoices: number;
}

export function useBilling() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [analytics, setAnalytics] = useState<BillingAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInvoices = useCallback(async (filters?: any) => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await billingApi.getInvoices(filters);
      setInvoices(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch invoices');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchAnalytics = useCallback(async () => {
    try {
      const data = await billingApi.getAnalytics();
      setAnalytics(data);
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
    }
  }, []);

  const createInvoice = useCallback(async (data: any) => {
    try {
      setIsLoading(true);
      const result = await billingApi.createInvoice(data);
      await fetchInvoices(); // Refresh the list
      return result;
    } catch (err: any) {
      setError(err.message || 'Failed to create invoice');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [fetchInvoices]);

  const sendInvoice = useCallback(async (invoiceId: string) => {
    try {
      const result = await billingApi.sendInvoice(invoiceId);
      await fetchInvoices(); // Refresh the list
      return result;
    } catch (err: any) {
      setError(err.message || 'Failed to send invoice');
      throw err;
    }
  }, [fetchInvoices]);

  const markPaid = useCallback(async (invoiceId: string, paymentData: any) => {
    try {
      const result = await billingApi.markPaid(invoiceId, paymentData);
      await fetchInvoices(); // Refresh the list
      return result;
    } catch (err: any) {
      setError(err.message || 'Failed to mark invoice as paid');
      throw err;
    }
  }, [fetchInvoices]);

  const generateInvoice = useCallback(async (invoiceId: string, options: any) => {
    try {
      const result = await billingApi.generateInvoice(invoiceId, options);
      return result;
    } catch (err: any) {
      setError(err.message || 'Failed to generate invoice');
      throw err;
    }
  }, []);

  const getInvoiceDetails = useCallback(async (invoiceId: string) => {
    try {
      const result = await billingApi.getInvoiceDetails(invoiceId);
      return result;
    } catch (err: any) {
      setError(err.message || 'Failed to get invoice details');
      throw err;
    }
  }, []);

  const getBillingAnalytics = useCallback(async (params: any) => {
    try {
      const result = await billingApi.getBillingAnalytics(params);
      return result;
    } catch (err: any) {
      setError(err.message || 'Failed to get billing analytics');
      throw err;
    }
  }, []);

  const getPaymentTracking = useCallback(async () => {
    try {
      const result = await billingApi.getPaymentTracking();
      return result;
    } catch (err: any) {
      setError(err.message || 'Failed to get payment tracking data');
      throw err;
    }
  }, []);

  return {
    invoices,
    analytics,
    isLoading,
    error,
    fetchInvoices,
    fetchAnalytics,
    createInvoice,
    sendInvoice,
    markPaid,
    generateInvoice,
    getInvoiceDetails,
    getBillingAnalytics,
    getPaymentTracking,
  };
}