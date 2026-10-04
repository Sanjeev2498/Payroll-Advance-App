/**
 * JWT-Tenant Integration Test 
 * Tests the complete JWT authentication flow with tenant context integration
 * 
 * This test validates Task 5.2: JWT-tenant integration
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { JwtService, JwtModule } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';
import request from 'supertest';
import { Controller, Get, UseGuards, Post } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';

// Import required modules and services
import { AppModule } from '../app.module';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from '../common/tenant-context.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { PermissionsGuard } from './guards/permissions.guard';
import { RequirePermissions } from './decorators/permissions.decorator';
import { CurrentUserId, CurrentUserRole, CurrentTenantId } from './decorators/resource-owner.decorator';
import { UserPermissions } from './enums/permissions.enum';
import { Public } from './decorators/public.decorator';
import { RbacService } from './rbac/rbac.service';
import { JwtStrategy } from './strategies/jwt.strategy';

// Test controller to validate JWT-tenant integration
@Controller('jwt-tenant-test')
@UseGuards(JwtAuthGuard, PermissionsGuard)
class JwtTenantTestController {
  constructor(private tenantContextService: TenantContextService) {}

  @Get('public')
  @Public()
  getPublic() {
    return { 
      message: 'Public endpoint',
      tenantContext: this.tenantContextService.hasContext()
    };
  }

  @Get('protected')
  @RequirePermissions([UserPermissions.READ_USER])
  getProtected(
    @CurrentUserId() userId: string,
    @CurrentUserRole() role: string,
    @CurrentTenantId() tenantId: string
  ) {
    return {
      message: 'Protected endpoint accessed',
      user: {
        id: userId,
        role: role,
        tenantId: tenantId
      },
      tenantContext: this.tenantContextService.getContext()
    };
  }

  @Post('admin-only')
  @RequirePermissions([UserPermissions.CREATE_USER])
  createUser(@CurrentUserId() userId: string) {
    return {
      message: 'Admin action performed',
      performedBy: userId
    };
  }
}

describe('JWT-Tenant Integration', () => {
  let app: INestApplication;
  let moduleRef: TestingModule;
  let jwtService: JwtService;
  let tenantContextService: TenantContextService;

  // Test UUIDs for proper database compatibility
  const testTenant1 = '550e8400-e29b-41d4-a716-446655440000';
  const testTenant2 = '550e8400-e29b-41d4-a716-446655440010';

  const testUsers = {
    employee: {
      id: '550e8400-e29b-41d4-a716-446655440001',
      email: 'employee@test.com',
      role: UserRole.EMPLOYEE,
      companyId: testTenant1,
    },
    manager: {
      id: '550e8400-e29b-41d4-a716-446655440003',
      email: 'manager@test.com', 
      role: UserRole.MANAGER,
      companyId: testTenant1,
    },
    crossTenant: {
      id: '550e8400-e29b-41d4-a716-446655440006',
      email: 'cross@test.com',
      role: UserRole.MANAGER,
      companyId: testTenant2,
    },
  };

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [AppModule],
      controllers: [JwtTenantTestController],
    })
    .overrideProvider(PrismaService)
    .useValue({
      // Mock Prisma service for JWT strategy validation
      user: {
        findFirst: jest.fn().mockImplementation((query) => {
          const userId = query?.where?.id;
          const userEmail = query?.where?.email;
          
          // Only match if both id AND email are provided and match together
          if (userId && userEmail) {
            const testUser = Object.values(testUsers).find(u => 
              u.id === userId && u.email === userEmail
            );
            
            if (!testUser) {
              return null;
            }
            
            return {
              id: testUser.id,
              company_id: testUser.companyId,
              email: testUser.email,
              first_name: testUser.email.split('@')[0],
              last_name: 'User',
              passwordHash: 'mock-hash',
              role: testUser.role,
              is_active: true,
              company: {
                id: testUser.companyId,
                name: 'Test Company',
                slug: 'test-company',
              },
            };
          }
          
          return null;
        }),
      },
      setTenantContext: jest.fn().mockResolvedValue(undefined),
      clearTenantContext: jest.fn().mockResolvedValue(undefined),
      withSystemContext: jest.fn().mockImplementation((callback) => callback()),
      withTenantContext: jest.fn().mockImplementation((tenantId, callback) => callback()),
      executeRaw: jest.fn().mockResolvedValue(undefined),
    })
    .overrideProvider(TenantContextService)
    .useValue((() => {
      // Create a stateful mock
      let currentContext = {
        tenantId: null,
        userId: null,
        userRole: null,
        isSet: false,
      };

      return {
        hasContext: jest.fn().mockImplementation(() => currentContext.isSet),
        setContext: jest.fn().mockImplementation((tenantId, userId, role) => {
          currentContext = {
            tenantId,
            userId,
            userRole: role,
            isSet: true,
          };
        }),
        clearContext: jest.fn().mockImplementation(() => {
          currentContext = {
            tenantId: null,
            userId: null,
            userRole: null,
            isSet: false,
          };
        }),
        getContext: jest.fn().mockImplementation(() => currentContext),
        getTenantId: jest.fn().mockImplementation(() => currentContext.tenantId),
        getUserId: jest.fn().mockImplementation(() => currentContext.userId),
        getUserRole: jest.fn().mockImplementation(() => currentContext.userRole),
      };
    })())
    .overrideProvider(RbacService)
    .useValue({
      hasPermission: jest.fn().mockImplementation((permission) => {
        // Get current user context from TenantContextService
        const tenantService = moduleRef?.get(TenantContextService);
        if (!tenantService || !tenantService.hasContext()) {
          return false;
        }
        
        const userRole = tenantService.getUserRole();
        
        // Role-based permission mapping
        const rolePermissions = {
          [UserRole.EMPLOYEE]: ['user:read'], // Employees can only read users
          [UserRole.MANAGER]: ['user:read', 'user:create'], // Managers can read and create users
          [UserRole.COMPANY_ADMIN]: ['user:read', 'user:create', 'employee:read', 'employee:update'],
          [UserRole.SUPER_ADMIN]: ['*'], // Super admin has all permissions
        };
        
        const allowedPermissions = rolePermissions[userRole] || [];
        return allowedPermissions.includes(permission) || allowedPermissions.includes('*');
      }),
      hasAnyPermission: jest.fn().mockImplementation((permissions) => {
        const rbacService = moduleRef?.get(RbacService);
        return permissions.some(permission => rbacService.hasPermission(permission));
      }),
      hasAllPermissions: jest.fn().mockImplementation((permissions) => {
        const rbacService = moduleRef?.get(RbacService);
        return permissions.every(permission => rbacService.hasPermission(permission));
      }),
      canAccessTenant: jest.fn().mockReturnValue(true),
      logAuthorizationEvent: jest.fn(),
      getUserPermissions: jest.fn().mockReturnValue([]),
    })
    .compile();

    app = moduleRef.createNestApplication();
    jwtService = moduleRef.get<JwtService>(JwtService);
    // Don't get TenantContextService here since it's request-scoped

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  // Helper function to generate valid JWT tokens
  const generateToken = (user: any) => {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      companyId: user.companyId,
      type: 'access',
    };
    return jwtService.sign(payload);
  };

  describe('JWT Authentication Integration', () => {
    it('should allow access to public endpoints without JWT token', async () => {
      const response = await request(app.getHttpServer())
        .get('/jwt-tenant-test/public')
        .expect(200);

      expect(response.body.data.message).toBe('Public endpoint');
      expect(response.body.data.tenantContext).toBe(false); // No tenant context for public endpoints
    });

    it('should reject requests to protected endpoints without JWT token', async () => {
      await request(app.getHttpServer())
        .get('/jwt-tenant-test/protected')
        .expect(401);
    });

    it('should reject requests with invalid JWT tokens', async () => {
      await request(app.getHttpServer())
        .get('/jwt-tenant-test/protected')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });

    it('should reject requests with non-UUID user IDs (previous bug)', async () => {
      // Create token with string ID instead of UUID (this was the original bug)
      const invalidPayload = {
        sub: 'employee-user-id', // String instead of UUID
        email: 'employee@test.com',
        role: UserRole.EMPLOYEE,
        companyId: testTenant1,
        type: 'access',
      };
      const invalidToken = jwtService.sign(invalidPayload);

      await request(app.getHttpServer())
        .get('/jwt-tenant-test/protected')
        .set('Authorization', `Bearer ${invalidToken}`)
        .expect(401); // Should fail because user lookup will fail with string ID
    });
  });

  describe('JWT-Tenant Context Integration', () => {
    it('should establish tenant context from JWT token', async () => {
      const token = generateToken(testUsers.employee);

      const response = await request(app.getHttpServer())
        .get('/jwt-tenant-test/protected')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Validate response contains user and tenant information
      expect(response.body.data.message).toBe('Protected endpoint accessed');
      expect(response.body.data.user.id).toBe(testUsers.employee.id);
      expect(response.body.data.user.role).toBe(UserRole.EMPLOYEE);
      expect(response.body.data.user.tenantId).toBe(testTenant1);
      
      // Validate tenant context was properly set
      expect(response.body.data.tenantContext).toEqual({
        tenantId: testTenant1,
        userId: testUsers.employee.id,
        userRole: UserRole.EMPLOYEE,
        isSet: true,
      });
    });

    it('should isolate different tenant contexts', async () => {
      const employee1Token = generateToken(testUsers.employee);
      const crossTenantToken = generateToken(testUsers.crossTenant);

      // Test employee from tenant 1
      const response1 = await request(app.getHttpServer())
        .get('/jwt-tenant-test/protected')
        .set('Authorization', `Bearer ${employee1Token}`)
        .expect(200);

      expect(response1.body.data.user.tenantId).toBe(testTenant1);

      // Test manager from tenant 2
      const response2 = await request(app.getHttpServer())
        .get('/jwt-tenant-test/protected')
        .set('Authorization', `Bearer ${crossTenantToken}`)
        .expect(200);

      expect(response2.body.data.user.tenantId).toBe(testTenant2);
      expect(response2.body.data.user.tenantId).not.toBe(testTenant1);
    });
  });

  describe('Role-Based Access Control with JWT', () => {
    it('should allow employee to access user:read endpoints', async () => {
      const token = generateToken(testUsers.employee);

      const response = await request(app.getHttpServer())
        .get('/jwt-tenant-test/protected')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.data.user.role).toBe(UserRole.EMPLOYEE);
    });

    it('should deny employee access to admin-only endpoints', async () => {
      const token = generateToken(testUsers.employee);

      await request(app.getHttpServer())
        .post('/jwt-tenant-test/admin-only')
        .set('Authorization', `Bearer ${token}`)
        .expect(403); // Should be forbidden due to insufficient permissions
    });

    it('should allow manager to access admin endpoints', async () => {
      const token = generateToken(testUsers.manager);

      const response = await request(app.getHttpServer())
        .post('/jwt-tenant-test/admin-only')
        .set('Authorization', `Bearer ${token}`)
        .expect(201);

      expect(response.body.data.message).toBe('Admin action performed');
      expect(response.body.data.performedBy).toBe(testUsers.manager.id);
    });
  });

  describe('JWT Token Validation', () => {
    it('should validate JWT token structure and user existence', async () => {
      // Valid token for existing user
      const validToken = generateToken(testUsers.employee);
      
      await request(app.getHttpServer())
        .get('/jwt-tenant-test/protected')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);
    });

    it('should reject tokens for non-existent users', async () => {
      // Token for user that doesn't exist in mock database
      const nonExistentUser = {
        id: '550e8400-e29b-41d4-a716-446655440999',
        email: 'nonexistent@test.com',
        role: UserRole.EMPLOYEE,
        companyId: testTenant1,
      };
      const invalidToken = generateToken(nonExistentUser);

      await request(app.getHttpServer())
        .get('/jwt-tenant-test/protected')
        .set('Authorization', `Bearer ${invalidToken}`)
        .expect(401); // Should fail because user lookup returns null
    });

    it('should handle malformed authorization headers', async () => {
      await request(app.getHttpServer())
        .get('/jwt-tenant-test/protected')
        .set('Authorization', 'InvalidFormat')
        .expect(401);
    });

    it('should handle missing authorization headers', async () => {
      await request(app.getHttpServer())
        .get('/jwt-tenant-test/protected')
        .expect(401);
    });
  });

  describe('Database Integration', () => {
    it('should call PrismaService methods during JWT validation', async () => {
      const token = generateToken(testUsers.employee);
      const prismaService = moduleRef.get<PrismaService>(PrismaService);

      await request(app.getHttpServer())
        .get('/jwt-tenant-test/protected')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Verify that Prisma methods were called for user lookup and tenant context
      expect(prismaService.user.findFirst).toHaveBeenCalledWith({
        where: {
          id: testUsers.employee.id,
          email: testUsers.employee.email,
          is_active: true,
        },
        include: {
          companies: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      });

      expect(prismaService.setTenantContext).toHaveBeenCalledWith(
        testUsers.employee.companyId,
        testUsers.employee.role
      );
    });
  });
});