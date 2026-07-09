import {
  IsEmail,
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
  IsUrl,
  Min,
  Max,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsValidDate, IsValidContractDateRange } from '../../common/decorators/date-validation.decorator';

export enum ContractStatus {
  ACTIVE = 'ACTIVE',
  PENDING = 'PENDING',
  EXPIRED = 'EXPIRED',
  TERMINATED = 'TERMINATED',
}

export class ContactInfoDto {
  @ApiProperty({ description: 'Primary contact person name' })
  @IsString()
  @MaxLength(100)
  contactPerson: string;

  @ApiPropertyOptional({ description: 'Primary contact phone number' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiPropertyOptional({ description: 'Secondary contact email' })
  @IsOptional()
  @IsEmail()
  secondaryEmail?: string;

  @ApiPropertyOptional({ description: 'Contact person job title' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  jobTitle?: string;

  @ApiPropertyOptional({ description: 'Department name' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  department?: string;

  @ApiPropertyOptional({ description: 'Company address' })
  @IsOptional()
  @IsObject()
  address?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };

  @ApiPropertyOptional({ description: 'Additional contact notes' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Preferred communication method', example: 'EMAIL' })
  @IsOptional()
  @IsString()
  preferredContactMethod?: string;

  @ApiPropertyOptional({ description: 'Emergency contact information' })
  @IsOptional()
  @IsObject()
  emergencyContact?: {
    name: string;
    phone: string;
    email?: string;
    relationship: string;
  };
}

export class DocumentRequirementDto {
  @ApiProperty({ description: 'Document type', example: 'CONTRACT' })
  @IsString()
  type: string;

  @ApiProperty({ description: 'Document name' })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiProperty({ description: 'Is this document required?', default: true })
  @IsBoolean()
  required: boolean;

  @ApiPropertyOptional({ description: 'Document description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Document template URL' })
  @IsOptional()
  @IsUrl()
  templateUrl?: string;
}

export class BillingPreferencesDto {
  @ApiProperty({ description: 'Billing frequency', example: 'MONTHLY' })
  @IsString()
  frequency: string;

  @ApiPropertyOptional({ description: 'Preferred billing method', example: 'EMAIL' })
  @IsOptional()
  @IsString()
  method?: string;

  @ApiPropertyOptional({ description: 'Payment terms in days', example: 30 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(365)
  paymentTerms?: number;

  @ApiPropertyOptional({ description: 'Billing contact email' })
  @IsOptional()
  @IsEmail()
  billingEmail?: string;

  @ApiPropertyOptional({ description: 'Special billing instructions' })
  @IsOptional()
  @IsString()
  instructions?: string;

  @ApiPropertyOptional({ description: 'Currency code', example: 'USD' })
  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @ApiPropertyOptional({ description: 'Tax rate percentage', example: 18.0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  taxRate?: number;

  @ApiPropertyOptional({ description: 'Billing address' })
  @IsOptional()
  @IsObject()
  billingAddress?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };

  @ApiPropertyOptional({ description: 'Late fee configuration' })
  @IsOptional()
  @IsObject()
  lateFeeConfig?: {
    enabled: boolean;
    percentage?: number;
    flatAmount?: number;
    gracePeriodDays?: number;
  };
}

export class ServiceLevelAgreementDto {
  @ApiProperty({ description: 'SLA type', example: 'STANDARD' })
  @IsString()
  type: string;

  @ApiPropertyOptional({ description: 'Response time in hours', example: 24 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  responseTimeHours?: number;

  @ApiPropertyOptional({ description: 'Resolution time in hours', example: 72 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  resolutionTimeHours?: number;

  @ApiPropertyOptional({ description: 'Uptime guarantee percentage', example: 99.9 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  uptimeGuarantee?: number;

  @ApiPropertyOptional({ description: 'SLA description and terms' })
  @IsOptional()
  @IsString()
  description?: string;
}

export class OnboardingChecklistDto {
  @ApiProperty({ description: 'Checklist item name' })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiProperty({ description: 'Item description' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Is this item required?', default: true })
  @IsBoolean()
  required: boolean;

  @ApiProperty({ description: 'Item category', example: 'DOCUMENTATION' })
  @IsString()
  category: string;

  @ApiPropertyOptional({ description: 'Expected completion days from contract start' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  expectedCompletionDays?: number;
}

export class CreateClientDto {
  @ApiProperty({
    description: 'Client company name',
    example: 'Acme Security Services',
  })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiProperty({
    description: 'Primary contact email address',
    example: 'contact@acmesecurity.com',
  })
  @IsEmail()
  @MaxLength(255)
  contactEmail: string;

  @ApiPropertyOptional({
    description: 'Additional contact information',
    type: ContactInfoDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ContactInfoDto)
  contactInfo?: ContactInfoDto;

  @ApiPropertyOptional({
    description: 'Contract status',
    enum: ContractStatus,
    default: ContractStatus.PENDING,
  })
  @IsOptional()
  @IsEnum(ContractStatus)
  contractStatus?: ContractStatus;

  @ApiPropertyOptional({
    description: 'Contract start date',
    example: '2024-01-01',
  })
  @IsOptional()
  @IsValidDate()
  @IsValidContractDateRange('contractEnd')
  contractStart?: Date;

  @ApiPropertyOptional({
    description: 'Contract end date',
    example: '2024-12-31',
  })
  @IsOptional()
  @IsValidDate()
  contractEnd?: Date;

  @ApiPropertyOptional({
    description: 'Billing preferences and settings',
    type: BillingPreferencesDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => BillingPreferencesDto)
  billingPreferences?: BillingPreferencesDto;

  @ApiPropertyOptional({
    description: 'Industry sector',
    example: 'Manufacturing',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  industry?: string;

  @ApiPropertyOptional({
    description: 'Company size category',
    example: 'MEDIUM',
  })
  @IsOptional()
  @IsString()
  companySize?: string;

  @ApiPropertyOptional({
    description: 'Service level agreement',
    type: ServiceLevelAgreementDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ServiceLevelAgreementDto)
  serviceLevelAgreement?: ServiceLevelAgreementDto;

  @ApiPropertyOptional({
    description: 'Required documents for onboarding',
    type: [DocumentRequirementDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DocumentRequirementDto)
  documentRequirements?: DocumentRequirementDto[];

  @ApiPropertyOptional({
    description: 'Onboarding checklist items',
    type: [OnboardingChecklistDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OnboardingChecklistDto)
  onboardingChecklist?: OnboardingChecklistDto[];

  @ApiPropertyOptional({
    description: 'Contract renewal notification days before expiry',
    example: 90,
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

  @ApiPropertyOptional({
    description: 'Client-specific tags for categorization',
    example: ['high-priority', 'enterprise'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({
    description: 'Account manager user ID',
  })
  @IsOptional()
  @IsString()
  accountManagerId?: string;
}
