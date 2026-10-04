# Authentication & Authorization Guide

## Overview

The API uses JWT (JSON Web Tokens) for authentication and role-based access control (RBAC) for authorization.

## Authentication Flow

### 1. Login
```http
POST /auth/login
{
  "email": "user@company.com",
  "password": "secure-password"
}
```

### 2. Token Usage
Include the JWT token in the Authorization header:
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 3. Token Refresh
When your access token expires, use the refresh token:
```http
POST /auth/refresh
{
  "refreshToken": "your-refresh-token"
}
```

## User Roles

### COMPANY_ADMIN
- Full access to all company resources
- Can manage employees, clients, and settings
- Access to financial and sensitive data

### MANAGER
- Manage assigned sites and employees
- Create and modify schedules
- View operational reports

### SUPERVISOR
- Monitor assigned sites
- Approve attendance and timesheets
- Handle day-to-day operations

### EMPLOYEE
- View own schedule and assignments
- Clock in/out and manage attendance
- Access personal information

### CLIENT_USER
- View contracted sites and services
- Access reports and invoices
- Manage client-specific settings

## Permission System

Permissions are granular and assigned to roles:

### Employee Permissions
- `CREATE_EMPLOYEE`
- `READ_EMPLOYEE`
- `UPDATE_EMPLOYEE`
- `DELETE_EMPLOYEE`

### Client Permissions
- `CREATE_CLIENT`
- `READ_CLIENT`
- `UPDATE_CLIENT`
- `DELETE_CLIENT`

### Payroll Permissions
- `CREATE_PAYROLL`
- `READ_PAYROLL`
- `UPDATE_PAYROLL`
- `APPROVE_PAYROLL`

## Multi-Tenant Security

The API enforces strict tenant isolation:
- Users can only access data within their company
- All database queries are automatically scoped by tenant ID
- Cross-tenant data access is blocked at the database level

## Security Best Practices

1. **Token Storage**: Store tokens securely (httpOnly cookies recommended)
2. **Token Rotation**: Implement automatic token refresh
3. **Permission Checks**: Always check user permissions before API calls
4. **Secure Communication**: Use HTTPS in production
5. **Rate Limiting**: Respect API rate limits
6. **Error Handling**: Don't expose sensitive information in errors

## Example: Protected Resource Access

```javascript
// Check if user has permission before making request
if (user.permissions.includes('READ_EMPLOYEE')) {
  const employees = await api.get('/employees');
}
```

## Troubleshooting

### Common Authentication Errors

- `401 Unauthorized`: Token missing, invalid, or expired
- `403 Forbidden`: User lacks required permissions
- `429 Too Many Requests`: Rate limit exceeded

### Token Validation

You can validate token status:
```http
GET /auth/profile
Authorization: Bearer your-token
```

Returns user profile if token is valid, or 401 if invalid/expired.
