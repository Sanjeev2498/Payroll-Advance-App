import { IsOptional, IsEnum, IsString, IsUUID, IsDateString } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { AssignmentStatus } from '@prisma/client';
import { PaginationDto, SortOrderDto } from '../../common/dto/pagination.dto';

export class AssignmentQueryDto extends PaginationDto {
  @ApiPropertyOptional({
    description: 'Field to sort by',
  })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({
    description: 'Sort order',
    enum: ['asc', 'desc'],
    default: 'desc',
  })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc';

  @ApiPropertyOptional({
    description: 'Search by employee name, site name, or role',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by employee ID',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  employeeId?: string;

  @ApiPropertyOptional({
    description: 'Filter by site ID',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  siteId?: string;

  @ApiPropertyOptional({
    description: 'Filter by assignment status',
    enum: AssignmentStatus,
  })
  @IsOptional()
  @IsEnum(AssignmentStatus)
  status?: AssignmentStatus;

  @ApiPropertyOptional({
    description: 'Filter by role',
  })
  @IsOptional()
  @IsString()
  role?: string;

  @ApiPropertyOptional({
    description: 'Filter assignments starting from this date',
    format: 'date',
  })
  @IsOptional()
  @IsDateString()
  startDateFrom?: string;

  @ApiPropertyOptional({
    description: 'Filter assignments starting until this date',
    format: 'date',
  })
  @IsOptional()
  @IsDateString()
  startDateTo?: string;

  @ApiPropertyOptional({
    description: 'Filter assignments ending from this date',
    format: 'date',
  })
  @IsOptional()
  @IsDateString()
  endDateFrom?: string;

  @ApiPropertyOptional({
    description: 'Filter assignments ending until this date',
    format: 'date',
  })
  @IsOptional()
  @IsDateString()
  endDateTo?: string;

  @ApiPropertyOptional({
    description: 'Filter by required skills (comma-separated)',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value ? value.split(',').map((s: string) => s.trim()) : undefined)
  requiredSkills?: string[];

  @ApiPropertyOptional({
    description: 'Filter by required certifications (comma-separated)',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value ? value.split(',').map((s: string) => s.trim()) : undefined)
  requiredCertifications?: string[];

  @ApiPropertyOptional({
    description: 'Filter by minimum hourly rate',
  })
  @IsOptional()
  @Transform(({ value }) => parseFloat(value))
  minHourlyRate?: number;

  @ApiPropertyOptional({
    description: 'Filter by maximum hourly rate',
  })
  @IsOptional()
  @Transform(({ value }) => parseFloat(value))
  maxHourlyRate?: number;

  @ApiPropertyOptional({
    description: 'Filter by priority level',
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  priority?: number;

  @ApiPropertyOptional({
    description: 'Filter by urgency level',
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  urgency?: number;

  @ApiPropertyOptional({
    description: 'Include inactive assignments',
    default: false,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  includeInactive?: boolean;

  @ApiPropertyOptional({
    description: 'Include completed assignments',
    default: false,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  includeCompleted?: boolean;

  @ApiPropertyOptional({
    description: 'Include cancelled assignments',
    default: false,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  includeCancelled?: boolean;
}