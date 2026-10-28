const axios = require('axios');

async function debugSorting() {
  try {
    // Login first
    const loginResponse = await axios.post('http://localhost:3005/api/v1/auth/login', {
      email: 'admin@demosecurity.co.in',
      password: 'admin123'
    });
    
    const accessToken = loginResponse.data.data.tokens.accessToken;
    console.log('✅ Login successful');
    
    // Test with no query parameters at all
    try {
      const employeesResponse = await axios.get('http://localhost:3005/api/v1/employees', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('✅ Success with no params');
      
    } catch (empError) {
      console.log('❌ Error with no params - same error appears without any query params');
      console.log('This suggests the issue is in the default values in the service');
    }
    
    // Test with explicit sort parameters
    try {
      const employeesResponse2 = await axios.get('http://localhost:3005/api/v1/employees?sortBy=created_at&sortOrder=desc', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('✅ Success with explicit params');
      
    } catch (empError) {
      console.log('❌ Error with explicit params - still same error');
      console.log('Error message:', empError.response?.data?.error?.message?.substring(0, 200) + '...');
    }
    
  } catch (error) {
    console.log('❌ Login failed:', error.message);
  }
}

debugSorting();