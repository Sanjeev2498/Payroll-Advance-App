import { Module } from '@nestjs/common';
import { EmployeesService } from './employees.service';
import { EmployeesController } from './employees.controller';
import { EmployeeRepository } from '../common/repositories/employee.repository';
import { PrismaModule } from '../prisma/prisma.module';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [PrismaModule, CommonModule],
  controllers: [EmployeesController],
  providers: [EmployeesService, EmployeeRepository],
  exports: [EmployeesService, EmployeeRepository],
})
export class EmployeesModule {}