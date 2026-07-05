const { PrismaService } = require('./dist/src/prisma/prisma.service.js');

async function checkPolicies() {
  const prisma = new PrismaService();
  await prisma.onModuleInit();
  
  console.log('Checking RLS policies on companies table:');
  const policies = await prisma.$queryRaw`
    SELECT 
      schemaname, 
      tablename, 
      policyname, 
      cmd,
      qual,
      roles
    FROM pg_policies 
    WHERE tablename = 'companies' 
    ORDER BY policyname;
  `;
  
  console.log('Policies:', JSON.stringify(policies, null, 2));
  
  console.log('\nChecking helper functions:');
  try {
    const helperTest = await prisma.$queryRaw`SELECT current_tenant_id() as current_tenant, is_tenant_admin() as is_admin`;
    console.log('Helper functions result:', helperTest[0]);
  } catch (err) {
    console.log('Helper function error:', err.message);
  }
  
  console.log('\nTesting RLS policy manually:');
  const testTenantId = '7f98ee4a-5db7-4ac4-8ec1-b880eb42b1c4'; // Existing demo company
  
  await prisma.$executeRaw`SELECT set_config('app.tenant_id', ${testTenantId}, true)`;
  
  const contextAfterSet = await prisma.$queryRaw`SELECT current_setting('app.tenant_id', true) as tenant_id`;
  console.log('Context after setting:', contextAfterSet[0]);
  
  const filteredCompanies = await prisma.$queryRaw`SELECT * FROM companies WHERE id = current_tenant_id()`;
  console.log('Manual RLS query result:', filteredCompanies.length, 'companies');
  
  await prisma.onModuleDestroy();
}

checkPolicies().catch(console.error);