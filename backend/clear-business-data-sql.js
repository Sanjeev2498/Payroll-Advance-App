const { Pool } = require('pg');

// Database connection configuration
const pool = new Pool({
  host: '127.0.0.1',
  port: 5432,
  database: 'payroll_system_dev',
  user: 'payroll_user',
  password: 'payroll_pass_dev_123',
});

async function clearBusinessData() {
  console.log('🧹 Starting complete business data cleanup using direct SQL...');

  const client = await pool.connect();
  
  try {
    // Start a transaction to ensure all operations succeed or fail together
    await client.query('BEGIN');

    console.log('🗑️  Clearing all business operational data...');

    // 1. Clear attendance and time tracking data
    console.log('   📅 Deleting attendance records...');
    const attendanceResult = await client.query('DELETE FROM attendance');
    console.log(`   ✅ Deleted ${attendanceResult.rowCount} attendance records`);

    // 2. Clear payroll data
    console.log('   💰 Deleting payroll records...');
    const payrollItemsResult = await client.query('DELETE FROM payroll_items');
    console.log(`   ✅ Deleted ${payrollItemsResult.rowCount} payroll items`);
    
    const payrollRunsResult = await client.query('DELETE FROM payroll_runs');
    console.log(`   ✅ Deleted ${payrollRunsResult.rowCount} payroll runs`);

    // 3. Clear shifts and schedules
    console.log('   📋 Deleting shifts and schedules...');
    const shiftNotificationsResult = await client.query('DELETE FROM shift_notifications');
    console.log(`   ✅ Deleted ${shiftNotificationsResult.rowCount} shift notifications`);
    
    const shiftsResult = await client.query('DELETE FROM shifts');
    console.log(`   ✅ Deleted ${shiftsResult.rowCount} shifts`);
    
    const shiftTemplatesResult = await client.query('DELETE FROM shift_templates');
    console.log(`   ✅ Deleted ${shiftTemplatesResult.rowCount} shift templates`);

    // 4. Clear assignments (employee-site relationships)
    console.log('   🔗 Deleting site assignments...');
    const assignmentsResult = await client.query('DELETE FROM assignments');
    console.log(`   ✅ Deleted ${assignmentsResult.rowCount} assignments`);

    // 5. Clear employees (this will cascade to related data)
    console.log('   👥 Deleting all employees...');
    const employeesResult = await client.query('DELETE FROM employees');
    console.log(`   ✅ Deleted ${employeesResult.rowCount} employees`);

    // 6. Clear sites
    console.log('   🏢 Deleting all sites...');
    const sitesResult = await client.query('DELETE FROM sites');
    console.log(`   ✅ Deleted ${sitesResult.rowCount} sites`);

    // 7. Clear clients and client users
    console.log('   🤝 Deleting all clients...');
    const clientUsersResult = await client.query('DELETE FROM client_users');
    console.log(`   ✅ Deleted ${clientUsersResult.rowCount} client users`);
    
    const clientsResult = await client.query('DELETE FROM clients');
    console.log(`   ✅ Deleted ${clientsResult.rowCount} clients`);

    // 8. Clear contracts and invoices
    console.log('   📋 Deleting contracts and invoices...');
    const contractsResult = await client.query('DELETE FROM contracts');
    console.log(`   ✅ Deleted ${contractsResult.rowCount} contracts`);
    
    const invoicesResult = await client.query('DELETE FROM invoices');
    console.log(`   ✅ Deleted ${invoicesResult.rowCount} invoices`);

    // 8. Clear any supervisor-related data
    console.log('   👨‍💼 Cleaning supervisor data...');
    console.log('   ℹ️  No separate supervisors table - supervisors are employees with roles');

    // 9. Clear any notification/alert data related to business operations
    console.log('   🔔 Clearing operational notifications...');
    console.log('   ℹ️  Shift notifications already cleared with shifts');

    // 10. Clear any audit logs related to business operations
    console.log('   📝 Clearing business audit logs...');
    try {
      const auditResult = await client.query(`
        DELETE FROM audit_logs 
        WHERE table_name IN ('employees', 'sites', 'clients', 'assignments', 'attendance', 'payroll_items', 'shifts')
      `);
      console.log(`   ✅ Deleted ${auditResult.rowCount} audit log entries`);
    } catch (error) {
      console.log('   ℹ️  No audit_logs table found or error:', error.message);
    }

    // Commit the transaction
    await client.query('COMMIT');
    console.log('\n✅ Business data cleanup completed successfully!');

    // Verify the cleanup
    console.log('\n🔍 Verifying cleanup...');
    
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
      contracts: 'SELECT COUNT(*) FROM contracts',
      invoices: 'SELECT COUNT(*) FROM invoices',
    };

    console.log('📊 Remaining records:');
    for (const [table, query] of Object.entries(verificationQueries)) {
      try {
        const result = await client.query(query);
        console.log(`   ${table}: ${result.rows[0].count} records`);
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

    if (systemDataIntact) {
      console.log('✅ Core system data preserved successfully!');
    } else {
      console.log('⚠️  Warning: Core system data may have been affected!');
    }

    console.log('\n🎯 Database is now ready for fresh business data creation!');
    console.log('   You can now create:');
    console.log('   - Clients');
    console.log('   - Sites');
    console.log('   - Employees');
    console.log('   - Supervisors');
    console.log('   - Site assignments');

  } catch (error) {
    // Rollback the transaction on error
    await client.query('ROLLBACK');
    console.error('❌ Error during business data cleanup:', error);
    console.error('Transaction rolled back.');
    process.exit(1);
  } finally {
    client.release();
  }
}

// Run the cleanup
clearBusinessData()
  .then(() => {
    console.log('\n🏁 Business data cleanup script completed successfully!');
    pool.end();
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Fatal error during cleanup:', error);
    pool.end();
    process.exit(1);
  });