import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TenantContextService } from './tenant-context.service';
import { AuthenticatedRequest } from './tenant-context.middleware';

// Decorator to mark routes as requiring tenant access
export const RequireTenant = Reflector.createDecorator<string[]>();

// Decorator to mark routes as system-only (bypass tenant checks)  
export const SystemOnly = Reflector.createDecorator<boolean>();

@Injectable()
export class TenantGuard implements CanActivate {
  private readonly logger = new Logger(TenantGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly tenantContextService: TenantContextService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    // Check if this is a system-only endpoint
    const isSystemOnly = this.reflector.get(SystemOnly, context.getHandler()) ||
                        this.reflector.get(SystemOnly, context.getClass());

    if (isSystemOnly) {
      this.logger.debug('System-only endpoint - bypassing tenant checks');
      return true;
    }

    // Check if tenant context is required
    const requiredRoles = this.reflector.get(RequireTenant, context.getHandler()) ||
                         this.reflector.get(RequireTenant, context.getClass());

    // If no specific tenant requirements, allow access
    if (!requiredRoles) {
      return true;
    }

    // Ensure tenant context is set
    if (!this.tenantContextService.hasContext()) {
      this.logger.warn('Tenant context not set for protected endpoint');
      throw new UnauthorizedException('Authentication required for this operation');
    }

    // Check role-based access if specific roles are required
    if (requiredRoles.length > 0) {
      const userRole = this.tenantContextService.getUserRole();
      
      // Super admins bypass all role restrictions
      if (userRole === 'SUPER_ADMIN') {
        this.logger.debug('Super admin access granted - bypassing role checks');
      } else if (!userRole || !requiredRoles.includes(userRole)) {
        const tenantId = this.tenantContextService.getTenantId();
        this.logger.warn(
          `Access denied - User role ${userRole} not in required roles [${requiredRoles.join(', ')}] for tenant ${tenantId}`
        );
        throw new ForbiddenException('Insufficient privileges for this operation');
      }
    }

    // Additional validation: ensure user can access their claimed tenant
    const user = request.user;
    
    if (user && this.tenantContextService.hasContext()) {
      const contextTenantId = this.tenantContextService.getTenantId();
      
      if (user.tenantId !== contextTenantId) {
        this.logger.error(
          `Tenant mismatch - User claims tenant ${user.tenantId} but context has ${contextTenantId}`
        );
        throw new ForbiddenException('Tenant access violation detected');
      }
    }

    this.logger.debug(
      `Tenant access granted - ${this.tenantContextService.getContextSnapshot()}`
    );

    return true;
  }
}

// Convenience decorators for common role combinations
export const AdminOnly = () => RequireTenant(['SUPER_ADMIN', 'COMPANY_ADMIN']);
export const ManagerOrAbove = () => RequireTenant(['SUPER_ADMIN', 'COMPANY_ADMIN', 'MANAGER']);
export const SupervisorOrAbove = () => RequireTenant(['SUPER_ADMIN', 'COMPANY_ADMIN', 'MANAGER', 'SUPERVISOR']);
export const AllAuthenticatedUsers = () => RequireTenant(['SUPER_ADMIN', 'COMPANY_ADMIN', 'MANAGER', 'SUPERVISOR', 'EMPLOYEE']);