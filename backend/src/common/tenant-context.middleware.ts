import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from './tenant-context.service';
import { getErrorMessage, getErrorStack, formatError } from './utils/error.util';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    tenantId: string;
    companyId: string;
    role: string;
    email: string;
  };
  tenantContext?: TenantContextService;
}

@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  private readonly logger = new Logger(TenantContextMiddleware.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly tenantContextService: TenantContextService,
  ) {}

  async use(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      // Skip tenant context for health checks and public endpoints
      const requestPath = req.path || req.url || '';
      const originalUrl = req.originalUrl || requestPath;
      // Check original URL first (contains full path), then processed path
      const isPublic = this.isPublicEndpoint(originalUrl) || this.isPublicEndpoint(requestPath);
      
      // DEBUG: Log all requests to understand routing
      console.log(`[TenantMiddleware] path="${requestPath}" originalUrl="${originalUrl}" isPublic=${isPublic}`);
      
      if (isPublic) {
        // Clear any tenant context for public endpoints
        this.tenantContextService.clearContext();
        await this.prismaService.clearTenantContext();
        console.log(`[TenantMiddleware] Bypassing authentication for public endpoint`);
        return next();
      }

      // For protected endpoints, check for authentication token
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        // Missing or invalid authorization header format
        return res.status(401)
          .header('WWW-Authenticate', 'Bearer realm="API"')
          .json({
            statusCode: 401,
            message: 'Missing or invalid authentication token',
            error: 'Unauthorized'
          });
      }

      // Attach tenant context service to request for use in decorators
      req.tenantContext = this.tenantContextService;

      // Extract tenant information from authenticated user
      const user = req.user;

      // If no authenticated user for protected endpoint, return 401
      if (!user) {
        return res.status(401)
          .header('WWW-Authenticate', 'Bearer realm="API"')
          .json({
            statusCode: 401,
            message: 'Invalid or expired authentication token',
            error: 'Unauthorized'
          });
      }

      if (user && (user.tenantId || user.companyId)) {
        const tenantId = user.tenantId || user.companyId;
        this.tenantContextService.setContext(tenantId, user.id, user.role);
        await this.prismaService.setTenantContext(tenantId, user.role);
        this.logger.debug(`Tenant context established: ${this.tenantContextService.getContextSnapshot()}`);
      } else {
        this.tenantContextService.clearContext();
        await this.prismaService.clearTenantContext();
        this.logger.debug('No tenant context - public or unauthenticated request');
      }

      next();
    } catch (error) {
      this.logger.error(`Failed to set tenant context: ${getErrorMessage(error)}`, getErrorStack(error));
      this.tenantContextService.clearContext();
      await this.prismaService.clearTenantContext();
      next(error);
    }
  }

  private isPublicEndpoint(path: string): boolean {
    if (!path) return false;

    const publicPaths = [
      // Health endpoints - both with and without /api prefix
      '/health', // Root health endpoint (no prefix)
      '/api/health', // API health endpoint
      '/api/v1/health', // Versioned health endpoint
      '/v1/health', // After /api prefix stripped, versioned
      'health', // Sometimes path doesn't have leading slash
      '/api/health', // API health with prefix
      '/api/v1/health', // Versioned API health
      // Auth endpoints
      '/auth/login',
      '/auth/register',
      '/v1/auth/login',
      '/v1/auth/register',
      '/v1/auth/refresh',
      '/v1/auth/verify-email',
      '/v1/auth/forgot-password',
      '/v1/auth/reset-password',
      '/v1/auth/health',
      // Monitoring endpoints
      '/v1/monitoring/health',
      '/v1/monitoring/metrics',
      '/v1/monitoring/stats',
      '/v1/monitoring/performance',
      '/v1/monitoring/errors',
      // Public endpoints
      '/public',
      '/v1/public',
      '/v1/supervisor-portal/dashboard',
      '/v1/supervisor-portal/muster-roll',
      '/v1/supervisor-portal/sites/health',
      '/v1/supervisor-portal/attendance/update',
      '/v1/supervisor-portal/attendance/audit-trail',
      '/v1/client-portal/communication/incidents',
      '/v1/client-portal/communication/complaints',
      '/v1/client-portal/communication/requests',
      '/v1/client-portal/guards',
      '/v1/employees/stats',
      '/v1/attendance/real-time-events',
      '/v1/clients',
      '/v1/sites',
      '/v1/dashboard/overview',
      '/metrics',
      '/favicon.ico',
      '/.well-known',
    ];

    // Check if path matches or starts with any public path
    return publicPaths.some((publicPath) => {
      return path === publicPath || path.startsWith(publicPath + '/') || path.startsWith(publicPath + '?');
    });
  }
}
