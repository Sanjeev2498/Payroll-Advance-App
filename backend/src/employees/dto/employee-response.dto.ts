import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  EmploymentStatus,
  EmploymentType,
  ContactInfoDto,
  SkillDto,
  CertificationDto,
  ComplianceStatusDto,
  AvailabilityDto,
  PerformanceMetricsDto,
} from './create-employee.dto';

export class EmployeeStatsDto {
  @ApiProperty({ description: 'Number of active assignments' })
  activeAssignments: number;

  @ApiProperty({ description: 'Number of completed assignments' })
  completedAssignments: number;

  @ApiProperty({ description: 'Total hours worked (last 30 days)' })
  hoursWorkedLast30Days: number;

  @ApiProperty({ description: 'Total earnings (last 30 days)' })
  earningsLast30Days: number;
}

export class DocumentDto {
  @ApiProperty({ description: 'Document unique identifier' })
  id: string;

  @ApiProperty({ description: 'Document type' })
  type: string;

  @ApiProperty({ description: 'Document name' })
  name: string;

  @ApiProperty({ description: 'File path or URL' })
  filePath: string;

  @ApiProperty({ description: 'Upload date' })
  uploadedAt: Date;

  @ApiProperty({ description: 'Document status' })
  status: string;

  @ApiPropertyOptional({ description: 'Expiry date if applicable' })
  expiryDate?: Date;
}

export class EmployeeResponseDto {
  @ApiProperty({ description: 'Employee unique identifier' })
  id: string;

  @ApiProperty({ description: 'Company ID (tenant)' })
  companyId: string;

  @ApiProperty({ description: 'Unique employee number' })
  employeeNumber: string;

  @ApiProperty({ description: 'Employee first name' })
  firstName: string;

  @ApiProperty({ description: 'Employee last name' })
  lastName: string;

  @ApiPropertyOptional({ description: 'Email address' })
  email?: string;

  @ApiPropertyOptional({ description: 'Phone number' })
  phone?: string;

  @ApiPropertyOptional({ description: 'Contact information', type: ContactInfoDto })
  contactInfo?: ContactInfoDto;

  @ApiProperty({ description: 'Employment status', enum: EmploymentStatus })
  employmentStatus: EmploymentStatus;

  @ApiPropertyOptional({ description: 'Employment type', enum: EmploymentType })
  employmentType?: EmploymentType;

  @ApiPropertyOptional({ description: 'Department' })
  department?: string;

  @ApiPropertyOptional({ description: 'Job title' })
  jobTitle?: string;

  @ApiProperty({ description: 'Hire date' })
  hireDate: Date;

  @ApiPropertyOptional({ description: 'Termination date if applicable' })
  terminationDate?: Date;

  @ApiPropertyOptional({ description: 'Skills and competencies', type: [SkillDto] })
  skills?: SkillDto[];

  @ApiPropertyOptional({ description: 'Certifications and licenses', type: [CertificationDto] })
  certifications?: CertificationDto[];

  @ApiPropertyOptional({ description: 'Compliance status', type: ComplianceStatusDto })
  complianceStatus?: ComplianceStatusDto;

  @ApiPropertyOptional({ description: 'Availability preferences', type: AvailabilityDto })
  availability?: AvailabilityDto;

  @ApiPropertyOptional({ description: 'Performance metrics', type: PerformanceMetricsDto })
  performanceMetrics?: PerformanceMetricsDto;

  @ApiPropertyOptional({ description: 'Base hourly rate' })
  hourlyRate?: number;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  metadata?: any;

  @ApiProperty({ description: 'Employee creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: Date;

  @ApiPropertyOptional({ description: 'Employee statistics', type: EmployeeStatsDto })
  _count?: EmployeeStatsDto;
}

export class EmployeeListResponseDto {
  @ApiProperty({ description: 'List of employees', type: [EmployeeResponseDto] })
  employees: EmployeeResponseDto[];

  @ApiProperty({ description: 'Total number of employees' })
  total: number;

  @ApiProperty({ description: 'Current page number' })
  page: number;

  @ApiProperty({ description: 'Items per page' })
  limit: number;

  @ApiProperty({ description: 'Total number of pages' })
  totalPages: number;
}

export class EmployeeStatsResponseDto {
  @ApiProperty({ description: 'Total number of employees' })
  total: number;

  @ApiProperty({ description: 'Number of active employees' })
  active: number;

  @ApiProperty({ description: 'Number of inactive employees' })
  inactive: number;

  @ApiProperty({ description: 'Number of employees on leave' })
  onLeave: number;

  @ApiProperty({ description: 'Number of terminated employees' })
  terminated: number;

  @ApiProperty({ description: 'Number of employees with expiring certifications' })
  certificationsExpiringSoon: number;

  @ApiProperty({ description: 'Number of employees with compliance issues' })
  complianceIssues: number;

  @ApiProperty({ description: 'Average performance rating' })
  averagePerformanceRating: number;
}

export class SkillMatchDto {
  @ApiProperty({ description: 'Employee information', type: EmployeeResponseDto })
  employee: EmployeeResponseDto;

  @ApiProperty({ description: 'Skill match percentage (0-100)' })
  matchPercentage: number;

  @ApiProperty({ description: 'Matched skills', type: [String] })
  matchedSkills: string[];

  @ApiProperty({ description: 'Missing skills', type: [String] })
  missingSkills: string[];

  @ApiProperty({ description: 'Availability score (0-100)' })
  availabilityScore: number;
}

export class EmployeeAvailabilityDto {
  @ApiProperty({ description: 'Employee information', type: EmployeeResponseDto })
  employee: EmployeeResponseDto;

  @ApiProperty({ description: 'Availability status' })
  status: 'AVAILABLE' | 'PARTIALLY_AVAILABLE' | 'UNAVAILABLE';

  @ApiProperty({ description: 'Available time slots' })
  availableSlots: Array<{
    start: Date;
    end: Date;
    type: 'FULL' | 'PARTIAL';
  }>;

  @ApiProperty({ description: 'Conflicting assignments' })
  conflicts: Array<{
    assignmentId: string;
    siteName: string;
    period: { start: Date; end: Date };
  }>;
}

export class DocumentUploadDto {
  @ApiProperty({ description: 'Document type' })
  type: string;

  @ApiProperty({ description: 'Document name' })
  name: string;

  @ApiProperty({ description: 'File content (base64 encoded)' })
  fileContent: string;

  @ApiProperty({ description: 'File extension' })
  fileExtension: string;

  @ApiPropertyOptional({ description: 'Document expiry date' })
  expiryDate?: Date;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  metadata?: any;
}

export class DocumentResponseDto {
  @ApiProperty({ description: 'Document ID' })
  id: string;

  @ApiProperty({ description: 'Employee ID' })
  employeeId: string;

  @ApiProperty({ description: 'Document type' })
  type: string;

  @ApiProperty({ description: 'Document name' })
  name: string;

  @ApiProperty({ description: 'File path' })
  filePath: string;

  @ApiProperty({ description: 'File size in bytes' })
  fileSize: number;

  @ApiProperty({ description: 'Upload timestamp' })
  uploadedAt: Date;

  @ApiProperty({ description: 'Document status' })
  status: string;

  @ApiPropertyOptional({ description: 'Expiry date' })
  expiryDate?: Date;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  metadata?: any;
}