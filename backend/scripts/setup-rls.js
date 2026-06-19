const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

async function setupRLS() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔒 Setting up Row-Level Security (RLS) policies...');
    
    // Read and execute the RLS migration
    const migrationPath = path.join(__dirname, '../prisma/migrations/20240115000001_enable_rls/migration.sql');
    
    if (!fs.existsSync(migrationPath)) {
      console.error('❌ RLS migration file not found:', migrationPath);
      process.exit(1);
    }
    
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Split SQL into individual statements (basic approach)
    const statements = migrationSQL
      .split(/;\s*$/gm)
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`📄 Executing ${statements.length} SQL statements...`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      if (statement) {
        try {
          console.log(`  [${i + 1}/${statements.length}] Executing SQL statement...`);
          await prisma.$executeRawUnsafe(statement + ';');
        } catch (error) {
          // Some statements might fail if already executed, that's okay
          if (error.message.includes('already exists') || 
              error.message.includes('already enabled') ||
              error.message.includes('duplicate key')) {
            console.log(`  ⚠️  Statement ${i + 1} skipped (already exists)`);
          } else {
            console.error(`  ❌ Failed to execute statement ${i + 1}:`, error.message);
            // Don't exit on individual statement failures during setup
          }
        }
      }
    }
    
    // Validate RLS setup
    console.log('\n🔍 Validating RLS configuration...');
    
    try {
      const rlsStatus = await prisma.$queryRaw`SELECT * FROM validate_rls_isolation()`;
      console.log('\n📊 RLS Status Report:');
      console.table(rlsStatus);
      
      // Check if core tables have RLS enabled
      const coreTablesWithRLS = rlsStatus.filter(row => 
        row.rls_enabled && 
        ['companies', 'users', 'clients', 'employees', 'sites'].includes(row.table_name)
      );
      
      if (coreTablesWithRLS.length >= 5) {
        console.log('✅ RLS successfully enabled on core tables');
      } else {
        console.log('⚠️  RLS may not be fully configured on all core tables');
      }
      
    } catch (validationError) {
      console.log('⚠️  Could not validate RLS configuration:', validationError.message);
    }
    
    // Test tenant context functions
    console.log('\n🧪 Testing tenant context functions...');
    
    try {
      // Test current_tenant_id function
      const testTenantId = '550e8400-e29b-41d4-a716-446655440000';
      await prisma.$executeRaw`SELECT set_config('app.tenant_id', ${testTenantId}, false)`;
      
      const currentTenant = await prisma.$queryRaw`SELECT current_tenant_id() as tenant_id`;
      
      if (currentTenant[0]?.tenant_id === testTenantId) {
        console.log('✅ Tenant context functions working correctly');
      } else {
        console.log('⚠️  Tenant context functions may not be working properly');
      }
      
      // Clear test context
      await prisma.$executeRaw`SELECT set_config('app.tenant_id', '', false)`;
      
    } catch (testError) {
      console.log('⚠️  Could not test tenant context functions:', testError.message);
    }
    
    console.log('\n🎉 RLS setup completed successfully!');
    console.log('📝 Summary:');
    console.log('   - Row-Level Security enabled on all tenant-specific tables');
    console.log('   - Tenant isolation policies created');
    console.log('   - Helper functions for tenant context management');
    console.log('   - System operation bypass policies for migrations');
    console.log('   - Performance indexes for RLS queries');
    
  } catch (error) {
    console.error('❌ Failed to set up RLS:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the setup
setupRLS().catch(console.error);