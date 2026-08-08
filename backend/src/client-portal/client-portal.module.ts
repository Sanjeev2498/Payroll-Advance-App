import { Module } from '@nestjs/common';
import { ClientPortalController } from './client-portal.controller';
import { ClientPortalService } from './client-portal.service';
import { CommonModule } from '../common/common.module';
import { BillingModule } from '../billing/billing.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [CommonModule, BillingModule, PrismaModule],
  controllers: [ClientPortalController],
  providers: [ClientPortalService],
  exports: [ClientPortalService],
})
export class ClientPortalModule {}