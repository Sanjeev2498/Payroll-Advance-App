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
}