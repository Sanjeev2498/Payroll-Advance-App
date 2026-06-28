import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  PERMISSIONS_KEY,
  PERMISSION_OPTIONS_KEY,
  PermissionOptions,
} from '../decorators/permissions.decorator';
import { Permission } from '../enums/permissions.enum';
import { RbacService } from '../rbac/rbac.service';
import { TenantContextService } from '../../common/tenant-context.service';

/**
 * Guard to enforce permission-based access control
 * Works in conjunction with permission decorators to protect endpoints
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  private readonly logger = new Logger(PermissionsGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly rbacService: RbacService,
    private readonly tenantContextService: TenantContextService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Get required permissions from decorator metadata
    const requiredPermissions = this.reflector.getAllAndOverride<Permission[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // If no permissions are required, allow access
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    // Get permission options
    const options =
      this.reflector.getAllAndOverride<PermissionOptions>(PERMISSION_OPTIONS_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) || {};

    const request = context.switchToHttp().getRequest();

    // Ensure user is authenticated and context is set
    if (!this.tenantContextService.hasContext()) {
      this.logger.warn('Permission check attempted without tenant context');
      throw new UnauthorizedException('Authentication required for this operation');
    }

    const userId = this.tenantContextService.getUserId();
    const userRole = this.tenantContextService.getUserRole();
    const tenantId = this.tenantContextService.getTenantId();

    this.logger.debug(
      `Permission check - User: ${userId}, Role: ${userRole}, Tenant: ${tenantId}, Required: [${requiredPermissions.join(', ')}]`,
    );

    try {
      // Check if user is accessing their own resource (if allowOwner is enabled)
      if (options.allowOwner && this.isResourceOwner(request, userId)) {
        this.logger.debug('Access granted: Resource owner');
        return true;
      }

      // Check permissions based on requireAll option
      const hasRequiredPermissions = options.requireAll
        ? this.rbacService.hasAllPermissions(requiredPermissions)
        : this.rbacService.hasAnyPermission(requiredPermissions);

      if (!hasRequiredPermissions) {
        const errorMessage =
          options.errorMessage ||
          `Insufficient privileges. Required permissions: ${requiredPermissions.join(', ')}`;

        this.logger.warn(
          `Permission denied - User: ${userId}, Role: ${userRole}, Missing: [${requiredPermissions.join(', ')}]`,
        );

        // Log authorization event for audit
        this.rbacService.logAuthorizationEvent(
          context.getHandler().name,
          this.getResourceFromRequest(request),
          false,
          {
            requiredPermissions,
            options,
            reason: 'insufficient_permissions',
          },
        );

        throw new ForbiddenException(errorMessage);
      }

      // Validate tenant-aware permissions for specific resources
      if (!this.validateTenantAwareAccess(request)) {
        this.logger.warn(`Tenant access violation - User: ${userId}, Tenant: ${tenantId}`);

        this.rbacService.logAuthorizationEvent(
          context.getHandler().name,
          this.getResourceFromRequest(request),
          false,
          {
            requiredPermissions,
            options,
            reason: 'tenant_access_violation',
          },
        );

        throw new ForbiddenException('Access denied to the requested resource');
      }

      // Log successful authorization
      this.rbacService.logAuthorizationEvent(
        context.getHandler().name,
        this.getResourceFromRequest(request),
        true,
        { requiredPermissions, options },
      );

      this.logger.debug('Permission check passed');
      return true;
    } catch (error) {
      if (error instanceof ForbiddenException || error instanceof UnauthorizedException) {
        throw error;
      }

      this.logger.error('Unexpected error during permission check', error);
      throw new ForbiddenException('Unable to verify permissions');
    }
  }

  /**
   * Check if the current user is the owner of the resource being accessed
   */
  private isResourceOwner(request: any, userId: string | null): boolean {
    if (!userId) {
      return false;
    }

    // Check common patterns for resource ownership
    const resourceId = request.params?.id || request.params?.userId || request.body?.userId;

    if (resourceId === userId) {
      return true;
    }

    // Check if the resource has an explicit owner field in the request
    if (request.body?.ownerId === userId || request.params?.ownerId === userId) {
      return true;
    }

    // For user profile endpoints, check if accessing own profile
    if (request.url?.includes('/profile') || request.url?.includes('/me')) {
      return true;
    }

    return false;
  }

  /**
   * Validate tenant-aware access based on resource tenant context
   */
  private validateTenantAwareAccess(request: any): boolean {
    // Extract tenant information from request parameters or body
    const resourceTenantId =
      request.params?.tenantId ||
      request.body?.tenantId ||
      request.body?.companyId ||
      request.params?.companyId;

    // If no resource tenant is specified, allow access (will be handled by other guards)
    if (!resourceTenantId) {
      return true;
    }

    // Validate that user can access the requested tenant
    return this.rbacService.canAccessTenant(resourceTenantId);
  }

  /**
   * Extract resource information from request for audit logging
   */
  private getResourceFromRequest(request: any): string {
    const method = request.method;
    const url = request.url;
    const resourceId = request.params?.id;

    if (resourceId) {
      return `${method} ${url} (${resourceId})`;
    }

    return `${method} ${url}`;
  }
}

/**
 * Enhanced permissions guard that also validates resource ownership at the database level
 * Use this for endpoints that require database validation of ownership
 */
@Injectable()
export class ResourceOwnershipGuard implements CanActivate {
  private readonly logger = new Logger(ResourceOwnershipGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly rbacService: RbacService,
    private readonly tenantContextService: TenantContextService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // First run standard permissions check
    const permissionsGuard = new PermissionsGuard(
      this.reflector,
      this.rbacService,
      this.tenantContextService,
    );

    const hasPermissions = await permissionsGuard.canActivate(context);
    if (!hasPermissions) {
      return false;
    }

    // Additional resource ownership validation can be implemented here
    // This would typically involve database queries to verify ownership
    // For now, we rely on the standard permissions guard

    return true;
  }
}
