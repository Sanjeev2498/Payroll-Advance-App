import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsEnum, IsObject, IsArray } from 'class-validator';

export class ContactInfoDto {
  @ApiProperty({ description: 'Contact person name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Contact phone number' })
  @IsString()
  phone: string;

  @ApiProperty({ description: 'Contact email address' })
  @IsString()
  email: string;
}

export class SiteRequirementsDto {
  @ApiProperty({ description: 'Required skills for guards', type: [String] })
  @IsArray()
  @IsString({ each: true })
  skills: string[];

  @ApiProperty({ description: 'Minimum experience in months' })
  @IsNumber()
  minimumExperience: number;

  @ApiProperty({ description: 'Shift pattern type' })
  @IsString()
  shiftPattern: string;
}

export class SitePerformanceDto {
  @ApiProperty({ description: 'Attendance rate percentage' })
  @IsNumber()
  attendanceRate: number;

  @ApiProperty({ description: 'Number of incidents' })
  @IsNumber()
  incidentCount: number;

  @ApiProperty({ description: 'Client satisfaction score' })
  @IsNumber()
  clientSatisfaction: number;
}

export class SiteDeploymentDetailDto {
  @ApiProperty({ description: 'Site unique identifier' })
  @IsString()
  siteId: string;

  @ApiProperty({ description: 'Site name' })
  @IsString()
  siteName: string;

  @ApiProperty({ description: 'Client name' })
  @IsString()
  clientName: string;

  @ApiProperty({ description: 'Number of required guards' })
  @IsNumber()
  requiredGuards: number;

  @ApiProperty({ description: 'Number of assigned guards' })
  @IsNumber()
  assignedGuards: number;

  @ApiProperty({ description: 'Number of guards currently on duty' })
  @IsNumber()
  onDutyGuards: number;

  @ApiProperty({ description: 'Number of vacant positions' })
  @IsNumber()
  vacancies: number;

  @ApiProperty({ 
    description: 'Operational status', 
    enum: ['optimal', 'understaffed', 'critical', 'offline'] 
  })
  @IsEnum(['optimal', 'understaffed', 'critical', 'offline'])
  operationalStatus: 'optimal' | 'understaffed' | 'critical' | 'offline';

  @ApiProperty({ description: 'Shift coverage percentage', required: false })
  @IsOptional()
  @IsNumber()
  shiftCoverage?: number;

  @ApiProperty({ description: 'Last update timestamp', required: false })
  @IsOptional()
  @IsString()
  lastUpdate?: string;

  @ApiProperty({ description: 'Site address', required: false })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({ description: 'Contact information', type: ContactInfoDto, required: false })
  @IsOptional()
  @IsObject()
  contactInfo?: ContactInfoDto;

  @ApiProperty({ description: 'Site requirements', type: SiteRequirementsDto, required: false })
  @IsOptional()
  @IsObject()
  requirements?: SiteRequirementsDto;

  @ApiProperty({ description: 'Performance metrics', type: SitePerformanceDto, required: false })
  @IsOptional()
  @IsObject()
  performance?: SitePerformanceDto;
}