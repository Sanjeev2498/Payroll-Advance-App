import { Module } from '@nestjs/common';
import { ClientsService } from './clients.service';
import { ClientsController } from './clients.controller';
import { ClientRepository } from '../common/repositories/client.repository';
import { PrismaModule } from '../prisma/prisma.module';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [PrismaModule, CommonModule],
  controllers: [ClientsController],
  providers: [
    ClientsService,
    ClientRepository,
  ],
  exports: [
    ClientsService,
    ClientRepository,
  ],
})
export class ClientsModule {}