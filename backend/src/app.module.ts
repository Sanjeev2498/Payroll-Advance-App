import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CommonModule } from './common/common.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { TenantContextMiddleware } from './common/tenant-context.middleware';
import { TenantGuard } from './common/tenant.guard';
import { PermissionsGuard } from './auth/guards/permissions.guard';

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
    AuthModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Authentication guard - ensures JWT token is valid
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    // Tenant context guard - ensures proper multi-tenant isolation
    {
      provide: APP_GUARD,
      useClass: TenantGuard,
    },
    // RBAC permissions guard - enforces role-based access control
    {
      provide: APP_GUARD,
      useClass: PermissionsGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Apply tenant context middleware to all routes after authentication
    consumer
      .apply(TenantContextMiddleware)
      .forRoutes('*');
  }
}