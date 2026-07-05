import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsArray, IsString, IsOptional } from 'class-validator';

export class UpdateSiteRequirementsDto {
  @ApiProperty({ description: 'Number of required guards' })
  @IsNumber()
  requiredGuards: number;

  @ApiProperty({ description: 'Required skills', type: [String] })
  @IsArray()
  @IsString({ each: true })
  skills: string[];

  @ApiProperty({ description: 'Shift pattern' })
  @IsString()
  shiftPattern: string;

  @ApiProperty({ description: 'Minimum experience required in months', required: false })
  @IsOptional()
  @IsNumber()
  minimumExperience?: number;
}