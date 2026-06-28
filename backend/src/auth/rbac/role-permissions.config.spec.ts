import { UserRole } from '@prisma/client';
import { RolePermissionsConfig } from './role-permissions.config';
import {
  UserPermissions,
  EmployeePermissions,
  PayrollPermissions,
  SystemPermissions,
} from '../enums/permissions.enum';

describe('RolePermissionsConfig', () => {
  describe('getPermissionsForRole', () => {
    it('should return correct permissions for EMPLOYEE role', () => {
      const permissions = RolePermissionsConfig.getPermissionsForRole(UserRole.EMPLOYEE);

      expect(permissions).toContain(UserPermissions.READ_USER);
      expect(permissions).not.toContain(UserPermissions.CREATE_USER);
      expect(permissions).not.toContain(UserPermissions.DELETE_USER);
    });

    it('should return correct permissions for SUPERVISOR role', () => {
      const permissions = RolePermissionsConfig.getPermissionsForRole(UserRole.SUPERVISOR);

      // Should include employee permissions
      expect(permissions).toContain(UserPermissions.READ_USER);
      // Plus supervisor-specific permissions
      expect(permissions).toContain(EmployeePermissions.READ_EMPLOYEE);
      expect(permissions).toContain(EmployeePermissions.UPDATE_EMPLOYEE);
      // But not manager permissions
      expect(permissions).not.toContain(UserPermissions.CREATE_USER);
    });

    it('should return correct permissions for MANAGER role', () => {
      const permissions = RolePermissionsConfig.getPermissionsForRole(UserRole.MANAGER);

      // Should include supervisor permissions
      expect(permissions).toContain(EmployeePermissions.READ_EMPLOYEE);
      expect(permissions).toContain(EmployeePermissions.UPDATE_EMPLOYEE);
      // Plus manager-specific permissions
      expect(permissions).toContain(UserPermissions.CREATE_USER);
      expect(permissions).toContain(EmployeePermissions.CREATE_EMPLOYEE);
      // But not company admin permissions
      expect(permissions).not.toContain(PayrollPermissions.PROCESS_PAYROLL);
    });

    it('should return correct permissions for COMPANY_ADMIN role', () => {
      const permissions = RolePermissionsConfig.getPermissionsForRole(UserRole.COMPANY_ADMIN);

      // Should include manager permissions
      expect(permissions).toContain(UserPermissions.CREATE_USER);
      expect(permissions).toContain(EmployeePermissions.CREATE_EMPLOYEE);
      // Plus company admin-specific permissions
      expect(permissions).toContain(PayrollPermissions.PROCESS_PAYROLL);
      expect(permissions).toContain(PayrollPermissions.APPROVE_PAYROLL);
      // But not all system permissions
      expect(permissions).not.toContain(SystemPermissions.BACKUP_DATA);
    });

    it('should return all permissions for SUPER_ADMIN role', () => {
      const permissions = RolePermissionsConfig.getPermissionsForRole(UserRole.SUPER_ADMIN);

      // Should include all permissions
      expect(permissions).toContain(UserPermissions.CREATE_USER);
      expect(permissions).toContain(PayrollPermissions.PROCESS_PAYROLL);
      expect(permissions).toContain(SystemPermissions.BACKUP_DATA);
      expect(permissions).toContain(SystemPermissions.MANAGE_SYSTEM_SETTINGS);
    });
  });

  describe('hasPermission', () => {
    it('should return true when role has permission', () => {
      const result = RolePermissionsConfig.hasPermission(
        UserRole.MANAGER,
        UserPermissions.CREATE_USER,
      );

      expect(result).toBe(true);
    });

    it('should return false when role does not have permission', () => {
      const result = RolePermissionsConfig.hasPermission(
        UserRole.EMPLOYEE,
        UserPermissions.CREATE_USER,
      );

      expect(result).toBe(false);
    });
  });

  describe('hasAnyPermission', () => {
    it('should return true when role has at least one permission', () => {
      const result = RolePermissionsConfig.hasAnyPermission(UserRole.SUPERVISOR, [
        UserPermissions.CREATE_USER, // Supervisor doesn't have this
        EmployeePermissions.READ_EMPLOYEE, // Supervisor has this
      ]);

      expect(result).toBe(true);
    });

    it('should return false when role has none of the permissions', () => {
      const result = RolePermissionsConfig.hasAnyPermission(UserRole.EMPLOYEE, [
        UserPermissions.CREATE_USER,
        UserPermissions.DELETE_USER,
      ]);

      expect(result).toBe(false);
    });
  });

  describe('hasAllPermissions', () => {
    it('should return true when role has all permissions', () => {
      const result = RolePermissionsConfig.hasAllPermissions(UserRole.MANAGER, [
        UserPermissions.CREATE_USER,
        UserPermissions.READ_USER,
        UserPermissions.UPDATE_USER,
      ]);

      expect(result).toBe(true);
    });

    it('should return false when role is missing any permission', () => {
      const result = RolePermissionsConfig.hasAllPermissions(UserRole.SUPERVISOR, [
        EmployeePermissions.READ_EMPLOYEE, // Supervisor has this
        UserPermissions.CREATE_USER, // Supervisor doesn't have this
      ]);

      expect(result).toBe(false);
    });
  });

  describe('getRoleHierarchyLevel', () => {
    it('should return correct hierarchy levels', () => {
      expect(RolePermissionsConfig.getRoleHierarchyLevel(UserRole.EMPLOYEE)).toBe(1);
      expect(RolePermissionsConfig.getRoleHierarchyLevel(UserRole.SUPERVISOR)).toBe(2);
      expect(RolePermissionsConfig.getRoleHierarchyLevel(UserRole.MANAGER)).toBe(3);
      expect(RolePermissionsConfig.getRoleHierarchyLevel(UserRole.COMPANY_ADMIN)).toBe(4);
      expect(RolePermissionsConfig.getRoleHierarchyLevel(UserRole.SUPER_ADMIN)).toBe(5);
    });
  });

  describe('canManageRole', () => {
    it('should allow higher roles to manage lower roles', () => {
      expect(RolePermissionsConfig.canManageRole(UserRole.MANAGER, UserRole.EMPLOYEE)).toBe(true);
      expect(RolePermissionsConfig.canManageRole(UserRole.MANAGER, UserRole.SUPERVISOR)).toBe(true);
      expect(RolePermissionsConfig.canManageRole(UserRole.SUPERVISOR, UserRole.EMPLOYEE)).toBe(
        true,
      );
    });

    it('should not allow lower roles to manage higher roles', () => {
      expect(RolePermissionsConfig.canManageRole(UserRole.EMPLOYEE, UserRole.SUPERVISOR)).toBe(
        false,
      );
      expect(RolePermissionsConfig.canManageRole(UserRole.SUPERVISOR, UserRole.MANAGER)).toBe(
        false,
      );
    });

    it('should not allow same level role management (except super admin)', () => {
      expect(RolePermissionsConfig.canManageRole(UserRole.MANAGER, UserRole.MANAGER)).toBe(false);
      expect(RolePermissionsConfig.canManageRole(UserRole.SUPERVISOR, UserRole.SUPERVISOR)).toBe(
        false,
      );
    });

    it('should allow super admin to manage any role', () => {
      expect(
        RolePermissionsConfig.canManageRole(UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN),
      ).toBe(true);
      expect(RolePermissionsConfig.canManageRole(UserRole.SUPER_ADMIN, UserRole.SUPER_ADMIN)).toBe(
        true,
      );
    });

    it('should allow company admin to manage all except super admin', () => {
      expect(RolePermissionsConfig.canManageRole(UserRole.COMPANY_ADMIN, UserRole.MANAGER)).toBe(
        true,
      );
      expect(
        RolePermissionsConfig.canManageRole(UserRole.COMPANY_ADMIN, UserRole.COMPANY_ADMIN),
      ).toBe(true);
      expect(
        RolePermissionsConfig.canManageRole(UserRole.COMPANY_ADMIN, UserRole.SUPER_ADMIN),
      ).toBe(false);
    });
  });

  describe('getManageableRoles', () => {
    it('should return correct manageable roles for manager', () => {
      const roles = RolePermissionsConfig.getManageableRoles(UserRole.MANAGER);

      expect(roles).toContain(UserRole.EMPLOYEE);
      expect(roles).toContain(UserRole.SUPERVISOR);
      expect(roles).not.toContain(UserRole.MANAGER);
      expect(roles).not.toContain(UserRole.COMPANY_ADMIN);
      expect(roles).not.toContain(UserRole.SUPER_ADMIN);
    });

    it('should return all roles for super admin', () => {
      const roles = RolePermissionsConfig.getManageableRoles(UserRole.SUPER_ADMIN);

      expect(roles).toHaveLength(Object.values(UserRole).length);
      expect(roles).toContain(UserRole.SUPER_ADMIN);
    });

    it('should return empty array for employee', () => {
      const roles = RolePermissionsConfig.getManageableRoles(UserRole.EMPLOYEE);

      expect(roles).toHaveLength(0);
    });
  });

  describe('getCommonPermissions', () => {
    it('should return permissions common to all provided roles', () => {
      const commonPermissions = RolePermissionsConfig.getCommonPermissions([
        UserRole.SUPERVISOR,
        UserRole.MANAGER,
        UserRole.COMPANY_ADMIN,
      ]);

      // These roles should all have read user permission
      expect(commonPermissions).toContain(UserPermissions.READ_USER);
      // But manager-only permissions should not be included
      expect(commonPermissions).not.toContain(UserPermissions.CREATE_USER);
    });

    it('should return empty array when no roles provided', () => {
      const commonPermissions = RolePermissionsConfig.getCommonPermissions([]);

      expect(commonPermissions).toEqual([]);
    });

    it('should return role permissions when only one role provided', () => {
      const commonPermissions = RolePermissionsConfig.getCommonPermissions([UserRole.EMPLOYEE]);
      const employeePermissions = RolePermissionsConfig.getPermissionsForRole(UserRole.EMPLOYEE);

      expect(commonPermissions).toEqual(employeePermissions);
    });
  });
});
