import {
  IsOptional,
  IsString,
  IsDateString,
  IsEnum,
  IsArray,
  IsNumber,
  IsBoolean,
  Min,
  Max,
  IsUUID,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ShiftType, ShiftStatus, ShiftPriority } from './create-shift.dto';

export class ShiftQueryDto {
  @ApiPropertyOptional({ description: 'Search by shift details' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by site ID' })
  @IsOptional()
  @IsUUID()
  siteId?: string;

  @ApiPropertyOptional({ description: 'Filter by assignment ID' })
  @IsOptional()
  @IsUUID()
  assignmentId?: string;

  @ApiPropertyOptional({ description: 'Filter by employee ID' })
  @IsOptional()
  @IsUUID()
  employeeId?: string;

  @ApiPropertyOptional({
    description: 'Filter by shift status',
    enum: ShiftStatus,
  })
  @IsOptional()
  @IsEnum(ShiftStatus)
  status?: ShiftStatus;

  @ApiPropertyOptional({
    description: 'Filter by shift type',
    enum: ShiftType,
  })
  @IsOptional()
  @IsEnum(ShiftType)
  shiftType?: ShiftType;

  @ApiPropertyOptional({
    description: 'Filter by priority level',
    enum: ShiftPriority,
  })
  @IsOptional()
  @IsEnum(ShiftPriority)
  priority?: ShiftPriority;

  @ApiPropertyOptional({ description: 'Filter shifts from date (ISO format)' })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({ description: 'Filter shifts to date (ISO format)' })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional({ description: 'Filter by recurring shifts only' })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  isRecurring?: boolean;

  @ApiPropertyOptional({ description: 'Filter shifts needing coverage' })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  coverageNeeded?: boolean;

  @ApiPropertyOptional({ description: 'Filter by template ID' })
  @IsOptional()
  @IsUUID()
  templateId?: string;

  @ApiPropertyOptional({ description: 'Filter by required skills (comma-separated)' })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value ? value.split(',').map((s: string) => s.trim()) : undefined)
  skillRequirements?: string[];

  @ApiPropertyOptional({ description: 'Minimum coverage required' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Transform(({ value }) => parseInt(value, 10))
  minCoverage?: number;

  @ApiPropertyOptional({ description: 'Maximum coverage required' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Transform(({ value }) => parseInt(value, 10))
  maxCoverage?: number;

  @ApiPropertyOptional({ description: 'Include completed shifts' })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  includeCompleted?: boolean;

  @ApiPropertyOptional({ description: 'Include cancelled shifts' })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  includeCancelled?: boolean;

  @ApiPropertyOptional({
    description: 'Page number (default: 1)',
    default: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Transform(({ value }) => parseInt(value, 10) || 1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Items per page (default: 20, max: 100)',
    default: 20,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  @Transform(({ value }) => parseInt(value, 10) || 20)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Sort by field',
    default: 'shiftDate',
  })
  @IsOptional()
  @IsString()
  sortBy?: string = 'shiftDate';

  @ApiPropertyOptional({
    description: 'Sort order',
    enum: ['asc', 'desc'],
    default: 'asc',
  })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc' = 'asc';

  @ApiPropertyOptional({ description: 'Include shift statistics in response' })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  includeStats?: boolean;

  @ApiPropertyOptional({ description: 'Include assignment details' })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  includeAssignment?: boolean;

  @ApiPropertyOptional({ description: 'Include site details' })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  includeSite?: boolean;
}
