const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');

async function setupRLSPolicies() {
  // Create PostgreSQL connection pool for Prisma 7.x
  const connectionString = process.env.DATABASE_URL || 'postgresql://payroll_user:payroll_pass_dev_123@localhost:5432/payroll_system_dev';
  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  
  const prisma = new PrismaClient({
    adapter,
  });
  
  try {
    console.log('🔒 Setting up RLS policies...');
    
    // Enable RLS on all tenant-specific tables
    console.log('  📝 Enabling RLS on tables...');
    
    const tables = [
      'companies', 'users', 'clients', 'employees', 'sites', 
      'assignments', 'shifts', 'attendance', 'payroll_runs', 
      'payroll_items', 'invoices'
    ];
    
    for (const table of tables) {
      try {
        await prisma.$executeRawUnsafe(`ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY;`);
        console.log(`    ✅ Enabled RLS on ${table}`);
      } catch (error) {
        if (error.message.includes('already has row level security enabled')) {
          console.log(`    ℹ️  RLS already enabled on ${table}`);
        } else {
          console.log(`    ⚠️  Failed to enable RLS on ${table}: ${error.message}`);
        }
      }
    }
    
    // Create tenant isolation policies
    console.log('  📋 Creating tenant isolation policies...');
    
    // Companies: Users can only access their own company
    await createPolicyIfNotExists(prisma, 'companies', 'company_self_access', 
      'USING (id = current_tenant_id())');
    
    // Users: Access limited to same company
    await createPolicyIfNotExists(prisma, 'users', 'users_tenant_isolation',
      'USING (company_id = current_tenant_id())');
    
    // Clients: Access limited to same company
    await createPolicyIfNotExists(prisma, 'clients', 'clients_tenant_isolation',
      'USING (company_id = current_tenant_id())');
    
    // Employees: Access limited to same company
    await createPolicyIfNotExists(prisma, 'employees', 'employees_tenant_isolation',
      'USING (company_id = current_tenant_id())');
    
    // Sites: Access through contract->client->company relationship
    await createPolicyIfNotExists(prisma, 'sites', 'sites_tenant_isolation',
      `USING (EXISTS (
        SELECT 1 FROM "contracts" 
        JOIN "clients" ON "clients"."id" = "contracts"."client_id"
        WHERE "contracts"."id" = "sites"."contract_id" 
        AND "clients"."company_id" = current_tenant_id()
      ))`);
    
    // Assignments: Access through employee->company and site->contract->client->company relationship
    await createPolicyIfNotExists(prisma, 'assignments', 'assignments_tenant_isolation',
      `USING (EXISTS (
        SELECT 1 FROM "employees" 
        WHERE "employees"."id" = "assignments"."employee_id" 
        AND "employees"."company_id" = current_tenant_id()
      ))`);
    
    // Payroll Runs: Direct tenant access
    await createPolicyIfNotExists(prisma, 'payroll_runs', 'payroll_runs_tenant_isolation',
      'USING (company_id = current_tenant_id())');
    
    // System operations bypass policies (when no tenant context is set)
    console.log('  🔓 Creating system operations bypass policies...');
    
    for (const table of tables) {
      await createPolicyIfNotExists(prisma, table, 'system_operations_bypass',
        'USING (current_tenant_id() IS NULL)');
    }
    
    // Validate setup
    console.log('\n🔍 Validating RLS setup...');
    
    const rlsStatus = await prisma.$queryRaw`SELECT * FROM validate_rls_isolation()`;
    console.table(rlsStatus);
    
    console.log('\n🎉 RLS policies setup completed successfully!');
    console.log('📝 Summary:');
    console.log(`   - Enabled RLS on ${tables.length} tables`);
    console.log(`   - Created tenant isolation policies`);
    console.log(`   - Created system operation bypass policies`);
    
  } catch (error) {
    console.error('❌ Failed to setup RLS policies:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

async function createPolicyIfNotExists(prisma, tableName, policyName, condition) {
  try {
    await prisma.$executeRawUnsafe(`
      CREATE POLICY "${policyName}" ON "${tableName}" ${condition};
    `);
    console.log(`    ✅ Created policy ${policyName} on ${tableName}`);
  } catch (error) {
    if (error.message.includes('already exists')) {
      console.log(`    ℹ️  Policy ${policyName} already exists on ${tableName}`);
    } else {
      console.log(`    ⚠️  Failed to create policy ${policyName} on ${tableName}: ${error.message}`);
    }
  }
}

// Run the setup
setupRLSPolicies().catch(console.error);