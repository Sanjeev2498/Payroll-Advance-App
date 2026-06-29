import { Injectable } from '@nestjs/common';
import { TenantContextService } from '../../common/tenant-context.service';
import { PrismaService } from '../../prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';

export interface PayrollPolicy {
  // Basic configuration
  overtimeThreshold: number; // Standard work hours per day (8)
  overtimeMultiplier: number; // Overtime rate multiplier (1.5x)
  doubleOvertimeThreshold?: number; // Hours after which double overtime applies (12)
  doubleOvertimeMultiplier?: number; // Double overtime multiplier (2.0x)
  
  // Indian statutory deductions
  taxRate: number; // Income tax rate (0.1 = 10%)
  providentFundRate: number; // PF contribution rate (0.12 = 12%)
  esicRate: number; // ESIC contribution rate (0.0175 = 1.75%)
  professionalTax: number; // Fixed professional tax amount
  
  // Thresholds
  minimumWage: number; // Minimum wage per hour
  esicThreshold: number; // ESIC applicable up to this salary (21000)
  pfThreshold: number; // PF applicable up to this salary (15000)
  
  // Additional benefits
  allowances: {
    hra?: number; // House Rent Allowance percentage
    transport?: number; // Transport allowance fixed amount
    medical?: number; // Medical allowance fixed amount
  };
  
  // Shift differentials
  shiftDifferentials: {
    night?: number; // Night shift differential percentage
    weekend?: number; // Weekend differential percentage
    holiday?: number; // Holiday differential percentage
  };
}

@Injectable()
export class PayrollPolicyService {
  constructor(
    private prisma: PrismaService,
    private tenantContext: TenantContextService,
  ) {}

  /**
   * Get payroll policy for the current tenant
   * This can be made configurable per company in the future
   */
  async getPayrollPolicy(): Promise<PayrollPolicy> {
    const companyId = this.tenantContext.getTenantId();
    
    // In future, this could be fetched from a PayrollPolicy table
    // For now, returning Indian standard configuration
    return this.getDefaultIndianPayrollPolicy();
  }

  /**
   * Get default Indian payroll policy configuration
   */
  private getDefaultIndianPayrollPolicy(): PayrollPolicy {
    return {
      // Working hours configuration
      overtimeThreshold: 8, // Standard 8-hour workday
      overtimeMultiplier: 1.5, // 1.5x overtime rate
      doubleOvertimeThreshold: 12, // After 12 hours, double overtime
      doubleOvertimeMultiplier: 2.0, // 2x rate for excessive hours
      
      // Indian statutory rates (as of 2024)
      taxRate: 0.10, // 10% income tax (simplified for security workforce)
      providentFundRate: 0.12, // 12% PF contribution (employee share)
      esicRate: 0.0175, // 1.75% ESIC employee contribution
      professionalTax: 200, // ₹200 professional tax (varies by state)
      
      // Thresholds (in INR)
      minimumWage: 176, // National minimum wage per day (₹176)
      esicThreshold: 21000, // ESIC applicable for salaries up to ₹21,000
      pfThreshold: 15000, // Basic salary for PF calculation capped at ₹15,000
      
      // Allowances (percentages or fixed amounts)
      allowances: {
        hra: 0.40, // 40% of basic salary as HRA (if applicable)
        transport: 1600, // ₹1,600 transport allowance (up to this limit is tax-free)
        medical: 1250, // ₹1,250 medical allowance (tax-free limit)
      },
      
      // Shift differentials for security industry
      shiftDifferentials: {
        night: 0.10, // 10% extra for night shifts (10 PM - 6 AM)
        weekend: 0.15, // 15% extra for weekend work
        holiday: 0.25, // 25% extra for national holidays
      },
    };
  }

  /**
   * Calculate shift differential based on shift timing and type
   */
  calculateShiftDifferential(
    shiftStartTime: Date,
    shiftEndTime: Date,
    shiftDate: Date,
    shiftType: string,
    policy: PayrollPolicy,
  ): number {
    let differential = 0;

    // Night shift differential (10 PM to 6 AM)
    const startHour = shiftStartTime.getHours();
    const endHour = shiftEndTime.getHours();
    
    if (this.isNightShift(startHour, endHour)) {
      differential += policy.shiftDifferentials.night || 0;
    }

    // Weekend differential (Saturday and Sunday)
    const dayOfWeek = shiftDate.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) { // Sunday or Saturday
      differential += policy.shiftDifferentials.weekend || 0;
    }

    // Holiday differential
    if (shiftType === 'HOLIDAY' || this.isNationalHoliday(shiftDate)) {
      differential += policy.shiftDifferentials.holiday || 0;
    }

    return differential;
  }

  /**
   * Check if shift qualifies as night shift
   */
  private isNightShift(startHour: number, endHour: number): boolean {
    // Night shift: starts at or after 10 PM or ends at or before 6 AM
    return startHour >= 22 || endHour <= 6 || (startHour > endHour); // Cross-midnight shifts
  }

  /**
   * Check if date is a national holiday (simplified for demo)
   * In production, this would check against a holiday calendar table
   */
  private isNationalHoliday(date: Date): boolean {
    const month = date.getMonth() + 1; // getMonth() returns 0-11
    const day = date.getDate();
    
    // Major Indian holidays (simplified)
    const holidays = [
      { month: 1, day: 26 }, // Republic Day
      { month: 8, day: 15 }, // Independence Day
      { month: 10, day: 2 }, // Gandhi Jayanti
    ];
    
    return holidays.some(holiday => holiday.month === month && holiday.day === day);
  }

  /**
   * Calculate allowances based on basic salary
   */
  calculateAllowances(basicSalary: Decimal, policy: PayrollPolicy): {
    hra: Decimal;
    transport: Decimal;
    medical: Decimal;
    totalAllowances: Decimal;
  } {
    const hra = policy.allowances.hra 
      ? basicSalary.mul(policy.allowances.hra)
      : new Decimal(0);
    
    const transport = new Decimal(policy.allowances.transport || 0);
    const medical = new Decimal(policy.allowances.medical || 0);
    
    return {
      hra,
      transport,
      medical,
      totalAllowances: hra.add(transport).add(medical),
    };
  }

  /**
   * Calculate overtime with double overtime support
   */
  calculateOvertimeHours(
    totalHoursWorked: number,
    policy: PayrollPolicy,
  ): {
    regularHours: number;
    overtimeHours: number;
    doubleOvertimeHours: number;
  } {
    let regularHours = Math.min(totalHoursWorked, policy.overtimeThreshold);
    let overtimeHours = 0;
    let doubleOvertimeHours = 0;

    if (totalHoursWorked > policy.overtimeThreshold) {
      const excessHours = totalHoursWorked - policy.overtimeThreshold;
      
      if (policy.doubleOvertimeThreshold && totalHoursWorked > policy.doubleOvertimeThreshold) {
        // Split between regular overtime and double overtime
        overtimeHours = policy.doubleOvertimeThreshold - policy.overtimeThreshold;
        doubleOvertimeHours = totalHoursWorked - policy.doubleOvertimeThreshold;
      } else {
        overtimeHours = excessHours;
      }
    }

    return {
      regularHours: Math.round(regularHours * 100) / 100,
      overtimeHours: Math.round(overtimeHours * 100) / 100,
      doubleOvertimeHours: Math.round(doubleOvertimeHours * 100) / 100,
    };
  }
}