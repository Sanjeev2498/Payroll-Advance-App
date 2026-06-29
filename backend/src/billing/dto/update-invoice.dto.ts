import { PartialType } from '@nestjs/mapped-types';
import { IsEnum, IsOptional, IsDateString, IsString } from 'class-validator';
import { CreateInvoiceDto } from './create-invoice.dto';
import { InvoiceStatus } from '@prisma/client';

export class UpdateInvoiceDto extends PartialType(CreateInvoiceDto) {
  @IsOptional()
  @IsEnum(InvoiceStatus)
  status?: InvoiceStatus;

  @IsOptional()
  @IsDateString()
  paidAt?: string;

  @IsOptional()
  @IsString()
  paymentReference?: string;

  @IsOptional()
  @IsString()
  cancelReason?: string;
}