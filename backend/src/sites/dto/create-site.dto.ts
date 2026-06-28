import {
  IsString,
  IsUUID,
  IsOptional,
  IsObject,
  IsEnum,
  MaxLength,
  MinLength,
  ValidateNested,
  IsArray,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum SiteOperationalStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  MAINTENANCE = 'MAINTENANCE',
  SUSPENDED = 'SUSPENDED',
}

export class AddressDto {
  @ApiProperty({ description: 'Street address' })
  @IsString()
  @MaxLength(255)
  street: string;

  @ApiProperty({ description: 'City name' })
  @IsString()
  @MaxLength(100)
  city: string;

  @ApiProperty({ description: 'State or province' })
  @IsString()
  @MaxLength(50)
  state: string;

  @ApiProperty({ description: 'ZIP or postal code' })
  @IsString()
  @MaxLength(20)
  zipCode: string;

  @ApiProperty({ description: 'Country name' })
  @IsString()
  @MaxLength(100)
  country: string;

  @ApiPropertyOptional({ description: 'Geographic coordinates' })
  @IsOptional()
  @IsObject()
  coordinates?: {
    latitude: number;
    longitude: number;
  };

  @ApiPropertyOptional({ description: 'Additional address information' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class AccessRequirementsDto {
  @ApiPropertyOptional({ description: 'Security clearance level required' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  securityClearance?: string;

  @ApiPropertyOptional({ description: 'Required certifications', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  requiredCertifications?: string[];

  @ApiPropertyOptional({ description: 'Access control procedures' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  accessProcedures?: string;

  @ApiPropertyOptional({ description: 'Working hours specification' })
  @IsOptional()
  @IsObject()
  workingHours?: {
    monday?: { start: string; end: string; is24Hour?: boolean };
    tuesday?: { start: string; end: string; is24Hour?: boolean };
    wednesday?: { start: string; end: string; is24Hour?: boolean };
    thursday?: { start: string; end: string; is24Hour?: boolean };
    friday?: { start: string; end: string; is24Hour?: boolean };
    saturday?: { start: string; end: string; is24Hour?: boolean };
    sunday?: { start: string; end: string; is24Hour?: boolean };
  };

  @ApiPropertyOptional({ description: 'Emergency contact procedures' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  emergencyProcedures?: string;

  @ApiPropertyOptional({ description: 'Special instructions for personnel' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  specialInstructions?: string;
}

export class StaffingRequirementsDto {
  @ApiProperty({ description: 'Number of guards needed per shift' })
  @IsNumber()
  @Min(0)
  @Max(100)
  guardsPerShift: number;

  @ApiPropertyOptional({ description: 'Required skills for this site', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  requiredSkills?: string[];

  @ApiPropertyOptional({ description: 'Minimum experience in months' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(600)
  minimumExperience?: number;

  @ApiPropertyOptional({ description: 'Preferred shift pattern' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  shiftPattern?: string;

  @ApiPropertyOptional({ description: 'Additional staffing notes' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export class ContractDetailsDto {
  @ApiProperty({ description: 'Hourly rate for this site' })
  @IsNumber()
  @Min(0)
  hourlyRate: number;

  @ApiPropertyOptional({ description: 'Overtime rate multiplier' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(3)
  overtimeMultiplier?: number;

  @ApiPropertyOptional({ description: 'Holiday rate multiplier' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(3)
  holidayMultiplier?: number;

  @ApiPropertyOptional({ description: 'Service level agreement details' })
  @IsOptional()
  @IsObject()
  serviceLevel?: {
    responseTime?: number; // in minutes
    coverage?: string; // e.g., "24/7", "business hours"
    qualityMetrics?: string[];
  };

  @ApiPropertyOptional({ description: 'Billing frequency for this site' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  billingFrequency?: string;

  @ApiPropertyOptional({ description: 'Contract specific terms' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  terms?: string;
}

export class SiteContactInfoDto {
  @ApiPropertyOptional({ description: 'On-site contact person' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  primaryContact?: string;

  @ApiPropertyOptional({ description: 'Primary contact phone number' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  primaryPhone?: string;

  @ApiPropertyOptional({ description: 'Primary contact email' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  primaryEmail?: string;

  @ApiPropertyOptional({ description: 'Emergency contact person' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  emergencyContact?: string;

  @ApiPropertyOptional({ description: 'Emergency contact phone' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  emergencyPhone?: string;

  @ApiPropertyOptional({ description: 'Site manager information' })
  @IsOptional()
  @IsObject()
  siteManager?: {
    name: string;
    phone?: string;
    email?: string;
    role?: string;
  };
}

export class CreateSiteDto {
  @ApiProperty({
    description: 'Client ID that owns this site',
    example: 'uuid-v4-string',
  })
  @IsUUID(4)
  clientId: string;

  @ApiProperty({
    description: 'Site name or identifier',
    example: 'Downtown Office Building - Main Lobby',
  })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiProperty({
    description: 'Site physical address',
    type: AddressDto,
  })
  @ValidateNested()
  @Type(() => AddressDto)
  address: AddressDto;

  @ApiPropertyOptional({
    description: 'Access requirements and security specifications',
    type: AccessRequirementsDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => AccessRequirementsDto)
  accessRequirements?: AccessRequirementsDto;

  @ApiPropertyOptional({
    description: 'Safety protocols and procedures',
  })
  @IsOptional()
  @IsObject()
  safetyProtocols?: {
    evacuationProcedures?: string;
    hazardMitigation?: string;
    incidentReporting?: string;
    equipmentRequirements?: string[];
    trainingRequirements?: string[];
  };

  @ApiPropertyOptional({
    description: 'Site operational status',
    enum: SiteOperationalStatus,
    default: SiteOperationalStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(SiteOperationalStatus)
  operationalStatus?: SiteOperationalStatus;

  @ApiPropertyOptional({
    description: 'Site contact information',
    type: SiteContactInfoDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => SiteContactInfoDto)
  contactInfo?: SiteContactInfoDto;

  @ApiPropertyOptional({
    description: 'Staffing requirements for this site',
    type: StaffingRequirementsDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => StaffingRequirementsDto)
  staffingRequirements?: StaffingRequirementsDto;

  @ApiPropertyOptional({
    description: 'Contract details and rates',
    type: ContractDetailsDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ContractDetailsDto)
  contractDetails?: ContractDetailsDto;

  @ApiPropertyOptional({
    description: 'Additional metadata and configuration',
  })
  @IsOptional()
  @IsObject()
  metadata?: {
    timezone?: string;
    clientReferences?: string[];
    internalNotes?: string;
    tags?: string[];
  };
}
