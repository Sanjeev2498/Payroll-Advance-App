import { PartialType } from '@nestjs/swagger';
import {
  CreateSiteDto,
  SiteOperationalStatus,
  AddressDto,
  AccessRequirementsDto,
  StaffingRequirementsDto,
  ContractDetailsDto,
  SiteContactInfoDto,
} from './create-site.dto';
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
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateSiteDto extends PartialType(CreateSiteDto) {
  // All properties from CreateSiteDto are now optional
  // This allows partial updates to site records

  @ApiPropertyOptional({
    description: 'Client ID that owns this site',
    example: 'uuid-v4-string',
  })
  @IsOptional()
  @IsUUID(4)
  clientId?: string;

  @ApiPropertyOptional({
    description: 'Site name or identifier',
    example: 'Downtown Office Building - Main Lobby',
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({
    description: 'Site physical address',
    type: AddressDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => AddressDto)
  address?: AddressDto;

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
