import { Module } from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { AttendanceController } from './attendance.controller';
import { AttendanceRepository } from '../common/repositories/attendance.repository';
import { PrismaModule } from '../prisma/prisma.module';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [PrismaModule, CommonModule],
  controllers: [AttendanceController],
  providers: [AttendanceService, AttendanceRepository],
  exports: [AttendanceService, AttendanceRepository],
})
export class AttendanceModule {}