import { Module, Global } from '@nestjs/common';
import { TenantContextService } from './tenant-context.service';
import { TenantContextMiddleware } from './tenant-context.middleware';
import { TenantGuard } from './tenant.guard';
import { PrismaModule } from '../prisma/prisma.module';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [TenantContextService, TenantContextMiddleware, TenantGuard],
  exports: [TenantContextService, TenantContextMiddleware, TenantGuard],
})
export class CommonModule {}
