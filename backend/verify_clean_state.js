const { Client } = require('pg');

async function verifyCleanState() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://payroll_user:payroll_pass_dev_123@127.0.0.1:5432/payroll_system_dev'
  });

  try {
    await client.connect();
    console.log('🔍 VERIFYING CLEAN DATABASE STATE\n');
    
    const tables = ['companies', 'users', 'clients', 'employees', 'sites', 'assignments', 'shifts', 'payroll_runs', 'invoices'];
    
    for (const table of tables) {
      try {
        const result = await client.query(`SELECT COUNT(*) as count FROM ${table}`);
        const count = parseInt(result.rows[0].count);
        console.log(`${count === 0 ? '✅' : '❌'} ${table}: ${count} records`);
      } catch (error) {
        if (error.code === '42P01') {
          console.log(`⚠️  ${table}: table does not exist`);
        } else {
          console.log(`❌ ${table}: error - ${error.message}`);
        }
      }
    }

    console.log('\n🎯 DATABASE IS READY FOR MANUAL DATA ENTRY');
    console.log('📋 You can now add:');
    console.log('   1. Company registration');
    console.log('   2. Admin users'); 
    console.log('   3. Supervisors');
    console.log('   4. Clients');
    console.log('   5. Security guards (employees)');
    console.log('   6. Sites and assignments');

  } catch (error) {
    console.error('❌ Verification failed:', error);
  } finally {
    await client.end();
  }
}

verifyCleanState();