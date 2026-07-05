import {
  IsOptional,
  IsString,
  IsArray,
  IsEnum,
  IsDateString,
  IsInt,
  Min,
  Max,
  IsIn,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { EmploymentStatus } from './create-employee.dto';

export class EmployeeQueryDto {
  @ApiPropertyOptional({
    description: 'Search by name, email, or employee number',
    example: 'John Doe',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by employment status',
    enum: EmploymentStatus,
  })
  @IsOptional()
  @IsEnum(EmploymentStatus)
  employmentStatus?: EmploymentStatus;

  @ApiPropertyOptional({
    description: 'Filter by skills (comma-separated)',
    example: 'security,patrol,surveillance',
  })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.split(',') : value))
  @IsArray()
  @IsString({ each: true })
  skills?: string[];

  @ApiPropertyOptional({
    description: 'Filter by department',
    example: 'Security Operations',
  })
  @IsOptional()
  @IsString()
  department?: string;

  @ApiPropertyOptional({
    description: 'Filter by job title',
    example: 'Security Guard',
  })
  @IsOptional()
  @IsString()
  jobTitle?: string;

  @ApiPropertyOptional({
    description: 'Filter by hire date from (ISO date)',
    example: '2024-01-01',
  })
  @IsOptional()
  @IsDateString()
  hireDateFrom?: string;

  @ApiPropertyOptional({
    description: 'Filter by hire date to (ISO date)',
    example: '2024-12-31',
  })
  @IsOptional()
  @IsDateString()
  hireDateTo?: string;

  @ApiPropertyOptional({
    description: 'Filter by availability status',
    enum: ['AVAILABLE', 'UNAVAILABLE', 'PARTIALLY_AVAILABLE'],
  })
  @IsOptional()
  @IsIn(['AVAILABLE', 'UNAVAILABLE', 'PARTIALLY_AVAILABLE'])
  availabilityStatus?: string;

  @ApiPropertyOptional({
    description: 'Filter by certification expiring before date',
    example: '2024-06-30',
  })
  @IsOptional()
  @IsDateString()
  certificationExpiringBefore?: string;

  @ApiPropertyOptional({
    description: 'Filter by compliance status',
    enum: ['COMPLIANT', 'NON_COMPLIANT', 'PENDING'],
  })
  @IsOptional()
  @IsIn(['COMPLIANT', 'NON_COMPLIANT', 'PENDING'])
  complianceStatus?: string;

  @ApiPropertyOptional({
    description: 'Page number (default: 1)',
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Items per page (default: 20, max: 100)',
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Sort by field',
    enum: ['firstName', 'lastName', 'employeeNumber', 'hireDate', 'createdAt'],
  })
  @IsOptional()
  @IsIn(['firstName', 'lastName', 'employeeNumber', 'hireDate', 'createdAt'])
  sortBy?: string = 'lastName';

  @ApiPropertyOptional({
    description: 'Sort order',
    enum: ['asc', 'desc'],
  })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'asc';
}

export class EmployeeSearchDto {
  @ApiPropertyOptional({
    description: 'Required skills for assignment matching',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  requiredSkills?: string[];

  @ApiPropertyOptional({
    description: 'Location for proximity-based search',
  })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({
    description: 'Maximum distance in kilometers',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  maxDistance?: number;

  @ApiPropertyOptional({
    description: 'Available from date (ISO format)',
    example: '2024-01-15T09:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  availableFrom?: string;

  @ApiPropertyOptional({
    description: 'Available until date (ISO format)',
    example: '2024-01-15T17:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  availableUntil?: string;

  @ApiPropertyOptional({
    description: 'Minimum performance rating (1-5)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  minPerformanceRating?: number;
}

export class DocumentQueryDto {
  @ApiPropertyOptional({
    description: 'Document type filter',
    enum: ['LICENSE', 'CERTIFICATE', 'ID_COPY', 'TRAINING_RECORD', 'OTHER'],
  })
  @IsOptional()
  @IsIn(['LICENSE', 'CERTIFICATE', 'ID_COPY', 'TRAINING_RECORD', 'OTHER'])
  documentType?: string;

  @ApiPropertyOptional({
    description: 'Document status filter',
    enum: ['VALID', 'EXPIRED', 'PENDING_REVIEW', 'REJECTED'],
  })
  @IsOptional()
  @IsIn(['VALID', 'EXPIRED', 'PENDING_REVIEW', 'REJECTED'])
  status?: string;
}
