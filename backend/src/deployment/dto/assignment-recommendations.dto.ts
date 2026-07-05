import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString, IsNumber, IsObject } from 'class-validator';

export class RecommendedGuardDto {
  @ApiProperty({ description: 'Guard unique identifier' })
  @IsString()
  guardId: string;

  @ApiProperty({ description: 'Guard full name' })
  @IsString()
  guardName: string;

  @ApiProperty({ description: 'Match score percentage' })
  @IsNumber()
  matchScore: number;

  @ApiProperty({ description: 'Guard skills', type: [String] })
  @IsArray()
  @IsString({ each: true })
  skills: string[];

  @ApiProperty({ description: 'Current availability status' })
  @IsString()
  availability: string;

  @ApiProperty({ description: 'Distance from site in kilometers', required: false })
  @IsNumber()
  distance?: number;
}

export class AssignmentRecommendationsDto {
  @ApiProperty({ 
    description: 'List of recommended guards', 
    type: [RecommendedGuardDto] 
  })
  @IsArray()
  @IsObject({ each: true })
  recommendedGuards: RecommendedGuardDto[];
}