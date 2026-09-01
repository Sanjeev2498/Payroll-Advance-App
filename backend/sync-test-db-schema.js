const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔄 Synchronizing test database schema with dev database...');

try {
  // Save the original DATABASE_URL
  const originalEnv = fs.readFileSync('.env', 'utf8');
  
  // Set environment to test database
  process.env.DATABASE_URL = "postgresql://payroll_user:payroll_pass_dev_123@localhost:5432/payroll_test?schema=public";
  
  console.log('📋 Generating migration for test database schema sync...');
  
  // Reset the test database to match dev database structure  
  console.log('🔄 Pushing schema to test database...');
  execSync('npx prisma db push --accept-data-loss', { 
    stdio: 'inherit',
    env: { 
      ...process.env, 
      DATABASE_URL: "postgresql://payroll_user:payroll_pass_dev_123@localhost:5432/payroll_test?schema=public"
    }
  });

  console.log('✅ Test database schema successfully synchronized!');
  
  console.log('🔄 Generating Prisma client...');
  execSync('npx prisma generate', { stdio: 'inherit' });
  
  console.log('✅ Test database schema sync completed successfully!');
  
} catch (error) {
  console.error('❌ Failed to sync test database schema:', error.message);
  process.exit(1);
}