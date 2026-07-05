// RBAC Core
export { RbacModule } from './rbac.module';
export { RbacService } from './rbac.service';
export { RolePermissionsConfig } from './role-permissions.config';
export {
  ResourceAuthorizationService,
} from './resource-authorization.service';
export type {
  ResourceAuthConfig,
  ResourceAuthContext,
  ResourceAuthConfigs,
} from './resource-authorization.service';
export {
  RbacUtilitiesService,
} from './rbac-utilities.service';
export type {
  PermissionValidationResult,
  DynamicPermissionRule,
  PermissionRuleContext,
} from './rbac-utilities.service';

// Permissions
export * from '../enums/permissions.enum';

// Guards
export { PermissionsGuard, ResourceOwnershipGuard } from '../guards/permissions.guard';
export {
  ResourceAuthorizationGuard,
  CompositeAuthorizationGuard,
} from '../guards/resource-authorization.guard';

// Decorators
export * from '../decorators/permissions.decorator';
export * from '../decorators/resource-owner.decorator';
export * from '../decorators/resource-authorization.decorator';

// Middleware
export { TenantPermissionMiddleware } from './tenant-permission.middleware';
export type { AuthenticatedRequest } from './tenant-permission.middleware';

// Re-export commonly used items from existing auth system
export { JwtAuthGuard } from '../guards/jwt-auth.guard';
export {
  RequireTenant,
  TenantGuard,
  SystemOnly,
  AdminOnly,
  ManagerOrAbove,
  SupervisorOrAbove,
  AllAuthenticatedUsers,
} from '../../common/tenant.guard';
export { Public } from '../decorators/public.decorator';
export { CurrentUser } from '../decorators/current-user.decorator';
