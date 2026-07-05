import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantContextService } from '../../common/tenant-context.service';
import { PayrollPolicyService, PayrollPolicy } from './payroll-policy.service';
import { 
  AttendanceStatus,
  Prisma,
  PayrollItemType
} from '@prisma/client';
import { Decimal } from 'decimal.js';
import { PayrollItemCalculation } from '../dto';

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

interface PayrollCalculationData {
  employeeId: string;
  attendanceRecords: AttendanceRecord[];
  policy: PayrollPolicy;
}

interface DetailedHoursCalculation {
  totalHours: number;
  regularHours: number;
  overtimeHours: number;
  doubleOvertimeHours: number;
  nightShiftHours: number;
  weekendHours: number;
  holidayHours: number;
}

@Injectable()
export class PayrollCalculationService {
  private readonly logger = new Logger(PayrollCalculationService.name);

  constructor(
    private prisma: PrismaService,
    private tenantContext: TenantContextService,
    private payrollPolicyService: PayrollPolicyService,
  ) {}

  /**
   * Calculate comprehensive payroll for an employee including all components
   */
  async calculateEmployeePayroll(
    payrollRunId: string,
    employeeId: string,
    attendanceRecords: AttendanceRecord[],
  ) {
    this.logger.log(`Calculating payroll for employee ${employeeId}`);

    if (!attendanceRecords || attendanceRecords.length === 0) {
      throw new Error(`No attendance records found for employee ${employeeId}`);
    }

    const employee = attendanceRecords[0].employee;
    const policy = await this.payrollPolicyService.getPayrollPolicy();

    // Calculate detailed hours breakdown
    const hoursCalculation = this.calculateDetailedHours(attendanceRecords, policy);
    
    // Get employee's base hourly rate
    const baseHourlyRate = this.getEmployeeHourlyRate(attendanceRecords);

    // Calculate gross pay components
    const payComponents = this.calculatePayComponents(hoursCalculation, baseHourlyRate, policy);
    
    // Calculate allowances
    const allowances = this.payrollPolicyService.calculateAllowances(payComponents.basicPay, policy);
    
    // Calculate total gross salary
    const grossSalary = payComponents.basicPay
      .add(payComponents.overtimePay)
      .add(payComponents.doubleOvertimePay)
      .add(payComponents.differentialPay)
      .add(allowances.totalAllowances);

    // Calculate deductions
    const deductions = this.calculateDeductions(grossSalary, payComponents.basicPay, policy);
    
    // Calculate net salary
    const netSalary = grossSalary.sub(deductions.totalDeductions);

    // Create payroll items
    const payrollItems = this.createPayrollItems(
      hoursCalculation,
      payComponents,
      allowances,
      deductions,
      baseHourlyRate,
      policy
    );

    return {
      employeeId,
      employeeName: `${employee.firstName} ${employee.lastName}`,
      employeeNumber: employee.employeeNumber,
      totalHours: hoursCalculation.totalHours,
      regularHours: hoursCalculation.regularHours,
      overtimeHours: hoursCalculation.overtimeHours,
      doubleOvertimeHours: hoursCalculation.doubleOvertimeHours,
      nightShiftHours: hoursCalculation.nightShiftHours,
      weekendHours: hoursCalculation.weekendHours,
      holidayHours: hoursCalculation.holidayHours,
      basicPay: payComponents.basicPay,
      overtimePay: payComponents.overtimePay,
      doubleOvertimePay: payComponents.doubleOvertimePay,
      differentialPay: payComponents.differentialPay,
      allowances: allowances.totalAllowances,
      grossSalary,
      totalDeductions: deductions.totalDeductions,
      netSalary,
      items: payrollItems,
    };
  }

  /**
   * Calculate detailed hours breakdown including shift differentials
   */
  private calculateDetailedHours(
    attendanceRecords: AttendanceRecord[],
    policy: PayrollPolicy,
  ): DetailedHoursCalculation {
    let totalHours = 0;
    let nightShiftHours = 0;
    let weekendHours = 0;
    let holidayHours = 0;

    // Calculate total hours worked and track special shift types
    for (const record of attendanceRecords) {
      if (record.status !== AttendanceStatus.PRESENT || !record.clockIn || !record.clockOut) {
        continue;
      }

      const hoursWorked = (record.clockOut.getTime() - record.clockIn.getTime()) / (1000 * 60 * 60);
      totalHours += hoursWorked;

      // Track shift differential hours
      const shiftDifferential = this.payrollPolicyService.calculateShiftDifferential(
        record.shift.startTime,
        record.clockOut, // Use actual clock-out time
        record.shift.shiftDate,
        record.shift.shiftType,
        policy,
      );

      // Categorize hours by shift type
      if (this.isNightShift(record.shift.startTime, record.clockOut)) {
        nightShiftHours += hoursWorked;
      }

      const dayOfWeek = record.shift.shiftDate.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        weekendHours += hoursWorked;
      }

      if (record.shift.shiftType === 'HOLIDAY') {
        holidayHours += hoursWorked;
      }
    }

    // Calculate overtime breakdown
    const overtimeBreakdown = this.payrollPolicyService.calculateOvertimeHours(totalHours, policy);

    return {
      totalHours: Math.round(totalHours * 100) / 100,
      regularHours: overtimeBreakdown.regularHours,
      overtimeHours: overtimeBreakdown.overtimeHours,
      doubleOvertimeHours: overtimeBreakdown.doubleOvertimeHours,
      nightShiftHours: Math.round(nightShiftHours * 100) / 100,
      weekendHours: Math.round(weekendHours * 100) / 100,
      holidayHours: Math.round(holidayHours * 100) / 100,
    };
  }

  /**
   * Calculate all pay components including differentials
   */
  private calculatePayComponents(
    hoursCalculation: DetailedHoursCalculation,
    baseHourlyRate: Decimal,
    policy: PayrollPolicy,
  ) {
    // Basic pay (regular hours only)
    const basicPay = baseHourlyRate.mul(hoursCalculation.regularHours);

    // Overtime pay (1.5x rate)
    const overtimePay = hoursCalculation.overtimeHours > 0
      ? baseHourlyRate.mul(policy.overtimeMultiplier).mul(hoursCalculation.overtimeHours)
      : new Decimal(0);

    // Double overtime pay (2.0x rate) 
    const doubleOvertimePay = hoursCalculation.doubleOvertimeHours > 0
      ? baseHourlyRate.mul(policy.doubleOvertimeMultiplier || 2.0).mul(hoursCalculation.doubleOvertimeHours)
      : new Decimal(0);

    // Shift differentials
    let differentialPay = new Decimal(0);
    
    // Night shift differential
    if (hoursCalculation.nightShiftHours > 0) {
      const nightDifferential = policy.shiftDifferentials.night || 0;
      differentialPay = differentialPay.add(
        baseHourlyRate.mul(nightDifferential).mul(hoursCalculation.nightShiftHours)
      );
    }

    // Weekend differential
    if (hoursCalculation.weekendHours > 0) {
      const weekendDifferential = policy.shiftDifferentials.weekend || 0;
      differentialPay = differentialPay.add(
        baseHourlyRate.mul(weekendDifferential).mul(hoursCalculation.weekendHours)
      );
    }

    // Holiday differential
    if (hoursCalculation.holidayHours > 0) {
      const holidayDifferential = policy.shiftDifferentials.holiday || 0;
      differentialPay = differentialPay.add(
        baseHourlyRate.mul(holidayDifferential).mul(hoursCalculation.holidayHours)
      );
    }

    return {
      basicPay,
      overtimePay,
      doubleOvertimePay,
      differentialPay,
    };
  }

  /**
   * Calculate comprehensive deductions including statutory compliance
   */
  private calculateDeductions(
    grossSalary: Decimal,
    basicSalary: Decimal,
    policy: PayrollPolicy,
  ) {
    const items: PayrollItemCalculation[] = [];
    let totalDeductions = new Decimal(0);

    // Income Tax (simplified calculation based on gross salary)
    const incomeTax = grossSalary.mul(policy.taxRate);
    items.push({
      itemType: PayrollItemType.TAX_DEDUCTION,
      description: `Income Tax (${(policy.taxRate * 100)}%)`,
      amount: incomeTax.neg(),
      calculationData: {
        rate: policy.taxRate,
        grossSalary: grossSalary.toString(),
        calculation: `${grossSalary} × ${policy.taxRate}`,
      },
    });
    totalDeductions = totalDeductions.add(incomeTax);

    // Provident Fund (calculated on basic salary, capped at threshold)
    const pfBaseSalary = basicSalary.gt(policy.pfThreshold) 
      ? new Decimal(policy.pfThreshold) 
      : basicSalary;
    const providentFund = pfBaseSalary.mul(policy.providentFundRate);
    
    items.push({
      itemType: PayrollItemType.SOCIAL_SECURITY,
      description: `Provident Fund (${(policy.providentFundRate * 100)}%)`,
      amount: providentFund.neg(),
      calculationData: {
        rate: policy.providentFundRate,
        baseSalary: pfBaseSalary.toString(),
        threshold: policy.pfThreshold,
        calculation: `${pfBaseSalary} × ${policy.providentFundRate}`,
      },
    });
    totalDeductions = totalDeductions.add(providentFund);

    // ESIC (Employee State Insurance Contribution) - applicable for salaries up to threshold
    if (grossSalary.lte(policy.esicThreshold)) {
      const esic = grossSalary.mul(policy.esicRate);
      items.push({
        itemType: PayrollItemType.HEALTH_INSURANCE,
        description: `ESIC (${(policy.esicRate * 100)}%)`,
        amount: esic.neg(),
        calculationData: {
          rate: policy.esicRate,
          grossSalary: grossSalary.toString(),
          threshold: policy.esicThreshold,
          calculation: `${grossSalary} × ${policy.esicRate}`,
        },
      });
      totalDeductions = totalDeductions.add(esic);
    }

    // Professional Tax (state-specific, fixed amount)
    const professionalTax = new Decimal(policy.professionalTax);
    items.push({
      itemType: PayrollItemType.OTHER_DEDUCTION,
      description: 'Professional Tax',
      amount: professionalTax.neg(),
      calculationData: {
        fixedAmount: policy.professionalTax,
        calculation: `Fixed amount: ₹${policy.professionalTax}`,
      },
    });
    totalDeductions = totalDeductions.add(professionalTax);

    return {
      items,
      totalDeductions,
    };
  }

  /**
   * Create detailed payroll items for audit trail
   */
  private createPayrollItems(
    hoursCalculation: DetailedHoursCalculation,
    payComponents: any,
    allowances: any,
    deductions: any,
    baseHourlyRate: Decimal,
    policy: PayrollPolicy,
  ): PayrollItemCalculation[] {
    const items: PayrollItemCalculation[] = [];

    // Basic pay
    items.push({
      itemType: PayrollItemType.BASIC_PAY,
      description: `Basic Pay (${hoursCalculation.regularHours} hours)`,
      amount: payComponents.basicPay,
      calculationData: {
        hours: hoursCalculation.regularHours,
        hourlyRate: baseHourlyRate.toString(),
        calculation: `${hoursCalculation.regularHours} × ${baseHourlyRate}`,
      },
    });

    // Overtime pay
    if (hoursCalculation.overtimeHours > 0) {
      items.push({
        itemType: PayrollItemType.OVERTIME,
        description: `Overtime Pay (${hoursCalculation.overtimeHours} hours @ ${policy.overtimeMultiplier}x)`,
        amount: payComponents.overtimePay,
        calculationData: {
          hours: hoursCalculation.overtimeHours,
          hourlyRate: baseHourlyRate.toString(),
          multiplier: policy.overtimeMultiplier,
          calculation: `${hoursCalculation.overtimeHours} × ${baseHourlyRate} × ${policy.overtimeMultiplier}`,
        },
      });
    }

    // Double overtime pay
    if (hoursCalculation.doubleOvertimeHours > 0) {
      const multiplier = policy.doubleOvertimeMultiplier || 2.0;
      items.push({
        itemType: PayrollItemType.OVERTIME,
        description: `Double Overtime (${hoursCalculation.doubleOvertimeHours} hours @ ${multiplier}x)`,
        amount: payComponents.doubleOvertimePay,
        calculationData: {
          hours: hoursCalculation.doubleOvertimeHours,
          hourlyRate: baseHourlyRate.toString(),
          multiplier: multiplier,
          calculation: `${hoursCalculation.doubleOvertimeHours} × ${baseHourlyRate} × ${multiplier}`,
        },
      });
    }

    // Shift differentials
    if (payComponents.differentialPay.gt(0)) {
      items.push({
        itemType: PayrollItemType.ALLOWANCE,
        description: 'Shift Differentials (Night/Weekend/Holiday)',
        amount: payComponents.differentialPay,
        calculationData: {
          nightHours: hoursCalculation.nightShiftHours,
          weekendHours: hoursCalculation.weekendHours,
          holidayHours: hoursCalculation.holidayHours,
          rates: policy.shiftDifferentials,
          calculation: 'Variable based on shift timing and type',
        },
      });
    }

    // Allowances
    if (allowances.hra.gt(0)) {
      items.push({
        itemType: PayrollItemType.ALLOWANCE,
        description: 'House Rent Allowance (HRA)',
        amount: allowances.hra,
        calculationData: {
          rate: policy.allowances.hra || 0,
          basicSalary: payComponents.basicPay.toString(),
          calculation: `${payComponents.basicPay} × ${policy.allowances.hra}`,
        },
      });
    }

    if (allowances.transport.gt(0)) {
      items.push({
        itemType: PayrollItemType.ALLOWANCE,
        description: 'Transport Allowance',
        amount: allowances.transport,
        calculationData: {
          fixedAmount: policy.allowances.transport || 0,
          calculation: `Fixed amount: ₹${policy.allowances.transport}`,
        },
      });
    }

    if (allowances.medical.gt(0)) {
      items.push({
        itemType: PayrollItemType.ALLOWANCE,
        description: 'Medical Allowance',
        amount: allowances.medical,
        calculationData: {
          fixedAmount: policy.allowances.medical || 0,
          calculation: `Fixed amount: ₹${policy.allowances.medical}`,
        },
      });
    }

    // Add all deduction items
    items.push(...deductions.items);

    return items;
  }

  /**
   * Get employee's hourly rate from attendance records
   */
  private getEmployeeHourlyRate(attendanceRecords: AttendanceRecord[]): Decimal {
    const firstRecord = attendanceRecords.find(record => record.shift.assignment?.hourlyRate);
    return firstRecord?.shift.assignment?.hourlyRate || new Decimal(0);
  }

  /**
   * Check if shift qualifies as night shift
   */
  private isNightShift(startTime: Date, endTime: Date): boolean {
    const startHour = startTime.getHours();
    const endHour = endTime.getHours();
    return startHour >= 22 || endHour <= 6 || (startHour > endHour);
  }
}
