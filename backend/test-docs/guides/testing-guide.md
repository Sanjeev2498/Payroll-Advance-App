# API Testing Guide

## Testing Strategy Overview

Comprehensive testing ensures reliable integration with the Payroll API. This guide covers unit tests, integration tests, and end-to-end testing scenarios.

## Test Environment Setup

### 1. Test Endpoints
- **Test API:** `https://api-test.yourdomain.com/api/v1`
- **Staging API:** `https://api-staging.yourdomain.com/api/v1`
- **Local Development:** `http://localhost:3005/api/v1`

### 2. Test Data
Use the test tenant: `test-company-123`

Test users available:
- **Admin:** `test-admin@testcompany.com` / `TestPassword123!`
- **Manager:** `test-manager@testcompany.com` / `TestPassword123!`
- **Employee:** `test-employee@testcompany.com` / `TestPassword123!`

## Unit Testing

### JavaScript/Jest Example

```javascript
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
        email: `test-${{Date.now()}}@testcompany.com`,
        employeeId: `TEST${{Date.now()}}`,
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
```

## Integration Testing

### Python/pytest Example

```python
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
```

## Load Testing

### Artillery.js Configuration

```yaml
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
```

## Automated Testing Pipeline

### GitHub Actions Example

```yaml
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
```

## Best Practices

1. **Test Data Isolation:** Use unique identifiers to avoid conflicts
2. **Cleanup:** Remove test data after tests complete
3. **Environment Variables:** Use environment-specific configurations
4. **Assertions:** Test both success and error scenarios
5. **Performance:** Include load testing in CI/CD pipeline
6. **Documentation:** Keep test scenarios documented and up-to-date
