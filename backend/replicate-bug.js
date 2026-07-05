const { PrismaService } = require('./dist/src/prisma/prisma.service.js');
const { v4: uuidv4 } = require('uuid');

async function replicateBug() {
  const prisma = new PrismaService();
  await prisma.onModuleInit();
  
  const tenant1Id = uuidv4();
  const tenant2Id = uuidv4();
  
  console.log('Replicating the exact bug scenario...');
  console.log('Tenant1:', tenant1Id);
  console.log('Tenant2:', tenant2Id);
  
  // Create companies exactly like the property test
  await prisma.withSystemContext(async (p) => {
    await p.company.createMany({
      data: [
        { id: tenant1Id, name: 'Company1', slug: 'test1-' + Date.now() },
        { id: tenant2Id, name: 'Company2', slug: 'test2-' + Date.now() }
      ]
    });
  });
  
  console.log('\nTesting with multiple companies...');
  
  // Test tenant1 (should see only tenant1 company)
  console.log('\nTenant1 query:');
  await prisma.withTenant(tenant1Id, async (p) => {
    const helperTest = await p.$queryRaw`SELECT current_tenant_id() as tenant_id`;
    console.log('Tenant context:', helperTest[0].tenant_id);
    
    const allCompaniesWithConditions = await p.$queryRaw`
      SELECT 
        id, 
        name,
        (id = current_tenant_id()) as matches_tenant,
        (current_tenant_id() IS NULL) as matches_system,
        ((id = current_tenant_id()) OR (current_tenant_id() IS NULL)) as effective_policy
      FROM companies
      ORDER BY name
    `;
    
    console.log('Policy evaluation for all companies:');
    allCompaniesWithConditions.forEach(c => {
      console.log(`- ${c.name}: tenant=${c.matches_tenant}, system=${c.matches_system}, effective=${c.effective_policy}`);
    });
    
    const companies = await p.company.findMany();
    console.log(`\\nPrisma query result: ${companies.length} companies visible`);
  });
  
  // Cleanup
  await prisma.withSystemContext(async (p) => {
    await p.company.deleteMany({
      where: { id: { in: [tenant1Id, tenant2Id] } }
    });
  });
  
  await prisma.onModuleDestroy();
}

replicateBug().catch(console.error);