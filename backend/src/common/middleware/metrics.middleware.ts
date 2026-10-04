import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

interface RequestMetric {
  method: string;
  path: string;
  statusCode: number;
  responseTime: number;
  timestamp: Date;
  userAgent?: string;
  ip?: string;
  correlationId?: string;
}

export interface ApiMetrics {
  totalRequests: number;
  successfulRequests: number;
  errorRequests: number;
  averageResponseTime: number;
  slowRequests: number;
  requestsByEndpoint: { [key: string]: number };
  requestsByMethod: { [key: string]: number };
  errorsByStatusCode: { [key: number]: number };
  recentRequests: RequestMetric[];
  uptime: number;
  startTime: Date;
}

interface InternalApiMetrics {
  totalRequests: number;
  successfulRequests: number;
  errorRequests: number;
  averageResponseTime: number;
  slowRequests: number;
  requestsByEndpoint: Map<string, number>;
  requestsByMethod: Map<string, number>;
  errorsByStatusCode: Map<number, number>;
  recentRequests: RequestMetric[];
  uptime: number;
  startTime: Date;
}

@Injectable()
export class MetricsMiddleware implements NestMiddleware {
  private static metrics: InternalApiMetrics = {
    totalRequests: 0,
    successfulRequests: 0,
    errorRequests: 0,
    averageResponseTime: 0,
    slowRequests: 0,
    requestsByEndpoint: new Map(),
    requestsByMethod: new Map(),
    errorsByStatusCode: new Map(),
    recentRequests: [],
    uptime: 0,
    startTime: new Date(),
  };

  private static responseTimesSum = 0;
  private static readonly SLOW_REQUEST_THRESHOLD = 1000; // 1 second
  private static readonly MAX_RECENT_REQUESTS = 100;

  use(req: Request, res: Response, next: NextFunction) {
    const startTime = Date.now();

    // Override the end method to capture response metrics
    const originalEnd = res.end.bind(res);
    
    res.end = function (chunk?: any, encoding?: any, callback?: () => void): Response {
      const endTime = Date.now();
      const responseTime = endTime - startTime;

      // Record metrics
      MetricsMiddleware.recordMetric({
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        responseTime,
        timestamp: new Date(),
        userAgent: req.get('User-Agent'),
        ip: req.ip,
        correlationId: req.get('X-Correlation-ID') || req.get('x-correlation-id'),
      });

      // Call the original end method
      return originalEnd(chunk, encoding, callback);
    } as any;

    next();
  }

  private static recordMetric(metric: RequestMetric) {
    // Update basic counters
    this.metrics.totalRequests++;
    this.responseTimesSum += metric.responseTime;
    this.metrics.averageResponseTime = this.responseTimesSum / this.metrics.totalRequests;

    // Track success/error counts
    if (metric.statusCode >= 200 && metric.statusCode < 400) {
      this.metrics.successfulRequests++;
    } else {
      this.metrics.errorRequests++;
      
      // Track errors by status code
      const currentCount = this.metrics.errorsByStatusCode.get(metric.statusCode) || 0;
      this.metrics.errorsByStatusCode.set(metric.statusCode, currentCount + 1);
    }

    // Track slow requests
    if (metric.responseTime > this.SLOW_REQUEST_THRESHOLD) {
      this.metrics.slowRequests++;
    }

    // Track requests by endpoint
    const endpointKey = `${metric.method} ${metric.path}`;
    const endpointCount = this.metrics.requestsByEndpoint.get(endpointKey) || 0;
    this.metrics.requestsByEndpoint.set(endpointKey, endpointCount + 1);

    // Track requests by method
    const methodCount = this.metrics.requestsByMethod.get(metric.method) || 0;
    this.metrics.requestsByMethod.set(metric.method, methodCount + 1);

    // Store recent requests (limited)
    this.metrics.recentRequests.unshift(metric);
    if (this.metrics.recentRequests.length > this.MAX_RECENT_REQUESTS) {
      this.metrics.recentRequests = this.metrics.recentRequests.slice(0, this.MAX_RECENT_REQUESTS);
    }

    // Update uptime
    this.metrics.uptime = Date.now() - this.metrics.startTime.getTime();
  }

  static getMetrics(): ApiMetrics {
    // Convert Maps to objects for JSON serialization
    return {
      ...this.metrics,
      requestsByEndpoint: Object.fromEntries(this.metrics.requestsByEndpoint),
      requestsByMethod: Object.fromEntries(this.metrics.requestsByMethod),
      errorsByStatusCode: Object.fromEntries(this.metrics.errorsByStatusCode),
    };
  }

  static resetMetrics() {
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      errorRequests: 0,
      averageResponseTime: 0,
      slowRequests: 0,
      requestsByEndpoint: new Map(),
      requestsByMethod: new Map(),
      errorsByStatusCode: new Map(),
      recentRequests: [],
      uptime: 0,
      startTime: new Date(),
    };
    this.responseTimesSum = 0;
  }

  static getHealthStatus() {
    const now = Date.now();
    const uptime = now - this.metrics.startTime.getTime();
    const errorRate = this.metrics.totalRequests > 0 ? 
      (this.metrics.errorRequests / this.metrics.totalRequests) * 100 : 0;
    
    return {
      status: errorRate < 10 ? 'healthy' : errorRate < 25 ? 'degraded' : 'unhealthy',
      uptime: uptime,
      totalRequests: this.metrics.totalRequests,
      errorRate: Math.round(errorRate * 100) / 100,
      averageResponseTime: Math.round(this.metrics.averageResponseTime * 100) / 100,
      slowRequestCount: this.metrics.slowRequests,
      timestamp: new Date().toISOString(),
    };
  }
}