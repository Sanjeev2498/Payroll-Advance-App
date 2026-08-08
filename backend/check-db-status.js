const { PrismaClient } = require('@prisma/client');

async function checkDatabaseStatus() {
  // Set database URL environment variable
  process.env.DATABASE_URL = 'postgresql://payroll_user:payroll_pass_dev_123@127.0.0.1:5432/payroll_system_dev';
  
  const prisma = new PrismaClient();

  try {
    console.log('=== Checking Database Tables ===');
    
    // Check if tables exist
    const tableCheck = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `;
    
    console.log('Tables in database:');
    tableCheck.forEach(table => console.log('  -', table.table_name));
    
    console.log('\n=== Checking Prisma Client Models ===');
    
    // Test key models
    const models = ['company', 'client', 'contract', 'site', 'employee', 'attendance', 'payrollRun'];
    
    for (const model of models) {
      try {
        const modelExists = prisma[model];
        if (modelExists) {
          console.log('✅ Model', model, 'exists');
          // Try to do a simple count
          try {
            const count = await prisma[model].count();
            console.log('   Record count:', count);
          } catch (err) {
            console.log('   Error counting:', err.message);
          }
        } else {
          console.log('❌ Model', model, 'missing');
        }
      } catch (err) {
        console.log('❌ Model', model, 'error:', err.message);
      }
    }
    
  } catch (error) {
    console.error('Database check failed:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabaseStatus().catch(console.error);