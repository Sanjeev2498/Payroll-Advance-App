import { SetMetadata } from '@nestjs/common';
import { ClientPortalPermissions } from '../enums/permissions.enum';

/**
 * Decorator to specify required client portal permissions for an endpoint
 * Used with ClientUserPermissionsGuard to enforce client user access control
 */
export const RequireClientPermissions = (...permissions: ClientPortalPermissions[]) =>
  SetMetadata('client_permissions', permissions);

/**
 * Decorator to allow public access to client portal endpoints
 * Bypasses client user authentication and authorization
 */
export const PublicClientEndpoint = () => SetMetadata('isPublicClientEndpoint', true);