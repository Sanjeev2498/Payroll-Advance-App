const { PrismaClient } = require('@prisma/client');

async function setupDatabase() {
  console.log('🚀 Setting up database with Row-Level Security...');
  
  const prisma = new PrismaClient();
  
  try {
    // Enable necessary PostgreSQL extensions
    console.log('📦 Enabling PostgreSQL extensions...');
    await prisma.$executeRaw`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`;
    await prisma.$executeRaw`CREATE EXTENSION IF NOT EXISTS "pg_trgm";`;
    
    // Enable RLS on tenant-specific tables
    console.log('🔒 Enabling Row Level Security...');
    
    const tenantTables = [
      'clients',
      'employees', 
      'payroll_runs'
    ];
    
    for (const table of tenantTables) {
      await prisma.$executeRawUnsafe(`ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY;`);
    }
    
    // Create RLS policies for tenant isolation
    console.log('📋 Creating RLS policies...');
    
    // Direct tenant tables (have company_id)
    for (const table of tenantTables) {
      const policyName = `${table}_tenant_isolation`;
      await prisma.$executeRawUnsafe(`
        DROP POLICY IF EXISTS "${policyName}" ON "${table}";
      `);
      await prisma.$executeRawUnsafe(`
        CREATE POLICY "${policyName}" ON "${table}"
        USING (company_id = current_setting('app.tenant_id')::uuid);
      `);
    }
    
    // Sites table - accessed through client relationship
    await prisma.$executeRaw`ALTER TABLE "sites" ENABLE ROW LEVEL SECURITY;`;
    await prisma.$executeRaw`
      DROP POLICY IF EXISTS "sites_tenant_isolation" ON "sites";
    `;
    await prisma.$executeRaw`
      CREATE POLICY "sites_tenant_isolation" ON "sites"
      USING (EXISTS (
        SELECT 1 FROM clients 
        WHERE clients.id = sites.client_id 
        AND clients.company_id = current_setting('app.tenant_id')::uuid
      ));
    `;
    
    // Assignments table - accessed through employee relationship
    await prisma.$executeRaw`ALTER TABLE "assignments" ENABLE ROW LEVEL SECURITY;`;
    await prisma.$executeRaw`
      DROP POLICY IF EXISTS "assignments_tenant_isolation" ON "assignments";
    `;
    await prisma.$executeRaw`
      CREATE POLICY "assignments_tenant_isolation" ON "assignments"
      USING (EXISTS (
        SELECT 1 FROM employees 
        WHERE employees.id = assignments.employee_id 
        AND employees.company_id = current_setting('app.tenant_id')::uuid
      ));
    `;
    
    // Shifts table - accessed through assignment relationship
    await prisma.$executeRaw`ALTER TABLE "shifts" ENABLE ROW LEVEL SECURITY;`;
    await prisma.$executeRaw`
      DROP POLICY IF EXISTS "shifts_tenant_isolation" ON "shifts";
    `;
    await prisma.$executeRaw`
      CREATE POLICY "shifts_tenant_isolation" ON "shifts"
      USING (EXISTS (
        SELECT 1 FROM assignments a
        JOIN employees e ON e.id = a.employee_id
        WHERE a.id = shifts.assignment_id 
        AND e.company_id = current_setting('app.tenant_id')::uuid
      ));
    `;
    
    // Attendance table - accessed through employee relationship
    await prisma.$executeRaw`ALTER TABLE "attendance" ENABLE ROW LEVEL SECURITY;`;
    await prisma.$executeRaw`
      DROP POLICY IF EXISTS "attendance_tenant_isolation" ON "attendance";
    `;
    await prisma.$executeRaw`
      CREATE POLICY "attendance_tenant_isolation" ON "attendance"
      USING (EXISTS (
        SELECT 1 FROM employees 
        WHERE employees.id = attendance.employee_id 
        AND employees.company_id = current_setting('app.tenant_id')::uuid
      ));
    `;
    
    // Payroll items table - accessed through payroll run relationship  
    await prisma.$executeRaw`ALTER TABLE "payroll_items" ENABLE ROW LEVEL SECURITY;`;
    await prisma.$executeRaw`
      DROP POLICY IF EXISTS "payroll_items_tenant_isolation" ON "payroll_items";
    `;
    await prisma.$executeRaw`
      CREATE POLICY "payroll_items_tenant_isolation" ON "payroll_items"
      USING (EXISTS (
        SELECT 1 FROM payroll_runs pr
        WHERE pr.id = payroll_items.payroll_run_id 
        AND pr.company_id = current_setting('app.tenant_id')::uuid
      ));
    `;
    
    // Invoices table - accessed through client relationship
    await prisma.$executeRaw`ALTER TABLE "invoices" ENABLE ROW LEVEL SECURITY;`;
    await prisma.$executeRaw`
      DROP POLICY IF EXISTS "invoices_tenant_isolation" ON "invoices";
    `;
    await prisma.$executeRaw`
      CREATE POLICY "invoices_tenant_isolation" ON "invoices"
      USING (EXISTS (
        SELECT 1 FROM clients 
        WHERE clients.id = invoices.client_id 
        AND clients.company_id = current_setting('app.tenant_id')::uuid
      ));
    `;
    
    // Users table - tenant isolation
    await prisma.$executeRaw`ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;`;
    await prisma.$executeRaw`
      DROP POLICY IF EXISTS "users_tenant_isolation" ON "users";
    `;
    await prisma.$executeRaw`
      CREATE POLICY "users_tenant_isolation" ON "users"
      USING (company_id = current_setting('app.tenant_id')::uuid);
    `;
    
    console.log('✅ Database setup completed successfully!');
    console.log('🔐 Row-Level Security policies are now active');
    console.log('📊 Ready to run: npm run prisma:generate');
    
  } catch (error) {
    console.error('❌ Database setup failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run setup if called directly
if (require.main === module) {
  setupDatabase()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { setupDatabase };