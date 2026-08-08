const axios = require('axios');

async function testEmployeeCreation() {
  const baseURL = 'http://localhost:3005/api/v1';
  
  // Test data matching the frontend requirements
  const testEmployee = {
    employeeNumber: 'EMP-TEST-001',
    firstName: 'Test',
    lastName: 'Employee',
    email: 'test.employee@example.com',
    phone: '+91 98765-43210',
    hireDate: '2024-01-15',
    employmentType: 'FULL_TIME',
    department: 'Security Operations',
    jobTitle: 'Security Guard',
    skills: [
      {
        name: 'Security Patrol',
        level: 8,
        yearsExperience: 3
      },
      {
        name: 'CCTV Monitoring',
        level: 7,
        yearsExperience: 2
      }
    ],
    certifications: [
      {
        name: 'Security Guard License',
        issuingOrganization: 'State Security Board',
        issueDate: '2023-01-01',
        expiryDate: '2026-01-01',
        certificateNumber: 'SGL-2023-001'
      }
    ],
    complianceStatus: {
      backgroundCheck: 'CLEARED',
      backgroundCheckDate: '2023-12-01',
      medicalClearance: 'CLEARED',
      medicalClearanceDate: '2023-12-15'
    },
    availability: {
      availableDays: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'],
      preferredShifts: ['DAY_SHIFT'],
      maxHoursPerWeek: 40,
      travelAvailability: 'LOCAL_ONLY',
      overtimeAvailability: 'AVAILABLE'
    },
    hourlyRate: 25.50,
    contactInfo: {
      emergencyContactName: 'Jane Doe',
      emergencyContactPhone: '+91 98765-12345',
      emergencyContactRelationship: 'Spouse',
      address: {
        street: '123 Test Street',
        city: 'Test City',
        state: 'Test State',
        zipCode: '123456',
        country: 'India'
      }
    }
  };
  
  console.log('🔍 Testing Employee Creation API...');
  console.log('📝 Employee data to be sent:');
  console.log(JSON.stringify(testEmployee, null, 2));
  
  try {
    // First, let's check if the server is running
    console.log('\n⏳ Checking server health...');
    const healthResponse = await axios.get(`${baseURL.replace('/api/v1', '')}/health`);
    console.log('✅ Server is running:', healthResponse.data);
    
    // Test employee creation
    console.log('\n⏳ Creating employee...');
    const response = await axios.post(`${baseURL}/employees`, testEmployee, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer dummy-token-for-testing'
      },
      timeout: 10000
    });
    
    console.log('✅ Employee created successfully!');
    console.log('📄 Response:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.error('❌ Employee Creation Failed!');
    
    if (error.response) {
      console.error('🔍 Status Code:', error.response.status);
      console.error('🔍 Status Text:', error.response.statusText);
      console.error('🔍 Response Headers:', error.response.headers);
      console.error('🔍 Error Data:', JSON.stringify(error.response.data, null, 2));
      
      // Check if it's a validation error
      if (error.response.status === 400) {
        console.error('\n🚨 Bad Request - Possible Issues:');
        console.error('  1. Missing required fields');
        console.error('  2. Invalid data format');
        console.error('  3. Business rule violation');
        console.error('  4. Tenant context missing');
        console.error('  5. Authentication/Authorization issue');
        
        const errorData = error.response.data;
        if (errorData.message) {
          console.error('📋 Detailed Error Message:', errorData.message);
        }
        if (errorData.errors) {
          console.error('📋 Validation Errors:', errorData.errors);
        }
      }
    } else if (error.request) {
      console.error('🔍 Request Error (no response received):', error.request);
    } else {
      console.error('🔍 General Error:', error.message);
    }
    console.error('🔍 Full Error:', error);
  }
}

// Also test with minimal data
async function testMinimalEmployeeCreation() {
  const baseURL = 'http://localhost:3005/api/v1';
  
  const minimalEmployee = {
    employeeNumber: 'EMP-MIN-001',
    firstName: 'Minimal',
    lastName: 'Employee',
    hireDate: '2024-01-15'
  };
  
  console.log('\n🔍 Testing Minimal Employee Creation...');
  console.log('📝 Minimal employee data:');
  console.log(JSON.stringify(minimalEmployee, null, 2));
  
  try {
    const response = await axios.post(`${baseURL}/employees`, minimalEmployee, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer dummy-token-for-testing'
      }
    });
    
    console.log('✅ Minimal employee created successfully!');
    console.log('📄 Response:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.error('❌ Minimal Employee Creation Failed!');
    if (error.response) {
      console.error('🔍 Status Code:', error.response.status);
      console.error('🔍 Error Data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

// Run tests
async function runTests() {
  await testEmployeeCreation();
  await testMinimalEmployeeCreation();
}

runTests();