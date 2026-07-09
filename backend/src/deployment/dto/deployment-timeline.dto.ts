import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsDateString, IsString, IsArray, ValidateNested, IsOptional, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

export enum TimelineEventType {
  ASSIGNMENT_CREATED = 'assignment_created',
  ASSIGNMENT_MODIFIED = 'assignment_modified',
  ASSIGNMENT_ENDED = 'assignment_ended',
  EMERGENCY_REPLACEMENT = 'emergency_replacement',
  SHIFT_COVERAGE_CHANGE = 'shift_coverage_change',
  SITE_STATUS_CHANGE = 'site_status_change',
  GUARD_AVAILABILITY_CHANGE = 'guard_availability_change'
}

export class TimelineEventDto {
  @ApiProperty({
    description: 'Event ID',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @IsUUID()
  id: string;

  @ApiProperty({
    description: 'Event type',
    enum: TimelineEventType
  })
  @IsEnum(TimelineEventType)
  eventType: TimelineEventType;

  @ApiProperty({
    description: 'Event timestamp',
    example: '2024-01-15T10:30:00Z'
  })
  @IsDateString()
  timestamp: string;

  @ApiProperty({
    description: 'Employee ID (if applicable)',
    example: '123e4567-e89b-12d3-a456-426614174001',
    required: false
  })
  @IsOptional()
  @IsUUID()
  employeeId?: string;

  @ApiProperty({
    description: 'Employee name (if applicable)',
    example: 'John Smith',
    required: false
  })
  @IsOptional()
  @IsString()
  employeeName?: string;

  @ApiProperty({
    description: 'Site ID (if applicable)',
    example: '123e4567-e89b-12d3-a456-426614174002',
    required: false
  })
  @IsOptional()
  @IsUUID()
  siteId?: string;

  @ApiProperty({
    description: 'Site name (if applicable)',
    example: 'Central Mall - Main Entrance',
    required: false
  })
  @IsOptional()
  @IsString()
  siteName?: string;

  @ApiProperty({
    description: 'Event description',
    example: 'John Smith assigned to Central Mall - Main Entrance for day shift'
  })
  @IsString()
  description: string;

  @ApiProperty({
    description: 'Event details in JSON format',
    example: {
      previousAssignment: 'Downtown Office',
      newAssignment: 'Central Mall - Main Entrance',
      reason: 'Emergency replacement'
    }
  })
  details: any;

  @ApiProperty({
    description: 'User who initiated the event',
    example: '123e4567-e89b-12d3-a456-426614174003'
  })
  @IsUUID()
  initiatedBy: string;

  @ApiProperty({
    description: 'User name who initiated the event',
    example: 'Operations Manager'
  })
  @IsString()
  initiatedByName: string;
}

export class DeploymentTimelineDto {
  @ApiProperty({
    description: 'Timeline events',
    type: [TimelineEventDto]
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TimelineEventDto)
  events: TimelineEventDto[];

  @ApiProperty({
    description: 'Total number of events',
    example: 25
  })
  totalEvents: number;

  @ApiProperty({
    description: 'Timeline period start',
    example: '2024-01-01T00:00:00Z'
  })
  @IsDateString()
  periodStart: string;

  @ApiProperty({
    description: 'Timeline period end',
    example: '2024-01-31T23:59:59Z'
  })
  @IsDateString()
  periodEnd: string;
}

export class GetDeploymentTimelineDto {
  @ApiProperty({
    description: 'Start date for timeline',
    example: '2024-01-01',
    required: false
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({
    description: 'End date for timeline',
    example: '2024-01-31',
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
    description: 'Filter by employee ID',
    example: '123e4567-e89b-12d3-a456-426614174002',
    required: false
  })
  @IsOptional()
  @IsUUID()
  employeeId?: string;

  @ApiProperty({
    description: 'Filter by event type',
    enum: TimelineEventType,
    required: false
  })
  @IsOptional()
  @IsEnum(TimelineEventType)
  eventType?: TimelineEventType;
}

export class AssignmentHistoryEntryDto {
  @ApiProperty({
    description: 'Assignment ID',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @IsUUID()
  assignmentId: string;

  @ApiProperty({
    description: 'Employee ID',
    example: '123e4567-e89b-12d3-a456-426614174001'
  })
  @IsUUID()
  employeeId: string;

  @ApiProperty({
    description: 'Employee name',
    example: 'John Smith'
  })
  @IsString()
  employeeName: string;

  @ApiProperty({
    description: 'Site ID',
    example: '123e4567-e89b-12d3-a456-426614174002'
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
    description: 'Assignment role',
    example: 'Security Guard'
  })
  @IsString()
  role: string;

  @ApiProperty({
    description: 'Assignment start date',
    example: '2024-01-01T00:00:00Z'
  })
  @IsDateString()
  startDate: string;

  @ApiProperty({
    description: 'Assignment end date (if ended)',
    example: '2024-01-31T23:59:59Z',
    required: false
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty({
    description: 'Assignment status',
    example: 'active',
    enum: ['active', 'completed', 'terminated', 'transferred']
  })
  @IsString()
  status: string;

  @ApiProperty({
    description: 'Assignment duration in days',
    example: 30
  })
  durationDays: number;

  @ApiProperty({
    description: 'Performance rating (if available)',
    example: 4.5,
    required: false
  })
  @IsOptional()
  performanceRating?: number;

  @ApiProperty({
    description: 'Assignment notes or comments',
    example: 'Excellent performance, client satisfaction high',
    required: false
  })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class AssignmentHistoryDto {
  @ApiProperty({
    description: 'Employee assignment history',
    type: [AssignmentHistoryEntryDto]
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AssignmentHistoryEntryDto)
  assignments: AssignmentHistoryEntryDto[];

  @ApiProperty({
    description: 'Total assignments',
    example: 15
  })
  totalAssignments: number;

  @ApiProperty({
    description: 'Active assignments',
    example: 1
  })
  activeAssignments: number;

  @ApiProperty({
    description: 'Average assignment duration in days',
    example: 45.5
  })
  averageDuration: number;

  @ApiProperty({
    description: 'Average performance rating',
    example: 4.2
  })
  averageRating: number;
}