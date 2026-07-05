import { IsDateString, IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePayrollRunDto {
  @ApiProperty({
    description: 'Start date of the pay period',
    example: '2024-01-01',
  })
  @IsDateString()
  payPeriodStart: string;

  @ApiProperty({
    description: 'End date of the pay period',
    example: '2024-01-31',
  })
  @IsDateString()
  payPeriodEnd: string;

  @ApiPropertyOptional({
    description: 'Custom run number (if not provided, will be auto-generated)',
    example: 'PAY-2024-01-001',
  })
  @IsOptional()
  @IsString()
  runNumber?: string;

  @ApiPropertyOptional({
    description: 'Filter payroll run to specific employees',
    example: ['550e8400-e29b-41d4-a716-446655440000'],
  })
  @IsOptional()
  @IsUUID('4', { each: true })
  employeeIds?: string[];
}
