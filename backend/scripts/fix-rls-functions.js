const { PrismaClient } = require('@prisma/client');

async function createRLSFunctions() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔧 Creating RLS helper functions...');
    
    // Create current_tenant_id function
    console.log('  📝 Creating current_tenant_id() function...');
    await prisma.$executeRawUnsafe(`
      CREATE OR REPLACE FUNCTION current_tenant_id()
      RETURNS UUID AS $$
      BEGIN
          RETURN current_setting('app.tenant_id', true)::uuid;
      EXCEPTION
          WHEN OTHERS THEN
              RETURN NULL;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
    `);
    
    // Create is_tenant_admin function  
    console.log('  📝 Creating is_tenant_admin() function...');
    await prisma.$executeRawUnsafe(`
      CREATE OR REPLACE FUNCTION is_tenant_admin()
      RETURNS BOOLEAN AS $$
      BEGIN
          RETURN current_setting('app.user_role', true) IN ('SUPER_ADMIN', 'COMPANY_ADMIN');
      EXCEPTION
          WHEN OTHERS THEN
              RETURN false;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
    `);
    
    // Create validation function
    console.log('  📝 Creating validate_rls_isolation() function...');
    await prisma.$executeRawUnsafe(`
      CREATE OR REPLACE FUNCTION validate_rls_isolation()
      RETURNS TABLE(table_name TEXT, policy_count INTEGER, rls_enabled BOOLEAN) AS $$
      SELECT 
          t.schemaname::TEXT || '.' || t.tablename::TEXT as table_name,
          COUNT(pol.policyname)::INTEGER as policy_count,
          relrowsecurity as rls_enabled
      FROM pg_tables t
      LEFT JOIN pg_policies pol ON pol.schemaname = t.schemaname AND pol.tablename = t.tablename
      LEFT JOIN pg_class c ON c.relname = t.tablename
      WHERE t.schemaname = 'public' 
        AND t.tablename NOT LIKE 'pg_%'
        AND t.tablename NOT LIKE '_prisma_%'
      GROUP BY t.schemaname, t.tablename, c.relrowsecurity
      ORDER BY t.tablename;
      $$ LANGUAGE sql SECURITY DEFINER;
    `);
    
    // Grant permissions
    console.log('  🔑 Granting permissions...');
    await prisma.$executeRawUnsafe(`GRANT EXECUTE ON FUNCTION current_tenant_id() TO payroll_user;`);
    await prisma.$executeRawUnsafe(`GRANT EXECUTE ON FUNCTION is_tenant_admin() TO payroll_user;`);
    await prisma.$executeRawUnsafe(`GRANT EXECUTE ON FUNCTION validate_rls_isolation() TO payroll_user;`);
    
    // Test the functions
    console.log('  🧪 Testing functions...');
    
    // Test current_tenant_id
    const testTenantId = '550e8400-e29b-41d4-a716-446655440000';
    await prisma.$executeRaw`SELECT set_config('app.tenant_id', ${testTenantId}, false)`;
    
    const currentTenant = await prisma.$queryRaw`SELECT current_tenant_id() as tenant_id`;
    if (currentTenant[0]?.tenant_id === testTenantId) {
      console.log('  ✅ current_tenant_id() working correctly');
    } else {
      console.log('  ❌ current_tenant_id() not working properly');
    }
    
    // Test validation function
    const rlsStatus = await prisma.$queryRaw`SELECT * FROM validate_rls_isolation()`;
    console.log('  ✅ validate_rls_isolation() working correctly');
    console.log(`  📊 Found ${rlsStatus.length} tables in validation`);
    
    // Clear test context
    await prisma.$executeRaw`SELECT set_config('app.tenant_id', '', false)`;
    
    console.log('✅ RLS helper functions created successfully!');
    
  } catch (error) {
    console.error('❌ Failed to create RLS functions:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the function creation
createRLSFunctions().catch(console.error);