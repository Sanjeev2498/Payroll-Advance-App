# Role-Based Access Control (RBAC) System

This document provides comprehensive documentation for the RBAC system implementation in the Security Workforce & Payroll Management System.

## Overview

The RBAC system provides fine-grained access control through a combination of:

- **Role-based permissions**: Each user role has a predefined set of permissions
- **Tenant-aware authorization**: All permissions are scoped to the user's tenant
- **Resource ownership**: Users can access their own resources regardless of permissions
- **Hierarchical roles**: Higher-level roles inherit permissions from lower-level roles

## Architecture Components

### 1. Permissions System (`permissions.enum.ts`)

Defines all available permissions organized by domain:

```typescript
// Example permissions
export enum UserPermissions {
  CREATE_USER = 'user:create',
  READ_USER = 'user:read',
  UPDATE_USER = 'user:update',
  DELETE_USER = 'user:delete',
}

export enum PayrollPermissions {
  PROCESS_PAYROLL = 'payroll:process',
  VIEW_PAYROLL_REPORTS = 'payroll:view_reports',
}
```

### 2. Role Configuration (`role-permissions.config.ts`)

Maps user roles to their allowed permissions with hierarchical inheritance:

```typescript
// Role hierarchy (lowest to highest)
EMPLOYEE → SUPERVISOR → MANAGER → COMPANY_ADMIN → SUPER_ADMIN
```

**Role Capabilities:**
- **EMPLOYEE**: Basic read access to own data, attendance management
- **SUPERVISOR**: Employee permissions + team supervision capabilities
- **MANAGER**: Supervisor permissions + operational management
- **COMPANY_ADMIN**: Manager permissions + company-wide administration
- **SUPER_ADMIN**: All permissions (platform-wide access)

### 3. RBAC Service (`rbac.service.ts`)

Provides centralized authorization logic:

```typescript
@Injectable()
export class RbacService {
  // Check if user has specific permission
  hasPermission(permission: Permission): boolean

  // Check tenant access
  canAccessTenant(targetTenantId: string): boolean

  // Check resource ownership
  canAccessResource(resourceOwnerId?: string, resourceTenantId?: string): boolean
}
```

### 4. Guards (`permissions.guard.ts`)

Enforces permissions at the endpoint level:

```typescript
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
```

### 5. Decorators (`permissions.decorator.ts`)

Provides declarative permission requirements:

```typescript
// Basic permission requirement
@RequirePermissions([UserPermissions.CREATE_USER])

// Multiple permissions (any)
@RequirePermissions([UserPermissions.CREATE_USER, UserPermissions.UPDATE_USER])

// Multiple permissions (all required)
@RequirePermissions([...], { requireAll: true })

// Allow resource owners
@RequirePermissions([...], { allowOwner: true })

// Convenience decorators
@RequireUserRead()
@RequireEmployeeManage()
@RequirePayrollProcess()
```

## Usage Examples

### Basic Permission Protection

```typescript
@Controller('users')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class UserController {
  
  @Get()
  @RequireUserRead()
  async getUsers() {
    // Only users with READ_USER permission can access
  }
  
  @Post()
  @RequirePermissions([UserPermissions.CREATE_USER])
  async createUser(@Body() userData: CreateUserDto) {
    // Only users with CREATE_USER permission can access
  }
}
```

### Resource Ownership Pattern

```typescript
@Get('profile/:id')
@RequirePermissions([UserPermissions.READ_USER], { allowOwner: true })
async getProfile(
  @Param('id') userId: string,
  @CurrentUserId() currentUserId: string
) {
  // Users can access their own profile OR have READ permission for others
}
```

### Multiple Permission Requirements

```typescript
@Put('employees/:id')
@RequirePermissions(
  [EmployeePermissions.READ_EMPLOYEE, EmployeePermissions.UPDATE_EMPLOYEE],
  { requireAll: true }
)
async updateEmployee(@Param('id') id: string) {
  // Requires BOTH read AND update permissions
}
```

### Using Current User Context

```typescript
@Post('attendance')
@RequirePermissions([AttendancePermissions.CREATE_ATTENDANCE])
async createAttendance(
  @Body() attendanceData: CreateAttendanceDto,
  @CurrentUserId() userId: string,
  @CurrentTenantId() tenantId: string,
  @CurrentUserRole() userRole: UserRole
) {
  // Access to current user context
}
```

## Integration with Existing Systems

### Tenant Context Integration

The RBAC system is fully integrated with the existing tenant context system:

```typescript
// Middleware automatically sets tenant context
export class TenantContextMiddleware implements NestMiddleware {
  use(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    if (user) {
      this.tenantContextService.setContext(tenantId, user.id, user.role);
    }
  }
}
```

### Database RLS Integration

RBAC works alongside Row-Level Security policies:

```sql
-- RLS policies ensure data isolation at database level
CREATE POLICY tenant_isolation ON employees
  USING (company_id = current_setting('app.tenant_id')::uuid);
```

## Permission Matrix

| Role | User Mgmt | Employee Mgmt | Payroll | Billing | System Admin |
|------|-----------|---------------|---------|---------|--------------|
| Employee | Read (own) | Read (own) | Read (own) | - | - |
| Supervisor | Update | Read/Update | Read | - | - |
| Manager | Create/Update/Delete | Full | Create/View | Read | - |
| Company Admin | Full + Roles | Full | Process/Approve | Full | Limited |
| Super Admin | Full | Full | Full | Full | Full |

## Security Features

### 1. Tenant Isolation
- All permissions are automatically scoped to user's tenant
- Super admins can access cross-tenant resources
- Prevents data leakage between tenants

### 2. Audit Logging
```typescript
// Automatic audit logging for all authorization events
this.rbacService.logAuthorizationEvent(
  'create_user',
  'User',
  allowed,
  { requiredPermissions, userContext }
);
```

### 3. Error Handling
- Consistent error messages for permission denials
- Custom error messages per endpoint
- Proper HTTP status codes (401 vs 403)

### 4. Performance Optimization
- Request-scoped services minimize database queries
- Cached permission lookups within request
- Efficient role hierarchy checking

## Testing

The RBAC system includes comprehensive unit tests:

```bash
# Run RBAC tests
npm test -- --testPathPattern="rbac.*spec.ts"
```

Test coverage includes:
- Permission inheritance across roles
- Tenant access validation
- Resource ownership checking
- Edge cases and error conditions

## Configuration

### Adding New Permissions

1. Add permission to appropriate enum in `permissions.enum.ts`:
```typescript
export enum NewDomainPermissions {
  NEW_PERMISSION = 'new_domain:new_permission',
}
```

2. Update role mappings in `role-permissions.config.ts`:
```typescript
[UserRole.MANAGER]: [
  // existing permissions...
  NewDomainPermissions.NEW_PERMISSION,
]
```

3. Create convenience decorators if needed:
```typescript
export const RequireNewDomainAccess = () => 
  RequirePermissions([NewDomainPermissions.NEW_PERMISSION]);
```

### Adding New Roles

1. Add role to Prisma enum in `schema.prisma`
2. Update role hierarchy in `getRoleHierarchyLevel()`
3. Define permissions for new role in `ROLE_PERMISSIONS`
4. Run database migration

## Best Practices

### 1. Principle of Least Privilege
- Grant minimum permissions required for role functions
- Use specific permissions rather than broad access
- Regularly review and audit role permissions

### 2. Consistent Permission Naming
- Use domain:action pattern (e.g., `user:create`)
- Group related permissions by domain
- Use clear, descriptive permission names

### 3. Defensive Authorization
- Always use guards on protected endpoints
- Validate permissions at service level for sensitive operations
- Implement resource ownership checks where appropriate

### 4. Error Handling
- Use appropriate HTTP status codes
- Provide clear error messages
- Log authorization failures for security monitoring

## Migration from Old System

The new RBAC system is backward compatible with the existing role-based system:

```typescript
// Old system (still works)
@AdminOnly()
@ManagerOrAbove()

// New system (recommended)
@RequirePermissions([UserPermissions.MANAGE_USER_ROLES])
@RequireUserManage()
```

Gradual migration approach:
1. Keep existing decorators functional
2. Introduce RBAC decorators on new endpoints
3. Gradually migrate existing endpoints
4. Phase out old decorators when migration complete

## Troubleshooting

### Common Issues

**Permission Denied Errors:**
1. Check user role in database
2. Verify permission is assigned to role
3. Confirm tenant context is set correctly
4. Check for typos in permission names

**Compilation Errors:**
1. Ensure all permission enums are exported
2. Check for circular dependencies
3. Verify TypeScript types are correct

**Performance Issues:**
1. Monitor permission check frequency
2. Consider caching for frequently checked permissions
3. Optimize database queries for role lookups

### Debug Mode

Enable detailed logging:
```typescript
// In rbac.service.ts
this.logger.debug(`Permission check - Role: ${userRole}, Permission: ${permission}`);
```

## Future Enhancements

Planned improvements:
1. **Dynamic Permissions**: Runtime permission configuration
2. **Permission Groups**: Logical grouping of related permissions
3. **Time-based Access**: Temporary permission grants
4. **Audit Dashboard**: Web interface for permission audit logs
5. **Permission Delegation**: Temporary permission sharing between users