# Remaining Test Issues - Quick Fix Guide

## Current Status: 18 Failed Test Suites (74% Pass Rate)

### Quick Win Fixes (High Confidence, Low Effort)

#### 1. Client Service Tests - Field Naming Issues
**Files:** `src/clients/enhanced-clients.spec.ts`, `src/clients/clients.service.spec.ts`
**Pattern:** Same camelCase → snake_case fixes as completed tasks
**Expected Fields to Fix:**
- `contactEmail` → `contact_email`
- `companyId` → `company_id`
- `organizationType` → `organization_type`
- `updatedAt` → `updated_at`
- `createdAt` → `created_at`

**Fix Template:**
```typescript
// In test mocks, change:
const mockClient = {
  contactEmail: "test@example.com",     // ❌
  companyId: "uuid-here"               // ❌
}

// To:
const mockClient = {
  contact_email: "test@example.com",    // ✅
  company_id: "uuid-here"              // ✅
}
```

#### 2. Property Test Setup - Relation Path Issues
**Files:** `src/test/helpers/property-test-setup.ts` (partially fixed)
**Pattern:** Simplify complex nested relation queries in cleanup operations

**Fix Approach:**
1. Replace nested relation queries with direct foreign key lookups
2. Use simple `deleteMany({ where: { company_id: tenantId } })` where possible
3. Handle cascade deletes through database constraints instead of manual cleanup

### Medium Effort Fixes

#### 3. Employee Portal Consistency Test
**File:** `src/tests/property-tests/employee-portal-consistency.spec.ts`
**Likely Issues:**
- Employee entity field naming (same pattern as UserManagement fixes)
- Portal-specific mock setup issues

#### 4. Company Registration Property Test
**File:** `src/common/company-registration.property.spec.ts`
**Likely Issues:**
- Company creation field naming
- Registration flow mock setup

#### 5. Tenant Context System Test
**File:** `src/common/tenant-context-system.test.ts`
**Likely Issues:**
- Multi-tenant isolation in tests
- Context switching between tenants

### Infrastructure & Environment Issues

#### 6. Infrastructure Validation Tests
**Files:**
- `src/test/property-tests/infrastructure-validation.spec.ts`
- `src/test/property-tests/task-3-5-validation.spec.ts`
- `src/test/property-tests/bug-condition-exploration.spec.ts`

**Likely Issues:**
- Environment configuration validation
- Database connectivity tests
- External service availability checks

## Fix Priority Order

### Phase 1 (Sprint 1) - Target: 85% Pass Rate
1. **Client Service Tests** (2 suites) - Apply field naming fixes
2. **Property Test Setup** (1 suite) - Complete relation path simplification
3. **Employee Portal Test** (1 suite) - Apply employee entity fixes

**Expected Result:** 56/70 passing (80% pass rate)

### Phase 2 (Sprint 2) - Target: 90% Pass Rate  
1. **Company Registration Test** (1 suite)
2. **Tenant Context System Test** (1 suite)

**Expected Result:** 58/70 passing (83% pass rate)

### Phase 3 (Sprint 3) - Target: 95% Pass Rate
1. **Infrastructure Validation Tests** (3 suites)
2. **Bug Condition Exploration** (1 suite)

**Expected Result:** 62/70 passing (89% pass rate)

## Standard Patterns for Fixes

### 1. Field Naming Pattern
```typescript
// Always use snake_case for database fields in mocks
const mockData = {
  first_name: "John",        // Not firstName
  last_name: "Doe",          // Not lastName  
  is_active: true,           // Not isActive
  created_at: new Date(),    // Not createdAt
  updated_at: new Date(),    // Not updatedAt
  company_id: "uuid",        // Not companyId
  contact_email: "email",    // Not contactEmail
};
```

### 2. Prisma Relation Pattern
```typescript
// Use correct table names (check Prisma schema)
(prisma.employees.findFirst as jest.Mock)  // ✅ employees (plural)
(prisma.shifts.findFirst as jest.Mock)     // ✅ shifts (plural)
(prisma.assignment.findFirst as jest.Mock) // ✅ assignment (singular)

// NOT:
(prisma.employee.findFirst as jest.Mock)   // ❌ incorrect
```

### 3. Mock Data Structure Pattern
```typescript
// For repository create mocks, handle both connect and direct ID patterns:
(repository.create as jest.Mock).mockImplementation((data) => ({
  id: 'generated-id',
  field_name: data.field_name || data.fieldName, // Handle both cases
  employee_id: data.employees?.connect?.id || data.employeeId,
  created_at: new Date(),
  updated_at: new Date(),
}));
```

## Debugging Tips

### 1. Identify Field Naming Issues
```bash
# Look for these error patterns:
"Cannot read properties of undefined (reading 'connect')"
"Expected 'Updated' but received 'John'"  
"Invalid argument: undefined"
```

### 2. Check Prisma Schema for Correct Names
```bash
# In backend directory:
cat prisma/schema.prisma | grep -A 10 "model TableName"
```

### 3. Run Individual Test Suites
```bash
# Test specific failing suite:
npm test -- --testPathPatterns="clients.service.spec.ts" --verbose

# Test with database reset:
npm run db:reset && npm test -- --testPathPatterns="specific-test"
```

## Success Metrics

- **Pass Rate Target:** 90%+ (63+ passing test suites)
- **Test Execution Time:** <5 minutes for full suite
- **Flaky Test Rate:** <5% (tests that fail intermittently)
- **Coverage Maintenance:** >80% statement coverage

---
*Last Updated: 2026-09-26*  
*Based on systematic analysis of 18 remaining failed test suites*