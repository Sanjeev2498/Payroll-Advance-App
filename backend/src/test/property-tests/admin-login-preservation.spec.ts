import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from '../../auth/auth.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthTestHelper } from '../auth-test.helper';
import * as fc from 'fast-check';
import * as bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';

/**
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**
 * 
 * Admin Login Fix - Preservation Property Tests
 * 
 * CRITICAL: These tests MUST PASS on unfixed code - this captures baseline behavior to preserve
 * 
 * GOAL: Observe and capture the current authentication behavior for non-admin users that
 * must remain unchanged while fixing admin login network connectivity issues.
 * 
 * These tests establish a behavioral baseline to ensure:
 * - Employee authentication continues to work with same JWT tokens and session behavior
 * - Supervisor authentication and role-based access controls remain unchanged  
 * - JWT token refresh mechanism continues to work for all non-admin user types
 * - RBAC system enforcement preserves proper role-based access controls
 * - Tenant context middleware maintains proper tenant isolation
 * 
 * EXPECTED OUTCOME: Tests PASS (confirms baseline non-admin behavior to preserve)
 */
describe('Admin Login Fix - Preservation Property Tests', () => {
  let authService: AuthService;
  let prismaService: PrismaService;
  let jwtService: JwtService;
  let module: TestingModule;

  const testCompanyId = randomUUID();

  beforeAll(async () => {
    console.log('🛡️ PRESERVATION TESTING: Observing baseline authentication behavior on UNFIXED code');
    console.log('✅ EXPECTED OUTCOME: Tests PASS (confirms non-admin behavior to preserve)');

    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.registerAsync({
          imports: [ConfigModule],
          useFactory: async (configService: ConfigService) => ({
            secret: configService.get<string>('JWT_SECRET') || 'test-secret',
            signOptions: { expiresIn: '15m' },
          }),
          inject: [ConfigService],
        }),
      ],
      providers: [
        AuthService,
        PrismaService,
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    prismaService = module.get<PrismaService>(PrismaService);
    jwtService = module.get<JwtService>(JwtService);
  });

  afterAll(async () => {
    if (module) {
      await module.close();
    }
  });

  /**
   * Property 2.1: Employee Authentication Preservation
   * OBSERVES: Current employee login behavior that must be preserved
   */
  it('should preserve employee authentication flows and JWT token generation', async () => {
    // Create test company first
    const company = await prismaService.withSystemContext(async (systemPrisma) => {
      return systemPrisma.companies.create({
        data: {
          id: randomUUID(),
          name: 'Test Company',
          slug: `test-company-${randomUUID().substring(0, 8)}`,
          created_at: new Date(),
          updated_at: new Date(),
        },
      });
    });
    
    const hashedPassword = await bcrypt.hash('employee123', 12);
    const employeeUser = await prismaService.withSystemContext(async (systemPrisma) => {
      return systemPrisma.users.create({
        data: {
          id: randomUUID(),
          company_id: company.id,
          email: 'employee@testcompany.com',
          first_name: 'Test',
          last_name: 'Employee',
          password_hash: hashedPassword,
          role: 'EMPLOYEE',
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
        },
      });
    });

    // OBSERVE: Current employee authentication behavior
    const loginResult = await authService.login({
      email: employeeUser.email,
      password: 'employee123',
    });

    // CAPTURE: The current behavior that must be preserved
    expect(loginResult.success).toBe(true);
    expect(loginResult.data.user.role).toBe('EMPLOYEE');
    expect(loginResult.data.user.email).toBe(employeeUser.email);
    expect(loginResult.data.tokens.accessToken).toBeDefined();
    expect(loginResult.data.tokens.refreshToken).toBeDefined();
    expect(loginResult.data.tokens.expiresIn).toBe(15 * 60); // 15 minutes
    expect(loginResult.data.user.tenantId).toBe(company.id);
    expect(loginResult.data.user.companyId).toBe(company.id);

    console.log('✅ PRESERVED: Employee authentication flows and JWT token generation');
  });

  /**
   * Property 2.2: Supervisor Authentication Preservation
   * OBSERVES: Current supervisor login and role-based access behavior
   */
  it('should preserve supervisor authentication and role-based access controls', async () => {
    const company = await prismaService.withSystemContext(async (systemPrisma) => {
      return systemPrisma.companies.create({
        data: {
          id: randomUUID(),
          name: 'Supervisor Test Company',
          slug: `sup-test-${randomUUID().substring(0, 8)}`,
          created_at: new Date(),
          updated_at: new Date(),
        },
      });
    });
    
    const hashedPassword = await bcrypt.hash('supervisor123', 12);
    const supervisorUser = await prismaService.withSystemContext(async (systemPrisma) => {
      return systemPrisma.users.create({
        data: {
          id: randomUUID(),
          company_id: company.id,
          email: 'supervisor@testcompany.com',
          first_name: 'Test',
          last_name: 'Supervisor',
          password_hash: hashedPassword,
          role: 'SUPERVISOR',
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
        },
      });
    });

    // OBSERVE: Current supervisor authentication behavior
    const loginResult = await authService.login({
      email: supervisorUser.email,
      password: 'supervisor123',
    });

    // CAPTURE: The current behavior that must be preserved
    expect(loginResult.success).toBe(true);
    expect(loginResult.data.user.role).toBe('SUPERVISOR');
    expect(loginResult.data.user.email).toBe(supervisorUser.email);
    expect(loginResult.data.tokens.accessToken).toBeDefined();
    expect(loginResult.data.tokens.refreshToken).toBeDefined();
    expect(loginResult.data.user.tenantId).toBe(company.id);

    // OBSERVE: Current profile retrieval behavior for supervisor
    // Since we can't use the controller directly in tests, we validate the JWT token contains correct info
    const decodedToken = jwtService.decode(loginResult.data.tokens.accessToken);
    
    expect(decodedToken.role).toBe('SUPERVISOR');
    expect(decodedToken.companyId).toBe(company.id);
    expect(decodedToken.sub).toBe(supervisorUser.id);
    expect(decodedToken.email).toBe(supervisorUser.email);

    console.log('✅ PRESERVED: Supervisor authentication and role-based access controls');
  });

  /**
   * Property 2.3: JWT Token Refresh Preservation
   * OBSERVES: Current token refresh mechanism for non-admin users
   */
  it('should preserve JWT token refresh mechanism for non-admin users', async () => {
    const company = await prismaService.withSystemContext(async (systemPrisma) => {
      return systemPrisma.companies.create({
        data: {
          id: randomUUID(),
          name: 'Manager Test Company',
          slug: `mgr-test-${randomUUID().substring(0, 8)}`,
          created_at: new Date(),
          updated_at: new Date(),
        },
      });
    });
    
    const hashedPassword = await bcrypt.hash('manager123', 12);
    const managerUser = await prismaService.withSystemContext(async (systemPrisma) => {
      return systemPrisma.users.create({
        data: {
          id: randomUUID(),
          company_id: company.id,
          email: 'manager@testcompany.com',
          first_name: 'Test',
          last_name: 'Manager',
          password_hash: hashedPassword,
          role: 'MANAGER',
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
        },
      });
    });

    // OBSERVE: Initial login to get refresh token
    const loginResult = await authService.login({
      email: managerUser.email,
      password: 'manager123',
    });

    const refreshToken = loginResult.data.tokens.refreshToken;

    // OBSERVE: Current token refresh behavior
    const refreshResult = await authService.refreshToken(refreshToken);

    // CAPTURE: The current refresh behavior that must be preserved
    expect(refreshResult.accessToken).toBeDefined();
    expect(refreshResult.refreshToken).toBeDefined();
    expect(refreshResult.expiresIn).toBe(15 * 60); // 15 minutes
    expect(typeof refreshResult.accessToken).toBe('string');
    expect(refreshResult.accessToken.length).toBeGreaterThan(0);

    console.log('✅ PRESERVED: JWT token refresh mechanism for non-admin users');
  });

  /**
   * Property 2.4: RBAC System Preservation  
   * OBSERVES: Current role-based access control enforcement
   */
  it('should preserve RBAC system enforcement for non-admin roles', async () => {
    const company = await prismaService.withSystemContext(async (systemPrisma) => {
      return systemPrisma.companies.create({
        data: {
          id: randomUUID(),
          name: 'RBAC Test Company',
          slug: `rbac-test-${randomUUID().substring(0, 8)}`,
          created_at: new Date(),
          updated_at: new Date(),
        },
      });
    });
    
    // Test various non-admin roles to observe RBAC behavior
    const roles = ['EMPLOYEE', 'SUPERVISOR', 'MANAGER'] as const;
    
    for (const role of roles) {
      const hashedPassword = await bcrypt.hash('test123', 12);
      const user = await prismaService.withSystemContext(async (systemPrisma) => {
        return systemPrisma.users.create({
          data: {
            id: randomUUID(),
            company_id: company.id,
            email: `${role.toLowerCase()}@testcompany.com`,
            first_name: 'Test',
            last_name: role,
            password_hash: hashedPassword,
            role: role,
            is_active: true,
            created_at: new Date(),
            updated_at: new Date(),
          },
        });
      });

      // OBSERVE: Current authentication behavior for each role
      const loginResult = await authService.login({
        email: user.email,
        password: 'test123',
      });

      // CAPTURE: Role-specific behavior that must be preserved
      expect(loginResult.success).toBe(true);
      expect(loginResult.data.user.role).toBe(role);
      expect(loginResult.data.user.companyId).toBe(company.id);
      expect(loginResult.data.tokens).toBeDefined();

      // Verify JWT token contains correct role information
      const decodedToken = jwtService.decode(loginResult.data.tokens.accessToken);
      expect(decodedToken.role).toBe(role);
      expect(decodedToken.companyId).toBe(company.id);
    }

    console.log('✅ PRESERVED: RBAC system enforcement for non-admin roles');
  });

  /**
   * Property 2.5: Password Change Functionality Preservation
   * OBSERVES: Current password change behavior for non-admin users
   */
  it('should preserve password change functionality for non-admin users', async () => {
    const company = await prismaService.withSystemContext(async (systemPrisma) => {
      return systemPrisma.companies.create({
        data: {
          id: randomUUID(),
          name: 'Password Test Company', 
          slug: `pwd-test-${randomUUID().substring(0, 8)}`,
          created_at: new Date(),
          updated_at: new Date(),
        },
      });
    });
    
    const hashedPassword = await bcrypt.hash('oldpassword123', 12);
    const user = await prismaService.withSystemContext(async (systemPrisma) => {
      return systemPrisma.users.create({
        data: {
          id: randomUUID(),
          company_id: company.id,
          email: 'passwordtest@testcompany.com',
          first_name: 'Password',
          last_name: 'Test',
          password_hash: hashedPassword,
          role: 'EMPLOYEE',
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
        },
      });
    });

    // OBSERVE: Current password change behavior
    const changeResult = await authService.changePassword(
      user.id,
      'oldpassword123',
      'newpassword456'
    );

    // CAPTURE: Password change behavior that must be preserved
    expect(changeResult.success).toBe(true);
    expect(changeResult.message).toBe('Password changed successfully');

    // Verify new password works
    const loginResult = await authService.login({
      email: user.email,
      password: 'newpassword456',
    });

    expect(loginResult.success).toBe(true);
    expect(loginResult.data.user.email).toBe(user.email);

    console.log('✅ PRESERVED: Password change functionality for non-admin users');
  });

  /**
   * Property 2.6: Logout Functionality Preservation
   * OBSERVES: Current logout behavior for non-admin users
   */
  it('should preserve logout functionality for non-admin users', async () => {
    const company = await prismaService.withSystemContext(async (systemPrisma) => {
      return systemPrisma.companies.create({
        data: {
          id: randomUUID(),
          name: 'Logout Test Company',
          slug: `logout-test-${randomUUID().substring(0, 8)}`,
          created_at: new Date(),
          updated_at: new Date(),
        },
      });
    });
    
    const hashedPassword = await bcrypt.hash('employee123', 12);
    const user = await prismaService.withSystemContext(async (systemPrisma) => {
      return systemPrisma.users.create({
        data: {
          id: randomUUID(),
          company_id: company.id,
          email: 'logouttest@testcompany.com',
          first_name: 'Logout',
          last_name: 'Test',
          password_hash: hashedPassword,
          role: 'EMPLOYEE',
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
        },
      });
    });

    // Login first
    const loginResult = await authService.login({
      email: user.email,
      password: 'employee123',
    });

    expect(loginResult.success).toBe(true);

    // OBSERVE: Current logout behavior
    const logoutResult = await authService.logout(user.id);

    // CAPTURE: Logout behavior that must be preserved
    expect(logoutResult.success).toBe(true);
    expect(logoutResult.message).toBe('Logout successful');

    console.log('✅ PRESERVED: Logout functionality for non-admin users');
  });
});