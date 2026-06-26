import { Test, TestingModule } from '@nestjs/testing';
import { UserRole } from '@prisma/client';
import { ForbiddenException } from '@nestjs/common';
import { ResourceAuthorizationService, ResourceAuthConfig } from './resource-authorization.service';
import { RbacService } from './rbac.service';
import { TenantContextService } from '../../common/tenant-context.service';
import { UserPermissions, EmployeePermissions } from '../enums/permissions.enum';

describe('ResourceAuthorizationService', () => {
  let service: ResourceAuthorizationService;
  let rbacService: jest.Mocked<RbacService>;
  let tenantContextService: jest.Mocked<TenantContextService>;

  beforeEach(async () => {
    const mockRbacService = {
      hasPermission: jest.fn(),
      canAccessTenant: jest.fn(),
      getPermissionContext: jest.fn(),
    };

    const mockTenantContextService = {
      getUserId: jest.fn(),
      getUserRole: jest.fn(),
      getTenantId: jest.fn(),
      hasContext: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResourceAuthorizationService,
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

    service = module.get<ResourceAuthorizationService>(ResourceAuthorizationService);
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
    rbacService.canAccessTenant.mockReturnValue(true);
    rbacService.getPermissionContext.mockReturnValue({
      userId: 'user-1',
      userRole: UserRole.EMPLOYEE,
      tenantId: 'tenant-1',
      permissions: [],
      timestamp: new Date(),
    });
  });

  describe('authorizeResourceAccess', () => {
    it('should allow access for super admin', async () => {
      tenantContextService.getUserRole.mockReturnValue(UserRole.SUPER_ADMIN);

      const config: ResourceAuthConfig = {
        resourceType: 'user_profile',
        allowOwner: false,
        allowTenantAdmin: false,
      };

      const result = await service.authorizeResourceAccess('resource-1', config);

      expect(result).toBe(true);
    });

    it('should allow access for resource owner when allowOwner is true', async () => {
      const config: ResourceAuthConfig = {
        resourceType: 'user_profile',
        allowOwner: true,
      };

      const resourceData = { userId: 'user-1' };

      const result = await service.authorizeResourceAccess('resource-1', config, resourceData);

      expect(result).toBe(true);
    });

    it('should deny access for non-owner when allowOwner is false', async () => {
      const config: ResourceAuthConfig = {
        resourceType: 'user_profile',
        allowOwner: false,
      };

      const resourceData = { userId: 'user-2' };

      const result = await service.authorizeResourceAccess('resource-1', config, resourceData);

      expect(result).toBe(true); // Should pass default case (no restrictions failed)
    });

    it('should allow access for tenant admin when allowTenantAdmin is true', async () => {
      tenantContextService.getUserRole.mockReturnValue(UserRole.COMPANY_ADMIN);

      const config: ResourceAuthConfig = {
        resourceType: 'user_profile',
        allowOwner: false,
        allowTenantAdmin: true,
      };

      const result = await service.authorizeResourceAccess('resource-1', config);

      expect(result).toBe(true);
    });

    it('should check required permission when specified', async () => {
      rbacService.hasPermission.mockReturnValue(true);

      const config: ResourceAuthConfig = {
        resourceType: 'user_profile',
        requiredPermission: UserPermissions.READ_USER,
      };

      const result = await service.authorizeResourceAccess('resource-1', config);

      expect(result).toBe(true);
      expect(rbacService.hasPermission).toHaveBeenCalledWith(UserPermissions.READ_USER);
    });

    it('should deny access when required permission is missing', async () => {
      rbacService.hasPermission.mockReturnValue(false);

      const config: ResourceAuthConfig = {
        resourceType: 'user_profile',
        requiredPermission: UserPermissions.READ_USER,
      };

      const result = await service.authorizeResourceAccess('resource-1', config);

      expect(result).toBe(false);
    });

    it('should deny access for cross-tenant resources', async () => {
      rbacService.canAccessTenant.mockReturnValue(false);

      const config: ResourceAuthConfig = {
        resourceType: 'user_profile',
      };

      const resourceData = { companyId: 'tenant-2' };

      const result = await service.authorizeResourceAccess('resource-1', config, resourceData);

      expect(result).toBe(false);
      expect(rbacService.canAccessTenant).toHaveBeenCalledWith('tenant-2');
    });

    it('should use custom validator when provided', async () => {
      const customValidator = jest.fn().mockResolvedValue(true);

      const config: ResourceAuthConfig = {
        resourceType: 'user_profile',
        customValidator,
      };

      const result = await service.authorizeResourceAccess('resource-1', config);

      expect(result).toBe(true);
      expect(customValidator).toHaveBeenCalled();
    });

    it('should deny access when custom validator returns false', async () => {
      const customValidator = jest.fn().mockResolvedValue(false);

      const config: ResourceAuthConfig = {
        resourceType: 'user_profile',
        customValidator,
      };

      const result = await service.authorizeResourceAccess('resource-1', config);

      expect(result).toBe(false);
    });

    it('should deny access when user context is invalid', async () => {
      tenantContextService.getUserId.mockReturnValue(null);

      const config: ResourceAuthConfig = {
        resourceType: 'user_profile',
      };

      const result = await service.authorizeResourceAccess('resource-1', config);

      expect(result).toBe(false);
    });
  });

  describe('requireResourceAccess', () => {
    it('should not throw when access is authorized', async () => {
      tenantContextService.getUserRole.mockReturnValue(UserRole.SUPER_ADMIN);

      const config: ResourceAuthConfig = {
        resourceType: 'user_profile',
      };

      await expect(
        service.requireResourceAccess('resource-1', config)
      ).resolves.not.toThrow();
    });

    it('should throw ForbiddenException when access is denied', async () => {
      rbacService.hasPermission.mockReturnValue(false);

      const config: ResourceAuthConfig = {
        resourceType: 'user_profile',
        requiredPermission: UserPermissions.READ_USER,
      };

      await expect(
        service.requireResourceAccess('resource-1', config)
      ).rejects.toThrow(ForbiddenException);
    });

    it('should use custom error message when provided', async () => {
      rbacService.hasPermission.mockReturnValue(false);

      const config: ResourceAuthConfig = {
        resourceType: 'user_profile',
        requiredPermission: UserPermissions.READ_USER,
      };

      const customMessage = 'Custom access denied message';

      await expect(
        service.requireResourceAccess('resource-1', config, undefined, customMessage)
      ).rejects.toThrow(customMessage);
    });
  });

  describe('authorizeBulkAction', () => {
    it('should return authorized and denied resource IDs', async () => {
      // Mock alternating authorization results
      tenantContextService.getUserRole.mockReturnValue(UserRole.MANAGER);
      rbacService.hasPermission.mockReturnValueOnce(true)
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(true);

      const config = {
        requiredPermission: EmployeePermissions.READ_EMPLOYEE,
      };

      const result = await service.authorizeBulkAction(
        'read',
        'employee',
        ['emp-1', 'emp-2', 'emp-3'],
        config
      );

      expect(result.authorized).toHaveLength(2);
      expect(result.denied).toHaveLength(1);
    });

    it('should handle empty resource list', async () => {
      const result = await service.authorizeBulkAction(
        'read',
        'employee',
        [],
        {}
      );

      expect(result.authorized).toHaveLength(0);
      expect(result.denied).toHaveLength(0);
    });
  });

  describe('filterAuthorizedResources', () => {
    it('should return only authorized resources', async () => {
      // Mock alternating authorization results
      let callCount = 0;
      const mockCustomValidator = jest.fn().mockImplementation(() => {
        callCount++;
        return callCount % 2 === 1; // Authorize odd-numbered calls
      });

      const resources = [
        { id: 'resource-1', name: 'Resource 1' },
        { id: 'resource-2', name: 'Resource 2' },
        { id: 'resource-3', name: 'Resource 3' },
      ];

      const config = {
        customValidator: mockCustomValidator,
      };

      const result = await service.filterAuthorizedResources(
        resources,
        'test',
        'read',
        config
      );

      expect(result).toHaveLength(2);
      expect(result.map(r => r.id)).toEqual(['resource-1', 'resource-3']);
    });

    it('should return empty array when no resources are authorized', async () => {
      rbacService.hasPermission.mockReturnValue(false);

      const resources = [
        { id: 'resource-1', name: 'Resource 1' },
      ];

      const config = {
        requiredPermission: UserPermissions.DELETE_USER,
      };

      const result = await service.filterAuthorizedResources(
        resources,
        'user',
        'delete',
        config
      );

      expect(result).toHaveLength(0);
    });
  });
});