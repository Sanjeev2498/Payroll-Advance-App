const { PrismaService } = require('./dist/src/prisma/prisma.service.js');

async function debugPolicies() {
  const prisma = new PrismaService();
  await prisma.onModuleInit();
  
  console.log('Debugging RLS policies in detail...');
  
  // Check all policies on companies table
  console.log('\\nChecking all policies on companies table:');
  try {
    const policies = await prisma.$queryRaw`
      SELECT 
        policyname,
        cmd,
        permissive,
        roles,
        qual
      FROM pg_policies 
      WHERE schemaname = 'public' AND tablename = 'companies'
      ORDER BY policyname
    `;
    
    console.log(`Found ${policies.length} policies:`);
    policies.forEach((policy, i) => {
      console.log(`${i + 1}. ${policy.policyname}:`);
      console.log(`   - Command: ${policy.cmd}`);
      console.log(`   - Permissive: ${policy.permissive}`);
      console.log(`   - Roles: ${policy.roles || 'ALL'}`);
    });
    
  } catch (error) {
    console.log('Could not fetch policies directly, testing conditions manually...');
  }
  
  // Test individual policy conditions
  const testTenantId = '7f98ee4a-5db7-4ac4-8ec1-b880eb42b1c4';
  
  await prisma.withTenant(testTenantId, async (p) => {
    console.log('\\nTesting policy conditions with tenant context set:');
    
    // Test each policy condition individually
    const policyTests = await p.$queryRaw`
      SELECT 
        id,
        name,
        -- Policy 1: company_self_access
        (id = current_tenant_id()) as policy1_match,
        -- Policy 2: system_operations_bypass  
        (current_tenant_id() IS NULL) as policy2_match,
        -- Combined (OR logic)
        ((id = current_tenant_id()) OR (current_tenant_id() IS NULL)) as combined_policy,
        -- Helper function debug
        current_tenant_id() as current_tenant,
        current_setting('app.tenant_id', true) as raw_setting
      FROM companies
      ORDER BY name
    `;
    
    console.log('Policy evaluation results:');
    policyTests.forEach(test => {
      console.log(`\\n${test.name} (${test.id}):`);
      console.log(`  - Policy 1 (id = current_tenant_id()): ${test.policy1_match}`);
      console.log(`  - Policy 2 (current_tenant_id() IS NULL): ${test.policy2_match}`);
      console.log(`  - Combined (OR): ${test.combined_policy}`);
      console.log(`  - Should be visible: ${test.combined_policy ? 'YES' : 'NO'}`);
      console.log(`  - Current tenant: ${test.current_tenant}`);
      console.log(`  - Raw setting: ${test.raw_setting}`);
    });
  });
  
  console.log('\\n=== THE ISSUE ===');
  console.log('The policies are using OR logic:');
  console.log('Policy 1: id = current_tenant_id() -- Only matches tenant\'s own company');
  console.log('Policy 2: current_tenant_id() IS NULL -- Matches when NO tenant context');
  console.log('');
  console.log('Since we have tenant context, Policy 2 should be FALSE.');
  console.log('Only Policy 1 should match, for the tenant\'s own company.');
  console.log('');
  console.log('If all companies are visible, then something else is wrong.');
  
  await prisma.onModuleDestroy();
}

debugPolicies().catch(console.error);