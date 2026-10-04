# Postman Collections for Payroll API

This directory contains Postman collections and environments for testing and exploring the Payroll API.

## Collections

### 1. `payroll-api-main.postman_collection.json`
**Main API Collection**
- Complete API endpoints organized by functionality
- Pre-configured authentication with auto-token refresh
- Example requests with proper request bodies
- Basic response validation tests

### 2. `payroll-api-tests.postman_collection.json`
**Automated Test Suite**
- Comprehensive CRUD operation tests
- Setup and cleanup procedures
- Data validation and error handling tests
- Suitable for CI/CD integration

### 3. `payroll-api-onboarding.postman_collection.json`
**Developer Onboarding Guide**
- Step-by-step tutorial for new developers
- Interactive learning experience
- Explains API concepts and best practices
- Perfect for team training

## Environment Files

### `development-environment.postman_environment.json`
- Local development configuration
- Base URL: `http://localhost:3005/api/v1`
- Test credentials included

### `staging-environment.postman_environment.json`
- Staging server configuration
- Base URL: `https://api-staging.yourdomain.com/api/v1`
- Staging-specific credentials

### `production-environment.postman_environment.json`
- Production server configuration
- Base URL: `https://api.yourdomain.com/api/v1`
- **⚠️ Remember to update credentials before use**

## Quick Start

1. **Import Collections:**
   - Open Postman
   - Click "Import" button
   - Select all `.json` files from this directory

2. **Import Environments:**
   - Import the environment file for your target environment
   - Set it as the active environment

3. **Configure Credentials:**
   - Update environment variables:
     - `admin_email`: Your admin email
     - `admin_password`: Your admin password
   - For production, ensure you use secure credentials

4. **Start with Onboarding:**
   - Run the "Developer Onboarding" collection first
   - Follow the guided tutorial
   - Learn API authentication and basic operations

## Authentication

All collections use JWT Bearer token authentication:

1. **Login:** Run the login request to get tokens
2. **Auto-refresh:** Tokens are automatically refreshed when near expiration
3. **Storage:** Tokens are stored as collection variables

### Manual Token Setup
If needed, you can manually set tokens:
```javascript
pm.collectionVariables.set("access_token", "your-jwt-token");
pm.collectionVariables.set("refresh_token", "your-refresh-token");
```

## Running Tests

### Manual Testing
1. Select the "Main API Collection"
2. Choose individual requests or folders
3. Click "Send" to execute
4. Review response and test results

### Automated Testing
1. Select "Automated Test Suite" collection
2. Click "Run" button
3. Configure test run options
4. Execute all tests automatically

### Collection Runner
For comprehensive testing:
1. Use Postman's Collection Runner
2. Select test collection and environment
3. Configure iterations and data files
4. Run and review detailed results

## CI/CD Integration

### Newman (CLI Runner)
Install Newman for command-line execution:
```bash
npm install -g newman
```

Run tests:
```bash
# Run test collection
newman run payroll-api-tests.postman_collection.json \
  -e development-environment.postman_environment.json \
  --reporters cli,json \
  --reporter-json-export results.json

# Run with data file
newman run payroll-api-tests.postman_collection.json \
  -e production-environment.postman_environment.json \
  -d test-data.json \
  --bail
```

### GitHub Actions Example
```yaml
- name: Run Postman Tests
  run: |
    newman run tests/payroll-api-tests.postman_collection.json \
      -e tests/staging-environment.postman_environment.json \
      --reporters cli,junit \
      --reporter-junit-export postman-results.xml
```

## Collection Variables

### Global Variables
- `base_url`: API base URL
- `access_token`: JWT access token
- `refresh_token`: JWT refresh token

### Test-specific Variables
- `test_employee_id`: ID of test employee (for cleanup)
- `test_client_id`: ID of test client (for cleanup)
- `last_created_id`: ID of most recently created resource

## Custom Scripts

### Pre-request Scripts
Collections include pre-request scripts for:
- Token validation and refresh
- Dynamic data generation
- Environment-specific configuration

### Test Scripts
Automated validation includes:
- Response status codes
- Response structure validation
- Data integrity checks
- Performance assertions (response time)

## Troubleshooting

### Common Issues

**Authentication Errors:**
- Ensure correct credentials in environment
- Check if API is running and accessible
- Verify token hasn't expired

**Connection Errors:**
- Confirm `base_url` in environment
- Check network connectivity
- Verify SSL certificates for HTTPS

**Test Failures:**
- Review test output in console
- Check API response format changes
- Validate test data and expectations

### Debug Tips

1. **Enable Console Logging:**
   ```javascript
   console.log("Debug info:", pm.response.json());
   ```

2. **Check Variables:**
   ```javascript
   console.log("Token:", pm.collectionVariables.get("access_token"));
   ```

3. **Response Analysis:**
   ```javascript
   console.log("Status:", pm.response.code);
   console.log("Headers:", pm.response.headers);
   ```

## Best Practices

1. **Use Environments:** Keep configuration separate from collections
2. **Variable Management:** Use collection variables for dynamic data
3. **Test Organization:** Group related tests in folders
4. **Error Handling:** Include negative test cases
5. **Documentation:** Add descriptions to requests and folders
6. **Version Control:** Track collection changes in git

## Support

- **API Documentation:** Available at `/api/docs`
- **OpenAPI Spec:** Available at `/api/docs-json`
- **Integration Guides:** Check `../guides/` directory
- **Error Reference:** See `../error-codes.md`

For technical support, contact: api-support@yourdomain.com