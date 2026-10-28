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
      // Handle both Express and Fastify request objects
      const requestPath = req.path || req.url || '';
      if (this.isPublicEndpoint(requestPath)) {
        return next();
      }

      // Attach tenant context service to request for use in decorators
      req.tenantContext = this.tenantContextService;

      // Extract tenant information from authenticated user
      const user = req.user;

      if (user && (user.tenantId || user.companyId)) {
        // Use companyId as tenantId if tenantId is not present (for compatibility)
        const tenantId = user.tenantId || user.companyId;

        // Set application-level tenant context
        this.tenantContextService.setContext(tenantId, user.id, user.role);

        // Set database-level tenant context for RLS
        await this.prismaService.setTenantContext(tenantId, user.role);

        this.logger.debug(
          `Tenant context established: ${this.tenantContextService.getContextSnapshot()}`,
        );
      } else {
        // For requests without authentication, clear any existing context
        this.tenantContextService.clearContext();
        await this.prismaService.clearTenantContext();

        this.logger.debug('No tenant context - public or unauthenticated request');
      }

      next();
    } catch (error) {
      this.logger.error(`Failed to set tenant context: ${getErrorMessage(error)}`, getErrorStack(error));

      // Clear context on error to prevent potential security issues
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
      '/api/auth/login',
      '/api/auth/register',
      '/api/public',
      '/metrics',
      '/favicon.ico',
      '/.well-known',
    ];

    return publicPaths.some((publicPath) => path.startsWith(publicPath));
  }
}
