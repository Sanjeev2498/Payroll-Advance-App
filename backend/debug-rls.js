const { PrismaService } = require('./dist/src/prisma/prisma.service.js');
const { v4: uuidv4 } = require('uuid');

async function debugRLSProperly() {
  const prisma = new PrismaService();
  await prisma.onModuleInit();
  
  const tenant1Id = uuidv4();
  const tenant2Id = uuidv4();
  
  console.log('Creating test companies...');
  console.log('Tenant1:', tenant1Id);
  console.log('Tenant2:', tenant2Id);
  
  // Create companies using system context
  await prisma.withSystemContext(async (p) => {
    await p.company.createMany({
      data: [
        { id: tenant1Id, name: 'Company1', slug: 'comp1-test' },
        { id: tenant2Id, name: 'Company2', slug: 'comp2-test' }
      ]
    });
  });
  
  console.log('\nTest 1: Query as Tenant1 (should see only Tenant1)');
  const tenant1Companies = await prisma.withTenant(tenant1Id, async (p) => {
    // Check tenant context WITHIN the transaction
    const contextQuery = await p.$queryRaw`SELECT current_setting('app.tenant_id', true) as tenant_id`;
    console.log('Tenant context (in transaction):', contextQuery[0]);
    
    const companies = await p.company.findMany();
    console.log('Found companies:', companies.length);
    companies.forEach(c => console.log('- Company:', c.id, c.name));
    return companies;
  });
  
  console.log('\nTest 2: Query as Tenant2 (should see only Tenant2)');
  const tenant2Companies = await prisma.withTenant(tenant2Id, async (p) => {
    // Check tenant context WITHIN the transaction
    const contextQuery = await p.$queryRaw`SELECT current_setting('app.tenant_id', true) as tenant_id`;
    console.log('Tenant context (in transaction):', contextQuery[0]);
    
    const companies = await p.company.findMany();
    console.log('Found companies:', companies.length);
    companies.forEach(c => console.log('- Company:', c.id, c.name));
    return companies;
  });
  
  // Cleanup
  await prisma.withSystemContext(async (p) => {
    await p.company.deleteMany({
      where: { id: { in: [tenant1Id, tenant2Id] } }
    });
  });
  
  await prisma.onModuleDestroy();
}

debugRLSProperly().catch(console.error);