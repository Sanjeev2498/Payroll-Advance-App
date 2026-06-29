import { Injectable, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantContextService } from '../../common/tenant-context.service';
import { GstCalculationService } from './gst-calculation.service';
import { InvoiceStatus } from '@prisma/client';

@Injectable()
export class BillingValidationService {
  constructor(
    private prisma: PrismaService,
    private tenantContext: TenantContextService,
    private gstCalculationService: GstCalculationService,
  ) {}

  /**
   * Validate GST details for invoice
   */
  async validateGstDetails(gstDetails: {
    companyGstin: string;
    clientGstin?: string;
    placeOfSupply: string;
    isInterState?: boolean;
  }): Promise<void> {
    // Validate company GSTIN
    const companyGstinValidation = this.gstCalculationService.validateGstin(gstDetails.companyGstin);
    if (!companyGstinValidation.isValid) {
      throw new BadRequestException(`Invalid company GSTIN: ${companyGstinValidation.error}`);
    }

    // Validate client GSTIN if provided
    if (gstDetails.clientGstin) {
      const clientGstinValidation = this.gstCalculationService.validateGstin(gstDetails.clientGstin);
      if (!clientGstinValidation.isValid) {
        throw new BadRequestException(`Invalid client GSTIN: ${clientGstinValidation.error}`);
      }
    }

    // Validate place of supply
    if (!this.isValidStateCode(gstDetails.placeOfSupply)) {
      throw new BadRequestException('Invalid place of supply state code');
    }

    // Validate inter-state flag consistency
    if (gstDetails.isInterState !== undefined) {
      const companyState = gstDetails.companyGstin.substring(0, 2);
      const actuallyInterState = companyState !== gstDetails.placeOfSupply;
      
      if (gstDetails.isInterState !== actuallyInterState) {
        throw new BadRequestException(
          `Inter-state flag inconsistent: Company state ${companyState}, Supply state ${gstDetails.placeOfSupply}`
        );
      }
    }
  }

  /**
   * Validate billing period for overlaps and business rules
   */
  async validateBillingPeriod(
    clientId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<void> {
    // Check date range validity
    if (startDate >= endDate) {
      throw new BadRequestException('Billing period start date must be before end date');
    }

    // Check if period is not too far in the future
    const now = new Date();
    const maxFutureDate = new Date();
    maxFutureDate.setMonth(maxFutureDate.getMonth() + 1); // 1 month in future

    if (startDate > maxFutureDate) {
      throw new BadRequestException('Billing period cannot be more than 1 month in the future');
    }

    // Check if period is not too far in the past
    const maxPastDate = new Date();
    maxPastDate.setFullYear(maxPastDate.getFullYear() - 1); // 1 year in past

    if (endDate < maxPastDate) {
      throw new BadRequestException('Billing period cannot be more than 1 year in the past');
    }

    // Check for overlapping invoices
    await this.validateNoBillingOverlap(clientId, startDate, endDate);

    // Validate that there is actual deployment data for the period
    await this.validateDeploymentDataExists(clientId, startDate, endDate);
  }

  /**
   * Validate no overlapping billing periods exist
   */
  private async validateNoBillingOverlap(
    clientId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<void> {
    const existingInvoice = await this.prisma.invoice.findFirst({
      where: {
        clientId,
        status: { not: InvoiceStatus.CANCELLED },
        OR: [
          {
            billingPeriodStart: { lte: endDate },
            billingPeriodEnd: { gte: startDate },
          },
        ],
      },
    });

    if (existingInvoice) {
      throw new ConflictException(
        `Billing period overlaps with existing invoice ${existingInvoice.invoiceNumber}`
      );
    }
  }

  /**
   * Validate that deployment data exists for the billing period
   */
  private async validateDeploymentDataExists(
    clientId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<void> {
    const companyId = this.tenantContext.getTenantId();
    
    const deploymentCount = await this.prisma.attendance.count({
      where: {
        employee: { companyId },
        shift: {
          site: { clientId },
          shiftDate: {
            gte: startDate,
            lte: endDate,
          },
        },
        status: 'PRESENT',
        clockIn: { not: null },
        clockOut: { not: null },
      },
    });

    if (deploymentCount === 0) {
      throw new BadRequestException(
        'No deployment data found for the specified billing period'
      );
    }
  }

  /**
   * Validate invoice status transitions
   */
  async validateStatusTransition(
    currentStatus: InvoiceStatus,
    newStatus: InvoiceStatus,
  ): Promise<void> {
    const allowedTransitions: Record<InvoiceStatus, InvoiceStatus[]> = {
      [InvoiceStatus.DRAFT]: [InvoiceStatus.SENT, InvoiceStatus.CANCELLED],
      [InvoiceStatus.SENT]: [InvoiceStatus.PAID, InvoiceStatus.OVERDUE, InvoiceStatus.CANCELLED],
      [InvoiceStatus.PAID]: [], // Cannot transition from PAID
      [InvoiceStatus.OVERDUE]: [InvoiceStatus.PAID, InvoiceStatus.CANCELLED],
      [InvoiceStatus.CANCELLED]: [], // Cannot transition from CANCELLED
    };

    if (!allowedTransitions[currentStatus]?.includes(newStatus)) {
      throw new BadRequestException(
        `Invalid status transition from ${currentStatus} to ${newStatus}`
      );
    }
  }

  /**
   * Validate billing rates and amounts
   */
  validateBillingRates(rates: {
    hourlyRate?: number;
    overtimeRate?: number;
    holidayRate?: number;
  }): void {
    const { hourlyRate, overtimeRate, holidayRate } = rates;

    if (hourlyRate !== undefined && hourlyRate <= 0) {
      throw new BadRequestException('Hourly rate must be positive');
    }

    if (overtimeRate !== undefined && overtimeRate <= 0) {
      throw new BadRequestException('Overtime rate must be positive');
    }

    if (holidayRate !== undefined && holidayRate <= 0) {
      throw new BadRequestException('Holiday rate must be positive');
    }

    // Validate overtime rate is typically higher than regular rate
    if (hourlyRate && overtimeRate && overtimeRate < hourlyRate) {
      throw new BadRequestException('Overtime rate should be higher than regular hourly rate');
    }

    // Validate holiday rate is typically highest
    if (hourlyRate && holidayRate && holidayRate < hourlyRate) {
      throw new BadRequestException('Holiday rate should be higher than regular hourly rate');
    }
  }

  /**
   * Validate additional charges
   */
  validateAdditionalCharges(charges: {
    name: string;
    amount: number;
    taxable: boolean;
  }[]): void {
    for (const charge of charges) {
      if (!charge.name?.trim()) {
        throw new BadRequestException('Additional charge name is required');
      }

      if (charge.amount < 0) {
        throw new BadRequestException('Additional charge amount cannot be negative');
      }

      if (typeof charge.taxable !== 'boolean') {
        throw new BadRequestException('Additional charge taxable flag must be boolean');
      }
    }
  }

  /**
   * Validate client billing permissions
   */
  async validateClientBillingPermissions(clientId: string): Promise<void> {
    const companyId = this.tenantContext.getTenantId();
    
    const client = await this.prisma.client.findFirst({
      where: {
        id: clientId,
        companyId,
      },
    });

    if (!client) {
      throw new BadRequestException('Client not found');
    }

    if (client.contractStatus !== 'ACTIVE') {
      throw new BadRequestException('Cannot create invoice for inactive client contract');
    }

    // Check if contract has expired
    if (client.contractEnd && client.contractEnd < new Date()) {
      throw new BadRequestException('Client contract has expired');
    }
  }

  /**
   * Validate invoice number uniqueness
   */
  async validateInvoiceNumberUniqueness(invoiceNumber: string): Promise<void> {
    const existingInvoice = await this.prisma.invoice.findFirst({
      where: { invoiceNumber },
    });

    if (existingInvoice) {
      throw new ConflictException(`Invoice number ${invoiceNumber} already exists`);
    }
  }

  /**
   * Validate due date
   */
  validateDueDate(dueDate: Date): void {
    const now = new Date();
    now.setHours(0, 0, 0, 0); // Start of today

    if (dueDate < now) {
      throw new BadRequestException('Due date cannot be in the past');
    }

    // Check if due date is reasonable (not more than 1 year in future)
    const maxDueDate = new Date();
    maxDueDate.setFullYear(maxDueDate.getFullYear() + 1);

    if (dueDate > maxDueDate) {
      throw new BadRequestException('Due date cannot be more than 1 year in the future');
    }
  }

  /**
   * Validate monthly billing limits (if applicable)
   */
  async validateMonthlyBillingLimits(
    clientId: string,
    newInvoiceAmount: number,
  ): Promise<void> {
    // This could implement business rules around monthly billing limits
    // For example, if a client has a maximum monthly billing amount
    
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const monthlyTotal = await this.prisma.invoice.aggregate({
      where: {
        clientId,
        status: { not: InvoiceStatus.CANCELLED },
        createdAt: {
          gte: monthStart,
          lte: monthEnd,
        },
      },
      _sum: {
        totalAmount: true,
      },
    });

    const currentMonthlyTotal = monthlyTotal._sum.totalAmount?.toNumber() || 0;
    
    // Example business rule: No client should have more than ₹10,00,000 per month
    const maxMonthlyAmount = 1000000; // ₹10 lakhs
    
    if (currentMonthlyTotal + newInvoiceAmount > maxMonthlyAmount) {
      throw new BadRequestException(
        `Monthly billing limit exceeded. Current: ₹${currentMonthlyTotal.toLocaleString('en-IN')}, ` +
        `New invoice: ₹${newInvoiceAmount.toLocaleString('en-IN')}, ` +
        `Limit: ₹${maxMonthlyAmount.toLocaleString('en-IN')}`
      );
    }
  }

  /**
   * Check if state code is valid
   */
  private isValidStateCode(stateCode: string): boolean {
    const validStateCodes = [
      '01', '02', '03', '04', '05', '06', '07', '08', '09', '10',
      '11', '12', '13', '14', '15', '16', '17', '18', '19', '20',
      '21', '22', '23', '24', '25', '26', '27', '29', '30', '31',
      '32', '33', '34', '35', '36', '37', '38'
    ];
    
    return validStateCodes.includes(stateCode);
  }
}