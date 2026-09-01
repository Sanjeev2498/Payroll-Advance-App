const { execSync } = require('child_process');
const { Client } = require('pg');

console.log('🔄 Resetting test database...');

async function resetTestDatabase() {
  try {
    // Connect to postgres database to drop and recreate payroll_test
    const adminClient = new Client({
      host: 'localhost',
      port: 5432,
      user: 'payroll_user',
      password: 'payroll_pass_dev_123',
      database: 'postgres' // Connect to postgres db to manage payroll_test
    });

    await adminClient.connect();
    
    // Terminate existing connections to payroll_test
    console.log('📋 Terminating existing connections...');
    await adminClient.query(`
      SELECT pg_terminate_backend(pg_stat_activity.pid)
      FROM pg_stat_activity
      WHERE pg_stat_activity.datname = 'payroll_test'
        AND pid <> pg_backend_pid()
    `);
    
    // Drop and recreate test database
    console.log('🗑️ Dropping test database...');
    await adminClient.query('DROP DATABASE IF EXISTS payroll_test');
    
    console.log('📦 Creating fresh test database...');
    await adminClient.query('CREATE DATABASE payroll_test OWNER payroll_user');
    
    await adminClient.end();
    
    console.log('✅ Test database reset completed!');
    
    // Push schema to fresh test database
    console.log('🔄 Pushing schema to test database...');
    execSync('npx prisma db push --accept-data-loss', { 
      stdio: 'inherit',
      env: { 
        ...process.env, 
        DATABASE_URL: "postgresql://payroll_user:payroll_pass_dev_123@localhost:5432/payroll_test?schema=public"
      }
    });

    console.log('🔄 Generating Prisma client...');
    execSync('npx prisma generate', { stdio: 'inherit' });
    
    console.log('✅ Test database setup completed successfully!');
    
  } catch (error) {
    console.error('❌ Failed to reset test database:', error.message);
    process.exit(1);
  }
}

resetTestDatabase();