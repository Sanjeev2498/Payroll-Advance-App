const { PrismaService } = require('./dist/src/prisma/prisma.service.js');
const { v4: uuidv4 } = require('uuid');

async function exactTestRepro() {
  const prisma = new PrismaService();
  await prisma.onModuleInit();
  
  console.log('Reproducing EXACT property test scenario...');
  
  const tenant1Id = uuidv4();
  const tenant2Id = uuidv4();
  
  console.log('Tenant1:', tenant1Id);
  console.log('Tenant2:', tenant2Id);
  
  // Exact cleanup like property test
  console.log('\\nStep 1: Cleanup any existing data');
  await prisma.withSystemContext(async (p) => {
    try {
      await p.company.deleteMany({
        where: { id: { in: [tenant1Id, tenant2Id] } }
      });
    } catch (e) {
      // Ignore cleanup errors
    }
  });
  
  console.log('\\nStep 2: Create companies in system context (like property test)');
  await prisma.withSystemContext(async (p) => {
    await p.company.createMany({
      data: [
        {
          id: tenant1Id,
          name: 'Company1',
          slug: `test-${Date.now()}`,
        },
        {
          id: tenant2Id,
          name: 'Company2',
          slug: `test-${Date.now()}-2`,
        },
      ],
    });
  });
  
  console.log('\\nStep 3: Query as tenant1 (like property test)');
  const tenant1Companies = await prisma.withTenant(tenant1Id, async (p) => {
    console.log('Inside withTenant for tenant1...');
    
    // Check context
    const context = await p.$queryRaw`SELECT current_tenant_id()`;
    console.log('Context:', context[0].current_tenant_id);
    
    // Check what companies exist and their policy evaluation
    const debug = await p.$queryRaw`
      SELECT 
        id,
        name,
        (id = current_tenant_id()) as should_show
      FROM companies
      ORDER BY name
    `;
    console.log('Companies and policy evaluation:');
    debug.forEach(d => console.log(`- ${d.name}: should_show=${d.should_show}`));
    
    // The actual Prisma query that's failing
    const companies = await p.company.findMany();
    console.log(`\\nPrisma returned ${companies.length} companies (expected: 1)`);
    return companies;
  });
  
  console.log('\\nStep 4: Check if system context affects subsequent queries');
  // Test immediately after system context
  await prisma.withSystemContext(async (p) => {
    const systemCount = await p.company.count();
    console.log(`System context sees ${systemCount} companies`);
  });
  
  // Then test tenant context again
  const tenant1Companies2 = await prisma.withTenant(tenant1Id, async (p) => {
    const companies = await p.company.findMany();
    console.log(`Second tenant1 query: ${companies.length} companies`);
    return companies;
  });
  
  console.log('\\n=== RESULTS ===');
  console.log(`First tenant1 query: ${tenant1Companies.length} companies`);
  console.log(`Second tenant1 query: ${tenant1Companies2.length} companies`);
  
  if (tenant1Companies.length !== 1) {
    console.log('\\n❌ BUG REPRODUCED!');
    console.log('Property test failure is confirmed.');
    console.log('RLS policy evaluation shows correct filtering,');
    console.log('but Prisma returns all companies anyway.');
  } else {
    console.log('\\n✅ Cannot reproduce the bug in this scenario.');
  }
  
  // Cleanup
  await prisma.withSystemContext(async (p) => {
    await p.company.deleteMany({
      where: { id: { in: [tenant1Id, tenant2Id] } }
    });
  });
  
  await prisma.onModuleDestroy();
}

exactTestRepro().catch(console.error);