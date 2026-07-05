import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AttendanceStatus } from '@prisma/client';
import { LocationDataDto, VerificationDataDto } from './create-attendance.dto';

export class AttendanceResponseDto {
  @ApiProperty({ 
    description: 'Attendance record ID',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  id: string;

  @ApiProperty({ 
    description: 'Employee ID',
    example: '123e4567-e89b-12d3-a456-426614174001'
  })
  employeeId: string;

  @ApiProperty({ 
    description: 'Shift ID',
    example: '123e4567-e89b-12d3-a456-426614174002'
  })
  shiftId: string;

  @ApiPropertyOptional({ 
    description: 'Clock-in timestamp',
    example: '2024-01-15T08:00:00.000Z'
  })
  clockIn?: Date;

  @ApiPropertyOptional({ 
    description: 'Clock-out timestamp',
    example: '2024-01-15T17:00:00.000Z'
  })
  clockOut?: Date;

  @ApiProperty({ 
    description: 'Attendance status',
    enum: AttendanceStatus,
    example: 'PRESENT'
  })
  status: AttendanceStatus;

  @ApiPropertyOptional({ 
    description: 'Location verification data',
    type: LocationDataDto
  })
  locationData?: LocationDataDto;

  @ApiPropertyOptional({ 
    description: 'Verification data (photos, biometric, device info)',
    type: VerificationDataDto
  })
  verificationData?: VerificationDataDto;

  @ApiPropertyOptional({ 
    description: 'Additional notes',
    example: 'Employee arrived 10 minutes early due to traffic'
  })
  notes?: string;

  @ApiProperty({ 
    description: 'Record creation timestamp',
    example: '2024-01-15T08:00:00.000Z'
  })
  createdAt: Date;

  @ApiProperty({ 
    description: 'Record last update timestamp',
    example: '2024-01-15T08:00:00.000Z'
  })
  updatedAt: Date;

  // Related entities (optional, included based on query includes)
  @ApiPropertyOptional({ 
    description: 'Employee information',
    example: {
      id: '123e4567-e89b-12d3-a456-426614174001',
      firstName: 'John',
      lastName: 'Doe',
      employeeNumber: 'EMP001'
    }
  })
  employee?: {
    id: string;
    firstName: string;
    lastName: string;
    employeeNumber: string;
    email?: string;
  };

  @ApiPropertyOptional({ 
    description: 'Shift information',
    example: {
      id: '123e4567-e89b-12d3-a456-426614174002',
      shiftDate: '2024-01-15',
      startTime: '08:00:00',
      endTime: '17:00:00',
      shiftType: 'REGULAR'
    }
  })
  shift?: {
    id: string;
    shiftDate: Date;
    startTime: Date;
    endTime: Date;
    shiftType: string;
    status: string;
    site?: {
      id: string;
      name: string;
      client?: {
        id: string;
        name: string;
      };
    };
  };

  // Calculated fields for analytics
  @ApiPropertyOptional({ 
    description: 'Total hours worked (calculated)',
    example: 8.5
  })
  hoursWorked?: number;

  @ApiPropertyOptional({ 
    description: 'Overtime hours (calculated)',
    example: 0.5
  })
  overtimeHours?: number;

  @ApiPropertyOptional({ 
    description: 'Is the attendance late?',
    example: false
  })
  isLate?: boolean;

  @ApiPropertyOptional({ 
    description: 'Is the departure early?',
    example: false
  })
  isEarlyDeparture?: boolean;

  @ApiPropertyOptional({ 
    description: 'Minutes late for clock-in',
    example: 5
  })
  minutesLate?: number;

  @ApiPropertyOptional({ 
    description: 'Minutes early for clock-out',
    example: 0
  })
  minutesEarlyDeparture?: number;
}

export class AttendanceAnomalyDto {
  @ApiProperty({ 
    description: 'Attendance record ID',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  attendanceId: string;

  @ApiProperty({ 
    description: 'Type of anomaly detected',
    enum: ['LATE_ARRIVAL', 'EARLY_DEPARTURE', 'MISSED_CLOCK_OUT', 'LOCATION_MISMATCH', 'DUPLICATE_ENTRY', 'OVERTIME_THRESHOLD'],
    example: 'LATE_ARRIVAL'
  })
  anomalyType: 'LATE_ARRIVAL' | 'EARLY_DEPARTURE' | 'MISSED_CLOCK_OUT' | 'LOCATION_MISMATCH' | 'DUPLICATE_ENTRY' | 'OVERTIME_THRESHOLD';

  @ApiProperty({ 
    description: 'Severity of the anomaly',
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    example: 'MEDIUM'
  })
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

  @ApiProperty({ 
    description: 'Description of the anomaly',
    example: 'Employee clocked in 15 minutes after scheduled start time'
  })
  description: string;

  @ApiProperty({ 
    description: 'Detected timestamp',
    example: '2024-01-15T08:15:00.000Z'
  })
  detectedAt: Date;

  @ApiPropertyOptional({ 
    description: 'Expected value (for comparison anomalies)',
    example: '08:00:00'
  })
  expectedValue?: any;

  @ApiPropertyOptional({ 
    description: 'Actual value (for comparison anomalies)',
    example: '08:15:00'
  })
  actualValue?: any;

  @ApiPropertyOptional({ 
    description: 'Suggested correction actions',
    example: ['Contact employee for explanation', 'Review site access logs', 'Approve late arrival if justified']
  })
  suggestedActions?: string[];

  @ApiPropertyOptional({ 
    description: 'Additional anomaly metadata',
    example: {
      thresholdMinutes: 15,
      impactOnPayroll: true,
      requiresApproval: true
    }
  })
  metadata?: any;

  // Include attendance data for context
  @ApiProperty({ 
    description: 'Associated attendance record',
    type: AttendanceResponseDto
  })
  attendance: AttendanceResponseDto;
}

export class AttendanceStatsDto {
  @ApiProperty({ 
    description: 'Total attendance records in period',
    example: 150
  })
  totalRecords: number;

  @ApiProperty({ 
    description: 'Present records count',
    example: 140
  })
  presentCount: number;

  @ApiProperty({ 
    description: 'Absent records count',
    example: 5
  })
  absentCount: number;

  @ApiProperty({ 
    description: 'Late arrivals count',
    example: 10
  })
  lateCount: number;

  @ApiProperty({ 
    description: 'Early departures count',
    example: 3
  })
  earlyDepartureCount: number;

  @ApiProperty({ 
    description: 'Overtime records count',
    example: 25
  })
  overtimeCount: number;

  @ApiProperty({ 
    description: 'Records pending approval',
    example: 8
  })
  pendingApprovalCount: number;

  @ApiProperty({ 
    description: 'Overall attendance rate (percentage)',
    example: 93.3
  })
  attendanceRate: number;

  @ApiProperty({ 
    description: 'On-time arrival rate (percentage)',
    example: 86.7
  })
  onTimeRate: number;

  @ApiProperty({ 
    description: 'Total hours worked in period',
    example: 1200.5
  })
  totalHoursWorked: number;

  @ApiProperty({ 
    description: 'Total overtime hours in period',
    example: 45.25
  })
  totalOvertimeHours: number;

  @ApiProperty({ 
    description: 'Average daily attendance count',
    example: 28.5
  })
  averageDailyAttendance: number;

  @ApiPropertyOptional({ 
    description: 'Attendance trends by day of week',
    example: {
      monday: { rate: 95.2, count: 30 },
      tuesday: { rate: 93.1, count: 29 },
      wednesday: { rate: 94.7, count: 30 },
      thursday: { rate: 91.5, count: 28 },
      friday: { rate: 89.3, count: 27 }
    }
  })
  weeklyTrends?: Record<string, { rate: number; count: number }>;

  @ApiPropertyOptional({ 
    description: 'Site-wise attendance breakdown',
    example: [
      { siteId: 'site-1', siteName: 'Corporate Office', rate: 96.5, count: 50 },
      { siteId: 'site-2', siteName: 'Warehouse A', rate: 91.2, count: 35 }
    ]
  })
  siteBreakdown?: Array<{
    siteId: string;
    siteName: string;
    rate: number;
    count: number;
  }>;
}

export class AttendancePaginatedResponseDto {
  @ApiProperty({ 
    description: 'Array of attendance records',
    type: [AttendanceResponseDto]
  })
  attendance: AttendanceResponseDto[];

  @ApiProperty({ 
    description: 'Total number of records',
    example: 150
  })
  total: number;

  @ApiProperty({ 
    description: 'Current page number',
    example: 1
  })
  page: number;

  @ApiProperty({ 
    description: 'Number of items per page',
    example: 20
  })
  limit: number;

  @ApiProperty({ 
    description: 'Total number of pages',
    example: 8
  })
  totalPages: number;

  @ApiProperty({ 
    description: 'Whether there are more pages',
    example: true
  })
  hasNext: boolean;

  @ApiProperty({ 
    description: 'Whether there are previous pages',
    example: false
  })
  hasPrevious: boolean;

  @ApiPropertyOptional({ 
    description: 'Aggregated statistics for the current result set',
    type: AttendanceStatsDto
  })
  stats?: AttendanceStatsDto;
}

export class ClockActionResponseDto {
  @ApiProperty({ 
    description: 'Success status',
    example: true
  })
  success: boolean;

  @ApiProperty({ 
    description: 'Action performed',
    example: 'CLOCK_IN'
  })
  action: 'CLOCK_IN' | 'CLOCK_OUT';

  @ApiProperty({ 
    description: 'Timestamp of the action',
    example: '2024-01-15T08:00:00.000Z'
  })
  timestamp: Date;

  @ApiProperty({ 
    description: 'Updated attendance record',
    type: AttendanceResponseDto
  })
  attendance: AttendanceResponseDto;

  @ApiPropertyOptional({ 
    description: 'Validation warnings or notices',
    example: ['Late arrival detected', 'Location verification successful']
  })
  warnings?: string[];

  @ApiPropertyOptional({ 
    description: 'Anomalies detected during the action',
    type: [AttendanceAnomalyDto]
  })
  anomalies?: AttendanceAnomalyDto[];

  @ApiProperty({ 
    description: 'Next expected action',
    example: 'CLOCK_OUT'
  })
  nextExpectedAction?: 'CLOCK_IN' | 'CLOCK_OUT' | 'NONE';
}
