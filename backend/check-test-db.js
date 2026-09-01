const { Pool } = require('pg');

async function checkTestDatabase() {
  console.log('Checking test database setup...');
  
  const pool = new Pool({
    host: 'localhost',
    port: 5432,
    user: 'payroll_user', 
    password: 'payroll_pass_dev_123',
    database: 'postgres', // Connect to default database first
  });

  try {
    const client = await pool.connect();
    
    // Check if test database exists
    const result = await client.query("SELECT 1 FROM pg_database WHERE datname = 'payroll_test'");
    
    if (result.rows.length > 0) {
      console.log('✅ Test database "payroll_test" exists');
    } else {
      console.log('❌ Test database "payroll_test" does not exist');
      console.log('Creating test database...');
      
      try {
        await client.query('CREATE DATABASE payroll_test');
        console.log('✅ Test database created successfully');
      } catch (createError) {
        if (createError.message.includes('already exists')) {
          console.log('✅ Test database already exists');
        } else {
          console.error('❌ Failed to create test database:', createError.message);
        }
      }
    }
    
    client.release();
  } catch (error) {
    console.error('❌ Failed to check test database:', error.message);
  }

  await pool.end();
}

checkTestDatabase().catch(console.error);