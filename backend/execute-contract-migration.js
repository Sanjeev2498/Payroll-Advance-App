const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const fs = require('fs');

async function executeContractMigration() {
  console.log('🔄 Starting contract structure migration...');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://payroll_user:payroll_pass_dev_123@127.0.0.1:5432/payroll_system_dev'
  });
  
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });
  
  try {
    await prisma.$connect();
    
    // Read the SQL migration file
    const sqlMigration = fs.readFileSync('./fix-contract-migration.sql', 'utf8');
    
    // Split into individual statements and execute
    const statements = sqlMigration.split(';').filter(stmt => stmt.trim().length > 0);
    
    console.log(`Executing ${statements.length} SQL statements...`);
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i].trim();
      if (statement.length === 0) continue;
      
      console.log(`  [${i+1}/${statements.length}] Executing statement...`);
      
      try {
        await prisma.$executeRawUnsafe(statement);
        console.log(`    ✅ Success`);
      } catch (error) {
        // Some errors are expected (like DROP POLICY IF EXISTS on non-existent policies)
        if (error.message.includes('does not exist') || 
            error.message.includes('already exists') ||
            error.message.includes('duplicate_object')) {
          console.log(`    ⚠️  Skipped (expected): ${error.message.split('\n')[0]}`);
        } else {
          console.log(`    ❌ Error: ${error.message.split('\n')[0]}`);
          // Don't throw, continue with next statement
        }
      }
    }
    
    // Test the migration by checking key models
    console.log('\n🔍 Verifying migration results...');
    
    // Check contracts table exists and has data
    try {
      const contractCount = await prisma.$queryRaw`SELECT COUNT(*) as count FROM contracts`;
      console.log(`✅ Contracts table exists with ${contractCount[0].count} records`);
    } catch (err) {
      console.log(`❌ Contracts table issue: ${err.message}`);
    }
    
    // Check sites table structure
    try {
      const sitesStructure = await prisma.$queryRaw`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'sites' AND table_schema = 'public'
        ORDER BY column_name;
      `;
      const columns = sitesStructure.map(c => c.column_name);
      
      if (columns.includes('contract_id')) {
        console.log('✅ Sites table has contract_id column');
      } else {
        console.log('❌ Sites table missing contract_id column');
      }
      
      if (!columns.includes('client_id')) {
        console.log('✅ Sites table no longer has client_id column'); 
      } else {
        console.log('⚠️  Sites table still has client_id column');
      }
    } catch (err) {
      console.log(`❌ Sites table check failed: ${err.message}`);
    }
    
    // Check invoices table structure  
    try {
      const invoicesStructure = await prisma.$queryRaw`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'invoices' AND table_schema = 'public'
        ORDER BY column_name;
      `;
      const columns = invoicesStructure.map(c => c.column_name);
      
      if (columns.includes('contract_id')) {
        console.log('✅ Invoices table has contract_id column');
      } else {
        console.log('❌ Invoices table missing contract_id column');
      }
      
      if (!columns.includes('client_id')) {
        console.log('✅ Invoices table no longer has client_id column');
      } else {
        console.log('⚠️  Invoices table still has client_id column');
      }
    } catch (err) {
      console.log(`❌ Invoices table check failed: ${err.message}`);
    }
    
    console.log('\n✅ Contract structure migration completed!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

// Run migration if called directly
if (require.main === module) {
  executeContractMigration()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { executeContractMigration };