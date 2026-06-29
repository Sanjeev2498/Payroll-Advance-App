import { ApiProperty } from '@nestjs/swagger';
import { PayrollItemType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

export class PayrollCalculationResult {
  @ApiProperty({ description: 'Employee ID' })
  employeeId: string;

  @ApiProperty({ description: 'Employee name' })
  employeeName: string;

  @ApiProperty({ description: 'Total hours worked in the pay period' })
  totalHours: number;

  @ApiProperty({ description: 'Regular hours (non-overtime)' })
  regularHours: number;

  @ApiProperty({ description: 'Overtime hours' })
  overtimeHours: number;

  @ApiProperty({ description: 'Basic pay amount' })
  basicPay: Decimal;

  @ApiProperty({ description: 'Overtime pay amount' })
  overtimePay: Decimal;

  @ApiProperty({ description: 'Total gross salary before deductions' })
  grossSalary: Decimal;

  @ApiProperty({ description: 'Total deductions' })
  totalDeductions: Decimal;

  @ApiProperty({ description: 'Net salary after deductions' })
  netSalary: Decimal;

  @ApiProperty({ description: 'Breakdown of all payroll items' })
  items: PayrollItemCalculation[];
}

export class PayrollItemCalculation {
  @ApiProperty({ description: 'Type of payroll item' })
  itemType: PayrollItemType;

  @ApiProperty({ description: 'Description of the item' })
  description: string;

  @ApiProperty({ description: 'Calculated amount' })
  amount: Decimal;

  @ApiProperty({ description: 'Calculation details and metadata' })
  calculationData: any;
}

export class PayrollSummary {
  @ApiProperty({ description: 'Payroll run ID' })
  payrollRunId: string;

  @ApiProperty({ description: 'Number of employees processed' })
  employeeCount: number;

  @ApiProperty({ description: 'Total gross amount for all employees' })
  totalGrossAmount: Decimal;

  @ApiProperty({ description: 'Total deductions for all employees' })
  totalDeductions: Decimal;

  @ApiProperty({ description: 'Total net amount to be paid' })
  totalNetAmount: Decimal;

  @ApiProperty({ description: 'Employee-wise calculation results' })
  employeeResults: PayrollCalculationResult[];
}