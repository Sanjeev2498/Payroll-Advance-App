import { IsUUID, IsOptional, IsArray, IsString, IsNumber, Min, Max, IsEnum } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EmployeeResponseDto } from '../../employees/dto/employee-response.dto';

export enum RecommendationCriteria {
  SKILL_MATCH = 'SKILL_MATCH',
  AVAILABILITY = 'AVAILABILITY',
  PROXIMITY = 'PROXIMITY',
  PERFORMANCE = 'PERFORMANCE',
  EXPERIENCE = 'EXPERIENCE',
  COST_EFFECTIVENESS = 'COST_EFFECTIVENESS'
}

export class AssignmentRecommendationRequestDto {
  @ApiProperty({
    description: 'Site ID requiring assignment',
    format: 'uuid',
  })
  @IsUUID()
  siteId: string;

  @ApiProperty({
    description: 'Role for the assignment',
    example: 'Security Guard',
  })
  @IsString()
  role: string;

  @ApiPropertyOptional({
    description: 'Required skills for the assignment',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  requiredSkills?: string[];

  @ApiPropertyOptional({
    description: 'Required certifications for the assignment',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  requiredCertifications?: string[];

  @ApiPropertyOptional({
    description: 'Assignment start date for availability check',
    format: 'date',
  })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Assignment end date for availability check',
    format: 'date',
  })
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Maximum hourly rate budget',
  })
  @IsOptional()
  @Transform(({ value }) => parseFloat(value))
  maxHourlyRate?: number;

  @ApiPropertyOptional({
    description: 'Minimum experience level in years',
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  minExperienceYears?: number;

  @ApiPropertyOptional({
    description: 'Minimum performance rating (1-5)',
    minimum: 1,
    maximum: 5,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  minPerformanceRating?: number;

  @ApiPropertyOptional({
    description: 'Maximum distance from site in kilometers',
  })
  @IsOptional()
  @Transform(({ value }) => parseFloat(value))
  maxDistanceKm?: number;

  @ApiPropertyOptional({
    description: 'Recommendation criteria priority',
    enum: RecommendationCriteria,
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  @IsEnum(RecommendationCriteria, { each: true })
  criteria?: RecommendationCriteria[];

  @ApiPropertyOptional({
    description: 'Maximum number of recommendations to return',
    default: 10,
    minimum: 1,
    maximum: 50,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(50)
  limit?: number;
}

export class SkillMatchingDetailsDto {
  @ApiProperty({ description: 'Skills that match requirements' })
  matchedSkills: string[];

  @ApiProperty({ description: 'Skills that are missing' })
  missingSkills: string[];

  @ApiProperty({ description: 'Skill matching percentage (0-100)' })
  matchPercentage: number;

  @ApiProperty({ description: 'Skill match score (weighted)' })
  skillScore: number;
}

export class CertificationMatchingDetailsDto {
  @ApiProperty({ description: 'Certifications that match requirements' })
  matchedCertifications: string[];

  @ApiProperty({ description: 'Missing certifications' })
  missingCertifications: string[];

  @ApiProperty({ description: 'Expired certifications' })
  expiredCertifications: string[];

  @ApiProperty({ description: 'Certification match percentage (0-100)' })
  matchPercentage: number;
}

export class AvailabilityDetailsDto {
  @ApiProperty({ description: 'Whether employee is available for the period' })
  isAvailable: boolean;

  @ApiProperty({ description: 'Conflicting assignments if any' })
  conflicts: string[];

  @ApiProperty({ description: 'Available hours per week' })
  availableHoursPerWeek: number;

  @ApiProperty({ description: 'Availability score (0-100)' })
  availabilityScore: number;
}

export class ProximityDetailsDto {
  @ApiProperty({ description: 'Distance from employee location to site in km' })
  distanceKm: number;

  @ApiProperty({ description: 'Estimated travel time in minutes' })
  travelTimeMinutes: number;

  @ApiProperty({ description: 'Proximity score (0-100)' })
  proximityScore: number;
}

export class PerformanceDetailsDto {
  @ApiProperty({ description: 'Overall performance rating (1-5)' })
  overallRating: number;

  @ApiProperty({ description: 'Punctuality rating (1-5)' })
  punctualityRating: number;

  @ApiProperty({ description: 'Quality of work rating (1-5)' })
  qualityRating: number;

  @ApiProperty({ description: 'Customer feedback rating (1-5)' })
  customerFeedbackRating: number;

  @ApiProperty({ description: 'Performance score (0-100)' })
  performanceScore: number;
}

export class ExperienceDetailsDto {
  @ApiProperty({ description: 'Total years of experience' })
  totalYears: number;

  @ApiProperty({ description: 'Years in similar roles' })
  relevantYears: number;

  @ApiProperty({ description: 'Previous assignments count' })
  assignmentsCount: number;

  @ApiProperty({ description: 'Experience score (0-100)' })
  experienceScore: number;
}

export class CostEffectivenessDetailsDto {
  @ApiProperty({ description: 'Employee hourly rate' })
  hourlyRate: number;

  @ApiProperty({ description: 'Cost relative to market rate' })
  marketRateComparison: number;

  @ApiProperty({ description: 'Value for money ratio' })
  valueRatio: number;

  @ApiProperty({ description: 'Cost effectiveness score (0-100)' })
  costScore: number;
}

export class AssignmentRecommendationDto {
  @ApiProperty({ description: 'Employee details', type: EmployeeResponseDto })
  employee: EmployeeResponseDto;

  @ApiProperty({ description: 'Overall recommendation score (0-100)' })
  overallScore: number;

  @ApiProperty({ description: 'Recommendation rank (1-based)' })
  rank: number;

  @ApiProperty({ description: 'Recommendation confidence level (0-100)' })
  confidenceLevel: number;

  @ApiProperty({ description: 'Skill matching details' })
  skillMatching: SkillMatchingDetailsDto;

  @ApiProperty({ description: 'Certification matching details' })
  certificationMatching: CertificationMatchingDetailsDto;

  @ApiProperty({ description: 'Availability details' })
  availability: AvailabilityDetailsDto;

  @ApiProperty({ description: 'Proximity details' })
  proximity: ProximityDetailsDto;

  @ApiProperty({ description: 'Performance details' })
  performance: PerformanceDetailsDto;

  @ApiProperty({ description: 'Experience details' })
  experience: ExperienceDetailsDto;

  @ApiProperty({ description: 'Cost effectiveness details' })
  costEffectiveness: CostEffectivenessDetailsDto;

  @ApiPropertyOptional({ description: 'Recommendation notes and insights' })
  notes?: string;

  @ApiPropertyOptional({ description: 'Potential risks or concerns' })
  risks?: string[];

  @ApiPropertyOptional({ description: 'Estimated assignment success probability (0-100)' })
  successProbability?: number;
}

export class AssignmentRecommendationResponseDto {
  @ApiProperty({ description: 'Site ID for which recommendations were generated' })
  siteId: string;

  @ApiProperty({ description: 'Role for the assignment' })
  role: string;

  @ApiProperty({ description: 'List of recommendations', type: [AssignmentRecommendationDto] })
  recommendations: AssignmentRecommendationDto[];

  @ApiProperty({ description: 'Total number of employees evaluated' })
  totalEvaluated: number;

  @ApiProperty({ description: 'Number of recommendations returned' })
  recommendationsCount: number;

  @ApiProperty({ description: 'Recommendation criteria used' })
  criteriaUsed: RecommendationCriteria[];

  @ApiProperty({ description: 'Analysis timestamp' })
  generatedAt: Date;

  @ApiPropertyOptional({ description: 'Additional insights or notes' })
  insights?: string;

  @ApiPropertyOptional({ description: 'Warnings about the recommendation quality' })
  warnings?: string[];
}