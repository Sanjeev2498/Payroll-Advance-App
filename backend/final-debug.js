const { PrismaService } = require('./dist/src/prisma/prisma.service.js');
const { v4: uuidv4 } = require('uuid');

async function finalDebug() {
  const prisma = new PrismaService();
  await prisma.onModuleInit();
  
  console.log('Final debugging - step by step analysis...');
  
  // Create test data exactly like the property test
  const tenant1Id = uuidv4();
  const tenant2Id = uuidv4();
  
  console.log('Step 1: Clean setup');
  console.log('Tenant1:', tenant1Id);
  console.log('Tenant2:', tenant2Id);
  
  // Clean first
  await prisma.withSystemContext(async (p) => {
    await p.company.deleteMany({
      where: { id: { in: [tenant1Id, tenant2Id] } }
    });
  });
  
  console.log('\\nStep 2: Create companies in system context');
  await prisma.withSystemContext(async (p) => {
    await p.company.createMany({
      data: [
        { id: tenant1Id, name: 'Tenant1 Company', slug: 'tenant1-test' },
        { id: tenant2Id, name: 'Tenant2 Company', slug: 'tenant2-test' }
      ]
    });
    
    const created = await p.company.findMany({
      where: { id: { in: [tenant1Id, tenant2Id] } }
    });
    console.log(`Created ${created.length} companies:`, created.map(c => c.name));
  });
  
  console.log('\\nStep 3: Test tenant1 isolation');
  console.log('Expected: Should see only Tenant1 Company');
  
  await prisma.withTenant(tenant1Id, async (p) => {
    // Debug the policy condition step by step
    const debug = await p.$queryRaw`
      SELECT 
        id,
        name,
        current_tenant_id() as context_tenant,
        (id = current_tenant_id()) as matches_policy1,
        (current_tenant_id() IS NULL) as matches_policy2,
        ((id = current_tenant_id()) OR (current_tenant_id() IS NULL)) as final_result
      FROM companies 
      ORDER BY name
    `;
    
    console.log('Policy evaluation for each company:');
    debug.forEach(d => {
      const shouldShow = d.id === tenant1Id ? 'SHOULD SHOW' : 'SHOULD HIDE';
      console.log(`- ${d.name}: Policy1=${d.matches_policy1}, Policy2=${d.matches_policy2}, Final=${d.final_result} (${shouldShow})`);
    });
    
    const companies = await p.company.findMany();
    console.log(`\\nPrisma query result: ${companies.length} companies`);
    companies.forEach(c => {
      const correct = c.id === tenant1Id ? '✅ CORRECT' : '❌ WRONG';
      console.log(`- ${c.name} ${correct}`);
    });
  });
  
  console.log('\\nStep 4: Analysis');
  console.log('If Policy1=true and Policy2=false but Final=true for wrong companies,');
  console.log('then there is a bug in PostgreSQL or the policy definition.');
  console.log('');
  console.log('If Final=false but Prisma still returns them,');  
  console.log('then Prisma is not respecting RLS (impossible with FORCE RLS).');
  
  // Cleanup
  await prisma.withSystemContext(async (p) => {
    await p.company.deleteMany({
      where: { id: { in: [tenant1Id, tenant2Id] } }
    });
  });
  
  await prisma.onModuleDestroy();
}

finalDebug().catch(console.error);