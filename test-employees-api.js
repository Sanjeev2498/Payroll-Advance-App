const axios = require('axios');

async function testEmployeesAPI() {
  const baseURL = 'http://localhost:3001/api/v1';
  
  try {
    console.log('🔍 Testing Employee Stats API...');
    const statsResponse = await axios.get(`${baseURL}/employees/stats`);
    console.log('✅ Employee Stats Response:', JSON.stringify(statsResponse.data, null, 2));
    
    console.log('\n🔍 Testing Employees List API...');
    const employeesResponse = await axios.get(`${baseURL}/employees`, {
      headers: {
        'Authorization': 'Bearer dummy-token-for-testing'
      }
    });
    console.log('✅ Employees List Response:');
    console.log(`Total employees: ${employeesResponse.data.employees.length}`);
    employeesResponse.data.employees.forEach(emp => {
      console.log(`  - ${emp.firstName} ${emp.lastName} (${emp.employeeNumber}) - Status: ${emp.employmentStatus}`);
      if (emp.certifications && emp.certifications.length > 0) {
        console.log(`    Certifications: ${emp.certifications.length}`);
      }
      if (emp.skills && emp.skills.length > 0) {
        console.log(`    Skills: ${emp.skills.join(', ')}`);
      }
    });
    
  } catch (error) {
    console.error('❌ API Test Error:', error.response?.data || error.message);
  }
}

testEmployeesAPI();