const { execSync } = require('child_process');
const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');

async function setupTestDatabase() {
  console.log('🔧 Setting up test database for Prisma 7.x...');
  
  const testDatabaseUrl = 'postgresql://payroll_user:payroll_pass_dev_123@localhost:5432/payroll_test?schema=public';
  
  try {
    // Set environment for test
    process.env.DATABASE_URL = testDatabaseUrl;
    process.env.NODE_ENV = 'test';
    
    console.log('📦 Creating test database if it doesn\'t exist...');
    // Create database using direct PostgreSQL connection
    const adminPool = new Pool({
      host: 'localhost',
      port: 5432,
      user: 'payroll_user',
      password: 'payroll_pass_dev_123',
      database: 'payroll_system_dev', // Connect to main db to create new db
    });
    
    try {
      await adminPool.query('CREATE DATABASE payroll_test');
      console.log('✅ Test database created');
    } catch (error) {
      if (error.code === '42P04') {
        console.log('📝 Test database already exists');
      } else {
        console.error('❌ Error creating database:', error.message);
        throw error;
      }
    }
    await adminPool.end();
    
    console.log('📡 Connecting to test database...');
    // Initialize Prisma client with adapter
    const pool = new Pool({ connectionString: testDatabaseUrl });
    const adapter = new PrismaPg(pool);
    
    const prisma = new PrismaClient({
      adapter,
      log: ['error'],
    });
    
    await prisma.$connect();
    
    console.log('🗄️ Applying database schema...');
    // Use db push with explicit config for test setup (faster than migrations)
    execSync('npx prisma db push --config ./prisma/prisma.config.ts --force-reset --accept-data-loss', {
      env: { ...process.env, DATABASE_URL: testDatabaseUrl },
      stdio: 'inherit',
    });
    
    console.log('✅ Test database setup complete!');
    
    await prisma.$disconnect();
    await pool.end();
  } catch (error) {
    console.error('❌ Failed to setup test database:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  setupTestDatabase();
}

module.exports = { setupTestDatabase };