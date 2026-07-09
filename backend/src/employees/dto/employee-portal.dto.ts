import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsDateString, IsEnum, IsString, IsUUID } from 'class-validator';

/**
 * DTOs for Employee Self-Service Portal
 */

export enum AttendanceFilterType {
  TODAY = 'today',
  THIS_WEEK = 'this_week',
  THIS_MONTH = 'this_month',
  CUSTOM = 'custom',
}

export enum ShiftFilterType {
  CURRENT = 'current',
  UPCOMING = 'upcoming',
  PAST = 'past',
  THIS_WEEK = 'this_week',
  NEXT_WEEK = 'next_week',
}

export class EmployeeAttendanceQueryDto {
  @ApiPropertyOptional({
    enum: AttendanceFilterType,
    description: 'Filter attendance records by time period',
    default: AttendanceFilterType.THIS_MONTH,
  })
  @IsOptional()
  @IsEnum(AttendanceFilterType)
  filter?: AttendanceFilterType = AttendanceFilterType.THIS_MONTH;

  @ApiPropertyOptional({
    description: 'Start date for custom filter (ISO format)',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'End date for custom filter (ISO format)',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class EmployeeShiftQueryDto {
  @ApiPropertyOptional({
    enum: ShiftFilterType,
    description: 'Filter shifts by time period',
    default: ShiftFilterType.UPCOMING,
  })
  @IsOptional()
  @IsEnum(ShiftFilterType)
  filter?: ShiftFilterType = ShiftFilterType.UPCOMING;

  @ApiPropertyOptional({
    description: 'Start date for custom filter (ISO format)',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'End date for custom filter (ISO format)',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class EmployeePayrollQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by specific year',
  })
  @IsOptional()
  @IsString()
  year?: string;

  @ApiPropertyOptional({
    description: 'Filter by specific month (1-12)',
  })
  @IsOptional()
  @IsString()
  month?: string;
}

export class EmployeeProfileUpdateDto {
  @ApiPropertyOptional({
    description: 'Employee phone number',
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({
    description: 'Employee emergency contact information',
  })
  @IsOptional()
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
    email?: string;
  };

  @ApiPropertyOptional({
    description: 'Employee address information',
  })
  @IsOptional()
  address?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };

  @ApiPropertyOptional({
    description: 'Employee notification preferences',
  })
  @IsOptional()
  notificationPreferences?: {
    email: boolean;
    sms: boolean;
    pushNotifications: boolean;
  };
}

export class AttendanceRecordDto {
  @ApiProperty({ description: 'Attendance record ID' })
  id: string;

  @ApiProperty({ description: 'Shift date' })
  shiftDate: string;

  @ApiProperty({ description: 'Site name' })
  siteName: string;

  @ApiProperty({ description: 'Clock-in time' })
  clockIn: string | null;

  @ApiProperty({ description: 'Clock-out time' })
  clockOut: string | null;

  @ApiProperty({ description: 'Total hours worked' })
  hoursWorked: number;

  @ApiProperty({ description: 'Attendance status' })
  status: string;

  @ApiProperty({ description: 'Location verification status' })
  locationVerified: boolean;

  @ApiProperty({ description: 'Any notes or comments' })
  notes?: string;
}

export class AttendanceSummaryDto {
  @ApiProperty({ description: 'Total days worked in period' })
  totalDaysWorked: number;

  @ApiProperty({ description: 'Total hours worked in period' })
  totalHoursWorked: number;

  @ApiProperty({ description: 'Total overtime hours in period' })
  overtimeHours: number;

  @ApiProperty({ description: 'Number of late arrivals' })
  lateArrivals: number;

  @ApiProperty({ description: 'Number of early departures' })
  earlyDepartures: number;

  @ApiProperty({ description: 'Attendance percentage' })
  attendanceRate: number;
}

export class ShiftScheduleDto {
  @ApiProperty({ description: 'Shift ID' })
  id: string;

  @ApiProperty({ description: 'Site name' })
  siteName: string;

  @ApiProperty({ description: 'Site address' })
  siteAddress: string;

  @ApiProperty({ description: 'Shift date' })
  shiftDate: string;

  @ApiProperty({ description: 'Start time' })
  startTime: string;

  @ApiProperty({ description: 'End time' })
  endTime: string;

  @ApiProperty({ description: 'Shift type (regular, overtime, etc.)' })
  shiftType: string;

  @ApiProperty({ description: 'Role/position for this shift' })
  role: string;

  @ApiProperty({ description: 'Shift status' })
  status: string;

  @ApiProperty({ description: 'Special instructions or notes' })
  instructions?: string;

  @ApiProperty({ description: 'Whether check-in is required' })
  requiresCheckIn: boolean;
}

export class PayrollItemDto {
  @ApiProperty({ description: 'Payroll item ID' })
  id: string;

  @ApiProperty({ description: 'Pay period start date' })
  payPeriodStart: string;

  @ApiProperty({ description: 'Pay period end date' })
  payPeriodEnd: string;

  @ApiProperty({ description: 'Gross pay amount' })
  grossPay: number;

  @ApiProperty({ description: 'Net pay amount' })
  netPay: number;

  @ApiProperty({ description: 'Tax deductions' })
  taxDeductions: number;

  @ApiProperty({ description: 'Other deductions' })
  otherDeductions: number;

  @ApiProperty({ description: 'Overtime pay' })
  overtimePay: number;

  @ApiProperty({ description: 'Regular hours worked' })
  regularHours: number;

  @ApiProperty({ description: 'Overtime hours worked' })
  overtimeHours: number;

  @ApiProperty({ description: 'Payslip download URL' })
  payslipUrl?: string;

  @ApiProperty({ description: 'Payment status' })
  status: string;

  @ApiProperty({ description: 'Payment date' })
  paidDate?: string;
}

export class EmployeeDocumentDto {
  @ApiProperty({ description: 'Document ID' })
  id: string;

  @ApiProperty({ description: 'Document name' })
  name: string;

  @ApiProperty({ description: 'Document type' })
  type: string;

  @ApiProperty({ description: 'Document description' })
  description?: string;

  @ApiProperty({ description: 'Upload date' })
  uploadedAt: string;

  @ApiProperty({ description: 'Document URL for download' })
  downloadUrl: string;

  @ApiProperty({ description: 'Document size in bytes' })
  size: number;

  @ApiProperty({ description: 'File extension' })
  fileExtension: string;
}

export class EmployeeNotificationDto {
  @ApiProperty({ description: 'Notification ID' })
  id: string;

  @ApiProperty({ description: 'Notification title' })
  title: string;

  @ApiProperty({ description: 'Notification message' })
  message: string;

  @ApiProperty({ description: 'Notification type' })
  type: string;

  @ApiProperty({ description: 'Whether notification is read' })
  isRead: boolean;

  @ApiProperty({ description: 'Notification priority' })
  priority: 'low' | 'normal' | 'high' | 'urgent';

  @ApiProperty({ description: 'Creation date' })
  createdAt: string;

  @ApiProperty({ description: 'Action URL if applicable' })
  actionUrl?: string;
}

export class EmployeeDashboardDto {
  @ApiProperty({ description: 'Current shift information' })
  currentShift?: ShiftScheduleDto;

  @ApiProperty({ description: 'Next upcoming shift' })
  nextShift?: ShiftScheduleDto;

  @ApiProperty({ description: 'Today\'s attendance status' })
  todaysAttendance?: AttendanceRecordDto;

  @ApiProperty({ description: 'This month\'s attendance summary' })
  attendanceSummary: AttendanceSummaryDto;

  @ApiProperty({ description: 'Recent payslips (last 3)' })
  recentPayslips: PayrollItemDto[];

  @ApiProperty({ description: 'Unread notifications count' })
  unreadNotifications: number;

  @ApiProperty({ description: 'Upcoming shifts this week' })
  upcomingShifts: ShiftScheduleDto[];

  @ApiProperty({ description: 'Clock-in/out status' })
  clockStatus: {
    isClockedIn: boolean;
    lastAction?: string;
    lastActionTime?: string;
  };
}