const { PrismaClient } = require('@prisma/client');

async function verifyDatabaseTables() {
  const prisma = new PrismaClient();

  try {
    console.log('=== Verifying Database Tables ===');
    
    // Check if all required tables exist
    const tableCheck = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `;
    
    console.log('Tables in database:');
    const existingTables = tableCheck.map(t => t.table_name);
    existingTables.forEach(table => console.log('  ✅', table));
    
    // Expected tables from the schema
    const expectedTables = [
      'companies',
      'users', 
      'clients',
      'contracts',
      'sites',
      'employees',
      'assignments',
      'shifts',
      'attendance',
      'payroll_runs',
      'payroll_items',
      'invoices',
      'shift_templates',
      'shift_notifications'
    ];
    
    console.log('\n=== Table Verification ===');
    const missingTables = expectedTables.filter(table => !existingTables.includes(table));
    
    if (missingTables.length === 0) {
      console.log('✅ All expected tables exist!');
    } else {
      console.log('❌ Missing tables:');
      missingTables.forEach(table => console.log('  -', table));
    }
    
    console.log('\n=== Testing Basic CRUD Operations ===');
    
    // Test basic operations on key tables
    try {
      // Test companies table
      const companyCount = await prisma.company.count();
      console.log('✅ Companies table accessible - count:', companyCount);
      
      // Test contracts table
      const contractCount = await prisma.contract.count();
      console.log('✅ Contracts table accessible - count:', contractCount);
      
      // Test assignments table
      const assignmentCount = await prisma.assignment.count();
      console.log('✅ Assignments table accessible - count:', assignmentCount);
      
      // Test sites table
      const siteCount = await prisma.site.count();
      console.log('✅ Sites table accessible - count:', siteCount);
      
    } catch (error) {
      console.error('❌ CRUD test failed:', error.message);
    }
    
  } catch (error) {
    console.error('Database verification failed:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

verifyDatabaseTables().catch(console.error);