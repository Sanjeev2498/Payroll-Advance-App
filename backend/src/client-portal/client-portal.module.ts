import { Module } from '@nestjs/common';
import { ClientPortalController } from './client-portal.controller';
import { ClientPortalService } from './client-portal.service';
import { CommonModule } from '../common/common.module';
import { BillingModule } from '../billing/billing.module';

@Module({
  imports: [CommonModule, BillingModule],
  controllers: [ClientPortalController],
  providers: [ClientPortalService],
  exports: [ClientPortalService],
})
export class ClientPortalModule {}