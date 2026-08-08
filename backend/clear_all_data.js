const { Client } = require('pg');

async function clearAllData() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://payroll_user:payroll_pass_dev_123@127.0.0.1:5432/payroll_system_dev'
  });

  try {
    await client.connect();
    console.log('🔌 Connected to database');
    console.log('⚠️  WARNING: This will DELETE ALL DATA');
    console.log('🚀 Starting data cleanup...\n');

    // Disable foreign key checks temporarily
    await client.query('SET session_replication_role = replica;');
    
    // Clear data in reverse dependency order
    const tables = [
      'attendance_records',
      'payroll_runs', 
      'payroll_entries',
      'assignments',
      'invoices',
      'invoice_line_items',
      'shift_schedules',
      'shifts',
      'employees',
      'sites', 
      'clients',
      'users',
      'companies'
    ];

    for (const table of tables) {
      try {
        const result = await client.query(`DELETE FROM ${table}`);
        console.log(`✅ Cleared ${table}: ${result.rowCount} rows deleted`);
      } catch (error) {
        if (error.code === '42P01') {
          console.log(`⚠️  Table ${table} does not exist`);
        } else {
          console.log(`❌ Error clearing ${table}: ${error.message}`);
        }
      }
    }

    // Re-enable foreign key checks
    await client.query('SET session_replication_role = DEFAULT;');

    // Reset sequences
    console.log('\n🔄 Resetting sequences...');
    const sequenceQueries = [
      "SELECT setval('companies_id_seq', 1, false)",
      "SELECT setval('users_id_seq', 1, false)", 
      "SELECT setval('clients_id_seq', 1, false)",
      "SELECT setval('employees_id_seq', 1, false)",
      "SELECT setval('sites_id_seq', 1, false)",
      "SELECT setval('assignments_id_seq', 1, false)",
      "SELECT setval('shifts_id_seq', 1, false)",
      "SELECT setval('attendance_records_id_seq', 1, false)",
      "SELECT setval('payroll_runs_id_seq', 1, false)",
      "SELECT setval('payroll_entries_id_seq', 1, false)",
      "SELECT setval('invoices_id_seq', 1, false)",
      "SELECT setval('invoice_line_items_id_seq', 1, false)"
    ];

    for (const query of sequenceQueries) {
      try {
        await client.query(query);
        console.log(`✅ Reset sequence: ${query.split("'")[1]}`);
      } catch (error) {
        console.log(`⚠️  Sequence reset failed: ${query} - ${error.message}`);
      }
    }

    console.log('\n✅ DATA CLEANUP COMPLETED SUCCESSFULLY');
    console.log('📝 All user data has been cleared');
    console.log('🎯 System is ready for fresh data entry');
    console.log('💡 You can now manually add companies, users, clients, and employees');

  } catch (error) {
    console.error('❌ Data cleanup failed:', error);
  } finally {
    await client.end();
    console.log('🔌 Database connection closed');
  }
}

clearAllData();