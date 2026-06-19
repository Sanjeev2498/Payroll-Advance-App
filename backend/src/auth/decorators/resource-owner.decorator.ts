import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { TenantContextService } from '../../common/tenant-context.service';

/**
 * Parameter decorator to inject the current user's ID from the tenant context
 * Useful for automatically getting the authenticated user in endpoints
 */
export const CurrentUserId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    
    // Get tenant context service from the request (injected by middleware)
    const tenantContextService = request.tenantContext as TenantContextService;
    
    if (tenantContextService && tenantContextService.hasContext()) {
      return tenantContextService.getUserId();
    }
    
    // Fallback to user from request (set by JWT strategy)
    return request.user?.id || null;
  },
);

/**
 * Parameter decorator to inject the current user's role from the tenant context
 */
export const CurrentUserRole = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    
    const tenantContextService = request.tenantContext as TenantContextService;
    
    if (tenantContextService && tenantContextService.hasContext()) {
      return tenantContextService.getUserRole();
    }
    
    return request.user?.role || null;
  },
);

/**
 * Parameter decorator to inject the current tenant ID from the tenant context
 */
export const CurrentTenantId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    
    const tenantContextService = request.tenantContext as TenantContextService;
    
    if (tenantContextService && tenantContextService.hasContext()) {
      return tenantContextService.getTenantId();
    }
    
    return request.user?.tenantId || request.user?.companyId || null;
  },
);

/**
 * Parameter decorator to inject the full authenticated user context
 */
export const CurrentUserContext = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    
    const tenantContextService = request.tenantContext as TenantContextService;
    
    if (tenantContextService && tenantContextService.hasContext()) {
      return tenantContextService.getContext();
    }
    
    return {
      tenantId: request.user?.tenantId || request.user?.companyId || null,
      userId: request.user?.id || null,
      userRole: request.user?.role || null,
      isSet: !!request.user,
    };
  },
);

/**
 * Interface for ownership validation configuration
 */
export interface OwnershipValidationConfig {
  /**
   * The parameter name in the request that contains the resource ID
   * Default: 'id'
   */
  resourceIdParam?: string;
  
  /**
   * The field name in the resource that contains the owner ID
   * Default: 'userId' or 'ownerId'
   */
  ownerField?: string;
  
  /**
   * Whether to allow tenant admins to access resources owned by others in the same tenant
   * Default: true
   */
  allowTenantAdmins?: boolean;
  
  /**
   * Custom validation function for complex ownership logic
   */
  customValidator?: (resourceId: string, userId: string, tenantId: string) => Promise<boolean>;
}

/**
 * Decorator to mark endpoints as requiring resource ownership validation
 * This is metadata that can be used by guards to implement ownership checks
 */
export const RequireResourceOwnership = (config: OwnershipValidationConfig = {}) => {
  const defaultConfig: OwnershipValidationConfig = {
    resourceIdParam: 'id',
    ownerField: 'userId',
    allowTenantAdmins: true,
    ...config,
  };
  
  return (target: any, propertyKey?: string, descriptor?: PropertyDescriptor) => {
    Reflect.defineMetadata('ownership-config', defaultConfig, target, propertyKey);
  };
};

/**
 * Helper function to extract ownership configuration from metadata
 */
export function getOwnershipConfig(
  target: any,
  propertyKey?: string
): OwnershipValidationConfig | undefined {
  return Reflect.getMetadata('ownership-config', target, propertyKey);
}