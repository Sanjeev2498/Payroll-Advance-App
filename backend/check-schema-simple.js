// Simple database schema check without Prisma client
const { Pool } = require('pg');

async function checkDatabaseSchema() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://payroll_user:payroll_pass_dev_123@127.0.0.1:5432/payroll_system_dev'
  });

  try {
    console.log('Checking database schema directly...');
    
    // Check if contract_id column exists in sites table
    const result = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'sites' 
      AND table_schema = 'public'
      ORDER BY ordinal_position;
    `);
    
    console.log('Sites table columns:');
    console.table(result.rows);
    
    // Check if contracts table exists
    const contractsExist = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'contracts'
      );
    `);
    
    console.log('Contracts table exists:', contractsExist.rows[0].exists);
    
    // Check current client_id vs contract_id in sites
    const hasClientId = result.rows.some(col => col.column_name === 'client_id');
    const hasContractId = result.rows.some(col => col.column_name === 'contract_id');
    
    console.log('\n=== DIAGNOSIS ===');
    console.log('Sites table has client_id column:', hasClientId);
    console.log('Sites table has contract_id column:', hasContractId);
    
    if (hasClientId && !hasContractId) {
      console.log('🚨 ISSUE: Database still uses old schema (client_id) but code expects new schema (contract_id)');
    } else if (hasContractId && !hasClientId) {
      console.log('✅ Database schema is correct (contract_id)');
    } else if (hasClientId && hasContractId) {
      console.log('⚠️ Both columns exist - migration in progress?');
    }
    
  } catch (error) {
    console.error('Error checking schema:', error);
  } finally {
    await pool.end();
  }
}

checkDatabaseSchema();