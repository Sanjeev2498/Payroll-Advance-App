# Role-Based Access Control (RBAC) System

This document provides comprehensive documentation for the enhanced RBAC system implementation in the Security Workforce & Payroll Management System.

## Overview

The RBAC system provides enterprise-grade access control through a combination of:

- **Role-based permissions**: Each user role has a predefined set of permissions with hierarchical inheritance
- **Resource-level authorization**: Fine-grained access control for specific resources and business entities
- **Dynamic permission rules**: Runtime permission evaluation based on context and business logic
- **Tenant-aware authorization**: All permissions are scoped to the user's tenant with cross-tenant capabilities for super admins
- **Advanced authorization patterns**: Support for ownership, delegation, and custom validation scenarios

## Enhanced Architecture Components

### 1. Core Services

#### RbacService (`rbac.service.ts`)
Provides fundamental authorization logic:
```typescript
// Basic permission checking
rbacService.hasPermission(UserPermissions.CREATE_USER)
rbacService.hasAllPermissions([UserPermissions.READ_USER, UserPermissions.UPDATE_USER])

// Tenant access validation
rbacService.canAccessTenant(targetTenantId)

// Resource ownership checking
rbacService.canAccessResource(resourceOwnerId, resourceTenantId, requiredPermission)
```

#### ResourceAuthorizationService (`resource-authorization.service.ts`) 
**NEW**: Provides resource-level authorization with advanced patterns:
```typescript
// Resource access authorization
await resourceAuthService.authorizeResourceAccess(resourceId, {
  resourceType: 'employee_record',
  allowOwner: true,
  allowTenantAdmin: true,
  requiredPermission: EmployeePermissions.READ_EMPLOYEE,
  customValidator: async (context) => {
    // Custom business logic validation
    return context.resourceData?.departmentId === userDepartmentId;
  }
})

// Bulk authorization
const result = await resourceAuthService.authorizeBulkAction(
  'update', 'employee_record', employeeIds, config
)

// Filter resources based on authorization
const authorizedEmployees = await resourceAuthService.filterAuthorizedResources(
  allEmployees, 'employee_record', 'read', config
)
```

#### RbacUtilitiesService (`rbac-utilities.service.ts`)
**NEW**: Advanced permission validation and dynamic rules:
```typescript
// Detailed permission validation
const validation = await rbacUtilities.validatePermissions(
  [UserPermissions.CREATE_USER], 'create_user_action', resourceData
)

// Dynamic rule evaluation
const result = await rbacUtilities.canPerformActionWithContext(
  'emergency_access', 'system', resourceId, resourceData, requestData
)

// Register custom dynamic rules
rbacUtilities.registerDynamicRule({
  id: 'emergency_overtime_approval',
  description: 'Allow overtime approval during payroll periods',
  condition: (context) => isPayrollPeriod() && context.action === 'approve_overtime',
  validator: (context) => isManagerOrAbove(context.userRole)
})
```

### 2. Enhanced Guards

#### ResourceAuthorizationGuard (`resource-authorization.guard.ts`)
**NEW**: Enforces resource-level authorization:
```typescript
@UseGuards(JwtAuthGuard, TenantGuard, ResourceAuthorizationGuard)
@RequireResourceAuth({
  resourceType: 'user_profile',
  allowOwner: true,
  requiredPermission: UserPermissions.READ_USER
})
async getProfile(@Param('id') id: string) { ... }
```

#### CompositeAuthorizationGuard (`resource-authorization.guard.ts`)
**NEW**: Combines multiple authorization strategies:
```typescript
@UseGuards(JwtAuthGuard, TenantGuard, CompositeAuthorizationGuard)
export class SecureController { ... }
```

### 3. Enhanced Decorators

#### Resource Authorization Decorators (`resource-authorization.decorator.ts`)
**NEW**: Declarative resource-level authorization:
```typescript
// Basic resource authorization
@RequireResourceAuth({
  resourceType: 'employee_record',
  allowOwner: true,
  allowTenantAdmin: true
})

// Convenience decorators
@RequireUserProfileAccess()
@RequireEmployeeAccess()
@RequireAttendanceAccess()
@RequirePayrollAccess()

// Parameter decorators
async updateProfile(
  @ResourceId() resourceId: string,
  @ResourceAuthContext() authContext: any,
  @UserAuthCapabilities() userCaps: any
) { ... }
```

### 4. Enhanced Middleware

#### TenantPermissionMiddleware (`tenant-permission.middleware.ts`)
**NEW**: Automatic permission context injection:
```typescript
// Automatically adds permission context to requests
interface AuthenticatedRequest extends Request {
  permissionContext?: {
    userId: string | null;
    userRole: string | null;
    tenantId: string | null;
    permissions: string[];
    hasPermission: (permission: string) => boolean;
    canAccessTenant: (targetTenantId: string) => boolean;
    canAccessResource: (ownerId?: string, tenantId?: string, permission?: any) => boolean;
  };
}
```

## Advanced Usage Patterns

### 1. Resource Ownership Authorization

```typescript
@Controller('users')
export class UserController {
  @Get(':id/profile')
  @RequireUserProfileAccess() // Allows owners or admins
  async getProfile(
    @Param('id') userId: string,
    @CurrentUserId() currentUserId: string
  ) {
    const isOwnProfile = userId === currentUserId;
    // Users can access their own profile OR have admin permissions
  }
}
```

### 2. Dynamic Permission Rules

```typescript
@Injectable()
export class PayrollService {
  constructor(private rbacUtilities: RbacUtilitiesService) {
    // Register dynamic rule for overtime approval
    this.rbacUtilities.registerDynamicRule({
      id: 'overtime_approval_window',
      description: 'Allow overtime approval during payroll periods',
      priority: 80,
      condition: (context) => {
        const dayOfMonth = new Date().getDate();
        return dayOfMonth >= 26 && context.action === 'approve_overtime';
      },
      requiredPermissions: [AttendancePermissions.APPROVE_ATTENDANCE_CORRECTIONS],
      validator: (context) => isSupervisorOrAbove(context.userRole)
    });
  }
}
```

### 3. Complex Resource Authorization

```typescript
@Put('employees/:id/salary')
@RequirePermissions([EmployeePermissions.UPDATE_EMPLOYEE])
async updateSalary(
  @Param('id') employeeId: string,
  @Body() salaryData: any
) {
  // Programmatic resource authorization with custom config
  await this.resourceAuthService.requireResourceAccess(employeeId, {
    resourceType: 'employee_salary',
    allowOwner: false, // Salary changes require admin permissions
    allowTenantAdmin: true,
    requiredPermission: EmployeePermissions.VIEW_EMPLOYEE_PAYROLL,
    customValidator: async (context) => {
      // Custom validation: check if user manages this employee
      return await this.organizationService.isDirectManager(
        context.userId, context.resourceData?.employeeId
      );
    }
  }, salaryData, 'Salary modifications require management authorization');
}
```

### 4. Bulk Operations with Authorization

```typescript
@Post('employees/bulk-update')
async bulkUpdate(@Body() updates: Array<{id: string, data: any}>) {
  const employeeIds = updates.map(u => u.id);
  
  // Check bulk authorization
  const authResult = await this.resourceAuthService.authorizeBulkAction(
    'update', 'employee_record', employeeIds, {
      allowTenantAdmin: true,
      requiredPermission: EmployeePermissions.UPDATE_EMPLOYEE
    }
  );

  // Process only authorized updates
  const authorizedUpdates = updates.filter(u => 
    authResult.authorized.includes(u.id)
  );

  return {
    processed: authorizedUpdates.length,
    denied: authResult.denied.length,
    results: await this.processUpdates(authorizedUpdates)
  };
}
```

### 5. Permission Analysis and Debugging

```typescript
@Get('permissions/analysis')
async getPermissionAnalysis() {
  const analysis = this.rbacUtilities.getPermissionAnalysis();
  
  return {
    currentRole: analysis.userRole,
    totalPermissions: analysis.permissionCount,
    hierarchyLevel: analysis.hierarchyLevel,
    canManageRoles: analysis.canManageRoles,
    tenantAccess: analysis.tenantAccess,
    permissions: analysis.permissions,
    
    // Specific capability checks
    canProcessPayroll: analysis.permissions.includes('payroll:process'),
    canManageEmployees: analysis.permissions.some(p => p.startsWith('employee:')),
    canAccessReports: analysis.permissions.some(p => p.includes('report'))
  };
}
```

## Permission Matrix (Enhanced)

| Role | User Mgmt | Employee Mgmt | Payroll | Billing | System Admin | Resource Access |
|------|-----------|---------------|---------|---------|--------------|-----------------|
| Employee | Read (own) | Read (own) | Read (own) | - | - | Own resources only |
| Supervisor | Update (team) | Read/Update (team) | Read (team) | - | - | Team resources + own |
| Manager | Create/Update/Delete | Full (dept) | Create/View | Read | - | Department resources |
| Company Admin | Full + Roles | Full | Process/Approve | Full | Limited | Tenant-wide resources |
| Super Admin | Full | Full | Full | Full | Full | Cross-tenant access |

## Enhanced Security Features

### 1. Multi-Level Authorization
- **Role-based**: Traditional role hierarchy with permission inheritance
- **Resource-level**: Fine-grained access control per resource instance
- **Dynamic rules**: Context-aware permission evaluation
- **Custom validation**: Business logic integration

### 2. Comprehensive Audit Logging
```typescript
// Automatic logging for all authorization events
{
  event: 'resource_authorization_success',
  userId: 'user-123',
  resourceType: 'employee_record',
  resourceId: 'emp-456',
  reason: 'tenant_admin_access',
  timestamp: '2024-01-15T10:30:00Z'
}
```

### 3. Advanced Tenant Isolation
- **Database-level**: RLS policies enforce data separation
- **Application-level**: Service-layer tenant context validation
- **API-level**: Request-scoped tenant context injection
- **Cross-tenant**: Super admin capabilities with audit trails

### 4. Performance Optimization
- **Request-scoped caching**: Permission lookups cached per request
- **Efficient bulk operations**: Batch authorization checks
- **Smart filtering**: Database-level permission filtering where possible
- **Minimal queries**: Context reuse across authorization checks

## Migration and Integration Guide

### Existing System Integration
The enhanced RBAC system is backward compatible:

```typescript
// Old system (still works)
@AdminOnly()
@ManagerOrAbove()

// New system (recommended)
@RequirePermissions([UserPermissions.MANAGE_USER_ROLES])
@RequireResourceAuth({ resourceType: 'user_profile', allowOwner: true })
```

### Step-by-Step Migration
1. **Keep existing decorators** functional during transition
2. **Add new RBAC decorators** to new endpoints
3. **Gradually migrate existing endpoints** to new system
4. **Register dynamic rules** for complex business logic
5. **Phase out old decorators** when migration is complete

### Performance Considerations
```typescript
// Efficient: Use bulk operations for multiple resources
const authResults = await resourceAuthService.authorizeBulkAction(
  'read', 'employee_record', employeeIds, config
);

// Efficient: Filter at service level
const authorizedEmployees = await resourceAuthService.filterAuthorizedResources(
  employees, 'employee_record', 'read', config
);

// Avoid: Multiple individual authorization calls in loops
// for (const employee of employees) {
//   const canAccess = await resourceAuthService.authorizeResourceAccess(...);
// }
```

## Testing Strategy

### Unit Tests
- **Service methods**: All authorization methods with mock contexts
- **Guard behavior**: Request handling and permission enforcement
- **Dynamic rules**: Rule registration, evaluation, and priority handling
- **Edge cases**: Cross-tenant access, invalid contexts, error scenarios

### Integration Tests
- **End-to-end workflows**: Complete authorization chains
- **Multi-tenant scenarios**: Data isolation validation  
- **Performance tests**: Bulk operations and filtering efficiency
- **Security tests**: Unauthorized access attempts and boundary conditions

### Property-Based Tests
- **Permission consistency**: Role hierarchies maintain expected relationships
- **Tenant isolation**: No cross-tenant data leakage under any conditions
- **Authorization completeness**: All protected resources have proper authorization

## Troubleshooting

### Common Issues

**Permission Denied Errors:**
1. Check user role and tenant context
2. Verify required permissions are assigned to role
3. Confirm resource ownership or admin privileges
4. Review dynamic rule conditions and validators

**Performance Issues:**
1. Monitor bulk authorization usage vs individual checks
2. Check for excessive permission lookups in loops
3. Validate database query efficiency with RLS policies
4. Consider caching for frequently accessed permissions

**Configuration Errors:**
1. Ensure all new services are properly injected
2. Verify guard order in decorator chain
3. Check dynamic rule registration timing
4. Validate permission enum consistency

### Debug Mode

```typescript
// Enable detailed logging in development
const validation = await rbacUtilities.validatePermissions(
  requiredPermissions, action, resourceData
);

console.log('Permission Validation:', {
  allowed: validation.allowed,
  reason: validation.reason,
  missing: validation.missingPermissions,
  alternatives: validation.alternativeActions
});
```

## Future Enhancements

Planned improvements include:
1. **Permission delegation**: Temporary permission sharing between users
2. **Time-based access**: Scheduled permission grants and revocation
3. **Approval workflows**: Multi-step authorization for sensitive operations
4. **Advanced analytics**: Permission usage reporting and optimization
5. **External integration**: LDAP/Active Directory role synchronization
6. **Mobile optimization**: Lightweight permission checking for mobile apps

## API Reference

### Core Methods

#### RbacService
- `hasPermission(permission: Permission): boolean`
- `hasAllPermissions(permissions: Permission[]): boolean`
- `canAccessTenant(tenantId: string): boolean`
- `canAccessResource(ownerId?, tenantId?, permission?): boolean`
- `getUserPermissions(): Permission[]`
- `getAssignableRoles(): UserRole[]`

#### ResourceAuthorizationService
- `authorizeResourceAccess(resourceId: string, config: ResourceAuthConfig): Promise<boolean>`
- `requireResourceAccess(resourceId: string, config: ResourceAuthConfig): Promise<void>`
- `authorizeBulkAction(action: string, resourceType: string, resourceIds: string[]): Promise<{authorized: string[], denied: string[]}>`
- `filterAuthorizedResources<T>(resources: T[], resourceType: string): Promise<T[]>`

#### RbacUtilitiesService  
- `validatePermissions(permissions: Permission[], action: string): Promise<PermissionValidationResult>`
- `canPerformActionWithContext(action: string, resourceType?: string): Promise<PermissionValidationResult>`
- `registerDynamicRule(rule: DynamicPermissionRule): void`
- `getPermissionAnalysis(): PermissionAnalysis`

For complete examples and advanced usage patterns, see `enhanced-usage-examples.ts`.