import { Module } from '@nestjs/common';
import { AssignmentsService } from './assignments.service';
import { AssignmentsController } from './assignments.controller';
import { AssignmentRepository } from '../common/repositories/assignment.repository';
import { PrismaModule } from '../prisma/prisma.module';
import { CommonModule } from '../common/common.module';
import { EmployeesModule } from '../employees/employees.module';
import { SitesModule } from '../sites/sites.module';

@Module({
  imports: [PrismaModule, CommonModule, EmployeesModule, SitesModule],
  controllers: [AssignmentsController],
  providers: [AssignmentsService, AssignmentRepository],
  exports: [AssignmentsService, AssignmentRepository],
})
export class AssignmentsModule {}
