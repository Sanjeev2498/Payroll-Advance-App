const https = require('https');
const http = require('http');

// Test login function with better error handling
async function testLogin() {
  const loginData = JSON.stringify({
    email: 'admin@demosecurity.co.in',
    password: 'admin123'
  });

  const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/api/v1/auth/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': loginData.length,
      'User-Agent': 'NodeJS Test Client'
    }
  };

  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      
      console.log('Login Response Status:', res.statusCode);
      console.log('Login Response Headers:', res.headers);
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log('Raw Login Response:', data);
        try {
          if (res.statusCode === 200 || res.statusCode === 201) {
            const response = JSON.parse(data);
            console.log('Parsed Login Response:', response);
            resolve(response);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${data}`));
          }
        } catch (e) {
          reject(new Error(`Parse error: ${e.message}, Raw data: ${data}`));
        }
      });
    });

    req.on('error', (error) => {
      console.log('Request error:', error);
      reject(error);
    });

    req.write(loginData);
    req.end();
  });
}

// Test employee creation with encryption
async function testEmployeeCreation(token) {
  const employeeData = JSON.stringify({
    firstName: 'Raj',
    lastName: 'Kumar',
    email: 'raj.kumar@example.com',
    phone: '+91 98765-43210',
    aadhaarNumber: '987654321012',
    panNumber: 'ABCDE1234F',
    employeeNumber: 'EMP001',
    employmentStatus: 'ACTIVE',
    hireDate: '2024-01-15',
    metadata: {
      department: 'Security',
      jobTitle: 'Security Guard',
      hourlyRate: 300
    }
  });

  const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/api/v1/employees',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'Content-Length': employeeData.length
    }
  };

  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          console.log('Employee Creation Status:', res.statusCode);
          console.log('Employee Creation Response:', JSON.parse(data));
          resolve(JSON.parse(data));
        } catch (e) {
          console.log('Raw Response:', data);
          reject(e);
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(employeeData);
    req.end();
  });
}

// Test getting employee with different roles (simulation)
async function testEmployeeRoleAccess(employeeId, token, role) {
  const options = {
    hostname: 'localhost',
    port: 3001,
    path: `/api/v1/employees/${employeeId}`,
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-User-Role': role  // We'll simulate different roles
    }
  };

  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          console.log(`\n=== ${role} View ===`);
          console.log('Status:', res.statusCode);
          const response = JSON.parse(data);
          console.log('Email:', response.email || 'HIDDEN');
          console.log('Phone:', response.phone || 'HIDDEN');
          console.log('Aadhaar:', response.aadhaarNumber || 'HIDDEN');
          console.log('PAN:', response.panNumber || 'HIDDEN');
          resolve(response);
        } catch (e) {
          console.log('Raw Response:', data);
          reject(e);
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.end();
  });
}

// Run the test
async function runEncryptionTest() {
  try {
    console.log('🔐 Testing Role-Based Encryption System\n');
    
    // 1. Login
    console.log('1. Logging in...');
    const loginResponse = await testLogin();
    const token = loginResponse.accessToken;
    
    // 2. Create employee with sensitive data
    console.log('\n2. Creating employee with sensitive data...');
    const employee = await testEmployeeCreation(token);
    const employeeId = employee.id;
    
    // 3. Test different role access
    console.log('\n3. Testing role-based data access...');
    
    await testEmployeeRoleAccess(employeeId, token, 'EMPLOYEE');
    await testEmployeeRoleAccess(employeeId, token, 'SUPERVISOR');
    await testEmployeeRoleAccess(employeeId, token, 'COMPANY_ADMIN');
    
    console.log('\n✅ Encryption test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

runEncryptionTest();