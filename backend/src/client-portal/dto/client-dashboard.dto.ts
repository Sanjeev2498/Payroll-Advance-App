import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsDateString, IsUUID } from 'class-validator';

export class ClientDashboardDto {
  @ApiProperty({
    description: 'Client ID for dashboard data',
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  })
  @IsUUID()
  clientId: string;

  @ApiProperty({
    description: 'Start date for dashboard metrics (ISO format)',
    example: '2024-01-01',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({
    description: 'End date for dashboard metrics (ISO format)',
    example: '2024-01-31',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class ClientDashboardResponseDto {
  @ApiProperty({
    description: 'Real-time site overview metrics',
    example: {
      totalSites: 15,
      activeSites: 12,
      inactiveSites: 3,
      sitesWithIssues: 1,
    },
  })
  siteOverview: {
    totalSites: number;
    activeSites: number;
    inactiveSites: number;
    sitesWithIssues: number;
  };

  @ApiProperty({
    description: 'Guard deployment status across all sites',
    example: {
      totalGuards: 45,
      activeGuards: 42,
      onDutyGuards: 38,
      vacantPositions: 3,
    },
  })
  guardDeployment: {
    totalGuards: number;
    activeGuards: number;
    onDutyGuards: number;
    vacantPositions: number;
  };

  @ApiProperty({
    description: 'Attendance metrics for current period',
    example: {
      attendanceRate: 96.5,
      lateArrivals: 5,
      earlyDepartures: 2,
      missedShifts: 1,
    },
  })
  attendanceMetrics: {
    attendanceRate: number;
    lateArrivals: number;
    earlyDepartures: number;
    missedShifts: number;
  };

  @ApiProperty({
    description: 'Recent incidents and alerts',
    example: [
      {
        id: 'incident-1',
        type: 'LATE_ARRIVAL',
        siteName: 'Main Office',
        employeeName: 'John Doe',
        timestamp: '2024-01-15T08:15:00Z',
        severity: 'LOW',
      },
    ],
  })
  recentIncidents: Array<{
    id: string;
    type: string;
    siteName: string;
    employeeName?: string;
    timestamp: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  }>;

  @ApiProperty({
    description: 'Quick actions and notifications',
    example: [
      {
        id: 'notification-1',
        type: 'GUARD_REPLACEMENT_REQUEST',
        message: 'Guard replacement needed at Site A',
        priority: 'HIGH',
        timestamp: '2024-01-15T09:00:00Z',
        actionRequired: true,
      },
    ],
  })
  notifications: Array<{
    id: string;
    type: string;
    message: string;
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
    timestamp: string;
    actionRequired: boolean;
  }>;

  @ApiProperty({
    description: 'Site health indicators',
    example: [
      {
        siteId: 'site-1',
        siteName: 'Main Office',
        healthScore: 95,
        status: 'EXCELLENT',
        lastUpdate: '2024-01-15T10:00:00Z',
        issues: [],
      },
    ],
  })
  siteHealth: Array<{
    siteId: string;
    siteName: string;
    healthScore: number;
    status: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' | 'CRITICAL';
    lastUpdate: string;
    issues: string[];
  }>;
}