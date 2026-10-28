import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { APP_GUARD } from '@nestjs/core';
import { MockJwtAuthGuard, MockTenantGuard, MockPermissionsGuard } from './guard-mocks';
import { AuthTestHelper } from './auth-test.helper';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from '../common/tenant-context.service';
import { CommonModule } from '../common/common.module';
import { PrismaModule } from '../prisma/prisma.module';

/**
 * Test Module Factory for Phase 3 Security Guard Testing
 * Creates properly configured test modules with authentication enabled
 */
export class TestModuleFactory {
  /**
   * Create test module with authentication guards enabled (Phase 3 configuration)
   */
  static async createWithAuthGuards(additionalProviders: any[] = []): Promise<TestingModule> {
    const moduleBuilder = Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        PrismaModule,
        CommonModule,
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.register({
          secret: 'test-jwt-secret-key-for-phase-3',
          signOptions: { expiresIn: '1h' },
        }),
      ],
      providers: [
        // Mock security guards (Phase 3 - enabled but mocked for tests)
        {
          provide: APP_GUARD,
          useClass: MockJwtAuthGuard,
        },
        {
          provide: APP_GUARD,
          useClass: MockTenantGuard,
        },
        {
          provide: APP_GUARD,
          useClass: MockPermissionsGuard,
        },
        ...additionalProviders,
      ],
    });

    const module = await moduleBuilder.compile();
    
    // Setup authentication and tenant context mocks
    const tenantContextService = module.get<TenantContextService>(TenantContextService);
    const prismaService = module.get<PrismaService>(PrismaService);
    
    AuthTestHelper.setupTenantContextMock(tenantContextService);
    AuthTestHelper.setupPrismaMocks(prismaService);
    
    return module;
  }

  /**
   * Create test module without authentication guards (current working configuration)
   */
  static async createWithoutAuthGuards(additionalProviders: any[] = []): Promise<TestingModule> {
    return Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        PrismaModule,
        CommonModule,
      ],
      providers: [
        ...additionalProviders,
      ],
    }).compile();
  }

  /**
   * Create test module with selective guard configuration (for transition testing)
   */
  static async createWithSelectiveGuards(
    enableJwt: boolean = true,
    enableTenant: boolean = true, 
    enablePermissions: boolean = true,
    additionalProviders: any[] = []
  ): Promise<TestingModule> {
    const guards = [];
    
    if (enableJwt) {
      guards.push({
        provide: APP_GUARD,
        useClass: MockJwtAuthGuard,
      });
    }
    
    if (enableTenant) {
      guards.push({
        provide: APP_GUARD,
        useClass: MockTenantGuard,
      });
    }
    
    if (enablePermissions) {
      guards.push({
        provide: APP_GUARD,
        useClass: MockPermissionsGuard,
      });
    }

    const module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        PrismaModule,
        CommonModule,
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.register({
          secret: 'test-jwt-secret-key-for-phase-3',
          signOptions: { expiresIn: '1h' },
        }),
      ],
      providers: [
        ...guards,
        ...additionalProviders,
      ],
    }).compile();

    // Setup mocks if guards are enabled
    if (enableJwt || enableTenant) {
      const tenantContextService = module.get<TenantContextService>(TenantContextService);
      const prismaService = module.get<PrismaService>(PrismaService);
      
      AuthTestHelper.setupTenantContextMock(tenantContextService);
      AuthTestHelper.setupPrismaMocks(prismaService);
    }

    return module;
  }

  /**
   * Create JWT token for integration tests
   */
  static async createTestJwtToken(module: TestingModule, payload?: any): Promise<string> {
    const jwtService = module.get<JwtService>(JwtService);
    return AuthTestHelper.createTestJwtToken(jwtService, payload);
  }
}