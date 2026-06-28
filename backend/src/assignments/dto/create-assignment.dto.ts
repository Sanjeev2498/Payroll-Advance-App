import {
  IsUUID,
  IsString,
  IsOptional,
  IsDateString,
  IsDecimal,
  IsEnum,
  IsArray,
  ValidateNested,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AssignmentStatus } from '@prisma/client';

export class ShiftPatternDto {
  @ApiProperty({
    description: 'Day of week (0-6, where 0 is Sunday)',
    minimum: 0,
    maximum: 6,
  })
  @IsNumber()
  @Min(0)
  @Max(6)
  dayOfWeek: number;

  @ApiProperty({
    description: 'Start time in HH:MM format',
    example: '08:00',
  })
  @IsString()
  startTime: string;

  @ApiProperty({
    description: 'End time in HH:MM format',
    example: '17:00',
  })
  @IsString()
  endTime: string;

  @ApiPropertyOptional({
    description: 'Break duration in minutes',
    example: 60,
  })
  @IsOptional()
  @IsNumber()
  breakDuration?: number;
}

export class AssignmentResponsibilityDto {
  @ApiProperty({
    description: 'Name of the responsibility',
    example: 'Gate Security',
  })
  @IsString()
  name: string;

  @ApiPropertyOptional({
    description: 'Description of the responsibility',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Priority level (1-5)',
    minimum: 1,
    maximum: 5,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  priority?: number;

  @ApiPropertyOptional({
    description: 'Required skills for this responsibility',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  requiredSkills?: string[];
}

export class CreateAssignmentDto {
  @ApiProperty({
    description: 'Employee ID to be assigned',
    format: 'uuid',
  })
  @IsUUID()
  employeeId: string;

  @ApiProperty({
    description: 'Site ID for the assignment',
    format: 'uuid',
  })
  @IsUUID()
  siteId: string;

  @ApiProperty({
    description: 'Role for the assignment',
    example: 'Security Guard',
  })
  @IsString()
  role: string;

  @ApiPropertyOptional({
    description: 'Detailed responsibilities for the assignment',
    type: [AssignmentResponsibilityDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AssignmentResponsibilityDto)
  responsibilities?: AssignmentResponsibilityDto[];

  @ApiProperty({
    description: 'Hourly rate for the assignment',
    type: 'number',
    format: 'decimal',
    example: 25.50,
  })
  @IsDecimal({ decimal_digits: '0,2' })
  @Transform(({ value }) => parseFloat(value))
  hourlyRate: number;

  @ApiPropertyOptional({
    description: 'Assignment status',
    enum: AssignmentStatus,
    default: AssignmentStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(AssignmentStatus)
  status?: AssignmentStatus;

  @ApiProperty({
    description: 'Assignment start date',
    format: 'date',
    example: '2024-01-15',
  })
  @IsDateString()
  startDate: string;

  @ApiPropertyOptional({
    description: 'Assignment end date',
    format: 'date',
    example: '2024-12-31',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Shift patterns for recurring assignments',
    type: [ShiftPatternDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ShiftPatternDto)
  shiftPatterns?: ShiftPatternDto[];

  @ApiPropertyOptional({
    description: 'Assignment priority level (1-5)',
    minimum: 1,
    maximum: 5,
    default: 3,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  priority?: number;

  @ApiPropertyOptional({
    description: 'Urgency level (1-5)',
    minimum: 1,
    maximum: 5,
    default: 3,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  urgency?: number;

  @ApiPropertyOptional({
    description: 'Required certifications for this assignment',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  requiredCertifications?: string[];

  @ApiPropertyOptional({
    description: 'Required skills for this assignment',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  requiredSkills?: string[];

  @ApiPropertyOptional({
    description: 'Assignment notes and special instructions',
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({
    description: 'Additional metadata for the assignment',
  })
  @IsOptional()
  metadata?: any;
}