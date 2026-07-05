import { Decimal } from 'decimal.js';
import { InvoiceStatus } from '@prisma/client';
import { GstCalculationResult } from './gst-calculation.dto';
import { DeploymentHours, SiteDeploymentSummary } from './billing-calculation.dto';

export interface InvoiceResponse {
  id: string;
  clientId: string;
  client: {
    id: string;
    name: string;
    contactEmail: string;
    contactInfo?: any;
  };
  invoiceNumber: string;
  billingPeriodStart: string;
  billingPeriodEnd: string;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  status: InvoiceStatus;
  dueDate: string;
  paidAt?: string;
  createdAt: string;
  updatedAt: string;
  gstDetails?: GstCalculationResult;
  deploymentSummary?: {
    totalHours: number;
    totalSites: number;
    totalEmployees: number;
    siteBreakdown: SiteDeploymentSummary[];
  };
  additionalCharges?: {
    name: string;
    amount: number;
    taxable: boolean;
  }[];
  notes?: string;
}

export interface InvoiceListResponse {
  data: InvoiceResponse[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  summary?: {
    totalInvoices: number;
    totalAmount: number;
    paidAmount: number;
    pendingAmount: number;
    overdueAmount: number;
    statusBreakdown: {
      [status in InvoiceStatus]: number;
    };
  };
}

export interface InvoicePdfResponse {
  invoiceId: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  generatedAt: string;
}
