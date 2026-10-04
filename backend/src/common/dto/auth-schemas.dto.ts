import { ApiProperty } from '@nestjs/swagger';

/**
 * Authentication and Authorization Schema Documentation
 * Comprehensive DTOs for documenting auth patterns in Swagger
 */

export class JWTTokenDto {
  @ApiProperty({
    description: 'JWT Access Token for API authentication',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c3JfMTIzNDU2IiwiaWF0IjoxNjE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
    pattern: '^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_.+/=]*$',
  })
  accessToken: string;

  @ApiProperty({
    description: 'JWT Refresh Token for token renewal',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c3JfMTIzNDU2IiwiaWF0IjoxNjE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
  })
  refreshToken: string;

  @ApiProperty({
    description: 'Token expiration time in seconds from issue',
    example: 3600,
    minimum: 300,
    maximum: 86400,
  })
  expiresIn: number;
}

export class UserRoleDto {
  @ApiProperty({
    description: 'User role in the system',
    enum: ['EMPLOYEE', 'SUPERVISOR', 'MANAGER', 'COMPANY_ADMIN', 'SUPER_ADMIN'],
    example: 'COMPANY_ADMIN',
  })
  role: string;

  @ApiProperty({
    description: 'Role hierarchy level (higher = more permissions)',
    example: 4,
    minimum: 1,
    maximum: 5,
  })
  hierarchyLevel: number;

  @ApiProperty({
    description: 'Permissions granted to this role',
    type: [String],
    example: ['CREATE_EMPLOYEE', 'READ_EMPLOYEE', 'UPDATE_EMPLOYEE', 'CREATE_PAYROLL'],
  })
  permissions: string[];
}

export class PermissionDto {
  @ApiProperty({
    description: 'Permission identifier',
    example: 'CREATE_EMPLOYEE',
    pattern: '^[A-Z_]+$',
  })
  permission: string;

  @ApiProperty({
    description: 'Permission category/module',
    example: 'EmployeePermissions',
    enum: [
      'UserPermissions',
      'CompanyPermissions',
      'ClientPermissions',
      'EmployeePermissions',
      'PayrollPermissions',
      'ReportingPermissions',
    ],
  })
  category: string;

  @ApiProperty({
    description: 'Human-readable description of the permission',
    example: 'Create new employee records and manage employee onboarding',
  })
  description: string;

  @ApiProperty({
    description: 'Whether this permission requires resource ownership',
    example: false,
  })
  requiresOwnership: boolean;
}

export class TenantContextDto {
  @ApiProperty({
    description: 'Tenant/Company identifier',
    example: 'cmp_acme-security-123',
    pattern: '^cmp_[a-z0-9-]+$',
  })
  tenantId: string;

  @ApiProperty({
    description: 'Tenant/Company name',
    example: 'Acme Security Services',
  })
  tenantName: string;

  @ApiProperty({
    description: 'User ID within the tenant',
    example: 'usr_john-doe-456',
    pattern: '^usr_[a-z0-9-]+$',
  })
  userId: string;

  @ApiProperty({
    description: 'User role within the tenant',
    enum: ['EMPLOYEE', 'SUPERVISOR', 'MANAGER', 'COMPANY_ADMIN', 'SUPER_ADMIN'],
    example: 'COMPANY_ADMIN',
  })
  userRole: string;
}

export class AuthorizationCheckDto {
  @ApiProperty({
    description: 'Permission being checked',
    example: 'CREATE_PAYROLL',
  })
  permission: string;

  @ApiProperty({
    description: 'Resource identifier (optional)',
    example: 'payroll_run_789',
    required: false,
  })
  resourceId?: string;

  @ApiProperty({
    description: 'Resource owner identifier (optional)',
    example: 'usr_employee-123',
    required: false,
  })
  resourceOwnerId?: string;

  @ApiProperty({
    description: 'Target tenant identifier (optional)',
    example: 'cmp_acme-security-123',
    required: false,
  })
  targetTenantId?: string;

  @ApiProperty({
    description: 'Whether the authorization check passed',
    example: true,
  })
  authorized: boolean;

  @ApiProperty({
    description: 'Reason for authorization result',
    example: 'User has CREATE_PAYROLL permission within tenant scope',
  })
  reason: string;
}

export class SecurityHeadersDto {
  @ApiProperty({
    description: 'JWT Bearer token in Authorization header',
    example: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    pattern: '^Bearer [A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_.+/=]*$',
  })
  authorization: string;

  @ApiProperty({
    description: 'API Key for server-to-server authentication (optional)',
    example: 'ak_1234567890abcdef',
    pattern: '^ak_[a-f0-9]{16,32}$',
    required: false,
  })
  'x-api-key'?: string;

  @ApiProperty({
    description: 'Request correlation ID for tracking',
    example: 'req_987654321fedcba',
    pattern: '^req_[a-f0-9]{16}$',
    required: false,
  })
  'x-request-id'?: string;

  @ApiProperty({
    description: 'Target tenant for multi-tenant operations (optional)',
    example: 'cmp_acme-security-123',
    required: false,
  })
  'x-tenant-id'?: string;
}

export class AuthenticationFlowDto {
  @ApiProperty({
    description: 'Authentication method used',
    enum: ['jwt', 'api-key', 'session'],
    example: 'jwt',
  })
  method: string;

  @ApiProperty({
    description: 'Authentication status',
    enum: ['authenticated', 'unauthenticated', 'expired', 'invalid'],
    example: 'authenticated',
  })
  status: string;

  @ApiProperty({
    description: 'User identity information',
    type: TenantContextDto,
  })
  identity: TenantContextDto;

  @ApiProperty({
    description: 'Token expiration timestamp',
    example: '2024-03-10T11:30:00Z',
  })
  expiresAt: string;

  @ApiProperty({
    description: 'Whether token needs refresh',
    example: false,
  })
  needsRefresh: boolean;
}

export class RoleHierarchyDto {
  @ApiProperty({
    description: 'All available user roles with hierarchy information',
    type: 'object',
    additionalProperties: {
      type: 'object',
      properties: {
        level: { type: 'number', description: 'Hierarchy level (1-5)' },
        description: { type: 'string', description: 'Role description' },
        permissions: { type: 'array', items: { type: 'string' }, description: 'Role permissions' },
        canManage: { type: 'array', items: { type: 'string' }, description: 'Roles this role can manage' },
      },
    },
    example: {
      EMPLOYEE: {
        level: 1,
        description: 'Basic employee with limited access to own data',
        permissions: ['READ_USER', 'READ_ATTENDANCE', 'CREATE_ATTENDANCE'],
        canManage: [],
      },
      SUPERVISOR: {
        level: 2,
        description: 'Site supervisor with team management capabilities',
        permissions: ['READ_USER', 'UPDATE_USER', 'READ_EMPLOYEE', 'APPROVE_ATTENDANCE'],
        canManage: ['EMPLOYEE'],
      },
      COMPANY_ADMIN: {
        level: 4,
        description: 'Company administrator with full company-wide access',
        permissions: ['ALL_COMPANY_PERMISSIONS'],
        canManage: ['EMPLOYEE', 'SUPERVISOR', 'MANAGER'],
      },
    },
  })
  roles: Record<string, {
    level: number;
    description: string;
    permissions: string[];
    canManage: string[];
  }>;
}

export class SecurityAuditLogDto {
  @ApiProperty({
    description: 'Security event type',
    enum: [
      'authentication_success',
      'authentication_failure',
      'authorization_granted',
      'authorization_denied',
      'token_refresh',
      'token_expired',
      'permission_check',
      'role_change',
      'tenant_access',
    ],
    example: 'authorization_denied',
  })
  eventType: string;

  @ApiProperty({
    description: 'Event timestamp',
    example: '2024-03-10T10:30:00Z',
  })
  timestamp: string;

  @ApiProperty({
    description: 'User identifier',
    example: 'usr_john-doe-456',
  })
  userId: string;

  @ApiProperty({
    description: 'User role at time of event',
    example: 'COMPANY_ADMIN',
  })
  userRole: string;

  @ApiProperty({
    description: 'Tenant context',
    example: 'cmp_acme-security-123',
  })
  tenantId: string;

  @ApiProperty({
    description: 'Action attempted',
    example: 'DELETE_EMPLOYEE',
  })
  action: string;

  @ApiProperty({
    description: 'Resource involved',
    example: 'employee:emp_jane-smith-789',
  })
  resource: string;

  @ApiProperty({
    description: 'Whether the action was allowed',
    example: false,
  })
  allowed: boolean;

  @ApiProperty({
    description: 'Additional event details',
    type: 'object',
    additionalProperties: true,
    example: {
      reason: 'User lacks DELETE_EMPLOYEE permission',
      ipAddress: '192.168.1.100',
      userAgent: 'Mozilla/5.0...',
    },
  })
  details: Record<string, any>;
}
// RBAC Authorization Examples
export class AuthorizationExampleDto {
  @ApiProperty({
    description: 'Example authorization header for API requests',
    example: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
  })
  authorization: string;

  @ApiProperty({
    description: 'Example tenant context header',
    example: 'tenant-123',
  })
  tenantId: string;

  @ApiProperty({
    description: 'User role context',
    enum: ['EMPLOYEE', 'SUPERVISOR', 'MANAGER', 'COMPANY_ADMIN', 'SUPER_ADMIN'],
    example: 'MANAGER',
  })
  userRole: string;

  @ApiProperty({
    description: 'Example permissions check response',
    examples: {
      hasPermission: {
        value: {
          permission: 'READ_EMPLOYEE',
          allowed: true,
          reason: 'User has MANAGER role with READ_EMPLOYEE permission',
        },
      },
      noPermission: {
        value: {
          permission: 'DELETE_COMPANY',
          allowed: false,
          reason: 'User role MANAGER does not have DELETE_COMPANY permission',
        },
      },
    },
  })
  permissionCheck: {
    permission: string;
    allowed: boolean;
    reason: string;
  };
}

// Multi-tenant Authorization Documentation
export class MultiTenantAuthDto {
  @ApiProperty({
    description: 'Tenant isolation ensures users can only access resources within their tenant',
    examples: {
      allowed: {
        value: {
          userTenantId: 'tenant-123',
          resourceTenantId: 'tenant-123',
          access: 'allowed',
          reason: 'User and resource are in the same tenant',
        },
      },
      denied: {
        value: {
          userTenantId: 'tenant-123',
          resourceTenantId: 'tenant-456',
          access: 'denied',
          reason: 'User cannot access resources from different tenant',
        },
      },
      superAdmin: {
        value: {
          userRole: 'SUPER_ADMIN',
          resourceTenantId: 'any-tenant',
          access: 'allowed',
          reason: 'Super admin can access resources across all tenants',
        },
      },
    },
  })
  tenantAccess: {
    userTenantId: string;
    resourceTenantId: string;
    access: 'allowed' | 'denied';
    reason: string;
  };
}

// Resource Ownership Authorization
export class ResourceOwnershipDto {
  @ApiProperty({
    description: 'Resource ownership authorization examples',
    examples: {
      owner: {
        value: {
          userId: 'user-123',
          resourceOwnerId: 'user-123',
          access: 'allowed',
          reason: 'User owns the resource',
        },
      },
      notOwnerWithPermission: {
        value: {
          userId: 'user-123',
          resourceOwnerId: 'user-456',
          userRole: 'MANAGER',
          requiredPermission: 'READ_EMPLOYEE',
          access: 'allowed',
          reason: 'User has required permission to access non-owned resource',
        },
      },
      notOwnerNoPermission: {
        value: {
          userId: 'user-123',
          resourceOwnerId: 'user-456',
          userRole: 'EMPLOYEE',
          requiredPermission: 'READ_EMPLOYEE',
          access: 'denied',
          reason: 'User does not own resource and lacks required permission',
        },
      },
    },
  })
  ownershipCheck: {
    userId: string;
    resourceOwnerId: string;
    userRole?: string;
    requiredPermission?: string;
    access: 'allowed' | 'denied';
    reason: string;
  };
}

// Authentication Error Responses
export class AuthErrorResponseDto {
  @ApiProperty({
    description: 'Common authentication error responses',
    examples: {
      invalidCredentials: {
        value: {
          statusCode: 401,
          error: 'INVALID_CREDENTIALS',
          message: 'Invalid username or password',
          timestamp: '2024-01-15T10:30:00Z',
        },
      },
      tokenExpired: {
        value: {
          statusCode: 401,
          error: 'TOKEN_EXPIRED',
          message: 'JWT token has expired',
          timestamp: '2024-01-15T10:30:00Z',
        },
      },
      insufficientPermissions: {
        value: {
          statusCode: 403,
          error: 'INSUFFICIENT_PERMISSIONS',
          message: 'User does not have required permissions',
          requiredPermission: 'READ_PAYROLL',
          userRole: 'EMPLOYEE',
          timestamp: '2024-01-15T10:30:00Z',
        },
      },
      tenantAccessDenied: {
        value: {
          statusCode: 403,
          error: 'TENANT_ACCESS_DENIED',
          message: 'User cannot access resources from different tenant',
          userTenantId: 'tenant-123',
          resourceTenantId: 'tenant-456',
          timestamp: '2024-01-15T10:30:00Z',
        },
      },
    },
  })
  authError: {
    statusCode: number;
    error: string;
    message: string;
    timestamp: string;
    requiredPermission?: string;
    userRole?: string;
    userTenantId?: string;
    resourceTenantId?: string;
  };
}

// API Security Best Practices Documentation
export class SecurityBestPracticesDto {
  @ApiProperty({
    description: 'Authentication best practices for API consumers',
    examples: {
      tokenStorage: {
        value: 'Store JWT tokens securely (httpOnly cookies or secure storage)',
      },
      tokenRefresh: {
        value: 'Implement automatic token refresh before expiration',
      },
      headerFormat: {
        value: 'Use Authorization: Bearer <token> header format',
      },
      tenantContext: {
        value: 'Include tenant context in multi-tenant operations',
      },
      errorHandling: {
        value: 'Handle 401/403 responses gracefully with proper user feedback',
      },
    },
  })
  bestPractices: Record<string, string>;

  @ApiProperty({
    description: 'Common security vulnerabilities to avoid',
    examples: {
      tokenExposure: {
        value: 'Never include tokens in URL parameters or logs',
      },
      tenantMixing: {
        value: 'Validate tenant context on every request to prevent data leakage',
      },
      permissionBypass: {
        value: 'Always verify permissions server-side, never trust client validation',
      },
      sessionHandling: {
        value: 'Implement proper logout and session invalidation',
      },
    },
  })
  securityVulnerabilities: Record<string, string>;
}