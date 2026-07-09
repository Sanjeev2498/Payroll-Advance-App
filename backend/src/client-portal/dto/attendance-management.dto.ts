import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsUUID, IsDateString, IsEnum, IsInt, Min, Max } from 'class-validator';

export enum AttendanceStatus {
  PRESENT = 'PRESENT',
  LATE = 'LATE',
  EARLY_DEPARTURE = 'EARLY_DEPARTURE',
  ABSENT = 'ABSENT',
  ON_LEAVE = 'ON_LEAVE',
  OVERTIME = 'OVERTIME',
}

export enum AttendanceAnomalyType {
  LATE_ARRIVAL = 'LATE_ARRIVAL',
  EARLY_DEPARTURE = 'EARLY_DEPARTURE',
  MISSED_SHIFT = 'MISSED_SHIFT',
  LONG_BREAK = 'LONG_BREAK',
  NO_GPS_VERIFICATION = 'NO_GPS_VERIFICATION',
  SUSPICIOUS_LOCATION = 'SUSPICIOUS_LOCATION',
}

export class ClientAttendanceQueryDto {
  @ApiProperty({
    description: 'Client ID for attendance data',
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  })
  @IsUUID()
  clientId: string;

  @ApiProperty({
    description: 'Filter by specific site ID',
    example: 'site-abc-123',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  siteId?: string;

  @ApiProperty({
    description: 'Start date for attendance data (ISO format)',
    example: '2024-01-01',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiProperty({
    description: 'End date for attendance data (ISO format)',
    example: '2024-01-31',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiProperty({
    description: 'Filter by guard/employee ID',
    example: 'emp-456',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  guardId?: string;

  @ApiProperty({
    description: 'Page number for pagination',
    example: 1,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({
    description: 'Items per page',
    example: 20,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

export class AttendanceRecordDto {
  @ApiProperty({
    description: 'Attendance record ID',
    example: 'att-123',
  })
  id: string;

  @ApiProperty({
    description: 'Guard information',
    example: {
      id: 'emp-456',
      name: 'John Doe',
      employeeNumber: 'EMP001',
      photo: 'https://example.com/photo.jpg',
    },
  })
  guard: {
    id: string;
    name: string;
    employeeNumber: string;
    photo?: string;
  };

  @ApiProperty({
    description: 'Site information',
    example: {
      id: 'site-789',
      name: 'Main Office',
      address: '123 Business District',
    },
  })
  site: {
    id: string;
    name: string;
    address: string;
  };

  @ApiProperty({
    description: 'Shift information',
    example: {
      id: 'shift-101',
      date: '2024-01-15',
      startTime: '08:00',
      endTime: '20:00',
    },
  })
  shift: {
    id: string;
    date: string;
    startTime: string;
    endTime: string;
  };

  @ApiProperty({
    description: 'Clock-in timestamp',
    example: '2024-01-15T08:00:00Z',
  })
  clockIn: string;

  @ApiProperty({
    description: 'Clock-out timestamp',
    example: '2024-01-15T20:00:00Z',
    required: false,
  })
  clockOut?: string;

  @ApiProperty({
    description: 'Attendance status',
    enum: AttendanceStatus,
  })
  status: AttendanceStatus;

  @ApiProperty({
    description: 'Hours worked',
    example: 12.0,
  })
  hoursWorked: number;

  @ApiProperty({
    description: 'Overtime hours',
    example: 4.0,
  })
  overtimeHours: number;

  @ApiProperty({
    description: 'GPS verification data',
    example: {
      clockInLocation: { lat: 12.9716, lng: 77.5946, accuracy: 10 },
      clockOutLocation: { lat: 12.9716, lng: 77.5946, accuracy: 8 },
      verified: true,
    },
  })
  gpsVerification: {
    clockInLocation?: { lat: number; lng: number; accuracy: number };
    clockOutLocation?: { lat: number; lng: number; accuracy: number };
    verified: boolean;
  };

  @ApiProperty({
    description: 'Any anomalies detected',
    example: ['LATE_ARRIVAL'],
  })
  anomalies: AttendanceAnomalyType[];
}

export class ClientAttendanceResponseDto {
  @ApiProperty({
    description: 'Real-time attendance dashboard data',
    example: {
      totalShifts: 150,
      presentGuards: 142,
      absentGuards: 5,
      lateGuards: 3,
      attendanceRate: 94.7,
    },
  })
  dashboardMetrics: {
    totalShifts: number;
    presentGuards: number;
    absentGuards: number;
    lateGuards: number;
    attendanceRate: number;
  };

  @ApiProperty({
    description: 'Attendance records for the specified period',
    type: [AttendanceRecordDto],
  })
  attendanceRecords: AttendanceRecordDto[];

  @ApiProperty({
    description: 'Attendance anomalies and alerts',
    example: [
      {
        type: 'LATE_ARRIVAL',
        guardName: 'John Doe',
        siteName: 'Main Office',
        severity: 'MEDIUM',
        timestamp: '2024-01-15T08:15:00Z',
        details: 'Guard arrived 15 minutes late',
      },
    ],
  })
  anomalies: Array<{
    type: AttendanceAnomalyType;
    guardName: string;
    siteName: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    timestamp: string;
    details: string;
  }>;

  @ApiProperty({
    description: 'Site-wise attendance summary',
    example: [
      {
        siteId: 'site-789',
        siteName: 'Main Office',
        totalGuards: 10,
        presentGuards: 9,
        attendanceRate: 90.0,
        issues: 1,
      },
    ],
  })
  siteSummary: Array<{
    siteId: string;
    siteName: string;
    totalGuards: number;
    presentGuards: number;
    attendanceRate: number;
    issues: number;
  }>;

  @ApiProperty({
    description: 'Pagination metadata',
    example: {
      total: 500,
      page: 1,
      limit: 20,
      totalPages: 25,
    },
  })
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export class AttendanceTrendsResponseDto {
  @ApiProperty({
    description: 'Daily attendance trends for the period',
    example: [
      {
        date: '2024-01-15',
        totalShifts: 50,
        attendanceRate: 94.0,
        lateArrivals: 2,
        earlyDepartures: 1,
      },
    ],
  })
  dailyTrends: Array<{
    date: string;
    totalShifts: number;
    attendanceRate: number;
    lateArrivals: number;
    earlyDepartures: number;
  }>;

  @ApiProperty({
    description: 'Site-wise attendance patterns',
    example: [
      {
        siteId: 'site-789',
        siteName: 'Main Office',
        averageAttendanceRate: 95.2,
        trendDirection: 'IMPROVING',
        bestDay: 'Monday',
        worstDay: 'Friday',
      },
    ],
  })
  sitePatterns: Array<{
    siteId: string;
    siteName: string;
    averageAttendanceRate: number;
    trendDirection: 'IMPROVING' | 'DECLINING' | 'STABLE';
    bestDay: string;
    worstDay: string;
  }>;
}