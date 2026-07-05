import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEnum, IsArray, IsOptional } from 'class-validator';

export class AssignmentConflictDto {
  @ApiProperty({ description: 'Conflict unique identifier' })
  @IsString()
  id: string;

  @ApiProperty({ 
    description: 'Type of conflict', 
    enum: ['scheduling', 'skill_mismatch', 'availability', 'double_booking'] 
  })
  @IsEnum(['scheduling', 'skill_mismatch', 'availability', 'double_booking'])
  type: 'scheduling' | 'skill_mismatch' | 'availability' | 'double_booking';

  @ApiProperty({ 
    description: 'Conflict severity level', 
    enum: ['low', 'medium', 'high', 'critical'] 
  })
  @IsEnum(['low', 'medium', 'high', 'critical'])
  severity: 'low' | 'medium' | 'high' | 'critical';

  @ApiProperty({ description: 'Detailed description of the conflict' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'List of affected site names', type: [String] })
  @IsArray()
  @IsString({ each: true })
  affectedSites: string[];

  @ApiProperty({ description: 'List of affected guard names', type: [String] })
  @IsArray()
  @IsString({ each: true })
  affectedGuards: string[];

  @ApiProperty({ description: 'Suggested resolution strategy', required: false })
  @IsOptional()
  @IsString()
  suggestedResolution?: string;

  @ApiProperty({ description: 'Conflict creation timestamp' })
  @IsString()
  createdAt: string;

  @ApiProperty({ description: 'Conflict resolution timestamp', required: false })
  @IsOptional()
  @IsString()
  resolvedAt?: string;
}