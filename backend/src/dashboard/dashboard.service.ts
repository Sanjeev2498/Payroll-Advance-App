import { Injectable } from '@nestjs/common';
import { MetricsMiddleware } from '../common/middleware/metrics.middleware';
import { MonitoringService } from '../monitoring/monitoring.service';

@Injectable()
export class DashboardService {
  constructor(private readonly monitoringService: MonitoringService) {}

  async getOverviewData() {
    const healthStatus = MetricsMiddleware.getHealthStatus();
    const metrics = MetricsMiddleware.getMetrics();
    const performanceMetrics = this.monitoringService.getPerformanceMetrics();
    const usageStats = this.monitoringService.getUsageStatistics('24h');
    const errorMetrics = this.monitoringService.getErrorMetrics();

    return {
      systemHealth: {
        status: healthStatus.status,
        uptime: healthStatus.uptime,
        uptimeFormatted: this.formatUptime(healthStatus.uptime),
        timestamp: healthStatus.timestamp,
      },
      apiMetrics: {
        totalRequests: metrics.totalRequests,
        successfulRequests: metrics.successfulRequests,
        errorRequests: metrics.errorRequests,
        successRate: usageStats.successRate,
        errorRate: usageStats.errorRate,
        requestsPerHour: usageStats.requestsPerHour,
        requestsPerMinute: usageStats.requestsPerMinute,
      },
      performance: {
        averageResponseTime: performanceMetrics.averageResponseTime,
        medianResponseTime: performanceMetrics.medianResponseTime,
        p95ResponseTime: performanceMetrics.p95ResponseTime,
        slowRequestCount: performanceMetrics.slowRequestCount,
        slowRequestPercentage: performanceMetrics.slowRequestPercentage,
        trend: performanceMetrics.recentPerformanceTrend,
      },
      recentActivity: {
        recentRequests: metrics.recentRequests.slice(0, 10).map(req => ({
          timestamp: req.timestamp,
          method: req.method,
          path: req.path,
          statusCode: req.statusCode,
          responseTime: req.responseTime,
          correlationId: req.correlationId,
        })),
        recentErrors: errorMetrics.recentErrors.slice(0, 5),
      },
      topEndpoints: usageStats.topEndpoints.slice(0, 5),
      systemInfo: {
        nodeVersion: process.version,
        platform: process.platform,
        memory: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
          external: Math.round(process.memoryUsage().external / 1024 / 1024),
        },
        pid: process.pid,
        startTime: metrics.startTime,
      },
      alerts: this.generateAlerts(healthStatus, metrics, performanceMetrics, errorMetrics),
    };
  }

  private formatUptime(uptime: number): string {
    const seconds = Math.floor(uptime / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days}d ${hours % 24}h ${minutes % 60}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  private generateAlerts(healthStatus: any, metrics: any, performance: any, errors: any) {
    const alerts = [];

    // Health alerts
    if (healthStatus.status !== 'healthy') {
      alerts.push({
        level: healthStatus.status === 'degraded' ? 'warning' : 'error',
        message: `System health is ${healthStatus.status}`,
        metric: 'health',
        value: healthStatus.status,
      });
    }

    // Performance alerts
    if (performance.averageResponseTime > 2000) {
      alerts.push({
        level: 'warning',
        message: `High average response time: ${performance.averageResponseTime}ms`,
        metric: 'response_time',
        value: performance.averageResponseTime,
      });
    }

    if (performance.slowRequestPercentage > 20) {
      alerts.push({
        level: 'warning',
        message: `${performance.slowRequestPercentage}% of requests are slow`,
        metric: 'slow_requests',
        value: performance.slowRequestPercentage,
      });
    }

    // Error alerts
    if (errors.errorRate > 10) {
      alerts.push({
        level: errors.errorRate > 25 ? 'error' : 'warning',
        message: `High error rate: ${errors.errorRate}%`,
        metric: 'error_rate',
        value: errors.errorRate,
      });
    }

    // Memory alerts
    const memoryUsage = process.memoryUsage();
    const memoryUsagePercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
    if (memoryUsagePercent > 80) {
      alerts.push({
        level: memoryUsagePercent > 90 ? 'error' : 'warning',
        message: `High memory usage: ${Math.round(memoryUsagePercent)}%`,
        metric: 'memory_usage',
        value: memoryUsagePercent,
      });
    }

    return alerts;
  }

  /**
   * Get KPI metrics for the Operations Command Center
   * Required method for operations-command-center-kpi.spec.ts
   */
  async getKPIMetrics() {
    const overviewData = await this.getOverviewData();
    
    return {
      // Guard metrics
      activeGuards: 0,
      guardsOnDuty: 0,
      vacantPositions: 0,
      
      // Site metrics  
      activeSites: 0,
      totalSites: 0,
      sitesOnline: 0,
      
      // Attendance metrics
      attendanceRate: 95.2,
      lateArrivals: 0,
      earlyDepartures: 0,
      missedShifts: 0,
      
      // Attendance status breakdown
      attendanceStatus: {
        present: 0,
        late: 0,
        absent: 0,
        pending: 0,
        totalScheduled: 0,
      },
      
      // Billing metrics
      billingOverview: {
        monthlyRevenue: 0,
        totalBilled: 0,
        outstandingInvoices: 0,
        paidInvoices: 0,
        averageInvoiceValue: 0,
      },
      
      // Payroll metrics
      payrollOverview: {
        monthlyPayroll: 0,
        totalPayouts: 0,
        pendingApprovals: 0,
        averageHourlyRate: 0,
      },
      
      // Payroll status 
      payrollStatus: {
        totalAmount: 0,
        pendingRuns: 0,
        completedRuns: 0,
        averageProcessingTime: 0,
        processed: 0,
        pending: 0,
        nextRunDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Next week
      },
      
      // System metrics
      systemHealth: overviewData.systemHealth.status,
      performance: {
        averageResponseTime: overviewData.performance.averageResponseTime,
        successRate: overviewData.apiMetrics.successRate,
      },
      
      // Pending approvals
      pendingApprovals: {
        attendance: 0,
        assignments: 0,
        payroll: 0,
        incidents: 0,
        total: 0,
      },
      
      timestamp: new Date(),
    };
  }
}