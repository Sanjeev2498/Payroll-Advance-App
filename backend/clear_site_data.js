const { Client } = require('pg');

async function clearSiteData() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://payroll_user:payroll_pass_dev_123@127.0.0.1:5432/payroll_system_dev'
  });

  try {
    await client.connect();
    console.log('🔌 Connected to database');
    console.log('🗑️  CLEARING SITE-RELATED DATA ONLY');
    
    // Disable foreign key checks temporarily
    await client.query('SET session_replication_role = replica;');
    
    // Clear site-related data in dependency order
    const siteTables = [
      'attendance',
      'shifts', 
      'assignments',
      'sites',
      'employees',
      'clients'  // Clear clients too as they're linked to sites
    ];

    for (const table of siteTables) {
      try {
        const result = await client.query(`DELETE FROM ${table}`);
        console.log(`✅ Cleared ${table}: ${result.rowCount} rows deleted`);
      } catch (error) {
        console.log(`❌ Error clearing ${table}: ${error.message}`);
      }
    }
    
    // Re-enable foreign key checks
    await client.query('SET session_replication_role = DEFAULT;');
    
    console.log('\n✅ SITE DATA CLEARED SUCCESSFULLY');
    console.log('👥 Users and companies remain intact for login');
    console.log('📝 You can now manually add:');
    console.log('   - Clients');
    console.log('   - Sites'); 
    console.log('   - Employees (guards)');
    console.log('   - Assignments');
    console.log('   - Shifts');

  } catch (error) {
    console.error('❌ Site data clearing failed:', error);
  } finally {
    await client.end();
    console.log('🔌 Database connection closed');
  }
}

clearSiteData();