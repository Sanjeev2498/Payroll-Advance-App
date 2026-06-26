import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UserManagementController } from './controllers/user-management.controller';
import { UserManagementService } from './services/user-management.service';
import { UserRepository } from './repositories/user.repository';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { PrismaModule } from '../prisma/prisma.module';
import { CommonModule } from '../common/common.module';
import { RbacModule } from './rbac/rbac.module';

@Module({
  imports: [
    PrismaModule,
    CommonModule, // For TenantContextService
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
  controllers: [AuthController, UserManagementController],
  providers: [
    AuthService,
    UserManagementService,
    UserRepository,
    JwtStrategy,
    LocalStrategy,
  ],
  exports: [
    AuthService,
    UserManagementService,
    UserRepository,
    JwtModule,
    PassportModule,
    RbacModule,
  ],
})
export class AuthModule {}