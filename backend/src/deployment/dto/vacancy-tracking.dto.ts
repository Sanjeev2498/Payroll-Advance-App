import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsString, IsArray, ValidateNested, IsOptional, IsNumber, IsDateString, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export class VacancyDto {
  @ApiProperty({
    description: 'Vacancy ID',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @IsUUID()
  id: string;

  @ApiProperty({
    description: 'Site ID where vacancy exists',
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
    description: 'Client name',
    example: 'Central Shopping Mall'
  })
  @IsString()
  clientName: string;

  @ApiProperty({
    description: 'Required role',
    example: 'Security Guard'
  })
  @IsString()
  requiredRole: string;

  @ApiProperty({
    description: 'Vacancy created timestamp',
    example: '2024-01-15T08:00:00Z'
  })
  @IsDateString()
  createdAt: string;

  @ApiProperty({
    description: 'Vacancy priority level',
    example: 'high',
    enum: ['low', 'medium', 'high', 'critical']
  })
  @IsString()
  priority: string;

  @ApiProperty({
    description: 'Vacancy status',
    example: 'open',
    enum: ['open', 'in_progress', 'filled', 'cancelled']
  })
  @IsString()
  status: string;

  @ApiProperty({
    description: 'Shift start time',
    example: '08:00'
  })
  @IsString()
  shiftStart: string;

  @ApiProperty({
    description: 'Shift end time',
    example: '16:00'
  })
  @IsString()
  shiftEnd: string;

  @ApiProperty({
    description: 'Required skills',
    example: ['Access Control', 'CCTV Monitoring', 'First Aid Certified']
  })
  @IsArray()
  @IsString({ each: true })
  requiredSkills: string[];

  @ApiProperty({
    description: 'Vacancy duration in hours',
    example: 24
  })
  @IsNumber()
  durationHours: number;

  @ApiProperty({
    description: 'Expected resolution time',
    example: '2024-01-15T12:00:00Z'
  })
  @IsDateString()
  expectedResolution: string;

  @ApiProperty({
    description: 'Reason for vacancy',
    example: 'Employee called in sick'
  })
  @IsString()
  reason: string;

  @ApiProperty({
    description: 'Impact assessment',
    example: 'High traffic area, security coverage critical'
  })
  @IsString()
  impact: string;

  @ApiProperty({
    description: 'Number of suitable replacement candidates',
    example: 5
  })
  @IsNumber()
  candidateCount: number;

  @ApiProperty({
    description: 'Escalated to management',
    example: false
  })
  @IsBoolean()
  escalated: boolean;

  @ApiProperty({
    description: 'Auto-notification sent',
    example: true
  })
  @IsBoolean()
  notificationSent: boolean;
}

export class VacancyForecastDto {
  @ApiProperty({
    description: 'Forecast date',
    example: '2024-01-20'
  })
  @IsDateString()
  date: string;

  @ApiProperty({
    description: 'Predicted number of vacancies',
    example: 8
  })
  @IsNumber()
  predictedVacancies: number;

  @ApiProperty({
    description: 'Confidence level (0-1)',
    example: 0.85
  })
  @IsNumber()
  confidence: number;

  @ApiProperty({
    description: 'Factors contributing to prediction',
    example: ['Historical sick leave patterns', 'Seasonal trends', 'Upcoming holidays']
  })
  @IsArray()
  @IsString({ each: true })
  factors: string[];

  @ApiProperty({
    description: 'Sites likely to be affected',
    example: [
      { siteId: '123e4567-e89b-12d3-a456-426614174001', siteName: 'Central Mall', probability: 0.7 },
      { siteId: '123e4567-e89b-12d3-a456-426614174002', siteName: 'Downtown Office', probability: 0.5 }
    ]
  })
  affectedSites: Array<{
    siteId: string;
    siteName: string;
    probability: number;
  }>;
}

export class VacancyTrendDto {
  @ApiProperty({
    description: 'Date of the data point',
    example: '2024-01-15'
  })
  @IsDateString()
  date: string;

  @ApiProperty({
    description: 'Number of vacancies on this date',
    example: 12
  })
  @IsNumber()
  vacancyCount: number;

  @ApiProperty({
    description: 'Number of filled vacancies',
    example: 8
  })
  @IsNumber()
  filledCount: number;

  @ApiProperty({
    description: 'Average resolution time in hours',
    example: 6.5
  })
  @IsNumber()
  avgResolutionHours: number;

  @ApiProperty({
    description: 'Critical vacancies count',
    example: 2
  })
  @IsNumber()
  criticalCount: number;
}

export class VacancyAnalyticsDto {
  @ApiProperty({
    description: 'Current active vacancies',
    type: [VacancyDto]
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VacancyDto)
  activeVacancies: VacancyDto[];

  @ApiProperty({
    description: 'Vacancy trend over time',
    type: [VacancyTrendDto]
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VacancyTrendDto)
  trends: VacancyTrendDto[];

  @ApiProperty({
    description: 'Vacancy forecasts',
    type: [VacancyForecastDto]
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VacancyForecastDto)
  forecasts: VacancyForecastDto[];

  @ApiProperty({
    description: 'Summary statistics',
    example: {
      totalActive: 15,
      criticalCount: 3,
      avgResolutionTime: 4.2,
      fillRate: 0.87,
      escalationRate: 0.23
    }
  })
  summary: {
    totalActive: number;
    criticalCount: number;
    avgResolutionTime: number;
    fillRate: number;
    escalationRate: number;
  };

  @ApiProperty({
    description: 'Top vacancy reasons',
    example: [
      { reason: 'Sick leave', count: 8, percentage: 53.3 },
      { reason: 'No-show', count: 4, percentage: 26.7 },
      { reason: 'Emergency leave', count: 3, percentage: 20.0 }
    ]
  })
  topReasons: Array<{
    reason: string;
    count: number;
    percentage: number;
  }>;

  @ApiProperty({
    description: 'Sites with highest vacancy rates',
    example: [
      { siteId: '123e4567-e89b-12d3-a456-426614174001', siteName: 'Central Mall', vacancyRate: 0.25 },
      { siteId: '123e4567-e89b-12d3-a456-426614174002', siteName: 'Downtown Office', vacancyRate: 0.18 }
    ]
  })
  highRiskSites: Array<{
    siteId: string;
    siteName: string;
    vacancyRate: number;
  }>;
}

export class VacancyAlertDto {
  @ApiProperty({
    description: 'Alert ID',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @IsUUID()
  id: string;

  @ApiProperty({
    description: 'Vacancy ID that triggered the alert',
    example: '123e4567-e89b-12d3-a456-426614174001'
  })
  @IsUUID()
  vacancyId: string;

  @ApiProperty({
    description: 'Alert type',
    example: 'critical_vacancy',
    enum: ['new_vacancy', 'unresolved_vacancy', 'critical_vacancy', 'multiple_vacancies', 'forecasted_shortage']
  })
  @IsString()
  alertType: string;

  @ApiProperty({
    description: 'Alert severity',
    example: 'high',
    enum: ['low', 'medium', 'high', 'critical']
  })
  @IsString()
  severity: string;

  @ApiProperty({
    description: 'Alert message',
    example: 'Critical vacancy at Central Mall - Main Entrance requires immediate attention'
  })
  @IsString()
  message: string;

  @ApiProperty({
    description: 'Alert created timestamp',
    example: '2024-01-15T10:30:00Z'
  })
  @IsDateString()
  createdAt: string;

  @ApiProperty({
    description: 'Recipients who should be notified',
    example: ['operations@company.com', 'supervisor@company.com']
  })
  @IsArray()
  @IsString({ each: true })
  recipients: string[];

  @ApiProperty({
    description: 'Alert acknowledged',
    example: false
  })
  @IsBoolean()
  acknowledged: boolean;

  @ApiProperty({
    description: 'Recommended actions',
    example: [
      'Contact emergency replacement pool',
      'Assign overtime to existing guard',
      'Escalate to senior management'
    ]
  })
  @IsArray()
  @IsString({ each: true })
  recommendedActions: string[];
}

export class CreateVacancyDto {
  @ApiProperty({
    description: 'Site ID where vacancy exists',
    example: '123e4567-e89b-12d3-a456-426614174001'
  })
  @IsUUID()
  siteId: string;

  @ApiProperty({
    description: 'Required role',
    example: 'Security Guard'
  })
  @IsString()
  requiredRole: string;

  @ApiProperty({
    description: 'Vacancy priority level',
    example: 'high',
    enum: ['low', 'medium', 'high', 'critical']
  })
  @IsString()
  priority: string;

  @ApiProperty({
    description: 'Shift start time',
    example: '08:00'
  })
  @IsString()
  shiftStart: string;

  @ApiProperty({
    description: 'Shift end time',
    example: '16:00'
  })
  @IsString()
  shiftEnd: string;

  @ApiProperty({
    description: 'Required skills',
    example: ['Access Control', 'CCTV Monitoring']
  })
  @IsArray()
  @IsString({ each: true })
  requiredSkills: string[];

  @ApiProperty({
    description: 'Reason for vacancy',
    example: 'Employee called in sick'
  })
  @IsString()
  reason: string;

  @ApiProperty({
    description: 'Expected resolution time',
    example: '2024-01-15T12:00:00Z'
  })
  @IsDateString()
  expectedResolution: string;

  @ApiProperty({
    description: 'Impact assessment',
    example: 'High traffic area, security coverage critical'
  })
  @IsString()
  impact: string;
}

export class UpdateVacancyStatusDto {
  @ApiProperty({
    description: 'New vacancy status',
    example: 'filled',
    enum: ['open', 'in_progress', 'filled', 'cancelled']
  })
  @IsString()
  status: string;

  @ApiProperty({
    description: 'Status update notes',
    example: 'Filled by John Smith from emergency pool',
    required: false
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({
    description: 'Employee ID who filled the vacancy (if filled)',
    example: '123e4567-e89b-12d3-a456-426614174002',
    required: false
  })
  @IsOptional()
  @IsUUID()
  filledBy?: string;
}