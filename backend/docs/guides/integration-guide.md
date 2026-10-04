# Comprehensive API Integration Guide

## Overview

The Security Workforce & Payroll Management API is a RESTful web service that enables comprehensive workforce management operations including employee lifecycle, scheduling, attendance tracking, and payroll processing.

## Quick Start

### 1. API Access Setup

#### Base URLs
- **Development:** `http://localhost:3005/api/v1`
- **Staging:** `https://api-staging.yourdomain.com/api/v1`
- **Production:** `https://api.yourdomain.com/api/v1`

#### Authentication Flow
```http
POST /auth/login
Content-Type: application/json

{
  "email": "admin@company.com",
  "password": "secure-password"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "usr_123456789",
      "email": "admin@company.com",
      "role": "COMPANY_ADMIN",
      "tenantId": "cmp_acme-security"
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "expiresIn": 3600
    }
  }
}
```

### 2. Making Authenticated Requests

Include the JWT token in all subsequent requests:

```http
GET /employees
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

## Common Operations

#### Create Employee
```http
POST /employees
Authorization: Bearer <your-token>
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@company.com",
  "phoneNumber": "+1-555-0123",
  "employeeId": "EMP001",
  "position": "Security Guard",
  "hireDate": "2024-01-15",
  "hourlyRate": 25.00,
  "skills": ["Security Guard", "CPR Certified"]
}
```

#### Get Employee List
```http
GET /employees?page=1&limit=20&sortBy=lastName&sortOrder=asc
Authorization: Bearer <your-token>
```

#### Create Client
```http
POST /clients
Authorization: Bearer <your-token>
Content-Type: application/json

{
  "name": "Acme Corporation",
  "contactEmail": "security@acme.com",
  "organizationType": "CORPORATE",
  "contactInfo": {
    "phone": "+1-555-0199",
    "address": {
      "street": "123 Business Ave",
      "city": "New York",
      "state": "NY",
      "zipCode": "10001"
    }
  }
}
```

## Response Format Standards

### Success Response
```json
{
  "success": true,
  "data": {
    // Response payload
  },
  "metadata": {
    "timestamp": "2024-03-10T10:30:00Z",
    "requestId": "req_123456789",
    "version": "1.0.0"
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Input validation failed",
    "details": {
      "fields": [
        {
          "field": "email",
          "message": "Email must be a valid email address"
        }
      ]
    }
  },
  "metadata": {
    "timestamp": "2024-03-10T10:30:00Z",
    "requestId": "req_123456789"
  }
}
```

### Paginated Response
```json
{
  "success": true,
  "data": [...],
  "metadata": {
    "timestamp": "2024-03-10T10:30:00Z",
    "requestId": "req_123456789",
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "totalPages": 8,
      "hasNext": true,
      "hasPrevious": false
    }
  }
}
```

## Core Concepts

### Multi-Tenancy
- All data is isolated by tenant (company)
- Users can only access data within their tenant
- Super admins can access multiple tenants
- Tenant context is automatically handled via JWT

### Role-Based Access Control (RBAC)
- **EMPLOYEE:** Basic access to own data
- **SUPERVISOR:** Team management capabilities
- **MANAGER:** Departmental oversight
- **COMPANY_ADMIN:** Full company access
- **SUPER_ADMIN:** Platform-wide access

### Resource Ownership
- Users can always access resources they own
- Elevated permissions required for non-owned resources
- Ownership rules vary by resource type

## Rate Limiting

The API implements rate limiting to ensure fair usage:

| Endpoint Type | Limit | Window |
|---------------|-------|--------|
| Authentication | 10 requests | 1 minute |
| Standard Operations | 100 requests | 1 minute |
| File Uploads | 5 requests | 1 minute |
| Reporting/Analytics | 20 requests | 1 minute |

Rate limit headers are included in responses:
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1710072600
Retry-After: 60
```

## Pagination Guidelines

Most list endpoints support pagination:

### Query Parameters
- `page`: Page number (1-indexed, default: 1)
- `limit`: Items per page (1-100, default: 20)
- `sortBy`: Field to sort by (default: createdAt)
- `sortOrder`: Sort direction (asc/desc, default: desc)
- `search`: Search query string

### Example
```http
GET /employees?page=2&limit=50&sortBy=lastName&sortOrder=asc&search=john
```

## Error Handling Best Practices

### 1. Check Response Status
Always check the `success` field before processing data:

```javascript
if (response.data.success) {
  // Process successful response
  const employees = response.data.data;
} else {
  // Handle error
  const error = response.data.error;
  console.error(`API Error [${error.code}]: ${error.message}`);
}
```

### 2. Handle Token Expiration
```javascript
if (error.code === 'TOKEN_EXPIRED') {
  // Refresh token or redirect to login
  await refreshAuthToken();
  // Retry original request
}
```

### 3. Retry on Rate Limiting
```javascript
if (error.code === 'RATE_LIMIT_EXCEEDED') {
  const retryAfter = error.details.retryAfter || 60;
  setTimeout(() => {
    // Retry request
    makeApiCall();
  }, retryAfter * 1000);
}
```

## Testing Your Integration

### 1. API Health Check
```http
GET /health
```

### 2. Authentication Test
```http
GET /auth/profile
Authorization: Bearer <your-token>
```

### 3. Permission Test
Try accessing different endpoints with various user roles to verify RBAC is working correctly.

## Next Steps

1. Review the [SDK Examples](../sdk/) for language-specific implementations
2. Check [Use Case Examples](../examples/) for common workflow patterns
3. Read the [Testing Guide](./testing-guide.md) for comprehensive testing strategies
4. Review [Deployment Guide](./deployment-guide.md) for production considerations
