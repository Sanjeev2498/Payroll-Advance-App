const { Pool } = require('pg');

async function checkColumns() {
  // Use the test database URL like the tests do
  const testDatabaseUrl = 'postgresql://payroll_user:payroll_pass_dev_123@localhost:5432/payroll_test?schema=public';
  
  const pool = new Pool({
    connectionString: testDatabaseUrl,
  });

  try {
    console.log('Checking TEST database schema...');
    console.log('Database:', testDatabaseUrl);
    
    // Check clients table columns
    const clientsResult = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'clients' AND table_schema = 'public'
      ORDER BY ordinal_position;
    `);
    
    console.log('Clients table columns in TEST database:');
    if (clientsResult.rows.length === 0) {
      console.log('  ❌ NO CLIENTS TABLE FOUND IN TEST DATABASE');
    } else {
      clientsResult.rows.forEach(col => {
        console.log(`  ${col.column_name} (${col.data_type}) - nullable: ${col.is_nullable}, default: ${col.column_default}`);
      });
    }

    // Check what tables exist
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);
    
    console.log('\nAll tables in TEST database:');
    tablesResult.rows.forEach(table => {
      console.log(`  ${table.table_name}`);
    });

  } catch (error) {
    console.error('Error checking columns:', error);
  } finally {
    await pool.end();
  }
}

checkColumns();