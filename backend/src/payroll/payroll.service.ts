import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from '../common/tenant-context.service';
import { PayrollCalculationService } from './services/payroll-calculation.service';
import { PayrollPolicyService } from './services/payroll-policy.service';
import { PayrollRunManagementService } from './services/payroll-run-management.service';
import { 
  PayrollRun, 
  PayrollItem, 
  PayrollStatus, 
  PayrollItemType, 
  AttendanceStatus,
  Prisma 
} from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { 
  CreatePayrollRunDto, 
  PayrollCalculationResult, 
  PayrollItemCalculation,
  PayrollSummary,
  PayrollRunProcessingResult
} from './dto';

interface AttendanceRecord {
  id: string;
  employeeId: string;
  clockIn: Date;
  clockOut: Date;
  status: AttendanceStatus;
  shift: {
    id: string;
    startTime: Date;
    endTime: Date;
    shiftType: string;
    shiftDate: Date;
    assignment: {
      hourlyRate: Decimal;
    };
  };
  employee: {
    id: string;
    firstName: string;
    lastName: string;
    employeeNumber: string;
  };
}

@Injectable()
export class PayrollService {
  constructor(
    private prisma: PrismaService,
    private tenantContext: TenantContextService,
    private payrollCalculationService: PayrollCalculationService,
    private payrollPolicyService: PayrollPolicyService,
    private payrollRunManagementService: PayrollRunManagementService,
  ) {}

  /**
   * Create a new payroll run and calculate salaries for all employees
   */
  async createPayrollRun(createPayrollRunDto: CreatePayrollRunDto): Promise<PayrollSummary> {
    const companyId = this.tenantContext.getTenantId();
    
    // Validate pay period
    const startDate = new Date(createPayrollRunDto.payPeriodStart);
    const endDate = new Date(createPayrollRunDto.payPeriodEnd);
    
    if (startDate >= endDate) {
      throw new BadRequestException('Pay period start date must be before end date');
    }

    // Check for overlapping payroll runs
    await this.validateNoOverlappingRuns(companyId, startDate, endDate);

    // Generate run number if not provided
    const runNumber = createPayrollRunDto.runNumber || await this.generateRunNumber(companyId, startDate);

    // Create payroll run
    const payrollRun = await this.prisma.payrollRun.create({
      data: {
        companyId,
        runNumber,
        payPeriodStart: startDate,
        payPeriodEnd: endDate,
        status: PayrollStatus.PROCESSING,
        totalAmount: new Decimal(0),
      },
    });

    try {
      // Get attendance data for the pay period
      const attendanceData = await this.getAttendanceData(
        companyId,
        startDate,
        endDate,
        createPayrollRunDto.employeeIds,
      );

      // Calculate payroll for each employee
      const employeeResults: PayrollCalculationResult[] = [];
      let totalRunAmount = new Decimal(0);

      for (const employeeData of attendanceData) {
        const calculation = await this.payrollCalculationService.calculateEmployeePayroll(
          payrollRun.id,
          employeeData.employeeId,
          employeeData.records,
        );
        
        // Save payroll items to database
        await this.savePayrollItems(payrollRun.id, employeeData.employeeId, calculation.items);
        
        employeeResults.push(calculation);
        totalRunAmount = totalRunAmount.add(calculation.grossSalary);
      }

      // Update payroll run with total amount
      await this.prisma.payrollRun.update({
        where: { id: payrollRun.id },
        data: { 
          totalAmount: totalRunAmount,
          status: PayrollStatus.COMPLETED,
          processedAt: new Date(),
        },
      });

      return {
        payrollRunId: payrollRun.id,
        employeeCount: employeeResults.length,
        totalGrossAmount: totalRunAmount,
        totalDeductions: employeeResults.reduce((sum, emp) => sum.add(emp.totalDeductions), new Decimal(0)),
        totalNetAmount: employeeResults.reduce((sum, emp) => sum.add(emp.netSalary), new Decimal(0)),
        employeeResults,
      };

    } catch (error) {
      // Mark payroll run as failed and rollback payroll items
      await this.prisma.payrollRun.update({
        where: { id: payrollRun.id },
        data: { status: PayrollStatus.CANCELLED },
      });
      
      await this.prisma.payrollItem.deleteMany({
        where: { payrollRunId: payrollRun.id },
      });

      throw error;
    }
  }

  /**
   * Save payroll items to database
   */
  private async savePayrollItems(
    payrollRunId: string,
    employeeId: string,
    items: PayrollItemCalculation[],
  ): Promise<void> {
    const payrollItemsData = items.map(item => ({
      payrollRunId,
      employeeId,
      itemType: item.itemType,
      description: item.description,
      amount: item.amount,
      calculationData: item.calculationData,
    }));

    await this.prisma.payrollItem.createMany({
      data: payrollItemsData,
    });
  }

  /**
   * Get attendance data for payroll calculation
   */
  private async getAttendanceData(
    companyId: string,
    startDate: Date,
    endDate: Date,
    employeeIds?: string[],
  ) {
    const whereClause: Prisma.AttendanceWhereInput = {
      employee: { companyId },
      clockIn: {
        gte: startDate,
        lte: endDate,
      },
      status: AttendanceStatus.PRESENT,
    };

    if (employeeIds?.length) {
      whereClause.employeeId = { in: employeeIds };
    }

    const attendanceRecords = await this.prisma.attendance.findMany({
      where: whereClause,
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeNumber: true,
          },
        },
        shift: {
          select: {
            id: true,
            startTime: true,
            endTime: true,
            shiftType: true,
            shiftDate: true,
            assignment: {
              select: {
                hourlyRate: true,
              },
            },
          },
        },
      },
      orderBy: [
        { employeeId: 'asc' },
        { clockIn: 'asc' },
      ],
    });

    // Group attendance records by employee
    const employeeGroups = new Map<string, AttendanceRecord[]>();
    
    for (const record of attendanceRecords) {
      if (!employeeGroups.has(record.employeeId)) {
        employeeGroups.set(record.employeeId, []);
      }
      
      // Map the data to match our interface
      const mappedRecord: AttendanceRecord = {
        ...record,
        shift: {
          ...record.shift,
          assignment: record.shift.assignment,
        },
      };
      
      employeeGroups.get(record.employeeId)!.push(mappedRecord);
    }

    return Array.from(employeeGroups.entries()).map(([employeeId, records]) => ({
      employeeId,
      records,
    }));
  }

  /**
   * Generate auto payroll run number
   */
  private async generateRunNumber(companyId: string, payPeriod: Date): Promise<string> {
    const year = payPeriod.getFullYear();
    const month = String(payPeriod.getMonth() + 1).padStart(2, '0');
    
    // Count existing runs for this month/year
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

  /**
   * Validate no overlapping payroll runs exist
   */
  private async validateNoOverlappingRuns(
    companyId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<void> {
    const existingRun = await this.prisma.payrollRun.findFirst({
      where: {
        companyId,
        status: { in: [PayrollStatus.PROCESSING, PayrollStatus.COMPLETED] },
        OR: [
          {
            payPeriodStart: { lte: endDate },
            payPeriodEnd: { gte: startDate },
          },
        ],
      },
    });

    if (existingRun) {
      throw new BadRequestException(
        `Payroll run already exists for overlapping period: ${existingRun.runNumber}`,
      );
    }
  }

  /**
   * Get payroll run by ID
   */
  async getPayrollRun(id: string): Promise<PayrollRun | null> {
    const companyId = this.tenantContext.getTenantId();
    
    return this.prisma.payrollRun.findFirst({
      where: { id, companyId },
      include: {
        payrollItems: {
          include: {
            employee: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                employeeNumber: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * List payroll runs with pagination
   */
  async listPayrollRuns(page = 1, limit = 20) {
    const companyId = this.tenantContext.getTenantId();
    const skip = (page - 1) * limit;

    const [payrollRuns, total] = await Promise.all([
      this.prisma.payrollRun.findMany({
        where: { companyId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          _count: {
            select: { payrollItems: true },
          },
        },
      }),
      this.prisma.payrollRun.count({
        where: { companyId },
      }),
    ]);

    return {
      data: payrollRuns,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Create payroll run with advanced batch processing
   */
  async createPayrollRunAdvanced(dto: any): Promise<PayrollRunProcessingResult> {
    return this.payrollRunManagementService.createPayrollRunBatch(dto);
  }

  /**
   * Get filtered payroll runs
   */
  async getFilteredPayrollRuns(filter: any) {
    return this.payrollRunManagementService.getPayrollRuns(filter);
  }

  /**
   * Approve or reject payroll run
   */
  async approvePayrollRun(payrollRunId: string, approval: any) {
    return this.payrollRunManagementService.approvePayrollRun(payrollRunId, approval);
  }

  /**
   * Apply corrections to payroll run
   */
  async correctPayrollRun(payrollRunId: string, corrections: any) {
    return this.payrollRunManagementService.correctPayrollRun(payrollRunId, corrections);
  }

  /**
   * Export payroll run
   */
  async exportPayrollRun(payrollRunId: string, exportOptions: any): Promise<any> {
    return this.payrollRunManagementService.exportPayrollRun(payrollRunId, exportOptions);
  }

  /**
   * Get payroll run analytics
   */
  async getPayrollRunAnalytics(payrollRunId: string) {
    return this.payrollRunManagementService.getPayrollRunAnalytics(payrollRunId);
  }
}