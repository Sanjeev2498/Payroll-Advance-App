import {
  IsOptional,
  IsString,
  IsEnum,
  IsDateString,
  IsObject,
  IsUUID,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum NotificationType {
  SHIFT_ASSIGNED = 'SHIFT_ASSIGNED',
  SHIFT_CHANGED = 'SHIFT_CHANGED',
  SHIFT_CANCELLED = 'SHIFT_CANCELLED',
  COVERAGE_REQUEST = 'COVERAGE_REQUEST',
  SHIFT_REMINDER = 'SHIFT_REMINDER',
  OVERTIME_ALERT = 'OVERTIME_ALERT',
}

export enum NotificationStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  READ = 'READ',
  ACKNOWLEDGED = 'ACKNOWLEDGED',
  FAILED = 'FAILED',
}

export class CreateShiftNotificationDto {
  @ApiProperty({ description: 'Shift ID' })
  @IsUUID()
  shiftId: string;

  @ApiPropertyOptional({ description: 'User ID to notify' })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional({ description: 'Employee ID to notify' })
  @IsOptional()
  @IsUUID()
  employeeId?: string;

  @ApiProperty({ description: 'Notification type', enum: NotificationType })
  @IsEnum(NotificationType)
  type: NotificationType;

  @ApiProperty({ description: 'Notification title' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Notification message' })
  @IsString()
  message: string;

  @ApiPropertyOptional({ description: 'Schedule notification for later' })
  @IsOptional()
  @IsDateString()
  scheduledFor?: string;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: any;
}

export class ShiftNotificationResponseDto {
  @ApiProperty({ description: 'Notification ID' })
  id: string;

  @ApiProperty({ description: 'Shift ID' })
  shiftId: string;

  @ApiPropertyOptional({ description: 'User ID' })
  userId?: string;

  @ApiPropertyOptional({ description: 'Employee ID' })
  employeeId?: string;

  @ApiProperty({ description: 'Notification type', enum: NotificationType })
  type: NotificationType;

  @ApiProperty({ description: 'Title' })
  title: string;

  @ApiProperty({ description: 'Message' })
  message: string;

  @ApiProperty({ description: 'Status', enum: NotificationStatus })
  status: NotificationStatus;

  @ApiPropertyOptional({ description: 'Scheduled for timestamp' })
  scheduledFor?: string;

  @ApiPropertyOptional({ description: 'Sent timestamp' })
  sentAt?: string;

  @ApiPropertyOptional({ description: 'Read timestamp' })
  readAt?: string;

  @ApiPropertyOptional({ description: 'Metadata' })
  metadata?: any;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: string;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: string;
}