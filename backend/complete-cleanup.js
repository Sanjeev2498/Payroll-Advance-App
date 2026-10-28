const { Pool } = require('pg');

// Database connection configuration
const pool = new Pool({
  host: '127.0.0.1',
  port: 5432,
  database: 'payroll_system_dev',
  user: 'payroll_user',
  password: 'payroll_pass_dev_123',
});

async function completeCleanup() {
  console.log('🧹 Starting COMPLETE business data cleanup (including remaining records)...');

  const client = await pool.connect();
  
  try {
    // Start a transaction to ensure all operations succeed or fail together
    await client.query('BEGIN');

    console.log('🗑️  Clearing ALL business operational data...');

    // Order matters due to foreign key constraints - delete in reverse dependency order

    // 1. Clear attendance and time tracking data first
    console.log('   📅 Deleting attendance records...');
    const attendanceResult = await client.query('DELETE FROM attendance');
    console.log(`   ✅ Deleted ${attendanceResult.rowCount} attendance records`);

    // 2. Clear payroll data
    console.log('   💰 Deleting payroll records...');
    const payrollItemsResult = await client.query('DELETE FROM payroll_items');
    console.log(`   ✅ Deleted ${payrollItemsResult.rowCount} payroll items`);
    
    const payrollRunsResult = await client.query('DELETE FROM payroll_runs');
    console.log(`   ✅ Deleted ${payrollRunsResult.rowCount} payroll runs`);

    // 3. Clear shifts and related data
    console.log('   📋 Deleting shifts and schedules...');
    const shiftNotificationsResult = await client.query('DELETE FROM shift_notifications');
    console.log(`   ✅ Deleted ${shiftNotificationsResult.rowCount} shift notifications`);
    
    const shiftsResult = await client.query('DELETE FROM shifts');
    console.log(`   ✅ Deleted ${shiftsResult.rowCount} shifts`);

    // 4. Clear assignments (employee-site relationships)
    console.log('   🔗 Deleting assignments...');
    const assignmentsResult = await client.query('DELETE FROM assignments');
    console.log(`   ✅ Deleted ${assignmentsResult.rowCount} assignments`);

    // 5. Clear employees (this should cascade properly now)
    console.log('   👥 Deleting ALL employees...');
    const employeesResult = await client.query('DELETE FROM employees');
    console.log(`   ✅ Deleted ${employeesResult.rowCount} employees`);

    // 6. Clear shift templates (after employees are cleared)
    console.log('   📋 Deleting shift templates...');
    const shiftTemplatesResult = await client.query('DELETE FROM shift_templates');
    console.log(`   ✅ Deleted ${shiftTemplatesResult.rowCount} shift templates`);

    // 7. Clear sites (after all references are cleared)
    console.log('   🏢 Deleting ALL sites...');
    const sitesResult = await client.query('DELETE FROM sites');
    console.log(`   ✅ Deleted ${sitesResult.rowCount} sites`);

    // 8. Clear invoices and contracts
    console.log('   📋 Deleting invoices and contracts...');
    const invoicesResult = await client.query('DELETE FROM invoices');
    console.log(`   ✅ Deleted ${invoicesResult.rowCount} invoices`);
    
    const contractsResult = await client.query('DELETE FROM contracts');
    console.log(`   ✅ Deleted ${contractsResult.rowCount} contracts`);

    // 9. Clear client users first, then clients
    console.log('   🤝 Deleting ALL clients and client users...');
    const clientUsersResult = await client.query('DELETE FROM client_users');
    console.log(`   ✅ Deleted ${clientUsersResult.rowCount} client users`);
    
    const clientsResult = await client.query('DELETE FROM clients');
    console.log(`   ✅ Deleted ${clientsResult.rowCount} clients`);

    // Commit the transaction
    await client.query('COMMIT');
    console.log('\n✅ Complete business data cleanup finished successfully!');

    // Final verification
    console.log('\n🔍 Final verification...');
    
    const verificationQueries = {
      employees: 'SELECT COUNT(*) FROM employees',
      sites: 'SELECT COUNT(*) FROM sites',
      clients: 'SELECT COUNT(*) FROM clients',
      client_users: 'SELECT COUNT(*) FROM client_users',
      assignments: 'SELECT COUNT(*) FROM assignments',
      attendance: 'SELECT COUNT(*) FROM attendance',
      payroll_items: 'SELECT COUNT(*) FROM payroll_items',
      payroll_runs: 'SELECT COUNT(*) FROM payroll_runs',
      shifts: 'SELECT COUNT(*) FROM shifts',
      shift_templates: 'SELECT COUNT(*) FROM shift_templates',
      shift_notifications: 'SELECT COUNT(*) FROM shift_notifications',
      contracts: 'SELECT COUNT(*) FROM contracts',
      invoices: 'SELECT COUNT(*) FROM invoices',
    };

    console.log('📊 Final record counts:');
    let allClear = true;
    for (const [table, query] of Object.entries(verificationQueries)) {
      try {
        const result = await client.query(query);
        const count = parseInt(result.rows[0].count);
        console.log(`   ${table}: ${count} records`);
        if (count > 0) allClear = false;
      } catch (error) {
        console.log(`   ${table}: Table not found or error`);
      }
    }

    // Verify that core system data is preserved
    console.log('\n🔒 Verifying core system data is preserved:');
    const systemQueries = {
      users: 'SELECT COUNT(*) FROM users',
      companies: 'SELECT COUNT(*) FROM companies',
    };

    console.log('🛡️  Core system records:');
    let systemDataIntact = true;
    for (const [table, query] of Object.entries(systemQueries)) {
      try {
        const result = await client.query(query);
        const count = parseInt(result.rows[0].count);
        console.log(`   ${table}: ${count} records`);
        if (count === 0) systemDataIntact = false;
      } catch (error) {
        console.log(`   ${table}: Table not found or error`);
        systemDataIntact = false;
      }
    }

    if (allClear) {
      console.log('\n🎉 PERFECT! All business data has been completely cleared!');
    } else {
      console.log('\n⚠️  Some business records remain - may need manual cleanup');
    }

    if (systemDataIntact) {
      console.log('✅ Core system data preserved successfully!');
    } else {
      console.log('⚠️  Warning: Core system data may have been affected!');
    }

    console.log('\n🎯 Database is now completely ready for fresh business data creation!');
    console.log('   You can now create:');
    console.log('   - Clients');
    console.log('   - Sites');
    console.log('   - Employees');
    console.log('   - Supervisors (as employee roles)');
    console.log('   - Site assignments');
    console.log('   - Shifts and schedules');
    console.log('   - Attendance tracking');
    console.log('   - Payroll processing');

  } catch (error) {
    // Rollback the transaction on error
    await client.query('ROLLBACK');
    console.error('❌ Error during complete cleanup:', error);
    console.error('Transaction rolled back.');
    process.exit(1);
  } finally {
    client.release();
  }
}

// Run the cleanup
completeCleanup()
  .then(() => {
    console.log('\n🏁 Complete cleanup script finished successfully!');
    pool.end();
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Fatal error during cleanup:', error);
    pool.end();
    process.exit(1);
  });