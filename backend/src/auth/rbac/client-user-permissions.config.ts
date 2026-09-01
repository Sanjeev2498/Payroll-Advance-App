import {
  ClientPortalPermissions,
  Permission,
  ReportingPermissions,
} from '../enums/permissions.enum';
import { ClientUserRole } from '@prisma/client';

/**
 * Client User Role-based permission configuration
 * Defines which portal permissions each client user role has access to
 */
export class ClientUserPermissionsConfig {
  private static readonly rolePermissions: Map<ClientUserRole, Permission[]> = new Map([
    [ClientUserRole.SECURITY_MANAGER, [
      ClientPortalPermissions.VIEW_CLIENT_DASHBOARD,
      ClientPortalPermissions.VIEW_GUARD_DEPLOYMENTS,
      ClientPortalPermissions.VIEW_ATTENDANCE_DASHBOARD,
      ClientPortalPermissions.VIEW_INCIDENTS,
      ClientPortalPermissions.REPORT_INCIDENTS,
      ClientPortalPermissions.VIEW_GUARD_MONITORING,
      ClientPortalPermissions.VIEW_ATTENDANCE_RECORDS,
      ClientPortalPermissions.VIEW_INCIDENT_REPORTS,
      ClientPortalPermissions.SUBMIT_COMPLAINTS,
      ClientPortalPermissions.VIEW_OPERATIONAL_REPORTS,
    ]],
    
    [ClientUserRole.FACILITY_MANAGER, [
      ClientPortalPermissions.VIEW_CLIENT_DASHBOARD,
      ClientPortalPermissions.VIEW_GUARD_DEPLOYMENTS,
      ClientPortalPermissions.VIEW_ATTENDANCE_DASHBOARD,
      ClientPortalPermissions.VIEW_INCIDENTS,
      ClientPortalPermissions.VIEW_SITE_OVERVIEW,
      ClientPortalPermissions.VIEW_GUARD_MONITORING,
      ClientPortalPermissions.REQUEST_GUARD_REPLACEMENT,
      ClientPortalPermissions.SUBMIT_SERVICE_REQUESTS,
      ClientPortalPermissions.MANAGE_SITE_PRIORITIES,
    ]],
    
    [ClientUserRole.HR_MANAGER, [
      ClientPortalPermissions.VIEW_CLIENT_DASHBOARD,
      ClientPortalPermissions.VIEW_ATTENDANCE_DASHBOARD,
      ClientPortalPermissions.VIEW_ATTENDANCE_RECORDS,
      ClientPortalPermissions.VIEW_ATTENDANCE_TRENDS,
      ClientPortalPermissions.VIEW_ATTENDANCE_ANOMALIES,
      ClientPortalPermissions.VIEW_SITE_PERFORMANCE_REPORTS,
      ClientPortalPermissions.VIEW_COMPLIANCE_REPORTS,
      ClientPortalPermissions.DOWNLOAD_REPORTS,
    ]],
    
    [ClientUserRole.FINANCE_MANAGER, [
      ClientPortalPermissions.VIEW_CLIENT_DASHBOARD,
      ClientPortalPermissions.VIEW_BILLING_DASHBOARD,
      ClientPortalPermissions.VIEW_INVOICES,
      ClientPortalPermissions.DOWNLOAD_INVOICES,
      ClientPortalPermissions.VIEW_PAYMENT_HISTORY,
      ClientPortalPermissions.VIEW_BILLING_ANALYTICS,
      ClientPortalPermissions.DOWNLOAD_REPORTS,
      ClientPortalPermissions.VIEW_SERVICE_ANALYTICS,
    ]],
    
    [ClientUserRole.REGIONAL_MANAGER, [
      ClientPortalPermissions.VIEW_CLIENT_DASHBOARD,
      ClientPortalPermissions.VIEW_GUARD_DEPLOYMENTS,
      ClientPortalPermissions.VIEW_ATTENDANCE_DASHBOARD,
      ClientPortalPermissions.VIEW_BILLING_DASHBOARD,
      ClientPortalPermissions.VIEW_INCIDENTS,
      ClientPortalPermissions.VIEW_INVOICES,
      ClientPortalPermissions.DOWNLOAD_INVOICES,
      ClientPortalPermissions.VIEW_MULTI_SITE_DASHBOARD,
      ClientPortalPermissions.VIEW_CROSS_SITE_ANALYTICS,
      ClientPortalPermissions.MANAGE_SITE_PRIORITIES,
      ClientPortalPermissions.VIEW_SITE_OVERVIEW,
      ClientPortalPermissions.VIEW_GUARD_MONITORING,
      ClientPortalPermissions.VIEW_DEPLOYMENT_ANALYTICS,
      ClientPortalPermissions.VIEW_ATTENDANCE_RECORDS,
      ClientPortalPermissions.VIEW_ATTENDANCE_TRENDS,
      ClientPortalPermissions.VIEW_BILLING_ANALYTICS,
      ClientPortalPermissions.VIEW_SITE_PERFORMANCE_REPORTS,
      ClientPortalPermissions.VIEW_OPERATIONAL_REPORTS,
      ClientPortalPermissions.VIEW_SERVICE_ANALYTICS,
      ClientPortalPermissions.DOWNLOAD_REPORTS,
    ]]
  ]);
  
  static getPermissionsForRole(role: ClientUserRole): Permission[] {
    return this.rolePermissions.get(role) || [];
  }

  static hasPermission(role: ClientUserRole, permission: Permission): boolean {
    const permissions = this.getPermissionsForRole(role);
    return permissions.includes(permission);
  }

  static hasAnyPermission(role: ClientUserRole, permissions: Permission[]): boolean {
    const rolePermissions = this.getPermissionsForRole(role);
    return permissions.some(permission => rolePermissions.includes(permission));
  }

  static hasAllPermissions(role: ClientUserRole, permissions: Permission[]): boolean {
    const rolePermissions = this.getPermissionsForRole(role);
    return permissions.every(permission => rolePermissions.includes(permission));
  }

  static getClientRoleHierarchyLevel(role: ClientUserRole): number {
    const hierarchy = {
      [ClientUserRole.SECURITY_MANAGER]: 1,
      [ClientUserRole.FACILITY_MANAGER]: 2,
      [ClientUserRole.HR_MANAGER]: 3,
      [ClientUserRole.FINANCE_MANAGER]: 4,
      [ClientUserRole.REGIONAL_MANAGER]: 5,
    };
    return hierarchy[role] || 0;
  }

  static canManageClientRole(managerRole: ClientUserRole, targetRole: ClientUserRole): boolean {
    return this.getClientRoleHierarchyLevel(managerRole) >= this.getClientRoleHierarchyLevel(targetRole);
  }

  static getManageableClientRoles(role: ClientUserRole): ClientUserRole[] {
    const managerLevel = this.getClientRoleHierarchyLevel(role);
    return Object.values(ClientUserRole).filter(targetRole =>
      this.getClientRoleHierarchyLevel(targetRole) <= managerLevel
    );
  }

  static getRoleDescription(role: ClientUserRole): string {
    const descriptions = {
      [ClientUserRole.SECURITY_MANAGER]: 'Manages security operations, incidents, and guard deployments',
      [ClientUserRole.FACILITY_MANAGER]: 'Oversees facility operations, maintenance, and site management',
      [ClientUserRole.HR_MANAGER]: 'Handles employee relations, training, and compliance',
      [ClientUserRole.FINANCE_MANAGER]: 'Manages billing, invoices, and financial operations',
      [ClientUserRole.REGIONAL_MANAGER]: 'Oversees multi-site operations with comprehensive access',
    };
    return descriptions[role] || 'Role description not available';
  }

  static getPermissionsSummary(role: ClientUserRole): {
    dashboard: boolean;
    deployments: boolean;
    attendance: boolean;
    billing: boolean;
    incidents: boolean;
    reporting: boolean;
    multiSite: boolean;
  } {
    const permissions = this.getPermissionsForRole(role);
    return {
      dashboard: permissions.includes(ClientPortalPermissions.VIEW_CLIENT_DASHBOARD),
      deployments: permissions.includes(ClientPortalPermissions.VIEW_GUARD_DEPLOYMENTS),
      attendance: permissions.includes(ClientPortalPermissions.VIEW_ATTENDANCE_DASHBOARD),
      billing: permissions.includes(ClientPortalPermissions.VIEW_BILLING_DASHBOARD),
      incidents: permissions.includes(ClientPortalPermissions.VIEW_INCIDENTS),
      reporting: permissions.includes(ClientPortalPermissions.VIEW_OPERATIONAL_REPORTS) || 
                permissions.includes(ClientPortalPermissions.DOWNLOAD_REPORTS) ||
                permissions.includes(ClientPortalPermissions.VIEW_SITE_PERFORMANCE_REPORTS),
      multiSite: permissions.includes(ClientPortalPermissions.VIEW_MULTI_SITE_DASHBOARD),
    };
  }
}