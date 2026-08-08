import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UserManagementController } from './controllers/user-management.controller';
import { UserManagementService } from './services/user-management.service';
import { ClientUserTestController } from './controllers/client-user-test.controller';
import { ClientUserDemoController } from './controllers/client-user-demo.controller';
import { ClientUserManagementController } from './controllers/client-user-management.controller';
import { ClientUserAuthController } from './controllers/client-user-auth.controller';
import { ClientUserAuthService } from './services/client-user-auth.service';
import { ClientUserManagementService } from './services/client-user-management.service';
import { ClientUserRepository } from '../common/repositories/client-user.repository';
import { UserRepository } from './repositories/user.repository';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { PrismaModule } from '../prisma/prisma.module';
import { CommonModule } from '../common/common.module';
import { RbacModule } from './rbac/rbac.module';

@Module({
  imports: [
    PrismaModule,
    CommonModule, // For TenantContextService and repositories
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: '15m',
        },
      }),
      inject: [ConfigService],
    }),
    RbacModule, // Add RBAC module
  ],
  controllers: [
    AuthController, 
    UserManagementController,
    ClientUserTestController,
    ClientUserDemoController,
    ClientUserManagementController,
    ClientUserAuthController,
  ],
  providers: [
    AuthService, 
    UserManagementService,
    ClientUserAuthService,
    ClientUserManagementService,
    UserRepository,
    JwtStrategy, 
    LocalStrategy,
    JwtAuthGuard,
  ],
  exports: [
    AuthService,
    UserManagementService,
    UserRepository,
    JwtModule,
    PassportModule,
    RbacModule,
    JwtAuthGuard, // Export JwtAuthGuard
  ],
})
export class AuthModule {}
