import {
  IsString,
  IsOptional,
  IsObject,
  IsEnum,
  MaxLength,
  MinLength,
  ValidateNested,
  IsArray,
  IsNumber,
  IsBoolean,
  IsDecimal,
  Min,
  Max,
  IsDateString,
  IsUUID,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ContractStatus } from '@prisma/client';

export class ServiceDefinitionDto {
  @ApiProperty({ description: 'Required guard count', example: 3 })
  @IsNumber()
  @Min(1)
  guardCount: number;

  @ApiPropertyOptional({ description: 'Minimum staffing level', example: 2 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  minStaffingLevel?: number;

  @ApiPropertyOptional({ description: 'Maximum staffing level', example: 5 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxStaffingLevel?: number;

  @ApiPropertyOptional({ description: 'Shift patterns configuration' })
  @IsOptional()
  @IsObject()
  shiftPatterns?: {
    [key: string]: {
      startTime: string;
      endTime: string;
      duration: number;
      breakTime?: number;
      overtimeThreshold?: number;
    };
  };

  @ApiPropertyOptional({ description: 'Supervisor requirements' })
  @IsOptional()
  @IsObject()
  supervisorRequirements?: {
    required: boolean;
    ratio?: number; // Guards per supervisor
    qualifications?: string[];
    responsibilities?: string[];
  };

  @ApiPropertyOptional({ description: 'Coverage specifications' })
  @IsOptional()
  @IsObject()
  coverageSpecifications?: {
    coverage24x7: boolean;
    weekendCoverage: boolean;
    holidayCoverage: boolean;
    emergencyResponse: boolean;
    responseTimeMinutes?: number;
    specialRequirements?: string[];
  };

  @ApiPropertyOptional({ description: 'Required skills and certifications' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  requiredSkills?: string[];

  @ApiPropertyOptional({ description: 'Equipment and uniforms' })
  @IsOptional()
  @IsObject()
  equipment?: {
    uniformRequired: boolean;
    equipmentProvided: string[];
    clientProvidedEquipment?: string[];
  };
}

export class BillingRatesDto {
  @ApiProperty({ description: 'Regular hourly rate', example: 25.00 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  regularHourlyRate: number;

  @ApiPropertyOptional({ description: 'Overtime hourly rate', example: 37.50 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  overtimeHourlyRate?: number;

  @ApiPropertyOptional({ description: 'Holiday hourly rate', example: 50.00 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  holidayHourlyRate?: number;

  @ApiPropertyOptional({ description: 'Weekend hourly rate', example: 30.00 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  weekendHourlyRate?: number;

  @ApiPropertyOptional({ description: 'Night shift differential', example: 5.00 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  nightShiftDifferential?: number;

  @ApiPropertyOptional({ description: 'Overtime multiplier', example: 1.5 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  overtimeMultiplier?: number;

  @ApiPropertyOptional({ description: 'Holiday multiplier', example: 2.0 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  holidayMultiplier?: number;

  @ApiPropertyOptional({ description: 'Currency code', example: 'INR' })
  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;
}

export class BillingConfigurationDto {
  @ApiProperty({ description: 'Billing frequency', example: 'MONTHLY' })
  @IsString()
  @IsEnum(['WEEKLY', 'BIWEEKLY', 'MONTHLY', 'QUARTERLY'])
  billingFrequency: string;

  @ApiProperty({ description: 'Billing rates', type: BillingRatesDto })
  @ValidateNested()
  @Type(() => BillingRatesDto)
  rates: BillingRatesDto;

  @ApiPropertyOptional({ description: 'Payment terms in days', example: 30 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(365)
  paymentTerms?: number;

  @ApiPropertyOptional({ description: 'Late payment fee percentage', example: 1.5 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  lateFeePercentage?: number;

  @ApiPropertyOptional({ description: 'Invoice generation day of month', example: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(28)
  invoiceGenerationDay?: number;

  @ApiPropertyOptional({ description: 'Automatic invoice generation enabled', default: true })
  @IsOptional()
  @IsBoolean()
  autoInvoiceGeneration?: boolean;

  @ApiPropertyOptional({ description: 'Tax rate percentage', example: 8.25 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  taxRate?: number;

  @ApiPropertyOptional({ description: 'Discount percentage', example: 5.00 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  discountPercentage?: number;
}

export class SLATrackingDto {
  @ApiPropertyOptional({ description: 'Response time SLA in minutes', example: 30 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  responseTimeSLA?: number;

  @ApiPropertyOptional({ description: 'Coverage percentage target', example: 99.5 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  coverageTarget?: number;

  @ApiPropertyOptional({ description: 'Attendance accuracy target percentage', example: 98.0 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  attendanceAccuracyTarget?: number;

  @ApiPropertyOptional({ description: 'Quality metrics tracking' })
  @IsOptional()
  @IsObject()
  qualityMetrics?: {
    customerSatisfactionTarget?: number;
    incidentResponseTime?: number;
    trainingCompletionRate?: number;
    uniformComplianceRate?: number;
  };

  @ApiPropertyOptional({ description: 'Penalty structure for SLA violations' })
  @IsOptional()
  @IsObject()
  penaltyStructure?: {
    enabled: boolean;
    coveragePenalty?: number; // Percentage reduction per violation
    responsePenalty?: number;
    qualityPenalty?: number;
    maxPenaltyPercentage?: number;
  };

  @ApiPropertyOptional({ description: 'Reporting frequency for SLA metrics', example: 'WEEKLY' })
  @IsOptional()
  @IsString()
  @IsEnum(['DAILY', 'WEEKLY', 'MONTHLY'])
  reportingFrequency?: string;
}

export class CreateContractDto {
  @ApiProperty({
    description: 'Client ID that this contract belongs to',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  clientId: string;

  @ApiProperty({
    description: 'Contract title',
    example: 'Security Services Agreement - Main Campus',
  })
  @IsString()
  @MinLength(5)
  @MaxLength(200)
  title: string;

  @ApiPropertyOptional({
    description: 'Detailed contract description',
    example: 'Comprehensive security services for the main corporate campus including 24/7 guard coverage',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiProperty({
    description: 'Contract status',
    enum: ContractStatus,
    default: ContractStatus.ACTIVE,
  })
  @IsEnum(ContractStatus)
  status: ContractStatus;

  @ApiProperty({
    description: 'Contract start date',
    example: '2024-01-01',
  })
  @IsDateString()
  startDate: string;

  @ApiPropertyOptional({
    description: 'Contract end date',
    example: '2024-12-31',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty({
    description: 'Service definitions including guard count, shift patterns, and coverage specifications',
    type: ServiceDefinitionDto,
  })
  @ValidateNested()
  @Type(() => ServiceDefinitionDto)
  serviceDefinitions: ServiceDefinitionDto;

  @ApiPropertyOptional({
    description: 'Service level agreement specifications',
    type: SLATrackingDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => SLATrackingDto)
  serviceLevelAgreement?: SLATrackingDto;

  @ApiProperty({
    description: 'Billing configuration including rates and frequency',
    type: BillingConfigurationDto,
  })
  @ValidateNested()
  @Type(() => BillingConfigurationDto)
  billingConfiguration: BillingConfigurationDto;

  @ApiPropertyOptional({
    description: 'Default billing rates (fallback)',
    type: BillingRatesDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => BillingRatesDto)
  defaultBillingRates?: BillingRatesDto;

  @ApiPropertyOptional({
    description: 'Contract value (total expected value)',
    example: 500000.00,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  contractValue?: number;

  @ApiPropertyOptional({
    description: 'Payment terms and conditions',
  })
  @IsOptional()
  @IsObject()
  paymentTerms?: {
    paymentMethod?: string;
    paymentSchedule?: string;
    earlyPaymentDiscount?: number;
    latePaymentFee?: number;
    billingCycle?: string;
  };

  @ApiPropertyOptional({
    description: 'Contract renewal notification days before expiry',
    example: 90,
    default: 90,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(365)
  renewalNotificationDays?: number;

  @ApiPropertyOptional({
    description: 'Auto-renewal enabled',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  autoRenewalEnabled?: boolean;
}