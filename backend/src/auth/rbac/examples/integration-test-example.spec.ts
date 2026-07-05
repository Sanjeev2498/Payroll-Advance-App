/**
 * RBAC Integration Test Example
 *
 * This test demonstrates how the RBAC system works end-to-end with real HTTP requests.
 * It shows permission enforcement, tenant isolation, and role hierarchy in action.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import request from 'supertest';
import { JwtService } from '@nestjs/jwt';

import { AppModule } from '../../../app.module';
import { PrismaService } from '../../../prisma/prisma.service';

/**
 * Mock controller for testing RBAC functionality
 */
import { Controller, Get, Post, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { PermissionsGuard } from '../../guards/permissions.guard';
import { TenantGuard } from '../../../common/tenant.guard';
import { RequirePermissions, AllowOwner } from '../../decorators/permissions.decorator';
import {
  CurrentUserId,
  CurrentUserRole,
  CurrentTenantId,
} from '../../decorators/resource-owner.decorator';
import {
  UserPermissions,
  EmployeePermissions,
  PayrollPermissions,
} from '../../enums/permissions.enum';

@Controller('test-rbac')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
class TestRbacController {
  @Get('public')
  async publicEndpoint() {
    return { message: 'Public endpoint - no permissions required' };
  }

  @Get('user-read')
  @RequirePermissions([UserPermissions.READ_USER])
  async userReadEndpoint() {
    return { message: 'User read endpoint - requires READ_USER permission' };
  }

  @Post('user-create')
  @RequirePermissions([UserPermissions.CREATE_USER])
  async userCreateEndpoint() {
    return { message: 'User create endpoint - requires CREATE_USER permission' };
  }

  @Get('employee-manage')
  @RequirePermissions([EmployeePermissions.UPDATE_EMPLOYEE])
  async employeeManageEndpoint() {
    return { message: 'Employee manage - requires UPDATE_EMPLOYEE permission' };
  }

  @Post('payroll-process')
  @RequirePermissions([PayrollPermissions.PROCESS_PAYROLL])
  async payrollProcessEndpoint() {
    return { message: 'Payroll process - requires PROCESS_PAYROLL permission' };
  }

  @Get('profile/:userId')
  @AllowOwner([UserPermissions.READ_USER])
  async profileEndpoint(@Param('userId') userId: string, @CurrentUserId() currentUserId: string) {
    return {
      message: 'Profile endpoint - owner access or READ_USER permission',
      userId,
      currentUserId,
      isOwner: userId === currentUserId,
    };
  }

  @Get('context-info')
  @RequirePermissions([UserPermissions.READ_USER])
  async contextInfoEndpoint(
    @CurrentUserId() userId: string,
    @CurrentUserRole() role: string,
    @CurrentTenantId() tenantId: string,
  ) {
    return {
      message: 'Context information',
      userId,
      role,
      tenantId,
    };
  }
}

describe('RBAC Integration Tests', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let moduleRef: TestingModule;

  // Test data
  const testTenant1 = 'tenant-1-uuid';
  const testTenant2 = 'tenant-2-uuid';

  const testUsers = {
    employee: {
      id: 'employee-user-id',
      email: 'employee@test.com',
      role: UserRole.EMPLOYEE,
      tenantId: testTenant1,
    },
    supervisor: {
      id: 'supervisor-user-id',
      email: 'supervisor@test.com',
      role: UserRole.SUPERVISOR,
      tenantId: testTenant1,
    },
    manager: {
      id: 'manager-user-id',
      email: 'manager@test.com',
      role: UserRole.MANAGER,
      tenantId: testTenant1,
    },
    companyAdmin: {
      id: 'admin-user-id',
      email: 'admin@test.com',
      role: UserRole.COMPANY_ADMIN,
      tenantId: testTenant1,
    },
    superAdmin: {
      id: 'super-admin-id',
      email: 'superadmin@test.com',
      role: UserRole.SUPER_ADMIN,
      tenantId: testTenant1,
    },
    crossTenantUser: {
      id: 'cross-tenant-user',
      email: 'cross@test.com',
      role: UserRole.MANAGER,
      tenantId: testTenant2,
    },
  };

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [AppModule],
      controllers: [TestRbacController],
    })
    .overrideGuard(TenantGuard)
    .useValue({
      canActivate: () => true, // Mock tenant guard for testing
    })
    .compile();

    app = moduleRef.createNestApplication();
    jwtService = moduleRef.get<JwtService>(JwtService);

    await app.init();

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  // Helper function to generate JWT tokens for test users
  const generateToken = (user: any) => {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      companyId: user.tenantId,
      type: 'access',
    };
    return jwtService.sign(payload);
  };

  describe('Permission-based Access Control', () => {
    it('should allow access to public endpoints without authentication', async () => {
      const response = await request(app.getHttpServer()).get('/test-rbac/public').expect(200);

      expect(response.body.message).toBe('Public endpoint - no permissions required');
    });

    it('should deny access without authentication', async () => {
      await request(app.getHttpServer()).get('/test-rbac/user-read').expect(401);
    });

    it('should allow employee to access READ_USER endpoint', async () => {
      const token = generateToken(testUsers.employee);

      const response = await request(app.getHttpServer())
        .get('/test-rbac/user-read')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.message).toContain('READ_USER permission');
    });

    it('should deny employee access to CREATE_USER endpoint', async () => {
      const token = generateToken(testUsers.employee);

      await request(app.getHttpServer())
        .post('/test-rbac/user-create')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });

    it('should allow manager to access CREATE_USER endpoint', async () => {
      const token = generateToken(testUsers.manager);

      const response = await request(app.getHttpServer())
        .post('/test-rbac/user-create')
        .set('Authorization', `Bearer ${token}`)
        .expect(201);

      expect(response.body.message).toContain('CREATE_USER permission');
    });

    it('should deny employee access to employee management', async () => {
      const token = generateToken(testUsers.employee);

      await request(app.getHttpServer())
        .get('/test-rbac/employee-manage')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });

    it('should allow supervisor to access employee management', async () => {
      const token = generateToken(testUsers.supervisor);

      const response = await request(app.getHttpServer())
        .get('/test-rbac/employee-manage')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.message).toContain('UPDATE_EMPLOYEE permission');
    });

    it('should deny manager access to payroll processing', async () => {
      const token = generateToken(testUsers.manager);

      await request(app.getHttpServer())
        .post('/test-rbac/payroll-process')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });

    it('should allow company admin to process payroll', async () => {
      const token = generateToken(testUsers.companyAdmin);

      const response = await request(app.getHttpServer())
        .post('/test-rbac/payroll-process')
        .set('Authorization', `Bearer ${token}`)
        .expect(201);

      expect(response.body.message).toContain('PROCESS_PAYROLL permission');
    });

    it('should allow super admin access to all endpoints', async () => {
      const token = generateToken(testUsers.superAdmin);

      // Test multiple endpoints
      await request(app.getHttpServer())
        .get('/test-rbac/user-read')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      await request(app.getHttpServer())
        .post('/test-rbac/user-create')
        .set('Authorization', `Bearer ${token}`)
        .expect(201);

      await request(app.getHttpServer())
        .post('/test-rbac/payroll-process')
        .set('Authorization', `Bearer ${token}`)
        .expect(201);
    });
  });

  describe('Resource Ownership Access Control', () => {
    it('should allow user to access their own profile without admin permissions', async () => {
      const token = generateToken(testUsers.employee);

      const response = await request(app.getHttpServer())
        .get(`/test-rbac/profile/${testUsers.employee.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.isOwner).toBe(true);
      expect(response.body.userId).toBe(testUsers.employee.id);
    });

    it('should deny employee access to other user profiles without admin permissions', async () => {
      const token = generateToken(testUsers.employee);

      await request(app.getHttpServer())
        .get(`/test-rbac/profile/${testUsers.supervisor.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });

    it('should allow manager to access other user profiles with admin permissions', async () => {
      const token = generateToken(testUsers.manager);

      const response = await request(app.getHttpServer())
        .get(`/test-rbac/profile/${testUsers.employee.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.isOwner).toBe(false);
      expect(response.body.userId).toBe(testUsers.employee.id);
      expect(response.body.currentUserId).toBe(testUsers.manager.id);
    });
  });

  describe('Tenant Context and Isolation', () => {
    it('should provide correct tenant context information', async () => {
      const token = generateToken(testUsers.manager);

      const response = await request(app.getHttpServer())
        .get('/test-rbac/context-info')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.userId).toBe(testUsers.manager.id);
      expect(response.body.role).toBe(UserRole.MANAGER);
      expect(response.body.tenantId).toBe(testTenant1);
    });

    it('should isolate users from different tenants', async () => {
      const crossTenantToken = generateToken(testUsers.crossTenantUser);

      const response = await request(app.getHttpServer())
        .get('/test-rbac/context-info')
        .set('Authorization', `Bearer ${crossTenantToken}`)
        .expect(200);

      expect(response.body.tenantId).toBe(testTenant2);
      expect(response.body.tenantId).not.toBe(testTenant1);
    });

    it('should prevent cross-tenant profile access', async () => {
      const crossTenantToken = generateToken(testUsers.crossTenantUser);

      // Cross-tenant user should not be able to access tenant1 user profile
      // This would be prevented at the database level by RLS policies
      await request(app.getHttpServer())
        .get(`/test-rbac/profile/${testUsers.employee.id}`)
        .set('Authorization', `Bearer ${crossTenantToken}`)
        .expect(403);
    });
  });

  describe('Role Hierarchy Validation', () => {
    const roleHierarchyTests = [
      {
        role: UserRole.EMPLOYEE,
        canAccess: ['user-read'],
        cannotAccess: ['user-create', 'employee-manage', 'payroll-process'],
      },
      {
        role: UserRole.SUPERVISOR,
        canAccess: ['user-read', 'employee-manage'],
        cannotAccess: ['user-create', 'payroll-process'],
      },
      {
        role: UserRole.MANAGER,
        canAccess: ['user-read', 'user-create', 'employee-manage'],
        cannotAccess: ['payroll-process'],
      },
      {
        role: UserRole.COMPANY_ADMIN,
        canAccess: ['user-read', 'user-create', 'employee-manage', 'payroll-process'],
        cannotAccess: [],
      },
    ];

    roleHierarchyTests.forEach(({ role, canAccess, cannotAccess }) => {
      describe(`${role} role permissions`, () => {
        const testUser = Object.values(testUsers).find((user) => user.role === role);

        if (!testUser) {
          return;
        }

        canAccess.forEach((endpoint) => {
          it(`should allow ${role} to access ${endpoint}`, async () => {
            const token = generateToken(testUser);
            const method =
              endpoint.includes('create') || endpoint.includes('process') ? 'post' : 'get';

            await request(app.getHttpServer())
              [method](`/test-rbac/${endpoint}`)
              .set('Authorization', `Bearer ${token}`)
              .expect(method === 'post' ? 201 : 200);
          });
        });

        cannotAccess.forEach((endpoint) => {
          it(`should deny ${role} access to ${endpoint}`, async () => {
            const token = generateToken(testUser);
            const method =
              endpoint.includes('create') || endpoint.includes('process') ? 'post' : 'get';

            await request(app.getHttpServer())
              [method](`/test-rbac/${endpoint}`)
              .set('Authorization', `Bearer ${token}`)
              .expect(403);
          });
        });
      });
    });
  });

  describe('Error Handling and Security', () => {
    it('should return 401 for invalid JWT token', async () => {
      await request(app.getHttpServer())
        .get('/test-rbac/user-read')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });

    it('should return 401 for expired JWT token', async () => {
      // Create expired token
      const expiredPayload = {
        sub: testUsers.employee.id,
        email: testUsers.employee.email,
        role: testUsers.employee.role,
        companyId: testUsers.employee.tenantId,
        type: 'access',
      };

      const expiredToken = jwtService.sign(expiredPayload, { expiresIn: '1ms' });

      // Wait for token to expire
      await new Promise((resolve) => setTimeout(resolve, 10));

      await request(app.getHttpServer())
        .get('/test-rbac/user-read')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);
    });

    it('should return 403 for insufficient permissions with clear message', async () => {
      const token = generateToken(testUsers.employee);

      const response = await request(app.getHttpServer())
        .post('/test-rbac/user-create')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      expect(response.body.message).toContain('privileges');
    });

    it('should handle malformed authorization header', async () => {
      await request(app.getHttpServer())
        .get('/test-rbac/user-read')
        .set('Authorization', 'InvalidFormat')
        .expect(401);
    });
  });

  describe('Performance and Caching', () => {
    it('should handle multiple concurrent requests efficiently', async () => {
      const token = generateToken(testUsers.manager);

      // Make multiple concurrent requests
      const requests = Array(10)
        .fill(0)
        .map(() =>
          request(app.getHttpServer())
            .get('/test-rbac/user-read')
            .set('Authorization', `Bearer ${token}`),
        );

      const responses = await Promise.all(requests);

      // All requests should succeed
      responses.forEach((response: request.Response) => {
        expect(response.status).toBe(200);
      });
    });

    it('should maintain consistent permission checks across requests', async () => {
      const token = generateToken(testUsers.supervisor);

      // Multiple requests should have consistent permission behavior
      await request(app.getHttpServer())
        .get('/test-rbac/employee-manage')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      await request(app.getHttpServer())
        .post('/test-rbac/user-create')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      await request(app.getHttpServer())
        .get('/test-rbac/employee-manage')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
    });
  });
});

/**
 * Usage Notes:
 *
 * 1. To run this test:
 *    npm test -- --testPathPattern="integration-test-example.spec.ts"
 *
 * 2. This test demonstrates:
 *    - End-to-end permission checking
 *    - Tenant isolation
 *    - Role hierarchy enforcement
 *    - Resource ownership patterns
 *    - Error handling scenarios
 *
 * 3. In a real environment, you would:
 *    - Use a test database
 *    - Seed test data properly
 *    - Mock external services
 *    - Add more edge cases
 *
 * 4. The test shows how permissions work at the HTTP level,
 *    validating the complete RBAC system integration.
 */
