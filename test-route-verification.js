// Phase 4 Route Verification Test
const https = require('https');
const http = require('http');

const baseUrl = 'http://localhost:3005/api/v1';

const testRoutes = [
  // Core Authentication & Security
  { method: 'POST', path: '/auth/login', expectStatus: 401, module: 'Auth' },
  { method: 'GET', path: '/auth/health', expectStatus: 401, module: 'Auth' },
  
  // Client Management (Phase 3 - Option B fixes)
  { method: 'GET', path: '/clients', expectStatus: 401, module: 'Clients' },
  { method: 'GET', path: '/clients/stats', expectStatus: 401, module: 'Clients' },
  
  // Employee Management (Phase 3 - Option C payroll integration)  
  { method: 'GET', path: '/employees', expectStatus: 401, module: 'Employees' },
  { method: 'GET', path: '/employee-portal/dashboard', expectStatus: 401, module: 'Employee Portal' },
  
  // Contracts Module (Phase 3 - Option D new module)
  { method: 'GET', path: '/contracts', expectStatus: 401, module: 'Contracts' },
  
  // Supervisor Portal (Phase 3 - SupervisorPortal fix)
  { method: 'GET', path: '/supervisor-portal/dashboard', expectStatus: 401, module: 'Supervisor Portal' },
  { method: 'GET', path: '/supervisor-portal/sites/health', expectStatus: 401, module: 'Supervisor Portal' },
  
  // Other Core Modules
  { method: 'GET', path: '/dashboard/overview', expectStatus: 401, module: 'Dashboard' },
  { method: 'GET', path: '/monitoring/health', expectStatus: 401, module: 'Monitoring' },
  { method: 'GET', path: '/client-portal/dashboard', expectStatus: 401, module: 'Client Portal' },
];

async function testRoute(route) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: 3005,
      path: `/api/v1${route.path}`,
      method: route.method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        const success = res.statusCode === route.expectStatus;
        resolve({
          ...route,
          actualStatus: res.statusCode,
          success,
          response: data.length < 200 ? data : data.substring(0, 200) + '...'
        });
      });
    });

    req.on('error', (error) => {
      resolve({
        ...route,
        actualStatus: 'ERROR',
        success: false,
        error: error.message
      });
    });

    if (route.method === 'POST') {
      req.write(JSON.stringify({ test: 'data' }));
    }
    
    req.end();
  });
}

async function runVerification() {
  console.log("=== Phase 4: Route Verification Test ===\n");
  
  let passed = 0;
  let failed = 0;
  
  for (const route of testRoutes) {
    const result = await testRoute(route);
    
    if (result.success) {
      console.log(`✅ ${result.module}: ${result.method} ${result.path} → ${result.actualStatus}`);
      passed++;
    } else {
      console.log(`❌ ${result.module}: ${result.method} ${result.path} → Expected ${result.expectStatus}, Got ${result.actualStatus}`);
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
      failed++;
    }
  }
  
  console.log(`\n=== Phase 4 Route Verification Results ===`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📊 Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`);
  
  if (failed === 0) {
    console.log(`\n🎉 ALL ROUTES VERIFIED SUCCESSFULLY!`);
    console.log(`All modules are properly mapped and secured.`);
  } else {
    console.log(`\n⚠️  Some routes need attention.`);
  }
}

runVerification().catch(console.error);