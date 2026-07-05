import {
  IsArray,
  IsDateString,
  IsOptional,
  IsString,
  IsEnum,
  ValidateNested,
  IsUUID,
  IsObject,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CreateShiftDto } from './create-shift.dto';

export class DateRangeDto {
  @ApiProperty({ description: 'Start date (YYYY-MM-DD)' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ description: 'End date (YYYY-MM-DD)' })
  @IsDateString()
  endDate: string;

  @ApiPropertyOptional({ 
    description: 'Days of week (0=Sunday, 1=Monday, etc.)', 
    type: [Number] 
  })
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  daysOfWeek?: number[];
}

export class BulkShiftDto {
  @ApiPropertyOptional({
    description: 'Array of shift data to create individually',
    type: [CreateShiftDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateShiftDto)
  shifts?: CreateShiftDto[];

  @ApiPropertyOptional({
    description: 'Template ID to use for bulk creation',
  })
  @IsOptional()
  @IsUUID()
  templateId?: string;

  @ApiPropertyOptional({
    description: 'Site ID for template-based bulk creation',
  })
  @IsOptional()
  @IsUUID()
  siteId?: string;

  @ApiPropertyOptional({
    description: 'Date range for template-based bulk creation',
  })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => DateRangeDto)
  dateRange?: DateRangeDto;

  @ApiPropertyOptional({
    description: 'Bulk processing options',
  })
  @IsOptional()
  @IsObject()
  options?: {
    skipConflicts?: boolean;
    notifyAssignees?: boolean;
    validateCoverage?: boolean;
  };
}

export class BulkUpdateShiftsDto {
  @ApiProperty({ description: 'Array of shift IDs to update' })
  @IsArray()
  @IsUUID(4, { each: true })
  shiftIds: string[];

  @ApiProperty({ description: 'Update data to apply to all shifts' })
  @IsObject()
  updateData: Partial<CreateShiftDto>;

  @ApiPropertyOptional({ description: 'Update reason and metadata' })
  @IsOptional()
  @IsObject()
  reason?: {
    description: string;
    changedBy: string;
  };
}

export class ShiftSwapRequestDto {
  @ApiProperty({ description: 'Shift ID to swap from' })
  @IsUUID()
  fromShiftId: string;

  @ApiProperty({ description: 'Shift ID to swap to' })
  @IsUUID()
  toShiftId: string;

  @ApiProperty({ description: 'Employee requesting the swap' })
  @IsUUID()
  requestingEmployeeId: string;

  @ApiProperty({ description: 'Employee being asked to swap' })
  @IsUUID()
  targetEmployeeId: string;

  @ApiPropertyOptional({ description: 'Reason for swap request' })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class CoverageRequestDto {
  @ApiProperty({ description: 'Shift ID needing coverage' })
  @IsUUID()
  shiftId: string;

  @ApiProperty({ description: 'Priority level for coverage request' })
  @IsEnum(['LOW', 'NORMAL', 'HIGH', 'URGENT'])
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

  @ApiPropertyOptional({ description: 'Reason coverage is needed' })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({ description: 'Preferred employee skills' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  preferredSkills?: string[];

  @ApiPropertyOptional({ description: 'Additional requirements' })
  @IsOptional()
  @IsObject()
  requirements?: any;
}

export class BulkShiftOperationResultDto {
  @ApiProperty({ description: 'Number of successful operations' })
  successCount: number;

  @ApiProperty({ description: 'Number of failed operations' })
  failureCount: number;

  @ApiProperty({ description: 'List of successfully processed shift IDs' })
  successes: string[];

  @ApiProperty({ description: 'List of failures with error details' })
  failures: Array<{
    shiftId?: string;
    error: string;
    details?: any;
  }>;

  @ApiPropertyOptional({ description: 'Additional operation metadata' })
  metadata?: any;
}
