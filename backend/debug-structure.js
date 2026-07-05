const { PrismaService } = require('./dist/src/prisma/prisma.service.js');
const { v4: uuidv4 } = require('uuid');

async function debugStructure() {
  const prisma = new PrismaService();
  await prisma.onModuleInit();
  
  console.log('Checking database structure and RLS logic...');
  
  // Get current companies
  console.log('\n1. Current companies in database:');
  const existingCompanies = await prisma.withSystemContext(async (p) => {
    return p.company.findMany();
  });
  console.log(`Found ${existingCompanies.length} companies:`);
  existingCompanies.forEach(c => console.log(`- ${c.id} -> ${c.name}`));
  
  // Create test companies 
  const tenant1Id = uuidv4();
  const tenant2Id = uuidv4();
  
  console.log('\n2. Creating test companies:');
  console.log('Tenant1 ID:', tenant1Id);
  console.log('Tenant2 ID:', tenant2Id);
  
  await prisma.withSystemContext(async (p) => {
    await p.company.createMany({
      data: [
        { id: tenant1Id, name: 'Test Company 1', slug: 'test1' },
        { id: tenant2Id, name: 'Test Company 2', slug: 'test2' }
      ]
    });
  });
  
  console.log('\n3. Testing RLS policy logic:');
  console.log('The companies table has:');
  console.log('- id: UUID (primary key)');  
  console.log('- RLS policy: id = current_tenant_id()');
  console.log('');
  console.log('So when we call withTenant(tenant1Id, ...), it sets:');
  console.log('- app.tenant_id = tenant1Id');
  console.log('- current_tenant_id() returns tenant1Id');  
  console.log('- Policy filters: WHERE id = tenant1Id');
  console.log('- Should return only the company with id = tenant1Id');
  
  // Test tenant 1
  console.log('\n4. Testing Tenant1 query:');
  await prisma.withTenant(tenant1Id, async (p) => {
    const companies = await p.company.findMany();
    console.log(`Tenant1 sees ${companies.length} companies:`);
    companies.forEach(c => console.log(`- ${c.id} -> ${c.name} (${c.id === tenant1Id ? 'CORRECT' : 'WRONG'})`));
  });
  
  // Test tenant 2  
  console.log('\n5. Testing Tenant2 query:');
  await prisma.withTenant(tenant2Id, async (p) => {
    const companies = await p.company.findMany();
    console.log(`Tenant2 sees ${companies.length} companies:`);
    companies.forEach(c => console.log(`- ${c.id} -> ${c.name} (${c.id === tenant2Id ? 'CORRECT' : 'WRONG'})`));
  });
  
  // Cleanup
  await prisma.withSystemContext(async (p) => {
    await p.company.deleteMany({
      where: { id: { in: [tenant1Id, tenant2Id] } }
    });
  });
  
  await prisma.onModuleDestroy();
}

debugStructure().catch(console.error);