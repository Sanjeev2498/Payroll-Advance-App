const axios = require('axios');

async function debug403Issue() {
  console.log('🔍 Debugging 403 vs 401 Issue');
  
  try {
    // Test different endpoints to see if the behavior is consistent
    const endpoints = [
      '/employees',
      '/clients', 
      '/dashboard/overview',
      '/auth/profile'  // This should definitely require auth
    ];
    
    for (const endpoint of endpoints) {
      console.log(`\n📋 Testing endpoint: ${endpoint}`);
      
      try {
        const response = await axios.get(`http://localhost:3005/api/v1${endpoint}`);
        console.log(`❌ Unexpected success: ${response.status}`);
      } catch (error) {
        console.log(`Status: ${error.response?.status}`);
        console.log(`Message: ${error.response?.data?.error?.message}`);
        
        if (error.response?.status === 401) {
          console.log('✅ Correct: 401 Unauthorized');
        } else if (error.response?.status === 403) {
          console.log('⚠️ Issue: 403 Forbidden (should be 401)');
        } else {
          console.log(`❓ Other: ${error.response?.status}`);
        }
      }
    }
    
    // Test a known public endpoint
    console.log(`\n📋 Testing public endpoint: /auth/login (POST with no body)`);
    try {
      const response = await axios.post('http://localhost:3005/api/v1/auth/login', {});
      console.log(`Status: ${response.status}`);
    } catch (error) {
      console.log(`Status: ${error.response?.status} (expected 400 for bad request)`);
    }
    
  } catch (error) {
    console.log('❌ Test failed:', error.message);
  }
}

debug403Issue();