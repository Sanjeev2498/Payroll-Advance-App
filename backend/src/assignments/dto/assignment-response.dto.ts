import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AssignmentStatus } from '@prisma/client';
import { EmployeeResponseDto } from '../../employees/dto/employee-response.dto';
import { SiteResponseDto } from '../../sites/dto/site-response.dto';

export class AssignmentResponsibilityResponseDto {
  @ApiProperty({ description: 'Name of the responsibility' })
  name: string;

  @ApiPropertyOptional({ description: 'Description of the responsibility' })
  description?: string;

  @ApiPropertyOptional({ description: 'Priority level (1-5)' })
  priority?: number;

  @ApiPropertyOptional({ description: 'Required skills for this responsibility' })
  requiredSkills?: string[];
}

export class ShiftPatternResponseDto {
  @ApiProperty({ description: 'Day of week (0-6)' })
  dayOfWeek: number;

  @ApiProperty({ description: 'Start time in HH:MM format' })
  startTime: string;

  @ApiProperty({ description: 'End time in HH:MM format' })
  endTime: string;

  @ApiPropertyOptional({ description: 'Break duration in minutes' })
  breakDuration?: number;
}

export class AssignmentResponseDto {
  @ApiProperty({ description: 'Assignment ID', format: 'uuid' })
  id: string;

  @ApiProperty({ description: 'Employee ID', format: 'uuid' })
  employeeId: string;

  @ApiProperty({ description: 'Site ID', format: 'uuid' })
  siteId: string;

  @ApiProperty({ description: 'Role for the assignment' })
  role: string;

  @ApiPropertyOptional({ 
    description: 'Detailed responsibilities', 
    type: [AssignmentResponsibilityResponseDto] 
  })
  responsibilities?: AssignmentResponsibilityResponseDto[];

  @ApiProperty({ description: 'Hourly rate', type: 'number' })
  hourlyRate: number;

  @ApiProperty({ description: 'Assignment status', enum: AssignmentStatus })
  status: AssignmentStatus;

  @ApiProperty({ description: 'Assignment start date', format: 'date' })
  startDate: Date;

  @ApiPropertyOptional({ description: 'Assignment end date', format: 'date' })
  endDate?: Date;

  @ApiPropertyOptional({ 
    description: 'Shift patterns', 
    type: [ShiftPatternResponseDto] 
  })
  shiftPatterns?: ShiftPatternResponseDto[];

  @ApiPropertyOptional({ description: 'Priority level (1-5)' })
  priority?: number;

  @ApiPropertyOptional({ description: 'Urgency level (1-5)' })
  urgency?: number;

  @ApiPropertyOptional({ description: 'Required certifications' })
  requiredCertifications?: string[];

  @ApiPropertyOptional({ description: 'Required skills' })
  requiredSkills?: string[];

  @ApiPropertyOptional({ description: 'Assignment notes' })
  notes?: string;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  metadata?: any;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: Date;

  // Optional related entities
  @ApiPropertyOptional({ description: 'Employee details', type: EmployeeResponseDto })
  employee?: EmployeeResponseDto;

  @ApiPropertyOptional({ description: 'Site details', type: SiteResponseDto })
  site?: SiteResponseDto;

  @ApiPropertyOptional({ description: 'Number of active shifts' })
  activeShiftsCount?: number;

  @ApiPropertyOptional({ description: 'Total shifts count' })
  totalShiftsCount?: number;

  @ApiPropertyOptional({ description: 'Skill matching score (0-100)' })
  skillMatchingScore?: number;

  @ApiPropertyOptional({ description: 'Performance rating for this assignment' })
  performanceRating?: number;
}

export class AssignmentListResponseDto {
  @ApiProperty({ description: 'List of assignments', type: [AssignmentResponseDto] })
  assignments: AssignmentResponseDto[];

  @ApiProperty({ description: 'Total number of assignments' })
  total: number;

  @ApiProperty({ description: 'Current page number' })
  page: number;

  @ApiProperty({ description: 'Number of items per page' })
  limit: number;

  @ApiProperty({ description: 'Total number of pages' })
  totalPages: number;
}

export class AssignmentStatsResponseDto {
  @ApiProperty({ description: 'Total assignments' })
  total: number;

  @ApiProperty({ description: 'Active assignments' })
  active: number;

  @ApiProperty({ description: 'Inactive assignments' })
  inactive: number;

  @ApiProperty({ description: 'Completed assignments' })
  completed: number;

  @ApiProperty({ description: 'Cancelled assignments' })
  cancelled: number;

  @ApiProperty({ description: 'Assignments with conflicts' })
  conflicted: number;

  @ApiProperty({ description: 'Assignments requiring urgent attention' })
  urgent: number;

  @ApiProperty({ description: 'Average hourly rate across all assignments' })
  averageHourlyRate: number;

  @ApiProperty({ description: 'Total unique employees assigned' })
  uniqueEmployees: number;

  @ApiProperty({ description: 'Total unique sites with assignments' })
  uniqueSites: number;

  @ApiProperty({ description: 'Assignments by role distribution' })
  roleDistribution: Record<string, number>;

  @ApiProperty({ description: 'Average skill matching score' })
  averageSkillMatchScore: number;
}