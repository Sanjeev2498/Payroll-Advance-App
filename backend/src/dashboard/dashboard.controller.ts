import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  Body,
  HttpStatus,
  Logger,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { OperationsOverviewDto } from './dto/operations-overview.dto';
import { KPIMetricsDto } from './dto/kpi-metrics.dto';
import { DeploymentMetricsDto } from './dto/deployment-metrics.dto';
import { GuardAvailabilityDto } from './dto/guard-availability.dto';
import { ActivityTimelineItemDto } from './dto/activity-timeline.dto';
import { NotificationItemDto } from './dto/notification.dto';
import { RealTimeAlertDto } from './dto/real-time-alert.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { ReportingPermissions } from '../auth/enums/permissions.enum';

@ApiTags('Dashboard')
@ApiBearerAuth()
@Controller('dashboard')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class DashboardController {
  private readonly logger = new Logger(DashboardController.name);

  constructor(private readonly dashboardService: DashboardService) {}

  @Get('operations')
  @RequirePermissions([ReportingPermissions.VIEW_OPERATIONAL_REPORTS])
  @ApiOperation({
    summary: 'Get complete operations overview',
    description: 'Retrieve comprehensive dashboard data including KPIs, metrics, and real-time information',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Operations overview retrieved successfully',
    type: OperationsOverviewDto,
  })
  async getOperationsOverview(): Promise<OperationsOverviewDto> {
    this.logger.log('GET /dashboard/operations - Fetching operations overview');
    return await this.dashboardService.getOperationsOverview();
  }

  @Get('kpis')
  @RequirePermissions([ReportingPermissions.VIEW_OPERATIONAL_REPORTS])
  @ApiOperation({
    summary: 'Get KPI metrics',
    description: 'Retrieve key performance indicators including guards, sites, attendance, payroll, and billing metrics',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'KPI metrics retrieved successfully',
    type: KPIMetricsDto,
  })
  async getKPIMetrics(): Promise<KPIMetricsDto> {
    this.logger.log('GET /dashboard/kpis - Fetching KPI metrics');
    return await this.dashboardService.getKPIMetrics();
  }

  @Get('deployments')
  @RequirePermissions([ReportingPermissions.VIEW_OPERATIONAL_REPORTS])
  @ApiOperation({
    summary: 'Get deployment metrics',
    description: 'Retrieve site deployment status, staffing levels, and operational metrics',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Deployment metrics retrieved successfully',
    type: DeploymentMetricsDto,
  })
  async getDeploymentMetrics(): Promise<DeploymentMetricsDto> {
    this.logger.log('GET /dashboard/deployments - Fetching deployment metrics');
    return await this.dashboardService.getDeploymentMetrics();
  }

  @Get('guards')
  @RequirePermissions([ReportingPermissions.VIEW_OPERATIONAL_REPORTS])
  @ApiOperation({
    summary: 'Get guard availability',
    description: 'Retrieve guard availability, assignments, and skill breakdown information',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Guard availability retrieved successfully',
    type: GuardAvailabilityDto,
  })
  async getGuardAvailability(): Promise<GuardAvailabilityDto> {
    this.logger.log('GET /dashboard/guards - Fetching guard availability');
    return await this.dashboardService.getGuardAvailability();
  }

  @Get('activity')
  @RequirePermissions([ReportingPermissions.VIEW_OPERATIONAL_REPORTS])
  @ApiOperation({
    summary: 'Get activity timeline',
    description: 'Retrieve recent system activities including attendance, assignments, and payroll events',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Maximum number of activity items to return (default: 20)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Activity timeline retrieved successfully',
    type: [ActivityTimelineItemDto],
  })
  async getActivityTimeline(
    @Query('limit') limit?: string,
  ): Promise<ActivityTimelineItemDto[]> {
    const limitNumber = limit ? parseInt(limit, 10) : 20;
    this.logger.log(`GET /dashboard/activity - Fetching activity timeline (limit: ${limitNumber})`);
    return await this.dashboardService.getActivityTimeline(limitNumber);
  }

  @Get('notifications')
  @RequirePermissions([ReportingPermissions.VIEW_OPERATIONAL_REPORTS])
  @ApiOperation({
    summary: 'Get notifications',
    description: 'Retrieve system notifications with optional filtering for unread notifications only',
  })
  @ApiQuery({
    name: 'unreadOnly',
    required: false,
    type: Boolean,
    description: 'Return only unread notifications (default: false)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Notifications retrieved successfully',
    type: [NotificationItemDto],
  })
  async getNotifications(
    @Query('unreadOnly') unreadOnly?: string,
  ): Promise<NotificationItemDto[]> {
    const unreadOnlyBool = unreadOnly === 'true';
    this.logger.log(`GET /dashboard/notifications - Fetching notifications (unread only: ${unreadOnlyBool})`);
    return await this.dashboardService.getNotifications(unreadOnlyBool);
  }

  @Get('alerts')
  @RequirePermissions([ReportingPermissions.VIEW_OPERATIONAL_REPORTS])
  @ApiOperation({
    summary: 'Get real-time alerts',
    description: 'Retrieve active real-time alerts for attendance, security, system, and staffing issues',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Real-time alerts retrieved successfully',
    type: [RealTimeAlertDto],
  })
  async getRealTimeAlerts(): Promise<RealTimeAlertDto[]> {
    this.logger.log('GET /dashboard/alerts - Fetching real-time alerts');
    return await this.dashboardService.getRealTimeAlerts();
  }

  @Patch('notifications/:id/read')
  @RequirePermissions([ReportingPermissions.MANAGE_DASHBOARDS])
  @ApiOperation({
    summary: 'Mark notification as read',
    description: 'Mark a specific notification as read',
  })
  @ApiParam({
    name: 'id',
    description: 'Notification ID',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Notification marked as read successfully',
  })
  async markNotificationRead(@Param('id') notificationId: string): Promise<void> {
    this.logger.log(`PATCH /dashboard/notifications/${notificationId}/read - Marking notification as read`);
    await this.dashboardService.markNotificationRead(notificationId);
  }

  @Patch('notifications/mark-all-read')
  @RequirePermissions([ReportingPermissions.MANAGE_DASHBOARDS])
  @ApiOperation({
    summary: 'Mark all notifications as read',
    description: 'Mark all notifications for the current user as read',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'All notifications marked as read successfully',
  })
  async markAllNotificationsRead(): Promise<void> {
    this.logger.log('PATCH /dashboard/notifications/mark-all-read - Marking all notifications as read');
    await this.dashboardService.markAllNotificationsRead();
  }

  @Patch('alerts/:id/acknowledge')
  @RequirePermissions([ReportingPermissions.MANAGE_DASHBOARDS])
  @ApiOperation({
    summary: 'Acknowledge alert',
    description: 'Acknowledge a real-time alert to indicate it has been seen',
  })
  @ApiParam({
    name: 'id',
    description: 'Alert ID',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Alert acknowledged successfully',
  })
  async acknowledgeAlert(@Param('id') alertId: string): Promise<void> {
    this.logger.log(`PATCH /dashboard/alerts/${alertId}/acknowledge - Acknowledging alert`);
    await this.dashboardService.acknowledgeAlert(alertId);
  }

  @Patch('alerts/:id/resolve')
  @RequirePermissions([ReportingPermissions.MANAGE_DASHBOARDS])
  @ApiOperation({
    summary: 'Resolve alert',
    description: 'Resolve a real-time alert with optional resolution notes',
  })
  @ApiParam({
    name: 'id',
    description: 'Alert ID',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Alert resolved successfully',
  })
  async resolveAlert(
    @Param('id') alertId: string,
    @Body() body: { resolution?: string },
  ): Promise<void> {
    this.logger.log(`PATCH /dashboard/alerts/${alertId}/resolve - Resolving alert`);
    await this.dashboardService.resolveAlert(alertId, body.resolution);
  }
}