import { Test, TestingModule } from '@nestjs/testing';
import { UserRole } from '@prisma/client';
import { RbacService } from './rbac.service';
import { TenantContextService } from '../../common/tenant-context.service';
import {
  UserPermissions,
  EmployeePermissions,
  PayrollPermissions,
  SystemPermissions,
} from '../enums/permissions.enum';

describe('RbacService', () => {
  let service: RbacService;
  let tenantContextService: jest.Mocked<TenantContextService>;

  beforeEach(async () => {
    const mockTenantContextService = {
      hasContext: jest.fn(),
      getTenantId: jest.fn(),
      getUserId: jest.fn(),
      getUserRole: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RbacService,
        {
          provide: TenantContextService,
          useValue: mockTenantContextService,
        },
      ],
    }).compile();

    service = module.get<RbacService>(RbacService);
    tenantContextService = module.get(TenantContextService);
  });

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    tenantContextService.hasContext.mockReturnValue(true);
    tenantContextService.getTenantId.mockReturnValue('tenant-1');
    tenantContextService.getUserId.mockReturnValue('user-1');
  });

  describe('hasPermission', () => {
    it('should return true when user has the required permission', () => {
      tenantContextService.getUserRole.mockReturnValue(UserRole.MANAGER);

      const result = service.hasPermission(UserPermissions.CREATE_USER);

      expect(result).toBe(true);
    });

    it('should return false when user does not have the required permission', () => {
      tenantContextService.getUserRole.mockReturnValue(UserRole.EMPLOYEE);

      const result = service.hasPermission(UserPermissions.CREATE_USER);

      expect(result).toBe(false);
    });

    it('should return false when no user role is set', () => {
      tenantContextService.getUserRole.mockReturnValue(null);

      const result = service.hasPermission(UserPermissions.READ_USER);

      expect(result).toBe(false);
    });

    it('should return true for super admin with any permission', () => {
      tenantContextService.getUserRole.mockReturnValue(UserRole.SUPER_ADMIN);

      const result = service.hasPermission(SystemPermissions.MANAGE_SYSTEM_SETTINGS);

      expect(result).toBe(true);
    });
  });

  describe('hasAnyPermission', () => {
    it('should return true when user has at least one of the required permissions', () => {
      tenantContextService.getUserRole.mockReturnValue(UserRole.SUPERVISOR);

      const result = service.hasAnyPermission([
        UserPermissions.CREATE_USER, // Supervisor doesn't have this
        EmployeePermissions.READ_EMPLOYEE, // Supervisor has this
      ]);

      expect(result).toBe(true);
    });

    it('should return false when user has none of the required permissions', () => {
      tenantContextService.getUserRole.mockReturnValue(UserRole.EMPLOYEE);

      const result = service.hasAnyPermission([
        UserPermissions.CREATE_USER,
        UserPermissions.DELETE_USER,
      ]);

      expect(result).toBe(false);
    });
  });

  describe('hasAllPermissions', () => {
    it('should return true when user has all required permissions', () => {
      tenantContextService.getUserRole.mockReturnValue(UserRole.MANAGER);

      const result = service.hasAllPermissions([
        UserPermissions.CREATE_USER,
        UserPermissions.READ_USER,
        UserPermissions.UPDATE_USER,
      ]);

      expect(result).toBe(true);
    });

    it('should return false when user is missing any required permission', () => {
      tenantContextService.getUserRole.mockReturnValue(UserRole.SUPERVISOR);

      const result = service.hasAllPermissions([
        EmployeePermissions.READ_EMPLOYEE, // Supervisor has this
        UserPermissions.CREATE_USER, // Supervisor doesn't have this
      ]);

      expect(result).toBe(false);
    });
  });

  describe('canAccessTenant', () => {
    it('should return true when accessing own tenant', () => {
      tenantContextService.getUserRole.mockReturnValue(UserRole.MANAGER);

      const result = service.canAccessTenant('tenant-1');

      expect(result).toBe(true);
    });

    it('should return false when accessing different tenant as regular user', () => {
      tenantContextService.getUserRole.mockReturnValue(UserRole.MANAGER);

      const result = service.canAccessTenant('tenant-2');

      expect(result).toBe(false);
    });

    it('should return true when super admin accesses any tenant', () => {
      tenantContextService.getUserRole.mockReturnValue(UserRole.SUPER_ADMIN);

      const result = service.canAccessTenant('tenant-2');

      expect(result).toBe(true);
    });

    it('should return false when tenant context is not set', () => {
      tenantContextService.hasContext.mockReturnValue(false);

      const result = service.canAccessTenant('tenant-1');

      expect(result).toBe(false);
    });
  });

  describe('canManageUser', () => {
    it('should return true when manager manages employee', () => {
      tenantContextService.getUserRole.mockReturnValue(UserRole.MANAGER);

      const result = service.canManageUser(UserRole.EMPLOYEE, 'tenant-1');

      expect(result).toBe(true);
    });

    it('should return false when employee tries to manage manager', () => {
      tenantContextService.getUserRole.mockReturnValue(UserRole.EMPLOYEE);

      const result = service.canManageUser(UserRole.MANAGER, 'tenant-1');

      expect(result).toBe(false);
    });

    it('should return false when trying to manage user in different tenant', () => {
      tenantContextService.getUserRole.mockReturnValue(UserRole.MANAGER);

      const result = service.canManageUser(UserRole.EMPLOYEE, 'tenant-2');

      expect(result).toBe(false);
    });

    it('should return true when super admin manages anyone', () => {
      tenantContextService.getUserRole.mockReturnValue(UserRole.SUPER_ADMIN);

      const result = service.canManageUser(UserRole.COMPANY_ADMIN, 'tenant-2');

      expect(result).toBe(true);
    });
  });

  describe('canPerformActionInTenant', () => {
    it('should return true when user has permission and tenant access', () => {
      tenantContextService.getUserRole.mockReturnValue(UserRole.MANAGER);

      const result = service.canPerformActionInTenant(
        PayrollPermissions.VIEW_PAYROLL_REPORTS,
        'tenant-1',
      );

      expect(result).toBe(true);
    });

    it('should return false when user lacks permission', () => {
      tenantContextService.getUserRole.mockReturnValue(UserRole.EMPLOYEE);

      const result = service.canPerformActionInTenant(
        PayrollPermissions.PROCESS_PAYROLL,
        'tenant-1',
      );

      expect(result).toBe(false);
    });

    it('should return false when user lacks tenant access', () => {
      tenantContextService.getUserRole.mockReturnValue(UserRole.MANAGER);

      const result = service.canPerformActionInTenant(
        PayrollPermissions.VIEW_PAYROLL_REPORTS,
        'tenant-2',
      );

      expect(result).toBe(false);
    });
  });

  describe('getAssignableRoles', () => {
    it('should return roles that manager can assign', () => {
      tenantContextService.getUserRole.mockReturnValue(UserRole.MANAGER);

      const result = service.getAssignableRoles();

      expect(result).toContain(UserRole.EMPLOYEE);
      expect(result).toContain(UserRole.SUPERVISOR);
      expect(result).not.toContain(UserRole.MANAGER);
      expect(result).not.toContain(UserRole.COMPANY_ADMIN);
      expect(result).not.toContain(UserRole.SUPER_ADMIN);
    });

    it('should return all roles for super admin', () => {
      tenantContextService.getUserRole.mockReturnValue(UserRole.SUPER_ADMIN);

      const result = service.getAssignableRoles();

      expect(result).toHaveLength(Object.values(UserRole).length);
    });

    it('should return empty array when no role is set', () => {
      tenantContextService.getUserRole.mockReturnValue(null);

      const result = service.getAssignableRoles();

      expect(result).toEqual([]);
    });
  });

  describe('canAccessResource', () => {
    it('should return true when user owns the resource', () => {
      const result = service.canAccessResource('user-1', 'tenant-1');

      expect(result).toBe(true);
    });

    it('should return true when user has required permission', () => {
      tenantContextService.getUserRole.mockReturnValue(UserRole.MANAGER);

      const result = service.canAccessResource(
        'user-2',
        'tenant-1',
        EmployeePermissions.READ_EMPLOYEE,
      );

      expect(result).toBe(true);
    });

    it('should return false when user does not own resource and lacks permission', () => {
      tenantContextService.getUserRole.mockReturnValue(UserRole.EMPLOYEE);

      const result = service.canAccessResource(
        'user-2',
        'tenant-1',
        EmployeePermissions.UPDATE_EMPLOYEE,
      );

      expect(result).toBe(false);
    });

    it('should return true for super admin accessing any resource', () => {
      tenantContextService.getUserRole.mockReturnValue(UserRole.SUPER_ADMIN);

      const result = service.canAccessResource('user-2', 'tenant-2');

      expect(result).toBe(true);
    });
  });
});
