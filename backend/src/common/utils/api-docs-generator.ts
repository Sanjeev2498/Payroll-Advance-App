import { SwaggerModule, DocumentBuilder, OpenAPIObject } from '@nestjs/swagger';
import { INestApplication } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { ErrorReferenceGenerator } from './error-reference-generator';
import { IntegrationGuideGenerator } from './integration-guide-generator';
import { PostmanGenerator } from './postman-generator';
import { VersioningGenerator } from './versioning-generator';

/**
 * Generate comprehensive API documentation
 */
export class ApiDocsGenerator {
  /**
   * Setup Swagger documentation for the application
   */
  static setupSwagger(app: INestApplication): OpenAPIObject {
    const config = new DocumentBuilder()
      .setTitle('Security Workforce & Payroll Management API')
      .setDescription(this.getApiDescription())
      .setVersion('1.0.0')
      .setContact(
        'API Support',
        'https://yourdomain.com/support',
        'api-support@yourdomain.com'
      )
      .setLicense(
        'Proprietary License',
        'https://yourdomain.com/license'
      )
      .addBearerAuth(
        {
          description: 'JWT Authorization header using the Bearer scheme. Example: "Authorization: Bearer {token}"',
          name: 'Authorization',
          bearerFormat: 'JWT',
          scheme: 'bearer',
          type: 'http',
          in: 'header',
        },
        'JWT-auth',
      )
      .addApiKey(
        {
          type: 'apiKey',
          name: 'X-API-Key',
          in: 'header',
          description: 'API Key for server-to-server authentication',
        },
        'api-key',
      )
      .addSecurityRequirements('JWT-auth')
      .addTag('Authentication', 'User authentication, authorization, and session management')
      .addTag('Users', 'User management and profile operations')
      .addTag('Clients', 'Client management, onboarding, and relationship tracking')
      .addTag('Sites', 'Site operations, requirements, and deployment management')
      .addTag('Employees', 'Employee lifecycle, skills management, and compliance tracking')
      .addTag('Assignments', 'Workforce assignment, scheduling, and optimization')
      .addTag('Shifts', 'Shift management, patterns, and coverage tracking')
      .addTag('Attendance', 'Real-time attendance tracking, GPS verification, and anomaly detection')
      .addTag('Payroll', 'Payroll processing, calculations, and salary management')
      .addTag('Billing', 'Client billing, invoicing, and payment tracking')
      .addTag('Invoices', 'Invoice generation, management, and financial reporting')
      .addTag('Dashboard', 'Operational dashboards, KPIs, and analytics')
      .addTag('Reports', 'Comprehensive reporting and data exports')
      .addTag('Files', 'Secure file uploads and document management')
      .addTag('Health', 'System health checks and monitoring endpoints')
      .addServer('http://localhost:3005/api', 'Development server')
      .addServer('https://api-staging.yourdomain.com/api', 'Staging server')
      .addServer('https://api.yourdomain.com/api', 'Production server')
      .build();

    return SwaggerModule.createDocument(app, config, {
      operationIdFactory: (controllerKey: string, methodKey: string) => methodKey,
      deepScanRoutes: true,
    });
  }

  /**
   * Generate additional documentation files
   */
  static generateDocumentationFiles(document: OpenAPIObject): void {
    const docsDir = path.join(process.cwd(), 'docs');
    
    // Ensure docs directory exists
    if (!fs.existsSync(docsDir)) {
      fs.mkdirSync(docsDir, { recursive: true });
    }

    // Generate OpenAPI JSON
    this.generateOpenAPIJson(document, docsDir);
    
    // Generate comprehensive integration guides and examples
    IntegrationGuideGenerator.generateIntegrationGuides(docsDir);
    
    // Generate Postman collections
    PostmanGenerator.generatePostmanCollections(document, docsDir);
    
    // Generate versioning documentation
    VersioningGenerator.generateVersioningDocs(document, docsDir);
    
    // Generate authentication guide
    this.generateAuthGuide(docsDir);
    
    // Generate error codes documentation
    this.generateErrorCodesDoc(docsDir);

    console.log(`📚 API Documentation generated in: ${docsDir}`);
  }

  /**
   * Generate OpenAPI JSON specification
   */
  private static generateOpenAPIJson(document: OpenAPIObject, docsDir: string): void {
    // Enhance the document with missing summaries and descriptions
    const enhancedDocument = this.enhanceOpenAPIDocument(document);
    
    const openApiPath = path.join(docsDir, 'openapi.json');
    fs.writeFileSync(openApiPath, JSON.stringify(enhancedDocument, null, 2));
    console.log(`📄 OpenAPI JSON: ${openApiPath}`);
  }

  static enhanceOpenAPIDocument(document: OpenAPIObject): OpenAPIObject {
    const enhanced = JSON.parse(JSON.stringify(document)); // Deep clone
    
    if (!enhanced.paths) return enhanced;

    // Add missing summaries and descriptions to all endpoints
    Object.entries(enhanced.paths).forEach(([path, pathItem]) => {
      if (!pathItem || typeof pathItem !== 'object') return;
      
      Object.entries(pathItem).forEach(([method, operation]) => {
        if (method === 'parameters') return; // Skip path-level parameters
        
        const op = operation as any;
        if (!op) return;
        
        // Ensure tags exist
        if (!op.tags || !Array.isArray(op.tags) || op.tags.length === 0) {
          op.tags = this.inferTagsFromPath(path);
        }
        
        // Add summary if missing
        if (!op.summary && !op.description) {
          op.summary = this.generateSummaryFromPath(method.toUpperCase(), path);
        }
        
        // Add description if only summary exists (for better documentation)
        if (op.summary && !op.description) {
          op.description = this.generateDescriptionFromPath(method.toUpperCase(), path);
        }
      });
    });

    return enhanced;
  }

  private static inferTagsFromPath(path: string): string[] {
    const segments = path.split('/').filter(segment => segment && !segment.startsWith('{'));
    
    if (segments.includes('auth')) return ['Authentication'];
    if (segments.includes('employees')) return ['Employee Management'];
    if (segments.includes('clients')) return ['Client Management'];
    if (segments.includes('sites')) return ['Site Management'];
    if (segments.includes('assignments')) return ['Assignment Management'];
    if (segments.includes('attendance')) return ['Attendance Tracking'];
    if (segments.includes('payroll')) return ['Payroll Management'];
    if (segments.includes('billing')) return ['Billing & Invoicing'];
    if (segments.includes('reports')) return ['Reporting'];
    if (segments.includes('contracts')) return ['Contract Management'];
    if (segments.includes('health')) return ['Health Check'];
    if (segments.includes('supervisor-portal')) return ['Supervisor Portal'];
    if (segments.includes('employee-portal')) return ['Employee Portal'];
    
    return ['General'];
  }

  private static generateSummaryFromPath(method: string, path: string): string {
    const segments = path.split('/').filter(segment => segment);
    const resource = segments[segments.length - 1] || 'resource';
    
    // Handle parameterized paths
    const cleanResource = resource.startsWith('{') ? segments[segments.length - 2] || 'item' : resource;
    
    switch (method) {
      case 'GET':
        if (resource.startsWith('{')) {
          return `Get ${cleanResource} by ID`;
        }
        return `Get ${cleanResource}`;
      case 'POST':
        if (path.includes('login')) return 'User login';
        if (path.includes('refresh')) return 'Refresh authentication token';
        if (path.includes('clock-in')) return 'Clock in employee';
        if (path.includes('clock-out')) return 'Clock out employee';
        return `Create ${cleanResource}`;
      case 'PUT':
        return `Update ${cleanResource}`;
      case 'PATCH':
        return `Partially update ${cleanResource}`;
      case 'DELETE':
        return `Delete ${cleanResource}`;
      default:
        return `${method} ${cleanResource}`;
    }
  }

  private static generateDescriptionFromPath(method: string, path: string): string {
    const segments = path.split('/').filter(segment => segment);
    const resource = segments[segments.length - 1] || 'resource';
    const cleanResource = resource.startsWith('{') ? segments[segments.length - 2] || 'item' : resource;
    
    switch (method) {
      case 'GET':
        if (resource.startsWith('{')) {
          return `Retrieve detailed information for a specific ${cleanResource} by their unique identifier.`;
        }
        return `Retrieve a list of ${cleanResource} with optional filtering, sorting, and pagination.`;
      case 'POST':
        if (path.includes('login')) return 'Authenticate user credentials and return access tokens for API access.';
        if (path.includes('refresh')) return 'Refresh an expired access token using a valid refresh token.';
        if (path.includes('clock-in')) return 'Record employee clock-in time with optional location data.';
        if (path.includes('clock-out')) return 'Record employee clock-out time with optional location data.';
        return `Create a new ${cleanResource} with the provided data and return the created resource.`;
      case 'PUT':
        return `Replace all properties of an existing ${cleanResource} with the provided data.`;
      case 'PATCH':
        return `Update specific properties of an existing ${cleanResource} without affecting other fields.`;
      case 'DELETE':
        return `Remove an existing ${cleanResource} from the system (may be soft delete for audit purposes).`;
      default:
        return `Perform ${method} operation on ${cleanResource}.`;
    }
  }

  /**
   * Generate API integration guide
   */
  private static generateIntegrationGuide(docsDir: string): void {
    const guide = `# API Integration Guide

## Getting Started

The Security Workforce & Payroll Management API provides comprehensive functionality for managing security workforce operations, from employee onboarding to payroll processing.

### Base URL
- Development: \`http://localhost:3005/api/v1\`
- Staging: \`https://api-staging.yourdomain.com/api/v1\`
- Production: \`https://api.yourdomain.com/api/v1\`

### Authentication

All API requests require authentication using JWT Bearer tokens:

\`\`\`http
Authorization: Bearer YOUR_JWT_TOKEN
\`\`\`

#### Getting an Access Token

1. **Login Request:**
\`\`\`http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@company.com",
  "password": "your-password"
}
\`\`\`

2. **Response:**
\`\`\`json
{
  "success": true,
  "data": {
    "user": { ... },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "expiresIn": 3600
    }
  }
}
\`\`\`

### Response Format

All API responses follow a consistent format:

#### Success Response:
\`\`\`json
{
  "success": true,
  "data": { ... },
  "metadata": {
    "timestamp": "2024-03-10T10:30:00Z",
    "requestId": "req_123456789",
    "version": "1.0.0"
  }
}
\`\`\`

#### Error Response:
\`\`\`json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message"
  },
  "metadata": {
    "timestamp": "2024-03-10T10:30:00Z",
    "requestId": "req_123456789"
  }
}
\`\`\`

### Pagination

List endpoints support pagination:

\`\`\`http
GET /api/v1/employees?page=1&limit=20&sortBy=createdAt&sortOrder=desc
\`\`\`

Pagination response includes metadata:
\`\`\`json
{
  "success": true,
  "data": [...],
  "metadata": {
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
\`\`\`

### Rate Limiting

API requests are rate-limited:
- Standard endpoints: 100 requests per minute
- Authentication endpoints: 10 requests per minute
- File upload endpoints: 5 requests per minute

Rate limit headers are included in responses:
- \`X-RateLimit-Limit\`: Request limit per window
- \`X-RateLimit-Remaining\`: Requests remaining in current window
- \`X-RateLimit-Reset\`: Time when the rate limit resets

### Error Handling

The API uses standard HTTP status codes:
- \`200\`: Success
- \`201\`: Created
- \`400\`: Bad Request
- \`401\`: Unauthorized
- \`403\`: Forbidden
- \`404\`: Not Found
- \`409\`: Conflict
- \`422\`: Unprocessable Entity
- \`429\`: Too Many Requests
- \`500\`: Internal Server Error

### SDK Examples

#### JavaScript/Node.js
\`\`\`javascript
const axios = require('axios');

const client = axios.create({
  baseURL: 'https://api.yourdomain.com/api/v1',
  headers: {
    'Authorization': 'Bearer YOUR_JWT_TOKEN',
    'Content-Type': 'application/json'
  }
});

// Get employees
const response = await client.get('/employees');
console.log(response.data);
\`\`\`

#### cURL
\`\`\`bash
# Get employees
curl -X GET "https://api.yourdomain.com/api/v1/employees" \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \\
  -H "Content-Type: application/json"
\`\`\`

### Webhooks (Future)

The API will support webhooks for real-time event notifications:
- Employee status changes
- Attendance events
- Payroll completion
- Security alerts

### Support

- API Documentation: \`/api/docs\`
- Support Email: api-support@yourdomain.com
- Status Page: https://status.yourdomain.com
`;

    fs.writeFileSync(path.join(docsDir, 'integration-guide.md'), guide);
  }

  /**
   * Generate authentication guide
   */
  private static generateAuthGuide(docsDir: string): void {
    const guide = `# Authentication & Authorization Guide

## Overview

The API uses JWT (JSON Web Tokens) for authentication and role-based access control (RBAC) for authorization.

## Authentication Flow

### 1. Login
\`\`\`http
POST /auth/login
{
  "email": "user@company.com",
  "password": "secure-password"
}
\`\`\`

### 2. Token Usage
Include the JWT token in the Authorization header:
\`\`\`http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
\`\`\`

### 3. Token Refresh
When your access token expires, use the refresh token:
\`\`\`http
POST /auth/refresh
{
  "refreshToken": "your-refresh-token"
}
\`\`\`

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
- \`CREATE_EMPLOYEE\`
- \`READ_EMPLOYEE\`
- \`UPDATE_EMPLOYEE\`
- \`DELETE_EMPLOYEE\`

### Client Permissions
- \`CREATE_CLIENT\`
- \`READ_CLIENT\`
- \`UPDATE_CLIENT\`
- \`DELETE_CLIENT\`

### Payroll Permissions
- \`CREATE_PAYROLL\`
- \`READ_PAYROLL\`
- \`UPDATE_PAYROLL\`
- \`APPROVE_PAYROLL\`

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

\`\`\`javascript
// Check if user has permission before making request
if (user.permissions.includes('READ_EMPLOYEE')) {
  const employees = await api.get('/employees');
}
\`\`\`

## Troubleshooting

### Common Authentication Errors

- \`401 Unauthorized\`: Token missing, invalid, or expired
- \`403 Forbidden\`: User lacks required permissions
- \`429 Too Many Requests\`: Rate limit exceeded

### Token Validation

You can validate token status:
\`\`\`http
GET /auth/profile
Authorization: Bearer your-token
\`\`\`

Returns user profile if token is valid, or 401 if invalid/expired.
`;

    fs.writeFileSync(path.join(docsDir, 'authentication-guide.md'), guide);
  }

  /**
   * Generate error codes documentation
   */
  private static generateErrorCodesDoc(docsDir: string): void {
    // Generate comprehensive error reference using ErrorReferenceGenerator
    const markdownDoc = ErrorReferenceGenerator.generateMarkdownDocumentation();
    fs.writeFileSync(path.join(docsDir, 'error-codes.md'), markdownDoc);
    console.log(`📋 Error codes documentation: ${path.join(docsDir, 'error-codes.md')}`);
    
    // Generate JSON reference for programmatic use
    const jsonReference = ErrorReferenceGenerator.generateJSONReference();
    fs.writeFileSync(path.join(docsDir, 'error-codes.json'), jsonReference);
    console.log(`📄 Error codes JSON: ${path.join(docsDir, 'error-codes.json')}`);
    
    // Generate client examples
    const clientExamples = ErrorReferenceGenerator.generateClientExamples();
    Object.entries(clientExamples).forEach(([language, example]) => {
      const filename = `error-handling-${language}.${language === 'curl' ? 'sh' : language === 'python' ? 'py' : 'js'}`;
      fs.writeFileSync(path.join(docsDir, filename), example);
      console.log(`💻 Error handling example (${language}): ${path.join(docsDir, filename)}`);
    });
  }

  /**
   * Generate versioning guide
   */
  private static generateVersioningGuide(docsDir: string): void {
    const guide = `# API Versioning Guide

## Versioning Strategy

The API uses URL-based versioning with semantic versioning principles.

### URL Format
\`\`\`
https://api.yourdomain.com/api/v1/endpoint
\`\`\`

### Current Version
- **v1.0.0**: Current stable version
- All endpoints are under \`/api/v1/\`

## Version Headers

Include version information in requests:
\`\`\`http
Accept: application/vnd.api+json;version=1.0
API-Version: 1.0
\`\`\`

## Backward Compatibility

### What Changes Are Compatible
- Adding new optional fields to request/response
- Adding new endpoints
- Adding new query parameters
- Adding new enum values

### What Changes Require New Version
- Removing or renaming fields
- Changing field types
- Removing endpoints
- Changing authentication methods
- Breaking response format changes

## Migration Guide

When a new major version is released:

1. **Announcement**: 90 days advance notice
2. **Parallel Support**: Both versions supported during transition
3. **Migration Window**: 180 days to migrate
4. **Deprecation**: Old version marked deprecated
5. **Sunset**: Old version removed after support period

## Version Status

| Version | Status | Release Date | End of Support |
|---------|--------|-------------|----------------|
| v1.0 | Current | 2024-03-01 | TBD |

## Best Practices

1. **Pin Versions**: Always specify version in API calls
2. **Monitor Deprecations**: Watch for deprecation notices
3. **Test Early**: Test new versions in staging environment
4. **Gradual Migration**: Migrate endpoints incrementally
5. **Version Headers**: Use version headers for client identification

## Deprecation Policy

Deprecated features will:
- Continue to work during support period
- Include deprecation warnings in responses
- Have migration guides provided
- Be removed only after support period ends

## Future Versions

### v2.0 (Planned)
- Enhanced GraphQL support
- Improved real-time capabilities
- Extended analytics endpoints
- Performance optimizations

### Breaking Changes Notice
Breaking changes will be clearly documented and communicated through:
- API documentation updates
- Email notifications to registered developers
- Changelog entries
- Response headers in deprecated endpoints
`;

    fs.writeFileSync(path.join(docsDir, 'versioning-guide.md'), guide);
  }

  /**
   * Get comprehensive API description
   */
  private static getApiDescription(): string {
    return `
## Comprehensive API for workforce operations, payroll processing, and client management

This API provides complete functionality for:
- Multi-tenant workforce management
- Real-time attendance tracking with GPS verification
- Automated payroll processing and calculations
- Client billing and invoice generation
- Role-based access control and security
- Operational dashboards and analytics

### Authentication
All protected endpoints require a valid JWT token in the Authorization header:
\`Authorization: Bearer <your-jwt-token>\`

### Rate Limiting
API requests are rate-limited to prevent abuse:
- Standard endpoints: 100 requests per minute
- Authentication endpoints: 10 requests per minute
- File upload endpoints: 5 requests per minute

### Error Handling
All API responses follow a consistent format:
- Success: \`{ success: true, data: {...}, metadata: {...} }\`
- Error: \`{ success: false, error: { code: 'ERROR_CODE', message: 'Description' }, metadata: {...} }\`

### Versioning
API versioning is handled through URL paths: \`/api/v1/...\`

### Support
- Documentation: Available at \`/api/docs\`
- Contact: api-support@yourdomain.com
    `;
  }
}