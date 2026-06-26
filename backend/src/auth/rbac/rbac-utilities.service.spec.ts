import { Test, TestingModule } from '@nestjs/testing';
import { UserRole } from '@prisma/client';
import { RbacUtilitiesService, DynamicPermissionRule } from './rbac-utilities.service';
import { RbacService } from './rbac.service';
import { TenantContextService } from '../../common/tenant-context.service';
import { UserPermissions, EmployeePermissions } from '../enums/permissions.enum';

describe('RbacUtilitiesService', () => {
  let service: RbacUtilitiesService;
  let rbacService: jest.Mocked<RbacService>;
  let tenantContextService: jest.Mocked<TenantContextService>;

  beforeEach(async () => {
    const mockRbacService = {
      getUserPermissions: jest.fn(),
      hasAllPermissions: jest.fn(),
      getAssignableRoles: jest.fn(),
      getPermissionContext: jest.fn(),
    };

    const mockTenantContextService = {
      getUserId: jest.fn(),
      getUserRole: jest.fn(),
      getTenantId: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RbacUtilitiesService,
        {
          provide: RbacService,
          useValue: mockRbacService,
        },
        {
          provide: TenantContextService,
          useValue: mockTenantContextService,
        },
      ],
    }).compile();

    service = module.get<RbacUtilitiesService>(RbacUtilitiesService);
    rbacService = module.get(RbacService);
    tenantContextService = module.get(TenantContextService);
  });

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Default mock values
    tenantContextService.getUserId.mockReturnValue('user-1');
    tenantContextService.getUserRole.mockReturnValue(UserRole.EMPLOYEE);
    tenantContextService.getTenantId.mockReturnValue('tenant-1');
    rbacService.getUserPermissions.mockReturnValue([UserPermissions.READ_USER]);
    rbacService.getAssignableRoles.mockReturnValue([]);
  });

  describe('validatePermissions', () => {
    it('should return allowed when user has all required permissions', async () => {
      rbacService.getUserPermissions.mockReturnValue([
        UserPermissions.READ_USER,
        UserPermissions.UPDATE_USER,
      ]);

      const result = await service.validatePermissions(
        [UserPermissions.READ_USER, UserPermissions.UPDATE_USER],
        'update_profile'
      );

      expect(result.allowed).toBe(true);
      expect(result.reason).toContain('User has all required permissions');
      expect(result.missingPermissions).toBeUndefined();
    });

    it('should return denied with missing permissions', async () => {
      rbacService.getUserPermissions.mockReturnValue([UserPermissions.READ_USER]);

      const result = await service.validatePermissions(
        [UserPermissions.READ_USER, UserPermissions.UPDATE_USER],
        'update_profile'
      );

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Missing required permissions');
      expect(result.missingPermissions).toEqual([UserPermissions.UPDATE_USER]);
      expect(result.alternativeActions).toBeDefined();
    });

    it('should allow access via dynamic rule even with missing permissions', async () => {
      rbacService.getUserPermissions.mockReturnValue([]);

      // Register a rule that allows access
      const mockRule: DynamicPermissionRule = {
        id: 'test_rule',
        description: 'Test rule',
        priority: 100,
        condition: () => true,
        validator: () => true,
      };

      service.registerDynamicRule(mockRule);

      const result = await service.validatePermissions(
        [UserPermissions.UPDATE_USER],
        'test_action'
      );

      expect(result.allowed).toBe(true);
      expect(result.reason).toContain('dynamic rule');
    });

    it('should provide alternative actions for missing permissions', async () => {
      rbacService.getUserPermissions.mockReturnValue([]);

      const result = await service.validatePermissions(
        [UserPermissions.CREATE_USER, UserPermissions.UPDATE_USER],
        'manage_user'
      );

      expect(result.alternativeActions).toContain(
        'Request creation permissions from your administrator'
      );
      expect(result.alternativeActions).toContain(
        'Request edit permissions from your supervisor'
      );
    });
  });

  describe('canPerformActionWithContext', () => {
    it('should evaluate applicable dynamic rules', async () => {
      const mockRule: DynamicPermissionRule = {
        id: 'self_access_rule',
        description: 'Users can access their own data',
        priority: 100,
        condition: (context) => 
          context.action === 'read' && 
          context.resourceData?.userId === context.userId,
        validator: () => true,
      };

      service.registerDynamicRule(mockRule);

      const result = await service.canPerformActionWithContext(
        'read',
        'user',
        'user-1',
        { userId: 'user-1' }
      );

      expect(result.allowed).toBe(true);
      expect(result.reason).toContain('Users can access their own profile data');
    });

    it('should return denied when no applicable rules found', async () => {
      const result = await service.canPerformActionWithContext(
        'delete',
        'user',
        'user-2'
      );

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('No applicable rules found');
    });

    it('should evaluate rules by priority order', async () => {
      const lowPriorityRule: DynamicPermissionRule = {
        id: 'low_priority',
        description: 'Low priority rule',
        priority: 10,
        condition: () => true,
        validator: () => false, // Deny
      };

      const highPriorityRule: DynamicPermissionRule = {
        id: 'high_priority',
        description: 'High priority rule',
        priority: 100,
        condition: () => true,
        validator: () => true, // Allow
      };

      service.registerDynamicRule(lowPriorityRule);
      service.registerDynamicRule(highPriorityRule);

      const result = await service.canPerformActionWithContext(
        'test',
        'resource'
      );

      expect(result.allowed).toBe(true);
      expect(result.reason).toContain('High priority rule');
    });

    it('should skip rules when required permissions are not met', async () => {
      rbacService.hasAllPermissions.mockReturnValue(false);

      const ruleWithPermissions: DynamicPermissionRule = {
        id: 'restricted_rule',
        description: 'Rule with permission requirements',
        condition: () => true,
        requiredPermissions: [UserPermissions.DELETE_USER],
        validator: () => true,
      };

      service.registerDynamicRule(ruleWithPermissions);

      const result = await service.canPerformActionWithContext(
        'test',
        'resource'
      );

      expect(result.allowed).toBe(false);
      expect(rbacService.hasAllPermissions).toHaveBeenCalledWith([UserPermissions.DELETE_USER]);
    });
  });

  describe('registerDynamicRule and unregisterDynamicRule', () => {
    it('should register and use dynamic rules', async () => {
      const testRule: DynamicPermissionRule = {
        id: 'test_registration',
        description: 'Test rule registration',
        condition: () => true,
        validator: () => true,
      };

      service.registerDynamicRule(testRule);

      const result = await service.canPerformActionWithContext(
        'test',
        'resource'
      );

      expect(result.allowed).toBe(true);
    });

    it('should unregister dynamic rules', async () => {
      const testRule: DynamicPermissionRule = {
        id: 'test_unregistration',
        description: 'Test rule unregistration',
        condition: () => true,
        validator: () => true,
      };

      service.registerDynamicRule(testRule);
      service.unregisterDynamicRule('test_unregistration');

      const result = await service.canPerformActionWithContext(
        'test',
        'resource'
      );

      expect(result.allowed).toBe(false);
    });
  });

  describe('getPermissionAnalysis', () => {
    it('should return comprehensive permission analysis', () => {
      tenantContextService.getUserRole.mockReturnValue(UserRole.MANAGER);
      rbacService.getUserPermissions.mockReturnValue([
        UserPermissions.READ_USER,
        UserPermissions.CREATE_USER,
        EmployeePermissions.READ_EMPLOYEE,
      ]);
      rbacService.getAssignableRoles.mockReturnValue([UserRole.EMPLOYEE, UserRole.SUPERVISOR]);

      const analysis = service.getPermissionAnalysis();

      expect(analysis.userRole).toBe(UserRole.MANAGER);
      expect(analysis.permissions).toHaveLength(3);
      expect(analysis.permissionCount).toBe(3);
      expect(analysis.canManageRoles).toEqual([UserRole.EMPLOYEE, UserRole.SUPERVISOR]);
      expect(analysis.hierarchyLevel).toBe(3); // Manager level
      expect(analysis.tenantAccess.currentTenant).toBe('tenant-1');
      expect(analysis.tenantAccess.canAccessOtherTenants).toBe(false);
    });

    it('should handle super admin privileges', () => {
      tenantContextService.getUserRole.mockReturnValue(UserRole.SUPER_ADMIN);

      const analysis = service.getPermissionAnalysis();

      expect(analysis.tenantAccess.canAccessOtherTenants).toBe(true);
      expect(analysis.hierarchyLevel).toBe(5); // Super admin level
    });

    it('should handle null user role', () => {
      tenantContextService.getUserRole.mockReturnValue(null);

      const analysis = service.getPermissionAnalysis();

      expect(analysis.userRole).toBeNull();
      expect(analysis.hierarchyLevel).toBe(0);
      expect(analysis.canManageRoles).toEqual([]);
    });
  });

  describe('generatePermissionRequirements', () => {
    it('should generate requirements for known actions', () => {
      const requirements = service.generatePermissionRequirements('create', 'user');

      expect(requirements.requiredPermissions).toEqual(['user:create']);
      expect(requirements.minimumRole).toBeDefined();
    });

    it('should handle unknown actions', () => {
      const requirements = service.generatePermissionRequirements('unknown', 'resource');

      expect(requirements.requiredPermissions).toEqual([]);
      expect(requirements.minimumRole).toBe(UserRole.SUPER_ADMIN); // With no specific permissions, super admin is minimum
    });
  });

  describe('default dynamic rules', () => {
    it('should have self profile access rule', async () => {
      tenantContextService.getUserId.mockReturnValue('user-123');

      const result = await service.canPerformActionWithContext(
        'read',
        'user',
        'user-123' // Same as current user
      );

      expect(result.allowed).toBe(true);
      expect(result.reason).toContain('Users can access their own profile data');
    });

    it('should deny self profile access for different user', async () => {
      tenantContextService.getUserId.mockReturnValue('user-123');

      const result = await service.canPerformActionWithContext(
        'read',
        'user',
        'user-456' // Different user
      );

      expect(result.allowed).toBe(false);
    });
  });
});