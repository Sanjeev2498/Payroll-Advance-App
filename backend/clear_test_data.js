const { Client } = require('pg');

async function clearTestData() {
  const client = new Client({
    connectionString: process.env.DATABASE_TEST_URL || 'postgresql://payroll_user:payroll_pass_dev_123@127.0.0.1:5432/payroll_system_test'
  });

  try {
    await client.connect();
    console.log('🔌 Connected to TEST database');
    
    await client.query('SET session_replication_role = replica;');
    
    const tables = [
      'attendance_records', 'payroll_runs', 'payroll_entries',
      'assignments', 'invoices', 'invoice_line_items', 'shift_schedules',
      'shifts', 'employees', 'sites', 'clients', 'users', 'companies'
    ];

    for (const table of tables) {
      try {
        const result = await client.query(`DELETE FROM ${table}`);
        console.log(`✅ Cleared ${table}: ${result.rowCount} rows deleted`);
      } catch (error) {
        if (error.code !== '42P01') {
          console.log(`❌ Error clearing ${table}: ${error.message}`);
        }
      }
    }

    await client.query('SET session_replication_role = DEFAULT;');
    console.log('✅ TEST DATABASE CLEARED');

  } catch (error) {
    console.error('❌ Test data cleanup failed:', error);
  } finally {
    await client.end();
  }
}

clearTestData();