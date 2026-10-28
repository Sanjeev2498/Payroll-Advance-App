# Bug Condition Exploration Tests - Remaining Test Failures

## Purpose

These 7 test files are **bug exploration tests** that MUST FAIL on unfixed code. They document the expected behavior and will serve as validation that the bugs are fixed when they start passing.

## Status: ⚠️ EXPECTED TO FAIL

**These tests are designed to fail in the current codebase.** They encode the correct behavior that the system should have after the bugs are fixed.

## Test Files Created

### Category 1: Database Connection Pool Management
**File**: `category1-database-pool.exploration.spec.ts`

**Expected Failures**:
- "Cannot use a pool after calling end on the pool" errors during parallel operations
- Pool exhaustion when property tests create 15-20 parallel database operations
- Invalid Prisma invocation warnings when creating contracts
- Cleanup operations fail with closed connection errors

**Tests**:
1. Pool exhaustion under parallel load (20 parallel client creations)
2. Valid Prisma invocation patterns for contract creation
3. Cleanup after stress tests maintains valid connections
4. Concurrent read/write operations on shared pool

### Category 2: Authentication Middleware HTTP Status Codes
**File**: `category2-auth-middleware.exploration.spec.ts`

**Expected Failures**:
- GET /api/v1/employees without token returns 400 instead of 401
- GET /api/v1/employees with invalid token returns 404 instead of 401
- POST /api/v1/auth/login without tenant context returns 403 instead of 200/401
- POST /api/v1/auth/refresh returns 403 instead of processing request
- GET /health returns 403 instead of 200 (should not require auth/tenant)
- Missing WWW-Authenticate header in 401 responses

**Tests**:
1. Missing token should return 401 Unauthorized
2. Invalid token should return 401 Unauthorized  
3. Malformed token should return 401 Unauthorized
4. Login endpoint should work without tenant context header
5. Refresh endpoint should work without tenant context
6. Health endpoints should work without auth or tenant context
7. 401 responses should include WWW-Authenticate header

### Category 3: API Documentation and Behavior Mismatches
**File**: `category3-api-docs.exploration.spec.ts`

**Expected Failures**:
- Success responses return undefined instead of {status: "ok"}
- Missing resource returns 200/204 instead of 404
- Status codes don't match OpenAPI specifications
- Response structures inconsistent across operations
- Pagination metadata missing or wrong format

**Tests**:
1. Success responses should have proper structure with status indicator
2. Non-existent resources should return 404
3. Status codes should match OpenAPI specs
4. POST responses should match documented structure
5. Validation errors should return 400
6. PUT/PATCH should return updated resource
7. DELETE should return 204 No Content
8. List endpoints should have pagination metadata
9. Error responses should match OpenAPI schema

### Category 4: Service Validation Logic Bypassing
**File**: `category4-service-validation.exploration.spec.ts`

**Expected Failures**:
- employeeService.create(invalidData) resolves instead of rejecting
- Missing required fields don't trigger validation errors
- Invalid email formats accepted
- Business rules (e.g., can't assign terminated employee) not enforced
- Services return null instead of throwing exceptions
- Nested object validation skipped
- Try-catch blocks swallow validation errors

**Tests**:
1. Invalid data should be rejected
2. Missing required fields should cause rejection
3. Invalid email format should be rejected
4. Business rules should be enforced
5. Client service should validate data
6. Should reject instead of returning null
7. Update operations should validate
8. All code paths should validate
9. Nested objects should be validated
10. Validation errors should propagate, not be swallowed

### Category 5: Mock Function Expectation Failures
**File**: `category5-mock-expectations.exploration.spec.ts`

**Expected Failures**:
- mockEmployeeService.findById not called when expected
- mockAuthService.validateCredentials not called during login
- Mock call counts don't match (0 vs expected 1+)
- Service methods called with wrong parameters
- Methods expected by tests not defined in mocks

**Tests**:
1. EmployeeController should call findById
2. Should call create with correct parameters
3. Should call update when updating
4. AuthController should call validateCredentials during login
5. Should call login with credentials
6. Should call refreshToken when refreshing
7. ClientController should call validateClientData before create
8. Should call create exactly once
9. Should call findById for each requested client
10. Various parameter shape and conditional call tests

### Category 6: Promise Rejection Handling Issues
**File**: `category6-promise-rejection.exploration.spec.ts`

**Expected Failures**:
- authService.validateCredentials resolves null instead of rejecting
- authService.login resolves {error: "message"} instead of rejecting
- Services catch errors and return null instead of re-throwing
- Error conditions return resolved promises instead of rejections
- Promise rejections not propagated through call stack

**Tests**:
1. validateCredentials should reject for invalid credentials
2. Login should reject for invalid credentials
3. findById should reject for non-existent resources
4. Delete should reject for non-existent resources
5. validateToken should throw, not return null
6. Async operations should be properly awaited
7. Service rejections should propagate to controllers
8. Should use Promise.reject for errors
9. Async functions should throw, not return null
10. Nested async calls should maintain error context
11. Should throw Error objects, not return them

### Category 7: Controller Response Structure Mismatches
**File**: `category7-controller-responses.exploration.spec.ts`

**Expected Failures**:
- AuthController returns {error: "msg"} instead of standard exception
- Response structures inconsistent across CRUD operations
- Validation errors don't follow standard format
- Response interceptors wrap some responses but not others
- Exception filters return non-standard formats

**Tests**:
1. Auth controller should use standard error format
2. Should return consistent success response structure
3. Token refresh should return proper structure
4. Validation errors should use standard format
5. Create should return consistent success response
6. 404 responses should use proper structure
7. Response format should be consistent across CRUD ops
8. Delete should return undefined (204 No Content)
9. Service errors should not have custom wrappers
10. Response transformations should be consistent
11. Should not double-wrap responses
12. Exception filters should use NestJS standards

## Implementation Notes

### Known Issues
- Category 2 & 3 tests require full NestJS application context and may have dependency injection issues
- Some tests may be skipped if authentication setup fails (this is expected)
- Tests are designed to run in isolation and document specific bug conditions

### Running the Tests

```bash
# Run all exploration tests
npm test -- --testPathPatterns="bugfix/remaining-failures"

# Run specific category
npm test -- --testPathPatterns="category1-database-pool"
npm test -- --testPathPatterns="category2-auth-middleware"
npm test -- --testPathPatterns="category3-api-docs"
npm test -- --testPathPatterns="category4-service-validation"
npm test -- --testPathPatterns="category5-mock-expectations"
npm test -- --testPathPatterns="category6-promise-rejection"
npm test -- --testPathPatterns="category7-controller-responses"
```

### Expected Outcome

**Current State**: All or most tests FAIL (this is correct - they're documenting bugs)

**After Fixes**: Tests should PASS, confirming:
1. Database connection pool properly managed
2. Correct HTTP status codes (401 for auth failures)
3. API behavior matches documentation
4. Service validation enforced
5. Mock expectations match implementation
6. Promises properly reject on errors
7. Controller responses follow standard format

## Next Steps

1. **Task 2**: Fix Category 1 - Database connection pool management
2. **Task 3**: Fix Category 2 - Authentication middleware status codes
3. **Task 4**: Fix Category 3 - API documentation alignment
4. **Task 5**: Fix Category 4 - Service validation enforcement
5. **Task 6**: Fix Category 5 - Update mock expectations
6. **Task 7**: Fix Category 6 - Promise rejection handling
7. **Task 8**: Fix Category 7 - Controller response structures
8. **Task 9**: Verify all 7 exploration test suites pass

## Mapping to Original Failures

These 7 categories map to the 32 original test failures:

- **Category 1** → 4-5 property test failures (pool exhaustion, cleanup issues)
- **Category 2** → 6-7 failures (wrong status codes on auth middleware)
- **Category 3** → 4-5 failures (API docs vs actual behavior mismatches)
- **Category 4** → 3-4 failures (service validation bypass)
- **Category 5** → 4-5 failures (mock expectations not met)
- **Category 6** → 3-4 failures (promise handling issues)
- **Category 7** → 3-4 failures (response structure mismatches)

Total: ~32 failures across 7 root cause categories
