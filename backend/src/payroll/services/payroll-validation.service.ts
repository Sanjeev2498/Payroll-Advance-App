import { Injectable } from '@nestjs/common';
import { Decimal } from 'decimal.js';
import { Employee, PayrollRun } from '@prisma/client';

export interface PayrollValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

@Injectable()
export class PayrollValidationService {
  /**
   * Validate payroll run data before processing
   */
  validatePayrollRun(payrollRun: PayrollRun): PayrollValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate pay period
    if (payrollRun.payPeriodStart >= payrollRun.payPeriodEnd) {
      errors.push('Pay period start date must be before end date');
    }

    // Validate total amount
    if (payrollRun.totalAmount && new Decimal(payrollRun.totalAmount).lt(0)) {
      errors.push('Total amount cannot be negative');
    }

    // Check for future dates
    const today = new Date();
    if (payrollRun.payPeriodEnd > today) {
      warnings.push('Pay period end date is in the future');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate employee data for payroll processing
   */
  validateEmployee(employee: Employee): PayrollValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check employment status
    if (employee.employmentStatus !== 'ACTIVE') {
      warnings.push(`Employee ${employee.employeeNumber} is not active`);
    }

    // Check mandatory fields
    if (!employee.firstName || !employee.lastName) {
      errors.push('Employee name is required');
    }

    if (!employee.hireDate) {
      errors.push('Hire date is required for payroll processing');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate salary calculation inputs
   */
  validateSalaryCalculation(
    basicSalary: number,
    workedHours: number,
    hourlyRate?: number,
  ): PayrollValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (basicSalary < 0) {
      errors.push('Basic salary cannot be negative');
    }

    if (workedHours < 0) {
      errors.push('Worked hours cannot be negative');
    }

    if (workedHours > 24 * 31) {
      warnings.push('Worked hours exceed monthly maximum');
    }

    if (hourlyRate && hourlyRate < 0) {
      errors.push('Hourly rate cannot be negative');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate statutory deductions
   */
  validateStatutoryDeductions(
    grossSalary: number,
    pfAmount: number,
    esicAmount: number,
    tdsAmount: number,
  ): PayrollValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (grossSalary < 0) {
      errors.push('Gross salary cannot be negative');
    }

    if (pfAmount < 0 || esicAmount < 0 || tdsAmount < 0) {
      errors.push('Deduction amounts cannot be negative');
    }

    const totalDeductions = pfAmount + esicAmount + tdsAmount;
    if (totalDeductions > grossSalary) {
      errors.push('Total deductions cannot exceed gross salary');
    }

    // Indian statutory limits
    const pfLimit = Math.min(grossSalary * 0.12, 1800); // 12% or ₹1,800
    if (pfAmount > pfLimit) {
      warnings.push('PF deduction exceeds statutory limit');
    }

    const esicLimit = grossSalary * 0.0075; // 0.75%
    if (esicAmount > esicLimit && grossSalary <= 25000) {
      warnings.push('ESIC deduction exceeds statutory limit');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }
}