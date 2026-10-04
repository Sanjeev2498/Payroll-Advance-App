import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from '../common/tenant-context.service';
import { PayrollCalculationService } from './services/payroll-calculation.service';
import { PayrollPolicyService } from './services/payroll-policy.service';
import { PayrollRunManagementService } from './services/payroll-run-management.service';
import { 
  payroll_runs, 
  payroll_items, 
  PayrollStatus, 
  PayrollItemType, 
  AttendanceStatus,
  Prisma 
} from '@prisma/client';
import { Decimal } from 'decimal.js';
import { 
  CreatePayrollRunDto, 
  PayrollCalculationResult, 
  PayrollItemCalculation,
  PayrollSummary,
  PayrollRunProcessingResult
} from './dto';

interface AttendanceRecord {
  id: string;
  employee_id: string;
  clock_in: Date;
  clock_out: Date;
  status: AttendanceStatus;
  shifts: {
    id: string;
    start_time: Date;
    end_time: Date;
    shift_type: string;
    shift_date: Date;
    assignments: {
      hourly_rate: Decimal;
    };
  };
  employees: {
    id: string;
    first_name: string;
    last_name: string;
    employee_number: string;
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
    const payrollRun = await this.prisma.payrollRuns.create({
      data: {
        id: require('crypto').randomUUID(),
        company_id: companyId,
        run_number: runNumber,
        pay_period_start: startDate,
        pay_period_end: endDate,
        status: PayrollStatus.PROCESSING,
        total_amount: new Decimal(0),
        created_at: new Date(),
        updated_at: new Date(),
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
      await this.prisma.payrollRuns.update({
        where: { id: payrollRun.id },
        data: { 
          total_amount: totalRunAmount,
          status: PayrollStatus.COMPLETED,
          processed_at: new Date(),
          updated_at: new Date(),
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
      await this.prisma.payrollRuns.update({
        where: { id: payrollRun.id },
        data: { status: PayrollStatus.CANCELLED },
      });
      
      await this.prisma.payrollItems.deleteMany({
        where: { payroll_run_id: payrollRun.id },
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
      id: require('crypto').randomUUID(),
      payroll_run_id: payrollRunId,
      employee_id: employeeId,
      item_type: item.itemType,
      description: item.description,
      amount: item.amount.toString(),
      amount_iv: require('crypto').randomBytes(16).toString('hex'),
      amount_tag: require('crypto').randomBytes(16).toString('hex'),
      calculation_data: item.calculationData,
      created_at: new Date(),
      updated_at: new Date(),
    }));

    await this.prisma.payrollItems.createMany({
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
    const whereClause: Prisma.attendanceWhereInput = {
      employees: { company_id: companyId },
      clock_in: {
        gte: startDate,
        lte: endDate,
      },
      status: AttendanceStatus.PRESENT,
    };

    if (employeeIds?.length) {
      whereClause.employee_id = { in: employeeIds };
    }

    const attendanceRecords = await this.prisma.attendance.findMany({
      where: whereClause,
      include: {
        employees: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            employee_number: true,
          },
        },
        shifts: {
          select: {
            id: true,
            start_time: true,
            end_time: true,
            shift_type: true,
            shift_date: true,
            assignments: {
              select: {
                hourly_rate: true,
              },
            },
          },
        },
      },
      orderBy: [
        { employee_id: 'asc' },
        { clock_in: 'asc' },
      ],
    });

    // Group attendance records by employee
    const employeeGroups = new Map<string, AttendanceRecord[]>();
    
    for (const record of attendanceRecords) {
      if (!employeeGroups.has(record.employee_id)) {
        employeeGroups.set(record.employee_id, []);
      }
      
      // Map the data to match our interface
      const mappedRecord: AttendanceRecord = {
        ...record,
        shifts: {
          ...record.shifts,
          assignments: record.shifts.assignments,
        },
      };
      
      employeeGroups.get(record.employee_id)!.push(mappedRecord);
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
    const count = await this.prisma.payrollRuns.count({
      where: {
        company_id: companyId,
        run_number: {
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
    const existingRun = await this.prisma.payrollRuns.findFirst({
      where: {
        company_id: companyId,
        status: { in: [PayrollStatus.PROCESSING, PayrollStatus.COMPLETED] },
        OR: [
          {
            pay_period_start: { lte: endDate },
            pay_period_end: { gte: startDate },
          },
        ],
      },
    });

    if (existingRun) {
      throw new BadRequestException(
        `Payroll run already exists for overlapping period: ${existingRun.run_number}`,
      );
    }
  }

  /**
   * Get payroll run by ID
   */
  async getPayrollRun(id: string): Promise<any> {
    const companyId = this.tenantContext.getTenantId();
    
    const payrollRun = await this.prisma.payrollRuns.findFirst({
      where: { id, company_id: companyId },
      include: {
        payroll_items: {
          include: {
            employees: {
              select: {
                id: true,
                first_name: true,
                last_name: true,
                employee_number: true,
              },
            },
          },
        },
      },
    });

    if (!payrollRun) return null;

    // Transform to camelCase for API response
    return {
      ...payrollRun,
      payrollItems: payrollRun.payroll_items,
    };
  }

  /**
   * List payroll runs with pagination
   */
  async listPayrollRuns(page = 1, limit = 20) {
    const companyId = this.tenantContext.getTenantId();
    const skip = (page - 1) * limit;

    const [payrollRuns, total] = await Promise.all([
      this.prisma.payrollRuns.findMany({
        where: { company_id: companyId },
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
        include: {
          _count: {
            select: { payroll_items: true },
          },
        },
      }),
      this.prisma.payrollRuns.count({
        where: { company_id: companyId },
      }),
    ]);

    return {
      data: payrollRuns,
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
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
