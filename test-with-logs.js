const axios = require('axios');

async function testWithLogs() {
  console.log('🔍 Testing with backend log monitoring');
  
  console.log('\n📋 Making unauthenticated request to /employees...');
  console.log('Watch backend logs for JwtAuthGuard output...');
  
  try {
    const response = await axios.get('http://localhost:3005/api/v1/employees');
    console.log(`❌ Unexpected success: ${response.status}`);
  } catch (error) {
    console.log(`Status: ${error.response?.status}`);
    console.log(`Error: ${error.response?.data?.error?.message}`);
  }
  
  // Wait a bit
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  console.log('\n📋 Making authenticated request to /employees...');
  console.log('Watch backend logs for JwtAuthGuard output...');
  
  try {
    const loginResponse = await axios.post('http://localhost:3005/api/v1/auth/login', {
      email: 'admin@demosecurity.co.in',
      password: 'admin123'
    });
    
    const token = loginResponse.data.data.tokens.accessToken;
    const authResponse = await axios.get('http://localhost:3005/api/v1/employees', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    console.log(`✅ Authenticated request: ${authResponse.status}`);
  } catch (error) {
    console.log(`❌ Auth failed: ${error.response?.status}`);
  }
}

testWithLogs();