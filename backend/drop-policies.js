const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function dropPolicies() {
  try {
    console.log('Dropping RLS policies that might block migration...');
    
    // Drop invoice tenant isolation policy
    await prisma.$executeRawUnsafe(`DROP POLICY IF EXISTS invoices_tenant_isolation ON invoices CASCADE;`);
    console.log('Dropped invoices_tenant_isolation policy');
    
    // Drop any other policies that might conflict
    const policies = await prisma.$queryRawUnsafe(`
      SELECT schemaname, tablename, policyname 
      FROM pg_policies 
      WHERE schemaname = 'public';
    `);
    
    console.log('Existing policies:', policies);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

dropPolicies();