import { ApiProperty } from '@nestjs/swagger';
import { KPIMetricsDto } from './kpi-metrics.dto';
import { DeploymentMetricsDto } from './deployment-metrics.dto';
import { GuardAvailabilityDto } from './guard-availability.dto';
import { ActivityTimelineItemDto } from './activity-timeline.dto';
import { NotificationItemDto } from './notification.dto';
import { RealTimeAlertDto } from './real-time-alert.dto';

export class OperationsOverviewDto {
  @ApiProperty({ description: 'KPI metrics summary', type: KPIMetricsDto })
  kpis: KPIMetricsDto;

  @ApiProperty({ description: 'Deployment metrics overview', type: DeploymentMetricsDto })
  deploymentMetrics: DeploymentMetricsDto;

  @ApiProperty({ description: 'Guard availability metrics', type: GuardAvailabilityDto })
  guardAvailability: GuardAvailabilityDto;

  @ApiProperty({ description: 'Recent activity timeline', type: [ActivityTimelineItemDto] })
  recentActivity: ActivityTimelineItemDto[];

  @ApiProperty({ description: 'System notifications', type: [NotificationItemDto] })
  notifications: NotificationItemDto[];

  @ApiProperty({ description: 'Real-time alerts', type: [RealTimeAlertDto] })
  realTimeAlerts: RealTimeAlertDto[];
}