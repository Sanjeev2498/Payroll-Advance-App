import {
  IsEmail,
  IsString,
  IsOptional,
  IsObject,
  IsDateString,
  IsEnum,
  IsArray,
  IsNumber,
  MaxLength,
  MinLength,
  ValidateNested,
  IsPhoneNumber,
  Min,
  Max,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum EmploymentStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  TERMINATED = 'TERMINATED',
  ON_LEAVE = 'ON_LEAVE',
}

export enum EmploymentType {
  FULL_TIME = 'FULL_TIME',
  PART_TIME = 'PART_TIME',
  CONTRACT = 'CONTRACT',
  TEMPORARY = 'TEMPORARY',
}

export class ContactInfoDto {
  @ApiPropertyOptional({ description: 'Emergency contact name' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  emergencyContactName?: string;

  @ApiPropertyOptional({ description: 'Emergency contact phone' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  emergencyContactPhone?: string;

  @ApiPropertyOptional({ description: 'Emergency contact relationship' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  emergencyContactRelationship?: string;

  @ApiPropertyOptional({ description: 'Home address' })
  @IsOptional()
  @IsObject()
  address?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
}

export class SkillDto {
  @ApiProperty({ description: 'Skill name' })
  @IsString()
  @MaxLength(50)
  name: string;

  @ApiPropertyOptional({ description: 'Skill level (1-10)' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  level?: number;

  @ApiPropertyOptional({ description: 'Years of experience' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  yearsExperience?: number;

  @ApiPropertyOptional({ description: 'Certification reference' })
  @IsOptional()
  @IsString()
  certificationRef?: string;
}

export class CertificationDto {
  @ApiProperty({ description: 'Certification name' })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiProperty({ description: 'Issuing organization' })
  @IsString()
  @MaxLength(100)
  issuingOrganization: string;

  @ApiProperty({ description: 'Issue date' })
  @IsDateString()
  @Transform(({ value }) => (value ? new Date(value) : null))
  issueDate: Date;

  @ApiPropertyOptional({ description: 'Expiry date' })
  @IsOptional()
  @IsDateString()
  @Transform(({ value }) => (value ? new Date(value) : null))
  expiryDate?: Date;

  @ApiPropertyOptional({ description: 'Certificate number' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  certificateNumber?: string;

  @ApiPropertyOptional({ description: 'Verification URL' })
  @IsOptional()
  @IsString()
  verificationUrl?: string;
}

export class ComplianceStatusDto {
  @ApiProperty({ description: 'Background check status' })
  @IsString()
  backgroundCheck: string;

  @ApiPropertyOptional({ description: 'Background check date' })
  @IsOptional()
  @IsDateString()
  backgroundCheckDate?: Date;

  @ApiProperty({ description: 'Medical clearance status' })
  @IsString()
  medicalClearance: string;

  @ApiPropertyOptional({ description: 'Medical clearance date' })
  @IsOptional()
  @IsDateString()
  medicalClearanceDate?: Date;

  @ApiPropertyOptional({ description: 'Security clearance level' })
  @IsOptional()
  @IsString()
  securityClearance?: string;

  @ApiPropertyOptional({ description: 'Drug test status' })
  @IsOptional()
  @IsString()
  drugTestStatus?: string;

  @ApiPropertyOptional({ description: 'Drug test date' })
  @IsOptional()
  @IsDateString()
  drugTestDate?: Date;
}

export class AvailabilityDto {
  @ApiPropertyOptional({ description: 'Available days of the week' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  availableDays?: string[];

  @ApiPropertyOptional({ description: 'Preferred shifts' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  preferredShifts?: string[];

  @ApiPropertyOptional({ description: 'Maximum hours per week' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(168)
  maxHoursPerWeek?: number;

  @ApiPropertyOptional({ description: 'Travel availability' })
  @IsOptional()
  @IsString()
  travelAvailability?: string;

  @ApiPropertyOptional({ description: 'Overtime availability' })
  @IsOptional()
  @IsString()
  overtimeAvailability?: string;
}

export class PerformanceMetricsDto {
  @ApiPropertyOptional({ description: 'Overall rating (1-5)' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  overallRating?: number;

  @ApiPropertyOptional({ description: 'Punctuality rating (1-5)' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  punctualityRating?: number;

  @ApiPropertyOptional({ description: 'Reliability rating (1-5)' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  reliabilityRating?: number;

  @ApiPropertyOptional({ description: 'Communication rating (1-5)' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  communicationRating?: number;

  @ApiPropertyOptional({ description: 'Last review date' })
  @IsOptional()
  @IsDateString()
  lastReviewDate?: Date;

  @ApiPropertyOptional({ description: 'Next review date' })
  @IsOptional()
  @IsDateString()
  nextReviewDate?: Date;
}

export class CreateEmployeeDto {
  @ApiProperty({
    description: 'Unique employee number',
    example: 'EMP-001',
  })
  @IsString()
  @MinLength(2)
  @MaxLength(20)
  employeeNumber: string;

  @ApiProperty({
    description: 'Employee first name',
    example: 'John',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  firstName: string;

  @ApiProperty({
    description: 'Employee last name',
    example: 'Doe',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  lastName: string;

  @ApiPropertyOptional({
    description: 'Email address',
    example: 'john.doe@example.com',
  })
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @ApiPropertyOptional({
    description: 'Phone number',
    example: '+1-555-123-4567',
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiPropertyOptional({
    description: 'Contact information and emergency contacts',
    type: ContactInfoDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ContactInfoDto)
  contactInfo?: ContactInfoDto;

  @ApiProperty({
    description: 'Hire date',
    example: '2024-01-01',
  })
  @IsDateString()
  @Transform(({ value }) => (value ? new Date(value) : null))
  hireDate: Date;

  @ApiPropertyOptional({
    description: 'Employment type',
    enum: EmploymentType,
    default: EmploymentType.FULL_TIME,
  })
  @IsOptional()
  @IsEnum(EmploymentType)
  employmentType?: EmploymentType;

  @ApiPropertyOptional({
    description: 'Department',
    example: 'Security Operations',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  department?: string;

  @ApiPropertyOptional({
    description: 'Job title',
    example: 'Security Guard',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  jobTitle?: string;

  @ApiPropertyOptional({
    description: 'Employee skills and competencies',
    type: [SkillDto],
  })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => SkillDto)
  skills?: SkillDto[];

  @ApiPropertyOptional({
    description: 'Certifications and licenses',
    type: [CertificationDto],
  })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CertificationDto)
  certifications?: CertificationDto[];

  @ApiPropertyOptional({
    description: 'Compliance tracking information',
    type: ComplianceStatusDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ComplianceStatusDto)
  complianceStatus?: ComplianceStatusDto;

  @ApiPropertyOptional({
    description: 'Availability and scheduling preferences',
    type: AvailabilityDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => AvailabilityDto)
  availability?: AvailabilityDto;

  @ApiPropertyOptional({
    description: 'Performance metrics and ratings',
    type: PerformanceMetricsDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => PerformanceMetricsDto)
  performanceMetrics?: PerformanceMetricsDto;

  @ApiPropertyOptional({
    description: 'Base hourly rate',
    example: 25.50,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  hourlyRate?: number;

  @ApiPropertyOptional({
    description: 'Additional metadata fields',
  })
  @IsOptional()
  @IsObject()
  metadata?: any;
}