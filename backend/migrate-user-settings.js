const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');

async function addUserSettings() {
  const connectionString = process.env.DATABASE_URL || 'postgresql://payroll_user:payroll_pass_dev_123@localhost:5432/payroll_system_dev';
  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  
  const prisma = new PrismaClient({ adapter });

  try {
    console.log('Adding settings column to users table...');
    
    await prisma.$executeRaw`ALTER TABLE users ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT NULL`;
    
    console.log('✅ Settings column added successfully');
    
  } catch (error) {
    console.error('❌ Error adding settings column:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addUserSettings();