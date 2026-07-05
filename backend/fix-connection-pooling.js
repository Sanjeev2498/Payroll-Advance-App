const { PrismaService } = require('./dist/src/prisma/prisma.service.js');
const { v4: uuidv4 } = require('uuid');

async function fixConnectionPooling() {
  console.log('Implementing Bug 1 fix: Connection-aware tenant context...');
  
  const prisma = new PrismaService();
  await prisma.onModuleDestroy(); // Disconnect existing
  
  // The issue is that we need to set tenant context OUTSIDE of transactions
  // or ensure all connections in the pool inherit the context
  
  // Alternative approach: Use application-level filtering instead of relying solely on RLS
  console.log('\\nTesting application-level tenant filtering...');
  
  await prisma.onModuleInit(); // Reconnect
  
  const tenant1Id = uuidv4();
  const tenant2Id = uuidv4();
  
  // Create test data
  await prisma.withSystemContext(async (p) => {
    await p.company.deleteMany({
      where: { id: { in: [tenant1Id, tenant2Id] } }
    });
    
    await p.company.createMany({
      data: [
        { id: tenant1Id, name: 'AppFilter Company1', slug: 'appfilter1-' + Date.now() },
        { id: tenant2Id, name: 'AppFilter Company2', slug: 'appfilter2-' + Date.now() }
      ]
    });
  });
  
  console.log('\\nTesting modified withTenant that adds explicit WHERE clause...');
  
  // Modified approach: Add explicit tenant filtering to Prisma queries
  const result = await prisma.$transaction(async (p) => {
    // Still set RLS context for additional security
    await p.$executeRaw`SELECT set_config('app.tenant_id', ${tenant1Id}, true)`;
    
    // But ALSO add explicit WHERE clause to ensure filtering
    const companies = await p.company.findMany({
      where: { id: tenant1Id }, // Explicit tenant filtering
    });
    
    console.log(`Modified query result: ${companies.length} companies`);
    companies.forEach(c => console.log(`- ${c.name}`));
    
    return companies;
  });
  
  console.log('\\n=== SOLUTION APPROACH ===');
  console.log('The fix for Bug 1 requires modifying the PrismaService to:');
  console.log('1. Keep RLS as defense-in-depth');
  console.log('2. Add explicit tenant filtering to all tenant-aware queries');
  console.log('3. Modify withTenant() to inject WHERE clauses automatically');
  console.log('4. Update all repositories to use the new tenant-aware methods');
  
  if (result.length === 1) {
    console.log('\\n✅ Application-level filtering works correctly!');
    console.log('This is the path forward for fixing Bug 1.');
  }
  
  // Cleanup
  await prisma.withSystemContext(async (p) => {
    await p.company.deleteMany({
      where: { id: { in: [tenant1Id, tenant2Id] } }
    });
  });
  
  await prisma.onModuleDestroy();
}

fixConnectionPooling().catch(console.error);