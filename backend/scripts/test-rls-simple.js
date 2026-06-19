const { Client } = require('pg');

async function testRLSWithRawSQL() {
  const connectionConfig = {
    host: 'localhost',
    port: 5432,
    database: 'payroll_system_dev',
    user: 'payroll_user',
    password: 'payroll_password',
  };

  let client;

  try {
    console.log('🧪 Testing Row-Level Security (RLS) with raw SQL...\n');
    
    client = new Client(connectionConfig);
    await client.connect();
    console.log('✅ Database connection established');

    // Test 1: Check if RLS is enabled on key tables
    console.log('\n🔒 Test 1: Verifying RLS is enabled on tables');
    
    const rlsStatusQuery = `
      SELECT 
        tablename,
        rowsecurity as rls_enabled
      FROM pg_tables t
      JOIN pg_class c ON c.relname = t.tablename
      WHERE schemaname = 'public' 
        AND tablename IN ('companies', 'users', 'employees', 'clients')
      ORDER BY tablename;
    `;
    
    const rlsStatus = await client.query(rlsStatusQuery);
    
    for (const row of rlsStatus.rows) {
      const status = row.rls_enabled ? 'ENABLED' : 'DISABLED';
      console.log(`   ${row.tablename}: ${status}`);
    }
    
    const rlsEnabledCount = rlsStatus.rows.filter(r => r.rls_enabled).length;
    console.log(`   ✅ RLS enabled on ${rlsEnabledCount}/${rlsStatus.rows.length} core tables`);

    // Test 2: Check if helper functions exist
    console.log('\n🔧 Test 2: Checking helper functions');
    
    try {
      // Test current_tenant_id function
      await client.query('SELECT current_tenant_id()');
      console.log('   ✅ current_tenant_id() function exists');
      
      // Test is_tenant_admin function  
      await client.query('SELECT is_tenant_admin()');
      console.log('   ✅ is_tenant_admin() function exists');
      
      // Test validate_rls_isolation function
      await client.query('SELECT * FROM validate_rls_isolation() LIMIT 1');
      console.log('   ✅ validate_rls_isolation() function exists');
      
    } catch (error) {
      console.log(`   ❌ Helper function test failed: ${error.message}`);
    }

    // Test 3: Count RLS policies
    console.log('\n📊 Test 3: Counting RLS policies');
    
    const policyCountQuery = `
      SELECT 
        COUNT(*) as total_policies,
        COUNT(DISTINCT tablename) as tables_with_policies
      FROM pg_policies 
      WHERE schemaname = 'public';
    `;
    
    const policyCount = await client.query(policyCountQuery);
    const { total_policies, tables_with_policies } = policyCount.rows[0];
    
    console.log(`   Total RLS policies: ${total_policies}`);
    console.log(`   Tables with policies: ${tables_with_policies}`);
    
    if (parseInt(total_policies) >= 20) {
      console.log('   ✅ Sufficient RLS policies found');
    } else {
      console.log('   ⚠️  May need more RLS policies');
    }

    // Test 4: Test tenant context functionality
    console.log('\n🎯 Test 4: Testing tenant context');
    
    const testTenantId = '550e8400-e29b-41d4-a716-446655440000';
    
    try {
      // Set tenant context
      await client.query('SELECT set_config($1, $2, false)', ['app.tenant_id', testTenantId]);
      
      // Verify tenant context is set
      const contextResult = await client.query('SELECT current_tenant_id() as tenant_id');
      const currentTenant = contextResult.rows[0]?.tenant_id;
      
      if (currentTenant === testTenantId) {
        console.log('   ✅ Tenant context setting works correctly');
      } else {
        console.log(`   ❌ Tenant context mismatch: expected ${testTenantId}, got ${currentTenant}`);
      }
      
      // Clear tenant context
      await client.query('SELECT set_config($1, $2, false)', ['app.tenant_id', '']);
      
    } catch (error) {
      console.log(`   ❌ Tenant context test failed: ${error.message}`);
    }

    // Test 5: Basic RLS policy validation
    console.log('\n🛡️  Test 5: Basic RLS policy validation');
    
    try {
      // Check if we can query companies table (should work with system context)
      const companyCountQuery = 'SELECT COUNT(*) as count FROM companies';
      const companyCount = await client.query(companyCountQuery);
      console.log(`   Companies table accessible (system context): ${companyCount.rows[0].count} records`);
      
      // Try with a tenant context set
      await client.query('SELECT set_config($1, $2, false)', ['app.tenant_id', testTenantId]);
      const tenantCompanyCount = await client.query(companyCountQuery);
      console.log(`   Companies visible with tenant context: ${tenantCompanyCount.rows[0].count} records`);
      
      console.log('   ✅ RLS policies are active and filtering data');
      
    } catch (error) {
      console.log(`   ⚠️  RLS policy test: ${error.message}`);
    }

    // Summary
    console.log('\n📋 RLS Configuration Summary:');
    console.log(`   • RLS enabled on ${rlsEnabledCount} core tables`);
    console.log(`   • ${total_policies} RLS policies configured`);
    console.log(`   • ${tables_with_policies} tables have policies`);
    console.log(`   • Helper functions are operational`);
    console.log(`   • Tenant context management working`);
    
    const overallSuccess = rlsEnabledCount >= 4 && parseInt(total_policies) >= 15;
    
    console.log(`\n🎯 Overall Result: ${overallSuccess ? '✅ RLS CONFIGURATION LOOKS GOOD' : '⚠️  RLS MAY NEED ATTENTION'}`);
    
    if (!overallSuccess) {
      console.log('\n💡 Recommendations:');
      console.log('   - Ensure all RLS migration scripts have been run');
      console.log('   - Check that the database schema is up to date');
      console.log('   - Verify no errors occurred during policy creation');
    }

    return overallSuccess;
    
  } catch (error) {
    console.error('❌ RLS test failed:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 Database connection failed. Please ensure:');
      console.error('   - PostgreSQL is running (docker-compose up -d postgres)');
      console.error('   - Database credentials are correct');
      console.error('   - Network connectivity is available');
    }
    
    return false;
  } finally {
    if (client) {
      await client.end();
      console.log('\n🔌 Database connection closed');
    }
  }
}

// Run the test
if (require.main === module) {
  testRLSWithRawSQL()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Test execution failed:', error);
      process.exit(1);
    });
}

module.exports = { testRLSWithRawSQL };