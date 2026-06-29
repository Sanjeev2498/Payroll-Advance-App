import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { 
  ShiftType, 
  ShiftStatus, 
  ShiftPriority,
  SkillRequirementDto,
  BreakScheduleDto,
  RecurrencePatternDto 
} from './create-shift.dto';

export class ShiftResponseDto {
  @ApiProperty({ description: 'Shift ID' })
  id: string;

  @ApiPropertyOptional({ description: 'Assignment ID' })
  assignmentId?: string;

  @ApiProperty({ description: 'Site ID' })
  siteId: string;

  @ApiPropertyOptional({ description: 'Template ID' })
  templateId?: string;

  @ApiProperty({ description: 'Shift date' })
  shiftDate: string;

  @ApiProperty({ description: 'Start time' })
  startTime: string;

  @ApiProperty({ description: 'End time' })
  endTime: string;

  @ApiProperty({ description: 'Shift type', enum: ShiftType })
  shiftType: ShiftType;

  @ApiProperty({ description: 'Shift status', enum: ShiftStatus })
  status: ShiftStatus;

  @ApiProperty({ description: 'Priority level', enum: ShiftPriority })
  priority: ShiftPriority;

  @ApiProperty({ description: 'Is recurring shift' })
  isRecurring: boolean;

  @ApiPropertyOptional({ description: 'Recurrence pattern' })
  recurringPattern?: RecurrencePatternDto;

  @ApiProperty({ description: 'Coverage required' })
  coverageRequired: number;

  @ApiProperty({ description: 'Coverage assigned' })
  coverageAssigned: number;

  @ApiPropertyOptional({ description: 'Skill requirements' })
  skillRequirements?: SkillRequirementDto[];

  @ApiPropertyOptional({ description: 'Shift requirements' })
  shiftRequirements?: any;

  @ApiPropertyOptional({ description: 'Break schedule' })
  breakSchedule?: BreakScheduleDto[];

  @ApiPropertyOptional({ description: 'Modification log' })
  modificationLog?: any;

  @ApiPropertyOptional({ description: 'Notes' })
  notes?: any;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: string;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: string;

  // Optional related data
  @ApiPropertyOptional({ description: 'Assignment details' })
  assignment?: {
    id: string;
    employeeId: string;
    employee: {
      id: string;
      firstName: string;
      lastName: string;
      employeeNumber: string;
    };
  };

  @ApiPropertyOptional({ description: 'Site details' })
  site?: {
    id: string;
    name: string;
    client: {
      id: string;
      name: string;
    };
  };
}

export class ShiftListResponseDto {
  @ApiProperty({ type: [ShiftResponseDto] })
  shifts: ShiftResponseDto[];

  @ApiProperty({ description: 'Total number of shifts' })
  total: number;

  @ApiProperty({ description: 'Current page' })
  page: number;

  @ApiProperty({ description: 'Items per page' })
  limit: number;

  @ApiProperty({ description: 'Total pages' })
  totalPages: number;

  @ApiPropertyOptional({ description: 'Shift statistics' })
  stats?: {
    totalShifts: number;
    scheduledShifts: number;
    completedShifts: number;
    cancelledShifts: number;
    shiftsNeedingCoverage: number;
    coveragePercentage: number;
  };
}

export class ShiftStatsResponseDto {
  @ApiProperty({ description: 'Total shifts count' })
  totalShifts: number;

  @ApiProperty({ description: 'Shifts by status' })
  shiftsByStatus: Record<ShiftStatus, number>;

  @ApiProperty({ description: 'Shifts by type' })
  shiftsByType: Record<ShiftType, number>;

  @ApiProperty({ description: 'Coverage statistics' })
  coverageStats: {
    totalCoverageRequired: number;
    totalCoverageAssigned: number;
    coveragePercentage: number;
    shiftsNeedingCoverage: number;
  };

  @ApiProperty({ description: 'Upcoming shifts (next 7 days)' })
  upcomingShifts: number;

  @ApiProperty({ description: 'Recurring shifts count' })
  recurringShifts: number;
}