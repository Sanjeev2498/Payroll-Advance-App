import { Module, Global } from '@nestjs/common';
import { TenantContextService } from './tenant-context.service';
import { TenantContextMiddleware } from './tenant-context.middleware';
import { TenantGuard } from './tenant.guard';
import { PrismaModule } from '../prisma/prisma.module';
import { EncryptionUtil } from './utils/encryption.util';
import { DataTransformService } from './services/data-transform.service';
import { ClientRepository } from './repositories/client.repository';
import { SiteRepository } from './repositories/site.repository';
import { AttendanceRepository } from './repositories/attendance.repository';
import { EmployeeRepository } from './repositories/employee.repository';
import { AssignmentRepository } from './repositories/assignment.repository';
import { ShiftRepository } from './repositories/shift.repository';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [
    TenantContextService, 
    TenantContextMiddleware, 
    TenantGuard,
    EncryptionUtil,
    DataTransformService,
    ClientRepository,
    SiteRepository,
    AttendanceRepository,
    EmployeeRepository,
    AssignmentRepository,
    ShiftRepository,
  ],
  exports: [
    TenantContextService, 
    TenantContextMiddleware, 
    TenantGuard,
    EncryptionUtil,
    DataTransformService,
    ClientRepository,
    SiteRepository,
    AttendanceRepository,
    EmployeeRepository,
    AssignmentRepository,
    ShiftRepository,
  ],
})
export class CommonModule {}
