const { Client } = require('pg');

async function verifyUserData() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://payroll_user:payroll_pass_dev_123@127.0.0.1:5432/payroll_system_dev'
  });

  try {
    await client.connect();
    console.log('🔍 VERIFYING REMAINING DATA\n');
    
    // Check companies
    const companies = await client.query('SELECT name, slug FROM companies');
    console.log('🏢 COMPANIES:');
    companies.rows.forEach(row => {
      console.log(`   ✅ ${row.name} (${row.slug})`);
    });
    
    // Check users  
    const users = await client.query('SELECT email, role FROM users');
    console.log('\n👤 USERS FOR LOGIN:');
    users.rows.forEach(row => {
      console.log(`   ✅ ${row.email} (${row.role}) - password: admin123`);
    });
    
    // Check cleared tables
    const clearTables = ['clients', 'sites', 'employees', 'assignments', 'shifts'];
    console.log('\n🗑️ CLEARED TABLES:');
    for (const table of clearTables) {
      const result = await client.query(`SELECT COUNT(*) as count FROM ${table}`);
      console.log(`   ✅ ${table}: ${result.rows[0].count} records`);
    }
    
    console.log('\n🎯 READY FOR MANUAL DATA ENTRY');
    console.log('🌐 Login at: http://localhost:3000');

  } catch (error) {
    console.error('❌ Verification failed:', error);
  } finally {
    await client.end();
  }
}

verifyUserData();