import { Injectable } from '@nestjs/common';
import { MetricsMiddleware } from '../common/middleware/metrics.middleware';

@Injectable()
export class MonitoringService {
  
  getUsageStatistics(period: string = '24h') {
    const metrics = MetricsMiddleware.getMetrics();
    
    // Calculate period-specific stats (simplified for now)
    const periodMultiplier = this.getPeriodMultiplier(period);
    
    return {
      period,
      totalRequests: metrics.totalRequests,
      requestsPerHour: Math.round(metrics.totalRequests / (metrics.uptime / (1000 * 60 * 60)) || 0),
      requestsPerMinute: Math.round(metrics.totalRequests / (metrics.uptime / (1000 * 60)) || 0),
      successRate: metrics.totalRequests > 0 ? 
        Math.round((metrics.successfulRequests / metrics.totalRequests) * 10000) / 100 : 0,
      errorRate: metrics.totalRequests > 0 ? 
        Math.round((metrics.errorRequests / metrics.totalRequests) * 10000) / 100 : 0,
      topEndpoints: this.getTopEndpoints(metrics.requestsByEndpoint, 10),
      topMethods: metrics.requestsByMethod,
      peakHours: this.calculatePeakHours(metrics.recentRequests),
      uptimeHours: Math.round(metrics.uptime / (1000 * 60 * 60) * 100) / 100,
    };
  }

  getPerformanceMetrics() {
    const metrics = MetricsMiddleware.getMetrics();
    const recentRequests = metrics.recentRequests;
    
    // Calculate performance statistics
    const responseTimes = recentRequests.map(req => req.responseTime);
    const sortedTimes = responseTimes.sort((a, b) => a - b);
    
    return {
      averageResponseTime: Math.round(metrics.averageResponseTime * 100) / 100,
      medianResponseTime: sortedTimes.length > 0 ? 
        Math.round(sortedTimes[Math.floor(sortedTimes.length / 2)] * 100) / 100 : 0,
      p95ResponseTime: sortedTimes.length > 0 ? 
        Math.round(sortedTimes[Math.floor(sortedTimes.length * 0.95)] * 100) / 100 : 0,
      p99ResponseTime: sortedTimes.length > 0 ? 
        Math.round(sortedTimes[Math.floor(sortedTimes.length * 0.99)] * 100) / 100 : 0,
      slowRequestCount: metrics.slowRequests,
      slowRequestPercentage: metrics.totalRequests > 0 ? 
        Math.round((metrics.slowRequests / metrics.totalRequests) * 10000) / 100 : 0,
      fastestRequest: sortedTimes.length > 0 ? Math.round(sortedTimes[0] * 100) / 100 : 0,
      slowestRequest: sortedTimes.length > 0 ? 
        Math.round(sortedTimes[sortedTimes.length - 1] * 100) / 100 : 0,
      recentPerformanceTrend: this.calculatePerformanceTrend(recentRequests),
    };
  }

  getErrorMetrics() {
    const metrics = MetricsMiddleware.getMetrics();
    
    return {
      totalErrors: metrics.errorRequests,
      errorRate: metrics.totalRequests > 0 ? 
        Math.round((metrics.errorRequests / metrics.totalRequests) * 10000) / 100 : 0,
      errorsByStatusCode: metrics.errorsByStatusCode,
      recentErrors: metrics.recentRequests
        .filter(req => req.statusCode >= 400)
        .slice(0, 20)
        .map(req => ({
          timestamp: req.timestamp,
          method: req.method,
          path: req.path,
          statusCode: req.statusCode,
          responseTime: req.responseTime,
          correlationId: req.correlationId,
        })),
      errorTrends: this.calculateErrorTrends(metrics.recentRequests),
      mostCommonErrors: this.getMostCommonErrors(metrics.errorsByStatusCode),
    };
  }

  private getPeriodMultiplier(period: string): number {
    switch (period) {
      case '1h': return 1;
      case '24h': return 24;
      case '7d': return 168;
      default: return 24;
    }
  }

  private getTopEndpoints(endpointMap: any, limit: number = 10) {
    return Object.entries(endpointMap)
      .sort(([,a], [,b]) => (b as number) - (a as number))
      .slice(0, limit)
      .map(([endpoint, count]) => ({ endpoint, count }));
  }

  private calculatePeakHours(recentRequests: any[]) {
    const hourCounts = new Map<number, number>();
    
    recentRequests.forEach(req => {
      const hour = new Date(req.timestamp).getHours();
      hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
    });

    return Object.fromEntries(hourCounts);
  }

  private calculatePerformanceTrend(recentRequests: any[]) {
    // Simple trend calculation based on recent requests
    if (recentRequests.length < 2) return 'stable';
    
    const recentAvg = recentRequests.slice(0, 10)
      .reduce((sum, req) => sum + req.responseTime, 0) / Math.min(10, recentRequests.length);
    
    const olderAvg = recentRequests.slice(-10)
      .reduce((sum, req) => sum + req.responseTime, 0) / Math.min(10, recentRequests.length);
    
    const change = ((recentAvg - olderAvg) / olderAvg) * 100;
    
    if (change > 10) return 'degrading';
    if (change < -10) return 'improving';
    return 'stable';
  }

  private calculateErrorTrends(recentRequests: any[]) {
    const now = new Date().getTime();
    const oneHourAgo = now - (60 * 60 * 1000);
    
    const recentErrors = recentRequests.filter(req => 
      req.statusCode >= 400 && new Date(req.timestamp).getTime() > oneHourAgo
    );
    
    return {
      lastHourErrors: recentErrors.length,
      trend: recentErrors.length > 5 ? 'increasing' : recentErrors.length > 0 ? 'stable' : 'decreasing'
    };
  }

  private getMostCommonErrors(errorsByStatusCode: any) {
    return Object.entries(errorsByStatusCode)
      .sort(([,a], [,b]) => (b as number) - (a as number))
      .slice(0, 5)
      .map(([statusCode, count]) => ({ statusCode: Number(statusCode), count }));
  }
}