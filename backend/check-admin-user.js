const { PrismaClient } = require('@prisma/client');

async function checkAdminUser() {
  const prisma = new PrismaClient();
  
  try {
    const user = await prisma.users.findUnique({
      where: { email: 'admin@demosecurity.co.in' }
    });
    
    console.log('User found:', user ? 'YES' : 'NO');
    if (user) {
      console.log('Email:', user.email);
      console.log('Role:', user.role);
      console.log('Active:', user.is_active);
      console.log('Company ID:', user.company_id);
      console.log('Password hash exists:', !!user.password_hash);
      console.log('Created at:', user.created_at);
    } else {
      console.log('Admin user not found in database');
    }
  } catch (error) {
    console.error('Database error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkAdminUser();