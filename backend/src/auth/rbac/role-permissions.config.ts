import {
  UserPermissions,
  CompanyPermissions,
  ClientPermissions,
  SitePermissions,
  EmployeePermissions,
  AssignmentPermissions,
  ShiftPermissions,
  AttendancePermissions,
  PayrollPermissions,
  BillingPermissions,
  ReportingPermissions,
  SystemPermissions,
  Permission,
} from '../enums/permissions.enum';
import { UserRole } from '@prisma/client';

/**
 * Role-based permission configuration
 * Defines which permissions each role has access to
 */
export class RolePermissionsConfig {
  /**
   * Permission mappings for each user role
   * Organized hierarchically with higher roles inheriting lower role permissions
   */
  private static readonly ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
    // Employee: Basic read access to their own data and attendance management
    [UserRole.EMPLOYEE]: [
      // Own data access
      UserPermissions.READ_USER,

      // Basic site information
      SitePermissions.READ_SITE,

      // Own assignments and shifts
      AssignmentPermissions.READ_ASSIGNMENT,
      ShiftPermissions.READ_SHIFT,

      // Attendance management (own records)
      AttendancePermissions.CREATE_ATTENDANCE,
      AttendancePermissions.READ_ATTENDANCE,

      // Basic payroll viewing
      PayrollPermissions.READ_PAYROLL,
    ],

    // Supervisor: Employee permissions + supervision of assigned areas
    [UserRole.SUPERVISOR]: [],

    // Manager: Supervisor permissions + broader operational management
    [UserRole.MANAGER]: [],

    // Company Admin: Manager permissions + company-wide administration
    [UserRole.COMPANY_ADMIN]: [],

    // Super Admin: All permissions (platform-wide access)
    [UserRole.SUPER_ADMIN]: [
      // All permissions for super admin
      ...Object.values(UserPermissions),
      ...Object.values(CompanyPermissions),
      ...Object.values(ClientPermissions),
      ...Object.values(SitePermissions),
      ...Object.values(EmployeePermissions),
      ...Object.values(AssignmentPermissions),
      ...Object.values(ShiftPermissions),
      ...Object.values(AttendancePermissions),
      ...Object.values(PayrollPermissions),
      ...Object.values(BillingPermissions),
      ...Object.values(ReportingPermissions),
      ...Object.values(SystemPermissions),
    ],
  };

  // Initialize permissions after the base permissions are defined
  static {
    // Supervisor: Employee permissions + supervision of assigned areas
    this.ROLE_PERMISSIONS[UserRole.SUPERVISOR] = [
      // Inherit employee permissions
      ...this.ROLE_PERMISSIONS[UserRole.EMPLOYEE],

      // User management for supervised areas
      UserPermissions.UPDATE_USER,

      // Site operations
      SitePermissions.VIEW_SITE_OPERATIONS,

      // Employee management (limited)
      EmployeePermissions.READ_EMPLOYEE,
      EmployeePermissions.UPDATE_EMPLOYEE,

      // Assignment management
      AssignmentPermissions.CREATE_ASSIGNMENT,
      AssignmentPermissions.UPDATE_ASSIGNMENT,

      // Shift management
      ShiftPermissions.CREATE_SHIFT,
      ShiftPermissions.UPDATE_SHIFT,
      ShiftPermissions.APPROVE_SHIFT_CHANGES,

      // Attendance management (team)
      AttendancePermissions.UPDATE_ATTENDANCE,
      AttendancePermissions.APPROVE_ATTENDANCE_CORRECTIONS,
      AttendancePermissions.VIEW_ATTENDANCE_REPORTS,

      // Basic reporting
      ReportingPermissions.VIEW_OPERATIONAL_REPORTS,
    ];

    // Manager: Supervisor permissions + broader operational management
    this.ROLE_PERMISSIONS[UserRole.MANAGER] = [
      // Inherit supervisor permissions
      ...this.ROLE_PERMISSIONS[UserRole.SUPERVISOR],

      // User management
      UserPermissions.CREATE_USER,
      UserPermissions.DELETE_USER,
      UserPermissions.RESET_USER_PASSWORD,

      // Company information
      CompanyPermissions.READ_COMPANY,
      CompanyPermissions.VIEW_COMPANY_ANALYTICS,

      // Client management
      ClientPermissions.CREATE_CLIENT,
      ClientPermissions.READ_CLIENT,
      ClientPermissions.UPDATE_CLIENT,
      ClientPermissions.VIEW_CLIENT_BILLING,

      // Site management
      SitePermissions.CREATE_SITE,
      SitePermissions.UPDATE_SITE,
      SitePermissions.MANAGE_SITE_ACCESS,

      // Full employee management
      EmployeePermissions.CREATE_EMPLOYEE,
      EmployeePermissions.DELETE_EMPLOYEE,
      EmployeePermissions.MANAGE_EMPLOYEE_DOCUMENTS,
      EmployeePermissions.UPDATE_EMPLOYEE_STATUS,

      // Assignment management
      AssignmentPermissions.DELETE_ASSIGNMENT,
      AssignmentPermissions.APPROVE_ASSIGNMENT,
      AssignmentPermissions.BULK_MANAGE_ASSIGNMENTS,

      // Shift management
      ShiftPermissions.DELETE_SHIFT,
      ShiftPermissions.MANAGE_SHIFT_PATTERNS,

      // Attendance management
      AttendancePermissions.DELETE_ATTENDANCE,
      AttendancePermissions.MANAGE_CLOCK_ADJUSTMENTS,

      // Payroll management (limited)
      PayrollPermissions.CREATE_PAYROLL_RUN,
      PayrollPermissions.UPDATE_PAYROLL,
      PayrollPermissions.VIEW_PAYROLL_REPORTS,

      // Billing
      BillingPermissions.READ_INVOICE,
      BillingPermissions.VIEW_BILLING_REPORTS,

      // Enhanced reporting
      ReportingPermissions.VIEW_FINANCIAL_REPORTS,
      ReportingPermissions.VIEW_COMPLIANCE_REPORTS,
      ReportingPermissions.EXPORT_REPORTS,
    ];

    // Company Admin: Manager permissions + company-wide administration
    this.ROLE_PERMISSIONS[UserRole.COMPANY_ADMIN] = [
      // Inherit manager permissions
      ...this.ROLE_PERMISSIONS[UserRole.MANAGER],

      // User management (company-wide)
      UserPermissions.MANAGE_USER_ROLES,

      // Company management
      CompanyPermissions.UPDATE_COMPANY,
      CompanyPermissions.MANAGE_COMPANY_SETTINGS,

      // Client management (full)
      ClientPermissions.DELETE_CLIENT,
      ClientPermissions.MANAGE_CLIENT_CONTRACTS,

      // Site management (full)
      SitePermissions.DELETE_SITE,

      // Employee management (full)
      EmployeePermissions.VIEW_EMPLOYEE_PAYROLL,

      // Payroll management (full)
      PayrollPermissions.DELETE_PAYROLL,
      PayrollPermissions.PROCESS_PAYROLL,
      PayrollPermissions.APPROVE_PAYROLL,
      PayrollPermissions.MANAGE_PAYROLL_SETTINGS,

      // Billing (full)
      BillingPermissions.CREATE_INVOICE,
      BillingPermissions.UPDATE_INVOICE,
      BillingPermissions.DELETE_INVOICE,
      BillingPermissions.SEND_INVOICE,
      BillingPermissions.MANAGE_BILLING_RATES,

      // Advanced reporting
      ReportingPermissions.CREATE_CUSTOM_REPORTS,
      ReportingPermissions.MANAGE_DASHBOARDS,

      // System administration (limited)
      SystemPermissions.VIEW_AUDIT_LOGS,
      SystemPermissions.MANAGE_INTEGRATIONS,
    ];
  }

  /**
   * Get all permissions for a specific role
   */
  static getPermissionsForRole(role: UserRole): Permission[] {
    return [...this.ROLE_PERMISSIONS[role]];
  }

  /**
   * Check if a role has a specific permission
   */
  static hasPermission(role: UserRole, permission: Permission): boolean {
    return this.ROLE_PERMISSIONS[role].includes(permission);
  }

  /**
   * Check if a role has any of the specified permissions
   */
  static hasAnyPermission(role: UserRole, permissions: Permission[]): boolean {
    const rolePermissions = this.ROLE_PERMISSIONS[role];
    return permissions.some((permission) => rolePermissions.includes(permission));
  }

  /**
   * Check if a role has all of the specified permissions
   */
  static hasAllPermissions(role: UserRole, permissions: Permission[]): boolean {
    const rolePermissions = this.ROLE_PERMISSIONS[role];
    return permissions.every((permission) => rolePermissions.includes(permission));
  }

  /**
   * Get permissions that are common between multiple roles
   */
  static getCommonPermissions(roles: UserRole[]): Permission[] {
    if (roles.length === 0) return [];

    let commonPermissions = this.getPermissionsForRole(roles[0]);

    for (let i = 1; i < roles.length; i++) {
      const rolePermissions = this.getPermissionsForRole(roles[i]);
      commonPermissions = commonPermissions.filter((permission) =>
        rolePermissions.includes(permission),
      );
    }

    return commonPermissions;
  }

  /**
   * Get the hierarchy level of a role (higher number = more permissions)
   */
  static getRoleHierarchyLevel(role: UserRole): number {
    const hierarchyMap = {
      [UserRole.EMPLOYEE]: 1,
      [UserRole.SUPERVISOR]: 2,
      [UserRole.MANAGER]: 3,
      [UserRole.COMPANY_ADMIN]: 4,
      [UserRole.SUPER_ADMIN]: 5,
    };

    return hierarchyMap[role];
  }

  /**
   * Check if role A can manage role B (based on hierarchy)
   */
  static canManageRole(managerRole: UserRole, targetRole: UserRole): boolean {
    // Super admin can manage anyone
    if (managerRole === UserRole.SUPER_ADMIN) {
      return true;
    }

    // Company admin can manage anyone except super admin
    if (managerRole === UserRole.COMPANY_ADMIN && targetRole !== UserRole.SUPER_ADMIN) {
      return true;
    }

    // Others can only manage roles below them
    return this.getRoleHierarchyLevel(managerRole) > this.getRoleHierarchyLevel(targetRole);
  }

  /**
   * Get all roles that a given role can manage
   */
  static getManageableRoles(role: UserRole): UserRole[] {
    return Object.values(UserRole).filter((targetRole) => this.canManageRole(role, targetRole));
  }
}
