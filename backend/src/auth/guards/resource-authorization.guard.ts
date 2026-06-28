import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RESOURCE_AUTH_KEY } from '../decorators/resource-authorization.decorator';
import {
  ResourceAuthConfig,
  ResourceAuthorizationService,
} from '../rbac/resource-authorization.service';
import { TenantContextService } from '../../common/tenant-context.service';

/**
 * Guard for resource-level authorization
 * Works with @RequireResourceAuth decorator to provide fine-grained access control
 */
@Injectable()
export class ResourceAuthorizationGuard implements CanActivate {
  private readonly logger = new Logger(ResourceAuthorizationGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly resourceAuthService: ResourceAuthorizationService,
    private readonly tenantContextService: TenantContextService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Get resource authorization config from decorator metadata
    const resourceAuthConfig = this.reflector.getAllAndOverride<ResourceAuthConfig>(
      RESOURCE_AUTH_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If no resource auth config, allow access (no resource-level restrictions)
    if (!resourceAuthConfig) {
      return true;
    }

    const request = context.switchToHttp().getRequest();

    // Ensure user is authenticated and context is set
    if (!this.tenantContextService.hasContext()) {
      this.logger.warn('Resource authorization attempted without tenant context');
      throw new ForbiddenException('Authentication required for resource access');
    }

    try {
      // Extract resource ID from request parameters (default to 'id')
      const resourceId = request.params?.id || request.params?.resourceId;

      // Get resource data from request body if available
      const resourceData = this.extractResourceData(request, resourceAuthConfig);

      // Perform resource authorization check
      const isAuthorized = await this.resourceAuthService.authorizeResourceAccess(
        resourceId || 'unknown',
        resourceAuthConfig,
        resourceData,
      );

      if (!isAuthorized) {
        const errorMessage = `Access denied to ${resourceAuthConfig.resourceType} resource`;

        this.logger.warn({
          event: 'resource_authorization_denied',
          resourceType: resourceAuthConfig.resourceType,
          resourceId,
          userId: this.tenantContextService.getUserId(),
          userRole: this.tenantContextService.getUserRole(),
          endpoint: `${request.method} ${request.url}`,
        });

        throw new ForbiddenException(errorMessage);
      }

      this.logger.debug({
        event: 'resource_authorization_granted',
        resourceType: resourceAuthConfig.resourceType,
        resourceId,
        userId: this.tenantContextService.getUserId(),
        endpoint: `${request.method} ${request.url}`,
      });

      return true;
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }

      this.logger.error('Unexpected error during resource authorization:', error);
      throw new ForbiddenException('Unable to verify resource access permissions');
    }
  }

  /**
   * Extract resource data from request for authorization context
   */
  private extractResourceData(request: any, config: ResourceAuthConfig): any {
    // Try to get resource data from various sources
    const resourceData: any = {};

    // Extract from request body
    if (request.body) {
      resourceData.userId = request.body.userId || request.body.ownerId;
      resourceData.companyId = request.body.companyId || request.body.tenantId;
      resourceData.id = request.body.id;

      // Include the entire body for custom validators
      resourceData._body = request.body;
    }

    // Extract from request parameters
    if (request.params) {
      resourceData.id = resourceData.id || request.params.id;
      resourceData.userId = resourceData.userId || request.params.userId;
      resourceData.companyId = resourceData.companyId || request.params.companyId;

      // Include params for custom validators
      resourceData._params = request.params;
    }

    // Extract from query parameters
    if (request.query) {
      resourceData.userId = resourceData.userId || request.query.userId;
      resourceData.companyId = resourceData.companyId || request.query.companyId;

      // Include query for custom validators
      resourceData._query = request.query;
    }

    // Include request metadata for advanced custom validators
    resourceData._meta = {
      method: request.method,
      url: request.url,
      resourceType: config.resourceType,
    };

    return resourceData;
  }
}

/**
 * Composite guard that combines both permissions and resource authorization
 * Use this for endpoints that need both role-based and resource-level checks
 */
@Injectable()
export class CompositeAuthorizationGuard implements CanActivate {
  private readonly logger = new Logger(CompositeAuthorizationGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly resourceAuthService: ResourceAuthorizationService,
    private readonly tenantContextService: TenantContextService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // First check if resource authorization is configured
    const resourceAuthConfig = this.reflector.getAllAndOverride<ResourceAuthConfig>(
      RESOURCE_AUTH_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (resourceAuthConfig) {
      // Create and use resource authorization guard
      const resourceGuard = new ResourceAuthorizationGuard(
        this.reflector,
        this.resourceAuthService,
        this.tenantContextService,
      );

      const resourceAuthResult = await resourceGuard.canActivate(context);
      if (!resourceAuthResult) {
        return false;
      }
    }

    // Note: Permission-based checks are handled by PermissionsGuard
    // This composite guard focuses on resource-level authorization

    return true;
  }
}
