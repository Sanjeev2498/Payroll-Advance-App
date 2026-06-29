/**
 * Comprehensive permission system for RBAC
 * Permissions are organized by domain and operation type
 */

// User Management Permissions
export enum UserPermissions {
  CREATE_USER = 'user:create',
  READ_USER = 'user:read',
  UPDATE_USER = 'user:update',
  DELETE_USER = 'user:delete',
  MANAGE_USER_ROLES = 'user:manage_roles',
  RESET_USER_PASSWORD = 'user:reset_password',
  ACTIVATE_USER = 'user:activate',
  DEACTIVATE_USER = 'user:deactivate',
  READ_USER_STATS = 'user:read_stats',
}

// Company Management Permissions
export enum CompanyPermissions {
  READ_COMPANY = 'company:read',
  UPDATE_COMPANY = 'company:update',
  MANAGE_COMPANY_SETTINGS = 'company:manage_settings',
  VIEW_COMPANY_ANALYTICS = 'company:view_analytics',
}

// Client Management Permissions
export enum ClientPermissions {
  CREATE_CLIENT = 'client:create',
  READ_CLIENT = 'client:read',
  UPDATE_CLIENT = 'client:update',
  DELETE_CLIENT = 'client:delete',
  MANAGE_CLIENT_CONTRACTS = 'client:manage_contracts',
  VIEW_CLIENT_BILLING = 'client:view_billing',
}

// Site Management Permissions
export enum SitePermissions {
  CREATE_SITE = 'site:create',
  READ_SITE = 'site:read',
  UPDATE_SITE = 'site:update',
  DELETE_SITE = 'site:delete',
  MANAGE_SITE_ACCESS = 'site:manage_access',
  VIEW_SITE_OPERATIONS = 'site:view_operations',
}

// Employee Management Permissions
export enum EmployeePermissions {
  CREATE_EMPLOYEE = 'employee:create',
  READ_EMPLOYEE = 'employee:read',
  UPDATE_EMPLOYEE = 'employee:update',
  DELETE_EMPLOYEE = 'employee:delete',
  MANAGE_EMPLOYEE_DOCUMENTS = 'employee:manage_documents',
  VIEW_EMPLOYEE_PAYROLL = 'employee:view_payroll',
  UPDATE_EMPLOYEE_STATUS = 'employee:update_status',
}

// Assignment Management Permissions
export enum AssignmentPermissions {
  CREATE_ASSIGNMENT = 'assignment:create',
  READ_ASSIGNMENT = 'assignment:read',
  UPDATE_ASSIGNMENT = 'assignment:update',
  DELETE_ASSIGNMENT = 'assignment:delete',
  APPROVE_ASSIGNMENT = 'assignment:approve',
  BULK_MANAGE_ASSIGNMENTS = 'assignment:bulk_manage',
}

// Shift Management Permissions
export enum ShiftPermissions {
  CREATE_SHIFT = 'shift:create',
  READ_SHIFT = 'shift:read',
  UPDATE_SHIFT = 'shift:update',
  DELETE_SHIFT = 'shift:delete',
  APPROVE_SHIFT_CHANGES = 'shift:approve_changes',
  MANAGE_SHIFT_PATTERNS = 'shift:manage_patterns',
}

// Attendance Management Permissions
export enum AttendancePermissions {
  CREATE_ATTENDANCE = 'attendance:create',
  READ_ATTENDANCE = 'attendance:read',
  UPDATE_ATTENDANCE = 'attendance:update',
  DELETE_ATTENDANCE = 'attendance:delete',
  APPROVE_ATTENDANCE_CORRECTIONS = 'attendance:approve_corrections',
  VIEW_ATTENDANCE_REPORTS = 'attendance:view_reports',
  MANAGE_CLOCK_ADJUSTMENTS = 'attendance:manage_adjustments',
}

// Payroll Management Permissions
export enum PayrollPermissions {
  CREATE_PAYROLL_RUN = 'payroll:create_run',
  READ_PAYROLL = 'payroll:read',
  UPDATE_PAYROLL = 'payroll:update',
  DELETE_PAYROLL = 'payroll:delete',
  PROCESS_PAYROLL = 'payroll:process',
  APPROVE_PAYROLL = 'payroll:approve',
  CORRECT_PAYROLL = 'payroll:correct',
  EXPORT_PAYROLL = 'payroll:export',
  VIEW_PAYROLL_REPORTS = 'payroll:view_reports',
  MANAGE_PAYROLL_SETTINGS = 'payroll:manage_settings',
}

// Billing and Invoice Permissions
export enum BillingPermissions {
  CREATE_INVOICE = 'billing:create_invoice',
  READ_INVOICE = 'billing:read',
  UPDATE_INVOICE = 'billing:update',
  DELETE_INVOICE = 'billing:delete',
  SEND_INVOICE = 'billing:send',
  MANAGE_BILLING_RATES = 'billing:manage_rates',
  VIEW_BILLING_REPORTS = 'billing:view_reports',
}

// Reporting and Analytics Permissions
export enum ReportingPermissions {
  VIEW_OPERATIONAL_REPORTS = 'reporting:view_operational',
  VIEW_FINANCIAL_REPORTS = 'reporting:view_financial',
  VIEW_COMPLIANCE_REPORTS = 'reporting:view_compliance',
  EXPORT_REPORTS = 'reporting:export',
  CREATE_CUSTOM_REPORTS = 'reporting:create_custom',
  MANAGE_DASHBOARDS = 'reporting:manage_dashboards',
}

// System Administration Permissions
export enum SystemPermissions {
  MANAGE_SYSTEM_SETTINGS = 'system:manage_settings',
  VIEW_AUDIT_LOGS = 'system:view_audit_logs',
  MANAGE_INTEGRATIONS = 'system:manage_integrations',
  BACKUP_DATA = 'system:backup_data',
  MANAGE_SECURITY_SETTINGS = 'system:manage_security',
}

// Consolidated permissions type for easier usage
export type Permission =
  | UserPermissions
  | CompanyPermissions
  | ClientPermissions
  | SitePermissions
  | EmployeePermissions
  | AssignmentPermissions
  | ShiftPermissions
  | AttendancePermissions
  | PayrollPermissions
  | BillingPermissions
  | ReportingPermissions
  | SystemPermissions;

// Helper to get all permissions as an array
export const ALL_PERMISSIONS: Permission[] = [
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
];
