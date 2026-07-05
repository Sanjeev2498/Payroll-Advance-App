import { PartialType, ApiPropertyOptional } from '@nestjs/swagger';
import { CreateEmployeeDto, EmploymentStatus } from './create-employee.dto';
import { IsOptional, IsEnum, IsDateString } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateEmployeeDto extends PartialType(CreateEmployeeDto) {
  @ApiPropertyOptional({
    description: 'Employment status',
    enum: EmploymentStatus,
  })
  @IsOptional()
  @IsEnum(EmploymentStatus)
  employmentStatus?: EmploymentStatus;

  @ApiPropertyOptional({
    description: 'Termination date (set when status is TERMINATED)',
    example: '2024-12-31',
  })
  @IsOptional()
  @IsDateString()
  @Transform(({ value }) => (value ? new Date(value) : null))
  terminationDate?: Date;
}
