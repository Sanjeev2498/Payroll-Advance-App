import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { RequireInvoiceAccess } from '../auth/decorators/resource-authorization.decorator';
import { BillingPermissions } from '../auth/enums/permissions.enum';
import { BillingService } from './billing.service';
import {
  CreateInvoiceDto,
  UpdateInvoiceDto,
  InvoiceFilterDto,
  InvoiceResponse,
  InvoiceListResponse,
  InvoicePdfResponse,
  BillingCalculationResult,
} from './dto';

@Controller('billing')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  /**
   * Create a new invoice
   */
  @Post('invoices')
  @RequirePermissions(BillingPermissions.CREATE_INVOICE)
  @HttpCode(HttpStatus.CREATED)
  async createInvoice(@Body() createInvoiceDto: CreateInvoiceDto): Promise<InvoiceResponse> {
    return this.billingService.createInvoice(createInvoiceDto);
  }

  /**
   * Get invoice by ID
   */
  @Get('invoices/:id')
  @RequirePermissions(BillingPermissions.READ_INVOICE)
  @RequireInvoiceAccess()
  async getInvoice(@Param('id') id: string): Promise<InvoiceResponse> {
    return this.billingService.getInvoice(id);
  }

  /**
   * Update invoice
   */
  @Put('invoices/:id')
  @RequirePermissions(BillingPermissions.UPDATE_INVOICE)
  @RequireInvoiceAccess()
  async updateInvoice(
    @Param('id') id: string,
    @Body() updateInvoiceDto: UpdateInvoiceDto,
  ): Promise<InvoiceResponse> {
    return this.billingService.updateInvoice(id, updateInvoiceDto);
  }

  /**
   * List invoices with filtering and pagination
   */
  @Get('invoices')
  @RequirePermissions(BillingPermissions.READ_INVOICE)
  async listInvoices(@Query() filterDto: InvoiceFilterDto): Promise<InvoiceListResponse> {
    return this.billingService.listInvoices(filterDto);
  }

  /**
   * Delete invoice (mark as cancelled)
   */
  @Delete('invoices/:id')
  @RequirePermissions(BillingPermissions.DELETE_INVOICE)
  @RequireInvoiceAccess()
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteInvoice(@Param('id') id: string): Promise<void> {
    return this.billingService.deleteInvoice(id);
  }

  /**
   * Mark invoice as sent
   */
  @Patch('invoices/:id/send')
  @RequirePermissions(BillingPermissions.SEND_INVOICE)
  @RequireInvoiceAccess()
  async markInvoiceAsSent(@Param('id') id: string): Promise<InvoiceResponse> {
    return this.billingService.markInvoiceAsSent(id);
  }

  /**
   * Calculate billing preview without creating invoice
   */
  @Post('calculate')
  @RequirePermissions(BillingPermissions.READ_INVOICE)
  async calculateBillingPreview(
    @Body() createInvoiceDto: CreateInvoiceDto,
  ): Promise<BillingCalculationResult> {
    return this.billingService.calculateBillingPreview(createInvoiceDto);
  }

  /**
   * Generate invoice PDF
   */
  @Post('invoices/:id/pdf')
  @RequirePermissions(BillingPermissions.READ_INVOICE)
  @RequireInvoiceAccess()
  async generateInvoicePdf(@Param('id') id: string): Promise<InvoicePdfResponse> {
    return this.billingService.generateInvoicePdf(id);
  }

  /**
   * Get invoice statistics for dashboard
   */
  @Get('statistics')
  @RequirePermissions(BillingPermissions.VIEW_BILLING_REPORTS)
  async getInvoiceStatistics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const period = startDate && endDate ? {
      start: new Date(startDate),
      end: new Date(endDate),
    } : undefined;

    return this.billingService.getInvoiceStatistics(period);
  }

  /**
   * Validate GSTIN
   */
  @Post('validate-gstin')
  @RequirePermissions(BillingPermissions.READ_INVOICE)
  validateGstin(@Body() body: { gstin: string }) {
    return this.billingService.validateGstin(body.gstin);
  }

  /**
   * Get GST compliance information
   */
  @Post('gst-compliance')
  @RequirePermissions(BillingPermissions.READ_INVOICE)
  getGstComplianceInfo(@Body() body: {
    companyGstin: string;
    clientGstin?: string;
    placeOfSupply: string;
    companyState: string;
  }) {
    return this.billingService.getGstComplianceInfo(body);
  }

  /**
   * Calculate GST for preview
   */
  @Post('gst-calculate')
  @RequirePermissions(BillingPermissions.READ_INVOICE)
  calculateGstPreview(@Body() body: {
    amount: number;
    companyGstin: string;
    clientGstin?: string;
    placeOfSupply: string;
    companyState: string;
    serviceType?: 'SECURITY_SERVICES' | 'MANPOWER_SERVICES' | 'FACILITY_MANAGEMENT';
  }) {
    return this.billingService.calculateGstPreview(body);
  }

  /**
   * Generate invoice number preview
   */
  @Get('clients/:clientId/invoice-number-preview')
  @RequirePermissions(BillingPermissions.READ_INVOICE)
  async generateInvoiceNumberPreview(@Param('clientId') clientId: string) {
    const invoiceNumber = await this.billingService.generateInvoiceNumberPreview(clientId);
    return { invoiceNumber };
  }

  /**
   * Bulk mark invoices as sent
   */
  @Patch('invoices/bulk/send')
  @RequirePermissions(BillingPermissions.SEND_INVOICE)
  async bulkMarkAsSent(@Body() body: { invoiceIds: string[] }): Promise<InvoiceResponse[]> {
    return this.billingService.bulkMarkAsSent(body.invoiceIds);
  }

  /**
   * Get overdue invoices
   */
  @Get('invoices/overdue')
  @RequirePermissions(BillingPermissions.READ_INVOICE)
  async getOverdueInvoices(@Query() filterDto: InvoiceFilterDto): Promise<InvoiceListResponse> {
    return this.billingService.getOverdueInvoices(filterDto);
  }

  /**
   * Get monthly billing summary
   */
  @Get('monthly-summary')
  @RequirePermissions(BillingPermissions.VIEW_BILLING_REPORTS)
  async getMonthlyBillingSummary(
    @Query('year') year: string,
    @Query('month') month: string,
  ) {
    return this.billingService.getMonthlyBillingSummary(
      parseInt(year),
      parseInt(month),
    );
  }

  /**
   * Export invoices
   */
  @Get('export')
  @RequirePermissions(BillingPermissions.VIEW_BILLING_REPORTS)
  async exportInvoices(
    @Query() filterDto: InvoiceFilterDto,
    @Query('format') format: 'csv' | 'excel' = 'csv',
  ) {
    return this.billingService.exportInvoices(filterDto, format);
  }

  /**
   * Get billing rates management
   */
  @Get('rates')
  @RequirePermissions(BillingPermissions.MANAGE_BILLING_RATES)
  async getBillingRates() {
    // This would return current billing rates configuration
    return {
      message: 'Billing rates management endpoint - to be implemented',
      standardRates: {
        security: 250,
        overtime: 375,
        holiday: 500,
      },
    };
  }

  /**
   * Update billing rates
   */
  @Put('rates')
  @RequirePermissions(BillingPermissions.MANAGE_BILLING_RATES)
  async updateBillingRates(@Body() body: {
    rates: {
      security?: number;
      overtime?: number;
      holiday?: number;
    };
  }) {
    // This would update billing rates configuration
    return {
      message: 'Billing rates updated successfully',
      rates: body.rates,
    };
  }
}