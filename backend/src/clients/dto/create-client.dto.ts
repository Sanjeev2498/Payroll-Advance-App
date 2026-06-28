import {
  IsEmail,
  IsString,
  IsOptional,
  IsObject,
  IsDateString,
  IsEnum,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

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
  paymentTerms?: number;

  @ApiPropertyOptional({ description: 'Billing contact email' })
  @IsOptional()
  @IsEmail()
  billingEmail?: string;

  @ApiPropertyOptional({ description: 'Special billing instructions' })
  @IsOptional()
  @IsString()
  instructions?: string;
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
  @IsDateString()
  @Transform(({ value }) => (value ? new Date(value) : null))
  contractStart?: Date;

  @ApiPropertyOptional({
    description: 'Contract end date',
    example: '2024-12-31',
  })
  @IsOptional()
  @IsDateString()
  @Transform(({ value }) => (value ? new Date(value) : null))
  contractEnd?: Date;

  @ApiPropertyOptional({
    description: 'Billing preferences and settings',
    type: BillingPreferencesDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => BillingPreferencesDto)
  billingPreferences?: BillingPreferencesDto;
}
