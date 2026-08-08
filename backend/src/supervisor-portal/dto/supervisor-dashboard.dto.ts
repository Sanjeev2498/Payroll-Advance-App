import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsDateString, IsEnum, IsArray, IsUUID, IsNumber, Min, Max } from 'class-validator';
import { Transform } from 'class-transformer';

export class SupervisorDashboardQueryDto {
  @ApiPropertyOptional({ description: 'Date for dashboard data (defaults to today)' })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional({ description: 'Specific site IDs to filter (defaults to all assigned sites)' })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  siteIds?: string[];

  @ApiPropertyOptional({ description: 'Include historical data', default: false })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  includeHistorical?: boolean;
}

export class AttendanceApprovalDto {
  @ApiProperty({ description: 'Attendance record ID' })
  @IsUUID()
  attendanceId: string;

  @ApiProperty({ description: 'Approval action', enum: ['APPROVE', 'REJECT'] })
  @IsEnum(['APPROVE', 'REJECT'])
  action: 'APPROVE' | 'REJECT';

  @ApiPropertyOptional({ description: 'Approval notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class EmergencyReplacementDto {
  @ApiProperty({ description: 'Site ID requiring emergency replacement' })
  @IsUUID()
  siteId: string;

  @ApiProperty({ description: 'Shift ID requiring replacement' })
  @IsUUID()
  shiftId: string;

  @ApiPropertyOptional({ description: 'Original employee ID being replaced' })
  @IsOptional()
  @IsUUID()
  originalEmployeeId?: string;

  @ApiPropertyOptional({ description: 'Replacement employee ID' })
  @IsOptional()
  @IsUUID()
  replacementEmployeeId?: string;

  @ApiProperty({ description: 'Emergency reason' })
  @IsString()
  reason: string;

  @ApiPropertyOptional({ description: 'Priority level', enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] })
  @IsOptional()
  @IsEnum(['LOW', 'MEDIUM', 'HIGH', 'URGENT'])
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
}

export class SiteHealthQueryDto {
  @ApiPropertyOptional({ description: 'Site IDs to check health for' })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  siteIds?: string[];

  @ApiPropertyOptional({ description: 'Include detailed metrics', default: false })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  includeDetails?: boolean;
}

export class OperationalNotificationQueryDto {
  @ApiPropertyOptional({ description: 'Notification priority filter' })
  @IsOptional()
  @IsEnum(['LOW', 'MEDIUM', 'HIGH', 'URGENT'])
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

  @ApiPropertyOptional({ description: 'Notification type filter' })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({ description: 'Only unread notifications', default: false })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  unreadOnly?: boolean;

  @ApiPropertyOptional({ description: 'Number of notifications to return', default: 20 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class CreateIncidentDto {
  @ApiProperty({ description: 'Site ID where incident occurred' })
  @IsUUID()
  siteId: string;

  @ApiProperty({ description: 'Incident title' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Incident description' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Incident category' })
  @IsEnum(['SECURITY', 'SAFETY', 'MAINTENANCE', 'OPERATIONAL', 'OTHER'])
  category: 'SECURITY' | 'SAFETY' | 'MAINTENANCE' | 'OPERATIONAL' | 'OTHER';

  @ApiProperty({ description: 'Incident severity', enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] })
  @IsEnum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

  @ApiPropertyOptional({ description: 'Employee ID who reported the incident' })
  @IsOptional()
  @IsUUID()
  reportedBy?: string;

  @ApiPropertyOptional({ description: 'Incident location within site' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ description: 'Additional notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class MusterRollQueryDto {
  @ApiPropertyOptional({ description: 'Date for muster roll (defaults to today)' })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional({ description: 'Site IDs to include in muster roll' })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  siteIds?: string[];

  @ApiPropertyOptional({ description: 'Shift pattern filter' })
  @IsOptional()
  @IsString()
  shiftPattern?: string;
}