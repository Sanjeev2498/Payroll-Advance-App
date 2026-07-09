import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsString, IsArray, ValidateNested, IsOptional, IsNumber, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

export class ShiftSlotDto {
  @ApiProperty({
    description: 'Time slot (hour)',
    example: '08:00'
  })
  @IsString()
  timeSlot: string;

  @ApiProperty({
    description: 'Required guards for this slot',
    example: 3
  })
  @IsNumber()
  requiredGuards: number;

  @ApiProperty({
    description: 'Assigned guards for this slot',
    example: 2
  })
  @IsNumber()
  assignedGuards: number;

  @ApiProperty({
    description: 'Coverage percentage',
    example: 66.67
  })
  @IsNumber()
  coveragePercentage: number;

  @ApiProperty({
    description: 'Coverage status',
    example: 'understaffed',
    enum: ['optimal', 'understaffed', 'overstaffed', 'critical']
  })
  @IsString()
  status: string;

  @ApiProperty({
    description: 'List of assigned guard names',
    example: ['John Smith', 'Jane Doe']
  })
  @IsArray()
  @IsString({ each: true })
  assignedGuardNames: string[];
}

export class SiteCoverageDto {
  @ApiProperty({
    description: 'Site ID',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @IsUUID()
  siteId: string;

  @ApiProperty({
    description: 'Site name',
    example: 'Central Mall - Main Entrance'
  })
  @IsString()
  siteName: string;

  @ApiProperty({
    description: 'Client name',
    example: 'Central Shopping Mall'
  })
  @IsString()
  clientName: string;

  @ApiProperty({
    description: 'Shift slots for the site',
    type: [ShiftSlotDto]
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ShiftSlotDto)
  shifts: ShiftSlotDto[];

  @ApiProperty({
    description: 'Overall site coverage percentage',
    example: 85.5
  })
  @IsNumber()
  overallCoverage: number;

  @ApiProperty({
    description: 'Site priority level',
    example: 'high',
    enum: ['low', 'medium', 'high', 'critical']
  })
  @IsString()
  priority: string;

  @ApiProperty({
    description: 'Total coverage gaps (hours)',
    example: 12
  })
  @IsNumber()
  totalGaps: number;

  @ApiProperty({
    description: 'Critical gaps (high priority times)',
    example: 2
  })
  @IsNumber()
  criticalGaps: number;
}

export class CoverageHeatmapDto {
  @ApiProperty({
    description: 'Date for the heatmap',
    example: '2024-01-15'
  })
  @IsDateString()
  date: string;

  @ApiProperty({
    description: 'Site coverage data',
    type: [SiteCoverageDto]
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SiteCoverageDto)
  sites: SiteCoverageDto[];

  @ApiProperty({
    description: 'Time slots (hours) for the heatmap',
    example: ['00:00', '01:00', '02:00', '03:00', '04:00', '05:00', '06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00', '23:00']
  })
  @IsArray()
  @IsString({ each: true })
  timeSlots: string[];

  @ApiProperty({
    description: 'Overall coverage statistics',
    example: {
      totalSites: 12,
      optimalCoverage: 8,
      understaffed: 3,
      critical: 1,
      averageCoverage: 87.5
    }
  })
  summary: {
    totalSites: number;
    optimalCoverage: number;
    understaffed: number;
    critical: number;
    averageCoverage: number;
  };
}

export class CoverageGapDto {
  @ApiProperty({
    description: 'Gap ID',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @IsUUID()
  id: string;

  @ApiProperty({
    description: 'Site ID',
    example: '123e4567-e89b-12d3-a456-426614174001'
  })
  @IsUUID()
  siteId: string;

  @ApiProperty({
    description: 'Site name',
    example: 'Central Mall - Main Entrance'
  })
  @IsString()
  siteName: string;

  @ApiProperty({
    description: 'Gap start time',
    example: '14:00'
  })
  @IsString()
  startTime: string;

  @ApiProperty({
    description: 'Gap end time',
    example: '18:00'
  })
  @IsString()
  endTime: string;

  @ApiProperty({
    description: 'Gap duration in hours',
    example: 4
  })
  @IsNumber()
  durationHours: number;

  @ApiProperty({
    description: 'Required guards during gap',
    example: 2
  })
  @IsNumber()
  requiredGuards: number;

  @ApiProperty({
    description: 'Available guards during gap',
    example: 0
  })
  @IsNumber()
  availableGuards: number;

  @ApiProperty({
    description: 'Gap severity',
    example: 'high',
    enum: ['low', 'medium', 'high', 'critical']
  })
  @IsString()
  severity: string;

  @ApiProperty({
    description: 'Impact assessment',
    example: 'High-traffic area during peak hours'
  })
  @IsString()
  impact: string;

  @ApiProperty({
    description: 'Suggested solutions',
    example: ['Overtime assignment', 'Emergency replacement', 'Shift adjustment']
  })
  @IsArray()
  @IsString({ each: true })
  suggestedSolutions: string[];
}

export class CoverageAnalysisDto {
  @ApiProperty({
    description: 'Analysis period',
    example: {
      startDate: '2024-01-01',
      endDate: '2024-01-07'
    }
  })
  period: {
    startDate: string;
    endDate: string;
  };

  @ApiProperty({
    description: 'Coverage heatmap data',
    type: CoverageHeatmapDto
  })
  @ValidateNested()
  @Type(() => CoverageHeatmapDto)
  heatmap: CoverageHeatmapDto;

  @ApiProperty({
    description: 'Identified coverage gaps',
    type: [CoverageGapDto]
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CoverageGapDto)
  gaps: CoverageGapDto[];

  @ApiProperty({
    description: 'Coverage recommendations',
    example: [
      'Consider hiring 2 additional guards for weekend shifts',
      'Redistribute guards from low-priority to high-priority sites during peak hours',
      'Implement flexible scheduling for better coverage'
    ]
  })
  @IsArray()
  @IsString({ each: true })
  recommendations: string[];

  @ApiProperty({
    description: 'Optimization opportunities',
    example: {
      potentialSavings: 15000,
      efficiencyGains: 12.5,
      coverageImprovement: 8.3
    }
  })
  optimization: {
    potentialSavings: number;
    efficiencyGains: number;
    coverageImprovement: number;
  };
}

export class GetCoverageMatrixDto {
  @ApiProperty({
    description: 'Date for coverage analysis',
    example: '2024-01-15',
    required: false
  })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiProperty({
    description: 'Start date for period analysis',
    example: '2024-01-01',
    required: false
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({
    description: 'End date for period analysis',
    example: '2024-01-07',
    required: false
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty({
    description: 'Filter by site ID',
    example: '123e4567-e89b-12d3-a456-426614174001',
    required: false
  })
  @IsOptional()
  @IsUUID()
  siteId?: string;

  @ApiProperty({
    description: 'Filter by client ID',
    example: '123e4567-e89b-12d3-a456-426614174002',
    required: false
  })
  @IsOptional()
  @IsUUID()
  clientId?: string;

  @ApiProperty({
    description: 'Include only gaps above this severity',
    example: 'medium',
    enum: ['low', 'medium', 'high', 'critical'],
    required: false
  })
  @IsOptional()
  @IsString()
  minSeverity?: 'low' | 'medium' | 'high' | 'critical';
}