import * as fs from 'fs';
import * as path from 'path';
import { OpenAPIObject } from '@nestjs/swagger';

/**
 * API Versioning Documentation Generator
 * Creates comprehensive versioning guides, migration documentation, and version-specific references
 */

interface VersionInfo {
  version: string;
  releaseDate: string;
  status: 'current' | 'deprecated' | 'sunset' | 'planned';
  endOfLife?: string;
  deprecationDate?: string;
  breakingChanges: string[];
  newFeatures: string[];
  improvements: string[];
  bugFixes: string[];
}

export class VersioningGenerator {
  
  /**
   * Generate comprehensive versioning documentation
   */
  static generateVersioningDocs(document: OpenAPIObject, outputDir: string): void {
    const versioningDir = path.join(outputDir, 'versioning');
    
    if (!fs.existsSync(versioningDir)) {
      fs.mkdirSync(versioningDir, { recursive: true });
    }

    // Generate main versioning guide
    this.generateVersioningGuide(versioningDir);
    
    // Generate migration guides
    this.generateMigrationGuides(versioningDir);
    
    // Generate version comparison matrix
    this.generateVersionMatrix(versioningDir);
    
    // Generate changelog
    this.generateChangelog(versioningDir);
    
    // Generate deprecation notices
    this.generateDeprecationNotices(versioningDir);

    console.log(`📊 API versioning documentation generated in: ${versioningDir}`);
  }

  /**
   * Generate main versioning strategy guide
   */
  private static generateVersioningGuide(versioningDir: string): void {
    const guide = `# API Versioning Guide

## Versioning Strategy

The Security Workforce & Payroll Management API follows a comprehensive versioning strategy to ensure backward compatibility while enabling continuous improvement.

### Version Format

We use **Semantic Versioning (SemVer)** with the following format:
\`\`\`
MAJOR.MINOR.PATCH
\`\`\`

- **MAJOR**: Breaking changes that require client updates
- **MINOR**: New features that maintain backward compatibility  
- **PATCH**: Bug fixes and minor improvements

### URL-Based Versioning

API versions are specified in the URL path:
\`\`\`
https://api.yourdomain.com/api/v{MAJOR}/{endpoint}
\`\`\`

**Examples:**
- \`https://api.yourdomain.com/api/v1/employees\`
- \`https://api.yourdomain.com/api/v2/employees\`

### Header-Based Version Negotiation

Optionally, specify versions using headers:
\`\`\`http
Accept: application/vnd.payroll-api.v1+json
API-Version: 1.0
\`\`\`

### Current Version Information

**Current Stable Version:** v1.0.0
- Released: March 1, 2024
- Status: Active Development
- End of Life: TBD

## Version Lifecycle

### 1. Development Phase
- **Status:** \`planned\`
- **Duration:** 2-4 months
- **Activities:** Feature development, internal testing
- **Availability:** Not publicly available

### 2. Beta Release
- **Status:** \`beta\`
- **Duration:** 4-8 weeks
- **Activities:** Limited client testing, feedback collection
- **Availability:** By invitation only

### 3. Stable Release
- **Status:** \`current\`
- **Duration:** 18-24 months minimum
- **Activities:** Production use, maintenance updates
- **Availability:** Generally available

### 4. Maintenance Mode
- **Status:** \`maintenance\`
- **Duration:** 12 months
- **Activities:** Security updates, critical bug fixes only
- **Availability:** Still supported but deprecated

### 5. Deprecation
- **Status:** \`deprecated\`
- **Duration:** 12 months notice period
- **Activities:** Migration support, sunset planning
- **Availability:** Still functional but discouraged

### 6. End of Life
- **Status:** \`sunset\`
- **Activities:** API shutdown
- **Availability:** No longer accessible

## Backward Compatibility Policy

### What We Consider Breaking Changes

Changes that require client code modifications:

1. **Endpoint Changes:**
   - Removing or renaming endpoints
   - Changing HTTP methods
   - Modifying URL structures

2. **Request Changes:**
   - Removing required fields
   - Changing field types or formats
   - Modifying validation rules (stricter)
   - Removing optional fields that clients depend on

3. **Response Changes:**
   - Removing response fields
   - Changing response structure
   - Modifying data types
   - Changing error response formats

4. **Authentication Changes:**
   - Modifying authentication methods
   - Changing token formats
   - Updating security requirements

### What We Consider Non-Breaking Changes

Changes that maintain client compatibility:

1. **Additive Changes:**
   - Adding new endpoints
   - Adding optional request fields
   - Adding response fields
   - Adding new HTTP methods to existing endpoints

2. **Behavioral Improvements:**
   - Performance optimizations
   - Enhanced validation messages
   - Improved error details
   - Bug fixes that don't change interfaces

3. **Internal Changes:**
   - Database optimizations
   - Infrastructure updates
   - Logging improvements
   - Monitoring enhancements

## Version Support Timeline

| Version | Release Date | Deprecation | End of Life | Status |
|---------|-------------|-------------|-------------|---------|
| v1.0    | 2024-03-01  | TBD         | TBD         | Current |
| v2.0    | 2024-09-01  | -           | -           | Planned |

## Migration Strategy

### 1. Planning Phase (3 months before new version)
- Review upcoming changes
- Assess impact on your integration
- Plan development resources
- Test with beta version if available

### 2. Development Phase (2 months before new version)
- Update client code
- Modify error handling
- Update documentation
- Prepare deployment procedures

### 3. Testing Phase (1 month before new version)
- Test against staging environment
- Validate all use cases
- Performance testing
- User acceptance testing

### 4. Deployment Phase (new version release)
- Deploy to production
- Monitor for issues
- Gradual traffic migration
- Rollback procedures ready

## Best Practices for Clients

### 1. Version Pinning
Always specify the API version explicitly:

\`\`\`javascript
// Good: Explicit version
const apiClient = new PayrollAPI({
  baseURL: 'https://api.yourdomain.com/api/v1',
  version: '1.0'
});

// Bad: Implicit version (may break)
const apiClient = new PayrollAPI({
  baseURL: 'https://api.yourdomain.com/api/latest'
});
\`\`\`

### 2. Graceful Degradation
Handle version-specific features gracefully:

\`\`\`javascript
function getEmployeeData(id) {
  try {
    // Try new v2 endpoint with enhanced data
    return await apiClient.get(\`/v2/employees/\${id}\`);
  } catch (error) {
    if (error.status === 404 && error.code === 'ENDPOINT_NOT_FOUND') {
      // Fallback to v1 endpoint
      return await apiClient.get(\`/v1/employees/\${id}\`);
    }
    throw error;
  }
}
\`\`\`

### 3. Feature Detection
Check for feature availability:

\`\`\`javascript
// Check API capabilities
const capabilities = await apiClient.get('/capabilities');
if (capabilities.supports.bulkOperations) {
  // Use bulk endpoint
  await apiClient.post('/employees/bulk', employeeData);
} else {
  // Fallback to individual requests
  for (const employee of employeeData) {
    await apiClient.post('/employees', employee);
  }
}
\`\`\`

### 4. Version Headers
Include version information in requests:

\`\`\`http
GET /api/v1/employees HTTP/1.1
Host: api.yourdomain.com
Accept: application/vnd.payroll-api.v1+json
API-Version: 1.0
Client-Version: MyApp/2.1.0
\`\`\`

## Monitoring and Alerts

### Usage Tracking
We monitor version usage to make informed decisions:

- **Active Versions:** Track daily active clients per version
- **Deprecation Impact:** Monitor usage of deprecated features  
- **Migration Progress:** Track client adoption of new versions
- **Performance Metrics:** Compare performance across versions

### Deprecation Alerts
Clients receive advance notice through:

- **API Headers:** Deprecation warnings in responses
- **Email Notifications:** Direct communication to registered developers
- **Documentation Updates:** Prominent notices in API docs
- **Status Page:** Version lifecycle announcements

### Example Deprecation Header
\`\`\`http
HTTP/1.1 200 OK
Deprecation: true
Sunset: Fri, 31 Dec 2024 23:59:59 GMT
Link: <https://api.yourdomain.com/api/v2/employees>; rel="successor-version"
Warning: 299 - "Version v1 is deprecated. Migrate to v2 by Dec 31, 2024"
\`\`\`

## Version-Specific Documentation

Each version maintains its own documentation:

- **API Reference:** Version-specific endpoint documentation
- **Migration Guides:** Detailed upgrade instructions
- **Examples:** Version-appropriate code samples
- **SDKs:** Version-compatible client libraries

### Documentation URLs
- Current Version: \`/docs/v1\`
- All Versions: \`/docs/versions\`
- Migration Guides: \`/docs/migration\`
- Changelog: \`/docs/changelog\`

## Support and Communication

### Support Channels
- **Documentation:** Comprehensive guides and references
- **Email Support:** api-support@yourdomain.com  
- **Status Page:** https://status.yourdomain.com
- **Community Forum:** https://community.yourdomain.com

### Communication Timeline
- **90 Days:** New version announcement
- **60 Days:** Beta release availability
- **30 Days:** General availability notice
- **0 Days:** Version release
- **180 Days:** Deprecation announcement (for breaking changes)

## Conclusion

Our versioning strategy balances innovation with stability, ensuring that clients can adopt new features at their own pace while maintaining reliable service. We're committed to providing clear migration paths and comprehensive support throughout the version lifecycle.

For questions about versioning or migration planning, contact our API support team.
`;

    fs.writeFileSync(path.join(versioningDir, 'versioning-guide.md'), guide);
    console.log(`📋 Versioning guide: ${path.join(versioningDir, 'versioning-guide.md')}`);
  }
  /**
   * Generate migration guides for version upgrades
   */
  private static generateMigrationGuides(versioningDir: string): void {
    const migrationDir = path.join(versioningDir, 'migrations');
    
    if (!fs.existsSync(migrationDir)) {
      fs.mkdirSync(migrationDir, { recursive: true });
    }

    // V1 to V2 migration guide (future)
    const v1ToV2Guide = `# Migration Guide: v1.x to v2.0

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
\`\`\`json
{
  "status": "success",
  "data": { ... },
  "message": "Operation completed"
}
\`\`\`

**v2.0 Response Format:**
\`\`\`json
{
  "success": true,
  "data": { ... },
  "metadata": {
    "timestamp": "2024-03-10T10:30:00Z",
    "requestId": "req_123456789",
    "version": "2.0.0"
  }
}
\`\`\`

**Migration Action:**
Update response parsing to use \`success\` instead of \`status\` and handle new \`metadata\` structure.

### 2. Authentication Changes

**v1.x Authentication:**
\`\`\`http
POST /auth/login
{
  "username": "user@company.com",
  "password": "password"
}
\`\`\`

**v2.0 Authentication:**
\`\`\`http
POST /auth/login
{
  "email": "user@company.com",
  "password": "password",
  "tenantId": "optional-tenant-override"
}
\`\`\`

**Migration Action:**
- Change \`username\` field to \`email\`
- Optionally include \`tenantId\` for multi-tenant scenarios
- Update token refresh mechanism

### 3. Pagination Changes

**v1.x Pagination:**
\`\`\`http
GET /employees?offset=20&limit=10
\`\`\`

**v2.0 Pagination:**
\`\`\`http
GET /employees?page=3&limit=10
\`\`\`

**Migration Action:**
Replace \`offset\` parameter with \`page\` parameter. Calculate: \`page = (offset / limit) + 1\`

### 4. Employee Creation Changes

**v1.x Employee Creation:**
\`\`\`json
{
  "name": "John Doe",
  "email": "john@company.com",
  "salary": 50000
}
\`\`\`

**v2.0 Employee Creation:**
\`\`\`json
{
  "firstName": "John",
  "lastName": "Doe", 
  "email": "john@company.com",
  "compensation": {
    "type": "hourly",
    "rate": 25.00
  }
}
\`\`\`

**Migration Action:**
- Split \`name\` into \`firstName\` and \`lastName\`
- Replace \`salary\` with structured \`compensation\` object

## Step-by-Step Migration

### Phase 1: Preparation (Before Migration)

1. **Audit Current Usage:**
\`\`\`bash
# Review API call patterns
grep -r "api/v1" src/ 
grep -r "status.*success" src/
grep -r "offset.*limit" src/
\`\`\`

2. **Set Up v2 Testing Environment:**
\`\`\`javascript
// Create v2 client for testing
const v2Client = new PayrollAPIClient({
  baseURL: 'https://api-staging.yourdomain.com/api/v2',
  version: '2.0'
});
\`\`\`

3. **Create Compatibility Layer:**
\`\`\`javascript
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
\`\`\`

### Phase 2: Code Updates

1. **Update Response Handling:**
\`\`\`javascript
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
\`\`\`

2. **Update Authentication Flow:**
\`\`\`javascript
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
\`\`\`

3. **Update Pagination Logic:**
\`\`\`javascript
// Before (v1.x)
function getEmployeePage(pageNumber, pageSize) {
  const offset = (pageNumber - 1) * pageSize;
  return apiClient.get('/employees', { offset, limit: pageSize });
}

// After (v2.0)
function getEmployeePage(pageNumber, pageSize) {
  return apiClient.get('/employees', { page: pageNumber, limit: pageSize });
}
\`\`\`

4. **Update Data Structures:**
\`\`\`javascript
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
\`\`\`

### Phase 3: Testing

1. **Run Migration Tests:**
\`\`\`javascript
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
\`\`\`

2. **Performance Comparison:**
\`\`\`javascript
// Compare response times
async function compareVersionPerformance() {
  const v1Time = await measureResponseTime(() => v1Client.getEmployees());
  const v2Time = await measureResponseTime(() => v2Client.getEmployees());
  
  console.log(\`v1 Response Time: \${v1Time}ms\`);
  console.log(\`v2 Response Time: \${v2Time}ms\`);
  console.log(\`Performance Improvement: \${((v1Time - v2Time) / v1Time * 100).toFixed(2)}%\`);
}
\`\`\`

### Phase 4: Deployment

1. **Feature Flag Approach:**
\`\`\`javascript
const useV2API = process.env.USE_V2_API === 'true' || 
                  featureFlags.isEnabled('api-v2');

const apiClient = useV2API ? v2Client : v1Client;
\`\`\`

2. **Gradual Rollout:**
\`\`\`javascript
// Percentage-based rollout
const userHash = hashString(userId);
const useV2 = (userHash % 100) < parseInt(process.env.V2_ROLLOUT_PERCENTAGE || '0');

if (useV2) {
  // Use v2 API
} else {
  // Use v1 API
}
\`\`\`

3. **Monitoring:**
\`\`\`javascript
// Add version tracking to requests
apiClient.interceptors.request.use(config => {
  config.headers['Client-Version'] = 'MyApp/2.0.0';
  config.headers['API-Version-Used'] = apiVersion;
  return config;
});
\`\`\`

## Common Migration Issues

### Issue 1: Token Format Changes

**Problem:** v2 tokens have different structure
**Solution:** Update token parsing logic

\`\`\`javascript
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
\`\`\`

### Issue 2: Date Format Changes

**Problem:** v2 uses ISO 8601 format consistently
**Solution:** Update date handling

\`\`\`javascript
// v1 mixed date formats
const hireDate = '03/15/2024'; // MM/DD/YYYY

// v2 ISO format
const hireDate = '2024-03-15T00:00:00Z'; // ISO 8601
\`\`\`

### Issue 3: Error Response Structure

**Problem:** Error format changed
**Solution:** Update error handling

\`\`\`javascript
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
\`\`\`

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
\`\`\`bash
# Switch back to v1 via environment variable
export API_VERSION=v1
kubectl rollout restart deployment/app
\`\`\`

2. **Gradual Rollback:**
\`\`\`javascript
// Reduce v2 rollout percentage
process.env.V2_ROLLOUT_PERCENTAGE = '0';
\`\`\`

3. **Database Rollback:**
\`\`\`sql
-- Restore previous data format if needed
-- (Specific commands depend on changes made)
\`\`\`

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
`;

    fs.writeFileSync(path.join(migrationDir, 'v1-to-v2-migration.md'), v1ToV2Guide);
    console.log(`🔄 Migration guide: ${path.join(migrationDir, 'v1-to-v2-migration.md')}`);
  }
  /**
   * Generate version comparison matrix
   */
  private static generateVersionMatrix(versioningDir: string): void {
    const matrix = `# API Version Comparison Matrix

This document provides a detailed comparison of features and capabilities across different API versions.

## Version Overview

| Feature Category | v1.0 | v2.0 (Planned) | Notes |
|-----------------|------|----------------|-------|
| **Release Status** | ✅ Current | 🚧 Development | v2.0 planned for Q3 2024 |
| **End of Life** | July 2025 | TBD | 18+ month support cycle |

## Authentication & Security

| Feature | v1.0 | v2.0 | Migration Impact |
|---------|------|------|------------------|
| JWT Authentication | ✅ | ✅ | Compatible |
| Refresh Tokens | ✅ | ✅ | Compatible |
| Multi-Factor Auth | ❌ | ✅ | New feature |
| API Key Auth | ✅ | ✅ | Enhanced |
| OAuth 2.0 | ❌ | ✅ | New feature |
| Rate Limiting | ✅ Basic | ✅ Advanced | Enhanced policies |
| RBAC | ✅ | ✅ | Enhanced granularity |

## Core Endpoints

### Employee Management

| Operation | v1.0 Endpoint | v2.0 Endpoint | Changes |
|-----------|---------------|---------------|---------|
| List Employees | \`GET /employees\` | \`GET /employees\` | Pagination format |
| Get Employee | \`GET /employees/{id}\` | \`GET /employees/{id}\` | Response structure |
| Create Employee | \`POST /employees\` | \`POST /employees\` | Request format |
| Update Employee | \`PUT /employees/{id}\` | \`PATCH /employees/{id}\` | HTTP method |
| Delete Employee | \`DELETE /employees/{id}\` | \`DELETE /employees/{id}\` | Soft delete added |
| Bulk Operations | ❌ | \`POST /employees/bulk\` | New endpoint |

### Client Management

| Operation | v1.0 Endpoint | v2.0 Endpoint | Changes |
|-----------|---------------|---------------|---------|
| List Clients | \`GET /clients\` | \`GET /clients\` | Enhanced filtering |
| Get Client | \`GET /clients/{id}\` | \`GET /clients/{id}\` | More details |
| Create Client | \`POST /clients\` | \`POST /clients\` | Validation changes |
| Update Client | \`PUT /clients/{id}\` | \`PATCH /clients/{id}\` | HTTP method |
| Client Sites | \`GET /clients/{id}/sites\` | \`GET /clients/{id}/sites\` | Enhanced data |

### Attendance Tracking

| Operation | v1.0 Endpoint | v2.0 Endpoint | Changes |
|-----------|---------------|---------------|---------|
| Clock In | \`POST /attendance/clock-in\` | \`POST /attendance/clock-in\` | GPS validation |
| Clock Out | \`POST /attendance/clock-out\` | \`POST /attendance/clock-out\` | GPS validation |
| Get Attendance | \`GET /attendance\` | \`GET /attendance\` | Real-time data |
| Attendance Reports | \`GET /reports/attendance\` | \`GET /attendance/reports\` | Moved endpoint |
| Geofencing | ❌ | \`POST /attendance/geofence\` | New feature |

### Payroll Processing

| Operation | v1.0 Endpoint | v2.0 Endpoint | Changes |
|-----------|---------------|---------------|---------|
| Create Payroll | \`POST /payroll\` | \`POST /payroll\` | Enhanced validation |
| Get Payroll | \`GET /payroll/{id}\` | \`GET /payroll/{id}\` | More details |
| Approve Payroll | \`POST /payroll/{id}/approve\` | \`POST /payroll/{id}/approve\` | Workflow changes |
| Payroll Reports | \`GET /reports/payroll\` | \`GET /payroll/reports\` | Moved endpoint |
| Tax Calculations | ✅ Basic | ✅ Advanced | Enhanced algorithms |

## Data Formats

### Request/Response Structure

**v1.0 Response Format:**
\`\`\`json
{
  "status": "success" | "error",
  "data": { ... },
  "message": "string",
  "errors": ["string"]
}
\`\`\`

**v2.0 Response Format:**
\`\`\`json
{
  "success": boolean,
  "data": { ... },
  "error": {
    "code": "string",
    "message": "string",
    "details": { ... }
  },
  "metadata": {
    "timestamp": "ISO 8601",
    "requestId": "string",
    "version": "string"
  }
}
\`\`\`

### Pagination

**v1.0 Pagination:**
\`\`\`http
GET /employees?offset=20&limit=10

Response:
{
  "data": [...],
  "total": 150,
  "offset": 20,
  "limit": 10
}
\`\`\`

**v2.0 Pagination:**
\`\`\`http
GET /employees?page=3&limit=10

Response:
{
  "data": [...],
  "metadata": {
    "pagination": {
      "page": 3,
      "limit": 10,
      "total": 150,
      "totalPages": 15,
      "hasNext": true,
      "hasPrevious": true
    }
  }
}
\`\`\`

### Date Formats

| Version | Format | Example |
|---------|--------|---------|
| v1.0 | Mixed formats | \`"2024-03-15"\`, \`"03/15/2024"\` |
| v2.0 | ISO 8601 only | \`"2024-03-15T10:30:00Z"\` |

### Employee Data Structure

**v1.0 Employee Object:**
\`\`\`json
{
  "id": "string",
  "name": "string",
  "email": "string",
  "phone": "string",
  "position": "string",
  "salary": number,
  "hireDate": "string",
  "status": "active" | "inactive"
}
\`\`\`

**v2.0 Employee Object:**
\`\`\`json
{
  "id": "string",
  "firstName": "string",
  "lastName": "string",
  "email": "string",
  "phoneNumber": "string",
  "position": "string",
  "compensation": {
    "type": "hourly" | "salary",
    "rate": number,
    "currency": "USD"
  },
  "hireDate": "ISO 8601",
  "status": "active" | "inactive" | "terminated",
  "metadata": {
    "createdAt": "ISO 8601",
    "updatedAt": "ISO 8601"
  }
}
\`\`\`

## Feature Comparison

### Performance

| Metric | v1.0 | v2.0 | Improvement |
|--------|------|------|-------------|
| Average Response Time | 250ms | 150ms | 40% faster |
| Throughput (req/sec) | 500 | 1000 | 100% increase |
| Database Queries | Multiple | Optimized | Reduced N+1 queries |
| Caching | Basic | Redis | Enhanced caching |

### Security Enhancements

| Feature | v1.0 | v2.0 | Description |
|---------|------|------|-------------|
| Token Encryption | Basic | Enhanced | Stronger algorithms |
| Request Signing | ❌ | ✅ | HMAC signatures |
| IP Whitelisting | ❌ | ✅ | Network security |
| Audit Logging | Basic | Comprehensive | Enhanced tracking |
| Data Encryption | At rest | At rest + transit | End-to-end encryption |

### Monitoring & Observability

| Feature | v1.0 | v2.0 | Description |
|---------|------|------|-------------|
| Request Tracing | ❌ | ✅ | Distributed tracing |
| Custom Metrics | Limited | Comprehensive | Business metrics |
| Error Tracking | Basic | Enhanced | Structured logging |
| Performance APM | ❌ | ✅ | Application monitoring |

## Breaking Changes Summary

### High Impact Changes
These changes require code modifications:

1. **Response Format Change**
   - \`status\` field renamed to \`success\` (boolean)
   - Error structure completely redesigned
   - New \`metadata\` object added

2. **Authentication Changes**
   - \`username\` field renamed to \`email\`
   - Token structure modified
   - New optional \`tenantId\` field

3. **Pagination Changes**
   - \`offset\` parameter replaced with \`page\`
   - Response structure modified
   - New pagination metadata format

### Medium Impact Changes
These changes may require updates:

1. **HTTP Method Changes**
   - Update operations changed from \`PUT\` to \`PATCH\`
   - More RESTful approach

2. **Data Structure Changes**
   - Employee \`name\` split into \`firstName\` + \`lastName\`
   - \`salary\` replaced with structured \`compensation\`
   - Consistent date format (ISO 8601)

3. **Endpoint Reorganization**
   - Some report endpoints moved
   - New bulk operation endpoints

### Low Impact Changes
These are mostly additive:

1. **New Features**
   - Multi-factor authentication
   - OAuth 2.0 support
   - Geofencing capabilities
   - Bulk operations

2. **Enhanced Features**
   - Better error messages
   - More detailed responses
   - Improved filtering options

## Migration Effort Estimation

### Small Applications (< 10 API calls)
- **Effort:** 4-8 hours
- **Complexity:** Low
- **Focus:** Response parsing, auth fields

### Medium Applications (10-50 API calls)
- **Effort:** 1-2 days
- **Complexity:** Medium  
- **Focus:** Pagination, data structures, testing

### Large Applications (50+ API calls)
- **Effort:** 3-5 days
- **Complexity:** High
- **Focus:** Comprehensive refactoring, feature flags

## Recommendation by Use Case

### Simple Integrations
**Recommended Approach:** Direct migration
- Update response parsing
- Change auth field names
- Test thoroughly

### Complex Integrations
**Recommended Approach:** Gradual migration
- Implement compatibility layer
- Use feature flags
- Migrate endpoint by endpoint

### High-Traffic Applications
**Recommended Approach:** Blue-green deployment
- Parallel v1/v2 environments
- Traffic switching capability
- Comprehensive monitoring

## Support Matrix

| Version | Bug Fixes | Security Updates | New Features | End of Life |
|---------|-----------|-----------------|--------------|-------------|
| v1.0 | ✅ Until Jul 2025 | ✅ Until Jul 2025 | ❌ | July 2025 |
| v2.0 | ✅ | ✅ | ✅ | TBD (18+ months) |

## Getting Started with v2.0

1. **Review this comparison matrix**
2. **Read the [migration guide](migrations/v1-to-v2-migration.md)**
3. **Test with v2.0 beta (available Sep 2024)**
4. **Plan your migration timeline**
5. **Contact support for migration assistance**

---

**Note:** This matrix is updated regularly. Check back for the latest information as v2.0 development progresses.

Last updated: March 10, 2024
`;

    fs.writeFileSync(path.join(versioningDir, 'version-matrix.md'), matrix);
    console.log(`📊 Version matrix: ${path.join(versioningDir, 'version-matrix.md')}`);
  }

  /**
   * Generate changelog with version history
   */
  private static generateChangelog(versioningDir: string): void {
    const changelog = `# API Changelog

All notable changes to the Security Workforce & Payroll Management API are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Planning for v2.0 major release
- OAuth 2.0 authentication support (planned)
- Multi-factor authentication (planned)
- Advanced geofencing for attendance (planned)

## [1.0.3] - 2024-03-10

### Added
- Comprehensive API documentation with Swagger
- Postman collections for testing and onboarding
- Error reference documentation
- Integration guides and SDK examples

### Changed
- Enhanced error messages with more context
- Improved response times for employee queries
- Better validation messages for form inputs

### Fixed
- Fixed pagination issue with large datasets
- Resolved timezone handling in attendance records
- Corrected payroll calculation edge cases

### Security
- Updated JWT token validation
- Enhanced rate limiting algorithms
- Improved audit logging coverage

## [1.0.2] - 2024-02-15

### Added
- Bulk employee import functionality
- Enhanced filtering options for reports
- Support for custom employee fields
- Webhook notifications for payroll events

### Changed
- Optimized database queries for better performance
- Updated employee status workflow
- Enhanced client site management

### Fixed
- Fixed attendance record duplication issue
- Resolved client creation validation bug
- Corrected shift scheduling conflicts

### Deprecated
- Legacy report formats (use new format, old format sunset in v2.0)

## [1.0.1] - 2024-01-20

### Added
- Real-time attendance tracking
- GPS verification for clock in/out
- Enhanced payroll calculation engine
- Client billing automation

### Changed
- Improved error response consistency
- Updated authentication token expiration handling
- Enhanced role-based permission checks

### Fixed
- Fixed employee assignment edge cases
- Resolved payroll rounding inconsistencies
- Corrected site-specific permission issues

### Security
- Patched JWT token vulnerability (CVE-2024-001)
- Enhanced input validation across all endpoints
- Updated dependencies to address security advisories

## [1.0.0] - 2024-01-01

### Added
- Initial stable release of the Payroll API
- Core employee management functionality
- Client and site management
- Attendance tracking system
- Payroll processing engine
- Role-based access control (RBAC)
- Multi-tenant architecture support
- Comprehensive audit logging
- RESTful API design with JSON responses
- JWT-based authentication
- Rate limiting and throttling
- Swagger/OpenAPI documentation

### Security
- Implemented secure authentication system
- Added comprehensive input validation
- Established security audit trails
- Multi-tenant data isolation

## [0.9.0-beta] - 2023-12-01

### Added
- Beta release for limited client testing
- Core CRUD operations for all entities
- Basic reporting functionality
- Authentication and authorization framework

### Changed
- Refined API response formats based on feedback
- Updated validation rules for employee data
- Improved error handling mechanisms

### Known Issues
- Performance optimization needed for large datasets
- Some edge cases in payroll calculations
- Limited bulk operation support

## [0.8.0-alpha] - 2023-11-01

### Added
- Alpha release for internal testing
- Basic employee lifecycle management
- Simple attendance tracking
- Prototype payroll calculations
- Initial multi-tenant support

### Changed
- Migrated from REST to GraphQL (later reverted to REST)
- Updated database schema for better performance
- Refined authentication mechanisms

## Version Support Timeline

| Version | Status | Release Date | End of Support |
|---------|--------|-------------|----------------|
| 1.0.x | Current | 2024-01-01 | 2025-07-01 |
| 2.0.x | Planned | 2024-10-01 | TBD |
| 0.9.x | Sunset | 2023-12-01 | 2024-01-31 |
| 0.8.x | Sunset | 2023-11-01 | 2023-12-31 |

## Breaking Changes by Version

### v1.0.0
- First stable release - no breaking changes from beta

### v2.0.0 (Planned)
- Response format standardization (\`status\` → \`success\`)
- Authentication field changes (\`username\` → \`email\`)
- Pagination parameter changes (\`offset\` → \`page\`)
- Employee data structure changes (split name field)
- HTTP method changes for updates (\`PUT\` → \`PATCH\`)

## Migration Paths

### From v0.x to v1.0
- **Complexity:** High
- **Effort:** 2-3 weeks
- **Key Changes:** Complete API redesign
- **Status:** Migration window closed (Jan 2024)

### From v1.x to v2.0
- **Complexity:** Medium
- **Effort:** 1-2 weeks  
- **Key Changes:** Response format, auth fields, pagination
- **Status:** Planning phase (migration starts Oct 2024)

## Deprecation Policy

We follow a structured deprecation policy:

1. **Announcement:** 6 months before deprecation
2. **Deprecation Headers:** Added to responses 3 months before
3. **Migration Period:** 6 months minimum support after deprecation
4. **Sunset:** Final removal after migration period

## Security Updates

Security updates are provided for:
- **Current Version:** Immediate updates
- **Previous Version:** Critical security fixes only
- **Older Versions:** No security support

### Recent Security Updates

#### CVE-2024-001 (Fixed in v1.0.1)
- **Severity:** Medium
- **Component:** JWT token validation
- **Impact:** Potential token bypass in specific conditions
- **Fix:** Enhanced token validation logic

#### CVE-2023-002 (Fixed in v1.0.0)
- **Severity:** High  
- **Component:** Input validation
- **Impact:** Potential SQL injection in employee search
- **Fix:** Parameterized queries and enhanced validation

## Performance Improvements

### v1.0.3
- Employee list queries: 40% faster
- Payroll calculations: 25% reduction in processing time
- Database connection pooling: Improved resource utilization

### v1.0.2
- Report generation: 60% performance improvement
- Bulk operations: Support for larger datasets
- Caching layer: Reduced API response times

### v1.0.1
- Real-time features: Optimized WebSocket connections
- GPS processing: Reduced location verification time
- Database indices: Improved query performance

## API Stability Commitment

We are committed to maintaining API stability:

- **Backwards Compatibility:** Maintained within major versions
- **Deprecation Notice:** Minimum 6 months advance notice
- **Migration Support:** Comprehensive guides and tools provided
- **Testing:** Extensive compatibility testing before releases

## Feedback and Support

- **Bug Reports:** Create issues in our support portal
- **Feature Requests:** Submit via our roadmap planning process
- **Security Issues:** Report to security@yourdomain.com
- **General Support:** Contact api-support@yourdomain.com

## Release Process

Our release process ensures quality and reliability:

1. **Development:** Feature development and testing
2. **Alpha:** Internal testing and validation
3. **Beta:** Limited client testing and feedback
4. **Release Candidate:** Final testing and documentation
5. **Stable Release:** General availability with full support

## Semantic Versioning Guide

We follow semantic versioning (MAJOR.MINOR.PATCH):

- **MAJOR:** Breaking changes requiring client updates
- **MINOR:** New features maintaining backward compatibility
- **PATCH:** Bug fixes and minor improvements

### Examples
- \`1.0.3 → 1.0.4\`: Bug fixes only
- \`1.0.3 → 1.1.0\`: New features added
- \`1.0.3 → 2.0.0\`: Breaking changes introduced

---

For more detailed information about specific versions, see our [version comparison matrix](version-matrix.md) and [migration guides](migrations/).
`;

    fs.writeFileSync(path.join(versioningDir, 'changelog.md'), changelog);
    console.log(`📝 Changelog: ${path.join(versioningDir, 'changelog.md')}`);
  }
  /**
   * Generate deprecation notices and sunset schedules
   */
  private static generateDeprecationNotices(versioningDir: string): void {
    const deprecationNotices = `# Deprecation Notices & Sunset Schedule

This document contains important information about deprecated features and upcoming changes to the API.

## Current Deprecation Notices

### ⚠️ No Active Deprecations

Currently, there are no active deprecation notices for the API. All features in v1.0.x are fully supported.

## Planned Deprecations (v2.0 Release)

The following features will be deprecated when v2.0 is released (October 2024):

### 1. Response Format (v1.x)

**Deprecation Date:** October 1, 2024  
**End of Life:** July 1, 2025  
**Impact:** High - Affects all API responses

**Current Format (v1.x):**
\`\`\`json
{
  "status": "success",
  "data": { ... },
  "message": "Operation completed"
}
\`\`\`

**New Format (v2.0+):**
\`\`\`json
{
  "success": true,
  "data": { ... },
  "metadata": {
    "timestamp": "2024-03-10T10:30:00Z",
    "requestId": "req_123456789"
  }
}
\`\`\`

**Migration Action Required:**
- Update response parsing to check \`success\` instead of \`status\`
- Handle new \`metadata\` structure
- Update error handling for new error format

### 2. Authentication Username Field

**Deprecation Date:** October 1, 2024  
**End of Life:** July 1, 2025  
**Impact:** Medium - Affects login requests

**Current Field:**
\`\`\`json
{
  "username": "user@company.com",
  "password": "password"
}
\`\`\`

**New Field:**
\`\`\`json
{
  "email": "user@company.com", 
  "password": "password"
}
\`\`\`

**Migration Action Required:**
- Change \`username\` field to \`email\` in login requests
- Update client-side form field names
- Modify authentication libraries/SDKs

### 3. Offset-Based Pagination

**Deprecation Date:** October 1, 2024  
**End of Life:** July 1, 2025  
**Impact:** Medium - Affects list endpoints

**Current Parameter:**
\`\`\`http
GET /employees?offset=20&limit=10
\`\`\`

**New Parameter:**
\`\`\`http
GET /employees?page=3&limit=10
\`\`\`

**Migration Action Required:**
- Convert \`offset\` calculations to \`page\` numbers
- Update pagination UI components
- Modify API client libraries

### 4. PUT Method for Updates

**Deprecation Date:** October 1, 2024  
**End of Life:** July 1, 2025  
**Impact:** Low - Affects update operations

**Current Method:**
\`\`\`http
PUT /employees/123
\`\`\`

**New Method:**
\`\`\`http
PATCH /employees/123
\`\`\`

**Migration Action Required:**
- Change HTTP method from PUT to PATCH
- Update API client method calls
- Modify request libraries

## Deprecation Timeline

\`\`\`
2024-10-01  │ v2.0 Release & Deprecation Start
            │
2024-10-01  ├─ Deprecation headers added to v1.x responses
            │
2024-11-01  ├─ Email notifications to developers
            │
2024-12-01  ├─ Documentation updates with migration guides  
            │
2025-01-01  ├─ Developer dashboard deprecation warnings
            │
2025-04-01  ├─ Final migration reminders
            │
2025-07-01  └─ v1.x End of Life (Sunset)
\`\`\`

## Deprecation Headers

When features become deprecated, API responses will include standard deprecation headers:

### Response Headers
\`\`\`http
HTTP/1.1 200 OK
Deprecation: true
Sunset: Fri, 01 Jul 2025 00:00:00 GMT
Link: <https://api.yourdomain.com/api/v2/employees>; rel="successor-version"
Warning: 299 - "API v1 is deprecated. Please migrate to v2 by July 1, 2025"
\`\`\`

### Header Meanings
- **Deprecation:** Indicates the feature is deprecated (true/false)
- **Sunset:** RFC 3339 date when the feature will be removed
- **Link:** URL of the replacement feature or documentation  
- **Warning:** Human-readable deprecation message

## Developer Notifications

### Notification Channels
We will notify developers through multiple channels:

1. **API Response Headers** (Immediate)
2. **Email Notifications** (Monthly)
3. **Developer Dashboard** (Real-time alerts)
4. **Documentation Updates** (Ongoing)
5. **Community Forum** (Announcements)
6. **Status Page** (Major milestones)

### Email Schedule
- **Month 1:** Deprecation announcement
- **Month 3:** Migration guide availability
- **Month 6:** Migration deadline reminder
- **Month 8:** Final notice (1 month before sunset)

### Dashboard Warnings
Your developer dashboard will display:
- Active deprecation warnings
- Migration progress tracking
- Sunset countdown timers
- Migration resource links

## Migration Support

### Available Resources

1. **Migration Guides**
   - Step-by-step migration instructions
   - Code examples and best practices
   - Common issue troubleshooting

2. **Migration Tools**
   - Automated migration scripts
   - Compatibility checkers
   - Testing utilities

3. **Developer Support**
   - Dedicated migration support team
   - Priority support tickets
   - Office hours consultations

4. **Testing Environment**
   - v2.0 beta API access
   - Migration validation tools
   - Performance comparison tools

### Migration Assistance

**Free Migration Support Includes:**
- Migration planning consultation
- Technical documentation review
- Best practices guidance
- Issue prioritization during migration window

**Premium Migration Support:**
- Dedicated migration engineer
- Custom migration tools
- Code review and optimization
- 24/7 support during migration

Contact migration-support@yourdomain.com for assistance.

## Sunset Process

### Phase 1: Deprecation Notice (6 months)
- Feature marked as deprecated
- Headers added to responses
- Documentation updated
- Migration guides published

### Phase 2: Active Migration (4 months)
- Developer notifications sent
- Migration tools available
- Support team assistance
- Progress monitoring

### Phase 3: Final Warning (2 months)
- Escalated notifications
- Dashboard warnings prominent
- Final migration push
- Emergency migration support

### Phase 4: Sunset (Feature removal)
- Feature permanently disabled
- 410 Gone responses returned
- Redirect to replacement (if applicable)
- Post-sunset support available

## Testing Deprecated Features

### Feature Flag Testing
Test migration readiness using feature flags:

\`\`\`javascript
// Test v2.0 compatibility
if (process.env.TEST_V2_MIGRATION === 'true') {
  // Use v2.0 format
  const response = parseV2Response(apiResponse);
} else {
  // Use v1.x format
  const response = parseV1Response(apiResponse);
}
\`\`\`

### Deprecation Header Testing
Monitor deprecation headers in your applications:

\`\`\`javascript
// Check for deprecation warnings
apiClient.interceptors.response.use(response => {
  if (response.headers.deprecation) {
    console.warn(\`Deprecated API used: \${response.config.url}\`);
    console.warn(\`Sunset date: \${response.headers.sunset}\`);
    
    // Log to monitoring system
    logger.warn('deprecated_api_usage', {
      url: response.config.url,
      sunset: response.headers.sunset,
      successor: response.headers.link
    });
  }
  
  return response;
});
\`\`\`

## Frequently Asked Questions

### Q: Can I continue using v1.x after the sunset date?
**A:** No, v1.x endpoints will return 410 Gone responses after July 1, 2025. All functionality will be disabled.

### Q: Will you provide automatic migration?
**A:** We provide migration tools and scripts, but testing and deployment remain your responsibility.

### Q: What if I can't migrate by the deadline?
**A:** Contact our support team before the deadline to discuss options. Emergency extensions may be available on a case-by-case basis.

### Q: Are there any costs associated with migration?
**A:** Basic migration support is free. Premium support services are available for complex integrations.

### Q: Will new features be added to v1.x?
**A:** No, v1.x is in maintenance mode. New features are only added to v2.0+.

### Q: How do I track my migration progress?
**A:** Use your developer dashboard to monitor API usage patterns and identify areas that need migration.

## Emergency Procedures

### Critical Issue During Migration
If you encounter critical issues during migration:

1. **Immediate Support:** Contact emergency-support@yourdomain.com
2. **Rollback:** Revert to v1.x immediately if possible
3. **Report:** Document the issue with reproduction steps
4. **Escalation:** Issues are escalated to engineering team within 2 hours

### Post-Sunset Issues
If you discover v1.x usage after sunset:

1. **Assessment:** Review impact on your application
2. **Hotfix:** Apply immediate workarounds if available
3. **Migration:** Complete remaining migration tasks ASAP
4. **Support:** Contact post-sunset-support@yourdomain.com

## Contact Information

### Migration Support Team
- **Email:** migration-support@yourdomain.com
- **Phone:** +1-555-API-HELP (during business hours)
- **Slack:** #api-migration (for registered developers)

### Documentation Team
- **Email:** docs-feedback@yourdomain.com
- **Updates:** Subscribe to changelog notifications

### Emergency Support
- **Email:** emergency-support@yourdomain.com
- **Available:** 24/7 during migration periods

---

**Important:** This document is updated regularly. Subscribe to notifications or check back frequently for the latest information.

Last Updated: March 10, 2024  
Next Review: April 1, 2024
`;

    fs.writeFileSync(path.join(versioningDir, 'deprecation-notices.md'), deprecationNotices);
    console.log(`⚠️ Deprecation notices: ${path.join(versioningDir, 'deprecation-notices.md')}`);
  }
}