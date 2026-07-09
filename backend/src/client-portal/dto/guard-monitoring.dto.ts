import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsUUID, IsEnum, IsDateString } from 'class-validator';

export enum GuardStatus {
  ON_DUTY = 'ON_DUTY',
  OFF_DUTY = 'OFF_DUTY',
  ON_BREAK = 'ON_BREAK',
  LATE = 'LATE',
  ABSENT = 'ABSENT',
  EMERGENCY = 'EMERGENCY',
}

export enum SiteCoverageStatus {
  FULLY_COVERED = 'FULLY_COVERED',
  PARTIALLY_COVERED = 'PARTIALLY_COVERED',
  UNCOVERED = 'UNCOVERED',
  OVER_STAFFED = 'OVER_STAFFED',
}

export class GuardMonitoringQueryDto {
  @ApiProperty({
    description: 'Client ID for guard monitoring',
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
    description: 'Filter by guard status',
    enum: GuardStatus,
    required: false,
  })
  @IsOptional()
  @IsEnum(GuardStatus)
  status?: GuardStatus;

  @ApiProperty({
    description: 'Date for monitoring data (ISO format, defaults to today)',
    example: '2024-01-15',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  date?: string;
}

export class GuardDeploymentResponseDto {
  @ApiProperty({
    description: 'Live deployment status for all client sites',
    example: [
      {
        siteId: 'site-1',
        siteName: 'Main Office',
        requiredGuards: 4,
        assignedGuards: 4,
        onDutyGuards: 3,
        coverageStatus: 'PARTIALLY_COVERED',
        guards: [
          {
            guardId: 'emp-1',
            guardName: 'John Doe',
            status: 'ON_DUTY',
            shiftStart: '08:00',
            shiftEnd: '20:00',
            location: { lat: 12.9716, lng: 77.5946 },
            lastCheckIn: '2024-01-15T08:00:00Z',
            photo: 'https://example.com/photo.jpg',
          },
        ],
      },
    ],
  })
  deploymentStatus: Array<{
    siteId: string;
    siteName: string;
    requiredGuards: number;
    assignedGuards: number;
    onDutyGuards: number;
    coverageStatus: SiteCoverageStatus;
    guards: Array<{
      guardId: string;
      guardName: string;
      status: GuardStatus;
      shiftStart: string;
      shiftEnd: string;
      location?: { lat: number; lng: number };
      lastCheckIn: string;
      photo?: string;
      contactNumber?: string;
      emergencyContact?: string;
    }>;
  }>;

  @ApiProperty({
    description: 'Guard performance metrics',
    example: [
      {
        guardId: 'emp-1',
        guardName: 'John Doe',
        attendanceRate: 98.5,
        punctualityScore: 95.2,
        recentIncidents: 0,
        clientRating: 4.8,
        lastPerformanceReview: '2024-01-01',
      },
    ],
  })
  guardPerformance: Array<{
    guardId: string;
    guardName: string;
    attendanceRate: number;
    punctualityScore: number;
    recentIncidents: number;
    clientRating: number;
    lastPerformanceReview: string;
  }>;

  @ApiProperty({
    description: 'Site coverage visualization data',
    example: {
      totalSites: 15,
      fullyCovered: 12,
      partiallyCovered: 2,
      uncovered: 1,
      overStaffed: 0,
    },
  })
  coverageVisualization: {
    totalSites: number;
    fullyCovered: number;
    partiallyCovered: number;
    uncovered: number;
    overStaffed: number;
  };
}

export class GuardReplacementRequestDto {
  @ApiProperty({
    description: 'Site ID where replacement is needed',
    example: 'site-abc-123',
  })
  @IsUUID()
  siteId: string;

  @ApiProperty({
    description: 'Current guard ID to be replaced',
    example: 'emp-456',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  currentGuardId?: string;

  @ApiProperty({
    description: 'Reason for replacement',
    example: 'Guard called in sick',
  })
  reason: string;

  @ApiProperty({
    description: 'Urgency level of replacement',
    enum: ['LOW', 'MEDIUM', 'HIGH', 'EMERGENCY'],
  })
  @IsEnum(['LOW', 'MEDIUM', 'HIGH', 'EMERGENCY'])
  urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'EMERGENCY';

  @ApiProperty({
    description: 'Preferred replacement start time (ISO format)',
    example: '2024-01-15T08:00:00Z',
  })
  @IsDateString()
  preferredStartTime: string;

  @ApiProperty({
    description: 'Duration of replacement in hours',
    example: 8,
  })
  durationHours: number;

  @ApiProperty({
    description: 'Special requirements for replacement guard',
    example: 'Must have valid security license',
    required: false,
  })
  @IsOptional()
  specialRequirements?: string;
}