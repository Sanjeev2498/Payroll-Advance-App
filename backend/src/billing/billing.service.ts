import { Injectable } from '@nestjs/common';
import { InvoiceService } from './services/invoice.service';
import { InvoiceCalculationService } from './services/invoice-calculation.service';
import { GstCalculationService } from './services/gst-calculation.service';
import { InvoicePdfService } from './services/invoice-pdf.service';
import { BillingValidationService } from './services/billing-validation.service';
import {
  CreateInvoiceDto,
  UpdateInvoiceDto,
  InvoiceFilterDto,
  InvoiceResponse,
  InvoiceListResponse,
  InvoicePdfResponse,
  BillingCalculationResult,
} from './dto';

@Injectable()
export class BillingService {
  constructor(
    private invoiceService: InvoiceService,
    private invoiceCalculationService: InvoiceCalculationService,
    private gstCalculationService: GstCalculationService,
    private invoicePdfService: InvoicePdfService,
    private billingValidationService: BillingValidationService,
  ) {}

  /**
   * Create a new invoice
   */
  async createInvoice(createInvoiceDto: CreateInvoiceDto): Promise<InvoiceResponse> {
    // Validate client billing permissions
    await this.billingValidationService.validateClientBillingPermissions(createInvoiceDto.clientId);

    // Validate additional charges if provided
    if (createInvoiceDto.additionalCharges?.length) {
      this.billingValidationService.validateAdditionalCharges(createInvoiceDto.additionalCharges);
    }

    // Validate custom rates if provided
    if (createInvoiceDto.customRates) {
      Object.values(createInvoiceDto.customRates).forEach(rates => {
        this.billingValidationService.validateBillingRates(rates);
      });
    }

    // Validate due date if provided
    if (createInvoiceDto.dueDate) {
      this.billingValidationService.validateDueDate(new Date(createInvoiceDto.dueDate));
    }

    return this.invoiceService.createInvoice(createInvoiceDto);
  }

  /**
   * Get invoice by ID
   */
  async getInvoice(id: string): Promise<InvoiceResponse> {
    return this.invoiceService.getInvoice(id);
  }

  /**
   * Update invoice
   */
  async updateInvoice(id: string, updateInvoiceDto: UpdateInvoiceDto): Promise<InvoiceResponse> {
    // Validate due date if being updated
    if (updateInvoiceDto.dueDate) {
      this.billingValidationService.validateDueDate(new Date(updateInvoiceDto.dueDate));
    }

    return this.invoiceService.updateInvoice(id, updateInvoiceDto);
  }

  /**
   * List invoices with filtering and pagination
   */
  async listInvoices(filterDto: InvoiceFilterDto): Promise<InvoiceListResponse> {
    return this.invoiceService.listInvoices(filterDto);
  }

  /**
   * Delete invoice (mark as cancelled)
   */
  async deleteInvoice(id: string): Promise<void> {
    return this.invoiceService.deleteInvoice(id);
  }

  /**
   * Mark invoice as sent
   */
  async markInvoiceAsSent(id: string): Promise<InvoiceResponse> {
    return this.invoiceService.markInvoiceAsSent(id);
  }

  /**
   * Calculate billing preview without creating invoice
   */
  async calculateBillingPreview(createInvoiceDto: CreateInvoiceDto): Promise<BillingCalculationResult> {
    // Validate client billing permissions
    await this.billingValidationService.validateClientBillingPermissions(createInvoiceDto.clientId);

    // Calculate billing amounts
    return this.invoiceCalculationService.calculateClientBilling(createInvoiceDto);
  }

  /**
   * Generate invoice PDF
   */
  async generateInvoicePdf(invoiceId: string): Promise<InvoicePdfResponse> {
    const invoice = await this.invoiceService.getInvoice(invoiceId);
    return this.invoicePdfService.generateInvoicePdf(invoice);
  }

  /**
   * Get invoice statistics for dashboard
   */
  async getInvoiceStatistics(period?: { start: Date; end: Date }) {
    return this.invoiceService.getInvoiceStatistics(period);
  }

  /**
   * Validate GSTIN
   */
  validateGstin(gstin: string) {
    return this.gstCalculationService.validateGstin(gstin);
  }

  /**
   * Get GST compliance information
   */
  getGstComplianceInfo(input: {
    companyGstin: string;
    clientGstin?: string;
    placeOfSupply: string;
    companyState: string;
  }) {
    return this.gstCalculationService.getGstComplianceInfo(input);
  }

  /**
   * Calculate GST for preview
   */
  calculateGstPreview(input: {
    amount: number;
    companyGstin: string;
    clientGstin?: string;
    placeOfSupply: string;
    companyState: string;
    serviceType?: 'SECURITY_SERVICES' | 'MANPOWER_SERVICES' | 'FACILITY_MANAGEMENT';
  }) {
    return this.gstCalculationService.calculateGst({
      taxableAmount: new (require('@prisma/client/runtime/library').Decimal)(input.amount),
      companyGstin: input.companyGstin,
      clientGstin: input.clientGstin,
      placeOfSupply: input.placeOfSupply,
      companyState: input.companyState,
      serviceType: input.serviceType || 'SECURITY_SERVICES',
    });
  }

  /**
   * Generate invoice number preview
   */
  async generateInvoiceNumberPreview(clientId: string): Promise<string> {
    // This uses the calculation service's method but doesn't save it
    return this.invoiceCalculationService.generateInvoiceNumber(
      // We need the tenant context here, but for preview we can call it directly
      clientId, // This will be used to get the company ID internally
      clientId
    );
  }

  /**
   * Bulk invoice operations
   */
  async bulkMarkAsSent(invoiceIds: string[]): Promise<InvoiceResponse[]> {
    const results = [];
    for (const id of invoiceIds) {
      try {
        const result = await this.invoiceService.markInvoiceAsSent(id);
        results.push(result);
      } catch (error) {
        // Continue with other invoices even if one fails
        console.error(`Failed to mark invoice ${id} as sent:`, error.message);
      }
    }
    return results;
  }

  /**
   * Get overdue invoices
   */
  async getOverdueInvoices(filterDto?: Partial<InvoiceFilterDto>): Promise<InvoiceListResponse> {
    const now = new Date();
    const overdueFilter: InvoiceFilterDto = {
      ...filterDto,
      status: 'SENT' as any,
      dueDateEnd: now.toISOString(),
    };

    return this.invoiceService.listInvoices(overdueFilter);
  }

  /**
   * Get monthly billing summary
   */
  async getMonthlyBillingSummary(year: number, month: number) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    return this.invoiceService.getInvoiceStatistics({
      start: startDate,
      end: endDate,
    });
  }

  /**
   * Export invoices to CSV/Excel (placeholder)
   */
  async exportInvoices(filterDto: InvoiceFilterDto, format: 'csv' | 'excel' = 'csv') {
    // This would implement export functionality
    // For now, just return the data that would be exported
    const invoices = await this.invoiceService.listInvoices({
      ...filterDto,
      limit: 1000, // Large limit for export
    });

    return {
      format,
      data: invoices.data,
      filename: `invoices-${new Date().toISOString().split('T')[0]}.${format}`,
    };
  }
}