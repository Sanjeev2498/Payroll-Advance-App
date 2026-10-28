const axios = require('axios');

async function simpleTest() {
  try {
    // Login first
    const loginResponse = await axios.post('http://localhost:3005/api/v1/auth/login', {
      email: 'admin@demosecurity.co.in',
      password: 'admin123'
    });
    
    const accessToken = loginResponse.data.data.tokens.accessToken;
    console.log('✅ Login successful, token received');
    
    // Test employees API
    try {
      const employeesResponse = await axios.get('http://localhost:3005/api/v1/employees', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('✅ Employees API successful');
      console.log('📊 Response data:', employeesResponse.data);
      
    } catch (empError) {
      console.log('❌ Employees API failed');
      console.log('Status:', empError.response?.status);
      console.log('Error:', empError.response?.data);
    }
    
  } catch (error) {
    console.log('❌ Login failed:', error.message);
  }
}

simpleTest();