const { Pool } = require('pg');
require('dotenv').config();

async function checkColumns() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    // Check clients table columns
    const clientsResult = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'clients' AND table_schema = 'public'
      ORDER BY ordinal_position;
    `);
    
    console.log('Clients table columns:');
    clientsResult.rows.forEach(col => {
      console.log(`  ${col.column_name} (${col.data_type}) - nullable: ${col.is_nullable}, default: ${col.column_default}`);
    });

    // Check what the schema expects for client columns
    console.log('\nExpected columns based on Prisma schema:');
    const expectedColumns = [
      'id', 'company_id', 'name', 'contact_email', 'contact_info', 'organization_type',
      'industry', 'company_size', 'document_requirements', 'onboarding_checklist', 
      'tags', 'account_manager_id', 'performance_metrics', 'relationship_notes',
      'last_contact_date', 'next_follow_up_date', 'created_at', 'updated_at'
    ];
    
    const actualColumns = clientsResult.rows.map(r => r.column_name);
    
    expectedColumns.forEach(expectedCol => {
      const exists = actualColumns.includes(expectedCol);
      console.log(`  ${expectedCol} - ${exists ? '✓ EXISTS' : '❌ MISSING'}`);
    });

    // Check if there are extra columns
    console.log('\nExtra columns in database:');
    const extraColumns = actualColumns.filter(col => !expectedColumns.includes(col));
    extraColumns.forEach(col => console.log(`  ${col} - 🔍 EXTRA`));

  } catch (error) {
    console.error('Error checking columns:', error);
  } finally {
    await pool.end();
  }
}

checkColumns();