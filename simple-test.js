// Simple test without external dependencies
const http = require('http');

console.log('Testing basic connectivity...');

const req = http.get('http://localhost:3001/api/v1/auth/health', (res) => {
  console.log('Health check status:', res.statusCode);
  console.log('Headers:', res.headers);
  
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log('Response:', data));
});

req.on('error', (error) => {
  console.log('Connection error:', error.message);
});

// Test if any endpoint works
setTimeout(() => {
  console.log('\nTesting root endpoint...');
  
  const req2 = http.get('http://localhost:3001/', (res) => {
    console.log('Root status:', res.statusCode);
    console.log('Root headers:', res.headers);
    
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => console.log('Root response:', data));
  });
  
  req2.on('error', (error) => {
    console.log('Root connection error:', error.message);
  });
}, 1000);