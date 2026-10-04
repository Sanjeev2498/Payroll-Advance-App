import { Module } from '@nestjs/common';
import { AuditLogService } from '../services/audit-log.service';
import { EncryptionService } from '../services/encryption.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [
    AuditLogService,
    EncryptionService,
  ],
  exports: [
    AuditLogService,
    EncryptionService,
  ],
})
export class SecurityModule {}