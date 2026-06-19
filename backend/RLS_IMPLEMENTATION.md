# Row-Level Security (RLS) Implementation Guide

## Overview

This document describes the Row-Level Security (RLS) implementation for the Security Workforce & Payroll Management System. RLS provides multi-tenant data isolation at the database level, ensuring that each company can only access their own data.

## Architecture

### Multi-Tenant Strategy

The system implements **Single Database, Shared Schema** multi-tenancy using PostgreSQL Row-Level Security:

- ✅ **Cost-effective**: Single database instance for all tenants
- ✅ **Secure**: Database-level isolation using RLS policies
- ✅ **Scalable**: Efficient resource utilization
- ✅ **Maintainable**: Single schema to manage

### Key Components

1. **RLS Policies**: Database-level rules that filter data by tenant
2. **Tenant Context Service**: Application-level tenant management
3. **Tenant Middleware**: Automatic tenant context injection
4. **Tenant-Aware Repository**: Base class for secure database operations
5. **Helper Functions**: Database functions for tenant context management

## Database Implementation

### Enabled Tables

RLS is enabled on all tenant-specific tables:

- `companies` - Direct tenant ownership
- `users` - Belongs to company
- `clients` - Belongs to company  
- `employees` - Belongs to company
- `sites` - Access via client → company relationship
- `assignments` - Access via employee → company relationship
- `shifts` - Access via assignment → employee → company relationship
- `attendance` - Access via employee → company relationship
- `payroll_runs` - Belongs to company
- `payroll_items` - Access via payroll_run → company relationship
- `invoices` - Access via client → company relationship

### Helper Functions

#### `current_tenant_id()`
Returns the current tenant ID from the PostgreSQL session context.

```sql
SELECT current_tenant_id(); -- Returns UUID or NULL
```

#### `is_tenant_admin()`
Checks if the current user has admin privileges.

```sql
SELECT is_tenant_admin(); -- Returns BOOLEAN
```

#### `set_tenant_id(tenant_uuid UUID)`
Sets the tenant context for the current session.

```sql
SELECT set_tenant_id('550e8400-e29b-41d4-a716-446655440000');
```

### Policy Types

#### 1. Direct Tenant Policies
For tables that directly belong to a company:

```sql
CREATE POLICY "companies_tenant_isolation" ON "companies"
    USING (id = current_tenant_id());
```

#### 2. Relationship-Based Policies
For tables accessed through relationships:

```sql
CREATE POLICY "sites_tenant_isolation" ON "sites"
    USING (EXISTS (
        SELECT 1 FROM "clients" 
        WHERE "clients"."id" = "sites"."client_id" 
        AND "clients"."company_id" = current_tenant_id()
    ));
```

#### 3. System Operation Bypass
Allows system operations when no tenant context is set:

```sql
CREATE POLICY "system_operations_bypass" ON "companies"
    USING (current_tenant_id() IS NULL);
```

## Application Implementation

### Tenant Context Service

Manages tenant context for the current request:

```typescript
@Injectable({ scope: Scope.REQUEST })
export class TenantContextService {
  setContext(tenantId: string, userId?: string, userRole?: string): void
  getTenantId(): string
  hasContext(): boolean
  validateTenantAccess(requiredTenantId: string): boolean
}
```

### Tenant Middleware

Automatically sets database tenant context for each authenticated request:

```typescript
@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  async use(req: AuthenticatedRequest, res: Response, next: NextFunction)
}
```

### Tenant Guards and Decorators

Protect routes with role-based access control:

```typescript
// Decorators
@AdminOnly()
@ManagerOrAbove()
@AllAuthenticatedUsers()

// Usage
@Get('/sensitive-data')
@AdminOnly()
async getSensitiveData() {
  // Only admins can access this endpoint
}
```

### Tenant-Aware Repository

Base class for all repositories that automatically handles tenant context:

```typescript
export abstract class TenantAwareRepository {
  protected async executeWithTenant<T>(
    operation: (prisma: PrismaService) => Promise<T>
  ): Promise<T>
  
  protected getTenantFilter(): { company_id: string }
}
```

### Enhanced Prisma Service

Extended Prisma service with RLS support:

```typescript
export class PrismaService extends PrismaClient {
  async setTenantContext(tenantId: string, userRole?: string): Promise<void>
  async withTenant<T>(tenantId: string, operation: Function): Promise<T>
  async withSystemContext<T>(operation: Function): Promise<T>
  async validateRLSConfiguration(): Promise<RLSStatus[]>
}
```

## Usage Examples

### Setting Up a Controller

```typescript
@Controller('employees')
@UseGuards(TenantGuard)
export class EmployeesController {
  constructor(private employeeService: EmployeeService) {}

  @Get()
  @AllAuthenticatedUsers()
  async findAll() {
    // Automatically filtered by tenant through RLS
    return this.employeeService.findAll();
  }

  @Post()
  @ManagerOrAbove()
  async create(@Body() createEmployeeDto: CreateEmployeeDto) {
    // Only managers and above can create employees
    return this.employeeService.create(createEmployeeDto);
  }
}
```

### Repository Implementation

```typescript
@Injectable()
export class EmployeeRepository extends TenantAwareRepository {
  async findAll(): Promise<Employee[]> {
    return this.findWithTenant(async () => {
      return this.prisma.employee.findMany({
        // No need to add company_id filter - RLS handles it automatically
        include: { assignments: true }
      });
    });
  }
}
```

### Cross-Tenant Operations (System Context)

```typescript
// For system operations like reports across all tenants
async generateSystemReport(): Promise<SystemReport> {
  return this.prisma.withSystemContext(async (prisma) => {
    const allCompanies = await prisma.company.findMany();
    // Can access all tenant data here
    return processReport(allCompanies);
  });
}
```

## Setup and Testing

### Installation

1. **Run RLS Setup Script**:
   ```bash
   # Windows
   .\setup-rls.bat
   
   # Linux/Mac
   chmod +x setup-rls.sh
   ./setup-rls.sh
   
   # Or using npm
   npm run rls:setup
   ```

2. **Test RLS Implementation**:
   ```bash
   npm run rls:test
   ```

3. **Validate Complete Setup**:
   ```bash
   npm run rls:validate
   ```

### Manual Database Setup

If you need to manually apply RLS:

```bash
# Apply the RLS migration
npx prisma migrate dev

# Or run the setup script directly
node scripts/setup-rls.js
```

### Testing RLS Isolation

The test script creates two test tenants and validates:

- ✅ Each tenant can only see their own data
- ✅ No cross-tenant data leakage
- ✅ System operations can access all data when no tenant context is set
- ✅ Policies are correctly configured on all tables

## Security Considerations

### Best Practices

1. **Always Set Tenant Context**: Every authenticated request must set tenant context
2. **Validate User Access**: Check that users can only access their tenant's data
3. **System Operations**: Use `withSystemContext()` sparingly and only for legitimate system operations
4. **Audit Logging**: Log all tenant context changes and policy violations
5. **Regular Testing**: Run RLS tests regularly to ensure policies remain effective

### Monitoring

Monitor these metrics to ensure RLS is working correctly:

- Failed authentication attempts
- Cross-tenant access attempts
- System context usage
- Policy violation logs
- Performance impact of RLS queries

### Performance Optimization

RLS policies include performance optimizations:

- **Indexes**: Tenant-specific indexes for efficient filtering
- **Policy Design**: Efficient policy conditions using EXISTS() where needed
- **Connection Pooling**: Proper tenant context management in connection pools

## Troubleshooting

### Common Issues

1. **"Tenant context not set" error**:
   - Ensure authentication middleware is running
   - Check that JWT token includes tenant information
   - Verify TenantContextMiddleware is registered

2. **Cross-tenant data visible**:
   - Run `npm run rls:test` to verify policies
   - Check that RLS is enabled on all tables
   - Validate tenant context is being set correctly

3. **Performance issues**:
   - Ensure proper indexes exist for tenant filtering
   - Check query plans for RLS policy efficiency
   - Consider query optimization for complex relationships

### Debugging Commands

```sql
-- Check if RLS is enabled on a table
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'your_table';

-- View all policies for a table
SELECT * FROM pg_policies WHERE tablename = 'your_table';

-- Check current tenant context
SELECT current_setting('app.tenant_id', true);

-- Validate RLS configuration
SELECT * FROM validate_rls_isolation();
```

## Migration and Deployment

### Development Environment

RLS is automatically applied during development through Prisma migrations and setup scripts.

### Production Deployment

1. **Apply migrations**: `npx prisma migrate deploy`
2. **Run RLS setup**: `npm run rls:setup`
3. **Validate configuration**: `npm run rls:test`
4. **Monitor logs**: Check for any RLS policy violations

### Rollback Procedure

If RLS needs to be disabled temporarily:

```sql
-- Disable RLS on all tables (DANGEROUS - only for emergencies)
ALTER TABLE companies DISABLE ROW LEVEL SECURITY;
-- ... repeat for other tables

-- Re-enable when fixed
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
```

## Conclusion

The RLS implementation provides robust multi-tenant data isolation with:

- ✅ **Security**: Database-level enforcement
- ✅ **Performance**: Optimized queries and indexes  
- ✅ **Maintainability**: Clear separation of concerns
- ✅ **Scalability**: Efficient resource utilization
- ✅ **Testability**: Comprehensive validation suite

This foundation ensures that the Security Workforce & Payroll Management System can securely serve multiple tenants while maintaining data isolation and system performance.