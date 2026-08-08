import { Module } from '@nestjs/common';
import { SupervisorPortalController } from './supervisor-portal.controller';
import { SupervisorPortalService } from './supervisor-portal.service';
import { CommonModule } from '../common/common.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    CommonModule,
    PrismaModule,
  ],
  controllers: [SupervisorPortalController],
  providers: [SupervisorPortalService],
  exports: [SupervisorPortalService],
})
export class SupervisorPortalModule {}