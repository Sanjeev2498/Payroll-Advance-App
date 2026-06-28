import { IsArray, IsOptional, IsString, IsNumber, Min, Max } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EmployeeResponseDto } from '../../employees/dto/employee-response.dto';

export enum SkillLevel {
  BEGINNER = 1,
  INTERMEDIATE = 2,
  ADVANCED = 3,
  EXPERT = 4,
  MASTER = 5
}

export class SkillRequirementDto {
  @ApiProperty({ description: 'Name of the skill' })
  @IsString()
  name: string;

  @ApiProperty({ 
    description: 'Required proficiency level (1-5)', 
    minimum: 1, 
    maximum: 5,
    enum: SkillLevel 
  })
  @IsNumber()
  @Min(1)
  @Max(5)
  level: SkillLevel;

  @ApiPropertyOptional({ description: 'Whether this skill is mandatory' })
  @IsOptional()
  mandatory?: boolean;

  @ApiPropertyOptional({ description: 'Weight/importance of this skill (1-10)' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  weight?: number;

  @ApiPropertyOptional({ description: 'Category of the skill' })
  @IsOptional()
  @IsString()
  category?: string;
}

export class EmployeeSkillDto {
  @ApiProperty({ description: 'Name of the skill' })
  name: string;

  @ApiProperty({ description: 'Employee proficiency level (1-5)' })
  level: SkillLevel;

  @ApiPropertyOptional({ description: 'Years of experience with this skill' })
  experienceYears?: number;

  @ApiPropertyOptional({ description: 'Certification status for this skill' })
  certified?: boolean;

  @ApiPropertyOptional({ description: 'Last assessment date' })
  lastAssessed?: Date;

  @ApiPropertyOptional({ description: 'Assessment score (0-100)' })
  assessmentScore?: number;
}

export class SkillMatchingRequestDto {
  @ApiProperty({ 
    description: 'Required skills with proficiency levels',
    type: [SkillRequirementDto]
  })
  @IsArray()
  requiredSkills: SkillRequirementDto[];

  @ApiPropertyOptional({
    description: 'Employee IDs to evaluate (if empty, evaluates all active employees)',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  employeeIds?: string[];

  @ApiPropertyOptional({
    description: 'Minimum overall match percentage (0-100)',
    default: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  minMatchPercentage?: number;

  @ApiPropertyOptional({
    description: 'Include employees with partial skill matches',
    default: true,
  })
  @IsOptional()
  includePartialMatches?: boolean;

  @ApiPropertyOptional({
    description: 'Maximum number of results to return',
    default: 50,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  maxResults?: number;

  @ApiPropertyOptional({
    description: 'Skill categories to prioritize',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  priorityCategories?: string[];
}

export class SkillGapAnalysisDto {
  @ApiProperty({ description: 'Required skill details' })
  requiredSkill: SkillRequirementDto;

  @ApiPropertyOptional({ description: 'Employee skill details (if they have it)' })
  employeeSkill?: EmployeeSkillDto;

  @ApiProperty({ description: 'Whether employee meets the requirement' })
  meets: boolean;

  @ApiProperty({ description: 'Proficiency gap (negative if exceeds requirement)' })
  proficiencyGap: number;

  @ApiProperty({ description: 'Gap severity (0-100, higher is worse)' })
  gapSeverity: number;

  @ApiPropertyOptional({ description: 'Estimated training time to close gap' })
  estimatedTrainingHours?: number;

  @ApiPropertyOptional({ description: 'Training recommendations' })
  trainingRecommendations?: string[];
}

export class SkillMatchingResultDto {
  @ApiProperty({ description: 'Employee details', type: EmployeeResponseDto })
  employee: EmployeeResponseDto;

  @ApiProperty({ description: 'Overall skill match percentage (0-100)' })
  overallMatchPercentage: number;

  @ApiProperty({ description: 'Weighted skill score (considers skill importance)' })
  weightedScore: number;

  @ApiProperty({ description: 'Number of skills that meet requirements' })
  skillsMet: number;

  @ApiProperty({ description: 'Total number of required skills' })
  totalRequired: number;

  @ApiProperty({ description: 'Number of mandatory skills met' })
  mandatorySkillsMet: number;

  @ApiProperty({ description: 'Total mandatory skills required' })
  totalMandatory: number;

  @ApiProperty({ description: 'Detailed skill gap analysis', type: [SkillGapAnalysisDto] })
  skillGaps: SkillGapAnalysisDto[];

  @ApiProperty({ description: 'Skills that exceed requirements' })
  exceededSkills: EmployeeSkillDto[];

  @ApiProperty({ description: 'Additional skills not required but valuable' })
  additionalSkills: EmployeeSkillDto[];

  @ApiProperty({ description: 'Overall confidence in this match (0-100)' })
  confidenceScore: number;

  @ApiPropertyOptional({ description: 'Estimated total training hours needed' })
  totalTrainingHours?: number;

  @ApiPropertyOptional({ description: 'Training cost estimate' })
  trainingCostEstimate?: number;

  @ApiPropertyOptional({ description: 'Time to become fully qualified' })
  timeToQualification?: string;

  @ApiPropertyOptional({ description: 'Risk factors for this assignment' })
  riskFactors?: string[];

  @ApiPropertyOptional({ description: 'Strengths of this employee for the role' })
  strengths?: string[];
}

export class SkillMatchingResponseDto {
  @ApiProperty({ description: 'Matching results ordered by best match', type: [SkillMatchingResultDto] })
  matches: SkillMatchingResultDto[];

  @ApiProperty({ description: 'Total employees evaluated' })
  totalEvaluated: number;

  @ApiProperty({ description: 'Number of matches returned' })
  matchesReturned: number;

  @ApiProperty({ description: 'Average match percentage across all candidates' })
  averageMatchPercentage: number;

  @ApiProperty({ description: 'Best possible match percentage found' })
  bestMatchPercentage: number;

  @ApiProperty({ description: 'Analysis summary' })
  summary: {
    perfectMatches: number; // 100% match
    excellentMatches: number; // 90-99%
    goodMatches: number; // 70-89%
    fairMatches: number; // 50-69%
    poorMatches: number; // <50%
  };

  @ApiProperty({ description: 'Skills that are commonly missing across candidates' })
  commonSkillGaps: Array<{
    skillName: string;
    requiredLevel: SkillLevel;
    missingInPercent: number;
    averageGap: number;
  }>;

  @ApiPropertyOptional({ description: 'Recommended training programs' })
  trainingRecommendations?: Array<{
    skillName: string;
    trainingType: string;
    estimatedDuration: string;
    estimatedCost: number;
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
  }>;

  @ApiProperty({ description: 'Analysis timestamp' })
  analyzedAt: Date;

  @ApiPropertyOptional({ description: 'Additional insights from the analysis' })
  insights?: string[];
}

export class SkillInventoryRequestDto {
  @ApiPropertyOptional({
    description: 'Specific employee IDs to include in inventory',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  employeeIds?: string[];

  @ApiPropertyOptional({
    description: 'Skill categories to include',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categories?: string[];

  @ApiPropertyOptional({
    description: 'Minimum skill level to include',
    minimum: 1,
    maximum: 5,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  minLevel?: SkillLevel;

  @ApiPropertyOptional({
    description: 'Include only certified skills',
    default: false,
  })
  @IsOptional()
  includeCertifiedOnly?: boolean;
}

export class SkillInventoryResponseDto {
  @ApiProperty({ description: 'Skills inventory by category' })
  skillsByCategory: Record<string, Array<{
    skillName: string;
    employeeCount: number;
    averageLevel: number;
    certifiedCount: number;
    levels: Record<SkillLevel, number>;
  }>>;

  @ApiProperty({ description: 'Skills in high demand but short supply' })
  skillShortages: Array<{
    skillName: string;
    demandLevel: 'HIGH' | 'MEDIUM' | 'LOW';
    currentSupply: number;
    estimatedDemand: number;
    shortageGap: number;
  }>;

  @ApiProperty({ description: 'Most common skills across the workforce' })
  topSkills: Array<{
    skillName: string;
    employeeCount: number;
    percentage: number;
    averageLevel: number;
  }>;

  @ApiProperty({ description: 'Skills that need development' })
  developmentNeeds: Array<{
    skillName: string;
    currentAverageLevel: number;
    targetLevel: number;
    employeesNeedingDevelopment: number;
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
  }>;

  @ApiProperty({ description: 'Overall workforce skill metrics' })
  metrics: {
    totalEmployees: number;
    totalUniqueSkills: number;
    averageSkillsPerEmployee: number;
    averageSkillLevel: number;
    certificationRate: number;
  };

  @ApiProperty({ description: 'Analysis timestamp' })
  analyzedAt: Date;
}