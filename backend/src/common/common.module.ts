import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
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
import { ClientUserRepository } from './repositories/client-user.repository';
import { ContractRepository } from './repositories/contract.repository';
import { GlobalExceptionFilter } from './filters/global-exception.filter';
import { ValidationExceptionFilter } from './filters/validation-exception.filter';
import { ResponseTransformInterceptor } from './interceptors/response-transform.interceptor';
import { LoggingInterceptor } from './interceptors/logging.interceptor';
import { RateLimitGuard } from './guards/rate-limit.guard';

@Global()
@Module({
  imports: [
    PrismaModule,
    ConfigModule,
  ],
  providers: [
    ConfigService,
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
    ClientUserRepository,
    ContractRepository,
    RateLimitGuard,
    // Global exception filters (order matters - most specific first)
    {
      provide: APP_FILTER,
      useClass: ValidationExceptionFilter,
    },
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
    // Global interceptors
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseTransformInterceptor,
    },
  ],
  exports: [
    ConfigService,
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
    ClientUserRepository,
    ContractRepository,
    RateLimitGuard,
  ],
})
export class CommonModule {}
