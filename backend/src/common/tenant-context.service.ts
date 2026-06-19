import { Injectable, Scope, Logger } from '@nestjs/common';

@Injectable({ scope: Scope.REQUEST })
export class TenantContextService {
  private readonly logger = new Logger(TenantContextService.name);
  private tenantId: string | null = null;
  private userId: string | null = null;
  private userRole: string | null = null;
  private isContextSet: boolean = false;

  /**
   * Set the tenant context for the current request
   */
  setContext(tenantId: string, userId?: string, userRole?: string): void {
    this.tenantId = tenantId;
    this.userId = userId;
    this.userRole = userRole;
    this.isContextSet = true;
    
    this.logger.debug(`Tenant context set - Tenant: ${tenantId}, User: ${userId}, Role: ${userRole}`);
  }

  /**
   * Get the current tenant ID
   */
  getTenantId(): string {
    if (!this.tenantId || !this.isContextSet) {
      throw new Error('Tenant context not set. Ensure authentication middleware is properly configured.');
    }
    return this.tenantId;
  }

  /**
   * Get the current user ID (if available)
   */
  getUserId(): string | null {
    return this.userId;
  }

  /**
   * Get the current user role (if available)
   */
  getUserRole(): string | null {
    return this.userRole;
  }

  /**
   * Check if tenant context is set
   */
  hasContext(): boolean {
    return this.isContextSet && this.tenantId !== null;
  }

  /**
   * Get complete context information
   */
  getContext(): {
    tenantId: string | null;
    userId: string | null;
    userRole: string | null;
    isSet: boolean;
  } {
    return {
      tenantId: this.tenantId,
      userId: this.userId,
      userRole: this.userRole,
      isSet: this.isContextSet,
    };
  }

  /**
   * Validate that the current user can access the specified tenant
   */
  validateTenantAccess(requiredTenantId: string): boolean {
    if (!this.hasContext()) {
      return false;
    }

    // Super admins can access any tenant
    if (this.userRole === 'SUPER_ADMIN') {
      return true;
    }

    // Regular users can only access their own tenant
    return this.tenantId === requiredTenantId;
  }

  /**
   * Check if the current user has admin privileges
   */
  isAdmin(): boolean {
    return this.userRole === 'SUPER_ADMIN' || this.userRole === 'COMPANY_ADMIN';
  }

  /**
   * Check if the current user has specific role
   */
  hasRole(role: string): boolean {
    return this.userRole === role;
  }

  /**
   * Check if the current user has any of the specified roles
   */
  hasAnyRole(roles: string[]): boolean {
    return this.userRole ? roles.includes(this.userRole) : false;
  }

  /**
   * Clear the current context
   */
  clearContext(): void {
    this.tenantId = null;
    this.userId = null;
    this.userRole = null;
    this.isContextSet = false;
    
    this.logger.debug('Tenant context cleared');
  }

  /**
   * Create a context snapshot for logging/debugging
   */
  getContextSnapshot(): string {
    return `Context[tenant:${this.tenantId},user:${this.userId},role:${this.userRole},set:${this.isContextSet}]`;
  }
}