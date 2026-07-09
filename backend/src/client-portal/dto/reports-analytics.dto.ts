import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsUUID, IsDateString, IsEnum, IsArray } from 'class-validator';

export enum ReportType {
  SITE_PERFORMANCE = 'SITE_PERFORMANCE',
  GUARD_DEPLOYMENT = 'GUARD_DEPLOYMENT',
  ATTENDANCE_TRENDS = 'ATTENDANCE_TRENDS',
  SERVICE_COMPLIANCE = 'SERVICE_COMPLIANCE',
  BILLING_SUMMARY = 'BILLING_SUMMARY',
  INCIDENT_ANALYSIS = 'INCIDENT_ANALYSIS',
}

export enum ReportFormat {
  PDF = 'PDF',
  EXCEL = 'EXCEL',
  CSV = 'CSV',
}

export class ClientReportsQueryDto {
  @ApiProperty({
    description: 'Client ID for reports',
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  })
  @IsUUID()
  clientId: string;

  @ApiProperty({
    description: 'Type of report to generate',
    enum: ReportType,
    required: false,
  })
  @IsOptional()
  @IsEnum(ReportType)
  reportType?: ReportType;

  @ApiProperty({
    description: 'Start date for report data (ISO format)',
    example: '2024-01-01',
  })
  @IsDateString()
  startDate: string;

  @ApiProperty({
    description: 'End date for report data (ISO format)',
    example: '2024-01-31',
  })
  @IsDateString()
  endDate: string;

  @ApiProperty({
    description: 'Filter by specific site IDs',
    example: ['site-1', 'site-2'],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  siteIds?: string[];

  @ApiProperty({
    description: 'Report output format',
    enum: ReportFormat,
    required: false,
  })
  @IsOptional()
  @IsEnum(ReportFormat)
  format?: ReportFormat = ReportFormat.PDF;
}

export class SitePerformanceMetricsDto {
  @ApiProperty({
    description: 'Site information',
    example: {
      id: 'site-789',
      name: 'Main Office',
      address: '123 Business District',
    },
  })
  site: {
    id: string;
    name: string;
    address: string;
  };

  @ApiProperty({
    description: 'Performance score (0-100)',
    example: 95.5,
  })
  performanceScore: number;

  @ApiProperty({
    description: 'Attendance metrics',
    example: {
      averageAttendance: 96.8,
      punctualityRate: 94.2,
      completionRate: 99.1,
    },
  })
  attendanceMetrics: {
    averageAttendance: number;
    punctualityRate: number;
    completionRate: number;
  };

  @ApiProperty({
    description: 'Service delivery metrics',
    example: {
      responseTime: 2.5,
      incidentResolution: 98.5,
      clientSatisfaction: 4.7,
    },
  })
  serviceMetrics: {
    responseTime: number;
    incidentResolution: number;
    clientSatisfaction: number;
  };

  @ApiProperty({
    description: 'Compliance metrics',
    example: {
      documentCompliance: 100.0,
      trainingCompliance: 95.0,
      certificationStatus: 98.0,
    },
  })
  complianceMetrics: {
    documentCompliance: number;
    trainingCompliance: number;
    certificationStatus: number;
  };
}

export class GuardDeploymentAnalyticsDto {
  @ApiProperty({
    description: 'Deployment efficiency metrics',
    example: {
      averageDeploymentTime: 1.2,
      fillRate: 96.5,
      retentionRate: 87.3,
      replacementFrequency: 2.1,
    },
  })
  deploymentEfficiency: {
    averageDeploymentTime: number;
    fillRate: number;
    retentionRate: number;
    replacementFrequency: number;
  };

  @ApiProperty({
    description: 'Guard utilization patterns',
    example: [
      {
        guardId: 'emp-1',
        guardName: 'John Doe',
        totalHours: 160,
        utilizationRate: 85.0,
        sitesAssigned: 2,
      },
    ],
  })
  guardUtilization: Array<{
    guardId: string;
    guardName: string;
    totalHours: number;
    utilizationRate: number;
    sitesAssigned: number;
  }>;

  @ApiProperty({
    description: 'Site staffing trends',
    example: [
      {
        date: '2024-01-15',
        requiredGuards: 50,
        deployedGuards: 48,
        fillRate: 96.0,
      },
    ],
  })
  staffingTrends: Array<{
    date: string;
    requiredGuards: number;
    deployedGuards: number;
    fillRate: number;
  }>;
}

export class AttendanceTrendsAnalyticsDto {
  @ApiProperty({
    description: 'Overall attendance trends',
    example: {
      averageAttendanceRate: 95.8,
      trendDirection: 'IMPROVING',
      bestMonth: 'January',
      worstMonth: 'March',
    },
  })
  overallTrends: {
    averageAttendanceRate: number;
    trendDirection: 'IMPROVING' | 'DECLINING' | 'STABLE';
    bestMonth: string;
    worstMonth: string;
  };

  @ApiProperty({
    description: 'Daily attendance patterns',
    example: [
      {
        dayOfWeek: 'Monday',
        averageAttendance: 97.2,
        lateArrivals: 2.1,
        earlyDepartures: 1.5,
      },
    ],
  })
  dailyPatterns: Array<{
    dayOfWeek: string;
    averageAttendance: number;
    lateArrivals: number;
    earlyDepartures: number;
  }>;

  @ApiProperty({
    description: 'Site-wise attendance comparison',
    example: [
      {
        siteId: 'site-789',
        siteName: 'Main Office',
        attendanceRate: 96.5,
        improvement: 2.3,
      },
    ],
  })
  siteComparison: Array<{
    siteId: string;
    siteName: string;
    attendanceRate: number;
    improvement: number;
  }>;
}

export class ClientReportsResponseDto {
  @ApiProperty({
    description: 'Site performance reports',
    type: [SitePerformanceMetricsDto],
  })
  sitePerformance: SitePerformanceMetricsDto[];

  @ApiProperty({
    description: 'Guard deployment analytics',
    type: GuardDeploymentAnalyticsDto,
  })
  deploymentAnalytics: GuardDeploymentAnalyticsDto;

  @ApiProperty({
    description: 'Attendance trends analysis',
    type: AttendanceTrendsAnalyticsDto,
  })
  attendanceTrends: AttendanceTrendsAnalyticsDto;

  @ApiProperty({
    description: 'Service level compliance reports',
    example: {
      overallCompliance: 97.5,
      slaMetrics: [
        {
          metric: 'Response Time',
          target: 5,
          actual: 3.2,
          compliance: 100.0,
        },
      ],
    },
  })
  serviceCompliance: {
    overallCompliance: number;
    slaMetrics: Array<{
      metric: string;
      target: number;
      actual: number;
      compliance: number;
    }>;
  };

  @ApiProperty({
    description: 'Custom date range filtering applied',
    example: {
      startDate: '2024-01-01',
      endDate: '2024-01-31',
      totalDays: 31,
    },
  })
  reportPeriod: {
    startDate: string;
    endDate: string;
    totalDays: number;
  };

  @ApiProperty({
    description: 'Report generation metadata',
    example: {
      generatedAt: '2024-01-15T10:30:00Z',
      generatedBy: 'system',
      reportId: 'rpt-456',
    },
  })
  metadata: {
    generatedAt: string;
    generatedBy: string;
    reportId: string;
  };
}

export class ReportDownloadResponseDto {
  @ApiProperty({
    description: 'Report download URL',
    example: 'https://example.com/reports/rpt-456.pdf',
  })
  downloadUrl: string;

  @ApiProperty({
    description: 'File name for download',
    example: 'Site_Performance_Report_2024-01.pdf',
  })
  fileName: string;

  @ApiProperty({
    description: 'File size in bytes',
    example: 1048576,
  })
  fileSize: number;

  @ApiProperty({
    description: 'Report format',
    enum: ReportFormat,
  })
  format: ReportFormat;

  @ApiProperty({
    description: 'Generated timestamp',
    example: '2024-01-15T10:30:00Z',
  })
  generatedAt: string;

  @ApiProperty({
    description: 'Report expiration date',
    example: '2024-01-22T10:30:00Z',
  })
  expiresAt: string;
}