import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString, IsOptional, IsEnum, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class GuardAssignmentRequestDto {
  @ApiProperty({ description: 'Guard ID to assign' })
  @IsString()
  guardId: string;

  @ApiProperty({ description: 'Site ID for assignment' })
  @IsString()
  siteId: string;

  @ApiProperty({ description: 'Assignment start date' })
  @IsString()
  startDate: string;

  @ApiProperty({ description: 'Assignment end date', required: false })
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiProperty({ description: 'Shift pattern for assignment' })
  @IsString()
  shiftPattern: string;

  @ApiProperty({ description: 'Role description' })
  @IsString()
  role: string;

  @ApiProperty({ 
    description: 'Assignment priority level', 
    enum: ['low', 'medium', 'high', 'critical'] 
  })
  @IsEnum(['low', 'medium', 'high', 'critical'])
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export class BulkAssignDto {
  @ApiProperty({ 
    description: 'List of guard assignment requests', 
    type: [GuardAssignmentRequestDto] 
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GuardAssignmentRequestDto)
  assignments: GuardAssignmentRequestDto[];
}