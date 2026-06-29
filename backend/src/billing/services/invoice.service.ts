import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantContextService } from '../../common/tenant-context.service';
import { InvoiceCalculationService } from './invoice-calculation.service';
import { BillingValidationService } from './billing-validation.service';
import { Prisma, Invoice, InvoiceStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
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

    // Validate billing period
    await this.billingValidationService.validateBillingPeriod(
      createInvoiceDto.clientId,
      new Date(createInvoiceDto.billingPeriodStart),
      new Date(createInvoiceDto.billingPeriodEnd),
    );

    // Calculate billing amounts
    const billingResult = await this.invoiceCalculationService.calculateClientBilling(createInvoiceDto);

    // Generate invoice number if not provided
    const companyId = this.tenantContext.getTenantId();
    const invoiceNumber = createInvoiceDto.invoiceNumber || 
      await this.invoiceCalculationService.generateInvoiceNumber(companyId, createInvoiceDto.clientId);

    // Prepare due date
    const dueDate = createInvoiceDto.dueDate 
      ? new Date(createInvoiceDto.dueDate)
      : this.calculateDefaultDueDate(new Date());

    // Create invoice
    const invoiceData: Prisma.InvoiceCreateInput = {
      client: {
        connect: { id: createInvoiceDto.clientId },
      },
      invoiceNumber,
      billingPeriodStart: new Date(createInvoiceDto.billingPeriodStart),
      billingPeriodEnd: new Date(createInvoiceDto.billingPeriodEnd),
      subtotal: billingResult.summary.subtotal,
      taxAmount: billingResult.summary.gstAmount,
      totalAmount: billingResult.summary.totalAmount,
      status: InvoiceStatus.DRAFT,
      dueDate,
    };

    const invoice = await this.prisma.invoice.create({
      data: invoiceData,
      include: {
        client: {
          select: {
            id: true,
            name: true,
            contactEmail: true,
            contactInfo: true,
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
    });
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
    const updateData: Prisma.InvoiceUpdateInput = {};
    
    if (updateInvoiceDto.status !== undefined) {
      updateData.status = updateInvoiceDto.status;
      
      // Set paidAt timestamp when status changes to PAID
      if (updateInvoiceDto.status === InvoiceStatus.PAID && !updateInvoiceDto.paidAt) {
        updateData.paidAt = new Date();
      } else if (updateInvoiceDto.paidAt) {
        updateData.paidAt = new Date(updateInvoiceDto.paidAt);
      }
    }

    if (updateInvoiceDto.dueDate !== undefined) {
      updateData.dueDate = new Date(updateInvoiceDto.dueDate);
    }

    // Update invoice
    const updatedInvoice = await this.prisma.invoice.update({
      where: { id },
      data: updateData,
      include: {
        client: {
          select: {
            id: true,
            name: true,
            contactEmail: true,
            contactInfo: true,
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
    const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = filterDto;
    const skip = (page - 1) * limit;

    // Build where clause
    const whereClause = this.buildInvoiceWhereClause(companyId, filterDto);

    // Execute queries
    const [invoices, total, summary] = await Promise.all([
      this.prisma.invoice.findMany({
        where: whereClause,
        include: {
          client: {
            select: {
              id: true,
              name: true,
              contactEmail: true,
              contactInfo: true,
            },
          },
        },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      this.prisma.invoice.count({ where: whereClause }),
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

    await this.prisma.invoice.update({
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

    const updatedInvoice = await this.prisma.invoice.update({
      where: { id },
      data: { status: InvoiceStatus.SENT },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            contactEmail: true,
            contactInfo: true,
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
    
    let whereClause: Prisma.InvoiceWhereInput = {
      client: { companyId },
    };

    if (period) {
      whereClause.createdAt = {
        gte: period.start,
        lte: period.end,
      };
    }

    const [statusCounts, amounts] = await Promise.all([
      this.prisma.invoice.groupBy({
        by: ['status'],
        where: whereClause,
        _count: { status: true },
        _sum: { totalAmount: true },
      }),
      this.prisma.invoice.aggregate({
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
    
    const invoice = await this.prisma.invoice.findFirst({
      where: {
        id,
        client: { companyId },
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            contactEmail: true,
            contactInfo: true,
          },
        },
      },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    return invoice;
  }

  private buildInvoiceWhereClause(companyId: string, filterDto: InvoiceFilterDto): Prisma.InvoiceWhereInput {
    const whereClause: Prisma.InvoiceWhereInput = {
      client: { companyId },
    };

    if (filterDto.clientId) {
      whereClause.clientId = filterDto.clientId;
    }

    if (filterDto.status) {
      whereClause.status = filterDto.status;
    }

    if (filterDto.invoiceNumber) {
      whereClause.invoiceNumber = {
        contains: filterDto.invoiceNumber,
        mode: 'insensitive',
      };
    }

    if (filterDto.billingPeriodStart || filterDto.billingPeriodEnd) {
      whereClause.billingPeriodStart = {};
      if (filterDto.billingPeriodStart) {
        whereClause.billingPeriodStart.gte = new Date(filterDto.billingPeriodStart);
      }
      if (filterDto.billingPeriodEnd) {
        whereClause.billingPeriodStart.lte = new Date(filterDto.billingPeriodEnd);
      }
    }

    if (filterDto.dueDateStart || filterDto.dueDateEnd) {
      whereClause.dueDate = {};
      if (filterDto.dueDateStart) {
        whereClause.dueDate.gte = new Date(filterDto.dueDateStart);
      }
      if (filterDto.dueDateEnd) {
        whereClause.dueDate.lte = new Date(filterDto.dueDateEnd);
      }
    }

    return whereClause;
  }

  private async calculateInvoiceSummary(whereClause: Prisma.InvoiceWhereInput) {
    const statusGroups = await this.prisma.invoice.groupBy({
      by: ['status'],
      where: whereClause,
      _count: { status: true },
      _sum: { totalAmount: true },
    });

    const statusBreakdown = statusGroups.reduce((acc, group) => {
      acc[group.status] = group._count.status;
      return acc;
    }, {} as Record<InvoiceStatus, number>);

    const paidAmount = statusGroups
      .filter(group => group.status === InvoiceStatus.PAID)
      .reduce((sum, group) => sum + (group._sum.totalAmount?.toNumber() || 0), 0);

    const pendingAmount = statusGroups
      .filter(group => [InvoiceStatus.DRAFT, InvoiceStatus.SENT].includes(group.status))
      .reduce((sum, group) => sum + (group._sum.totalAmount?.toNumber() || 0), 0);

    const overdueAmount = await this.getOverdueAmount(whereClause);

    return {
      totalInvoices: statusGroups.reduce((sum, group) => sum + group._count.status, 0),
      totalAmount: statusGroups.reduce((sum, group) => sum + (group._sum.totalAmount?.toNumber() || 0), 0),
      paidAmount,
      pendingAmount,
      overdueAmount,
      statusBreakdown,
    };
  }

  private async getOverdueInvoicesCount(companyId: string): Promise<number> {
    return this.prisma.invoice.count({
      where: {
        client: { companyId },
        status: { in: [InvoiceStatus.SENT] },
        dueDate: { lt: new Date() },
      },
    });
  }

  private async getOverdueAmount(baseWhereClause: Prisma.InvoiceWhereInput): Promise<number> {
    const result = await this.prisma.invoice.aggregate({
      where: {
        ...baseWhereClause,
        status: { in: [InvoiceStatus.SENT] },
        dueDate: { lt: new Date() },
      },
      _sum: { totalAmount: true },
    });

    return result._sum.totalAmount?.toNumber() || 0;
  }

  private calculateDefaultDueDate(invoiceDate: Date): Date {
    // Default to 30 days from invoice date
    const dueDate = new Date(invoiceDate);
    dueDate.setDate(dueDate.getDate() + 30);
    return dueDate;
  }

  private mapToInvoiceResponse(invoice: any, metadata?: any): InvoiceResponse {
    return {
      id: invoice.id,
      clientId: invoice.clientId,
      client: invoice.client,
      invoiceNumber: invoice.invoiceNumber,
      billingPeriodStart: invoice.billingPeriodStart.toISOString(),
      billingPeriodEnd: invoice.billingPeriodEnd.toISOString(),
      subtotal: invoice.subtotal.toNumber(),
      taxAmount: invoice.taxAmount.toNumber(),
      totalAmount: invoice.totalAmount.toNumber(),
      status: invoice.status,
      dueDate: invoice.dueDate.toISOString(),
      paidAt: invoice.paidAt?.toISOString(),
      createdAt: invoice.createdAt.toISOString(),
      updatedAt: invoice.updatedAt.toISOString(),
      gstDetails: metadata?.gstBreakdown,
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
}