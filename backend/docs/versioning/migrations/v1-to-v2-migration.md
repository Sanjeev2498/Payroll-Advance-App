# Migration Guide: v1.x to v2.0

## Overview

This guide helps you migrate from API v1.x to v2.0. Version 2.0 introduces several breaking changes to improve consistency, performance, and functionality.

## Timeline

- **v2.0 Beta Release:** September 1, 2024
- **v2.0 General Availability:** October 1, 2024
- **v1.x Deprecation Notice:** January 1, 2025
- **v1.x End of Life:** July 1, 2025

## Breaking Changes Summary

### 1. Response Format Standardization

**v1.x Response Format:**
```json
{
  "status": "success",
  "data": { ... },
  "message": "Operation completed"
}
```

**v2.0 Response Format:**
```json
{
  "success": true,
  "data": { ... },
  "metadata": {
    "timestamp": "2024-03-10T10:30:00Z",
    "requestId": "req_123456789",
    "version": "2.0.0"
  }
}
```

**Migration Action:**
Update response parsing to use `success` instead of `status` and handle new `metadata` structure.

### 2. Authentication Changes

**v1.x Authentication:**
```http
POST /auth/login
{
  "username": "user@company.com",
  "password": "password"
}
```

**v2.0 Authentication:**
```http
POST /auth/login
{
  "email": "user@company.com",
  "password": "password",
  "tenantId": "optional-tenant-override"
}
```

**Migration Action:**
- Change `username` field to `email`
- Optionally include `tenantId` for multi-tenant scenarios
- Update token refresh mechanism

### 3. Pagination Changes

**v1.x Pagination:**
```http
GET /employees?offset=20&limit=10
```

**v2.0 Pagination:**
```http
GET /employees?page=3&limit=10
```

**Migration Action:**
Replace `offset` parameter with `page` parameter. Calculate: `page = (offset / limit) + 1`

### 4. Employee Creation Changes

**v1.x Employee Creation:**
```json
{
  "name": "John Doe",
  "email": "john@company.com",
  "salary": 50000
}
```

**v2.0 Employee Creation:**
```json
{
  "firstName": "John",
  "lastName": "Doe", 
  "email": "john@company.com",
  "compensation": {
    "type": "hourly",
    "rate": 25.00
  }
}
```

**Migration Action:**
- Split `name` into `firstName` and `lastName`
- Replace `salary` with structured `compensation` object

## Step-by-Step Migration

### Phase 1: Preparation (Before Migration)

1. **Audit Current Usage:**
```bash
# Review API call patterns
grep -r "api/v1" src/ 
grep -r "status.*success" src/
grep -r "offset.*limit" src/
```

2. **Set Up v2 Testing Environment:**
```javascript
// Create v2 client for testing
const v2Client = new PayrollAPIClient({
  baseURL: 'https://api-staging.yourdomain.com/api/v2',
  version: '2.0'
});
```

3. **Create Compatibility Layer:**
```javascript
class APICompatibilityLayer {
  constructor(version = '1.0') {
    this.version = version;
    this.client = version === '2.0' ? v2Client : v1Client;
  }

  async getEmployees(params) {
    if (this.version === '2.0') {
      // Convert offset to page for v2
      const page = params.offset ? (params.offset / params.limit) + 1 : 1;
      return this.client.get('/employees', { page, limit: params.limit });
    } else {
      return this.client.get('/employees', params);
    }
  }
}
```

### Phase 2: Code Updates

1. **Update Response Handling:**
```javascript
// Before (v1.x)
function handleResponse(response) {
  if (response.status === 'success') {
    return response.data;
  } else {
    throw new Error(response.message);
  }
}

// After (v2.0)
function handleResponse(response) {
  if (response.success) {
    return response.data;
  } else {
    throw new Error(response.error.message);
  }
}
```

2. **Update Authentication Flow:**
```javascript
// Before (v1.x)
const loginData = {
  username: userEmail,
  password: userPassword
};

// After (v2.0)
const loginData = {
  email: userEmail,
  password: userPassword,
  tenantId: currentTenant // if multi-tenant
};
```

3. **Update Pagination Logic:**
```javascript
// Before (v1.x)
function getEmployeePage(pageNumber, pageSize) {
  const offset = (pageNumber - 1) * pageSize;
  return apiClient.get('/employees', { offset, limit: pageSize });
}

// After (v2.0)
function getEmployeePage(pageNumber, pageSize) {
  return apiClient.get('/employees', { page: pageNumber, limit: pageSize });
}
```

4. **Update Data Structures:**
```javascript
// Before (v1.x)
function createEmployee(name, email, salary) {
  return apiClient.post('/employees', {
    name,
    email,
    salary
  });
}

// After (v2.0)
function createEmployee(firstName, lastName, email, hourlyRate) {
  return apiClient.post('/employees', {
    firstName,
    lastName,
    email,
    compensation: {
      type: 'hourly',
      rate: hourlyRate
    }
  });
}
```

### Phase 3: Testing

1. **Run Migration Tests:**
```javascript
describe('v2 Migration Tests', () => {
  test('authentication works with email field', async () => {
    const response = await v2Client.login({
      email: 'test@company.com',
      password: 'password'
    });
    expect(response.success).toBe(true);
  });

  test('pagination uses page parameter', async () => {
    const response = await v2Client.getEmployees({ page: 1, limit: 10 });
    expect(response.metadata.pagination.page).toBe(1);
  });

  test('employee creation uses structured format', async () => {
    const employee = await v2Client.createEmployee({
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@test.com',
      compensation: { type: 'hourly', rate: 25.00 }
    });
    expect(employee.data.firstName).toBe('John');
  });
});
```

2. **Performance Comparison:**
```javascript
// Compare response times
async function compareVersionPerformance() {
  const v1Time = await measureResponseTime(() => v1Client.getEmployees());
  const v2Time = await measureResponseTime(() => v2Client.getEmployees());
  
  console.log(`v1 Response Time: ${v1Time}ms`);
  console.log(`v2 Response Time: ${v2Time}ms`);
  console.log(`Performance Improvement: ${((v1Time - v2Time) / v1Time * 100).toFixed(2)}%`);
}
```

### Phase 4: Deployment

1. **Feature Flag Approach:**
```javascript
const useV2API = process.env.USE_V2_API === 'true' || 
                  featureFlags.isEnabled('api-v2');

const apiClient = useV2API ? v2Client : v1Client;
```

2. **Gradual Rollout:**
```javascript
// Percentage-based rollout
const userHash = hashString(userId);
const useV2 = (userHash % 100) < parseInt(process.env.V2_ROLLOUT_PERCENTAGE || '0');

if (useV2) {
  // Use v2 API
} else {
  // Use v1 API
}
```

3. **Monitoring:**
```javascript
// Add version tracking to requests
apiClient.interceptors.request.use(config => {
  config.headers['Client-Version'] = 'MyApp/2.0.0';
  config.headers['API-Version-Used'] = apiVersion;
  return config;
});
```

## Common Migration Issues

### Issue 1: Token Format Changes

**Problem:** v2 tokens have different structure
**Solution:** Update token parsing logic

```javascript
// v1 token parsing
function parseV1Token(token) {
  const payload = JSON.parse(atob(token.split('.')[1]));
  return { userId: payload.sub, role: payload.role };
}

// v2 token parsing  
function parseV2Token(token) {
  const payload = JSON.parse(atob(token.split('.')[1]));
  return { 
    userId: payload.user_id, 
    role: payload.user_role,
    tenantId: payload.tenant_id 
  };
}
```

### Issue 2: Date Format Changes

**Problem:** v2 uses ISO 8601 format consistently
**Solution:** Update date handling

```javascript
// v1 mixed date formats
const hireDate = '03/15/2024'; // MM/DD/YYYY

// v2 ISO format
const hireDate = '2024-03-15T00:00:00Z'; // ISO 8601
```

### Issue 3: Error Response Structure

**Problem:** Error format changed
**Solution:** Update error handling

```javascript
// v1 error handling
catch (error) {
  if (error.response.message) {
    showError(error.response.message);
  }
}

// v2 error handling
catch (error) {
  if (error.response.error) {
    showError(error.response.error.message);
    logError(error.response.error.code);
  }
}
```

## Migration Checklist

- [ ] Review all API calls in codebase
- [ ] Update response parsing logic
- [ ] Change authentication field names
- [ ] Convert pagination parameters
- [ ] Restructure data objects
- [ ] Update error handling
- [ ] Modify date formatting
- [ ] Test with v2 staging environment
- [ ] Update documentation
- [ ] Train team on changes
- [ ] Plan rollout strategy
- [ ] Set up monitoring
- [ ] Prepare rollback plan

## Rollback Procedure

If issues arise during migration:

1. **Immediate Rollback:**
```bash
# Switch back to v1 via environment variable
export API_VERSION=v1
kubectl rollout restart deployment/app
```

2. **Gradual Rollback:**
```javascript
// Reduce v2 rollout percentage
process.env.V2_ROLLOUT_PERCENTAGE = '0';
```

3. **Database Rollback:**
```sql
-- Restore previous data format if needed
-- (Specific commands depend on changes made)
```

## Support and Resources

- **Migration Support:** migration-support@yourdomain.com
- **v2 Documentation:** https://docs.yourdomain.com/api/v2
- **Migration Tools:** https://github.com/yourdomain/api-migration-tools
- **Community Forum:** https://community.yourdomain.com/api-v2-migration

## Timeline Reminders

- **Now - Sep 1:** Plan and prepare for migration
- **Sep 1 - Oct 1:** Test with beta version
- **Oct 1 - Jan 1:** Migrate to v2.0
- **Jan 1:** v1.x deprecation begins
- **July 1, 2025:** v1.x end of life

Start your migration planning today to ensure a smooth transition!
