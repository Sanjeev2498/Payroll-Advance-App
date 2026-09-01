const { Client } = require('pg');

async function checkActualTables() {
  const client = new Client({
    host: '127.0.0.1',
    port: 5432,
    database: 'payroll_system_dev',
    user: 'payroll_user',
    password: 'payroll_pass_dev_123'
  });

  try {
    await client.connect();
    
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    
    console.log('=== ACTUAL TABLES IN DATABASE ===');
    result.rows.forEach(row => console.log('  ✓', row.table_name));
    console.log(`\nTotal tables: ${result.rows.length}`);
    
    // Check for missing critical tables
    const criticalTables = ['companies', 'employees', 'clients', 'contracts', 'sites', 'assignments', 'attendance', 'shifts'];
    const existingTables = result.rows.map(row => row.table_name);
    const missingTables = criticalTables.filter(table => !existingTables.includes(table));
    
    if (missingTables.length > 0) {
      console.log('\n=== MISSING CRITICAL TABLES ===');
      missingTables.forEach(table => console.log('  ❌', table));
    }
    
  } catch (error) {
    console.error('Database connection error:', error.message);
  } finally {
    await client.end();
  }
}

checkActualTables();