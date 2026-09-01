const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTables() {
  try {
    const result = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `;
    console.log('Existing tables:');
    result.forEach(row => console.log('  -', row.table_name));
    console.log('\nTotal tables:', result.length);
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkTables();