import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsEnum,
  IsObject,
  ValidateNested,
  IsUUID,
  Min,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { 
  ShiftType,
  SkillRequirementDto,
  BreakScheduleDto,
  RecurrencePatternDto 
} from './create-shift.dto';

export class CreateShiftTemplateDto {
  @ApiProperty({
    description: 'Template name',
    example: 'Security Guard - Day Shift',
  })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({
    description: 'Template description',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Site ID if template is site-specific',
  })
  @IsOptional()
  @IsUUID()
  siteId?: string;

  @ApiProperty({
    description: 'Default start time',
    example: '08:00',
  })
  @IsString()
  startTime: string;

  @ApiProperty({
    description: 'Default end time',
    example: '16:00',
  })
  @IsString()
  endTime: string;

  @ApiPropertyOptional({
    description: 'Default shift type',
    enum: ShiftType,
    default: ShiftType.REGULAR,
  })
  @IsOptional()
  @IsEnum(ShiftType)
  shiftType?: ShiftType;

  @ApiPropertyOptional({
    description: 'Default coverage required',
    default: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  coverageRequired?: number;

  @ApiPropertyOptional({
    description: 'Skill requirements for shifts created from this template',
    type: [SkillRequirementDto],
  })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => SkillRequirementDto)
  skillRequirements?: SkillRequirementDto[];

  @ApiPropertyOptional({
    description: 'Additional requirements and conditions',
  })
  @IsOptional()
  @IsObject()
  shiftRequirements?: any;

  @ApiPropertyOptional({
    description: 'Default break schedule',
    type: [BreakScheduleDto],
  })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => BreakScheduleDto)
  breakSchedule?: BreakScheduleDto[];

  @ApiPropertyOptional({
    description: 'Default recurrence pattern',
    type: RecurrencePatternDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => RecurrencePatternDto)
  recurrencePattern?: RecurrencePatternDto;

  @ApiPropertyOptional({
    description: 'Is template active',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateShiftTemplateDto {
  @ApiPropertyOptional({ description: 'Template name' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ description: 'Template description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Site ID' })
  @IsOptional()
  @IsUUID()
  siteId?: string;

  @ApiPropertyOptional({ description: 'Start time' })
  @IsOptional()
  @IsString()
  startTime?: string;

  @ApiPropertyOptional({ description: 'End time' })
  @IsOptional()
  @IsString()
  endTime?: string;

  @ApiPropertyOptional({ description: 'Shift type', enum: ShiftType })
  @IsOptional()
  @IsEnum(ShiftType)
  shiftType?: ShiftType;

  @ApiPropertyOptional({ description: 'Coverage required' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  coverageRequired?: number;

  @ApiPropertyOptional({ description: 'Skill requirements' })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => SkillRequirementDto)
  skillRequirements?: SkillRequirementDto[];

  @ApiPropertyOptional({ description: 'Shift requirements' })
  @IsOptional()
  @IsObject()
  shiftRequirements?: any;

  @ApiPropertyOptional({ description: 'Break schedule' })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => BreakScheduleDto)
  breakSchedule?: BreakScheduleDto[];

  @ApiPropertyOptional({ description: 'Recurrence pattern' })
  @IsOptional()
  @ValidateNested()
  @Type(() => RecurrencePatternDto)
  recurrencePattern?: RecurrencePatternDto;

  @ApiPropertyOptional({ description: 'Is template active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class ShiftTemplateResponseDto {
  @ApiProperty({ description: 'Template ID' })
  id: string;

  @ApiProperty({ description: 'Company ID' })
  companyId: string;

  @ApiProperty({ description: 'Template name' })
  name: string;

  @ApiPropertyOptional({ description: 'Description' })
  description?: string;

  @ApiPropertyOptional({ description: 'Site ID' })
  siteId?: string;

  @ApiProperty({ description: 'Start time' })
  startTime: string;

  @ApiProperty({ description: 'End time' })
  endTime: string;

  @ApiProperty({ description: 'Shift type', enum: ShiftType })
  shiftType: ShiftType;

  @ApiProperty({ description: 'Coverage required' })
  coverageRequired: number;

  @ApiPropertyOptional({ description: 'Skill requirements' })
  skillRequirements?: SkillRequirementDto[];

  @ApiPropertyOptional({ description: 'Shift requirements' })
  shiftRequirements?: any;

  @ApiPropertyOptional({ description: 'Break schedule' })
  breakSchedule?: BreakScheduleDto[];

  @ApiPropertyOptional({ description: 'Recurrence pattern' })
  recurrencePattern?: RecurrencePatternDto;

  @ApiProperty({ description: 'Is active' })
  isActive: boolean;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: string;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: string;

  @ApiPropertyOptional({ description: 'Site details if site-specific' })
  site?: {
    id: string;
    name: string;
    client: {
      id: string;
      name: string;
    };
  };
}