const { Pool } = require('pg');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');

async function testDatabaseConnection() {
  console.log('Testing database connection...');
  
  const DATABASE_URL = 'postgresql://payroll_user:payroll_pass_dev_123@localhost:5432/payroll_test?schema=public';
  
  // Test direct PostgreSQL connection
  console.log('1. Testing direct PostgreSQL connection...');
  const pool = new Pool({ 
    connectionString: DATABASE_URL,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 10000,
    max: 5,
    min: 1,
    acquireTimeoutMillis: 5000,
  });

  try {
    const client = await pool.connect();
    console.log('✅ Direct PostgreSQL connection successful');
    
    // Test basic query
    const result = await client.query('SELECT 1 as test');
    console.log('✅ Basic query successful:', result.rows[0]);
    
    client.release();
  } catch (error) {
    console.error('❌ Direct PostgreSQL connection failed:', error.message);
    await pool.end();
    return;
  }

  // Test Prisma connection
  console.log('2. Testing Prisma connection...');
  try {
    const adapter = new PrismaPg(pool);
    const prisma = new PrismaClient({
      adapter,
      log: ['error', 'warn'],
    });

    console.log('Connecting to Prisma...');
    await prisma.$connect();
    console.log('✅ Prisma connection successful');

    // Test Prisma query
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('✅ Prisma query successful:', result);

    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Prisma connection failed:', error.message);
    console.error('Full error:', error);
  }

  await pool.end();
  console.log('Database connection test completed');
}

testDatabaseConnection().catch(console.error);