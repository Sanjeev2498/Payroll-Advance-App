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
      if (this.isPublicEndpoint(requestPath)) {
        return next();
      }

      // Attach tenant context service to request for use in decorators
      req.tenantContext = this.tenantContextService;

      // Extract tenant information from authenticated user
      const user = req.user;

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
      '/health',
      '/api/health',
      '/api/v1/health',
      '/api/v1/monitoring/health',
      '/api/v1/monitoring/metrics',
      '/api/v1/monitoring/stats',
      '/api/v1/monitoring/performance',
      '/api/v1/monitoring/errors',
      '/api/auth/login',
      '/api/auth/register',
      '/api/v1/auth/login',
      '/api/v1/auth/register',
      '/api/v1/auth/health',
      '/api/public',
      '/api/v1/public',
      '/api/v1/supervisor-portal/dashboard',
      '/api/v1/supervisor-portal/muster-roll',
      '/api/v1/supervisor-portal/sites/health',
      '/api/v1/supervisor-portal/attendance/update',
      '/api/v1/supervisor-portal/attendance/audit-trail',
      '/api/v1/client-portal/communication/incidents',
      '/api/v1/client-portal/communication/complaints',
      '/api/v1/client-portal/communication/requests',
      '/api/v1/client-portal/guards',
      '/api/v1/employees/stats',
      '/api/v1/attendance/real-time-events',
      '/api/v1/clients',
      '/api/v1/sites',
      '/api/v1/dashboard/overview',
      '/metrics',
      '/favicon.ico',
      '/.well-known',
    ];

    return publicPaths.some((publicPath) => path.startsWith(publicPath));
  }
}
