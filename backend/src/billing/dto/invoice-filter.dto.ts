import { IsOptional, IsEnum, IsUUID, IsDateString, IsString, IsInt, Min } from 'class-validator';
import { Transform } from 'class-transformer';
import { InvoiceStatus } from '@prisma/client';

export class InvoiceFilterDto {
  @IsOptional()
  @IsUUID()
  clientId?: string;

  @IsOptional()
  @IsEnum(InvoiceStatus)
  status?: InvoiceStatus;

  @IsOptional()
  @IsDateString()
  billingPeriodStart?: string;

  @IsOptional()
  @IsDateString()  
  billingPeriodEnd?: string;

  @IsOptional()
  @IsDateString()
  dueDateStart?: string;

  @IsOptional()
  @IsDateString()
  dueDateEnd?: string;

  @IsOptional()
  @IsString()
  invoiceNumber?: string;

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt()
  @Min(1)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  sortBy?: 'createdAt' | 'dueDate' | 'totalAmount' | 'invoiceNumber' = 'createdAt';

  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc' = 'desc';
}