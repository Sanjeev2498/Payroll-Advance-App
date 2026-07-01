import { SetMetadata } from '@nestjs/common';

// Data access levels for role-based encryption
export enum DataAccessLevel {
  PUBLIC = 'public',       // No encryption needed (names, basic info)
  SENSITIVE = 'sensitive', // Phone, email (HR+ can see)
  RESTRICTED = 'restricted', // Aadhaar, PAN (Admin only)  
  FINANCIAL = 'financial'  // Salary, rates (Admin only + audit)
}

// Role-based data visibility configuration
export interface RoleDataAccess {
  role: string;
  canDecrypt: DataAccessLevel[];
  canView: DataAccessLevel[];
}

export const ROLE_DATA_ACCESS_KEY = 'role_data_access';

/**
 * Decorator to define what data levels a role can access
 */
export const RoleDataAccess = (config: RoleDataAccess) => 
  SetMetadata(ROLE_DATA_ACCESS_KEY, config);

/**
 * Pre-defined role access configurations
 */
export const EMPLOYEE_ACCESS: RoleDataAccess = {
  role: 'EMPLOYEE',
  canDecrypt: [DataAccessLevel.PUBLIC],
  canView: [DataAccessLevel.PUBLIC, DataAccessLevel.SENSITIVE], // Can see masked sensitive data
};

export const HR_ACCESS: RoleDataAccess = {
  role: 'MANAGER',
  canDecrypt: [DataAccessLevel.PUBLIC, DataAccessLevel.SENSITIVE],
  canView: [DataAccessLevel.PUBLIC, DataAccessLevel.SENSITIVE],
};

export const SUPERVISOR_ACCESS: RoleDataAccess = {
  role: 'SUPERVISOR', 
  canDecrypt: [DataAccessLevel.PUBLIC, DataAccessLevel.SENSITIVE],
  canView: [DataAccessLevel.PUBLIC, DataAccessLevel.SENSITIVE],
};

export const ADMIN_ACCESS: RoleDataAccess = {
  role: 'COMPANY_ADMIN',
  canDecrypt: [DataAccessLevel.PUBLIC, DataAccessLevel.SENSITIVE, DataAccessLevel.RESTRICTED, DataAccessLevel.FINANCIAL],
  canView: [DataAccessLevel.PUBLIC, DataAccessLevel.SENSITIVE, DataAccessLevel.RESTRICTED, DataAccessLevel.FINANCIAL],
};

export const SUPER_ADMIN_ACCESS: RoleDataAccess = {
  role: 'SUPER_ADMIN',
  canDecrypt: [DataAccessLevel.PUBLIC, DataAccessLevel.SENSITIVE, DataAccessLevel.RESTRICTED, DataAccessLevel.FINANCIAL],
  canView: [DataAccessLevel.PUBLIC, DataAccessLevel.SENSITIVE, DataAccessLevel.RESTRICTED, DataAccessLevel.FINANCIAL],
};

/**
 * Get role access configuration by role name
 */
export function getRoleAccess(role: string): RoleDataAccess {
  const roleAccessMap = {
    'EMPLOYEE': EMPLOYEE_ACCESS,
    'SUPERVISOR': SUPERVISOR_ACCESS,
    'MANAGER': HR_ACCESS,
    'COMPANY_ADMIN': ADMIN_ACCESS,
    'SUPER_ADMIN': SUPER_ADMIN_ACCESS,
  };

  return roleAccessMap[role] || EMPLOYEE_ACCESS; // Default to most restrictive
}

/**
 * Check if a role can decrypt specific data level
 */
export function canRoleDecrypt(role: string, dataLevel: DataAccessLevel): boolean {
  const access = getRoleAccess(role);
  return access.canDecrypt.includes(dataLevel);
}

/**
 * Check if a role can view (even masked) specific data level  
 */
export function canRoleView(role: string, dataLevel: DataAccessLevel): boolean {
  const access = getRoleAccess(role);
  return access.canView.includes(dataLevel);
}