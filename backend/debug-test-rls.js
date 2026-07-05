const { PrismaService } = require('./dist/src/prisma/prisma.service.js');
const { v4: uuidv4 } = require('uuid');

async function debugTestRLS() {
  const prisma = new PrismaService();
  await prisma.onModuleInit();
  
  const tenant1Id = uuidv4();
  const tenant2Id = uuidv4();
  
  console.log('Debugging test scenario exactly like the property test...');
  console.log('Tenant1:', tenant1Id);
  console.log('Tenant2:', tenant2Id);
  
  // Check if FORCE RLS is still active
  const rlsStatus = await prisma.$queryRaw`
    SELECT 
      schemaname,
      tablename,
      CASE 
        WHEN relrowsecurity AND relforcerowsecurity THEN 'FORCE RLS'
        WHEN relrowsecurity THEN 'RLS ENABLED' 
        ELSE 'NO RLS'
      END as rls_status
    FROM pg_class c
    JOIN pg_namespace n ON c.relnamespace = n.oid
    JOIN pg_tables t ON c.relname = t.tablename
    WHERE c.relname = 'companies' AND n.nspname = 'public'
  `;
  console.log('RLS Status:', rlsStatus[0]);
  
  // Clean up any existing test data first
  await prisma.withSystemContext(async (p) => {
    await p.company.deleteMany({
      where: {
        id: { in: [tenant1Id, tenant2Id] }
      }
    });
  });
  
  try {
    // Create companies exactly like in the property test
    await prisma.withSystemContext(async (p) => {
      await p.company.createMany({
        data: [
          {
            id: tenant1Id,
            name: '!$%', // Using exact test data
            slug: '&}t-' + Date.now(),
          },
          {
            id: tenant2Id,
            name: '#EJ5<b', // Using exact test data  
            slug: '(ha\\r1qorngq|}-' + Date.now() + '-2',
          },
        ],
      });
    });
    
    console.log('\\nCreated test companies successfully');
    
    // Test: Query as tenant1 should only see tenant1 data
    console.log('\\nTesting tenant1 query...');
    const tenant1Companies = await prisma.withTenant(tenant1Id, async (p) => {
      // Debug within the transaction
      const contextCheck = await p.$queryRaw`SELECT current_tenant_id() as tenant_id`;
      console.log('Tenant1 context:', contextCheck[0]);
      
      const companies = await p.company.findMany();
      console.log(`Tenant1 sees ${companies.length} companies:`);
      companies.forEach(c => console.log(`- ${c.name} (ID: ${c.id})`));
      
      return companies;
    });
    
    // Test: Query as tenant2 should only see tenant2 data  
    console.log('\\nTesting tenant2 query...');
    const tenant2Companies = await prisma.withTenant(tenant2Id, async (p) => {
      const contextCheck = await p.$queryRaw`SELECT current_tenant_id() as tenant_id`;
      console.log('Tenant2 context:', contextCheck[0]);
      
      const companies = await p.company.findMany();
      console.log(`Tenant2 sees ${companies.length} companies:`);
      companies.forEach(c => console.log(`- ${c.name} (ID: ${c.id})`));
      
      return companies;
    });
    
    // Check results
    console.log('\\n=== RESULTS ===');
    console.log(`Tenant1 companies: ${tenant1Companies.length} (expected: 1)`);
    console.log(`Tenant2 companies: ${tenant2Companies.length} (expected: 1)`);
    
    if (tenant1Companies.length === 1 && tenant2Companies.length === 1) {
      console.log('✅ Multi-tenant isolation is working correctly!');
    } else {
      console.log('❌ Multi-tenant isolation is still failing');
      
      // Let's check what companies exist in total
      const allCompanies = await prisma.withSystemContext(async (p) => {
        return p.company.findMany();
      });
      console.log(`\\nTotal companies in database: ${allCompanies.length}`);
      allCompanies.forEach(c => console.log(`- ${c.name} (ID: ${c.id})`));
    }
    
  } finally {
    // Cleanup
    await prisma.withSystemContext(async (p) => {
      await p.company.deleteMany({
        where: { id: { in: [tenant1Id, tenant2Id] } }
      });
    });
  }
  
  await prisma.onModuleDestroy();
}

debugTestRLS().catch(console.error);