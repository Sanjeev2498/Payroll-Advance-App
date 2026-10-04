import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantContextService } from '../../common/tenant-context.service';
import { InvoiceCalculationService } from './invoice-calculation.service';
import { BillingValidationService } from './billing-validation.service';
import { Prisma, invoices, InvoiceStatus } from '@prisma/client';
import { Decimal } from 'decimal.js';
import { randomUUID } from 'crypto';
import {
  CreateInvoiceDto,
  UpdateInvoiceDto,
  InvoiceFilterDto,
  InvoiceResponse,
  InvoiceListResponse,
} from '../dto';

@Injectable()
export class InvoiceService {
  constructor(
    private prisma: PrismaService,
    private tenantContext: TenantContextService,
    private invoiceCalculationService: InvoiceCalculationService,
    private billingValidationService: BillingValidationService,
  ) {}

  /**
   * Create a new invoice
   */
  async createInvoice(createInvoiceDto: CreateInvoiceDto): Promise<InvoiceResponse> {
    // Validate GST details if provided
    if (createInvoiceDto.gstDetails) {
      await this.billingValidationService.validateGstDetails(createInvoiceDto.gstDetails);
    }

    // Get contract to extract client information
    const contract = await this.prisma.contracts.findFirst({
      where: { id: createInvoiceDto.contractId },
      include: { clients: true }
    });
    
    if (!contract) {
      throw new NotFoundException('Contract not found');
    }

    // Validate billing period
    await this.billingValidationService.validateBillingPeriod(
      contract.clients.id,
      new Date(createInvoiceDto.billingPeriodStart),
      new Date(createInvoiceDto.billingPeriodEnd),
    );

    // Calculate billing amounts
    const billingResult = await this.invoiceCalculationService.calculateClientBilling(createInvoiceDto);

    // Generate invoice number if not provided - FIXED: Use contractId
    const companyId = this.tenantContext.getTenantId();
    const invoiceNumber = createInvoiceDto.invoiceNumber || 
      await this.invoiceCalculationService.generateInvoiceNumber(companyId, createInvoiceDto.contractId);

    // Prepare due date
    const dueDate = createInvoiceDto.dueDate 
      ? new Date(createInvoiceDto.dueDate)
      : this.calculateDefaultDueDate(new Date());

    // Use the contract we already retrieved above (no need for duplicate lookup)

    if (!contract) {
      throw new NotFoundException('Contract not found');
    }

    // Create invoice
    const invoiceData: Prisma.invoicesCreateInput = {
      id: randomUUID(),
      clients: {
        connect: { id: contract.client_id },
      },
      invoice_number: invoiceNumber,
      billing_period_start: new Date(createInvoiceDto.billingPeriodStart),
      billing_period_end: new Date(createInvoiceDto.billingPeriodEnd),
      subtotal: billingResult.summary.subtotal,
      tax_amount: billingResult.summary.gstAmount,
      total_amount: billingResult.summary.totalAmount,
      status: InvoiceStatus.DRAFT,
      due_date: dueDate,
      updated_at: new Date(),
    } as Prisma.invoicesCreateInput;

    const invoice = await this.prisma.invoices.create({
      data: invoiceData,
      include: {
        clients: {
          select: {
            id: true,
            name: true,
            contact_email: true,
            contact_info: true,
          },
        },
      },
    });

    // Store additional invoice metadata (GST details, deployment summary, etc.)
    await this.storeInvoiceMetadata(invoice.id, {
      gstDetails: createInvoiceDto.gstDetails,
      gstBreakdown: billingResult.gstBreakdown,
      deploymentSummary: {
        totalHours: billingResult.summary.totalHours,
        totalSites: billingResult.siteDeployments.length,
        totalEmployees: billingResult.siteDeployments.reduce(
          (count, site) => count + site.deployments.length,
          0,
        ),
        siteBreakdown: billingResult.siteDeployments,
      },
      additionalCharges: createInvoiceDto.additionalCharges,
      notes: createInvoiceDto.notes,
    });

    return this.mapToInvoiceResponse(invoice, {
      gstBreakdown: billingResult.gstBreakdown,
      deploymentSummary: billingResult.siteDeployments,
      additionalCharges: createInvoiceDto.additionalCharges,
      notes: createInvoiceDto.notes,
    }, createInvoiceDto.contractId);
  }

  /**
   * Get invoice by ID
   */
  async getInvoice(id: string): Promise<InvoiceResponse> {
    const invoice = await this.findInvoiceById(id);
    const metadata = await this.getInvoiceMetadata(id);
    
    return this.mapToInvoiceResponse(invoice, metadata);
  }

  /**
   * Update invoice
   */
  async updateInvoice(id: string, updateInvoiceDto: UpdateInvoiceDto): Promise<InvoiceResponse> {
    const invoice = await this.findInvoiceById(id);

    // Validate status transitions
    if (updateInvoiceDto.status && invoice.status !== updateInvoiceDto.status) {
      await this.billingValidationService.validateStatusTransition(invoice.status, updateInvoiceDto.status);
    }

    // Prepare update data
    const updateData: Prisma.invoicesUpdateInput = {};
    
    if (updateInvoiceDto.status !== undefined) {
      updateData.status = updateInvoiceDto.status;
      
      // Set paidAt timestamp when status changes to PAID
      if (updateInvoiceDto.status === InvoiceStatus.PAID && !updateInvoiceDto.paidAt) {
        updateData.paid_at = new Date();
      } else if (updateInvoiceDto.paidAt) {
        updateData.paid_at = new Date(updateInvoiceDto.paidAt);
      }
    }

    if (updateInvoiceDto.dueDate !== undefined) {
      updateData.due_date = new Date(updateInvoiceDto.dueDate);
    }

    // Update invoice
    const updatedInvoice = await this.prisma.invoices.update({
      where: { id },
      data: updateData,
      include: {
        clients: {
          select: {
            id: true,
            name: true,
            contact_email: true,
            contact_info: true,
          },
        },
      },
    });

    // Update metadata if provided
    if (Object.keys(updateInvoiceDto).some(key => !['status', 'paidAt', 'dueDate'].includes(key))) {
      await this.updateInvoiceMetadata(id, {
        paymentReference: updateInvoiceDto.paymentReference,
        cancelReason: updateInvoiceDto.cancelReason,
        notes: updateInvoiceDto.notes,
      });
    }

    const metadata = await this.getInvoiceMetadata(id);
    return this.mapToInvoiceResponse(updatedInvoice, metadata);
  }

  /**
   * List invoices with filtering and pagination
   */
  async listInvoices(filterDto: InvoiceFilterDto): Promise<InvoiceListResponse> {
    const companyId = this.tenantContext.getTenantId();
    const { page = 1, limit = 20, sortBy = 'created_at', sortOrder = 'desc' } = filterDto;
    const skip = (page - 1) * limit;

    // Build where clause
    const whereClause = this.buildInvoiceWhereClause(companyId, filterDto);

    // Execute queries
    const [invoices, total, summary] = await Promise.all([
      this.prisma.invoices.findMany({
        where: whereClause,
        include: {
          clients: {
            select: {
              id: true,
              name: true,
              contact_email: true,
              contact_info: true,
            },
          },
        },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      this.prisma.invoices.count({ where: whereClause }),
      this.calculateInvoiceSummary(whereClause),
    ]);

    // Map invoices to response format
    const invoiceResponses = await Promise.all(
      invoices.map(async (invoice) => {
        const metadata = await this.getInvoiceMetadata(invoice.id);
        return this.mapToInvoiceResponse(invoice, metadata);
      }),
    );

    return {
      data: invoiceResponses,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      summary,
    };
  }

  /**
   * Delete invoice (soft delete by marking as cancelled)
   */
  async deleteInvoice(id: string): Promise<void> {
    const invoice = await this.findInvoiceById(id);

    if (invoice.status === InvoiceStatus.PAID) {
      throw new BadRequestException('Cannot delete paid invoice');
    }

    await this.prisma.invoices.update({
      where: { id },
      data: { status: InvoiceStatus.CANCELLED },
    });
  }

  /**
   * Mark invoice as sent
   */
  async markInvoiceAsSent(id: string): Promise<InvoiceResponse> {
    const invoice = await this.findInvoiceById(id);

    if (invoice.status !== InvoiceStatus.DRAFT) {
      throw new BadRequestException('Only draft invoices can be marked as sent');
    }

    const updatedInvoice = await this.prisma.invoices.update({
      where: { id },
      data: { status: InvoiceStatus.SENT },
      include: {
        clients: {
          select: {
            id: true,
            name: true,
            contact_email: true,
            contact_info: true,
          },
        },
      },
    });

    const metadata = await this.getInvoiceMetadata(id);
    return this.mapToInvoiceResponse(updatedInvoice, metadata);
  }

  /**
   * Get invoice statistics for dashboard
   */
  async getInvoiceStatistics(period?: { start: Date; end: Date }) {
    const companyId = this.tenantContext.getTenantId();
    
    let whereClause: Prisma.invoicesWhereInput = {
      clients: { 
        company_id: companyId 
      },
    };

    if (period) {
      whereClause.created_at = {
        gte: period.start,
        lte: period.end,
      };
    }

    const [statusCounts, amounts] = await Promise.all([
      this.prisma.invoices.groupBy({
        by: ['status'],
        where: whereClause,
        _count: { status: true },
        _sum: { totalAmount: true },
      }),
      this.prisma.invoices.aggregate({
        where: whereClause,
        _sum: { totalAmount: true },
        _count: { id: true },
      }),
    ]);

    const statusBreakdown = statusCounts.reduce((acc, item) => {
      acc[item.status] = {
        count: item._count.status,
        amount: item._sum.totalAmount || new Decimal(0),
      };
      return acc;
    }, {} as Record<InvoiceStatus, { count: number; amount: Decimal }>);

    return {
      totalInvoices: amounts._count.id,
      totalAmount: amounts._sum.totalAmount || new Decimal(0),
      statusBreakdown,
      overdueCount: await this.getOverdueInvoicesCount(companyId),
    };
  }

  // Private helper methods

  private async findInvoiceById(id: string) {
    const companyId = this.tenantContext.getTenantId();
    
    const invoice = await this.prisma.invoices.findFirst({
      where: {
        id,
        clients: { 
          company_id: companyId,
        },
      },
      include: {
        clients: {
          select: {
            id: true,
            name: true,
            contact_email: true,
            contact_info: true,
          },
        },
      },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    return invoice;
  }

  private buildInvoiceWhereClause(companyId: string, filterDto: InvoiceFilterDto): Prisma.invoicesWhereInput {
    const whereClause: Prisma.invoicesWhereInput = {
      clients: { 
        company_id: companyId 
      },
    };

    if (filterDto.clientId) {
      whereClause.client_id = filterDto.clientId;
    }

    if (filterDto.status) {
      whereClause.status = filterDto.status;
    }

    if (filterDto.invoiceNumber) {
      whereClause.invoice_number = {
        contains: filterDto.invoiceNumber,
        mode: 'insensitive',
      };
    }

    if (filterDto.billingPeriodStart || filterDto.billingPeriodEnd) {
      whereClause.billing_period_start = {};
      if (filterDto.billingPeriodStart) {
        whereClause.billing_period_start.gte = new Date(filterDto.billingPeriodStart);
      }
      if (filterDto.billingPeriodEnd) {
        whereClause.billing_period_start.lte = new Date(filterDto.billingPeriodEnd);
      }
    }

    if (filterDto.dueDateStart || filterDto.dueDateEnd) {
      whereClause.due_date = {};
      if (filterDto.dueDateStart) {
        whereClause.due_date.gte = new Date(filterDto.dueDateStart);
      }
      if (filterDto.dueDateEnd) {
        whereClause.due_date.lte = new Date(filterDto.dueDateEnd);
      }
    }

    return whereClause;
  }

  private async calculateInvoiceSummary(whereClause: Prisma.invoicesWhereInput) {
    const statusGroups = await this.prisma.invoices.groupBy({
      by: ['status'],
      where: whereClause,
      _count: { status: true },
      _sum: { total_amount: true },
    });

    const statusBreakdown = statusGroups.reduce((acc, group) => {
      acc[group.status] = group._count.status;
      return acc;
    }, {} as Record<InvoiceStatus, number>);

    const paidAmount = statusGroups
      .filter(group => group.status === InvoiceStatus.PAID)
      .reduce((sum, group) => sum + (group._sum.total_amount?.toNumber() || 0), 0);

    const pendingAmount = statusGroups
      .filter(group => [InvoiceStatus.DRAFT, InvoiceStatus.SENT].includes(group.status))
      .reduce((sum, group) => sum + (group._sum.total_amount?.toNumber() || 0), 0);

    const overdueAmount = await this.getOverdueAmount(whereClause);

    return {
      totalInvoices: statusGroups.reduce((sum, group) => sum + group._count.status, 0),
      totalAmount: statusGroups.reduce((sum, group) => sum + (group._sum.total_amount?.toNumber() || 0), 0),
      paidAmount,
      pendingAmount,
      overdueAmount,
      statusBreakdown,
    };
  }

  private async getOverdueInvoicesCount(companyId: string): Promise<number> {
    return this.prisma.invoices.count({
      where: {
        contracts: { 
          clients: { company_id: companyId },
        },
        status: { in: [InvoiceStatus.SENT] },
        due_date: { lt: new Date() },
      },
    });
  }

  private async getOverdueAmount(baseWhereClause: Prisma.invoicesWhereInput): Promise<number> {
    const result = await this.prisma.invoices.aggregate({
      where: {
        ...baseWhereClause,
        status: { in: [InvoiceStatus.SENT] },
        due_date: { lt: new Date() },
      },
      _sum: { total_amount: true },
    });

    return result._sum.total_amount?.toNumber() || 0;
  }

  private calculateDefaultDueDate(invoiceDate: Date): Date {
    // Default to 30 days from invoice date
    const dueDate = new Date(invoiceDate);
    dueDate.setDate(dueDate.getDate() + 30);
    return dueDate;
  }

  private mapToInvoiceResponse(invoice: any, metadata?: any, contractId?: string): InvoiceResponse {
    return {
      id: invoice.id,
      contractId: contractId || invoice.contractId,
      clientId: invoice.clients?.id || invoice.client_id,
      client: invoice.clients,
      invoiceNumber: invoice.invoice_number,
      billingPeriodStart: invoice.billing_period_start.toISOString(),
      billingPeriodEnd: invoice.billing_period_end.toISOString(),
      subtotal: invoice.subtotal.toNumber(),
      taxAmount: invoice.tax_amount.toNumber(),
      totalAmount: invoice.total_amount.toNumber(),
      status: invoice.status,
      dueDate: invoice.due_date.toISOString(),
      paidAt: invoice.paid_at?.toISOString(),
      createdAt: invoice.created_at.toISOString(),
      updatedAt: invoice.updated_at.toISOString(),
      gstDetails: metadata?.gstBreakdown ? this.convertGstDetailsToNumbers(metadata.gstBreakdown) : undefined,
      deploymentSummary: metadata?.deploymentSummary,
      additionalCharges: metadata?.additionalCharges,
      notes: metadata?.notes,
    };
  }

  // Metadata storage methods (could be implemented using separate table or JSON fields)
  private async storeInvoiceMetadata(invoiceId: string, metadata: any): Promise<void> {
    // For now, we'll store in a JSON field or separate table
    // This could be implemented as a separate InvoiceMetadata table
    // For simplicity, storing in memory or file system
  }

  private async getInvoiceMetadata(invoiceId: string): Promise<any> {
    // Retrieve stored metadata
    return {};
  }

  private async updateInvoiceMetadata(invoiceId: string, metadata: any): Promise<void> {
    // Update stored metadata
  }

  private convertGstDetailsToNumbers(gstDetails: any): any {
    if (!gstDetails) return undefined;
    
    return {
      ...gstDetails,
      taxableAmount: gstDetails.taxableAmount?.toNumber?.() ?? gstDetails.taxableAmount,
      cgst: gstDetails.cgst?.toNumber?.() ?? gstDetails.cgst,
      sgst: gstDetails.sgst?.toNumber?.() ?? gstDetails.sgst,
      igst: gstDetails.igst?.toNumber?.() ?? gstDetails.igst,
      utgst: gstDetails.utgst?.toNumber?.() ?? gstDetails.utgst,
      totalGst: gstDetails.totalGst?.toNumber?.() ?? gstDetails.totalGst,
      totalAmount: gstDetails.totalAmount?.toNumber?.() ?? gstDetails.totalAmount,
    };
  }
}
