const { PrismaService } = require('./dist/src/prisma/prisma.service.js');
const { v4: uuidv4 } = require('uuid');

async function prismaVsManual() {
  const prisma = new PrismaService();
  await prisma.onModuleInit();
  
  const tenant1Id = uuidv4();
  const tenant2Id = uuidv4();
  
  console.log('Testing Prisma vs Manual SQL...');
  console.log('Tenant1:', tenant1Id);
  
  // Create test companies
  await prisma.withSystemContext(async (p) => {
    await p.company.createMany({
      data: [
        { id: tenant1Id, name: 'Company1', slug: 'test1-' + Date.now() },
        { id: tenant2Id, name: 'Company2', slug: 'test2-' + Date.now() }
      ]
    });
  });
  
  await prisma.withTenant(tenant1Id, async (p) => {
    console.log('\\nInside tenant context for tenant1...');
    
    // Test 1: Manual SQL query (should respect RLS)
    console.log('\\n1. Manual SQL query:');
    const manualQuery = await p.$queryRaw`SELECT id, name FROM companies ORDER BY name`;
    console.log(`Manual query found: ${manualQuery.length} companies`);
    manualQuery.forEach(c => console.log(`- ${c.name}`));
    
    // Test 2: Prisma ORM query
    console.log('\\n2. Prisma ORM query:');
    const prismaQuery = await p.company.findMany({ orderBy: { name: 'asc' } });
    console.log(`Prisma query found: ${prismaQuery.length} companies`);
    prismaQuery.forEach(c => console.log(`- ${c.name}`));
    
    // Test 3: Check if it's a SELECT vs findMany issue
    console.log('\\n3. Manual SELECT with explicit RLS check:');
    const explicitCheck = await p.$queryRaw`
      SELECT id, name 
      FROM companies 
      WHERE (id = current_tenant_id()) OR (current_tenant_id() IS NULL)
      ORDER BY name
    `;
    console.log(`Explicit RLS query found: ${explicitCheck.length} companies`);
    explicitCheck.forEach(c => console.log(`- ${c.name}`));
    
    // Test 4: Raw query showing RLS is actually applied
    console.log('\\n4. Testing if RLS is being bypassed:');
    const rlsStatus = await p.$queryRaw`
      SELECT 
        schemaname, 
        tablename, 
        current_setting('row_security', false) as rls_enabled
      FROM pg_tables 
      WHERE tablename = 'companies'
    `;
    console.log('RLS status:', rlsStatus[0]);
  });
  
  // Cleanup
  await prisma.withSystemContext(async (p) => {
    await p.company.deleteMany({
      where: { id: { in: [tenant1Id, tenant2Id] } }
    });
  });
  
  await prisma.onModuleDestroy();
}

prismaVsManual().catch(console.error);