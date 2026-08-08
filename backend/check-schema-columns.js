const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkSchema() {
  try {
    const result = await prisma.$queryRaw`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'employees' 
      AND column_name IN ('contact_info', 'contactInfo')
    `;
    console.log('Employee contact columns:', result);

    // Also check what columns actually exist in employees table
    const allCols = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'employees'
      ORDER BY column_name
    `;
    console.log('All employee columns:', allCols.map(c => c.column_name));
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkSchema();