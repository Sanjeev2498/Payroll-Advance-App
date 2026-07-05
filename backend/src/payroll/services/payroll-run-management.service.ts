import { 
  Injectable, 
  BadRequestException, 
  NotFoundException,
  Logger,
  ConflictException
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantContextService } from '../../common/tenant-context.service';
import { PayrollCalculationService } from './payroll-calculation.service';
import { PayrollValidationService } from './payroll-validation.service';
import { PayrollNotificationService } from './payroll-notification.service';
import { 
  PayrollRun, 
  PayrollStatus, 
  PayrollItem,
  Prisma 
} from '@prisma/client';
import { Decimal } from 'decimal.js';
import { 
  PayrollRunFilterDto,
  PayrollRunApprovalDto,
  PayrollBatchProcessingDto,
  PayrollRunCorrectionDto,
  PayrollExportDto,
  PayrollSummary,
  PayrollRunProcessingResult,
  PayrollProcessingError,
  PayrollRunWithDetails
} from '../dto';
import { getErrorMessage, getErrorStack, formatError } from '../../common/utils/error.util';


@Injectable()
export class PayrollRunManagementService {
  private readonly logger = new Logger(PayrollRunManagementService.name);

  constructor(
    private prisma: PrismaService,
    private tenantContext: TenantContextService,
    private payrollCalculationService: PayrollCalculationService,
    private payrollValidationService: PayrollValidationService,
    private payrollNotificationService: PayrollNotificationService,
  ) {}

  /**
   * Advanced payroll run creation with batch processing capabilities
   */
  async createPayrollRunBatch(dto: PayrollBatchProcessingDto): Promise<PayrollRunProcessingResult> {
    const companyId = this.tenantContext.getTenantId();
    
    this.logger.log(`Starting batch payroll processing for company ${companyId}`);
    
    // Validate input parameters
    await this.validatePayrollRunInput(dto, companyId);

    // If dry run, perform calculations without saving
    if (dto.dryRun) {
      return this.performDryRun(dto, companyId);
    }

    // Create payroll run with proper transaction handling
    return this.prisma.$transaction(async (tx) => {
      const payrollRun = await this.createPayrollRunRecord(dto, companyId, tx);
      
      try {
        const processingResult = await this.processPayrollBatch(
          payrollRun,
          dto,
          companyId,
          tx
        );

        // Update payroll run status based on processing result
        const finalStatus = processingResult.errors.length === 0 
          ? PayrollStatus.COMPLETED 
          : dto.skipErrors 
            ? PayrollStatus.COMPLETED 
            : PayrollStatus.PROCESSING;

        await tx.payrollRun.update({
          where: { id: payrollRun.id },
          data: { 
            status: finalStatus,
            totalAmount: processingResult.summary.totalNetAmount,
            processedAt: finalStatus === PayrollStatus.COMPLETED ? new Date() : null,
          },
        });

        // Send notifications if enabled
        if (dto.sendNotifications && finalStatus === PayrollStatus.COMPLETED) {
          await this.sendPayrollNotifications(payrollRun.id, processingResult.summary);
        }

        return {
          success: processingResult.errors.length === 0,
          payrollRunId: payrollRun.id,
          processedEmployees: processingResult.processedEmployees,
          errors: processingResult.errors,
          summary: processingResult.summary,
        };

      } catch (error) {
        // Mark payroll run as cancelled on error
        await tx.payrollRun.update({
          where: { id: payrollRun.id },
          data: { status: PayrollStatus.CANCELLED },
        });
        
        throw error;
      }
    }, {
      timeout: (dto.processingConfig?.timeoutMinutes || 30) * 60 * 1000, // Convert to milliseconds
    });
  }

  /**
   * Get payroll runs with advanced filtering and pagination
   */
  async getPayrollRuns(filter: PayrollRunFilterDto) {
    const companyId = this.tenantContext.getTenantId();
    const skip = ((filter.page || 1) - 1) * (filter.limit || 20);

    // Build where clause for filtering
    const whereClause: Prisma.PayrollRunWhereInput = {
      companyId,
    };

    if (filter.status) {
      whereClause.status = filter.status;
    }

    if (filter.runNumber) {
      whereClause.runNumber = {
        contains: filter.runNumber,
        mode: 'insensitive',
      };
    }

    if (filter.payPeriodFrom || filter.payPeriodTo) {
      whereClause.payPeriodStart = {};
      if (filter.payPeriodFrom) {
        whereClause.payPeriodStart.gte = new Date(filter.payPeriodFrom);
      }
      if (filter.payPeriodTo) {
        whereClause.payPeriodEnd = {
          lte: new Date(filter.payPeriodTo)
        };
      }
    }

    const [payrollRuns, total] = await Promise.all([
      this.prisma.payrollRun.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        skip,
        take: filter.limit || 20,
        include: {
          _count: {
            select: { payrollItems: true },
          },
        },
      }),
      this.prisma.payrollRun.count({
        where: whereClause,
      }),
    ]);

    return {
      data: payrollRuns,
      pagination: {
        page: filter.page || 1,
        limit: filter.limit || 20,
        total,
        pages: Math.ceil(total / (filter.limit || 20)),
      },
    };
  }

  /**
   * Approve or reject payroll run
   */
  async approvePayrollRun(payrollRunId: string, approval: PayrollRunApprovalDto) {
    const companyId = this.tenantContext.getTenantId();
    
    const payrollRun = await this.prisma.payrollRun.findFirst({
      where: { id: payrollRunId, companyId },
    });

    if (!payrollRun) {
      throw new NotFoundException(`Payroll run ${payrollRunId} not found`);
    }

    if (payrollRun.status !== PayrollStatus.COMPLETED) {
      throw new BadRequestException('Only completed payroll runs can be approved');
    }

    const newStatus = approval.action === 'approve' ? PayrollStatus.COMPLETED : PayrollStatus.DRAFT;

    // Update payroll run with approval status
    const updatedRun = await this.prisma.payrollRun.update({
      where: { id: payrollRunId },
      data: {
        status: newStatus,
        // In a full implementation, we'd add approval tracking fields
        updatedAt: new Date(),
      },
    });

    // Log approval action
    this.logger.log(`Payroll run ${payrollRunId} ${approval.action}d by user`);

    // In production, we'd store approval history
    // await this.createApprovalRecord(payrollRunId, approval);

    return {
      success: true,
      payrollRunId: payrollRunId,
      status: newStatus,
      action: approval.action,
    };
  }

  /**
   * Apply corrections to payroll run
   */
  async correctPayrollRun(payrollRunId: string, corrections: PayrollRunCorrectionDto) {
    const companyId = this.tenantContext.getTenantId();
    
    const payrollRun = await this.prisma.payrollRun.findFirst({
      where: { id: payrollRunId, companyId },
      include: {
        payrollItems: {
          include: {
            employee: true,
          },
        },
      },
    });

    if (!payrollRun) {
      throw new NotFoundException(`Payroll run ${payrollRunId} not found`);
    }

    if (payrollRun.status === PayrollStatus.PROCESSING) {
      throw new ConflictException('Cannot correct payroll run while it is being processed');
    }

    return this.prisma.$transaction(async (tx) => {
      let correctedAmount = new Decimal(0);
      const correctionResults = [];

      for (const correction of corrections.corrections) {
        const result = await this.applySingleCorrection(
          payrollRunId,
          correction,
          payrollRun,
          tx
        );
        
        correctionResults.push(result);
        correctedAmount = correctedAmount.add(result.adjustmentAmount);
      }

      // Update payroll run total if corrections were made
      if (correctedAmount.abs().gt(0)) {
        const newTotal = payrollRun.totalAmount.add(correctedAmount);
        await tx.payrollRun.update({
          where: { id: payrollRunId },
          data: { 
            totalAmount: newTotal,
            status: PayrollStatus.DRAFT, // Reset to draft after corrections
            updatedAt: new Date(),
          },
        });
      }

      return {
        success: true,
        payrollRunId: payrollRunId,
        correctionsApplied: correctionResults.length,
        totalAdjustment: correctedAmount,
        corrections: correctionResults,
      };
    });
  }

  /**
   * Export payroll run in various formats
   */
  async exportPayrollRun(payrollRunId: string, exportOptions: PayrollExportDto) {
    const companyId = this.tenantContext.getTenantId();
    
    const payrollRun = await this.prisma.payrollRun.findFirst({
      where: { id: payrollRunId, companyId },
      include: {
        payrollItems: {
          include: {
            employee: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                employeeNumber: true,
                email: true,
              },
            },
          },
          where: exportOptions.employeeIds ? {
            employeeId: { in: exportOptions.employeeIds }
          } : undefined,
        },
      },
    });

    if (!payrollRun) {
      throw new NotFoundException(`Payroll run ${payrollRunId} not found`);
    }

    // Generate export data based on format
    const exportData = await this.generateExportData(
      payrollRun as PayrollRunWithDetails,
      exportOptions
    );

    return {
      success: true,
      format: exportOptions.format,
      filename: `payroll_${payrollRun.runNumber}_${new Date().toISOString().split('T')[0]}`,
      data: exportData,
      recordCount: payrollRun.payrollItems.length,
    };
  }

  /**
   * Get comprehensive payroll run statistics
   */
  async getPayrollRunAnalytics(payrollRunId: string) {
    const companyId = this.tenantContext.getTenantId();
    
    const payrollRun = await this.prisma.payrollRun.findFirst({
      where: { id: payrollRunId, companyId },
      include: {
        payrollItems: {
          include: {
            employee: true,
          },
        },
      },
    });

    if (!payrollRun) {
      throw new NotFoundException(`Payroll run ${payrollRunId} not found`);
    }

    return this.calculatePayrollAnalytics(payrollRun as PayrollRunWithDetails);
  }

  // Private helper methods

  private async validatePayrollRunInput(dto: PayrollBatchProcessingDto, companyId: string) {
    const validationContext = {
      payPeriodStart: new Date(dto.payPeriodStart),
      payPeriodEnd: new Date(dto.payPeriodEnd),
      employeeIds: dto.employeeIds,
      companyId,
    };

    const validationResult = await this.payrollValidationService.validatePayrollRun(validationContext);
    
    if (!validationResult.isValid && !dto.skipErrors) {
      const errorMessages = validationResult.errors.map(error => getErrorMessage(error)).join('; ');
      throw new BadRequestException(`Payroll validation failed: ${errorMessages}`);
    }

    if (validationResult.warnings.length > 0) {
      this.logger.warn(`Payroll validation warnings: ${validationResult.warnings.map(w => w.message).join('; ')}`);
    }

    return validationResult;
  }

  private async performDryRun(dto: PayrollBatchProcessingDto, companyId: string): Promise<PayrollRunProcessingResult> {
    // Implement dry run logic - calculate without saving
    this.logger.log('Performing payroll dry run');
    
    // This would contain the actual dry run logic
    // For now, returning a mock result
    return {
      success: true,
      payrollRunId: 'dry-run',
      processedEmployees: 0,
      errors: [],
      summary: {
        payrollRunId: 'dry-run',
        employeeCount: 0,
        totalGrossAmount: new Decimal(0),
        totalDeductions: new Decimal(0),
        totalNetAmount: new Decimal(0),
        employeeResults: [],
      },
    };
  }

  private async createPayrollRunRecord(
    dto: PayrollBatchProcessingDto,
    companyId: string,
    tx: Prisma.TransactionClient
  ) {
    const runNumber = dto.runNumber || await this.generateRunNumber(companyId, new Date(dto.payPeriodStart));

    return tx.payrollRun.create({
      data: {
        companyId,
        runNumber,
        payPeriodStart: new Date(dto.payPeriodStart),
        payPeriodEnd: new Date(dto.payPeriodEnd),
        status: PayrollStatus.PROCESSING,
        totalAmount: new Decimal(0),
      },
    });
  }

  private async processPayrollBatch(
    payrollRun: PayrollRun,
    dto: PayrollBatchProcessingDto,
    companyId: string,
    tx: Prisma.TransactionClient
  ): Promise<{ processedEmployees: number; errors: PayrollProcessingError[]; summary: PayrollSummary }> {
    // This would contain the actual batch processing logic
    // For now, returning mock data
    return {
      processedEmployees: 0,
      errors: [],
      summary: {
        payrollRunId: payrollRun.id,
        employeeCount: 0,
        totalGrossAmount: new Decimal(0),
        totalDeductions: new Decimal(0),
        totalNetAmount: new Decimal(0),
        employeeResults: [],
      },
    };
  }

  private async sendPayrollNotifications(payrollRunId: string, summary: PayrollSummary) {
    this.logger.log(`Sending payroll notifications for run ${payrollRunId}`);
    
    try {
      await this.payrollNotificationService.sendPayrollCompletionNotifications(
        payrollRunId,
        summary
      );
    } catch (error) {
      this.logger.error(`Failed to send payroll notifications: ${getErrorMessage(error)}`, getErrorStack(error));
      // Don't throw - notifications shouldn't block payroll processing
    }
  }

  private async applySingleCorrection(
    payrollRunId: string,
    correction: any,
    payrollRun: any,
    tx: Prisma.TransactionClient
  ) {
    // Implementation would apply individual corrections
    return {
      employeeId: correction.employeeId,
      correctionType: correction.correctionType,
      adjustmentAmount: new Decimal(0),
      success: true,
    };
  }

  private async generateExportData(payrollRun: PayrollRunWithDetails, options: PayrollExportDto) {
    // Implementation would generate export data in the requested format
    return {
      payrollRun: payrollRun,
      format: options.format,
      generatedAt: new Date().toISOString(),
    };
  }

  private async calculatePayrollAnalytics(payrollRun: PayrollRunWithDetails) {
    const items = payrollRun.payrollItems;
    
    return {
      payrollRunId: payrollRun.id,
      runNumber: payrollRun.runNumber,
      payPeriod: {
        start: payrollRun.payPeriodStart,
        end: payrollRun.payPeriodEnd,
      },
      status: payrollRun.status,
      employeeCount: new Set(items.map(item => item.employeeId)).size,
      totalAmount: payrollRun.totalAmount,
      processedAt: payrollRun.processedAt,
      analytics: {
        totalGross: items
          .filter(item => ['BASIC_PAY', 'OVERTIME', 'BONUS', 'ALLOWANCE'].includes(item.itemType))
          .reduce((sum, item) => sum.add(item.amount), new Decimal(0)),
        totalDeductions: items
          .filter(item => item.itemType.includes('DEDUCTION') || item.itemType === 'TAX_DEDUCTION')
          .reduce((sum, item) => sum.add(item.amount.abs()), new Decimal(0)),
        averageSalary: items.length > 0 
          ? payrollRun.totalAmount.div(new Set(items.map(item => item.employeeId)).size)
          : new Decimal(0),
        itemBreakdown: this.calculateItemBreakdown(items),
      },
    };
  }

  private calculateItemBreakdown(items: PayrollItem[]) {
    const breakdown: Record<string, Decimal> = {};
    
    items.forEach(item => {
      if (!breakdown[item.itemType]) {
        breakdown[item.itemType] = new Decimal(0);
      }
      breakdown[item.itemType] = breakdown[item.itemType].add(item.amount);
    });

    return breakdown;
  }

  private async generateRunNumber(companyId: string, payPeriod: Date): Promise<string> {
    const year = payPeriod.getFullYear();
    const month = String(payPeriod.getMonth() + 1).padStart(2, '0');
    
    const count = await this.prisma.payrollRun.count({
      where: {
        companyId,
        runNumber: {
          startsWith: `PAY-${year}-${month}`,
        },
      },
    });

    const sequence = String(count + 1).padStart(3, '0');
    return `PAY-${year}-${month}-${sequence}`;
  }
}
