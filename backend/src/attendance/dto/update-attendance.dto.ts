import { PartialType, OmitType, ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import {
  IsOptional,
  IsDateString,
  IsEnum,
  IsString,
  ValidateNested,
  IsObject,
  IsArray,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import { 
  CreateAttendanceDto, 
  LocationDataDto, 
  VerificationDataDto,
  AttendanceCorrectionDto 
} from './create-attendance.dto';
import { AttendanceStatus } from '@prisma/client';

export class UpdateAttendanceDto extends PartialType(
  OmitType(CreateAttendanceDto, ['employeeId', 'shiftId'] as const)
) {
  @ApiPropertyOptional({ 
    description: 'Attendance status',
    enum: AttendanceStatus,
    example: 'PRESENT'
  })
  @IsOptional()
  @IsEnum(AttendanceStatus)
  status?: AttendanceStatus;

  @ApiPropertyOptional({ 
    description: 'Updated location data',
    type: LocationDataDto
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocationDataDto)
  locationData?: LocationDataDto;

  @ApiPropertyOptional({ 
    description: 'Updated verification data',
    type: VerificationDataDto
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => VerificationDataDto)
  verificationData?: VerificationDataDto;

  @ApiPropertyOptional({ 
    description: 'Modification reason and metadata',
    type: 'object',
    additionalProperties: true,
    example: {
      action: 'CORRECTED',
      reason: 'System clock error correction',
      modifiedBy: 'supervisor-id',
      timestamp: '2024-01-15T10:30:00.000Z'
    }
  })
  @IsOptional()
  @IsObject()
  modificationReason?: {
    action: string;
    reason: string;
    modifiedBy?: string;
    timestamp?: string;
    approvalRequired?: boolean;
    emergencyOverride?: boolean;
  };
}

export class AttendanceQueryDto {
  @ApiPropertyOptional({ 
    description: 'Search term for employee name or shift details',
    example: 'john doe'
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ 
    description: 'Filter by employee ID',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @IsOptional()
  @IsString()
  employeeId?: string;

  @ApiPropertyOptional({ 
    description: 'Filter by shift ID',
    example: '123e4567-e89b-12d3-a456-426614174001'
  })
  @IsOptional()
  @IsString()
  shiftId?: string;

  @ApiPropertyOptional({ 
    description: 'Filter by site ID',
    example: '123e4567-e89b-12d3-a456-426614174002'
  })
  @IsOptional()
  @IsString()
  siteId?: string;

  @ApiPropertyOptional({ 
    description: 'Filter by attendance status',
    enum: AttendanceStatus,
    example: 'PRESENT'
  })
  @IsOptional()
  @IsEnum(AttendanceStatus)
  status?: AttendanceStatus;

  @ApiPropertyOptional({ 
    description: 'Filter from date (YYYY-MM-DD)',
    example: '2024-01-01'
  })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({ 
    description: 'Filter to date (YYYY-MM-DD)',
    example: '2024-01-31'
  })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional({ 
    description: 'Filter by clock-in time from (ISO 8601)',
    example: '2024-01-15T08:00:00.000Z'
  })
  @IsOptional()
  @IsDateString()
  clockInFrom?: string;

  @ApiPropertyOptional({ 
    description: 'Filter by clock-in time to (ISO 8601)',
    example: '2024-01-15T09:00:00.000Z'
  })
  @IsOptional()
  @IsDateString()
  clockInTo?: string;

  @ApiPropertyOptional({ 
    description: 'Include only records with anomalies',
    example: false
  })
  @IsOptional()
  @IsBoolean()
  anomaliesOnly?: boolean;

  @ApiPropertyOptional({ 
    description: 'Include only records needing approval',
    example: false
  })
  @IsOptional()
  @IsBoolean()
  pendingApproval?: boolean;

  @ApiPropertyOptional({ 
    description: 'Include late arrivals only',
    example: false
  })
  @IsOptional()
  @IsBoolean()
  lateOnly?: boolean;

  @ApiPropertyOptional({ 
    description: 'Include early departures only',
    example: false
  })
  @IsOptional()
  @IsBoolean()
  earlyDepartureOnly?: boolean;

  @ApiPropertyOptional({ 
    description: 'Include overtime records only',
    example: false
  })
  @IsOptional()
  @IsBoolean()
  overtimeOnly?: boolean;

  @ApiPropertyOptional({ 
    description: 'Page number for pagination',
    example: 1
  })
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ 
    description: 'Number of items per page',
    example: 20
  })
  @IsOptional()
  @Type(() => Number)
  limit?: number = 20;

  @ApiPropertyOptional({ 
    description: 'Sort field',
    enum: ['clockIn', 'clockOut', 'status', 'employeeId', 'shiftDate', 'createdAt'],
    example: 'clockIn'
  })
  @IsOptional()
  @IsEnum(['clockIn', 'clockOut', 'status', 'employeeId', 'shiftDate', 'createdAt'])
  sortBy?: 'clockIn' | 'clockOut' | 'status' | 'employeeId' | 'shiftDate' | 'createdAt' = 'clockIn';

  @ApiPropertyOptional({ 
    description: 'Sort order',
    enum: ['asc', 'desc'],
    example: 'desc'
  })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}

export class AttendanceAnomalyQueryDto {
  @ApiPropertyOptional({ 
    description: 'Date range start for anomaly detection',
    example: '2024-01-01'
  })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({ 
    description: 'Date range end for anomaly detection',
    example: '2024-01-31'
  })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional({ 
    description: 'Types of anomalies to detect',
    enum: ['LATE_ARRIVAL', 'EARLY_DEPARTURE', 'MISSED_CLOCK_OUT', 'LOCATION_MISMATCH', 'DUPLICATE_ENTRY'],
    isArray: true,
    example: ['LATE_ARRIVAL', 'EARLY_DEPARTURE']
  })
  @IsOptional()
  @IsArray()
  @IsEnum(['LATE_ARRIVAL', 'EARLY_DEPARTURE', 'MISSED_CLOCK_OUT', 'LOCATION_MISMATCH', 'DUPLICATE_ENTRY'], { each: true })
  anomalyTypes?: ('LATE_ARRIVAL' | 'EARLY_DEPARTURE' | 'MISSED_CLOCK_OUT' | 'LOCATION_MISMATCH' | 'DUPLICATE_ENTRY')[];

  @ApiPropertyOptional({ 
    description: 'Minimum severity level',
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    example: 'MEDIUM'
  })
  @IsOptional()
  @IsEnum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])
  minSeverity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

  @ApiPropertyOptional({ 
    description: 'Filter by employee ID',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @IsOptional()
  @IsString()
  employeeId?: string;

  @ApiPropertyOptional({ 
    description: 'Filter by site ID',
    example: '123e4567-e89b-12d3-a456-426614174002'
  })
  @IsOptional()
  @IsString()
  siteId?: string;

  @ApiPropertyOptional({ 
    description: 'Page number for pagination',
    example: 1
  })
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ 
    description: 'Number of items per page',
    example: 20
  })
  @IsOptional()
  @Type(() => Number)
  limit?: number = 20;
}

export class AttendanceApprovalDto {
  @ApiPropertyOptional({ 
    description: 'Approval action',
    enum: ['APPROVE', 'REJECT', 'REQUEST_CHANGES'],
    example: 'APPROVE'
  })
  @IsEnum(['APPROVE', 'REJECT', 'REQUEST_CHANGES'])
  action: 'APPROVE' | 'REJECT' | 'REQUEST_CHANGES';

  @ApiPropertyOptional({ 
    description: 'Approval comments or rejection reason',
    example: 'Approved after verifying with site security logs'
  })
  @IsOptional()
  @IsString()
  comments?: string;

  @ApiPropertyOptional({ 
    description: 'Additional approval metadata',
    example: {
      reviewedDocuments: ['security_log_20240115.pdf'],
      contactedPersonnel: ['site_manager', 'security_guard'],
      verificationMethod: 'SECURITY_FOOTAGE'
    }
  })
  @IsOptional()
  @IsObject()
  approvalMetadata?: any;
}

export class BulkAttendanceUpdateDto {
  @ApiProperty({ 
    description: 'Array of attendance record IDs to update',
    example: ['123e4567-e89b-12d3-a456-426614174000', '123e4567-e89b-12d3-a456-426614174001']
  })
  @IsArray()
  @IsString({ each: true })
  attendanceIds: string[];

  @ApiProperty({ 
    description: 'Update operation to perform',
    enum: ['UPDATE_STATUS', 'APPROVE_CORRECTIONS', 'REJECT_CORRECTIONS', 'BULK_EDIT'],
    example: 'UPDATE_STATUS'
  })
  @IsEnum(['UPDATE_STATUS', 'APPROVE_CORRECTIONS', 'REJECT_CORRECTIONS', 'BULK_EDIT'])
  operation: 'UPDATE_STATUS' | 'APPROVE_CORRECTIONS' | 'REJECT_CORRECTIONS' | 'BULK_EDIT';

  @ApiPropertyOptional({ 
    description: 'New status for bulk status updates',
    enum: AttendanceStatus,
    example: 'PRESENT'
  })
  @IsOptional()
  @IsEnum(AttendanceStatus)
  newStatus?: AttendanceStatus;

  @ApiProperty({ 
    description: 'Reason for the bulk operation',
    example: 'Batch approval of verified attendance records'
  })
  @IsString()
  reason: string;

  @ApiPropertyOptional({ 
    description: 'Additional update data for bulk edits',
    example: {
      notes: 'Updated after security review',
      verificationFlags: { manualReview: true }
    }
  })
  @IsOptional()
  @IsObject()
  updateData?: any;
}
