# Tenant Context Management System

## Overview

The Tenant Context Management System provides comprehensive multi-tenant data isolation for the Security Workforce & Payroll Management platform. It implements a robust architecture using PostgreSQL Row-Level Security (RLS) combined with application-level tenant context injection to ensure complete data separation between different companies (tenants).

## Architecture Components

### 1. TenantContextService

A request-scoped service that manages tenant context throughout the request lifecycle.

**Key Features:**
- Request-scoped to ensure context isolation between concurrent requests
- Stores tenant ID, user ID, and user role for the current request
- Provides validation methods for tenant access and role checking
- Includes comprehensive logging for audit purposes

**Usage:**
```typescript
@Injectable()
export class SomeService {
  constructor(private tenantContext: TenantContextService) {}

  async doSomething() {
    const tenantId = this.tenantContext.getTenantId();
    const userRole = this.tenantContext.getUserRole();
    
    if (this.tenantContext.isAdmin()) {
      // Admin-only logic
    }
  }
}
```

### 2. TenantContextMiddleware

Middleware that automatically sets tenant context for authenticated requests.

**Key Features:**
- Extracts tenant information from authenticated user JWT token
- Sets both application-level and database-level tenant context
- Handles public endpoint bypassing
- Comprehensive error handling and logging

**Public Endpoints (bypassed):**
- `/health`
- `/api/health`
- `/api/auth/login`
- `/api/auth/register`
- `/api/public`
- `/metrics`
- `/favicon.ico`
- `/.well-known`

### 3. TenantGuard

NestJS guard that enforces tenant-based access control.

**Key Features:**
- Role-based access control within tenant boundaries
- System-only endpoint bypass capability
- Tenant mismatch detection and prevention
- Declarative security through decorators

**Decorators:**
```typescript
// Require specific roles
@RequireTenant(['COMPANY_ADMIN', 'MANAGER'])
@Get('/sensitive-data')
async getSensitiveData() { }

// Convenience decorators
@AdminOnly()
@ManagerOrAbove()
@SupervisorOrAbove()
@AllAuthenticatedUsers()

// System-only operations (bypass tenant checks)
@SystemOnly()
@Get('/system/health')
async systemHealth() { }
```

### 4. TenantAwareRepository

Base repository class that provides tenant-aware database operations.

**Key Features:**
- Automatic tenant filtering for all database operations
- Built-in pagination, sorting, and search utilities
- Transaction support with tenant context preservation
- Comprehensive error handling and logging
- System context operations for administrative tasks

**Usage:**
```typescript
@Injectable()
export class EmployeeRepository extends TenantAwareRepository {
  constructor(
    protected readonly prisma: PrismaService,
    protected readonly tenantContext: TenantContextService,
  ) {
    super(prisma, tenantContext);
  }

  async create(data: CreateEmployeeDto): Promise<Employee> {
    return this.writeWithTenant(() =>
      this.prisma.employee.create({
        data: {
          ...data,
          ...this.getTenantFilter(), // Automatically adds company_id
        },
      }),
    );
  }
}
```

## Database Integration

### Row-Level Security (RLS)

The system uses PostgreSQL RLS policies to enforce data isolation at the database level:

```sql
-- Enable RLS on tenant-specific tables
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

-- Create tenant isolation policy
CREATE POLICY employee_tenant_isolation ON employees
    USING (company_id = current_setting('app.tenant_id')::uuid);
```

### PrismaService Extensions

Enhanced PrismaService provides tenant-aware database operations:

```typescript
// Set tenant context for RLS
await prismaService.setTenantContext(tenantId, userRole);

// Execute within tenant context
const result = await prismaService.withTenant(tenantId, async (prisma) => {
  return prisma.employee.findMany();
});

// System operations (bypass RLS)
await prismaService.withSystemContext(async (prisma) => {
  return prisma.company.create(companyData);
});
```

## Implementation Guide

### 1. Setting Up the System

The system is automatically configured when importing `CommonModule`:

```typescript
// app.module.ts
@Module({
  imports: [CommonModule], // Provides global tenant services
  // ...
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(TenantContextMiddleware)
      .forRoutes('*');
  }
}
```

### 2. Creating Tenant-Aware Services

```typescript
@Injectable()
export class EmployeeService {
  constructor(
    private employeeRepository: EmployeeRepository,
    private tenantContext: TenantContextService,
  ) {}

  async createEmployee(data: CreateEmployeeDto): Promise<Employee> {
    // Repository automatically applies tenant filtering
    return this.employeeRepository.create(data);
  }

  async getEmployeeById(id: string): Promise<Employee> {
    const employee = await this.employeeRepository.findById(id);
    
    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    // Verify tenant ownership (additional security layer)
    if (employee.company_id !== this.tenantContext.getTenantId()) {
      throw new ForbiddenException('Access denied');
    }

    return employee;
  }
}
```

### 3. Securing Controllers

```typescript
@Controller('employees')
@UseGuards(TenantGuard)
export class EmployeeController {
  constructor(private employeeService: EmployeeService) {}

  @Get()
  @AllAuthenticatedUsers() // Any authenticated user can list employees
  async listEmployees(@Query() query: ListEmployeesQuery) {
    return this.employeeService.listEmployees(query);
  }

  @Post()
  @ManagerOrAbove() // Only managers and above can create employees
  async createEmployee(@Body() data: CreateEmployeeDto) {
    return this.employeeService.createEmployee(data);
  }

  @Delete(':id')
  @AdminOnly() // Only admins can delete employees
  async deleteEmployee(@Param('id') id: string) {
    return this.employeeService.deleteEmployee(id);
  }
}
```

### 4. Repository Implementation Examples

```typescript
@Injectable()
export class ClientRepository extends TenantAwareRepository {
  async findExpiringContracts(days: number): Promise<Client[]> {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + days);

    return this.findWithTenant(() =>
      this.prisma.client.findMany({
        where: {
          ...this.getTenantFilter(),
          contractEnd: { lte: expiryDate },
          contractStatus: 'ACTIVE',
        },
        orderBy: { contractEnd: 'asc' },
      }),
    );
  }

  async getClientStats(): Promise<ClientStats> {
    const [active, suspended, terminated] = await Promise.all([
      this.countByStatus('ACTIVE'),
      this.countByStatus('SUSPENDED'),
      this.countByStatus('TERMINATED'),
    ]);

    return { active, suspended, terminated };
  }

  private async countByStatus(status: string): Promise<number> {
    return this.findWithTenant(() =>
      this.prisma.client.count({
        where: {
          ...this.getTenantFilter(),
          contractStatus: status,
        },
      }),
    );
  }
}
```

## Security Features

### 1. Multi-Layer Protection

- **Database Level**: RLS policies prevent unauthorized data access
- **Application Level**: TenantGuard enforces access control rules
- **Service Level**: Repository pattern ensures consistent tenant filtering
- **Request Level**: Middleware handles context setup and cleanup

### 2. Audit Logging

All operations are logged with tenant context for security auditing:

```typescript
// Automatic logging in repositories
this.logOperation('CREATE', 'Employee', employee.id);
// Output: "CREATE Employee [emp-123] - Context[tenant:company-1,user:user-1,role:MANAGER,set:true]"
```

### 3. Error Handling

Comprehensive error handling prevents information leakage:

- Tenant context validation errors
- Cross-tenant access attempts
- Database-level RLS violations
- Authentication/authorization failures

## Testing

### Unit Testing

```typescript
describe('EmployeeRepository', () => {
  beforeEach(() => {
    tenantContextService.setContext(testTenantId, testUserId, 'MANAGER');
  });

  it('should create employee in correct tenant', async () => {
    const employee = await repository.create(employeeData);
    expect(employee.company_id).toBe(testTenantId);
  });
});
```

### Integration Testing

```typescript
describe('Tenant Isolation', () => {
  it('should isolate data between tenants', async () => {
    // Create data for tenant 1
    await setupTenant1Data();
    
    // Switch to tenant 2 context
    await switchToTenant2();
    
    // Verify no access to tenant 1 data
    const results = await repository.findMany();
    expect(results.every(r => r.company_id === tenant2Id)).toBe(true);
  });
});
```

## Performance Considerations

### 1. Database Optimization

- Composite indexes on `(company_id, ...)` for all tenant-specific tables
- Connection pooling with appropriate timeout settings
- RLS policy optimization for query performance

### 2. Caching Strategy

- Request-scoped service instances prevent cross-request contamination
- Tenant-aware cache keys when implementing application caching
- Database connection reuse within request context

### 3. Monitoring

- Track tenant context establishment success/failure rates
- Monitor RLS policy performance impact
- Alert on cross-tenant access attempts

## Troubleshooting

### Common Issues

1. **"Tenant context not set" Error**
   - Ensure authentication middleware runs before tenant middleware
   - Verify JWT token contains tenant information
   - Check that endpoint is not in public endpoint list

2. **Cross-Tenant Data Access**
   - Verify RLS policies are enabled on all tables
   - Check repository implementation uses `getTenantFilter()`
   - Ensure proper tenant context switching in tests

3. **Performance Issues**
   - Review database indexes on tenant columns
   - Check for N+1 query problems in repository code
   - Monitor RLS policy execution plans

### Debugging

Enable debug logging to trace tenant context flow:

```typescript
// Set LOG_LEVEL=debug in environment
// Logs will show tenant context establishment and operations
```

## Migration Guide

### Adding New Tenant-Aware Entities

1. Add `company_id` column to entity table
2. Enable RLS and create tenant isolation policy
3. Create repository extending `TenantAwareRepository`
4. Implement service using tenant-aware repository
5. Add controller with appropriate guard decorators

### Converting Existing Entities

1. Add migration to add `company_id` column
2. Populate existing data with appropriate tenant IDs
3. Enable RLS policies
4. Update repository to extend `TenantAwareRepository`
5. Add comprehensive tests for tenant isolation

This tenant context management system provides enterprise-grade multi-tenancy with defense-in-depth security, ensuring complete data isolation while maintaining performance and usability.