import { PartialType } from '@nestjs/swagger';
import { CreateClientDto, ContractStatus, ContactInfoDto, BillingPreferencesDto } from './create-client.dto';
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
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateClientDto extends PartialType(CreateClientDto) {
  // All properties from CreateClientDto are now optional
  // This allows partial updates to client records

  @ApiPropertyOptional({ 
    description: 'Client company name',
    example: 'Acme Security Services'
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ 
    description: 'Primary contact email address',
    example: 'contact@acmesecurity.com'
  })
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  contactEmail?: string;

  @ApiPropertyOptional({ 
    description: 'Additional contact information',
    type: ContactInfoDto
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ContactInfoDto)
  contactInfo?: ContactInfoDto;

  @ApiPropertyOptional({ 
    description: 'Contract status',
    enum: ContractStatus
  })
  @IsOptional()
  @IsEnum(ContractStatus)
  contractStatus?: ContractStatus;

  @ApiPropertyOptional({ 
    description: 'Contract start date',
    example: '2024-01-01'
  })
  @IsOptional()
  @IsDateString()
  @Transform(({ value }) => value ? new Date(value) : null)
  contractStart?: Date;

  @ApiPropertyOptional({ 
    description: 'Contract end date',
    example: '2024-12-31'
  })
  @IsOptional()
  @IsDateString()
  @Transform(({ value }) => value ? new Date(value) : null)
  contractEnd?: Date;

  @ApiPropertyOptional({ 
    description: 'Billing preferences and settings',
    type: BillingPreferencesDto
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => BillingPreferencesDto)
  billingPreferences?: BillingPreferencesDto;
}