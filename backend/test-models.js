const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');

async function testModels() {
  console.log('🧪 Testing Prisma models after migration...');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://payroll_user:payroll_pass_dev_123@127.0.0.1:5432/payroll_system_dev'
  });
  
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    await prisma.$connect();
    
    // Check specific models that were failing
    console.log('Testing contract model...');
    try {
      const contractCount = await prisma.contract.count();
      console.log('✅ Contract model works, count:', contractCount);
    } catch (err) {
      console.log('❌ Contract model error:', err.message);
    }
    
    console.log('Testing site model...');
    try {
      const siteCount = await prisma.site.count();
      console.log('✅ Site model works, count:', siteCount);
    } catch (err) {
      console.log('❌ Site model error:', err.message);
    }
    
    console.log('Testing payrollRun model...');
    try {
      const payrollRunCount = await prisma.payrollRun.count();
      console.log('✅ PayrollRun model works, count:', payrollRunCount);
    } catch (err) {
      console.log('❌ PayrollRun model error:', err.message);
    }
    
    console.log('Testing client model...');
    try {
      const clientCount = await prisma.client.count();
      console.log('✅ Client model works, count:', clientCount);
    } catch (err) {
      console.log('❌ Client model error:', err.message);
    }
    
    console.log('Testing employee model...');
    try {
      const employeeCount = await prisma.employee.count();
      console.log('✅ Employee model works, count:', employeeCount);
    } catch (err) {
      console.log('❌ Employee model error:', err.message);
    }
    
  } catch (error) {
    console.error('Test failed:', error.message);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

testModels().catch(console.error);