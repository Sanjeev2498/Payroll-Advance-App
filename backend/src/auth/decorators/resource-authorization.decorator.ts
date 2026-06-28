import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import { ResourceAuthConfig } from '../rbac/resource-authorization.service';

/**
 * Metadata keys for resource authorization
 */
export const RESOURCE_AUTH_KEY = 'resource_authorization';

/**
 * Decorator to require resource-level authorization
 *
 * @param config - Resource authorization configuration
 *
 * @example
 * ```typescript
 * @RequireResourceAuth({
 *   resourceType: 'user_profile',
 *   allowOwner: true,
 *   requiredPermission: UserPermissions.READ_USER
 * })
 * async getProfile(@Param('id') id: string) { ... }
 * ```
 */
export const RequireResourceAuth = (config: ResourceAuthConfig) => {
  return SetMetadata(RESOURCE_AUTH_KEY, config);
};

/**
 * Parameter decorator to inject resource authorization context
 */
export const ResourceAuthContext = createParamDecorator((data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest();
  return request.permissionContext || null;
});

/**
 * Parameter decorator to extract resource ID from request parameters
 */
export const ResourceId = createParamDecorator(
  (paramName: string = 'id', ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.params?.[paramName] || null;
  },
);

/**
 * Parameter decorator to inject current user's authorization capabilities
 */
export const UserAuthCapabilities = createParamDecorator((data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest();

  if (!request.permissionContext) {
    return null;
  }

  return {
    userId: request.permissionContext.userId,
    userRole: request.permissionContext.userRole,
    tenantId: request.permissionContext.tenantId,
    permissions: request.permissionContext.permissions,
    hasPermission: request.permissionContext.hasPermission,
    canAccessTenant: request.permissionContext.canAccessTenant,
    canAccessResource: request.permissionContext.canAccessResource,
  };
});

/**
 * Convenience decorators for common resource authorization patterns
 */

/**
 * Require ownership or admin access to a user profile
 */
export const RequireUserProfileAccess = () =>
  RequireResourceAuth({
    resourceType: 'user_profile',
    allowOwner: true,
    allowTenantAdmin: true,
  });

/**
 * Require ownership or supervisory access to employee records
 */
export const RequireEmployeeAccess = () =>
  RequireResourceAuth({
    resourceType: 'employee_record',
    allowOwner: true,
    allowTenantAdmin: true,
  });

/**
 * Require ownership or management access to attendance records
 */
export const RequireAttendanceAccess = () =>
  RequireResourceAuth({
    resourceType: 'attendance_record',
    allowOwner: true,
    allowTenantAdmin: false, // Requires specific permissions
  });

/**
 * Require ownership or admin access to payroll records
 */
export const RequirePayrollAccess = () =>
  RequireResourceAuth({
    resourceType: 'payroll_record',
    allowOwner: true,
    allowTenantAdmin: true,
  });

/**
 * Require admin access to client data (no ownership model)
 */
export const RequireClientAccess = () =>
  RequireResourceAuth({
    resourceType: 'client_data',
    allowOwner: false,
    allowTenantAdmin: true,
  });

/**
 * Require admin access to invoice data (no ownership model)
 */
export const RequireInvoiceAccess = () =>
  RequireResourceAuth({
    resourceType: 'invoice_data',
    allowOwner: false,
    allowTenantAdmin: true,
  });
