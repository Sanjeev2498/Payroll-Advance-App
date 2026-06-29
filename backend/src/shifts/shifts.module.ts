import { Module } from '@nestjs/common';
import { ShiftsService } from './shifts.service';
import { ShiftsController } from './shifts.controller';
import { ShiftRepository } from '../common/repositories/shift.repository';
import { PrismaModule } from '../prisma/prisma.module';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [PrismaModule, CommonModule],
  controllers: [ShiftsController],
  providers: [ShiftsService, ShiftRepository],
  exports: [ShiftsService, ShiftRepository],
})
export class ShiftsModule {}