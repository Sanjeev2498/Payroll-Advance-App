import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsArray, IsString, IsObject } from 'class-validator';

export class HealthMetricsDto {
  @ApiProperty({ description: 'Staffing level percentage' })
  @IsNumber()
  staffingLevel: number;

  @ApiProperty({ description: 'Attendance rate percentage' })
  @IsNumber()
  attendanceRate: number;

  @ApiProperty({ description: 'Performance score' })
  @IsNumber()
  performanceScore: number;

  @ApiProperty({ description: 'Incident rate per month' })
  @IsNumber()
  incidentRate: number;
}

export class SiteHealthDto {
  @ApiProperty({ description: 'Overall health score percentage' })
  @IsNumber()
  overallHealth: number;

  @ApiProperty({ description: 'Detailed health metrics', type: HealthMetricsDto })
  @IsObject()
  metrics: HealthMetricsDto;

  @ApiProperty({ description: 'List of recommendations', type: [String] })
  @IsArray()
  @IsString({ each: true })
  recommendations: string[];
}