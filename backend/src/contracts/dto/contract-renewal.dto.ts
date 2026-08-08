import {
  IsString,
  IsOptional,
  IsEnum,
  MaxLength,
  ValidateNested,
  IsDateString,
  IsUUID,
  IsBoolean,
  IsNumber,
  Min,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BillingRatesDto, ServiceDefinitionDto, SLATrackingDto } from './create-contract.dto';

export enum RenewalType {
  AUTOMATIC = 'AUTOMATIC',
  MANUAL = 'MANUAL',
  RENEGOTIATED = 'RENEGOTIATED',
}

export enum RenewalStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  EXECUTED = 'EXECUTED',
  CANCELLED = 'CANCELLED',
}

export class ContractRenewalTermsDto {
  @ApiProperty({
    description: 'New contract duration in months',
    example: 12,
  })
  @IsNumber()
  @Min(1)
  durationMonths: number;

  @ApiProperty({
    description: 'New start date',
    example: '2025-01-01',
  })
  @IsDateString()
  newStartDate: string;

  @ApiProperty({
    description: 'New end date',
    example: '2025-12-31',
  })
  @IsDateString()
  newEndDate: string;

  @ApiPropertyOptional({
    description: 'Updated service definitions',
    type: ServiceDefinitionDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ServiceDefinitionDto)
  updatedServiceDefinitions?: ServiceDefinitionDto;

  @ApiPropertyOptional({
    description: 'Updated billing rates',
    type: BillingRatesDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => BillingRatesDto)
  updatedBillingRates?: BillingRatesDto;

  @ApiPropertyOptional({
    description: 'Updated SLA terms',
    type: SLATrackingDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => SLATrackingDto)
  updatedSLA?: SLATrackingDto;

  @ApiPropertyOptional({
    description: 'Rate increase percentage',
    example: 3.5,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  rateIncreasePercentage?: number;

  @ApiPropertyOptional({
    description: 'Special terms and conditions',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  specialTerms?: string;

  @ApiPropertyOptional({
    description: 'Performance incentives',
  })
  @IsOptional()
  @IsObject()
  performanceIncentives?: {
    qualityBonus?: number;
    slaComplianceBonus?: number;
    costSavingShare?: number;
  };
}

export class InitiateRenewalDto {
  @ApiProperty({
    description: 'Contract ID to renew',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  contractId: string;

  @ApiProperty({
    description: 'Renewal type',
    enum: RenewalType,
  })
  @IsEnum(RenewalType)
  renewalType: RenewalType;

  @ApiPropertyOptional({
    description: 'Renewal justification',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  justification?: string;

  @ApiProperty({
    description: 'Proposed renewal terms',
    type: ContractRenewalTermsDto,
  })
  @ValidateNested()
  @Type(() => ContractRenewalTermsDto)
  proposedTerms: ContractRenewalTermsDto;

  @ApiPropertyOptional({
    description: 'Client notification required',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  clientNotificationRequired?: boolean;

  @ApiPropertyOptional({
    description: 'Management approval required',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  managementApprovalRequired?: boolean;

  @ApiPropertyOptional({
    description: 'Renewal notes',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export class ApproveRenewalDto {
  @ApiProperty({ description: 'Approval decision' })
  @IsBoolean()
  approved: boolean;

  @ApiPropertyOptional({ description: 'Approval comments' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comments?: string;

  @ApiPropertyOptional({ description: 'Modified terms if approval with changes' })
  @IsOptional()
  @ValidateNested()
  @Type(() => ContractRenewalTermsDto)
  modifiedTerms?: ContractRenewalTermsDto;
}