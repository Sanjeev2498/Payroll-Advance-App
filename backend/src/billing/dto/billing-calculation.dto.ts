import { Decimal } from 'decimal.js';

export interface DeploymentHours {
  siteId: string;
  siteName: string;
  assignmentId: string;
  employeeId: string;
  employeeName: string;
  employeeNumber: string;
  regularHours: number;
  overtimeHours: number;
  holidayHours: number;
  totalHours: number;
  hourlyRate: Decimal;
  overtimeRate: Decimal;
  holidayRate: Decimal;
  totalAmount: Decimal;
}

export interface SiteDeploymentSummary {
  siteId: string;
  siteName: string;
  totalRegularHours: number;
  totalOvertimeHours: number;
  totalHolidayHours: number;
  totalHours: number;
  totalAmount: Decimal;
  deployments: DeploymentHours[];
}

export interface BillingCalculationResult {
  clientId: string;
  clientName: string;
  billingPeriod: {
    start: Date;
    end: Date;
  };
  siteDeployments: SiteDeploymentSummary[];
  summary: {
    totalRegularHours: number;
    totalOvertimeHours: number;
    totalHolidayHours: number;
    totalHours: number;
    subtotal: Decimal;
    additionalCharges: Decimal;
    taxableAmount: Decimal;
    gstAmount: Decimal;
    totalAmount: Decimal;
  };
  gstBreakdown?: {
    cgst: Decimal;
    sgst: Decimal;
    igst: Decimal;
    utgst: Decimal;
  };
}

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unit: string;
  rate: Decimal;
  amount: Decimal;
  taxable: boolean;
  hsnCode?: string;
}
