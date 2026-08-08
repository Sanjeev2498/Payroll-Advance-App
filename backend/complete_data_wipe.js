const { Client } = require('pg');

async function completeDataWipe() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://payroll_user:payroll_pass_dev_123@127.0.0.1:5432/payroll_system_dev'
  });

  try {
    await client.connect();
    console.log('🔌 Connected to database');
    console.log('⚠️  COMPLETE DATA WIPE - DELETING EVERYTHING');
    
    // Disable foreign key checks
    await client.query('SET session_replication_role = replica;');
    
    // Get all tables
    const tablesResult = await client.query(`
      SELECT tablename FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename NOT LIKE 'pg_%' 
      AND tablename NOT LIKE '_prisma_%'
    `);
    
    const tables = tablesResult.rows.map(row => row.tablename);
    console.log('📋 Found tables:', tables);
    
    // Delete all data from all tables
    for (const table of tables) {
      try {
        const result = await client.query(`DELETE FROM ${table}`);
        console.log(`✅ WIPED ${table}: ${result.rowCount} rows deleted`);
      } catch (error) {
        console.log(`❌ Error wiping ${table}: ${error.message}`);
      }
    }
    
    // Re-enable foreign key checks
    await client.query('SET session_replication_role = DEFAULT;');
    
    // Reset ALL sequences
    const sequencesResult = await client.query(`
      SELECT sequence_name FROM information_schema.sequences 
      WHERE sequence_schema = 'public'
    `);
    
    for (const row of sequencesResult.rows) {
      try {
        await client.query(`SELECT setval('${row.sequence_name}', 1, false)`);
        console.log(`🔄 Reset sequence: ${row.sequence_name}`);
      } catch (error) {
        console.log(`⚠️  Sequence reset failed: ${row.sequence_name}`);
      }
    }
    
    console.log('\n✅ COMPLETE DATA WIPE SUCCESSFUL');
    console.log('💥 ALL DATA HAS BEEN COMPLETELY REMOVED');
    console.log('🎯 Database is now completely empty');

  } catch (error) {
    console.error('❌ Complete data wipe failed:', error);
  } finally {
    await client.end();
    console.log('🔌 Database connection closed');
  }
}

completeDataWipe();