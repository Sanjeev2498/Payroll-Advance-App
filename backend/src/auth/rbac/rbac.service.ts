import { Injectable, Logger } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Permission } from '../enums/permissions.enum';
import { RolePermissionsConfig } from './role-permissions.config';
import { TenantContextService } from '../../common/tenant-context.service';

/**
 * Role-Based Access Control Service
 * Provides centralized authorization logic for the application
 */
@Injectable()
export class RbacService {
  private readonly logger = new Logger(RbacService.name);

  constructor(private readonly tenantContextService: TenantContextService) {}

  /**
   * Check if the current user has a specific permission
   */
  hasPermission(permission: Permission): boolean {
    const userRole = this.getCurrentUserRole();
    if (!userRole) {
      this.logger.warn('Attempted permission check without valid user role');
      return false;
    }

    const hasPermission = RolePermissionsConfig.hasPermission(userRole, permission);

    this.logger.debug(
      `Permission check - Role: ${userRole}, Permission: ${permission}, Result: ${hasPermission}`,
    );

    return hasPermission;
  }

  /**
   * Check if the current user has any of the specified permissions
   */
  hasAnyPermission(permissions: Permission[]): boolean {
    const userRole = this.getCurrentUserRole();
    if (!userRole) {
      return false;
    }

    return RolePermissionsConfig.hasAnyPermission(userRole, permissions);
  }

  /**
   * Check if the current user has all of the specified permissions
   */
  hasAllPermissions(permissions: Permission[]): boolean {
    const userRole = this.getCurrentUserRole();
    if (!userRole) {
      return false;
    }

    return RolePermissionsConfig.hasAllPermissions(userRole, permissions);
  }

  /**
   * Get all permissions for the current user
   */
  getUserPermissions(): Permission[] {
    const userRole = this.getCurrentUserRole();
    if (!userRole) {
      return [];
    }

    return RolePermissionsConfig.getPermissionsForRole(userRole);
  }

  /**
   * Check if the current user can access resources belonging to a specific tenant
   */
  canAccessTenant(targetTenantId: string): boolean {
    // Ensure tenant context is set
    if (!this.tenantContextService.hasContext()) {
      this.logger.warn('Tenant access check attempted without context');
      return false;
    }

    const currentTenantId = this.tenantContextService.getTenantId();
    const userRole = this.getCurrentUserRole();

    // Super admins can access any tenant
    if (userRole === UserRole.SUPER_ADMIN) {
      return true;
    }

    // Regular users can only access their own tenant
    const canAccess = currentTenantId === targetTenantId;

    if (!canAccess) {
      this.logger.warn(
        `Tenant access denied - User tenant: ${currentTenantId}, Requested tenant: ${targetTenantId}, Role: ${userRole}`,
      );
    }

    return canAccess;
  }

  /**
   * Check if the current user can manage another user based on role hierarchy
   */
  canManageUser(targetUserRole: UserRole, targetUserTenantId?: string): boolean {
    const currentUserRole = this.getCurrentUserRole();
    if (!currentUserRole) {
      return false;
    }

    // Check role hierarchy
    const canManageRole = RolePermissionsConfig.canManageRole(currentUserRole, targetUserRole);

    // If target user is in a different tenant, ensure current user can access it
    if (targetUserTenantId && !this.canAccessTenant(targetUserTenantId)) {
      return false;
    }

    return canManageRole;
  }

  /**
   * Check if the current user can perform an action on a specific resource within their tenant
   */
  canPerformActionInTenant(permission: Permission, resourceTenantId?: string): boolean {
    // Check basic permission
    if (!this.hasPermission(permission)) {
      return false;
    }

    // If resource tenant ID is provided, ensure access
    if (resourceTenantId && !this.canAccessTenant(resourceTenantId)) {
      return false;
    }

    return true;
  }

  /**
   * Get the roles that the current user can assign to others
   */
  getAssignableRoles(): UserRole[] {
    const currentUserRole = this.getCurrentUserRole();
    if (!currentUserRole) {
      return [];
    }

    return RolePermissionsConfig.getManageableRoles(currentUserRole);
  }

  /**
   * Validate that a user can access a specific resource based on ownership or permission level
   */
  canAccessResource(
    resourceOwnerId?: string,
    resourceTenantId?: string,
    requiredPermission?: Permission,
  ): boolean {
    const currentUserId = this.tenantContextService.getUserId();
    const userRole = this.getCurrentUserRole();

    // Super admins can access anything
    if (userRole === UserRole.SUPER_ADMIN) {
      return true;
    }

    // Check tenant access
    if (resourceTenantId && !this.canAccessTenant(resourceTenantId)) {
      return false;
    }

    // Check if user owns the resource
    if (resourceOwnerId && currentUserId === resourceOwnerId) {
      return true;
    }

    // Check if user has required permission for non-owned resources
    if (requiredPermission && this.hasPermission(requiredPermission)) {
      return true;
    }

    return false;
  }

  /**
   * Create a permission context for detailed logging and auditing
   */
  getPermissionContext(): {
    userId: string | null;
    userRole: string | null;
    tenantId: string | null;
    permissions: Permission[];
    timestamp: Date;
  } {
    const userRole = this.getCurrentUserRole();

    return {
      userId: this.tenantContextService.getUserId(),
      userRole,
      tenantId: this.tenantContextService.getTenantId(),
      permissions: userRole ? this.getUserPermissions() : [],
      timestamp: new Date(),
    };
  }

  /**
   * Log an authorization event for audit purposes
   */
  logAuthorizationEvent(
    action: string,
    resource: string,
    allowed: boolean,
    details?: Record<string, any>,
  ): void {
    const context = this.getPermissionContext();

    this.logger.log({
      event: 'authorization_check',
      action,
      resource,
      allowed,
      context,
      details,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Get the current user's role from tenant context
   */
  private getCurrentUserRole(): UserRole | null {
    const roleString = this.tenantContextService.getUserRole();
    if (!roleString) {
      return null;
    }

    // Validate that the role string is a valid UserRole
    if (Object.values(UserRole).includes(roleString as UserRole)) {
      return roleString as UserRole;
    }

    this.logger.warn(`Invalid user role in context: ${roleString}`);
    return null;
  }
}
