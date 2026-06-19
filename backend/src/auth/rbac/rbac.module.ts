import { Module, Global } from '@nestjs/common';
import { RbacService } from './rbac.service';
import { PermissionsGuard } from '../guards/permissions.guard';
import { CommonModule } from '../../common/common.module';

/**
 * RBAC Module - Role-Based Access Control
 * Provides centralized authorization services, guards, and decorators
 */
@Global() // Make RBAC service available throughout the application
@Module({
  imports: [CommonModule], // Import CommonModule for TenantContextService
  providers: [
    RbacService,
    PermissionsGuard,
  ],
  exports: [
    RbacService,
    PermissionsGuard,
  ],
})
export class RbacModule {}