import * as fs from 'fs';
import * as path from 'path';

/**
 * Integration Guide Generator
 * Creates comprehensive API integration guides and code examples
 */
export class IntegrationGuideGenerator {
  
  /**
   * Generate complete integration guides and examples
   */
  static generateIntegrationGuides(docsDir: string): void {
    // Create subdirectories for organized documentation
    const guidesDir = path.join(docsDir, 'guides');
    const examplesDir = path.join(docsDir, 'examples');
    const sdkDir = path.join(docsDir, 'sdk');
    
    [guidesDir, examplesDir, sdkDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });

    // Generate main integration guide
    this.generateMainIntegrationGuide(guidesDir);
    
    // Generate SDK examples
    this.generateSDKExamples(sdkDir);
    
    // Generate use case examples
    this.generateUseCaseExamples(examplesDir);
    
    // Generate testing guide
    this.generateTestingGuide(guidesDir);
    
    // Generate deployment guide
    this.generateDeploymentGuide(guidesDir);
    
    // Generate versioning guide
    this.generateVersioningGuide(guidesDir);

    console.log(`📖 Integration guides generated in: ${docsDir}`);
  }
  /**
   * Generate main integration guide
   */
  private static generateMainIntegrationGuide(guidesDir: string): void {
    const guide = `# Comprehensive API Integration Guide

## Overview

The Security Workforce & Payroll Management API is a RESTful web service that enables comprehensive workforce management operations including employee lifecycle, scheduling, attendance tracking, and payroll processing.

## Quick Start

### 1. API Access Setup

#### Base URLs
- **Development:** \`http://localhost:3005/api/v1\`
- **Staging:** \`https://api-staging.yourdomain.com/api/v1\`
- **Production:** \`https://api.yourdomain.com/api/v1\`

#### Authentication Flow
\`\`\`http
POST /auth/login
Content-Type: application/json

{
  "email": "admin@company.com",
  "password": "secure-password"
}
\`\`\`

**Response:**
\`\`\`json
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
\`\`\`

### 2. Making Authenticated Requests

Include the JWT token in all subsequent requests:

\`\`\`http
GET /employees
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
\`\`\`

## Common Operations

#### Create Employee
\`\`\`http
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
\`\`\`

#### Get Employee List
\`\`\`http
GET /employees?page=1&limit=20&sortBy=lastName&sortOrder=asc
Authorization: Bearer <your-token>
\`\`\`

#### Create Client
\`\`\`http
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
\`\`\`

## Response Format Standards

### Success Response
\`\`\`json
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
\`\`\`

### Error Response
\`\`\`json
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
\`\`\`

### Paginated Response
\`\`\`json
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
\`\`\`

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
\`\`\`http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1710072600
Retry-After: 60
\`\`\`

## Pagination Guidelines

Most list endpoints support pagination:

### Query Parameters
- \`page\`: Page number (1-indexed, default: 1)
- \`limit\`: Items per page (1-100, default: 20)
- \`sortBy\`: Field to sort by (default: createdAt)
- \`sortOrder\`: Sort direction (asc/desc, default: desc)
- \`search\`: Search query string

### Example
\`\`\`http
GET /employees?page=2&limit=50&sortBy=lastName&sortOrder=asc&search=john
\`\`\`

## Error Handling Best Practices

### 1. Check Response Status
Always check the \`success\` field before processing data:

\`\`\`javascript
if (response.data.success) {
  // Process successful response
  const employees = response.data.data;
} else {
  // Handle error
  const error = response.data.error;
  console.error(\`API Error [\${error.code}]: \${error.message}\`);
}
\`\`\`

### 2. Handle Token Expiration
\`\`\`javascript
if (error.code === 'TOKEN_EXPIRED') {
  // Refresh token or redirect to login
  await refreshAuthToken();
  // Retry original request
}
\`\`\`

### 3. Retry on Rate Limiting
\`\`\`javascript
if (error.code === 'RATE_LIMIT_EXCEEDED') {
  const retryAfter = error.details.retryAfter || 60;
  setTimeout(() => {
    // Retry request
    makeApiCall();
  }, retryAfter * 1000);
}
\`\`\`

## Testing Your Integration

### 1. API Health Check
\`\`\`http
GET /health
\`\`\`

### 2. Authentication Test
\`\`\`http
GET /auth/profile
Authorization: Bearer <your-token>
\`\`\`

### 3. Permission Test
Try accessing different endpoints with various user roles to verify RBAC is working correctly.

## Next Steps

1. Review the [SDK Examples](../sdk/) for language-specific implementations
2. Check [Use Case Examples](../examples/) for common workflow patterns
3. Read the [Testing Guide](./testing-guide.md) for comprehensive testing strategies
4. Review [Deployment Guide](./deployment-guide.md) for production considerations
`;

    fs.writeFileSync(path.join(guidesDir, 'integration-guide.md'), guide);
    console.log(`📚 Main integration guide: ${path.join(guidesDir, 'integration-guide.md')}`);
  }
  /**
   * Generate SDK examples for different languages
   */
  private static generateSDKExamples(sdkDir: string): void {
    // JavaScript/Node.js SDK Example
    const jsExample = `# JavaScript/Node.js SDK Example

## Installation

\`\`\`bash
npm install axios
\`\`\`

## Basic Client Setup

\`\`\`javascript
const axios = require('axios');

class PayrollAPIClient {
  constructor(baseURL, options = {}) {
    this.client = axios.create({
      baseURL: baseURL || 'https://api.yourdomain.com/api/v1',
      timeout: options.timeout || 30000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'PayrollAPI-JS-Client/1.0.0'
      }
    });

    this.token = null;
    this.refreshToken = null;
    
    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      (config) => {
        if (this.token) {
          config.headers.Authorization = 'Bearer ' + this.token; // Authorization: Bearer token
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401 && this.refreshToken) {
          try {
            await this.refreshAccessToken();
            return this.client.request(error.config);
          } catch (refreshError) {
            this.logout();
            throw refreshError;
          }
        }
        throw error;
      }
    );
  }

  // Authentication
  async login(email, password) {
    try {
      const response = await this.client.post('/auth/login', { email, password });
      const { tokens } = response.data.data;
      
      this.token = tokens.accessToken;
      this.refreshToken = tokens.refreshToken;
      
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async refreshAccessToken() {
    const response = await this.client.post('/auth/refresh', {
      refreshToken: this.refreshToken
    });
    
    const { tokens } = response.data.data;
    this.token = tokens.accessToken;
    
    return response.data;
  }

  logout() {
    this.token = null;
    this.refreshToken = null;
  }

  // Employee Management
  async getEmployees(params = {}) {
    const response = await this.client.get('/employees', { params });
    return response.data;
  }

  async createEmployee(employeeData) {
    const response = await this.client.post('/employees', employeeData);
    return response.data;
  }

  async getEmployee(id) {
    const response = await this.client.get(\`/employees/\${id}\`);
    return response.data;
  }

  async updateEmployee(id, updateData) {
    const response = await this.client.patch(\`/employees/\${id}\`, updateData);
    return response.data;
  }

  // Client Management
  async getClients(params = {}) {
    const response = await this.client.get('/clients', { params });
    return response.data;
  }

  async createClient(clientData) {
    const response = await this.client.post('/clients', clientData);
    return response.data;
  }

  // Attendance Management
  async clockIn(employeeId, locationData = {}) {
    const response = await this.client.post('/attendance/clock-in', {
      employeeId,
      ...locationData
    });
    return response.data;
  }

  async clockOut(employeeId, locationData = {}) {
    const response = await this.client.post('/attendance/clock-out', {
      employeeId,
      ...locationData
    });
    return response.data;
  }

  // Payroll Operations
  async createPayrollRun(payrollData) {
    const response = await this.client.post('/payroll', payrollData);
    return response.data;
  }

  async getPayrollRuns(params = {}) {
    const response = await this.client.get('/payroll', { params });
    return response.data;
  }

  // Error Handling
  handleError(error) {
    if (error.response) {
      const apiError = error.response.data.error;
      const customError = new Error(apiError.message || 'API request failed');
      customError.code = apiError.code;
      customError.details = apiError.details;
      customError.statusCode = error.response.status;
      return customError;
    }
    return error;
  }
}

module.exports = PayrollAPIClient;
\`\`\`

## Usage Example

\`\`\`javascript
const PayrollAPIClient = require('./payroll-api-client');

async function main() {
  const client = new PayrollAPIClient('http://localhost:3005/api/v1');

  try {
    // Login
    await client.login('admin@company.com', 'password');
    console.log('Logged in successfully');

    // Create employee
    const newEmployee = await client.createEmployee({
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@company.com',
      phoneNumber: '+1-555-0123',
      employeeId: 'EMP001',
      position: 'Security Guard',
      hireDate: '2024-01-15',
      hourlyRate: 25.00
    });
    console.log('Employee created:', newEmployee.data.id);

    // Get employees with pagination
    const employees = await client.getEmployees({
      page: 1,
      limit: 10,
      sortBy: 'lastName'
    });
    console.log(\`Found \${employees.data.length} employees\`);

  } catch (error) {
    console.error('Error:', error.message);
    if (error.code) {
      console.error('Error Code:', error.code);
    }
  }
}

main();
\`\`\`
`;

    // Python SDK Example
    const pythonExample = `# Python SDK Example

## Installation

\`\`\`bash
pip install requests
\`\`\`

## Basic Client Setup

\`\`\`python
import requests
import json
from typing import Optional, Dict, Any
from datetime import datetime, timedelta

class PayrollAPIError(Exception):
    """Custom exception for Payroll API errors"""
    def __init__(self, message: str, code: Optional[str] = None, status_code: Optional[int] = None, details: Optional[Dict] = None):
        super().__init__(message)
        self.code = code
        self.status_code = status_code
        self.details = details or {}

class PayrollAPIClient:
    def __init__(self, base_url: str = "https://api.yourdomain.com/api/v1", timeout: int = 30):
        self.base_url = base_url.rstrip('/')
        self.timeout = timeout
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'User-Agent': 'PayrollAPI-Python-Client/1.0.0'
        })
        
        self.access_token: Optional[str] = None
        self.refresh_token: Optional[str] = None
        self.token_expires_at: Optional[datetime] = None

    def _make_request(self, method: str, endpoint: str, **kwargs) -> Dict[Any, Any]:
        """Make HTTP request with automatic token refresh"""
        url = f"{self.base_url}{endpoint}"
        
        # Add auth header if token exists and not expired
        if self.access_token and self._is_token_valid():
            self.session.headers['Authorization'] = f"Bearer {self.access_token}"
        elif self.access_token and self.refresh_token:
            # Token expired, try to refresh
            try:
                self.refresh_access_token()
                self.session.headers['Authorization'] = f"Bearer {self.access_token}"
            except Exception:
                self.logout()
                raise PayrollAPIError("Authentication required - please login again", "AUTH_REQUIRED", 401)
        
        response = self.session.request(method, url, timeout=self.timeout, **kwargs)
        
        # Handle 401 with refresh token
        if response.status_code == 401 and self.refresh_token:
            try:
                self.refresh_access_token()
                self.session.headers['Authorization'] = f"Bearer {self.access_token}"
                response = self.session.request(method, url, timeout=self.timeout, **kwargs)
            except Exception:
                self.logout()
                raise
        
        return self._handle_response(response)

    def _handle_response(self, response: requests.Response) -> Dict[Any, Any]:
        """Handle API response and errors"""
        try:
            data = response.json()
        except json.JSONDecodeError:
            raise Exception(f"Invalid JSON response: {response.text}")
        
        if response.status_code >= 400:
            error_info = data.get('error', {})
            raise PayrollAPIError(
                message=error_info.get('message', 'Unknown error'),
                code=error_info.get('code'),
                status_code=response.status_code,
                details=error_info.get('details', {})
            )
        
        return data

    def _is_token_valid(self) -> bool:
        """Check if current token is still valid"""
        if not self.token_expires_at:
            return True
        return datetime.now() < self.token_expires_at - timedelta(minutes=5)

    # Authentication Methods
    def login(self, email: str, password: str) -> Dict[Any, Any]:
        """Login and store tokens"""
        response = self._make_request('POST', '/auth/login', json={
            'email': email,
            'password': password
        })
        
        tokens = response['data']['tokens']
        self.access_token = tokens['accessToken']
        self.refresh_token = tokens['refreshToken']
        
        # Estimate token expiry (typically 1 hour for JWT)
        self.token_expires_at = datetime.now() + timedelta(hours=1)
        
        return response

    def refresh_access_token(self) -> Dict[Any, Any]:
        """Refresh access token using refresh token"""
        if not self.refresh_token:
            raise Exception("No refresh token available")
        
        # Temporarily remove auth header for refresh request
        old_auth = self.session.headers.pop('Authorization', None)
        
        try:
            response = self._make_request('POST', '/auth/refresh', json={
                'refreshToken': self.refresh_token
            })
            
            tokens = response['data']['tokens']
            self.access_token = tokens['accessToken']
            self.token_expires_at = datetime.now() + timedelta(hours=1)
            
            return response
        finally:
            # Restore auth header if it existed
            if old_auth:
                self.session.headers['Authorization'] = old_auth

    def logout(self) -> None:
        """Clear stored tokens"""
        self.access_token = None
        self.refresh_token = None
        self.token_expires_at = None
        self.session.headers.pop('Authorization', None)

    # Employee Management
    def get_employees(self, **params) -> Dict[Any, Any]:
        """Get list of employees with optional filters"""
        return self._make_request('GET', '/employees', params=params)

    def create_employee(self, employee_data: Dict[str, Any]) -> Dict[Any, Any]:
        """Create a new employee"""
        return self._make_request('POST', '/employees', json=employee_data)

    def get_employee(self, employee_id: str) -> Dict[Any, Any]:
        """Get employee by ID"""
        return self._make_request('GET', f'/employees/{employee_id}')

    def update_employee(self, employee_id: str, update_data: Dict[str, Any]) -> Dict[Any, Any]:
        """Update employee information"""
        return self._make_request('PATCH', f'/employees/{employee_id}', json=update_data)

    def delete_employee(self, employee_id: str) -> Dict[Any, Any]:
        """Delete employee (soft delete)"""
        return self._make_request('DELETE', f'/employees/{employee_id}')

    # Client Management
    def get_clients(self, **params) -> Dict[Any, Any]:
        """Get list of clients with optional filters"""
        return self._make_request('GET', '/clients', params=params)

    def create_client(self, client_data: Dict[str, Any]) -> Dict[Any, Any]:
        """Create a new client"""
        return self._make_request('POST', '/clients', json=client_data)

    def get_client(self, client_id: str) -> Dict[Any, Any]:
        """Get client by ID"""
        return self._make_request('GET', f'/clients/{client_id}')

    def update_client(self, client_id: str, update_data: Dict[str, Any]) -> Dict[Any, Any]:
        """Update client information"""
        return self._make_request('PATCH', f'/clients/{client_id}', json=update_data)

    # Attendance Management
    def clock_in(self, employee_id: str, location_data: Optional[Dict[str, Any]] = None) -> Dict[Any, Any]:
        """Clock in employee"""
        payload = {'employeeId': employee_id}
        if location_data:
            payload.update(location_data)
        return self._make_request('POST', '/attendance/clock-in', json=payload)

    def clock_out(self, employee_id: str, location_data: Optional[Dict[str, Any]] = None) -> Dict[Any, Any]:
        """Clock out employee"""
        payload = {'employeeId': employee_id}
        if location_data:
            payload.update(location_data)
        return self._make_request('POST', '/attendance/clock-out', json=payload)

    def get_attendance(self, **params) -> Dict[Any, Any]:
        """Get attendance records"""
        return self._make_request('GET', '/attendance', params=params)

    # Payroll Operations
    def create_payroll_run(self, payroll_data: Dict[str, Any]) -> Dict[Any, Any]:
        """Create a new payroll run"""
        return self._make_request('POST', '/payroll', json=payroll_data)

    def get_payroll_runs(self, **params) -> Dict[Any, Any]:
        """Get payroll runs with optional filters"""
        return self._make_request('GET', '/payroll', params=params)

    def get_payroll_run(self, run_id: str) -> Dict[Any, Any]:
        """Get specific payroll run"""
        return self._make_request('GET', f'/payroll/{run_id}')

    # Reporting
    def get_reports(self, report_type: str, **params) -> Dict[Any, Any]:
        """Generate reports"""
        return self._make_request('GET', f'/reports/{report_type}', params=params)

    def export_data(self, export_type: str, **params) -> Dict[Any, Any]:
        """Export data in various formats"""
        return self._make_request('POST', '/export', json={
            'type': export_type,
            **params
        })
\`\`\`

## Usage Example

\`\`\`python
from payroll_api_client import PayrollAPIClient
from datetime import date

def main():
    # Initialize client
    client = PayrollAPIClient('http://localhost:3005/api/v1')

    try:
        # Login
        login_response = client.login('admin@company.com', 'password')
        print("Logged in successfully")

        # Create a new employee
        new_employee = client.create_employee({
            'firstName': 'Jane',
            'lastName': 'Smith',
            'email': 'jane.smith@company.com',
            'phoneNumber': '+1-555-0124',
            'employeeId': 'EMP002',
            'position': 'Security Supervisor',
            'hireDate': '2024-01-15',
            'hourlyRate': 30.00,
            'department': 'Security',
            'status': 'active'
        })
        
        employee_id = new_employee['data']['id']
        print(f"Employee created: {employee_id}")

        # Clock in employee
        clock_in_response = client.clock_in(employee_id, {
            'latitude': 40.7128,
            'longitude': -74.0060,
            'notes': 'Starting shift'
        })
        print("Employee clocked in")

        # Get employees with pagination and filtering
        employees = client.get_employees(
            page=1,
            limit=10,
            sortBy='lastName',
            status='active'
        )
        print(f"Found {len(employees['data'])} active employees")

        # Get attendance records for today
        attendance = client.get_attendance(
            startDate=date.today().isoformat(),
            endDate=date.today().isoformat()
        )
        print(f"Today's attendance: {len(attendance['data'])} records")

        # Create payroll run
        payroll_run = client.create_payroll_run({
            'periodStart': '2024-01-01',
            'periodEnd': '2024-01-15',
            'description': 'Bi-weekly payroll - January 2024',
            'clientIds': []  # All clients
        })
        print(f"Payroll run created: {payroll_run['data']['id']}")

    except Exception as error:
        print(f"Error: {str(error)}")
    finally:
        # Always logout to clean up tokens
        client.logout()

if __name__ == "__main__":
    main()
\`\`\`

## Error Handling

\`\`\`python
from payroll_api_client import PayrollAPIClient

client = PayrollAPIClient()

try:
    # API operation that might fail
    result = client.create_employee({})
except Exception as e:
    error_message = str(e)
    
    if "VALIDATION_ERROR" in error_message:
        print("Please check your input data")
    elif "EMPLOYEE_EXISTS" in error_message:
        print("Employee with this ID already exists")
    elif "UNAUTHORIZED" in error_message:
        print("Please login first")
    else:
        print(f"Unexpected error: {error_message}")
\`\`\`
`;

    fs.writeFileSync(path.join(sdkDir, 'javascript-sdk.md'), jsExample);
    console.log(`💻 JavaScript SDK: ${path.join(sdkDir, 'javascript-sdk.md')}`);
    
    fs.writeFileSync(path.join(sdkDir, 'python-sdk.md'), pythonExample);
    console.log(`🐍 Python SDK: ${path.join(sdkDir, 'python-sdk.md')}`);
  }

  /**
   * Generate Python SDK documentation
   */
  private static generatePythonSDK(sdkDir: string): void {
    // Python SDK Example
    const pythonExample = `# Python SDK Example

## Installation

\`\`\`bash
pip install requests
\`\`\`

## Python Client Implementation

\`\`\`python
import requests
import time
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
from datetime import datetime, timedelta

@dataclass
class APIResponse:
    success: bool
    data: Any = None
    error: Dict = None
    metadata: Dict = None

class PayrollAPIError(Exception):
    def __init__(self, message: str, code: str = None, status_code: int = None):
        self.message = message
        self.code = code
        self.status_code = status_code
        super().__init__(message)

class PayrollAPIClient:
    def __init__(self, base_url: str = 'https://api.yourdomain.com/api/v1', timeout: int = 30):
        self.base_url = base_url.rstrip('/')
        self.timeout = timeout
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'User-Agent': 'PayrollAPI-Python-Client/1.0.0'
        })
        
        self.access_token: Optional[str] = None
        self.refresh_token: Optional[str] = None
        self.token_expires_at: Optional[datetime] = None

    def _make_request(self, method: str, endpoint: str, **kwargs) -> APIResponse:
        """Make HTTP request with automatic token refresh"""
        url = f"{self.base_url}{endpoint}"
        
        # Add authorization header if token exists
        if self.access_token:
            self.session.headers['Authorization'] = f'Bearer {self.access_token}'
        
        # Check if token needs refresh
        if self._token_needs_refresh():
            self.refresh_access_token()
        
        try:
            response = self.session.request(method, url, timeout=self.timeout, **kwargs)
            return self._process_response(response)
        except requests.RequestException as e:
            raise PayrollAPIError(f"Request failed: {str(e)}")

    def _process_response(self, response: requests.Response) -> APIResponse:
        """Process API response and handle errors"""
        try:
            data = response.json()
        except ValueError:
            raise PayrollAPIError(f"Invalid JSON response: {response.text}")
        
        if not data.get('success', False):
            error = data.get('error', {})
            raise PayrollAPIError(
                error.get('message', 'Unknown error'),
                error.get('code'),
                response.status_code
            )
        
        return APIResponse(
            success=data['success'],
            data=data.get('data'),
            metadata=data.get('metadata')
        )

    def _token_needs_refresh(self) -> bool:
        """Check if access token needs refresh"""
        if not self.token_expires_at:
            return False
        return datetime.now() >= self.token_expires_at - timedelta(minutes=5)

    # Authentication Methods
    def login(self, email: str, password: str) -> APIResponse:
        """Authenticate user and store tokens"""
        response = self._make_request('POST', '/auth/login', json={
            'email': email,
            'password': password
        })
        
        tokens = response.data['tokens']
        self.access_token = tokens['accessToken']
        self.refresh_token = tokens['refreshToken']
        self.token_expires_at = datetime.now() + timedelta(seconds=tokens['expiresIn'])
        
        return response

    def refresh_access_token(self) -> APIResponse:
        """Refresh access token using refresh token"""
        if not self.refresh_token:
            raise PayrollAPIError("No refresh token available")
        
        # Temporarily remove auth header for refresh request
        old_auth = self.session.headers.pop('Authorization', None)
        
        try:
            response = self._make_request('POST', '/auth/refresh', json={
                'refreshToken': self.refresh_token
            })
            
            tokens = response.data['tokens']
            self.access_token = tokens['accessToken']
            self.token_expires_at = datetime.now() + timedelta(seconds=tokens['expiresIn'])
            
            return response
        finally:
            if old_auth:
                self.session.headers['Authorization'] = old_auth

    def logout(self):
        """Clear stored tokens"""
        self.access_token = None
        self.refresh_token = None
        self.token_expires_at = None
        self.session.headers.pop('Authorization', None)

    # Employee Management
    def get_employees(self, page: int = 1, limit: int = 20, **filters) -> APIResponse:
        """Get paginated list of employees"""
        params = {'page': page, 'limit': limit, **filters}
        return self._make_request('GET', '/employees', params=params)

    def create_employee(self, employee_data: Dict[str, Any]) -> APIResponse:
        """Create new employee"""
        return self._make_request('POST', '/employees', json=employee_data)

    def get_employee(self, employee_id: str) -> APIResponse:
        """Get employee by ID"""
        return self._make_request('GET', f'/employees/{employee_id}')

    def update_employee(self, employee_id: str, update_data: Dict[str, Any]) -> APIResponse:
        """Update employee information"""
        return self._make_request('PATCH', f'/employees/{employee_id}', json=update_data)

    # Client Management
    def get_clients(self, **params) -> APIResponse:
        """Get list of clients"""
        return self._make_request('GET', '/clients', params=params)

    def create_client(self, client_data: Dict[str, Any]) -> APIResponse:
        """Create new client"""
        return self._make_request('POST', '/clients', json=client_data)

    # Attendance Management
    def clock_in(self, employee_id: str, location_data: Dict = None) -> APIResponse:
        """Clock in employee"""
        data = {'employeeId': employee_id}
        if location_data:
            data.update(location_data)
        return self._make_request('POST', '/attendance/clock-in', json=data)

    def clock_out(self, employee_id: str, location_data: Dict = None) -> APIResponse:
        """Clock out employee"""
        data = {'employeeId': employee_id}
        if location_data:
            data.update(location_data)
        return self._make_request('POST', '/attendance/clock-out', json=data)

    # Payroll Operations
    def create_payroll_run(self, payroll_data: Dict[str, Any]) -> APIResponse:
        """Create new payroll run"""
        return self._make_request('POST', '/payroll', json=payroll_data)

    def get_payroll_runs(self, **params) -> APIResponse:
        """Get payroll runs"""
        return self._make_request('GET', '/payroll', params=params)

# Usage Example
if __name__ == "__main__":
    client = PayrollAPIClient('http://localhost:3005/api/v1')
    
    try:
        # Login
        client.login('admin@company.com', 'password')
        print("Login successful")
        
        # Create employee
        employee_response = client.create_employee({
            'firstName': 'Jane',
            'lastName': 'Smith',
            'email': 'jane.smith@company.com',
            'phoneNumber': '+1-555-0124',
            'employeeId': 'EMP002',
            'position': 'Security Supervisor',
            'hireDate': '2024-01-15',
            'hourlyRate': 30.00
        })
        
        print(f"Employee created: {employee_response.data['id']}")
        
        # Get employees
        employees_response = client.get_employees(page=1, limit=10)
        print(f"Found {len(employees_response.data)} employees")
        
    except PayrollAPIError as e:
        print(f"API Error [{e.code}]: {e.message}")
    except Exception as e:
        print(f"Unexpected error: {str(e)}")
\`\`\`
`;

    fs.writeFileSync(path.join(sdkDir, 'python-sdk.md'), pythonExample);
    console.log(`🐍 Python SDK: ${path.join(sdkDir, 'python-sdk.md')}`);
  }
  /**
   * Generate use case examples
   */
  private static generateUseCaseExamples(examplesDir: string): void {
    // Employee Onboarding Workflow
    const employeeOnboarding = `# Employee Onboarding Workflow

This example demonstrates the complete workflow for onboarding a new security guard employee.

## Step 1: Create Employee Profile

\`\`\`http
POST /api/v1/employees
Authorization: Bearer <token>
Content-Type: application/json

{
  "firstName": "Michael",
  "lastName": "Johnson",
  "email": "michael.johnson@company.com",
  "phoneNumber": "+1-555-0125",
  "employeeId": "EMP003",
  "position": "Security Guard",
  "hireDate": "2024-03-15",
  "hourlyRate": 22.00,
  "emergencyContact": {
    "name": "Sarah Johnson",
    "relationship": "Spouse",
    "phone": "+1-555-0126"
  },
  "address": {
    "street": "456 Oak Street",
    "city": "Chicago",
    "state": "IL",
    "zipCode": "60601"
  },
  "skills": ["Security Guard", "CPR Certified"],
  "certifications": [
    {
      "type": "Security License",
      "number": "SEC-2024-001",
      "issueDate": "2024-01-01",
      "expiryDate": "2025-01-01"
    }
  ]
}
\`\`\`

## Step 2: Upload Required Documents

\`\`\`http
POST /api/v1/employees/{employee-id}/documents
Authorization: Bearer <token>
Content-Type: multipart/form-data

{
  "documentType": "GOVERNMENT_ID",
  "file": <binary-file-data>
}
\`\`\`

## Step 3: Assign to Initial Site

\`\`\`http
POST /api/v1/assignments
Authorization: Bearer <token>
Content-Type: application/json

{
  "employeeId": "emp_generated_id",
  "siteId": "site_downtown_office",
  "startDate": "2024-03-20",
  "shiftType": "DAY_SHIFT",
  "status": "ACTIVE"
}
\`\`\`

## Step 4: Create Initial Schedule

\`\`\`http
POST /api/v1/shifts
Authorization: Bearer <token>
Content-Type: application/json

{
  "assignmentId": "asn_generated_id",
  "date": "2024-03-20",
  "startTime": "08:00:00",
  "endTime": "16:00:00",
  "requiredSkills": ["Security Guard"],
  "notes": "Initial training shift - shadow experienced guard"
}
\`\`\`

## Complete JavaScript Example

\`\`\`javascript
async function onboardEmployee(apiClient, employeeData) {
  try {
    // Step 1: Create employee
    const employeeResponse = await apiClient.createEmployee(employeeData);
    const employeeId = employeeResponse.data.id;
    console.log(\`Employee created: \${employeeId}\`);

    // Step 2: Upload documents (if provided)
    if (employeeData.documents) {
      for (const doc of employeeData.documents) {
        await apiClient.uploadDocument(employeeId, doc);
        console.log(\`Document uploaded: \${doc.type}\`);
      }
    }

    // Step 3: Create assignment
    const assignmentResponse = await apiClient.createAssignment({
      employeeId: employeeId,
      siteId: employeeData.initialSiteId,
      startDate: employeeData.startDate,
      shiftType: 'DAY_SHIFT',
      status: 'ACTIVE'
    });
    
    const assignmentId = assignmentResponse.data.id;
    console.log(\`Assignment created: \${assignmentId}\`);

    // Step 4: Create initial shifts for first week
    const startDate = new Date(employeeData.startDate);
    for (let i = 0; i < 5; i++) {
      const shiftDate = new Date(startDate);
      shiftDate.setDate(startDate.getDate() + i);
      
      await apiClient.createShift({
        assignmentId: assignmentId,
        date: shiftDate.toISOString().split('T')[0],
        startTime: '08:00:00',
        endTime: '16:00:00',
        requiredSkills: employeeData.skills,
        notes: i === 0 ? 'Training shift' : 'Regular shift'
      });
    }

    console.log('Employee onboarding completed successfully');
    return {
      success: true,
      employeeId,
      assignmentId
    };

  } catch (error) {
    console.error('Onboarding failed:', error.message);
    throw error;
  }
}

// Usage
const newEmployee = {
  firstName: 'Michael',
  lastName: 'Johnson',
  email: 'michael.johnson@company.com',
  phoneNumber: '+1-555-0125',
  employeeId: 'EMP003',
  position: 'Security Guard',
  hireDate: '2024-03-15',
  hourlyRate: 22.00,
  skills: ['Security Guard', 'CPR Certified'],
  initialSiteId: 'site_downtown_office',
  startDate: '2024-03-20'
};

onboardEmployee(apiClient, newEmployee)
  .then(result => console.log('Success:', result))
  .catch(error => console.error('Error:', error));
\`\`\`
`;

    fs.writeFileSync(path.join(examplesDir, 'employee-onboarding.md'), employeeOnboarding);
    
    // Payroll Processing Workflow
    const payrollWorkflow = `# Payroll Processing Workflow

Complete workflow for processing payroll including time tracking, calculations, and approval.

## Step 1: Collect Attendance Data

\`\`\`http
GET /api/v1/attendance?startDate=2024-03-01&endDate=2024-03-15&status=approved
Authorization: Bearer <token>
\`\`\`

## Step 2: Create Payroll Run

\`\`\`http
POST /api/v1/payroll
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Bi-weekly Payroll - March 1-15, 2024",
  "payPeriodStart": "2024-03-01",
  "payPeriodEnd": "2024-03-15",
  "payDate": "2024-03-22",
  "description": "Regular bi-weekly payroll processing",
  "includeEmployees": "ALL_ACTIVE"
}
\`\`\`

## Step 3: Review Payroll Calculations

\`\`\`http
GET /api/v1/payroll/{payroll-run-id}/preview
Authorization: Bearer <token>
\`\`\`

## Step 4: Approve Payroll

\`\`\`http
POST /api/v1/payroll/{payroll-run-id}/approve
Authorization: Bearer <token>
Content-Type: application/json

{
  "approvedBy": "manager_user_id",
  "notes": "Reviewed and approved for processing"
}
\`\`\`

## Complete Python Example

\`\`\`python
from datetime import datetime, date, timedelta
from payroll_api_client import PayrollAPIClient

def process_payroll(client: PayrollAPIClient, pay_period_start: date, pay_period_end: date):
    """Complete payroll processing workflow"""
    
    try:
        # Step 1: Verify all attendance is approved
        attendance_response = client.get_attendance({
            'startDate': pay_period_start.isoformat(),
            'endDate': pay_period_end.isoformat(),
            'status': 'PENDING_APPROVAL'
        })
        
        pending_count = len(attendance_response.data)
        if pending_count > 0:
            print(f"Warning: {pending_count} attendance records pending approval")
            return False

        # Step 2: Create payroll run
        payroll_data = {
            'name': f'Bi-weekly Payroll - {pay_period_start} to {pay_period_end}',
            'payPeriodStart': pay_period_start.isoformat(),
            'payPeriodEnd': pay_period_end.isoformat(),
            'payDate': (pay_period_end + timedelta(days=7)).isoformat(),
            'description': 'Regular bi-weekly payroll processing',
            'includeEmployees': 'ALL_ACTIVE'
        }
        
        payroll_response = client.create_payroll_run(payroll_data)
        payroll_id = payroll_response.data['id']
        print(f"Payroll run created: {payroll_id}")

        # Step 3: Get preview and validate
        preview_response = client.get_payroll_preview(payroll_id)
        payroll_summary = preview_response.data

        print("Employees in payroll: " + str(payroll_summary['employeeCount']))
        print("Total gross pay: $" + "{:.2f}".format(payroll_summary['totalGrossPay']))
        print("Total net pay: $" + "{:.2f}".format(payroll_summary['totalNetPay']))

        # Step 4: Review individual employee calculations
        for employee in payroll_summary['employees']:
            if employee['grossPay'] > 5000:  # Flag high payments for review
                print("High pay alert: " + employee['employeeName'] + " - $" + "{:.2f}".format(employee['grossPay']))

        # Step 5: Approve payroll (in production, add manual approval step)
        approval_response = client.approve_payroll(payroll_id, {
            'notes': 'Automated approval after validation checks'
        })

        print("Payroll approved and scheduled for " + payroll_data['payDate'])
        return True

    except Exception as e:
        print("Payroll processing failed: " + str(e))
        return False

# Usage
client = PayrollAPIClient()
client.login('payroll@company.com', 'secure_password')

# Process current pay period
start_date = date(2024, 3, 1)
end_date = date(2024, 3, 15)

success = process_payroll(client, start_date, end_date)
if success:
    print("Payroll processing completed successfully")
else:
    print("Payroll processing failed - manual intervention required")
\`\`\`
`;

    fs.writeFileSync(path.join(examplesDir, 'payroll-processing.md'), payrollWorkflow);
    
    console.log(`📋 Use case examples generated in: ${examplesDir}`);
  }
  /**
   * Generate testing guide
   */
  private static generateTestingGuide(guidesDir: string): void {
    const testingGuide = `# API Testing Guide

## Testing Strategy Overview

Comprehensive testing ensures reliable integration with the Payroll API. This guide covers unit tests, integration tests, and end-to-end testing scenarios.

## Test Environment Setup

### 1. Test Endpoints
- **Test API:** \`https://api-test.yourdomain.com/api/v1\`
- **Staging API:** \`https://api-staging.yourdomain.com/api/v1\`
- **Local Development:** \`http://localhost:3005/api/v1\`

### 2. Test Data
Use the test tenant: \`test-company-123\`

Test users available:
- **Admin:** \`test-admin@testcompany.com\` / \`TestPassword123!\`
- **Manager:** \`test-manager@testcompany.com\` / \`TestPassword123!\`
- **Employee:** \`test-employee@testcompany.com\` / \`TestPassword123!\`

## Unit Testing

### JavaScript/Jest Example

\`\`\`javascript
const PayrollAPIClient = require('./payroll-api-client');

describe('PayrollAPIClient', () => {
  let client;
  
  beforeEach(() => {
    client = new PayrollAPIClient(process.env.TEST_API_URL);
  });

  describe('Authentication', () => {
    test('should login successfully with valid credentials', async () => {
      const response = await client.login('test-admin@testcompany.com', 'TestPassword123!');
      
      expect(response.success).toBe(true);
      expect(response.data.tokens.accessToken).toBeDefined();
      expect(client.token).toBeTruthy();
    });

    test('should handle invalid credentials', async () => {
      await expect(
        client.login('invalid@email.com', 'wrongpassword')
      ).rejects.toThrow('Invalid credentials provided');
    });

    test('should refresh token automatically', async () => {
      await client.login('test-admin@testcompany.com', 'TestPassword123!');
      
      // Mock token expiration
      client.token = 'expired_token';
      
      const response = await client.getEmployees();
      expect(response.success).toBe(true);
    });
  });

  describe('Employee Management', () => {
    beforeEach(async () => {
      await client.login('test-admin@testcompany.com', 'TestPassword123!');
    });

    test('should create employee successfully', async () => {
      const employeeData = {
        firstName: 'Test',
        lastName: 'Employee',
        email: \`test-\${{Date.now()}}@testcompany.com\`,
        employeeId: \`TEST\${{Date.now()}}\`,
        position: 'Security Guard',
        hireDate: '2024-03-15',
        hourlyRate: 25.00
      };

      const response = await client.createEmployee(employeeData);
      
      expect(response.success).toBe(true);
      expect(response.data.id).toBeDefined();
      expect(response.data.firstName).toBe(employeeData.firstName);
    });

    test('should validate required fields', async () => {
      const invalidData = {
        firstName: 'Test'
        // Missing required fields
      };

      await expect(
        client.createEmployee(invalidData)
      ).rejects.toThrow('Required field is missing');
    });

    test('should handle duplicate employee ID', async () => {
      const employeeData = {
        firstName: 'Test',
        lastName: 'Employee',
        email: 'unique@testcompany.com',
        employeeId: 'DUPLICATE_ID',
        position: 'Security Guard',
        hireDate: '2024-03-15',
        hourlyRate: 25.00
      };

      // Create first employee
      await client.createEmployee(employeeData);
      
      // Attempt to create duplicate
      employeeData.email = 'another@testcompany.com';
      
      await expect(
        client.createEmployee(employeeData)
      ).rejects.toThrow('Employee ID already exists');
    });
  });

  describe('Pagination', () => {
    beforeEach(async () => {
      await client.login('test-admin@testcompany.com', 'TestPassword123!');
    });

    test('should handle pagination correctly', async () => {
      const response = await client.getEmployees({
        page: 1,
        limit: 5
      });

      expect(response.success).toBe(true);
      expect(response.metadata.pagination).toBeDefined();
      expect(response.metadata.pagination.page).toBe(1);
      expect(response.metadata.pagination.limit).toBe(5);
      expect(response.data.length).toBeLessThanOrEqual(5);
    });
  });

  describe('Error Handling', () => {
    test('should handle network errors', async () => {
      const offlineClient = new PayrollAPIClient('http://nonexistent-url.com');
      
      await expect(
        offlineClient.login('test@test.com', 'password')
      ).rejects.toThrow('Request failed');
    });

    test('should handle rate limiting', async () => {
      await client.login('test-admin@testcompany.com', 'TestPassword123!');
      
      // Make many requests to trigger rate limit
      const requests = Array(200).fill().map(() => client.getEmployees());
      
      await expect(
        Promise.all(requests)
      ).rejects.toThrow('Request rate limit exceeded');
    });
  });
});
\`\`\`

## Integration Testing

### Python/pytest Example

\`\`\`python
import pytest
import time
from datetime import date, datetime
from payroll_api_client import PayrollAPIClient, PayrollAPIError

class TestPayrollIntegration:
    
    @pytest.fixture
    def client(self):
        client = PayrollAPIClient('http://localhost:3005/api/v1')
        client.login('test-admin@testcompany.com', 'TestPassword123!')
        return client

    def test_employee_lifecycle(self, client):
        """Test complete employee lifecycle"""
        
        # Create employee
        employee_data = {
            'firstName': 'Integration',
            'lastName': 'Test',
            'email': f'integration-{int(time.time())}@testcompany.com',
            'employeeId': f'INT{int(time.time())}',
            'position': 'Security Guard',
            'hireDate': '2024-03-15',
            'hourlyRate': 25.00
        }
        
        create_response = client.create_employee(employee_data)
        assert create_response.success
        employee_id = create_response.data['id']
        
        # Read employee
        get_response = client.get_employee(employee_id)
        assert get_response.success
        assert get_response.data['firstName'] == 'Integration'
        
        # Update employee
        update_response = client.update_employee(employee_id, {
            'hourlyRate': 30.00,
            'position': 'Senior Security Guard'
        })
        assert update_response.success
        assert update_response.data['hourlyRate'] == 30.00
        
        # Verify update
        updated_employee = client.get_employee(employee_id)
        assert updated_employee.data['hourlyRate'] == 30.00

    def test_attendance_workflow(self, client):
        """Test attendance tracking workflow"""
        
        # Assume employee exists from previous test
        employees = client.get_employees(limit=1)
        employee_id = employees.data[0]['id']
        
        # Clock in
        clock_in_response = client.clock_in(employee_id, {
            'latitude': 41.8781,
            'longitude': -87.6298,
            'timestamp': datetime.now().isoformat()
        })
        assert clock_in_response.success
        
        # Verify attendance record created
        time.sleep(1)  # Brief delay
        
        attendance = client.get_attendance({
            'employeeId': employee_id,
            'date': date.today().isoformat()
        })
        assert len(attendance.data) > 0
        assert attendance.data[0]['status'] == 'CLOCKED_IN'
        
        # Clock out
        clock_out_response = client.clock_out(employee_id, {
            'latitude': 41.8781,
            'longitude': -87.6298,
            'timestamp': datetime.now().isoformat()
        })
        assert clock_out_response.success

    def test_error_scenarios(self, client):
        """Test various error scenarios"""
        
        # Test 404 - Resource not found
        with pytest.raises(PayrollAPIError) as exc_info:
            client.get_employee('nonexistent-id')
        assert exc_info.value.code == 'EMPLOYEE_NOT_FOUND'
        assert exc_info.value.status_code == 404
        
        # Test 403 - Permission denied (try with employee account)
        employee_client = PayrollAPIClient('http://localhost:3005/api/v1')
        employee_client.login('test-employee@testcompany.com', 'TestPassword123!')
        
        with pytest.raises(PayrollAPIError) as exc_info:
            employee_client.create_employee({
                'firstName': 'Should',
                'lastName': 'Fail',
                'email': 'fail@test.com'
            })
        assert exc_info.value.code == 'AUTHORIZATION_FAILED'

if __name__ == '__main__':
    pytest.main([__file__])
\`\`\`

## Load Testing

### Artillery.js Configuration

\`\`\`yaml
config:
  target: 'http://localhost:3005'
  phases:
    - duration: 60
      arrivalRate: 10
    - duration: 120
      arrivalRate: 50
    - duration: 60
      arrivalRate: 100
  processor: "./load-test-functions.js"

scenarios:
  - name: "Employee Management Load Test"
    weight: 70
    flow:
      - post:
          url: "/api/v1/auth/login"
          json:
            email: "test-admin@testcompany.com"
            password: "TestPassword123!"
          capture:
            - json: "$.data.tokens.accessToken"
              as: "token"
      - get:
          url: "/api/v1/employees"
          headers:
            Authorization: "Bearer {{ token }}"
      - post:
          url: "/api/v1/employees"
          headers:
            Authorization: "Bearer {{ token }}"
          json:
            firstName: "Load"
            lastName: "Test"
            email: "{{ generateEmail() }}"
            employeeId: "{{ generateEmployeeId() }}"
            position: "Security Guard"
            hireDate: "2024-03-15"
            hourlyRate: 25.00

  - name: "Read-Only Operations"
    weight: 30
    flow:
      - post:
          url: "/api/v1/auth/login"
          json:
            email: "test-employee@testcompany.com"
            password: "TestPassword123!"
          capture:
            - json: "$.data.tokens.accessToken"
              as: "token"
      - get:
          url: "/api/v1/auth/profile"
          headers:
            Authorization: "Bearer {{ token }}"
      - get:
          url: "/api/v1/dashboard/summary"
          headers:
            Authorization: "Bearer {{ token }}"
\`\`\`

## Automated Testing Pipeline

### GitHub Actions Example

\`\`\`yaml
name: API Integration Tests

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:13
        env:
          POSTGRES_PASSWORD: test
          POSTGRES_DB: payroll_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
    - uses: actions/checkout@v2
    
    - name: Setup Node.js
      uses: actions/setup-node@v2
      with:
        node-version: '18'
        
    - name: Install dependencies
      run: npm ci
      
    - name: Setup test database
      run: npm run db:test:setup
      
    - name: Start API server
      run: npm run start:test &
      
    - name: Wait for API to be ready
      run: npx wait-on http://localhost:3005/health
      
    - name: Run integration tests
      run: npm run test:integration
      
    - name: Run load tests
      run: npm run test:load
      
    - name: Generate test report
      run: npm run test:report
      
    - name: Upload test results
      uses: actions/upload-artifact@v2
      with:
        name: test-results
        path: test-results/
\`\`\`

## Best Practices

1. **Test Data Isolation:** Use unique identifiers to avoid conflicts
2. **Cleanup:** Remove test data after tests complete
3. **Environment Variables:** Use environment-specific configurations
4. **Assertions:** Test both success and error scenarios
5. **Performance:** Include load testing in CI/CD pipeline
6. **Documentation:** Keep test scenarios documented and up-to-date
`;

    fs.writeFileSync(path.join(guidesDir, 'testing-guide.md'), testingGuide);
    console.log(`🧪 Testing guide: ${path.join(guidesDir, 'testing-guide.md')}`);
  }

  /**
   * Generate deployment guide
   */
  private static generateDeploymentGuide(guidesDir: string): void {
    const deploymentGuide = `# Production Deployment Guide

## Environment Configuration

### Required Environment Variables

\`\`\`bash
# API Configuration
NODE_ENV=production
PORT=3005
API_BASE_URL=https://api.yourdomain.com

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/payroll_prod

# JWT Configuration
JWT_SECRET=your-super-secure-secret-key
JWT_EXPIRES_IN=3600
REFRESH_TOKEN_EXPIRES_IN=604800

# Redis (for caching and sessions)
REDIS_URL=redis://localhost:6379

# File Storage
AWS_S3_BUCKET=payroll-documents
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key

# Email Configuration
SMTP_HOST=smtp.yourdomain.com
SMTP_PORT=587
SMTP_USER=noreply@yourdomain.com
SMTP_PASS=smtp-password

# Monitoring
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project
\`\`\`

### SSL/TLS Configuration

Ensure HTTPS is properly configured:

\`\`\`nginx
server {
    listen 443 ssl;
    server_name api.yourdomain.com;
    
    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;
    
    location / {
        proxy_pass http://localhost:3005;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
\`\`\`

## Security Considerations

### 1. Rate Limiting
Configure appropriate rate limits based on usage patterns:

\`\`\`javascript
// Example rate limiting configuration
const rateLimit = {
  auth: { windowMs: 60000, max: 10 },      // 10 login attempts per minute
  api: { windowMs: 60000, max: 100 },      // 100 API calls per minute
  upload: { windowMs: 60000, max: 5 }      // 5 file uploads per minute
};
\`\`\`

### 2. CORS Configuration
Configure CORS for your allowed origins:

\`\`\`javascript
const corsOptions = {
  origin: [
    'https://app.yourdomain.com',
    'https://admin.yourdomain.com'
  ],
  credentials: true,
  optionsSuccessStatus: 200
};
\`\`\`

### 3. Security Headers
Implement security headers:

\`\`\`javascript
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));
\`\`\`

## Monitoring and Logging

### 1. Application Monitoring

\`\`\`javascript
// Sentry integration for error tracking
const Sentry = require('@sentry/node');

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version
  });
});
\`\`\`

### 2. Structured Logging

\`\`\`javascript
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'payroll-api' },
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});
\`\`\`

### 3. Performance Monitoring

\`\`\`javascript
// Response time tracking
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('Request completed', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration,
      userAgent: req.get('User-Agent'),
      ip: req.ip
    });
  });
  
  next();
});
\`\`\`

## Database Optimization

### 1. Connection Pooling

\`\`\`javascript
const pool = {
  min: 2,
  max: 20,
  createTimeoutMillis: 30000,
  acquireTimeoutMillis: 60000,
  idleTimeoutMillis: 600000,
  reapIntervalMillis: 1000,
  createRetryIntervalMillis: 100
};
\`\`\`

### 2. Query Optimization
- Add appropriate database indexes
- Use database query analysis tools
- Implement query result caching

### 3. Migration Strategy

\`\`\`bash
# Production migration process
npm run db:backup
npm run db:migrate
npm run db:seed:production
\`\`\`

## Deployment Strategies

### 1. Blue-Green Deployment

\`\`\`bash
# Deploy to green environment
kubectl apply -f k8s/green-deployment.yaml

# Run smoke tests
npm run test:smoke -- --target=green

# Switch traffic to green
kubectl patch service payroll-api -p '{"spec":{"selector":{"version":"green"}}}'

# Monitor for issues
kubectl logs -f deployment/payroll-api-green

# If successful, terminate blue
kubectl delete deployment payroll-api-blue
\`\`\`

### 2. Docker Configuration

\`\`\`dockerfile
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:18-alpine AS runtime

RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

WORKDIR /app
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --chown=nextjs:nodejs . .

USER nextjs

EXPOSE 3005

CMD ["npm", "start"]
\`\`\`

### 3. Kubernetes Deployment

\`\`\`yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: payroll-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: payroll-api
  template:
    metadata:
      labels:
        app: payroll-api
    spec:
      containers:
      - name: api
        image: payroll-api:latest
        ports:
        - containerPort: 3005
        env:
        - name: NODE_ENV
          value: "production"
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: db-secret
              key: url
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3005
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 3005
          initialDelaySeconds: 5
          periodSeconds: 5
\`\`\`

## Backup and Disaster Recovery

### 1. Database Backups

\`\`\`bash
# Automated daily backups
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump $DATABASE_URL > /backups/payroll_$DATE.sql
aws s3 cp /backups/payroll_$DATE.sql s3://payroll-backups/
\`\`\`

### 2. Application State Backup

\`\`\`bash
# Backup uploaded documents
aws s3 sync s3://payroll-documents s3://payroll-documents-backup/

# Backup configuration
kubectl get configmap payroll-config -o yaml > config-backup.yaml
\`\`\`

## Maintenance Procedures

### 1. Graceful Shutdown

\`\`\`javascript
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  
  // Stop accepting new requests
  server.close(() => {
    console.log('HTTP server closed');
    
    // Close database connections
    db.close();
    
    // Close Redis connections
    redis.disconnect();
    
    process.exit(0);
  });
});
\`\`\`

### 2. Health Checks

\`\`\`javascript
app.get('/health/detailed', async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    checks: {
      database: await checkDatabase(),
      redis: await checkRedis(),
      external_apis: await checkExternalAPIs()
    }
  };
  
  const isHealthy = Object.values(health.checks).every(check => check.status === 'ok');
  
  res.status(isHealthy ? 200 : 503).json(health);
});
\`\`\`

## Performance Optimization

### 1. Caching Strategy

\`\`\`javascript
// Redis caching for frequently accessed data
const cache = {
  employees: 300,      // 5 minutes
  clients: 600,        // 10 minutes
  sites: 1800,         // 30 minutes
  reports: 3600        // 1 hour
};
\`\`\`

### 2. Database Query Optimization

\`\`\`sql
-- Add indexes for common queries
CREATE INDEX idx_employees_tenant_id ON employees(tenant_id);
CREATE INDEX idx_attendance_date_employee ON attendance(date, employee_id);
CREATE INDEX idx_payroll_pay_period ON payroll_runs(pay_period_start, pay_period_end);
\`\`\`

## Troubleshooting

### Common Issues and Solutions

1. **High Memory Usage:**
   - Check for memory leaks in application code
   - Review database connection pooling
   - Analyze garbage collection patterns

2. **Slow Database Queries:**
   - Use EXPLAIN ANALYZE to identify slow queries
   - Add missing indexes
   - Consider query optimization

3. **Authentication Issues:**
   - Verify JWT secret configuration
   - Check token expiration settings
   - Review CORS configuration

4. **File Upload Problems:**
   - Check S3 permissions and configuration
   - Verify file size limits
   - Review upload timeout settings
`;

    fs.writeFileSync(path.join(guidesDir, 'deployment-guide.md'), deploymentGuide);
    console.log(`🚀 Deployment guide: ${path.join(guidesDir, 'deployment-guide.md')}`);
  }

  /**
   * Generate versioning guide
   */
  private static generateVersioningGuide(guidesDir: string): void {
    // Create versioning directory
    const versioningDir = path.join(guidesDir, 'versioning');
    if (!fs.existsSync(versioningDir)) {
      fs.mkdirSync(versioningDir, { recursive: true });
    }

    const migrationsDir = path.join(versioningDir, 'migrations');
    if (!fs.existsSync(migrationsDir)) {
      fs.mkdirSync(migrationsDir, { recursive: true });
    }

    // Main versioning guide with correct heading for "Migration Strategy"
    const versioningGuide = `# API Versioning Guide

## Versioning Strategy

The Security Workforce & Payroll Management API follows a comprehensive versioning strategy to ensure backward compatibility while enabling continuous improvement.

## Version Lifecycle

Each API version follows a structured lifecycle with clear phases from development to end-of-life.

## Backward Compatibility Policy

We maintain strict backward compatibility policies to ensure client applications continue working.

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

## Version Support Timeline

| Version | Release Date | Deprecation | End of Life | Status |
|---------|-------------|-------------|-------------|---------|
| v1.0    | 2024-03-01  | TBD         | TBD         | Current |
| v2.0    | 2024-09-01  | -           | -           | Planned |

## Conclusion

Our versioning strategy balances innovation with stability, ensuring that clients can adopt new features at their own pace while maintaining reliable service.
`;

    fs.writeFileSync(path.join(versioningDir, 'versioning-guide.md'), versioningGuide);

    // Generate migration guides
    const migrationGuide = `# Migration Guide: v1 to v2

## Overview

This guide helps you migrate from API v1 to v2, highlighting breaking changes, new features, and step-by-step migration instructions.

## Breaking Changes

### 1. Authentication Changes
- **Old (v1):** Basic authentication with username/password
- **New (v2):** OAuth 2.0 with JWT tokens

### 2. Response Format Changes
- **Old (v1):** Standard wrapper format
- **New (v2):** Enhanced metadata format

## Migration Steps

1. Update authentication mechanisms
2. Update API endpoints
3. Handle response changes
4. Test thoroughly

## Support

Contact api-support@yourdomain.com for migration assistance.
`;

    fs.writeFileSync(path.join(migrationsDir, 'v1-to-v2-migration.md'), migrationGuide);

    // Generate version matrix
    const versionMatrix = `# API Version Compatibility Matrix

## Supported Versions

| Version | Status | Release Date | End of Life | Supported Features |
|---------|--------|--------------|-------------|-------------------|
| v1.0    | Current | 2024-03-01   | TBD         | Full feature set |
| v2.0    | Planned | 2024-09-01   | N/A         | Enhanced features |

## Feature Compatibility

Comprehensive compatibility matrix for all API features across versions.
`;

    fs.writeFileSync(path.join(versioningDir, 'version-matrix.md'), versionMatrix);

    // Generate changelog
    const changelog = `# API Changelog

All notable changes to the Payroll Management API will be documented in this file.

## [1.0.0] - 2024-03-01

### Added
- Initial API release with core functionality
- Employee management endpoints
- Payroll processing capabilities
- Authentication and authorization system
`;

    fs.writeFileSync(path.join(versioningDir, 'changelog.md'), changelog);

    // Generate deprecation notices
    const deprecationNotices = `# API Deprecation Notices

This document contains all current and historical deprecation notices for the Payroll Management API.

## Active Deprecation Notices

Currently, there are no active deprecation notices.

## Deprecation Policy

We provide 180 days notice for breaking changes and comprehensive migration support.
`;

    fs.writeFileSync(path.join(versioningDir, 'deprecation-notices.md'), deprecationNotices);

    console.log(`📋 Versioning guides generated in: ${versioningDir}`);
  }
}