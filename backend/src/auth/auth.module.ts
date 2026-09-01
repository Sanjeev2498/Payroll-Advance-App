import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UserManagementController } from './controllers/user-management.controller';
import { UserManagementService } from './services/user-management.service';
// import { ClientUserTestController } from './controllers/client-user-test.controller'; // TODO: Fix architectural issue  
// import { ClientUserDemoController } from './controllers/client-user-demo.controller'; // TODO: Fix architectural issue
// import { ClientUserManagementController } from './controllers/client-user-management.controller'; // TODO: Fix architectural issue
// import { ClientUserAuthController } from './controllers/client-user-auth.controller'; // TODO: Fix architectural issue
// import { ClientUserAuthService } from './services/client-user-auth.service'; // TODO: Fix architectural issue
// import { ClientUserManagementService } from './services/client-user-management.service'; // TODO: Fix architectural issue
// import { ClientUserRepository } from '../common/repositories/client-user.repository'; // TODO: Fix architectural issue
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
    // ClientUserTestController, // TODO: Fix - depends on non-existent ClientUser table
    // ClientUserDemoController, // TODO: Fix - depends on non-existent ClientUser table  
    // ClientUserManagementController, // TODO: Fix - depends on non-existent ClientUser table
    // ClientUserAuthController, // TODO: Fix - depends on non-existent ClientUser table
  ],
  providers: [
    AuthService, 
    UserManagementService,
    // ClientUserAuthService, // TODO: Fix - depends on non-existent ClientUser table
    // ClientUserManagementService, // TODO: Fix - depends on non-existent ClientUser table
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
