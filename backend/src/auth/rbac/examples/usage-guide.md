# RBAC System Usage Guide

This guide provides practical examples of how to use the Role-Based Access Control (RBAC) system in the Security Workforce & Payroll Management System.

## Quick Start

### 1. Basic Controller Protection

```typescript
import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { TenantGuard } from '../../common/tenant.guard';
import { PermissionsGuard } from '../guards/permissions.guard';
import { RequirePermissions } from '../decorators/permissions.decorator';
import { UserPermissions } from '../enums/permissions.enum';

@Controller('users')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class UserController {
  @Get()
  @RequirePermissions([UserPermissions.READ_USER])
  async getUsers() {
    // Only users with READ_USER permission can access
    return { users: [] };
  }

  @Post()
  @RequirePermissions([UserPermissions.CREATE_USER])
  async createUser(@Body() userData: CreateUserDto) {
    // Only users with CREATE_USER permission can access
    return { message: 'User created' };
  }
}
```

### 2. Global Guards Setup

The RBAC system is configured globally in `app.module.ts`:

```typescript
@Module({
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard, // 1. Authentication
    },
    {
      provide: APP_GUARD,
      useClass: TenantGuard, // 2. Tenant context
    },
    {
      provide: APP_GUARD,
      useClass: PermissionsGuard, // 3. RBAC permissions
    },
  ],
})
export class AppModule {}
```

## Permission Decorators

### Basic Permission Requirements

```typescript
// Single permission
@RequirePermissions([UserPermissions.READ_USER])

// Multiple permissions (any one required)
@RequirePermissions([UserPermissions.CREATE_USER, UserPermissions.UPDATE_USER])

// Multiple permissions (all required)
@RequirePermissions(
  [UserPermissions.READ_USER, UserPermissions.UPDATE_USER],
  { requireAll: true }
)
```

### Resource Ownership

```typescript
// Allow resource owners to access regardless of permissions
@RequirePermissions([UserPermissions.READ_USER], { allowOwner: true })
async getProfile(@Param('id') userId: string) {
  // Users can access their own profile OR have READ permission for others
}
```

### Convenience Decorators

```typescript
// Pre-defined permission sets
@RequireUserRead()        // Requires READ_USER
@RequireUserWrite()       // Requires CREATE_USER or UPDATE_USER
@RequireUserManage()      // Requires CREATE_USER, READ_USER, UPDATE_USER, DELETE_USER

@RequireEmployeeRead()    // Employee read permissions
@RequireEmployeeManage()  // Full employee management

@RequirePayrollRead()     // Payroll read access
@RequirePayrollProcess()  // Payroll processing permissions
```

### Custom Error Messages

```typescript
@RequirePermissions([UserPermissions.DELETE_USER], {
  errorMessage: 'This operation requires administrator privileges. Contact your manager.'
})
async deleteUser(@Param('id') id: string) {
  // Custom error message for better UX
}
```

## User Context Decorators

### Accessing Current User Information

```typescript
import {
  CurrentUser,
  CurrentUserId,
  CurrentUserRole,
  CurrentTenantId,
  CurrentUserContext,
} from '../decorators/current-user.decorator';

@Get('profile')
async getProfile(
  @CurrentUserId() userId: string,
  @CurrentUserRole() role: UserRole,
  @CurrentTenantId() tenantId: string,
  @CurrentUser() user: AuthenticatedUser,
) {
  return {
    userId,
    role,
    tenantId,
    user,
  };
}
```

## Role Hierarchy and Permissions

### Role Levels (Lowest to Highest)

1. **EMPLOYEE** - Basic access to own data and attendance
2. **SUPERVISOR** - Employee permissions + team supervision
3. **MANAGER** - Supervisor permissions + operational management
4. **COMPANY_ADMIN** - Manager permissions + company-wide admin
5. **SUPER_ADMIN** - All permissions across all tenants

### Permission Categories

| Category | Examples | Typical Roles |
|----------|----------|---------------|
| User Management | `user:create`, `user:delete` | Manager+ |
| Employee Management | `employee:create`, `employee:update` | Supervisor+ |
| Attendance | `attendance:create`, `attendance:read` | All employees |
| Payroll | `payroll:process`, `payroll:approve` | Company Admin+ |
| Billing | `billing:create_invoice`, `billing:send` | Company Admin+ |
| System | `system:manage_settings` | Super Admin only |

## RBAC Service Usage

### Direct Permission Checking

```typescript
import { RbacService } from '../rbac/rbac.service';

@Injectable()
export class SomeService {
  constructor(private readonly rbacService: RbacService) {}

  async performOperation() {
    // Check specific permission
    if (!this.rbacService.hasPermission(UserPermissions.CREATE_USER)) {
      throw new ForbiddenException('Insufficient privileges');
    }

    // Check multiple permissions
    const hasAny = this.rbacService.hasAnyPermission([
      UserPermissions.CREATE_USER,
      UserPermissions.UPDATE_USER,
    ]);

    const hasAll = this.rbacService.hasAllPermissions([
      PayrollPermissions.PROCESS_PAYROLL,
      PayrollPermissions.APPROVE_PAYROLL,
    ]);

    // Get all user permissions
    const permissions = this.rbacService.getUserPermissions();
  }
}
```

### Tenant Access Validation

```typescript
async checkTenantAccess(targetTenantId: string) {
  if (!this.rbacService.canAccessTenant(targetTenantId)) {
    throw new ForbiddenException('Access denied to tenant resources');
  }
}
```

### Resource Ownership Validation

```typescript
async checkResourceAccess(resourceOwnerId: string) {
  const canAccess = this.rbacService.canAccessResource(
    resourceOwnerId,
    undefined, // Uses current tenant
    EmployeePermissions.READ_EMPLOYEE // Required permission if not owner
  );

  if (!canAccess) {
    throw new ForbiddenException('Access denied to resource');
  }
}
```

## Common Patterns

### Employee Self-Service with Admin Override

```typescript
@Get('employees/:id')
@RequirePermissions([EmployeePermissions.READ_EMPLOYEE], { allowOwner: true })
async getEmployee(
  @Param('id') employeeId: string,
  @CurrentUserId() currentUserId: string,
) {
  const isOwnRecord = employeeId === currentUserId;
  
  if (isOwnRecord) {
    // Return limited self-service view
    return this.getEmployeeSelfView(employeeId);
  } else {
    // Return full admin view
    return this.getEmployeeAdminView(employeeId);
  }
}
```

### Hierarchical Data Access

```typescript
@Get('team/:teamId/attendance')
@RequirePermissions([AttendancePermissions.VIEW_ATTENDANCE_REPORTS])
async getTeamAttendance(
  @Param('teamId') teamId: string,
  @CurrentUserRole() role: UserRole,
) {
  // Supervisors can only see their direct teams
  if (role === UserRole.SUPERVISOR) {
    await this.validateSupervisorTeamAccess(teamId);
  }
  
  // Managers and above can see all teams in their tenant
  return this.getAttendanceReports(teamId);
}
```

### Multi-Permission Workflows

```typescript
@Post('payroll/runs/:id/finalize')
@RequirePermissions(
  [PayrollPermissions.PROCESS_PAYROLL, PayrollPermissions.APPROVE_PAYROLL],
  { requireAll: true }
)
async finalizePayroll(@Param('id') runId: string) {
  // Requires both process AND approve permissions
  // Typically only company admins have both
  return this.payrollService.finalize(runId);
}
```

### Conditional Permission Logic

```typescript
@Put('employees/:id/salary')
async updateSalary(
  @Param('id') employeeId: string,
  @Body() salaryUpdate: UpdateSalaryDto,
) {
  // Check permissions programmatically
  const canManagePayroll = this.rbacService.hasPermission(
    EmployeePermissions.VIEW_EMPLOYEE_PAYROLL
  );

  const canManageHighSalaries = this.rbacService.hasPermission(
    PayrollPermissions.MANAGE_PAYROLL_SETTINGS
  );

  if (salaryUpdate.amount > 100000 && !canManageHighSalaries) {
    throw new ForbiddenException('High salary adjustments require special permissions');
  }

  if (!canManagePayroll) {
    throw new ForbiddenException('Cannot modify employee salary information');
  }

  return this.employeeService.updateSalary(employeeId, salaryUpdate);
}
```

## Testing RBAC

### Unit Testing

```typescript
describe('UserController', () => {
  let controller: UserController;
  let rbacService: jest.Mocked<RbacService>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        {
          provide: RbacService,
          useValue: {
            hasPermission: jest.fn(),
            canAccessTenant: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<UserController>(UserController);
    rbacService = module.get(RbacService);
  });

  it('should allow manager to create user', async () => {
    rbacService.hasPermission.mockReturnValue(true);
    
    const result = await controller.createUser(userData);
    
    expect(rbacService.hasPermission).toHaveBeenCalledWith(
      UserPermissions.CREATE_USER
    );
  });
});
```

### Integration Testing

```typescript
describe('RBAC Integration', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('should enforce permissions on protected endpoints', async () => {
    const employeeToken = generateToken(employeeUser);
    const managerToken = generateToken(managerUser);

    // Employee cannot create users
    await request(app.getHttpServer())
      .post('/users')
      .set('Authorization', `Bearer ${employeeToken}`)
      .expect(403);

    // Manager can create users
    await request(app.getHttpServer())
      .post('/users')
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(201);
  });
});
```

## Troubleshooting

### Common Issues

1. **Permission Denied Errors**
   - Check user role in database: `SELECT role FROM users WHERE id = ?`
   - Verify permission mapping in `role-permissions.config.ts`
   - Confirm tenant context is set properly

2. **Guards Not Working**
   - Ensure guards are applied: `@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)`
   - Check guard order - JWT must come before RBAC
   - Verify global guards are configured in `app.module.ts`

3. **Tenant Isolation Issues**
   - Check `TenantContextMiddleware` is applied
   - Verify JWT payload includes `companyId` or `tenantId`
   - Confirm RLS policies are enabled on database tables

### Debug Commands

```typescript
// Enable debug logging
const context = this.rbacService.getPermissionContext();
console.log('Permission context:', context);

// Check specific permissions
const permissions = this.rbacService.getUserPermissions();
console.log('User permissions:', permissions);

// Validate tenant access
const canAccess = this.rbacService.canAccessTenant(tenantId);
console.log('Tenant access:', canAccess);
```

## Best Practices

### 1. Security First
- Always use the principle of least privilege
- Grant minimum permissions required for role functions
- Regularly audit role permissions
- Use resource ownership where appropriate

### 2. Consistent Implementation
- Always apply all three guards: JWT, Tenant, Permissions
- Use convenience decorators for common permission sets
- Implement proper error handling with meaningful messages
- Test permission enforcement thoroughly

### 3. Performance Optimization
- Permission checks are cached within request scope
- Avoid unnecessary database queries in authorization logic
- Use efficient role hierarchy checking
- Monitor performance of permission-heavy endpoints

### 4. Maintainability
- Group related permissions logically
- Use descriptive permission names
- Document custom permission requirements
- Keep role hierarchy simple and clear

## Migration Guide

### From Basic Role Checks
```typescript
// Old approach
if (user.role !== 'ADMIN') {
  throw new ForbiddenException();
}

// New RBAC approach
@RequirePermissions([UserPermissions.MANAGE_USERS])
// or programmatically:
if (!this.rbacService.hasPermission(UserPermissions.MANAGE_USERS)) {
  throw new ForbiddenException();
}
```

### Adding New Permissions

1. Add to appropriate enum in `permissions.enum.ts`
2. Update role mappings in `role-permissions.config.ts`
3. Create convenience decorator if needed
4. Add tests for new permissions
5. Update documentation

This comprehensive RBAC system provides enterprise-grade access control with tenant isolation, making it suitable for a multi-tenant SaaS platform like the Security Workforce & Payroll Management System.