const axios = require('axios');

async function testAuthGuards() {
  console.log('🔍 Testing Authentication Guards - Fix #1');
  
  try {
    // Test 1: Access protected endpoint without token - should get 401
    console.log('\n📋 Test 1: Access /employees without authentication');
    try {
      const response = await axios.get('http://localhost:3005/api/v1/employees');
      console.log('❌ SECURITY ISSUE: Got response without auth:', response.status);
      console.log('   This means guards are NOT working properly');
      return false;
    } catch (error) {
      if (error.response && error.response.status === 401) {
        console.log('✅ GOOD: Got 401 Unauthorized (guards working)');
      } else {
        console.log('❓ Unexpected error:', error.response?.status || error.message);
        return false;
      }
    }
    
    // Test 2: Login and then access protected endpoint - should work
    console.log('\n📋 Test 2: Login then access /employees');
    const loginResponse = await axios.post('http://localhost:3005/api/v1/auth/login', {
      email: 'admin@demosecurity.co.in',
      password: 'admin123'
    });
    
    if (loginResponse.data.success) {
      console.log('✅ Login successful');
      
      const token = loginResponse.data.data.tokens.accessToken;
      const authResponse = await axios.get('http://localhost:3005/api/v1/employees', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (authResponse.status === 200) {
        console.log('✅ Authenticated request successful');
        return true;
      }
    }
    
    return false;
    
  } catch (error) {
    console.log('❌ Test failed:', error.response?.data || error.message);
    return false;
  }
}

testAuthGuards().then(result => {
  if (result) {
    console.log('\n🎉 AUTHENTICATION GUARDS ARE WORKING CORRECTLY');
    console.log('✅ Fix #1 Status: VERIFIED WORKING');
  } else {
    console.log('\n💥 AUTHENTICATION GUARDS HAVE ISSUES');
    console.log('❌ Fix #1 Status: NEEDS MORE WORK');
  }
});