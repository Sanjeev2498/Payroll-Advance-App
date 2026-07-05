import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional, IsArray, IsNumber } from 'class-validator';

export class EmergencyReplacementDto {
  @ApiProperty({ description: 'Site ID requiring emergency replacement' })
  @IsString()
  siteId: string;

  @ApiProperty({ description: 'Original guard ID being replaced', required: false })
  @IsOptional()
  @IsString()
  originalGuardId?: string;

  @ApiProperty({ description: 'Reason for emergency replacement' })
  @IsString()
  reason: string;

  @ApiProperty({ 
    description: 'Urgency level', 
    enum: ['immediate', 'within_hour', 'within_shift'] 
  })
  @IsEnum(['immediate', 'within_hour', 'within_shift'])
  urgency: 'immediate' | 'within_hour' | 'within_shift';

  @ApiProperty({ 
    description: 'Required skills for replacement guard', 
    type: [String], 
    required: false 
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  requiredSkills?: string[];

  @ApiProperty({ description: 'Minimum experience required in months', required: false })
  @IsOptional()
  @IsNumber()
  minimumExperience?: number;
}