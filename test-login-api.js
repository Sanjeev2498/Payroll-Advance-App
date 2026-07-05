// Simple Node.js script to test login API
const https = require('http');

const postData = JSON.stringify({
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
    'Content-Length': Buffer.byteLength(postData)
  }
};

console.log('🚀 Testing login API...');
console.log('📧 Email: admin@demosecurity.co.in');
console.log('🌐 URL: http://localhost:3001/api/v1/auth/login');

const req = https.request(options, (res) => {
  console.log(`📥 Status Code: ${res.statusCode}`);
  console.log(`📥 Headers:`, res.headers);

  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('📄 Response:');
    try {
      const parsedData = JSON.parse(data);
      console.log(JSON.stringify(parsedData, null, 2));
      
      if (parsedData.success && parsedData.data) {
        console.log('✅ Login API test successful!');
        console.log(`👤 User: ${parsedData.data.user.firstName} ${parsedData.data.user.lastName}`);
        console.log(`🔑 Token: ${parsedData.data.tokens.accessToken.substring(0, 50)}...`);
      } else {
        console.log('❌ Login API test failed - Invalid response structure');
      }
    } catch (error) {
      console.log('❌ Failed to parse response:', error.message);
      console.log('Raw response:', data);
    }
  });
});

req.on('error', (e) => {
  console.error('❌ Request failed:', e.message);
});

req.write(postData);
req.end();