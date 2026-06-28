import { Module } from '@nestjs/common';
import { SitesService } from './sites.service';
import { SitesController } from './sites.controller';
import { SiteRepository } from '../common/repositories/site.repository';
import { ClientRepository } from '../common/repositories/client.repository';
import { PrismaModule } from '../prisma/prisma.module';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [PrismaModule, CommonModule],
  controllers: [SitesController],
  providers: [SitesService, SiteRepository, ClientRepository],
  exports: [SitesService, SiteRepository],
})
export class SitesModule {}
