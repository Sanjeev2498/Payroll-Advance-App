import { IsUUID, IsOptional, IsArray, IsDateString, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AssignmentResponseDto } from './assignment-response.dto';

export enum ConflictType {
  EMPLOYEE_DOUBLE_BOOKING = 'EMPLOYEE_DOUBLE_BOOKING',
  SITE_CAPACITY_EXCEEDED = 'SITE_CAPACITY_EXCEEDED',
  SKILL_MISMATCH = 'SKILL_MISMATCH',
  CERTIFICATION_EXPIRED = 'CERTIFICATION_EXPIRED',
  CERTIFICATION_MISSING = 'CERTIFICATION_MISSING',
  EMPLOYEE_UNAVAILABLE = 'EMPLOYEE_UNAVAILABLE',
  SITE_ACCESS_RESTRICTION = 'SITE_ACCESS_RESTRICTION',
  COMPLIANCE_VIOLATION = 'COMPLIANCE_VIOLATION',
  SHIFT_OVERLAP = 'SHIFT_OVERLAP',
  WORKLOAD_EXCEEDED = 'WORKLOAD_EXCEEDED',
  DISTANCE_CONSTRAINT = 'DISTANCE_CONSTRAINT',
  BUDGET_EXCEEDED = 'BUDGET_EXCEEDED'
}

export enum ConflictSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export class ConflictDetectionRequestDto {
  @ApiPropertyOptional({
    description: 'Employee ID to check conflicts for',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  employeeId?: string;

  @ApiPropertyOptional({
    description: 'Site ID to check conflicts for',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  siteId?: string;

  @ApiPropertyOptional({
    description: 'Assignment ID to check conflicts for (when updating)',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  assignmentId?: string;

  @ApiPropertyOptional({
    description: 'Start date for conflict check',
    format: 'date',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'End date for conflict check',
    format: 'date',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Role for the assignment',
  })
  @IsOptional()
  role?: string;

  @ApiPropertyOptional({
    description: 'Hourly rate for budget checks',
  })
  @IsOptional()
  hourlyRate?: number;

  @ApiPropertyOptional({
    description: 'Required skills to validate',
  })
  @IsOptional()
  @IsArray()
  requiredSkills?: string[];

  @ApiPropertyOptional({
    description: 'Required certifications to validate',
  })
  @IsOptional()
  @IsArray()
  requiredCertifications?: string[];

  @ApiPropertyOptional({
    description: 'Specific conflict types to check',
    enum: ConflictType,
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  @IsEnum(ConflictType, { each: true })
  conflictTypes?: ConflictType[];
}

export class ConflictDetailsDto {
  @ApiProperty({ description: 'Type of conflict detected', enum: ConflictType })
  type: ConflictType;

  @ApiProperty({ description: 'Severity level of the conflict', enum: ConflictSeverity })
  severity: ConflictSeverity;

  @ApiProperty({ description: 'Human-readable description of the conflict' })
  description: string;

  @ApiPropertyOptional({ description: 'Conflicting entity ID (employee, site, assignment)' })
  conflictingEntityId?: string;

  @ApiPropertyOptional({ description: 'Conflicting entity type' })
  conflictingEntityType?: string;

  @ApiPropertyOptional({ description: 'Conflicting date/time range' })
  conflictingTimeRange?: {
    start: Date;
    end: Date;
  };

  @ApiPropertyOptional({ description: 'Conflicting assignment details' })
  conflictingAssignment?: AssignmentResponseDto;

  @ApiPropertyOptional({ description: 'Suggested resolution steps' })
  suggestions?: string[];

  @ApiPropertyOptional({ description: 'Impact assessment' })
  impact?: {
    affectedEmployees: number;
    affectedSites: number;
    estimatedCost: number;
    businessRisk: ConflictSeverity;
  };

  @ApiPropertyOptional({ description: 'Additional metadata about the conflict' })
  metadata?: any;
}

export class ConflictResolutionDto {
  @ApiProperty({ description: 'Resolution strategy' })
  strategy: string;

  @ApiProperty({ description: 'Description of the resolution' })
  description: string;

  @ApiProperty({ description: 'Steps to implement the resolution' })
  steps: string[];

  @ApiPropertyOptional({ description: 'Estimated cost of resolution' })
  estimatedCost?: number;

  @ApiPropertyOptional({ description: 'Time required to implement' })
  implementationTime?: string;

  @ApiPropertyOptional({ description: 'Success probability (0-100)' })
  successProbability?: number;

  @ApiPropertyOptional({ description: 'Alternative employees for reassignment' })
  alternativeEmployees?: string[];

  @ApiPropertyOptional({ description: 'Alternative time slots' })
  alternativeTimeSlots?: Array<{
    start: Date;
    end: Date;
    confidence: number;
  }>;
}

export class ConflictDetectionResultDto {
  @ApiProperty({ description: 'Whether any conflicts were detected' })
  hasConflicts: boolean;

  @ApiProperty({ description: 'Number of conflicts found' })
  conflictCount: number;

  @ApiProperty({ description: 'Highest severity level found', enum: ConflictSeverity })
  highestSeverity: ConflictSeverity;

  @ApiProperty({ description: 'List of detected conflicts', type: [ConflictDetailsDto] })
  conflicts: ConflictDetailsDto[];

  @ApiPropertyOptional({ description: 'Suggested resolutions', type: [ConflictResolutionDto] })
  resolutions?: ConflictResolutionDto[];

  @ApiProperty({ description: 'Overall risk assessment score (0-100)' })
  riskScore: number;

  @ApiProperty({ description: 'Whether the assignment can proceed with current conflicts' })
  canProceed: boolean;

  @ApiPropertyOptional({ description: 'Warnings for proceeding despite conflicts' })
  proceedWarnings?: string[];

  @ApiProperty({ description: 'Analysis timestamp' })
  analyzedAt: Date;

  @ApiPropertyOptional({ description: 'Additional insights or notes' })
  insights?: string;
}

export class BulkConflictDetectionRequestDto {
  @ApiProperty({
    description: 'List of assignment scenarios to check',
  })
  assignments: Array<{
    employeeId: string;
    siteId: string;
    role: string;
    startDate: string;
    endDate?: string;
    hourlyRate?: number;
    requiredSkills?: string[];
    requiredCertifications?: string[];
  }>;

  @ApiPropertyOptional({
    description: 'Whether to include resolution suggestions',
    default: true,
  })
  @IsOptional()
  includeResolutions?: boolean;

  @ApiPropertyOptional({
    description: 'Minimum severity level to report',
    enum: ConflictSeverity,
    default: ConflictSeverity.LOW,
  })
  @IsOptional()
  @IsEnum(ConflictSeverity)
  minSeverity?: ConflictSeverity;
}

export class BulkConflictDetectionResponseDto {
  @ApiProperty({ description: 'Results for each assignment scenario' })
  results: Array<{
    scenarioIndex: number;
    employeeId: string;
    siteId: string;
    conflictResult: ConflictDetectionResultDto;
  }>;

  @ApiProperty({ description: 'Overall summary' })
  summary: {
    totalScenarios: number;
    scenariosWithConflicts: number;
    totalConflicts: number;
    criticalConflicts: number;
    highSeverityConflicts: number;
    mediumSeverityConflicts: number;
    lowSeverityConflicts: number;
  };

  @ApiPropertyOptional({ description: 'Cross-scenario conflicts (conflicts between scenarios)' })
  crossScenarioConflicts?: ConflictDetailsDto[];

  @ApiProperty({ description: 'Analysis timestamp' })
  analyzedAt: Date;
}