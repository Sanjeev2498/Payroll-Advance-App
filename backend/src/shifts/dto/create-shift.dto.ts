import {
  IsOptional,
  IsString,
  IsDateString,
  IsEnum,
  IsObject,
  IsArray,
  IsNumber,
  IsBoolean,
  Min,
  Max,
  ValidateNested,
  IsUUID,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum ShiftType {
  REGULAR = 'REGULAR',
  OVERTIME = 'OVERTIME',
  HOLIDAY = 'HOLIDAY',
  EMERGENCY = 'EMERGENCY',
  TRAINING = 'TRAINING',
  MAINTENANCE = 'MAINTENANCE',
}

export enum ShiftStatus {
  DRAFT = 'DRAFT',
  SCHEDULED = 'SCHEDULED',
  CONFIRMED = 'CONFIRMED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  NO_SHOW = 'NO_SHOW',
  NEEDS_COVERAGE = 'NEEDS_COVERAGE',
}

export enum ShiftPriority {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum RecurrenceType {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  BIWEEKLY = 'BIWEEKLY',
  MONTHLY = 'MONTHLY',
  CUSTOM = 'CUSTOM',
}

export class SkillRequirementDto {
  @ApiProperty({ description: 'Required skill name' })
  @IsString()
  skill: string;

  @ApiPropertyOptional({ description: 'Required level (1-10)' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  level?: number;

  @ApiPropertyOptional({ description: 'Is this skill mandatory' })
  @IsOptional()
  @IsBoolean()
  required?: boolean;
}

export class BreakScheduleDto {
  @ApiProperty({ description: 'Break name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Break start time (minutes from shift start)' })
  @IsNumber()
  @Min(0)
  startMinutes: number;

  @ApiProperty({ description: 'Break duration in minutes' })
  @IsNumber()
  @Min(1)
  duration: number;

  @ApiPropertyOptional({ description: 'Is this a paid break' })
  @IsOptional()
  @IsBoolean()
  isPaid?: boolean;
}

export class RecurrencePatternDto {
  @ApiProperty({ description: 'Recurrence type', enum: RecurrenceType })
  @IsEnum(RecurrenceType)
  type: RecurrenceType;

  @ApiPropertyOptional({ description: 'Interval (every X days/weeks/months)' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  interval?: number;

  @ApiPropertyOptional({ description: 'Days of week (0-6, Sunday=0)' })
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  daysOfWeek?: number[];

  @ApiPropertyOptional({ description: 'End date for recurrence' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Number of occurrences' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  occurrences?: number;

  @ApiPropertyOptional({ description: 'Custom pattern configuration' })
  @IsOptional()
  @IsObject()
  customPattern?: any;
}

export class CreateShiftDto {
  @ApiPropertyOptional({
    description: 'Assignment ID if shift is assigned to specific employee',
  })
  @IsOptional()
  @IsUUID()
  assignmentId?: string;

  @ApiProperty({
    description: 'Site ID where shift takes place',
  })
  @IsUUID()
  siteId: string;

  @ApiPropertyOptional({
    description: 'Template ID if shift is created from template',
  })
  @IsOptional()
  @IsUUID()
  templateId?: string;

  @ApiProperty({
    description: 'Shift date',
    example: '2024-01-15',
  })
  @IsDateString()
  shiftDate: string;

  @ApiProperty({
    description: 'Shift start time',
    example: '08:00',
  })
  @IsString()
  startTime: string;

  @ApiProperty({
    description: 'Shift end time',
    example: '16:00',
  })
  @IsString()
  endTime: string;

  @ApiPropertyOptional({
    description: 'Type of shift',
    enum: ShiftType,
    default: ShiftType.REGULAR,
  })
  @IsOptional()
  @IsEnum(ShiftType)
  shiftType?: ShiftType;

  @ApiPropertyOptional({
    description: 'Shift priority level',
    enum: ShiftPriority,
    default: ShiftPriority.NORMAL,
  })
  @IsOptional()
  @IsEnum(ShiftPriority)
  priority?: ShiftPriority;

  @ApiPropertyOptional({
    description: 'Is this a recurring shift',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isRecurring?: boolean;

  @ApiPropertyOptional({
    description: 'Recurrence pattern if isRecurring is true',
    type: RecurrencePatternDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => RecurrencePatternDto)
  recurringPattern?: RecurrencePatternDto;

  @ApiPropertyOptional({
    description: 'Number of staff positions required',
    default: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  coverageRequired?: number;

  @ApiPropertyOptional({
    description: 'Required skills for this shift',
    type: [SkillRequirementDto],
  })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => SkillRequirementDto)
  skillRequirements?: SkillRequirementDto[];

  @ApiPropertyOptional({
    description: 'Additional shift requirements and conditions',
  })
  @IsOptional()
  @IsObject()
  shiftRequirements?: any;

  @ApiPropertyOptional({
    description: 'Break schedule configuration',
    type: [BreakScheduleDto],
  })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => BreakScheduleDto)
  breakSchedule?: BreakScheduleDto[];

  @ApiPropertyOptional({
    description: 'Additional notes and instructions',
  })
  @IsOptional()
  @IsObject()
  notes?: any;
}