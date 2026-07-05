const { PrismaService } = require('./dist/src/prisma/prisma.service.js');

async function simpleDebug() {
  const prisma = new PrismaService();
  await prisma.onModuleInit();
  
  console.log('Testing helper function directly:');
  
  const testTenantId = '7f98ee4a-5db7-4ac4-8ec1-b880eb42b1c4'; // Demo company ID
  
  // Set tenant context
  await prisma.$executeRaw`SELECT set_config('app.tenant_id', ${testTenantId}, true)`;
  
  // Test the helper function
  const helperResult = await prisma.$queryRaw`SELECT current_tenant_id()`;
  console.log('current_tenant_id() returns:', helperResult[0]);
  
  // Test direct policy condition
  console.log('\nTesting RLS policy condition: id = current_tenant_id()');
  const policyTest = await prisma.$queryRaw`SELECT id, name FROM companies WHERE id = current_tenant_id()`;
  console.log('Manual policy query result:', policyTest.length, 'companies');
  policyTest.forEach(c => console.log('- Found:', c.id, c.name));
  
  // Test with Prisma ORM query (should be filtered by RLS)
  console.log('\nTesting Prisma ORM query (should be filtered by RLS):');
  const ormResult = await prisma.company.findMany();
  console.log('ORM query result:', ormResult.length, 'companies');
  ormResult.forEach(c => console.log('- Found:', c.id, c.name));
  
  await prisma.onModuleDestroy();
}

simpleDebug().catch(console.error);