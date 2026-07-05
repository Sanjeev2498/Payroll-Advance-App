const { PrismaService } = require('./dist/src/prisma/prisma.service.js');

async function simpleUserCheck() {
  const prisma = new PrismaService();
  await prisma.onModuleInit();
  
  console.log('Checking database user and RLS bypass...');
  
  // Check current user
  const userInfo = await prisma.$queryRaw`SELECT current_user, session_user`;
  console.log('Current user:', userInfo[0]);
  
  // Check table ownership
  const ownership = await prisma.$queryRaw`
    SELECT tableowner, (tableowner = current_user) as is_owner
    FROM pg_tables 
    WHERE tablename = 'companies'
  `;
  console.log('Table ownership:', ownership[0]);
  
  // Check if user is superuser
  const superuserCheck = await prisma.$queryRaw`
    SELECT rolsuper as is_superuser 
    FROM pg_roles 
    WHERE rolname = current_user
  `;
  console.log('Is superuser:', superuserCheck[0]);
  
  console.log('\\n=== APPLYING FIX: FORCE ROW LEVEL SECURITY ===');
  
  // Apply FORCE ROW LEVEL SECURITY - this makes RLS apply even to table owners
  await prisma.$executeRaw`ALTER TABLE companies FORCE ROW LEVEL SECURITY;`;
  console.log('✅ Applied FORCE ROW LEVEL SECURITY to companies table');
  
  await prisma.$executeRaw`ALTER TABLE users FORCE ROW LEVEL SECURITY;`;
  await prisma.$executeRaw`ALTER TABLE clients FORCE ROW LEVEL SECURITY;`;
  await prisma.$executeRaw`ALTER TABLE employees FORCE ROW LEVEL SECURITY;`;
  await prisma.$executeRaw`ALTER TABLE sites FORCE ROW LEVEL SECURITY;`;
  await prisma.$executeRaw`ALTER TABLE assignments FORCE ROW LEVEL SECURITY;`;
  await prisma.$executeRaw`ALTER TABLE shifts FORCE ROW LEVEL SECURITY;`;
  await prisma.$executeRaw`ALTER TABLE attendance FORCE ROW LEVEL SECURITY;`;
  await prisma.$executeRaw`ALTER TABLE payroll_runs FORCE ROW LEVEL SECURITY;`;
  await prisma.$executeRaw`ALTER TABLE payroll_items FORCE ROW LEVEL SECURITY;`;
  await prisma.$executeRaw`ALTER TABLE invoices FORCE ROW LEVEL SECURITY;`;
  console.log('✅ Applied FORCE ROW LEVEL SECURITY to all tenant tables');
  
  // Test the fix
  console.log('\\n=== TESTING FIX ===');
  const testTenantId = '7f98ee4a-5db7-4ac4-8ec1-b880eb42b1c4';
  
  const result = await prisma.withTenant(testTenantId, async (p) => {
    const companies = await p.company.findMany();
    console.log(`After FORCE RLS: ${companies.length} companies visible`);
    companies.forEach(c => console.log(`- ${c.name} (${c.id === testTenantId ? 'CORRECT' : 'WRONG'})`));
    return companies.length;
  });
  
  if (result === 1) {
    console.log('\\n🎉 BUG 1 FIXED! Tenant isolation now working correctly.');
  } else {
    console.log('\\n❌ Fix did not work. Still seeing multiple companies.');
  }
  
  await prisma.onModuleDestroy();
}

simpleUserCheck().catch(console.error);