# Critical Test Failures Fix Design

## Overview

This design addresses 10 critical categories of test failures in the payroll system that are blocking development progress. The failures span database schema mismatches, dependency injection configuration issues, field mapping problems, and service integration errors. The fix approach focuses on systematic infrastructure repairs rather than business logic changes, ensuring all existing functionality is preserved while enabling reliable test execution.

## Glossary

- **Bug_Condition (C)**: Test execution failures due to infrastructure misconfigurations - when critical test dependencies fail to resolve, database schemas mismatch, or service injections fail
- **Property (P)**: Successful test execution with proper dependency resolution, schema alignment, and service integration
- **Preservation**: All existing production functionality and working test suites must continue to operate without modification
- **Schema Alignment**: Database column names and structures must match between test code expectations and actual Prisma schema
- **Dependency Injection Chain**: Proper NestJS provider resolution including TenantContextService, PrismaService, ConfigService, and related services
- **Field Mapping Consistency**: Test data structure fields must match the current Client -> Contract -> Site relationship hierarchy
- **Property Test Infrastructure**: Fast-check based property test setup with hierarchical data generation and tenant isolation

## Bug Details

### Bug Condition

The bug manifests when running `npm test` in the backend directory, resulting in systematic test failures across 10 distinct categories. The failures are infrastructure-related rather than business logic issues, affecting dependency injection, database schema alignment, service integration, and data structure consistency.

**Formal Specification:**
```
FUNCTION isBugCondition(testExecution)
  INPUT: testExecution of type TestExecutionContext
  OUTPUT: boolean
  
  RETURN (testExecution.hasSchemaColumnMismatch(['contact_info', 'contactInfo'])
         OR testExecution.hasFieldMappingError(['contractId', 'clientId']) 
         OR testExecution.hasDependencyInjectionFailure(['PrismaService', 'ConfigService', 'TenantContextService'])
         OR testExecution.hasMockingError(['tenantContext.hasContext'])
         OR testExecution.hasDataStructureInconsistency(['Client', 'Contract', 'Site'])
         OR testExecution.hasConstructorError(['SupervisorPortalController'])
         OR testExecution.hasPropertyTestServiceInjectionFailure())
         AND testExecution.testType IN ['unit', 'integration', 'property-based']
END FUNCTION
```

### Examples

- **Schema Column Mismatch**: Test expects `employees.contact_info` but schema uses `employees.contactInfo` (camelCase)
- **Billing Integration Field Mapping**: Tests use `clientId` for invoice generation but should use `contractId` per new schema
- **PrismaService Injection**: Tests fail with "Cannot read properties of undefined (reading 'findFirst')" due to undefined `this.prisma`
- **ConfigService Resolution**: EncryptionUtil cannot resolve ConfigService dependency in test modules
- **TenantContext Mocking**: Sites service tests fail with "`this.tenantContext.hasContext` is not a function" error
- **Data Structure Inconsistency**: Tests create Client entities with contract fields instead of separate Contract entities
- **Employee Field Names**: Tests use inconsistent field names that don't match actual Employee schema
- **SupervisorPortalController Constructor**: Tests fail with "metatype is not a constructor" when instantiating controller
- **Property Test Service Injection**: Property tests cannot properly inject Prisma mocking for hierarchical data generation

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- All production runtime functionality must continue to work exactly as before
- All currently passing tests must continue to pass without modification
- Database operations in production must remain unaffected by test infrastructure fixes
- API endpoints and business logic must maintain existing behavior
- Authentication, authorization, and tenant isolation must continue working as designed

**Scope:**
All changes are limited to test infrastructure, configuration, and data structure alignment. No production business logic, API contracts, database migrations, or user-facing functionality should be modified.

## Hypothesized Root Cause

Based on the comprehensive testing log analysis, the root causes are:

1. **Database Schema Evolution Without Test Update**: The Prisma schema evolved to use camelCase field names and moved contract-related fields from Client to Contract model, but tests still expect the old structure

2. **Incomplete Dependency Injection Configuration**: Test modules missing proper provider setup for TenantContextService, ConfigService, and related dependencies that guards and services require

3. **Data Structure Migration Incomplete**: Tests create data using old Client-centric structure instead of new hierarchical Client -> Contract -> Site relationship

4. **Property Test Infrastructure Degradation**: Hierarchical data generators and mock setup not updated to match current schema and service dependencies

5. **Field Name Inconsistency**: Mix of snake_case and camelCase field names between different parts of the codebase causing lookup failures

6. **Service Integration Misalignment**: Test mocks don't match actual service implementations due to service evolution over time

## Correctness Properties

Property 1: Bug Condition - Test Infrastructure Reliability

_For any_ test execution where infrastructure components are properly configured (schema aligned, dependencies injected, mocks configured), the test suite SHALL execute without dependency injection failures, schema mismatches, or service resolution errors, enabling reliable test feedback for development.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 2.10**

Property 2: Preservation - Production System Integrity  

_For any_ production runtime operation or currently passing test, the fixed test infrastructure SHALL produce exactly the same behavior as before the fix, preserving all existing functionality, API contracts, and business logic without any modifications.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct:

**File**: `backend/src/test/helpers/property-test-setup.ts`

**Function**: PropertyTestSetup class methods

**Specific Changes**:
1. **Schema Column Name Alignment**: Update all test data factories and property generators to use camelCase field names matching Prisma schema
   - Change `contact_info` to `contactInfo` in all test data creation
   - Update field references in assertions and mock data

2. **Dependency Injection Chain Completion**: Add comprehensive provider setup for all test modules
   - Include TenantContextService in all test modules that use authentication guards
   - Add ConfigService provider configuration with proper mocking
   - Ensure PrismaService is properly injected with all required methods mocked

3. **Data Structure Hierarchy Alignment**: Update test data creation to match Client -> Contract -> Site relationship
   - Remove contract fields from Client creation (contractStatus, contractStart, contractEnd, billingPreferences)
   - Add separate Contract entity creation linked to Client via clientId
   - Update Site creation to use contractId instead of clientId
   - Ensure proper foreign key relationships in hierarchical data generation

4. **Property Test Service Integration**: Fix service injection in property-based tests
   - Update PropertyTestSetup to properly resolve services with module.resolve() instead of module.get()
   - Add comprehensive mock setup for all service dependencies
   - Implement proper cleanup in property tests to avoid data leakage

5. **Field Mapping Consistency**: Standardize field names across all test files
   - Update invoice generation tests to use contractId parameter instead of clientId
   - Align employee creation field names with actual Employee schema
   - Fix billing integration field mappings to match current contract structure

**File**: `backend/src/tests/property-tests/*.spec.ts`

**Function**: Various property test implementations

**Specific Changes**:
1. **TenantContext Mocking Setup**: Add proper mock configuration for TenantContextService
   - Mock `hasContext()` method to return true
   - Mock all tenant context methods used by services and guards
   - Add TenantContextService to test module providers

2. **Hierarchical Data Generation Fix**: Update TestDataFactory to use system context
   - Use `prisma.withSystemContext()` for all test data creation to avoid FK constraint violations
   - Implement proper entity creation order: Company -> Client -> Contract -> Site -> Employee
   - Add comprehensive cleanup methods that delete in reverse dependency order

**File**: `backend/src/auth/controllers/client-user-test.spec.ts`

**Function**: Test module configuration

**Specific Changes**:
1. **Authentication Guard Dependencies**: Add missing providers for JwtAuthGuard requirements
   - Include TenantContextService in providers array
   - Add proper Reflector configuration
   - Ensure PrismaService is available for guard dependency injection

**File**: `backend/src/test/generators/hierarchical-data-generator.ts`

**Function**: Data generator methods

**Specific Changes**:
1. **Constructor Error Resolution**: Fix SupervisorPortalController instantiation issues
   - Ensure all constructor dependencies are properly provided in test modules
   - Add missing service mocks for controller dependencies
   - Update controller test configuration to match NestJS requirements

2. **Property Test Service Injection**: Implement proper service resolution for property tests
   - Use `module.resolve()` for scoped services instead of `module.get()`
   - Add comprehensive service mocking for property test scenarios
   - Implement proper test isolation to prevent data leakage between tests

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, demonstrate the infrastructure failures on the current codebase to confirm root causes, then verify that fixes resolve the issues while preserving all existing functionality.

### Exploratory Bug Condition Checking

**Goal**: Document and categorize the current test failures to confirm the 10 identified issue categories and validate our root cause analysis.

**Test Plan**: Run the full test suite with detailed logging to capture all failure patterns. Analyze failures by category and map them to the specific infrastructure issues. Document counterexamples that demonstrate each type of failure.

**Test Cases**:
1. **Schema Column Name Test**: Run tests that access `employees.contact_info` to observe "column does not exist" errors (will fail on current code)
2. **Dependency Injection Test**: Execute auth controller tests to observe "Nest can't resolve dependencies" errors (will fail on current code) 
3. **Field Mapping Test**: Run billing integration tests to observe clientId vs contractId parameter errors (will fail on current code)
4. **Property Test Infrastructure Test**: Execute property-based tests to observe service injection and data generation failures (will fail on current code)

**Expected Counterexamples**:
- Database schema errors: "The column 'employees.contact_info' does not exist"
- Dependency injection errors: "Nest can't resolve dependencies of the JwtAuthGuard"
- Field mapping errors: "generateInvoiceNumber expects contractId but receives clientId"
- Service integration errors: "this.tenantContext.hasContext is not a function"

### Fix Checking

**Goal**: Verify that for all test executions where infrastructure components are properly configured, tests execute successfully without the identified failure categories.

**Pseudocode:**
```
FOR ALL testExecution WHERE isBugCondition(testExecution) DO
  result := runTestWithFixedInfrastructure(testExecution)
  ASSERT testInfrastructureWorking(result)
  ASSERT noSchemaColumnMismatches(result)
  ASSERT noDependencyInjectionFailures(result)
  ASSERT noFieldMappingErrors(result)
END FOR
```

### Preservation Checking

**Goal**: Verify that for all currently passing tests and production runtime operations, the fixed infrastructure produces identical results to the current system.

**Pseudocode:**
```
FOR ALL operation WHERE NOT isBugCondition(operation) DO
  ASSERT runWithFixedInfrastructure(operation) = runWithCurrentInfrastructure(operation)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates comprehensive test cases across the production runtime domain
- It validates that business logic behavior remains unchanged
- It provides strong guarantees that API contracts and data integrity are preserved
- It catches edge cases that manual tests might miss in service interactions

**Test Plan**: Execute full regression testing on production-like scenarios with fixed infrastructure to ensure no behavioral changes in business operations.

**Test Cases**:
1. **Production API Behavior Preservation**: Verify all API endpoints continue to function identically with fixed test infrastructure
2. **Database Operation Preservation**: Verify all production database operations continue working with schema fixes
3. **Authentication System Preservation**: Verify authentication flows continue working with dependency injection fixes
4. **Business Logic Preservation**: Verify all business calculations and validations remain unchanged

### Unit Tests

- Test individual infrastructure components (dependency injection, schema alignment, field mapping)
- Test mock configuration and service integration points
- Test data structure creation and cleanup operations
- Test authentication guard dependencies and provider configuration

### Property-Based Tests

- Generate random test configurations and verify infrastructure components work correctly
- Generate random data hierarchies and verify no foreign key constraint violations
- Test preservation of existing functionality across many runtime scenarios
- Validate tenant isolation and security boundaries remain intact after infrastructure fixes

### Integration Tests

- Test complete test suite execution with fixed infrastructure
- Test authentication flows with properly configured dependency injection
- Test property-based test execution with hierarchical data generation
- Test that all 10 failure categories are resolved without introducing regressions