import { Injectable, Logger, ForbiddenException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { RbacService } from './rbac.service';
import { TenantContextService } from '../../common/tenant-context.service';
import { Permission } from '../enums/permissions.enum';

/**
 * Resource-level authorization configuration
 */
export interface ResourceAuthConfig {
  /** Resource type identifier */
  resourceType: string;
  /** Required permission to access resource */
  requiredPermission?: Permission;
  /** Allow resource owners to access regardless of permissions */
  allowOwner?: boolean;
  /** Allow tenant administrators to access */
  allowTenantAdmin?: boolean;
  /** Custom validation function */
  customValidator?: (context: ResourceAuthContext) => Promise<boolean> | boolean;
}

/**
 * Authorization context for resource access
 */
export interface ResourceAuthContext {
  userId: string | null;
  userRole: UserRole | null;
  tenantId: string | null;
  resourceId?: string;
  resourceOwnerId?: string;
  resourceTenantId?: string;
  resourceData?: any;
  action?: string;
}

/**
 * Resource Authorization Service
 * Provides fine-grained authorization for specific resources and business logic
 */
@Injectable()
export class ResourceAuthorizationService {
  private readonly logger = new Logger(ResourceAuthorizationService.name);

  constructor(
    private readonly rbacService: RbacService,
    private readonly tenantContextService: TenantContextService,
  ) {}

  /**
   * Authorize access to a specific resource
   */
  async authorizeResourceAccess(
    resourceId: string,
    config: ResourceAuthConfig,
    resourceData?: any
  ): Promise<boolean> {
    const context: ResourceAuthContext = {
      userId: this.tenantContextService.getUserId(),
      userRole: this.tenantContextService.getUserRole() as UserRole,
      tenantId: this.tenantContextService.getTenantId(),
      resourceId,
      resourceData,
      resourceOwnerId: resourceData?.userId || resourceData?.ownerId,
      resourceTenantId: resourceData?.companyId || resourceData?.tenantId,
      action: 'access',
    };

    return this.evaluateAuthorization(context, config);
  }

  /**
   * Authorize a specific action on a resource
   */
  async authorizeAction(
    action: string,
    resourceType: string,
    resourceData?: any,
    customConfig?: Partial<ResourceAuthConfig>
  ): Promise<boolean> {
    const config: ResourceAuthConfig = {
      resourceType,
      allowOwner: true,
      allowTenantAdmin: true,
      ...customConfig,
    };

    const context: ResourceAuthContext = {
      userId: this.tenantContextService.getUserId(),
      userRole: this.tenantContextService.getUserRole() as UserRole,
      tenantId: this.tenantContextService.getTenantId(),
      resourceData,
      resourceOwnerId: resourceData?.userId || resourceData?.ownerId,
      resourceTenantId: resourceData?.companyId || resourceData?.tenantId,
      action,
    };

    return this.evaluateAuthorization(context, config);
  }

  /**
   * Throw authorization exception if access is denied
   */
  async requireResourceAccess(
    resourceId: string,
    config: ResourceAuthConfig,
    resourceData?: any,
    errorMessage?: string
  ): Promise<void> {
    const isAuthorized = await this.authorizeResourceAccess(resourceId, config, resourceData);
    
    if (!isAuthorized) {
      const defaultMessage = `Access denied to ${config.resourceType} resource`;
      this.logAuthorizationFailure(resourceId, config, errorMessage || defaultMessage);
      throw new ForbiddenException(errorMessage || defaultMessage);
    }
  }

  /**
   * Require authorization for a specific action
   */
  async requireActionAuthorization(
    action: string,
    resourceType: string,
    resourceData?: any,
    customConfig?: Partial<ResourceAuthConfig>,
    errorMessage?: string
  ): Promise<void> {
    const isAuthorized = await this.authorizeAction(action, resourceType, resourceData, customConfig);
    
    if (!isAuthorized) {
      const defaultMessage = `Action '${action}' denied on ${resourceType} resource`;
      this.logAuthorizationFailure(`${action}:${resourceType}`, { resourceType, ...customConfig }, errorMessage || defaultMessage);
      throw new ForbiddenException(errorMessage || defaultMessage);
    }
  }

  /**
   * Check if user can perform bulk operations on resources
   */
  async authorizeBulkAction(
    action: string,
    resourceType: string,
    resourceIds: string[],
    customConfig?: Partial<ResourceAuthConfig>
  ): Promise<{ authorized: string[], denied: string[] }> {
    const results = {
      authorized: [] as string[],
      denied: [] as string[],
    };

    for (const resourceId of resourceIds) {
      try {
        const isAuthorized = await this.authorizeAction(action, resourceType, { id: resourceId }, customConfig);
        if (isAuthorized) {
          results.authorized.push(resourceId);
        } else {
          results.denied.push(resourceId);
        }
      } catch (error) {
        results.denied.push(resourceId);
      }
    }

    return results;
  }

  /**
   * Get filtered list of resources based on user permissions
   */
  async filterAuthorizedResources<T extends { id: string }>(
    resources: T[],
    resourceType: string,
    action: string = 'read',
    customConfig?: Partial<ResourceAuthConfig>
  ): Promise<T[]> {
    const authorizedResources: T[] = [];

    for (const resource of resources) {
      try {
        const isAuthorized = await this.authorizeAction(action, resourceType, resource, customConfig);
        if (isAuthorized) {
          authorizedResources.push(resource);
        }
      } catch (error) {
        // Skip unauthorized resources silently
        continue;
      }
    }

    return authorizedResources;
  }

  /**
   * Core authorization evaluation logic
   */
  private async evaluateAuthorization(
    context: ResourceAuthContext,
    config: ResourceAuthConfig
  ): Promise<boolean> {
    // Ensure we have user context
    if (!context.userId || !context.userRole) {
      this.logger.warn('Authorization attempted without valid user context');
      return false;
    }

    // Super admins can access everything
    if (context.userRole === UserRole.SUPER_ADMIN) {
      this.logAuthorizationSuccess(context, config, 'super_admin_access');
      return true;
    }

    // Check tenant access if resource belongs to a specific tenant
    if (context.resourceTenantId && !this.rbacService.canAccessTenant(context.resourceTenantId)) {
      this.logAuthorizationFailure(context.resourceId || 'unknown', config, 'cross_tenant_access_denied');
      return false;
    }

    // Check resource ownership if enabled
    if (config.allowOwner && context.resourceOwnerId && context.resourceOwnerId === context.userId) {
      this.logAuthorizationSuccess(context, config, 'resource_owner_access');
      return true;
    }

    // Check tenant admin access if enabled
    if (config.allowTenantAdmin && this.isTenantAdmin(context.userRole)) {
      this.logAuthorizationSuccess(context, config, 'tenant_admin_access');
      return true;
    }

    // Check required permission
    if (config.requiredPermission && !this.rbacService.hasPermission(config.requiredPermission)) {
      this.logAuthorizationFailure(context.resourceId || 'unknown', config, 'insufficient_permissions');
      return false;
    }

    // Run custom validator if provided
    if (config.customValidator) {
      try {
        const customResult = await config.customValidator(context);
        if (!customResult) {
          this.logAuthorizationFailure(context.resourceId || 'unknown', config, 'custom_validation_failed');
          return false;
        }
      } catch (error) {
        this.logger.error('Custom validator error:', error);
        return false;
      }
    }

    // Default: grant access if no restrictions failed
    this.logAuthorizationSuccess(context, config, 'permission_based_access');
    return true;
  }

  /**
   * Check if user role has tenant admin privileges
   */
  private isTenantAdmin(role: UserRole): boolean {
    return role === UserRole.COMPANY_ADMIN || role === UserRole.SUPER_ADMIN;
  }

  /**
   * Log successful authorization for audit purposes
   */
  private logAuthorizationSuccess(
    context: ResourceAuthContext,
    config: ResourceAuthConfig,
    reason: string
  ): void {
    this.logger.debug({
      event: 'resource_authorization_success',
      userId: context.userId,
      resourceType: config.resourceType,
      resourceId: context.resourceId,
      reason,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Log authorization failure for audit and security monitoring
   */
  private logAuthorizationFailure(
    resourceId: string,
    config: ResourceAuthConfig | Partial<ResourceAuthConfig>,
    reason: string
  ): void {
    const context = this.rbacService.getPermissionContext();
    
    this.logger.warn({
      event: 'resource_authorization_failure',
      userId: context.userId,
      resourceType: config.resourceType,
      resourceId,
      reason,
      userRole: context.userRole,
      tenantId: context.tenantId,
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Common resource authorization configurations
 */
export class ResourceAuthConfigs {
  static readonly USER_PROFILE: ResourceAuthConfig = {
    resourceType: 'user_profile',
    allowOwner: true,
    allowTenantAdmin: true,
  };

  static readonly EMPLOYEE_RECORD: ResourceAuthConfig = {
    resourceType: 'employee_record',
    allowOwner: true,
    allowTenantAdmin: true,
  };

  static readonly ATTENDANCE_RECORD: ResourceAuthConfig = {
    resourceType: 'attendance_record',
    allowOwner: true,
    allowTenantAdmin: false, // Managers need specific permissions
  };

  static readonly PAYROLL_RECORD: ResourceAuthConfig = {
    resourceType: 'payroll_record',
    allowOwner: true,
    allowTenantAdmin: true,
  };

  static readonly CLIENT_DATA: ResourceAuthConfig = {
    resourceType: 'client_data',
    allowOwner: false,
    allowTenantAdmin: true,
  };

  static readonly INVOICE_DATA: ResourceAuthConfig = {
    resourceType: 'invoice_data',
    allowOwner: false,
    allowTenantAdmin: true,
  };
}