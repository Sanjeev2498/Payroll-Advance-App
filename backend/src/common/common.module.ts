import { Module, Global } from '@nestjs/common';
import { TenantContextService } from './tenant-context.service';
import { TenantContextMiddleware } from './tenant-context.middleware';
import { TenantGuard } from './tenant.guard';
import { PrismaModule } from '../prisma/prisma.module';
import { EncryptionUtil } from './utils/encryption.util';
import { DataTransformService } from './services/data-transform.service';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [
    TenantContextService, 
    TenantContextMiddleware, 
    TenantGuard,
    EncryptionUtil,
    DataTransformService,
  ],
  exports: [
    TenantContextService, 
    TenantContextMiddleware, 
    TenantGuard,
    EncryptionUtil,
    DataTransformService,
  ],
})
export class CommonModule {}
