import { Test, TestingModule } from '@nestjs/testing';
import { TenantContextService } from './tenant-context.service';
import { TenantGuard } from './tenant.guard';
import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

describe('Tenant Context Management System - Unit Tests', () => {
  let tenantContextService: TenantContextService;
  let tenantGuard: TenantGuard;
  let reflector: Reflector;

  const mockTenant1 = {
    id: '11111111-1111-1111-1111-111111111111',
    user: {
      id: 'user1',
      tenantId: '11111111-1111-1111-1111-111111111111',
      companyId: '11111111-1111-1111-1111-111111111111',
      role: 'COMPANY_ADMIN',
      email: 'admin@company1.com',
    },
  };

  const mockTenant2 = {
    id: '22222222-2222-2222-2222-222222222222',
    user: {
      id: 'user2',
      tenantId: '22222222-2222-2222-2222-222222222222',
      companyId: '22222222-2222-2222-2222-222222222222',
      role: 'MANAGER',
      email: 'manager@company2.com',
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TenantContextService,
        TenantGuard,
        {
          provide: Reflector,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    // Use resolve for request-scoped services
    tenantContextService = await module.resolve<TenantContextService>(TenantContextService);
    tenantGuard = await module.resolve<TenantGuard>(TenantGuard);
    reflector = module.get<Reflector>(Reflector);

    // Clear context before each test
    tenantContextService.clearContext();
  });

  describe('TenantContextService', () => {
    it('should be defined', () => {
      expect(tenantContextService).toBeDefined();
    });

    it('should set and get tenant context correctly', () => {
      // Initially no context should be set
      expect(tenantContextService.hasContext()).toBe(false);

      // Set tenant context
      tenantContextService.setContext(mockTenant1.id, mockTenant1.user.id, mockTenant1.user.role);

      // Verify context is set
      expect(tenantContextService.hasContext()).toBe(true);
      expect(tenantContextService.getTenantId()).toBe(mockTenant1.id);
      expect(tenantContextService.getUserId()).toBe(mockTenant1.user.id);
      expect(tenantContextService.getUserRole()).toBe(mockTenant1.user.role);
    });

    it('should throw error when accessing tenant ID without context', () => {
      expect(() => tenantContextService.getTenantId()).toThrow(
        'Tenant context not set. Ensure authentication middleware is properly configured.',
      );
    });

    it('should validate tenant access correctly', () => {
      tenantContextService.setContext(mockTenant1.id, mockTenant1.user.id, mockTenant1.user.role);

      // Should allow access to own tenant
      expect(tenantContextService.validateTenantAccess(mockTenant1.id)).toBe(true);

      // Should deny access to different tenant
      expect(tenantContextService.validateTenantAccess(mockTenant2.id)).toBe(false);
    });

    it('should check admin roles correctly', () => {
      tenantContextService.setContext(mockTenant1.id, mockTenant1.user.id, mockTenant1.user.role);

      expect(tenantContextService.isAdmin()).toBe(true);
      expect(tenantContextService.hasRole('COMPANY_ADMIN')).toBe(true);
      expect(tenantContextService.hasRole('EMPLOYEE')).toBe(false);
      expect(tenantContextService.hasAnyRole(['MANAGER', 'COMPANY_ADMIN'])).toBe(true);
      expect(tenantContextService.hasAnyRole(['EMPLOYEE', 'SUPERVISOR'])).toBe(false);
    });

    it('should check manager roles correctly', () => {
      tenantContextService.setContext(mockTenant2.id, mockTenant2.user.id, mockTenant2.user.role);

      expect(tenantContextService.isAdmin()).toBe(false); // Manager is not admin
      expect(tenantContextService.hasRole('MANAGER')).toBe(true);
      expect(tenantContextService.hasRole('COMPANY_ADMIN')).toBe(false);
      expect(tenantContextService.hasAnyRole(['MANAGER', 'SUPERVISOR'])).toBe(true);
      expect(tenantContextService.hasAnyRole(['EMPLOYEE'])).toBe(false);
    });

    it('should handle super admin access correctly', () => {
      tenantContextService.setContext(mockTenant1.id, 'superadmin', 'SUPER_ADMIN');

      // Super admins can access any tenant
      expect(tenantContextService.validateTenantAccess(mockTenant1.id)).toBe(true);
      expect(tenantContextService.validateTenantAccess(mockTenant2.id)).toBe(true);
      expect(tenantContextService.isAdmin()).toBe(true);
    });

    it('should clear context correctly', () => {
      tenantContextService.setContext(mockTenant1.id, mockTenant1.user.id, mockTenant1.user.role);

      expect(tenantContextService.hasContext()).toBe(true);

      tenantContextService.clearContext();

      expect(tenantContextService.hasContext()).toBe(false);
      expect(() => tenantContextService.getTenantId()).toThrow();
    });

    it('should generate context snapshot for debugging', () => {
      tenantContextService.setContext(mockTenant1.id, mockTenant1.user.id, mockTenant1.user.role);

      const snapshot = tenantContextService.getContextSnapshot();

      expect(snapshot).toContain(mockTenant1.id);
      expect(snapshot).toContain(mockTenant1.user.id);
      expect(snapshot).toContain(mockTenant1.user.role);
      expect(snapshot).toContain('set:true');
    });

    it('should get complete context information', () => {
      tenantContextService.setContext(mockTenant1.id, mockTenant1.user.id, mockTenant1.user.role);

      const context = tenantContextService.getContext();

      expect(context).toEqual({
        tenantId: mockTenant1.id,
        userId: mockTenant1.user.id,
        userRole: mockTenant1.user.role,
        isSet: true,
      });
    });
  });

  describe('TenantGuard', () => {
    let testModule: TestingModule;
    let testContextService: TenantContextService;

    const createMockExecutionContext = (
      user?: any,
      reflectorReturns: any = undefined,
    ): ExecutionContext => {
      return {
        switchToHttp: () => ({
          getRequest: () => ({ user }),
        }),
        getHandler: () => ({}),
        getClass: () => ({}),
      } as ExecutionContext;
    };

    beforeEach(async () => {
      testModule = await Test.createTestingModule({
        providers: [
          TenantContextService,
          TenantGuard,
          {
            provide: Reflector,
            useValue: {
              get: jest.fn(),
            },
          },
        ],
      }).compile();

      jest.clearAllMocks();

      // Get the same instance for both test and guard
      testContextService = await testModule.resolve<TenantContextService>(TenantContextService);
    });

    it('should be defined', async () => {
      const guard = await testModule.resolve<TenantGuard>(TenantGuard);
      expect(guard).toBeDefined();
    });

    it('should allow access for system-only endpoints', async () => {
      const mockReflector = testModule.get<Reflector>(Reflector);
      const guard = new TenantGuard(mockReflector, testContextService);

      (mockReflector.get as jest.Mock).mockReturnValue(true); // SystemOnly decorator

      const context = createMockExecutionContext();

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should allow access when no specific tenant requirements', async () => {
      const mockReflector = testModule.get<Reflector>(Reflector);
      const guard = new TenantGuard(mockReflector, testContextService);

      (mockReflector.get as jest.Mock).mockReturnValue(undefined); // No RequireTenant decorator

      const context = createMockExecutionContext();

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should deny access when tenant context not set for protected endpoint', async () => {
      const mockReflector = testModule.get<Reflector>(Reflector);
      const guard = new TenantGuard(mockReflector, testContextService);

      // Ensure context is cleared
      testContextService.clearContext();

      (mockReflector.get as jest.Mock).mockReturnValueOnce(false); // Not SystemOnly (handler)
      (mockReflector.get as jest.Mock).mockReturnValueOnce(undefined); // Not SystemOnly (class)
      (mockReflector.get as jest.Mock).mockReturnValueOnce(['MANAGER']); // RequireTenant (handler)
      (mockReflector.get as jest.Mock).mockReturnValueOnce(undefined); // RequireTenant (class)

      const context = createMockExecutionContext();

      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    });

    it('should allow access for users with correct role', async () => {
      const mockReflector = testModule.get<Reflector>(Reflector);
      const guard = new TenantGuard(mockReflector, testContextService);

      testContextService.setContext(mockTenant1.id, mockTenant1.user.id, mockTenant1.user.role);

      (mockReflector.get as jest.Mock).mockReturnValueOnce(false); // Not SystemOnly (handler)
      (mockReflector.get as jest.Mock).mockReturnValueOnce(undefined); // Not SystemOnly (class)
      (mockReflector.get as jest.Mock).mockReturnValueOnce(['COMPANY_ADMIN', 'MANAGER']); // RequireTenant (handler)
      (mockReflector.get as jest.Mock).mockReturnValueOnce(undefined); // RequireTenant (class)

      const context = createMockExecutionContext(mockTenant1.user);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should deny access for users without correct role', async () => {
      const mockReflector = testModule.get<Reflector>(Reflector);
      const guard = new TenantGuard(mockReflector, testContextService);

      testContextService.setContext(mockTenant2.id, mockTenant2.user.id, mockTenant2.user.role);

      (mockReflector.get as jest.Mock).mockReturnValueOnce(false); // Not SystemOnly (handler)
      (mockReflector.get as jest.Mock).mockReturnValueOnce(undefined); // Not SystemOnly (class)
      (mockReflector.get as jest.Mock).mockReturnValueOnce(['COMPANY_ADMIN']); // RequireTenant - only admin (handler)
      (mockReflector.get as jest.Mock).mockReturnValueOnce(undefined); // RequireTenant (class)

      const context = createMockExecutionContext(mockTenant2.user);

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should detect tenant mismatch between user and context', async () => {
      const mockReflector = testModule.get<Reflector>(Reflector);
      const guard = new TenantGuard(mockReflector, testContextService);

      testContextService.setContext(mockTenant1.id, mockTenant1.user.id, mockTenant1.user.role);

      (mockReflector.get as jest.Mock).mockReturnValueOnce(false); // Not SystemOnly (handler)
      (mockReflector.get as jest.Mock).mockReturnValueOnce(undefined); // Not SystemOnly (class)
      (mockReflector.get as jest.Mock).mockReturnValueOnce(['MANAGER']); // RequireTenant (handler)
      (mockReflector.get as jest.Mock).mockReturnValueOnce(undefined); // RequireTenant (class)

      // User claims different tenant than context
      const mismatchedUser = {
        ...mockTenant2.user,
        role: 'MANAGER',
      };

      const context = createMockExecutionContext(mismatchedUser);

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should allow super admin to access any tenant', async () => {
      const mockReflector = testModule.get<Reflector>(Reflector);
      const guard = new TenantGuard(mockReflector, testContextService);

      const superAdminUser = {
        id: 'superadmin',
        tenantId: mockTenant1.id,
        companyId: mockTenant1.id,
        role: 'SUPER_ADMIN',
        email: 'superadmin@system.com',
      };

      testContextService.setContext(mockTenant1.id, superAdminUser.id, superAdminUser.role);

      (mockReflector.get as jest.Mock).mockReturnValueOnce(false); // Not SystemOnly (handler)
      (mockReflector.get as jest.Mock).mockReturnValueOnce(undefined); // Not SystemOnly (class)
      (mockReflector.get as jest.Mock).mockReturnValueOnce(['COMPANY_ADMIN']); // RequireTenant - admin only (handler)
      (mockReflector.get as jest.Mock).mockReturnValueOnce(undefined); // RequireTenant (class)

      const context = createMockExecutionContext(superAdminUser);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });
  });

  describe('Integration - Service and Guard Working Together', () => {
    let integrationModule: TestingModule;

    beforeEach(async () => {
      integrationModule = await Test.createTestingModule({
        providers: [
          TenantContextService,
          TenantGuard,
          {
            provide: Reflector,
            useValue: {
              get: jest.fn(),
            },
          },
        ],
      }).compile();
    });

    it('should handle complete auth flow with tenant context', async () => {
      const contextService =
        await integrationModule.resolve<TenantContextService>(TenantContextService);
      const mockReflector = integrationModule.get<Reflector>(Reflector);
      const guard = new TenantGuard(mockReflector, contextService);

      // Step 1: Set tenant context (normally done by middleware)
      contextService.setContext(mockTenant1.id, mockTenant1.user.id, mockTenant1.user.role);

      // Step 2: Verify context is properly established
      expect(contextService.hasContext()).toBe(true);
      expect(contextService.getTenantId()).toBe(mockTenant1.id);

      // Step 3: Guard should allow access for admin user
      (mockReflector.get as jest.Mock).mockReturnValueOnce(false); // Not SystemOnly
      (mockReflector.get as jest.Mock).mockReturnValueOnce(['COMPANY_ADMIN']); // Admin required

      const context = {
        switchToHttp: () => ({
          getRequest: () => ({ user: mockTenant1.user }),
        }),
        getHandler: () => ({}),
        getClass: () => ({}),
      } as ExecutionContext;

      const guardResult = guard.canActivate(context);
      expect(guardResult).toBe(true);
    });

    it('should handle tenant switching in same request cycle', async () => {
      const contextService1 =
        await integrationModule.resolve<TenantContextService>(TenantContextService);
      const contextService2 =
        await integrationModule.resolve<TenantContextService>(TenantContextService);

      // Start with tenant 1
      contextService1.setContext(mockTenant1.id, mockTenant1.user.id, mockTenant1.user.role);
      expect(contextService1.getTenantId()).toBe(mockTenant1.id);

      // Different instance should have different context
      contextService2.setContext(mockTenant2.id, mockTenant2.user.id, mockTenant2.user.role);

      expect(contextService2.getTenantId()).toBe(mockTenant2.id);
      expect(contextService2.getUserRole()).toBe('MANAGER');

      // Original context should still be intact
      expect(contextService1.getTenantId()).toBe(mockTenant1.id);
    });
  });
});
