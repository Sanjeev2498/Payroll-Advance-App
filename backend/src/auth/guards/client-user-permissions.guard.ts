import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ClientUserPermissionsConfig } from '../rbac/client-user-permissions.config';
import { ClientPortalPermissions } from '../enums/permissions.enum';

@Injectable()
export class ClientUserPermissionsGuard implements CanActivate {
  private readonly logger = new Logger(ClientUserPermissionsGuard.name);

  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Get required permissions from decorator metadata
    const requiredPermissions = this.reflector.getAllAndOverride<ClientPortalPermissions[]>(
      'client_permissions',
      [context.getHandler(), context.getClass()],
    );

    // If no permissions specified, allow access
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const clientUser = request.clientUser;

    if (!clientUser) {
      this.logger.warn('Client user information not found in request');
      throw new ForbiddenException('Client user information not available');
    }

    // Check if user has any of the required permissions
    const hasPermission = ClientUserPermissionsConfig.hasAnyPermission(
      clientUser.role,
      requiredPermissions,
    );

    if (!hasPermission) {
      this.logger.warn(
        `Client user ${clientUser.email} (${clientUser.role}) denied access to ${requiredPermissions.join(', ')}`
      );
      throw new ForbiddenException(
        `Insufficient permissions. Required: ${requiredPermissions.join(', ')}`
      );
    }

    this.logger.debug(
      `Client user ${clientUser.email} (${clientUser.role}) granted access to ${requiredPermissions.join(', ')}`
    );

    return true;
  }
}