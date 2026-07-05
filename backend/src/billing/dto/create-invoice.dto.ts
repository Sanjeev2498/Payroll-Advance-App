import { IsDateString, IsOptional, IsString, IsArray, IsUUID, IsEnum, IsObject } from 'class-validator';
import { Transform } from 'class-transformer';

export enum BillingFrequency {
  WEEKLY = 'WEEKLY',
  BIWEEKLY = 'BIWEEKLY', 
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  CUSTOM = 'CUSTOM'
}

export enum BillingModel {
  HOURLY = 'HOURLY',
  FIXED_RATE = 'FIXED_RATE',
  PERFORMANCE_BASED = 'PERFORMANCE_BASED',
  HYBRID = 'HYBRID'
}

export class CreateInvoiceDto {
  @IsUUID()
  clientId: string;

  @IsOptional()
  @IsString()
  invoiceNumber?: string;

  @IsDateString()
  billingPeriodStart: string;

  @IsDateString()
  billingPeriodEnd: string;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  siteIds?: string[];

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  assignmentIds?: string[];

  @IsOptional()
  @IsEnum(BillingModel)
  billingModel?: BillingModel;

  @IsOptional()
  @IsObject()
  customRates?: {
    [siteId: string]: {
      hourlyRate?: number;
      fixedRate?: number;
      overtimeRate?: number;
      holidayRate?: number;
    };
  };

  @IsOptional()
  @IsObject()
  gstDetails?: {
    companyGstin: string;
    clientGstin?: string;
    placeOfSupply: string; // State code
    isInterState?: boolean;
  };

  @IsOptional()
  @IsObject()
  additionalCharges?: {
    name: string;
    amount: number;
    taxable: boolean;
  }[];

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;
}
