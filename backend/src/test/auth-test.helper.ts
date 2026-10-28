import { JwtService } from '@nestjs/jwt';
import { ExecutionContext } from '@nestjs/common';
import { TenantContextService } from '../common/tenant-context.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload, AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';

/**
 * Authentication Test Helper for Phase 3 Security Guard Tests
 * Provides comprehensive JWT mocking and authentication setup for tests
 */
export class AuthTestHelper {
  static createMockJwtPayload(overrides?: Partial<JwtPayload>): JwtPayload {
    return {
      sub: 'test-user-id-123',
      email: 'test@demosecurity.co.in', 
      type: 'access',
      companyId: 'test-tenant-id-456',
      role: 'COMPANY_ADMIN',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
      ...overrides,
    };
  }

  static createMockAuthenticatedUser(overrides?: Partial<AuthenticatedUser>): AuthenticatedUser {
    return {
      id: 'test-user-id-123',
      email: 'test@demosecurity.co.in',
      firstName: 'Test',
      lastName: 'User',
      role: 'COMPANY_ADMIN',
      companyId: 'test-tenant-id-456',
      isActive: true,
      userType: 'company_user',
      ...overrides,
    };
  }

  /**
   * Create a properly configured JWT token for testing
   */
  static async createTestJwtToken(jwtService: JwtService, payload?: Partial<JwtPayload>): Promise<string> {
    const fullPayload = this.createMockJwtPayload(payload);
    return jwtService.sign(fullPayload);
  }

  /**
   * Mock ExecutionContext for guard testing
   */
  static createMockExecutionContext(user?: AuthenticatedUser, isPublic = false): ExecutionContext {
    const mockUser = user || this.createMockAuthenticatedUser();
    
    const mockRequest = {
      user: mockUser,
      headers: {
        authorization: 'Bearer mock-jwt-token',
      },
    };

    const mockHandler = {
      name: isPublic ? 'publicEndpoint' : 'protectedEndpoint',
    };

    const mockClass = {
      name: 'TestController',
    };

    return {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
        getResponse: () => ({}),
      }),
      getHandler: () => mockHandler,
      getClass: () => mockClass,
    } as ExecutionContext;
  }

  /**
   * Setup authentication mocks for test module
   */
  static setupAuthMocks() {
    // Mock JWT Strategy validation
    jest.mock('../auth/strategies/jwt.strategy', () => ({
      JwtStrategy: jest.fn().mockImplementation(() => ({
        validate: jest.fn().mockResolvedValue(AuthTestHelper.createMockAuthenticatedUser()),
      })),
    }));

    // Mock AuthGuard from @nestjs/passport
    jest.mock('@nestjs/passport', () => ({
      ...jest.requireActual('@nestjs/passport'),
      AuthGuard: jest.fn().mockImplementation((strategy) => {
        return class MockAuthGuard {
          canActivate = jest.fn().mockImplementation((context: ExecutionContext) => {
            // Simulate successful authentication
            const request = context.switchToHttp().getRequest();
            request.user = AuthTestHelper.createMockAuthenticatedUser();
            return true;
          });
        };
      }),
    }));
  }

  /**
   * Setup tenant context for testing
   */
  static setupTenantContextMock(tenantContextService: TenantContextService) {
    jest.spyOn(tenantContextService, 'hasContext').mockReturnValue(true);
    jest.spyOn(tenantContextService, 'getTenantId').mockReturnValue('test-tenant-id-456');
    jest.spyOn(tenantContextService, 'getUserId').mockReturnValue('test-user-id-123');
    jest.spyOn(tenantContextService, 'getUserRole').mockReturnValue('COMPANY_ADMIN');
    jest.spyOn(tenantContextService, 'isAdmin').mockReturnValue(true);
    jest.spyOn(tenantContextService, 'setContext').mockImplementation(() => {});
    jest.spyOn(tenantContextService, 'clearContext').mockImplementation(() => {});
  }

  /**
   * Setup Prisma mocks for authentication tests
   */
  static setupPrismaMocks(prismaService: PrismaService) {
    jest.spyOn(prismaService, 'setTenantContext').mockResolvedValue(undefined);
    jest.spyOn(prismaService, 'clearTenantContext').mockResolvedValue(undefined);
    
    // Mock user lookup for JWT strategy
    jest.spyOn(prismaService.user, 'findFirst').mockResolvedValue({
      id: 'test-user-id-123',
      email: 'test@demosecurity.co.in',
      is_active: true,
      role: 'COMPANY_ADMIN',
      company_id: 'test-tenant-id-456',
      companies: {
        id: 'test-tenant-id-456',
        name: 'Test Security Company',
        slug: 'test-security',
      },
    } as any);
  }

  /**
   * Create a complete auth module for testing
   */
  static async createTestAuthModule(): Promise<any> {
    const { Test } = await import('@nestjs/testing');
    const { JwtModule } = await import('@nestjs/jwt');
    const { PassportModule } = await import('@nestjs/passport');
    const { ConfigModule } = await import('@nestjs/config');

    return Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.register({
          secret: 'test-jwt-secret-key-for-phase-3',
          signOptions: { expiresIn: '1h' },
        }),
      ],
    });
  }
}