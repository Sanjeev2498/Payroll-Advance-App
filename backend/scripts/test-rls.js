const { PrismaClient } = require('@prisma/client');
const { v4: uuidv4 } = require('uuid');

async function testRLSIsolation() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🧪 Testing Row-Level Security (RLS) isolation...\n');
    
    // Create test tenants
    const tenant1Id = uuidv4();
    const tenant2Id = uuidv4();
    
    console.log(`📋 Test Setup:`);
    console.log(`   Tenant 1 ID: ${tenant1Id}`);
    console.log(`   Tenant 2 ID: ${tenant2Id}`);
    
    // Create test companies (using system context to bypass RLS)
    console.log('\n🏢 Creating test companies...');
    
    await prisma.$executeRaw`SELECT set_config('app.tenant_id', '', false)`;
    
    const company1 = await prisma.company.create({
      data: {
        id: tenant1Id,
        name: 'Test Company 1',
        slug: 'test-company-1',
        settings: { theme: 'dark' },
        branding: { logo: 'logo1.png' }
      }
    });
    
    const company2 = await prisma.company.create({
      data: {
        id: tenant2Id,
        name: 'Test Company 2',
        slug: 'test-company-2',
        settings: { theme: 'light' },
        branding: { logo: 'logo2.png' }
      }
    });
    
    console.log('✅ Test companies created');
    
    // Create test users for each tenant
    console.log('\n👤 Creating test users...');
    
    const user1 = await prisma.user.create({
      data: {
        companyId: tenant1Id,
        email: 'user1@company1.com',
        firstName: 'John',
        lastName: 'Doe',
        passwordHash: 'hashed_password_1',
        role: 'COMPANY_ADMIN'
      }
    });
    
    const user2 = await prisma.user.create({
      data: {
        companyId: tenant2Id,
        email: 'user2@company2.com',
        firstName: 'Jane',
        lastName: 'Smith',
        passwordHash: 'hashed_password_2',
        role: 'COMPANY_ADMIN'
      }
    });
    
    console.log('✅ Test users created');
    
    // Create test employees for each tenant
    console.log('\n👥 Creating test employees...');
    
    const employee1 = await prisma.employee.create({
      data: {
        companyId: tenant1Id,
        employeeNumber: 'EMP001',
        firstName: 'Alice',
        lastName: 'Johnson',
        email: 'alice@company1.com',
        skills: ['Security', 'Surveillance'],
        hireDate: new Date('2024-01-01')
      }
    });
    
    const employee2 = await prisma.employee.create({
      data: {
        companyId: tenant2Id,
        employeeNumber: 'EMP001', // Same number but different tenant
        firstName: 'Bob',
        lastName: 'Wilson',
        email: 'bob@company2.com',
        skills: ['Guard', 'Patrol'],
        hireDate: new Date('2024-01-01')
      }
    });
    
    console.log('✅ Test employees created');
    
    // Test 1: Tenant 1 isolation
    console.log('\n🔒 Test 1: Tenant 1 isolation');
    await prisma.$executeRaw`SELECT set_config('app.tenant_id', ${tenant1Id}, false)`;
    
    const tenant1Companies = await prisma.company.findMany();
    const tenant1Users = await prisma.user.findMany();
    const tenant1Employees = await prisma.employee.findMany();
    
    console.log(`   Companies visible to Tenant 1: ${tenant1Companies.length}`);
    console.log(`   Users visible to Tenant 1: ${tenant1Users.length}`);
    console.log(`   Employees visible to Tenant 1: ${tenant1Employees.length}`);
    
    // Verify tenant 1 can only see their data
    const tenant1CompanyIds = tenant1Companies.map(c => c.id);
    const tenant1UserTenants = tenant1Users.map(u => u.companyId);
    const tenant1EmployeeTenants = tenant1Employees.map(e => e.companyId);
    
    const tenant1Isolated = (
      tenant1CompanyIds.includes(tenant1Id) &&
      !tenant1CompanyIds.includes(tenant2Id) &&
      tenant1UserTenants.every(id => id === tenant1Id) &&
      tenant1EmployeeTenants.every(id => id === tenant1Id)
    );
    
    console.log(`   ✅ Tenant 1 isolation: ${tenant1Isolated ? 'PASS' : 'FAIL'}`);
    
    // Test 2: Tenant 2 isolation
    console.log('\n🔒 Test 2: Tenant 2 isolation');
    await prisma.$executeRaw`SELECT set_config('app.tenant_id', ${tenant2Id}, false)`;
    
    const tenant2Companies = await prisma.company.findMany();
    const tenant2Users = await prisma.user.findMany();
    const tenant2Employees = await prisma.employee.findMany();
    
    console.log(`   Companies visible to Tenant 2: ${tenant2Companies.length}`);
    console.log(`   Users visible to Tenant 2: ${tenant2Users.length}`);
    console.log(`   Employees visible to Tenant 2: ${tenant2Employees.length}`);
    
    // Verify tenant 2 can only see their data
    const tenant2CompanyIds = tenant2Companies.map(c => c.id);
    const tenant2UserTenants = tenant2Users.map(u => u.companyId);
    const tenant2EmployeeTenants = tenant2Employees.map(e => e.companyId);
    
    const tenant2Isolated = (
      tenant2CompanyIds.includes(tenant2Id) &&
      !tenant2CompanyIds.includes(tenant1Id) &&
      tenant2UserTenants.every(id => id === tenant2Id) &&
      tenant2EmployeeTenants.every(id => id === tenant2Id)
    );
    
    console.log(`   ✅ Tenant 2 isolation: ${tenant2Isolated ? 'PASS' : 'FAIL'}`);
    
    // Test 3: No tenant context (system operations)
    console.log('\n🔒 Test 3: System context (no tenant set)');
    await prisma.$executeRaw`SELECT set_config('app.tenant_id', '', false)`;
    
    const allCompanies = await prisma.company.findMany();
    const allUsers = await prisma.user.findMany();
    const allEmployees = await prisma.employee.findMany();
    
    console.log(`   Companies visible with no tenant: ${allCompanies.length}`);
    console.log(`   Users visible with no tenant: ${allUsers.length}`);
    console.log(`   Employees visible with no tenant: ${allEmployees.length}`);
    
    const systemAccessWorks = (
      allCompanies.length >= 2 &&
      allUsers.length >= 2 &&
      allEmployees.length >= 2
    );
    
    console.log(`   ✅ System operations bypass: ${systemAccessWorks ? 'PASS' : 'FAIL'}`);
    
    // Test 4: Cross-tenant data leakage verification
    console.log('\n🔒 Test 4: Cross-tenant data leakage check');
    
    await prisma.$executeRaw`SELECT set_config('app.tenant_id', ${tenant1Id}, false)`;
    const tenant1Data = await prisma.employee.findMany({ select: { id: true, companyId: true } });
    
    await prisma.$executeRaw`SELECT set_config('app.tenant_id', ${tenant2Id}, false)`;
    const tenant2Data = await prisma.employee.findMany({ select: { id: true, companyId: true } });
    
    // Check for any overlapping IDs (which would indicate data leakage)
    const tenant1Ids = tenant1Data.map(e => e.id);
    const tenant2Ids = tenant2Data.map(e => e.id);
    const overlap = tenant1Ids.filter(id => tenant2Ids.includes(id));
    
    const noDataLeakage = overlap.length === 0;
    console.log(`   Data overlap detected: ${overlap.length} records`);
    console.log(`   ✅ No cross-tenant leakage: ${noDataLeakage ? 'PASS' : 'FAIL'}`);
    
    // Summary
    console.log('\n📊 RLS Test Summary:');
    const allTestsPassed = tenant1Isolated && tenant2Isolated && systemAccessWorks && noDataLeakage;
    
    console.log(`   Tenant 1 Isolation: ${tenant1Isolated ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   Tenant 2 Isolation: ${tenant2Isolated ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   System Operations: ${systemAccessWorks ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   No Data Leakage: ${noDataLeakage ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`\n🎯 Overall Result: ${allTestsPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
    
    // Cleanup
    console.log('\n🧹 Cleaning up test data...');
    await prisma.$executeRaw`SELECT set_config('app.tenant_id', '', false)`;
    
    await prisma.employee.deleteMany({
      where: { companyId: { in: [tenant1Id, tenant2Id] } }
    });
    
    await prisma.user.deleteMany({
      where: { companyId: { in: [tenant1Id, tenant2Id] } }
    });
    
    await prisma.company.deleteMany({
      where: { id: { in: [tenant1Id, tenant2Id] } }
    });
    
    console.log('✅ Test data cleaned up');
    
    return allTestsPassed;
    
  } catch (error) {
    console.error('❌ RLS test failed:', error.message);
    console.error(error.stack);
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testRLSIsolation()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Test execution failed:', error);
    process.exit(1);
  });