import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { MetricsMiddleware } from '../common/middleware/metrics.middleware';
import { MonitoringService } from './monitoring.service';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('Monitoring')
@Controller('monitoring')
export class MonitoringController {
  constructor(private readonly monitoringService: MonitoringService) {}

  @Get('health')
  @Public()
  @ApiOperation({ 
    summary: 'Get application health status',
    description: 'Returns the current health status of the application including uptime, error rates, and performance metrics'
  })
  @ApiResponse({ status: 200, description: 'Health status retrieved successfully' })
  getHealth() {
    return {
      success: true,
      data: MetricsMiddleware.getHealthStatus(),
      timestamp: new Date().toISOString()
    };
  }

  @Get('metrics')
  @Public()
  @ApiOperation({ 
    summary: 'Get comprehensive API metrics',
    description: 'Returns detailed metrics about API usage, performance, and error rates'
  })
  @ApiResponse({ status: 200, description: 'Metrics retrieved successfully' })
  getMetrics(): any {
    return {
      success: true,
      data: MetricsMiddleware.getMetrics(),
      timestamp: new Date().toISOString()
    };
  }

  @Get('stats')
  @Public()
  @ApiOperation({ 
    summary: 'Get API usage statistics',
    description: 'Returns statistical analysis of API usage patterns and trends'
  })
  @ApiQuery({ name: 'period', required: false, description: 'Time period for stats (1h, 24h, 7d)', enum: ['1h', '24h', '7d'] })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  getStats(@Query('period') period?: string) {
    return {
      success: true,
      data: this.monitoringService.getUsageStatistics(period || '24h'),
      timestamp: new Date().toISOString()
    };
  }

  @Get('performance')
  @Public()
  @ApiOperation({ 
    summary: 'Get performance monitoring data',
    description: 'Returns performance metrics including response times, slow requests, and performance trends'
  })
  @ApiResponse({ status: 200, description: 'Performance data retrieved successfully' })
  getPerformance() {
    return {
      success: true,
      data: this.monitoringService.getPerformanceMetrics(),
      timestamp: new Date().toISOString()
    };
  }

  @Get('errors')
  @Public()
  @ApiOperation({ 
    summary: 'Get error monitoring data',
    description: 'Returns error statistics and recent error patterns for debugging and monitoring'
  })
  @ApiResponse({ status: 200, description: 'Error data retrieved successfully' })
  getErrors() {
    return {
      success: true,
      data: this.monitoringService.getErrorMetrics(),
      timestamp: new Date().toISOString()
    };
  }
}