import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { TenantContextService } from '../../common/tenant-context.service';
import { RbacService } from './rbac.service';

/**
 * Enhanced Tenant Permission Middleware
 * Provides automatic tenant-aware permission context for all requests
 */
@Injectable()
export class TenantPermissionMiddleware implements NestMiddleware {
  private readonly logger = new Logger(TenantPermissionMiddleware.name);

  constructor(
    private readonly tenantContextService: TenantContextService,
    private readonly rbacService: RbacService,
  ) {}

  use(req: Request & { user?: any; permissionContext?: any }, res: Response, next: NextFunction) {
    try {
      // Skip if no user is authenticated
      if (!req.user) {
        return next();
      }

      // Ensure tenant context is properly set
      if (!this.tenantContextService.hasContext()) {
        const { id: userId, role, companyId: tenantId } = req.user;

        if (tenantId && userId && role) {
          this.tenantContextService.setContext(tenantId, userId, role);
          this.logger.debug(
            `Tenant permission context set for user ${userId} in tenant ${tenantId}`,
          );
        }
      }

      // Add permission context to request for easy access in controllers
      if (this.tenantContextService.hasContext()) {
        req.permissionContext = {
          userId: this.tenantContextService.getUserId(),
          userRole: this.tenantContextService.getUserRole(),
          tenantId: this.tenantContextService.getTenantId(),
          permissions: this.rbacService.getUserPermissions(),

          // Utility methods for controllers
          hasPermission: (permission: string) => this.rbacService.hasPermission(permission as any),
          canAccessTenant: (targetTenantId: string) =>
            this.rbacService.canAccessTenant(targetTenantId),
          canAccessResource: (
            resourceOwnerId?: string,
            resourceTenantId?: string,
            requiredPermission?: any,
          ) =>
            this.rbacService.canAccessResource(
              resourceOwnerId,
              resourceTenantId,
              requiredPermission,
            ),
        };
      }

      next();
    } catch (error) {
      this.logger.error('Error in tenant permission middleware:', error);
      next(error);
    }
  }
}

/**
 * Extended Request interface for TypeScript type safety
 */
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    companyId: string;
  };
  permissionContext?: {
    userId: string | null;
    userRole: string | null;
    tenantId: string | null;
    permissions: string[];
    hasPermission: (permission: string) => boolean;
    canAccessTenant: (targetTenantId: string) => boolean;
    canAccessResource: (
      resourceOwnerId?: string,
      resourceTenantId?: string,
      requiredPermission?: any,
    ) => boolean;
  };
}
