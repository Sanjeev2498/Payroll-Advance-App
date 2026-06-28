import { SetMetadata } from '@nestjs/common';
import { Permission } from '../enums/permissions.enum';

/**
 * Metadata keys for permission-based decorators
 */
export const PERMISSIONS_KEY = 'permissions';
export const REQUIRE_ALL_PERMISSIONS_KEY = 'requireAllPermissions';
export const PERMISSION_OPTIONS_KEY = 'permissionOptions';

/**
 * Permission check options
 */
export interface PermissionOptions {
  /**
   * Whether to require all specified permissions (true) or any of them (false)
   * Default: false (require any)
   */
  requireAll?: boolean;

  /**
   * Allow resource owners to access regardless of permissions
   * Default: false
   */
  allowOwner?: boolean;

  /**
   * Custom error message for permission denial
   */
  errorMessage?: string;
}

/**
 * Decorator to require specific permissions for an endpoint
 *
 * @param permissions - Array of permissions required
 * @param options - Additional permission check options
 *
 * @example
 * ```typescript
 * @RequirePermissions([UserPermissions.CREATE_USER])
 * async createUser() { ... }
 *
 * @RequirePermissions(
 *   [EmployeePermissions.READ_EMPLOYEE, EmployeePermissions.UPDATE_EMPLOYEE],
 *   { requireAll: true }
 * )
 * async updateEmployee() { ... }
 *
 * @RequirePermissions(
 *   [AttendancePermissions.UPDATE_ATTENDANCE],
 *   { allowOwner: true }
 * )
 * async updateAttendance() { ... }
 * ```
 */
export const RequirePermissions = (
  permissions: Permission | Permission[],
  options: PermissionOptions = {},
) => {
  const permissionArray = Array.isArray(permissions) ? permissions : [permissions];

  return (target: any, propertyKey?: string, descriptor?: PropertyDescriptor) => {
    SetMetadata(PERMISSIONS_KEY, permissionArray)(target, propertyKey, descriptor);
    SetMetadata(PERMISSION_OPTIONS_KEY, options)(target, propertyKey, descriptor);
  };
};

/**
 * Decorator to require any of the specified permissions
 * Shorthand for RequirePermissions with requireAll: false (default behavior)
 */
export const RequireAnyPermission = (permissions: Permission[]) => {
  return RequirePermissions(permissions, { requireAll: false });
};

/**
 * Decorator to require all of the specified permissions
 * Shorthand for RequirePermissions with requireAll: true
 */
export const RequireAllPermissions = (permissions: Permission[]) => {
  return RequirePermissions(permissions, { requireAll: true });
};

/**
 * Decorator to allow resource owners to access regardless of permissions
 * Useful for endpoints where users should be able to access their own data
 */
export const AllowOwner = (permissions?: Permission | Permission[]) => {
  const permissionArray = permissions
    ? Array.isArray(permissions)
      ? permissions
      : [permissions]
    : [];

  return RequirePermissions(permissionArray, { allowOwner: true });
};

// ============================================================================
// Role-based convenience decorators
// ============================================================================

import {
  UserPermissions,
  EmployeePermissions,
  ClientPermissions,
  SitePermissions,
  AssignmentPermissions,
  AttendancePermissions,
  PayrollPermissions,
  BillingPermissions,
  ReportingPermissions,
  SystemPermissions,
} from '../enums/permissions.enum';

/**
 * Common permission combinations for convenience
 */
export class PermissionSets {
  // User management
  static readonly USER_READ = [UserPermissions.READ_USER];
  static readonly USER_WRITE = [UserPermissions.CREATE_USER, UserPermissions.UPDATE_USER];
  static readonly USER_MANAGE = [
    UserPermissions.CREATE_USER,
    UserPermissions.READ_USER,
    UserPermissions.UPDATE_USER,
    UserPermissions.DELETE_USER,
  ];

  // Employee management
  static readonly EMPLOYEE_READ = [EmployeePermissions.READ_EMPLOYEE];
  static readonly EMPLOYEE_WRITE = [
    EmployeePermissions.CREATE_EMPLOYEE,
    EmployeePermissions.UPDATE_EMPLOYEE,
  ];
  static readonly EMPLOYEE_MANAGE = [
    EmployeePermissions.CREATE_EMPLOYEE,
    EmployeePermissions.READ_EMPLOYEE,
    EmployeePermissions.UPDATE_EMPLOYEE,
    EmployeePermissions.DELETE_EMPLOYEE,
  ];

  // Client management
  static readonly CLIENT_READ = [ClientPermissions.READ_CLIENT];
  static readonly CLIENT_WRITE = [ClientPermissions.CREATE_CLIENT, ClientPermissions.UPDATE_CLIENT];
  static readonly CLIENT_MANAGE = [
    ClientPermissions.CREATE_CLIENT,
    ClientPermissions.READ_CLIENT,
    ClientPermissions.UPDATE_CLIENT,
    ClientPermissions.DELETE_CLIENT,
  ];

  // Attendance management
  static readonly ATTENDANCE_READ = [AttendancePermissions.READ_ATTENDANCE];
  static readonly ATTENDANCE_WRITE = [
    AttendancePermissions.CREATE_ATTENDANCE,
    AttendancePermissions.UPDATE_ATTENDANCE,
  ];
  static readonly ATTENDANCE_MANAGE = [
    AttendancePermissions.CREATE_ATTENDANCE,
    AttendancePermissions.READ_ATTENDANCE,
    AttendancePermissions.UPDATE_ATTENDANCE,
    AttendancePermissions.DELETE_ATTENDANCE,
  ];

  // Payroll management
  static readonly PAYROLL_READ = [PayrollPermissions.READ_PAYROLL];
  static readonly PAYROLL_PROCESS = [
    PayrollPermissions.CREATE_PAYROLL_RUN,
    PayrollPermissions.PROCESS_PAYROLL,
  ];
  static readonly PAYROLL_MANAGE = [
    PayrollPermissions.CREATE_PAYROLL_RUN,
    PayrollPermissions.READ_PAYROLL,
    PayrollPermissions.UPDATE_PAYROLL,
    PayrollPermissions.PROCESS_PAYROLL,
  ];

  // Reporting
  static readonly BASIC_REPORTS = [ReportingPermissions.VIEW_OPERATIONAL_REPORTS];
  static readonly ADVANCED_REPORTS = [
    ReportingPermissions.VIEW_OPERATIONAL_REPORTS,
    ReportingPermissions.VIEW_FINANCIAL_REPORTS,
    ReportingPermissions.VIEW_COMPLIANCE_REPORTS,
  ];

  // System administration
  static readonly SYSTEM_ADMIN = [
    SystemPermissions.MANAGE_SYSTEM_SETTINGS,
    SystemPermissions.VIEW_AUDIT_LOGS,
  ];
}

/**
 * Convenience decorators for common permission sets
 */
export const RequireUserRead = () => RequirePermissions(PermissionSets.USER_READ);
export const RequireUserWrite = () => RequirePermissions(PermissionSets.USER_WRITE);
export const RequireUserManage = () => RequirePermissions(PermissionSets.USER_MANAGE);

export const RequireEmployeeRead = () => RequirePermissions(PermissionSets.EMPLOYEE_READ);
export const RequireEmployeeWrite = () => RequirePermissions(PermissionSets.EMPLOYEE_WRITE);
export const RequireEmployeeManage = () => RequirePermissions(PermissionSets.EMPLOYEE_MANAGE);

export const RequireClientRead = () => RequirePermissions(PermissionSets.CLIENT_READ);
export const RequireClientWrite = () => RequirePermissions(PermissionSets.CLIENT_WRITE);
export const RequireClientManage = () => RequirePermissions(PermissionSets.CLIENT_MANAGE);

export const RequireAttendanceRead = () => RequirePermissions(PermissionSets.ATTENDANCE_READ);
export const RequireAttendanceWrite = () => RequirePermissions(PermissionSets.ATTENDANCE_WRITE);
export const RequireAttendanceManage = () => RequirePermissions(PermissionSets.ATTENDANCE_MANAGE);

export const RequirePayrollRead = () => RequirePermissions(PermissionSets.PAYROLL_READ);
export const RequirePayrollProcess = () => RequirePermissions(PermissionSets.PAYROLL_PROCESS);
export const RequirePayrollManage = () => RequirePermissions(PermissionSets.PAYROLL_MANAGE);

export const RequireBasicReports = () => RequirePermissions(PermissionSets.BASIC_REPORTS);
export const RequireAdvancedReports = () => RequirePermissions(PermissionSets.ADVANCED_REPORTS);

export const RequireSystemAdmin = () => RequirePermissions(PermissionSets.SYSTEM_ADMIN);
