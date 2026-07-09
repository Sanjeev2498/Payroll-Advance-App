import { Module } from '@nestjs/common';
import { EmployeesService } from './employees.service';
import { EmployeesController } from './employees.controller';
import { EmployeePortalController } from './employee-portal.controller';
import { EmployeePortalService } from './employee-portal.service';
import { EmployeeRepository } from '../common/repositories/employee.repository';
import { PrismaModule } from '../prisma/prisma.module';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [PrismaModule, CommonModule],
  controllers: [EmployeesController, EmployeePortalController],
  providers: [EmployeesService, EmployeePortalService, EmployeeRepository],
  exports: [EmployeesService, EmployeePortalService, EmployeeRepository],
})
export class EmployeesModule {}
