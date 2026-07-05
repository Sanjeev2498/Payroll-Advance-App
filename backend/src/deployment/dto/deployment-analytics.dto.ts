import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsObject, IsArray, IsNumber, IsString } from 'class-validator';

export class AnalyticsMetricsDto {
  @ApiProperty({ description: 'Total number of deployments' })
  @IsNumber()
  totalDeployments: number;

  @ApiProperty({ description: 'Number of successful assignments' })
  @IsNumber()
  successfulAssignments: number;

  @ApiProperty({ description: 'Number of emergency replacements' })
  @IsNumber()
  emergencyReplacements: number;

  @ApiProperty({ description: 'Average response time in minutes' })
  @IsNumber()
  averageResponseTime: number;

  @ApiProperty({ description: 'Site coverage rate percentage' })
  @IsNumber()
  siteCoverageRate: number;

  @ApiProperty({ description: 'Guard utilization rate percentage' })
  @IsNumber()
  guardUtilizationRate: number;
}

export class TrendDataDto {
  @ApiProperty({ description: 'Date in YYYY-MM-DD format' })
  @IsString()
  date: string;

  @ApiProperty({ description: 'Number of deployments' })
  @IsNumber()
  deployments: number;

  @ApiProperty({ description: 'Efficiency percentage' })
  @IsNumber()
  efficiency: number;

  @ApiProperty({ description: 'Number of conflicts' })
  @IsNumber()
  conflicts: number;

  @ApiProperty({ description: 'Number of alerts' })
  @IsNumber()
  alerts: number;
}

export class TopPerformingSiteDto {
  @ApiProperty({ description: 'Site identifier' })
  @IsString()
  siteId: string;

  @ApiProperty({ description: 'Site name' })
  @IsString()
  siteName: string;

  @ApiProperty({ description: 'Efficiency percentage' })
  @IsNumber()
  efficiency: number;

  @ApiProperty({ description: 'Attendance rate percentage' })
  @IsNumber()
  attendanceRate: number;
}

export class ImprovementAreaDto {
  @ApiProperty({ description: 'Area needing improvement' })
  @IsString()
  area: string;

  @ApiProperty({ 
    description: 'Impact level', 
    enum: ['high', 'medium', 'low'] 
  })
  @IsEnum(['high', 'medium', 'low'])
  impact: 'high' | 'medium' | 'low';

  @ApiProperty({ description: 'Improvement recommendation' })
  @IsString()
  recommendation: string;

  @ApiProperty({ description: 'Estimated cost savings', required: false })
  @IsNumber()
  estimatedSavings?: number;
}

export class DeploymentAnalyticsDto {
  @ApiProperty({ 
    description: 'Analytics timeframe', 
    enum: ['24h', '7d', '30d'] 
  })
  @IsEnum(['24h', '7d', '30d'])
  timeframe: '24h' | '7d' | '30d';

  @ApiProperty({ description: 'Key metrics', type: AnalyticsMetricsDto })
  @IsObject()
  metrics: AnalyticsMetricsDto;

  @ApiProperty({ description: 'Trend data over time', type: [TrendDataDto] })
  @IsArray()
  @IsObject({ each: true })
  trends: TrendDataDto[];

  @ApiProperty({ description: 'Top performing sites', type: [TopPerformingSiteDto] })
  @IsArray()
  @IsObject({ each: true })
  topPerformingSites: TopPerformingSiteDto[];

  @ApiProperty({ description: 'Areas for improvement', type: [ImprovementAreaDto] })
  @IsArray()
  @IsObject({ each: true })
  improvementAreas: ImprovementAreaDto[];
}