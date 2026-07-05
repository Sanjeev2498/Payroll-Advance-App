import { 
  IsDateString, 
  IsOptional, 
  IsString, 
  IsUUID, 
  IsEnum, 
  IsBoolean,
  IsArray,
  IsObject,
  IsNumber,
  Min,
  Max
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PayrollStatus } from '@prisma/client';

// Base DTO to avoid circular import
export class CreatePayrollRunBaseDto {
  @ApiProperty({
    description: 'Start date of the pay period',
    example: '2024-01-01',
  })
  @IsDateString()
  payPeriodStart: string;

  @ApiProperty({
    description: 'End date of the pay period',
    example: '2024-01-31',
  })
  @IsDateString()
  payPeriodEnd: string;

  @ApiPropertyOptional({
    description: 'Custom run number (if not provided, will be auto-generated)',
    example: 'PAY-2024-01-001',
  })
  @IsOptional()
  @IsString()
  runNumber?: string;

  @ApiPropertyOptional({
    description: 'Filter payroll run to specific employees',
    example: ['550e8400-e29b-41d4-a716-446655440000'],
  })
  @IsOptional()
  @IsUUID('4', { each: true })
  employeeIds?: string[];
}

export class PayrollRunFilterDto {
  @ApiPropertyOptional({
    description: 'Filter by payroll status',
    enum: PayrollStatus,
  })
  @IsOptional()
  @IsEnum(PayrollStatus)
  status?: PayrollStatus;

  @ApiPropertyOptional({
    description: 'Filter by pay period start date (from)',
    example: '2024-01-01',
  })
  @IsOptional()
  @IsDateString()
  payPeriodFrom?: string;

  @ApiPropertyOptional({
    description: 'Filter by pay period end date (to)',
    example: '2024-12-31',
  })
  @IsOptional()
  @IsDateString()
  payPeriodTo?: string;

  @ApiPropertyOptional({
    description: 'Search by run number',
    example: 'PAY-2024-01',
  })
  @IsOptional()
  @IsString()
  runNumber?: string;

  @ApiPropertyOptional({
    description: 'Page number for pagination',
    example: 1,
    default: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    example: 20,
    default: 20,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

export class PayrollRunApprovalDto {
  @ApiProperty({
    description: 'Approval action to take',
    enum: ['approve', 'reject', 'request_changes'],
  })
  @IsEnum(['approve', 'reject', 'request_changes'])
  action: 'approve' | 'reject' | 'request_changes';

  @ApiPropertyOptional({
    description: 'Comments or notes for the approval action',
  })
  @IsOptional()
  @IsString()
  comments?: string;

  @ApiPropertyOptional({
    description: 'List of specific employee payroll items that need attention',
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  flaggedEmployees?: string[];
}

export class PayrollBatchProcessingDto extends CreatePayrollRunBaseDto {
  @ApiPropertyOptional({
    description: 'Enable dry run mode (calculate without saving)',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  dryRun?: boolean = false;

  @ApiPropertyOptional({
    description: 'Skip validation errors and continue processing',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  skipErrors?: boolean = false;

  @ApiPropertyOptional({
    description: 'Send notifications after processing',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  sendNotifications?: boolean = true;

  @ApiPropertyOptional({
    description: 'Processing configuration options',
  })
  @IsOptional()
  @IsObject()
  processingConfig?: {
    batchSize?: number;
    maxRetries?: number;
    timeoutMinutes?: number;
  };
}

export class PayrollRunCorrection {
  @ApiProperty({
    description: 'Employee ID whose payroll needs correction',
  })
  @IsUUID()
  employeeId: string;

  @ApiProperty({
    description: 'Type of correction',
    enum: ['hours', 'rate', 'allowance', 'deduction'],
  })
  @IsEnum(['hours', 'rate', 'allowance', 'deduction'])
  correctionType: 'hours' | 'rate' | 'allowance' | 'deduction';

  @ApiProperty({
    description: 'Original value being corrected',
  })
  originalValue: number;

  @ApiProperty({
    description: 'New corrected value',
  })
  @IsNumber()
  correctedValue: number;

  @ApiProperty({
    description: 'Reason for correction',
  })
  @IsString()
  reason: string;

  @ApiPropertyOptional({
    description: 'Additional metadata for the correction',
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class PayrollRunCorrectionDto {
  @ApiProperty({
    description: 'List of corrections to apply',
    type: [PayrollRunCorrection],
  })
  @IsArray()
  corrections: PayrollRunCorrection[];

  @ApiProperty({
    description: 'Reason for bulk corrections',
  })
  @IsString()
  correctionReason: string;

  @ApiPropertyOptional({
    description: 'Whether to recalculate dependent items automatically',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  recalculateDependents?: boolean = true;
}

export class PayrollExportDto {
  @ApiProperty({
    description: 'Export format',
    enum: ['pdf', 'excel', 'csv', 'json'],
  })
  @IsEnum(['pdf', 'excel', 'csv', 'json'])
  format: 'pdf' | 'excel' | 'csv' | 'json';

  @ApiPropertyOptional({
    description: 'Include detailed breakdown per employee',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  includeDetails?: boolean = true;

  @ApiPropertyOptional({
    description: 'Include calculation metadata',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  includeCalculations?: boolean = false;

  @ApiPropertyOptional({
    description: 'Filter specific employees for export',
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  employeeIds?: string[];

  @ApiPropertyOptional({
    description: 'Custom template for export formatting',
  })
  @IsOptional()
  @IsString()
  templateId?: string;
}

// Response interfaces
export interface PayrollRunProcessingResult {
  success: boolean;
  payrollRunId: string;
  processedEmployees: number;
  errors: PayrollProcessingError[];
  summary: any; // Use PayrollSummary from existing DTO
}

export interface PayrollProcessingError {
  employeeId: string;
  employeeName: string;
  error: string;
  errorCode: string;
}

export interface PayrollRunWithDetails {
  id: string;
  companyId: string;
  runNumber: string;
  payPeriodStart: Date;
  payPeriodEnd: Date;
  status: string;
  totalAmount: any; // Decimal
  processedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  payrollItems: any[];
  _count: {
    payrollItems: number;
  };
  approvalHistory?: any[];
  correctionHistory?: any[];
}
