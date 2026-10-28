const axios = require('axios');

async function testAuthDetailed() {
  console.log('🔍 Detailed Authentication Testing');
  
  try {
    // Test without auth
    console.log('\n📋 Test: Access /employees without authentication');
    try {
      const response = await axios.get('http://localhost:3005/api/v1/employees');
      console.log('❌ Unexpected success:', response.status);
    } catch (error) {
      console.log(`Status: ${error.response?.status}`);
      console.log(`Response:`, error.response?.data);
    }
    
    // Test with valid auth
    console.log('\n📋 Test: Access /employees WITH authentication');
    const loginResponse = await axios.post('http://localhost:3005/api/v1/auth/login', {
      email: 'admin@demosecurity.co.in',
      password: 'admin123'
    });
    
    const token = loginResponse.data.data.tokens.accessToken;
    console.log('Token received, testing authenticated request...');
    
    try {
      const authResponse = await axios.get('http://localhost:3005/api/v1/employees', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      console.log('✅ Authenticated request successful:', authResponse.status);
      console.log('Response keys:', Object.keys(authResponse.data));
    } catch (error) {
      console.log('❌ Authenticated request failed:', error.response?.status);
      console.log('Error:', error.response?.data);
    }
    
  } catch (error) {
    console.log('❌ Test failed:', error.message);
  }
}

testAuthDetailed();