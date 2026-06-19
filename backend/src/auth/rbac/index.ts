// RBAC Core
export { RbacModule } from './rbac.module';
export { RbacService } from './rbac.service';
export { RolePermissionsConfig } from './role-permissions.config';

// Permissions
export * from '../enums/permissions.enum';

// Guards
export { PermissionsGuard, ResourceOwnershipGuard } from '../guards/permissions.guard';

// Decorators
export * from '../decorators/permissions.decorator';
export * from '../decorators/resource-owner.decorator';

// Re-export commonly used items from existing auth system
export { JwtAuthGuard } from '../guards/jwt-auth.guard';
export { 
  RequireTenant, 
  TenantGuard, 
  SystemOnly,
  AdminOnly,
  ManagerOrAbove,
  SupervisorOrAbove,
  AllAuthenticatedUsers 
} from '../../common/tenant.guard';
export { Public } from '../decorators/public.decorator';
export { CurrentUser } from '../decorators/current-user.decorator';