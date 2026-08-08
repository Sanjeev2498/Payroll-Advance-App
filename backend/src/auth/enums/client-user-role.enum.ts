export enum ClientUserRole {
  SECURITY_MANAGER = 'SECURITY_MANAGER',
  FACILITY_MANAGER = 'FACILITY_MANAGER',
  HR_MANAGER = 'HR_MANAGER',
  FINANCE_MANAGER = 'FINANCE_MANAGER',
  REGIONAL_MANAGER = 'REGIONAL_MANAGER',
}

export const ClientUserRoleDescriptions = {
  [ClientUserRole.SECURITY_MANAGER]: {
    description: 'Security Operations Manager - Can monitor attendance, incidents, and staffing',
    hierarchyLevel: 1,
    permissions: ['VIEW_DEPLOYMENTS', 'VIEW_INCIDENTS', 'VIEW_ATTENDANCE', 'MANAGE_SECURITY_STAFF']
  },
  [ClientUserRole.FACILITY_MANAGER]: {
    description: 'Facility Manager - Can view deployments and raise service requests',
    hierarchyLevel: 2,
    permissions: ['VIEW_DEPLOYMENTS', 'CREATE_SERVICE_REQUESTS', 'VIEW_SITE_STATUS']
  },
  [ClientUserRole.HR_MANAGER]: {
    description: 'HR Manager - Can view workforce information and performance metrics',
    hierarchyLevel: 3,
    permissions: ['VIEW_WORKFORCE', 'VIEW_PERFORMANCE', 'VIEW_ATTENDANCE_SUMMARY']
  },
  [ClientUserRole.FINANCE_MANAGER]: {
    description: 'Finance Manager - Can view invoices and payment history',
    hierarchyLevel: 2,
    permissions: ['VIEW_INVOICES', 'VIEW_PAYMENTS', 'VIEW_BILLING', 'DOWNLOAD_REPORTS']
  },
  [ClientUserRole.REGIONAL_MANAGER]: {
    description: 'Regional Manager - Can view multiple sites and comprehensive reports',
    hierarchyLevel: 0,
    permissions: ['VIEW_ALL_SITES', 'VIEW_REPORTS', 'VIEW_ANALYTICS', 'MANAGE_REGIONAL_OPERATIONS']
  }
};