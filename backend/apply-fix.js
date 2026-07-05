const { PrismaService } = require('./dist/src/prisma/prisma.service.js');

async function applyFix() {
  const prisma = new PrismaService();
  await prisma.onModuleInit();
  
  console.log('Applying Bug 1 fix: FORCE ROW LEVEL SECURITY...');
  
  try {
    // Force RLS on all tenant-specific tables
    const tables = [
      'companies', 'users', 'clients', 'employees', 'sites', 
      'assignments', 'shifts', 'attendance', 'payroll_runs', 
      'payroll_items', 'invoices', 'shift_templates', 'shift_notifications'
    ];
    
    for (const table of tables) {
      await prisma.$executeRawUnsafe(`ALTER TABLE "${table}" FORCE ROW LEVEL SECURITY;`);
      console.log(`✅ Applied FORCE RLS to ${table}`);
    }
    
    console.log('\n🎉 Bug 1 fix applied successfully!');
    console.log('Multi-tenant isolation should now work correctly.');
    
  } catch (error) {
    console.error('❌ Failed to apply fix:', error.message);
  }
  
  await prisma.onModuleDestroy();
}

applyFix().catch(console.error);