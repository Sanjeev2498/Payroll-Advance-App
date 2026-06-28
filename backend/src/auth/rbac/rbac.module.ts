import { Module, Global } from '@nestjs/common';
import { RbacService } from './rbac.service';
import { PermissionsGuard } from '../guards/permissions.guard';
import { ResourceAuthorizationService } from './resource-authorization.service';
import {
  ResourceAuthorizationGuard,
  CompositeAuthorizationGuard,
} from '../guards/resource-authorization.guard';
import { RbacUtilitiesService } from './rbac-utilities.service';
import { TenantPermissionMiddleware } from './tenant-permission.middleware';
import { CommonModule } from '../../common/common.module';

/**
 * RBAC Module - Role-Based Access Control
 * Provides comprehensive authorization services, guards, decorators, and utilities
 */
@Global() // Make RBAC services available throughout the application
@Module({
  imports: [CommonModule], // Import CommonModule for TenantContextService
  providers: [
    // Core RBAC services
    RbacService,
    ResourceAuthorizationService,
    RbacUtilitiesService,

    // Guards
    PermissionsGuard,
    ResourceAuthorizationGuard,
    CompositeAuthorizationGuard,

    // Middleware
    TenantPermissionMiddleware,
  ],
  exports: [
    // Core services
    RbacService,
    ResourceAuthorizationService,
    RbacUtilitiesService,

    // Guards
    PermissionsGuard,
    ResourceAuthorizationGuard,
    CompositeAuthorizationGuard,

    // Middleware
    TenantPermissionMiddleware,
  ],
})
export class RbacModule {}
