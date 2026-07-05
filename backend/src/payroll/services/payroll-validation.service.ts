import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantContextService } from '../../common/tenant-context.service';
import { PayrollPolicyService } from './payroll-policy.service';
import { PayrollStatus, AttendanceStatus } from '@prisma/client';
import { Decimal } from 'decimal.js';
import { getErrorMessage, getErrorStack, formatError } from '../../common/utils/error.util';


interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

interface ValidationError {
  code: string;
  message: string;
  employeeId?: string;
  field?: string;
  value?: any;
}

interface ValidationWarning {
  code: string;
  message: string;
  employeeId?: string;
  field?: string;
  value?: any;
}

interface PayrollValidationContext {
  payPeriodStart: Date;
  payPeriodEnd: Date;
  employeeIds?: string[];
  companyId: string;
}

@Injectable()
export class PayrollValidationService {
  private readonly logger = new Logger(PayrollValidationService.name);

  constructor(
    private prisma: PrismaService,
    private tenantContext: TenantContextService,
    private payrollPolicyService: PayrollPolicyService,
  ) {}

  /**
   * Comprehensive validation before payroll processing
   */
  async validatePayrollRun(context: PayrollValidationContext): Promise<ValidationResult> {
    this.logger.log(`Validating payroll run for period ${context.payPeriodStart} to ${context.payPeriodEnd}`);

    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    try {
      // Run all validation checks
      const validationChecks = await Promise.allSettled([
        this.validatePayPeriod(context),
        this.validateEmployeeEligibility(context),
        this.validateAttendanceData(context),
        this.validateEmployeeRates(context),
        this.validateExistingPayrollRuns(context),
        this.validateCompanySettings(context),
      ]);

      // Collect results from all validation checks
      validationChecks.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          errors.push(...result.value.errors);
          warnings.push(...result.value.warnings);
        } else {
          errors.push({
            code: 'VALIDATION_CHECK_FAILED',
            message: `Validation check ${index} failed: ${result.reason.message}`,
          });
        }
      });

      const isValid = errors.length === 0;

      this.logger.log(`Payroll validation completed: ${isValid ? 'VALID' : 'INVALID'} (${errors.length} errors, ${warnings.length} warnings)`);

      return {
        isValid,
        errors,
        warnings,
      };

    } catch (error) {
      this.logger.error(`Payroll validation failed: ${getErrorMessage(error)}`, getErrorStack(error));
      
      return {
        isValid: false,
        errors: [{
          code: 'VALIDATION_FAILED',
          message: `Validation process failed: ${getErrorMessage(error)}`,
        }],
        warnings: [],
      };
    }
  }

  /**
   * Validate payroll items after calculation
   */
  async validateCalculatedPayroll(payrollRunId: string): Promise<ValidationResult> {
    this.logger.log(`Validating calculated payroll for run ${payrollRunId}`);

    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    try {
      const payrollRun = await this.prisma.payrollRun.findUnique({
        where: { id: payrollRunId },
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

      if (!payrollRun) {
        return {
          isValid: false,
          errors: [{
            code: 'PAYROLL_RUN_NOT_FOUND',
            message: `Payroll run ${payrollRunId} not found`,
          }],
          warnings: [],
        };
      }

      // Validate payroll calculations
      const calculationValidation = await this.validatePayrollCalculations(payrollRun);
      errors.push(...calculationValidation.errors);
      warnings.push(...calculationValidation.warnings);

      // Validate compliance requirements
      const complianceValidation = await this.validatePayrollCompliance(payrollRun);
      errors.push(...complianceValidation.errors);
      warnings.push(...complianceValidation.warnings);

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
      };

    } catch (error) {
      return {
        isValid: false,
        errors: [{
          code: 'CALCULATION_VALIDATION_FAILED',
          message: `Payroll calculation validation failed: ${getErrorMessage(error)}`,
        }],
        warnings: [],
      };
    }
  }

  // Private validation methods

  private async validatePayPeriod(context: PayrollValidationContext): Promise<{ errors: ValidationError[]; warnings: ValidationWarning[] }> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Check if pay period is valid
    if (context.payPeriodStart >= context.payPeriodEnd) {
      errors.push({
        code: 'INVALID_PAY_PERIOD',
        message: 'Pay period start date must be before end date',
        field: 'payPeriod',
        value: { start: context.payPeriodStart, end: context.payPeriodEnd },
      });
    }

    // Check if pay period is in the future
    const today = new Date();
    if (context.payPeriodStart > today) {
      warnings.push({
        code: 'FUTURE_PAY_PERIOD',
        message: 'Pay period starts in the future',
        field: 'payPeriodStart',
        value: context.payPeriodStart,
      });
    }

    // Check pay period duration (warn if too long)
    const periodDays = Math.ceil((context.payPeriodEnd.getTime() - context.payPeriodStart.getTime()) / (1000 * 60 * 60 * 24));
    if (periodDays > 35) {
      warnings.push({
        code: 'LONG_PAY_PERIOD',
        message: `Pay period is unusually long: ${periodDays} days`,
        field: 'payPeriod',
        value: periodDays,
      });
    }

    return { errors, warnings };
  }

  private async validateEmployeeEligibility(context: PayrollValidationContext): Promise<{ errors: ValidationError[]; warnings: ValidationWarning[] }> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Get employees for payroll processing
    const whereClause: any = {
      companyId: context.companyId,
      employmentStatus: 'ACTIVE',
    };

    if (context.employeeIds?.length) {
      whereClause.id = { in: context.employeeIds };
    }

    const employees = await this.prisma.employee.findMany({
      where: whereClause,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        employeeNumber: true,
        hireDate: true,
        employmentStatus: true,
        assignments: {
          where: {
            status: 'ACTIVE',
            startDate: { lte: context.payPeriodEnd },
            OR: [
              { endDate: null },
              { endDate: { gte: context.payPeriodStart } },
            ],
          },
          select: {
            id: true,
            hourlyRate: true,
          },
        },
      },
    });

    // Check for employees without active assignments
    const employeesWithoutAssignments = employees.filter(emp => emp.assignments.length === 0);
    employeesWithoutAssignments.forEach(emp => {
      warnings.push({
        code: 'NO_ACTIVE_ASSIGNMENT',
        message: `Employee ${emp.employeeNumber} (${emp.firstName} ${emp.lastName}) has no active assignments`,
        employeeId: emp.id,
      });
    });

    // Check for employees with missing hourly rates
    employees.forEach(emp => {
      const assignmentsWithoutRates = emp.assignments.filter(assignment => 
        !assignment.hourlyRate || assignment.hourlyRate.lte(0)
      );
      
      if (assignmentsWithoutRates.length > 0) {
        errors.push({
          code: 'MISSING_HOURLY_RATE',
          message: `Employee ${emp.employeeNumber} has assignments without valid hourly rates`,
          employeeId: emp.id,
        });
      }
    });

    return { errors, warnings };
  }

  private async validateAttendanceData(context: PayrollValidationContext): Promise<{ errors: ValidationError[]; warnings: ValidationWarning[] }> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Get attendance statistics for the pay period
    const attendanceStats = await this.prisma.attendance.groupBy({
      by: ['employeeId'],
      where: {
        employee: { companyId: context.companyId },
        clockIn: {
          gte: context.payPeriodStart,
          lte: context.payPeriodEnd,
        },
      },
      _count: {
        id: true,
      },
    });

    // Check for employees with no attendance records
    if (context.employeeIds?.length) {
      const employeesWithAttendance = new Set(attendanceStats.map(stat => stat.employeeId));
      const employeesWithoutAttendance = context.employeeIds.filter(id => !employeesWithAttendance.has(id));

      employeesWithoutAttendance.forEach(employeeId => {
        warnings.push({
          code: 'NO_ATTENDANCE_RECORDS',
          message: 'Employee has no attendance records for the pay period',
          employeeId,
        });
      });
    }

    // Check for incomplete attendance records
    const incompleteAttendance = await this.prisma.attendance.findMany({
      where: {
        employee: { companyId: context.companyId },
        clockIn: {
          gte: context.payPeriodStart,
          lte: context.payPeriodEnd,
        },
        OR: [
          { clockOut: null },
          { status: AttendanceStatus.PENDING },
        ],
      },
      select: {
        employeeId: true,
        clockIn: true,
        clockOut: true,
        status: true,
        employee: {
          select: {
            employeeNumber: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    incompleteAttendance.forEach(record => {
      warnings.push({
        code: 'INCOMPLETE_ATTENDANCE',
        message: `Incomplete attendance record: ${record.employee.employeeNumber} on ${record.clockIn.toISOString().split('T')[0]}`,
        employeeId: record.employeeId,
      });
    });

    return { errors, warnings };
  }

  private async validateEmployeeRates(context: PayrollValidationContext): Promise<{ errors: ValidationError[]; warnings: ValidationWarning[] }> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    const policy = await this.payrollPolicyService.getPayrollPolicy();

    // Get active assignments with rates
    const assignments = await this.prisma.assignment.findMany({
      where: {
        employee: { companyId: context.companyId },
        status: 'ACTIVE',
        startDate: { lte: context.payPeriodEnd },
        OR: [
          { endDate: null },
          { endDate: { gte: context.payPeriodStart } },
        ],
      },
      select: {
        id: true,
        hourlyRate: true,
        employeeId: true,
        employee: {
          select: {
            employeeNumber: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Check for rates below minimum wage
    const minimumWageHourly = new Decimal(policy.minimumWage).div(8); // Assuming 8-hour workday
    
    assignments.forEach(assignment => {
      if (assignment.hourlyRate.lt(minimumWageHourly)) {
        errors.push({
          code: 'BELOW_MINIMUM_WAGE',
          message: `Employee ${assignment.employee.employeeNumber} hourly rate (₹${assignment.hourlyRate}) is below minimum wage (₹${minimumWageHourly})`,
          employeeId: assignment.employeeId,
          field: 'hourlyRate',
          value: assignment.hourlyRate.toString(),
        });
      }
    });

    return { errors, warnings };
  }

  private async validateExistingPayrollRuns(context: PayrollValidationContext): Promise<{ errors: ValidationError[]; warnings: ValidationWarning[] }> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Check for overlapping payroll runs
    const overlappingRuns = await this.prisma.payrollRun.findMany({
      where: {
        companyId: context.companyId,
        status: { in: [PayrollStatus.PROCESSING, PayrollStatus.COMPLETED] },
        OR: [
          {
            payPeriodStart: { lte: context.payPeriodEnd },
            payPeriodEnd: { gte: context.payPeriodStart },
          },
        ],
      },
      select: {
        id: true,
        runNumber: true,
        payPeriodStart: true,
        payPeriodEnd: true,
        status: true,
      },
    });

    overlappingRuns.forEach(run => {
      if (run.status === PayrollStatus.PROCESSING) {
        errors.push({
          code: 'PAYROLL_RUN_PROCESSING',
          message: `Payroll run ${run.runNumber} is currently being processed for overlapping period`,
        });
      } else {
        warnings.push({
          code: 'PAYROLL_RUN_EXISTS',
          message: `Completed payroll run ${run.runNumber} exists for overlapping period`,
        });
      }
    });

    return { errors, warnings };
  }

  private async validateCompanySettings(context: PayrollValidationContext): Promise<{ errors: ValidationError[]; warnings: ValidationWarning[] }> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Validate company exists and is active
    const company = await this.prisma.company.findUnique({
      where: { id: context.companyId },
      select: {
        id: true,
        name: true,
        settings: true,
      },
    });

    if (!company) {
      errors.push({
        code: 'COMPANY_NOT_FOUND',
        message: 'Company not found or inactive',
      });
    }

    // Check for required payroll settings
    const settings = company?.settings as any;
    if (!settings?.payroll) {
      warnings.push({
        code: 'MISSING_PAYROLL_SETTINGS',
        message: 'Company payroll settings not configured',
      });
    }

    return { errors, warnings };
  }

  private async validatePayrollCalculations(payrollRun: any): Promise<{ errors: ValidationError[]; warnings: ValidationWarning[] }> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Group payroll items by employee
    const employeeGroups = new Map<string, any[]>();
    payrollRun.payrollItems.forEach((item: any) => {
      if (!employeeGroups.has(item.employeeId)) {
        employeeGroups.set(item.employeeId, []);
      }
      employeeGroups.get(item.employeeId)!.push(item);
    });

    // Validate each employee's payroll
    for (const [employeeId, items] of employeeGroups) {
      const employee = items[0].employee;
      
      // Check for negative net salary
      const totalEarnings = items
        .filter(item => ['BASIC_PAY', 'OVERTIME', 'BONUS', 'ALLOWANCE'].includes(item.itemType))
        .reduce((sum, item) => sum.add(item.amount), new Decimal(0));
      
      const totalDeductions = items
        .filter(item => item.itemType.includes('DEDUCTION') || item.itemType === 'TAX_DEDUCTION')
        .reduce((sum, item) => sum.add(item.amount.abs()), new Decimal(0));

      const netSalary = totalEarnings.sub(totalDeductions);

      if (netSalary.lt(0)) {
        warnings.push({
          code: 'NEGATIVE_NET_SALARY',
          message: `Employee ${employee.employeeNumber} has negative net salary: ₹${netSalary}`,
          employeeId,
        });
      }

      // Check for missing basic pay
      const hasBasicPay = items.some(item => item.itemType === 'BASIC_PAY');
      if (!hasBasicPay) {
        errors.push({
          code: 'MISSING_BASIC_PAY',
          message: `Employee ${employee.employeeNumber} has no basic pay calculation`,
          employeeId,
        });
      }
    }

    return { errors, warnings };
  }

  private async validatePayrollCompliance(payrollRun: any): Promise<{ errors: ValidationError[]; warnings: ValidationWarning[] }> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Get policy for compliance checks
    const policy = await this.payrollPolicyService.getPayrollPolicy();

    // Check tax compliance
    payrollRun.payrollItems.forEach((item: any) => {
      if (item.itemType === 'TAX_DEDUCTION') {
        const taxAmount = item.amount.abs();
        const grossSalary = new Decimal(item.calculationData?.grossSalary || 0);
        const expectedTax = grossSalary.mul(policy.taxRate);
        
        if (taxAmount.sub(expectedTax).abs().gt(new Decimal(1))) { // Allow ₹1 rounding difference
          warnings.push({
            code: 'TAX_CALCULATION_VARIANCE',
            message: `Tax calculation variance for employee ${item.employee.employeeNumber}: Expected ₹${expectedTax}, Calculated ₹${taxAmount}`,
            employeeId: item.employeeId,
          });
        }
      }
    });

    return { errors, warnings };
  }
}
