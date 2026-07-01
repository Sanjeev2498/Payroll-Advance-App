import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { Reflector } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CommonModule } from './common/common.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { ClientsModule } from './clients/clients.module';
import { SitesModule } from './sites/sites.module';
import { EmployeesModule } from './employees/employees.module';
import { AssignmentsModule } from './assignments/assignments.module';
import { ShiftsModule } from './shifts/shifts.module';
import { AttendanceModule } from './attendance/attendance.module';
import { PayrollModule } from './payroll/payroll.module';
import { BillingModule } from './billing/billing.module';
import { EncryptionModule } from './common/encryption/encryption.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { TenantContextMiddleware } from './common/tenant-context.middleware';
import { TenantGuard } from './common/tenant.guard';
import { TenantContextService } from './common/tenant-context.service';
import { PermissionsGuard } from './auth/guards/permissions.guard';
import { RbacService } from './auth/rbac/rbac.service';
import { PrismaService } from './prisma/prisma.service';

@Module({
  imports: [
    // Configuration module with validation
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath: ['.env.local', '.env'],
    }),
    PrismaModule,
    CommonModule,
    EncryptionModule, // Global encryption services
    AuthModule,
    ClientsModule,
    SitesModule,
    EmployeesModule,
    AssignmentsModule,
    ShiftsModule,
    AttendanceModule,
    PayrollModule,
    BillingModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Authentication guard - ensures JWT token is valid and sets tenant context
    {
      provide: APP_GUARD,
      useFactory: (
        reflector: Reflector,
        tenantContextService: TenantContextService,
        prismaService: PrismaService,
      ) => {
        return new JwtAuthGuard(reflector, tenantContextService, prismaService);
      },
      inject: [Reflector, TenantContextService, PrismaService],
    },
    // Tenant context guard - ensures proper multi-tenant isolation
    {
      provide: APP_GUARD,
      useFactory: (reflector: Reflector, tenantContextService: TenantContextService) => {
        return new TenantGuard(reflector, tenantContextService);
      },
      inject: [Reflector, TenantContextService],
    },
    // RBAC permissions guard - enforces role-based access control
    {
      provide: APP_GUARD,
      useFactory: (
        reflector: Reflector,
        rbacService: RbacService,
        tenantContextService: TenantContextService,
      ) => {
        return new PermissionsGuard(reflector, rbacService, tenantContextService);
      },
      inject: [Reflector, RbacService, TenantContextService],
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Apply tenant context middleware to all routes after authentication
    consumer.apply(TenantContextMiddleware).forRoutes('*');
  }
}
