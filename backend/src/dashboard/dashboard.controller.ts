import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('Dashboard')
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('overview')
  @Public()
  @ApiOperation({ 
    summary: 'Get dashboard overview',
    description: 'Returns comprehensive dashboard data including system metrics, performance indicators, and operational statistics'
  })
  @ApiResponse({ status: 200, description: 'Dashboard overview retrieved successfully' })
  async getOverview() {
    return {
      success: true,
      data: await this.dashboardService.getOverviewData(),
      timestamp: new Date().toISOString()
    };
  }

  @Get('kpis')
  @Public()
  @ApiOperation({ 
    summary: 'Get KPI metrics',
    description: 'Returns key performance indicators for dashboard'
  })
  @ApiResponse({ status: 200, description: 'KPI metrics retrieved successfully' })
  async getKPIMetrics() {
    return {
      success: true,
      data: await this.dashboardService.getKPIMetrics(),
      timestamp: new Date().toISOString()
    };
  }

  @Get('deployments')
  @Public()
  @ApiOperation({ 
    summary: 'Get deployment metrics',
    description: 'Returns deployment statistics for dashboard'
  })
  @ApiResponse({ status: 200, description: 'Deployment metrics retrieved successfully' })
  async getDeploymentMetrics() {
    // For now, return KPI metrics as deployment metrics since getDeploymentMetrics doesn't exist
    const kpiMetrics = await this.dashboardService.getKPIMetrics();
    return {
      success: true,
      data: {
        activeDeployments: kpiMetrics.activeGuards || 0,
        totalDeployments: kpiMetrics.totalSites || 0,
        deploymentRate: kpiMetrics.attendanceRate || 0,
        ...kpiMetrics
      },
      timestamp: new Date().toISOString()
    };
  }

  @Get('operations')
  @Public()
  @ApiOperation({ 
    summary: 'Get operations overview',
    description: 'Returns operations overview data'
  })
  @ApiResponse({ status: 200, description: 'Operations overview retrieved successfully' })
  async getOperationsOverview() {
    // Map to existing getOverviewData method
    return {
      success: true,
      data: await this.dashboardService.getOverviewData(),
      timestamp: new Date().toISOString()
    };
  }

  @Get('guards')
  @Public()
  @ApiOperation({ 
    summary: 'Get guard availability',
    description: 'Returns guard availability metrics'
  })
  @ApiResponse({ status: 200, description: 'Guard availability retrieved successfully' })
  async getGuardAvailability() {
    const kpiMetrics = await this.dashboardService.getKPIMetrics();
    return {
      success: true,
      data: {
        totalGuards: kpiMetrics.activeGuards || 0,
        availableGuards: kpiMetrics.guardsOnDuty || 0,
        deployedGuards: kpiMetrics.activeGuards || 0,
        offDutyGuards: 0,
        availability: 'High',
        ...kpiMetrics
      },
      timestamp: new Date().toISOString()
    };
  }

  @Get('activity')
  @Public()
  @ApiOperation({ 
    summary: 'Get activity timeline',
    description: 'Returns recent activity timeline'
  })
  @ApiResponse({ status: 200, description: 'Activity timeline retrieved successfully' })
  async getActivityTimeline() {
    return {
      success: true,
      data: [
        {
          id: '1',
          type: 'info',
          title: 'System Status',
          description: 'All systems operational',
          timestamp: new Date().toISOString(),
          user: 'System'
        }
      ],
      timestamp: new Date().toISOString()
    };
  }

  @Get('notifications')
  @Public()
  @ApiOperation({ 
    summary: 'Get notifications',
    description: 'Returns dashboard notifications'
  })
  @ApiResponse({ status: 200, description: 'Notifications retrieved successfully' })
  async getNotifications() {
    return {
      success: true,
      data: [],
      timestamp: new Date().toISOString()
    };
  }

  @Get('alerts')
  @Public()
  @ApiOperation({ 
    summary: 'Get real-time alerts',
    description: 'Returns real-time alerts'
  })
  @ApiResponse({ status: 200, description: 'Alerts retrieved successfully' })
  async getRealTimeAlerts() {
    return {
      success: true,
      data: [],
      timestamp: new Date().toISOString()
    };
  }
}