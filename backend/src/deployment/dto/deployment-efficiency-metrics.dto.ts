import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsEnum, IsArray, IsString, IsObject } from 'class-validator';

export class OptimizationOpportunityDto {
  @ApiProperty({ description: 'Site identifier' })
  @IsString()
  siteId: string;

  @ApiProperty({ description: 'Site name' })
  @IsString()
  siteName: string;

  @ApiProperty({ description: 'Current efficiency percentage' })
  @IsNumber()
  currentEfficiency: number;

  @ApiProperty({ description: 'Potential efficiency percentage' })
  @IsNumber()
  potentialEfficiency: number;

  @ApiProperty({ description: 'List of recommendations', type: [String] })
  @IsArray()
  @IsString({ each: true })
  recommendations: string[];
}

export class ResponseTimeMetricsDto {
  @ApiProperty({ description: 'Average assignment time in minutes' })
  @IsNumber()
  averageAssignmentTime: number;

  @ApiProperty({ description: 'Emergency response time in minutes' })
  @IsNumber()
  emergencyResponseTime: number;

  @ApiProperty({ description: 'Target response time in minutes' })
  @IsNumber()
  targetResponseTime: number;
}

export class CostMetricsDto {
  @ApiProperty({ description: 'Deployment cost per site' })
  @IsNumber()
  deploymentCostPerSite: number;

  @ApiProperty({ description: 'Overtime costs' })
  @IsNumber()
  overtimeCosts: number;

  @ApiProperty({ description: 'Replacement costs' })
  @IsNumber()
  replacementCosts: number;

  @ApiProperty({ description: 'Total monthly cost' })
  @IsNumber()
  totalMonthlyCost: number;
}

export class DeploymentEfficiencyMetricsDto {
  @ApiProperty({ description: 'Average deployment efficiency percentage' })
  @IsNumber()
  averageEfficiency: number;

  @ApiProperty({ 
    description: 'Deployment trend direction', 
    enum: ['up', 'down', 'stable'] 
  })
  @IsEnum(['up', 'down', 'stable'])
  deploymentTrend: 'up' | 'down' | 'stable';

  @ApiProperty({ 
    description: 'List of optimization opportunities', 
    type: [OptimizationOpportunityDto] 
  })
  @IsArray()
  @IsObject({ each: true })
  optimizationOpportunities: OptimizationOpportunityDto[];

  @ApiProperty({ description: 'Response time metrics', type: ResponseTimeMetricsDto })
  @IsObject()
  responseTime: ResponseTimeMetricsDto;

  @ApiProperty({ description: 'Cost metrics', type: CostMetricsDto })
  @IsObject()
  costMetrics: CostMetricsDto;
}