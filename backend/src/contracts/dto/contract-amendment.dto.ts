import {
  IsString,
  IsOptional,
  IsObject,
  IsEnum,
  MaxLength,
  ValidateNested,
  IsDateString,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum AmendmentType {
  RATE_CHANGE = 'RATE_CHANGE',
  SERVICE_MODIFICATION = 'SERVICE_MODIFICATION',
  TERM_EXTENSION = 'TERM_EXTENSION',
  SLA_ADJUSTMENT = 'SLA_ADJUSTMENT',
  BILLING_CHANGE = 'BILLING_CHANGE',
  OTHER = 'OTHER',
}

export enum AmendmentStatus {
  DRAFT = 'DRAFT',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  IMPLEMENTED = 'IMPLEMENTED',
  CANCELLED = 'CANCELLED',
}

export class AmendmentChangeDto {
  @ApiProperty({ description: 'Field or section being changed' })
  @IsString()
  field: string;

  @ApiProperty({ description: 'Previous value' })
  @IsOptional()
  previousValue?: any;

  @ApiProperty({ description: 'New value' })
  newValue: any;

  @ApiPropertyOptional({ description: 'Reason for change' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class CreateContractAmendmentDto {
  @ApiProperty({
    description: 'Contract ID being amended',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  contractId: string;

  @ApiProperty({
    description: 'Amendment type',
    enum: AmendmentType,
  })
  @IsEnum(AmendmentType)
  type: AmendmentType;

  @ApiProperty({
    description: 'Amendment title',
    example: 'Rate Adjustment - Q2 2024',
  })
  @IsString()
  @MaxLength(200)
  title: string;

  @ApiPropertyOptional({
    description: 'Amendment description',
    example: 'Adjusting hourly rates due to market conditions',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiProperty({
    description: 'Effective date of amendment',
    example: '2024-04-01',
  })
  @IsDateString()
  effectiveDate: string;

  @ApiProperty({
    description: 'Changes being made',
    type: [AmendmentChangeDto],
  })
  @ValidateNested({ each: true })
  @Type(() => AmendmentChangeDto)
  changes: AmendmentChangeDto[];

  @ApiPropertyOptional({
    description: 'Justification for amendment',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  justification?: string;

  @ApiPropertyOptional({
    description: 'Financial impact of amendment',
  })
  @IsOptional()
  @IsObject()
  financialImpact?: {
    estimatedAnnualChange?: number;
    oneTimeCharges?: number;
    savings?: number;
    currency?: string;
  };

  @ApiPropertyOptional({
    description: 'Required approvals',
  })
  @IsOptional()
  @IsObject()
  approvals?: {
    clientApprovalRequired: boolean;
    managementApprovalRequired: boolean;
    legalReviewRequired: boolean;
    additionalApprovers?: string[];
  };
}

export class ApproveAmendmentDto {
  @ApiProperty({ description: 'Approval decision', example: true })
  approved: boolean;

  @ApiPropertyOptional({ description: 'Approval comments' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comments?: string;

  @ApiPropertyOptional({ description: 'Conditions for approval' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  conditions?: string;
}