import {
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
  IsUUID,
  IsNumber,
  Min,
  Max,
  IsObject,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum ComplianceStatus {
  COMPLIANT = 'COMPLIANT',
  NON_COMPLIANT = 'NON_COMPLIANT',
  WARNING = 'WARNING',
  UNDER_REVIEW = 'UNDER_REVIEW',
}

export enum ViolationType {
  COVERAGE_SHORTAGE = 'COVERAGE_SHORTAGE',
  LATE_RESPONSE = 'LATE_RESPONSE',
  QUALITY_ISSUE = 'QUALITY_ISSUE',
  ATTENDANCE_ISSUE = 'ATTENDANCE_ISSUE',
  TRAINING_DEFICIENCY = 'TRAINING_DEFICIENCY',
  EQUIPMENT_FAILURE = 'EQUIPMENT_FAILURE',
  OTHER = 'OTHER',
}

export class SLAViolationDto {
  @ApiProperty({ description: 'Violation type', enum: ViolationType })
  @IsEnum(ViolationType)
  type: ViolationType;

  @ApiProperty({ description: 'Violation description' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Severity level (1-5)' })
  @IsNumber()
  @Min(1)
  @Max(5)
  severity: number;

  @ApiProperty({ description: 'Date of violation' })
  @IsDateString()
  violationDate: string;

  @ApiPropertyOptional({ description: 'Site ID where violation occurred' })
  @IsOptional()
  @IsUUID()
  siteId?: string;

  @ApiPropertyOptional({ description: 'Employee ID involved' })
  @IsOptional()
  @IsUUID()
  employeeId?: string;

  @ApiPropertyOptional({ description: 'Financial impact' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  financialImpact?: number;

  @ApiPropertyOptional({ description: 'Corrective actions taken' })
  @IsOptional()
  @IsString()
  correctiveActions?: string;

  @ApiPropertyOptional({ description: 'Resolution date' })
  @IsOptional()
  @IsDateString()
  resolutionDate?: string;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class SLAMetricDto {
  @ApiProperty({ description: 'Metric name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Target value' })
  @IsNumber({ maxDecimalPlaces: 2 })
  target: number;

  @ApiProperty({ description: 'Actual value' })
  @IsNumber({ maxDecimalPlaces: 2 })
  actual: number;

  @ApiProperty({ description: 'Unit of measurement' })
  @IsString()
  unit: string;

  @ApiProperty({ description: 'Compliance status', enum: ComplianceStatus })
  @IsEnum(ComplianceStatus)
  status: ComplianceStatus;

  @ApiPropertyOptional({ description: 'Variance from target' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  variance?: number;

  @ApiPropertyOptional({ description: 'Trend direction' })
  @IsOptional()
  @IsEnum(['IMPROVING', 'DECLINING', 'STABLE'])
  trend?: string;
}

export class CreateSLAComplianceReportDto {
  @ApiProperty({
    description: 'Contract ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  contractId: string;

  @ApiProperty({ description: 'Reporting period start date' })
  @IsDateString()
  periodStart: string;

  @ApiProperty({ description: 'Reporting period end date' })
  @IsDateString()
  periodEnd: string;

  @ApiProperty({
    description: 'Overall compliance status',
    enum: ComplianceStatus,
  })
  @IsEnum(ComplianceStatus)
  overallStatus: ComplianceStatus;

  @ApiProperty({
    description: 'SLA metrics for the period',
    type: [SLAMetricDto],
  })
  @ValidateNested({ each: true })
  @Type(() => SLAMetricDto)
  metrics: SLAMetricDto[];

  @ApiPropertyOptional({
    description: 'SLA violations during the period',
    type: [SLAViolationDto],
  })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => SLAViolationDto)
  violations?: SLAViolationDto[];

  @ApiProperty({ description: 'Overall compliance percentage' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  compliancePercentage: number;

  @ApiPropertyOptional({ description: 'Performance summary' })
  @IsOptional()
  @IsString()
  performanceSummary?: string;

  @ApiPropertyOptional({ description: 'Recommendations for improvement' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  recommendations?: string[];

  @ApiPropertyOptional({ description: 'Financial impact of violations' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  totalFinancialImpact?: number;

  @ApiPropertyOptional({ description: 'Supporting documents' })
  @IsOptional()
  @IsArray()
  @IsObject({ each: true })
  supportingDocuments?: Array<{
    name: string;
    type: string;
    url?: string;
    metadata?: Record<string, any>;
  }>;

  @ApiPropertyOptional({ description: 'Next review date' })
  @IsOptional()
  @IsDateString()
  nextReviewDate?: string;
}

export class SLAComplianceQueryDto {
  @ApiPropertyOptional({ description: 'Start date for compliance data' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date for compliance data' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Compliance status filter', enum: ComplianceStatus })
  @IsOptional()
  @IsEnum(ComplianceStatus)
  status?: ComplianceStatus;

  @ApiPropertyOptional({ description: 'Site ID filter' })
  @IsOptional()
  @IsUUID()
  siteId?: string;

  @ApiPropertyOptional({ description: 'Violation type filter', enum: ViolationType })
  @IsOptional()
  @IsEnum(ViolationType)
  violationType?: ViolationType;

  @ApiPropertyOptional({ description: 'Minimum severity level', minimum: 1, maximum: 5 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  minSeverity?: number;
}