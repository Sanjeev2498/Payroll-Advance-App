import { execSync } from 'child_process';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

// Set test environment
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://payroll_user:payroll_pass_dev_123@localhost:5432/payroll_test?schema=public';

let prisma: PrismaClient;
let pool: Pool;

beforeAll(async () => {
  // Initialize Prisma client for tests
  pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  
  prisma = new PrismaClient({
    adapter,
    log: ['error'],
  });

  try {
    // Connect to the database
    await prisma.$connect();
    
    // Run migrations if needed (for fresh test database)
    try {
      execSync('npx prisma db push --schema=./prisma/schema.prisma --force-reset', {
        env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL },
        stdio: 'inherit',
      });
    } catch (error) {
      console.warn('Database migration skipped - may already be up to date');
    }
  } catch (error) {
    console.error('Failed to set up test database:', error);
    throw error;
  }
});

afterAll(async () => {
  // Clean up test data
  try {
    if (prisma) {
      await prisma.$disconnect();
    }
    if (pool) {
      await pool.end();
    }
  } catch (error) {
    console.error('Error during test cleanup:', error);
  }
});

// Clean database between tests to ensure isolation
beforeEach(async () => {
  if (prisma) {
    // Clear all tables in reverse dependency order
    const tableNames = [
      'shift_notifications',
      'attendance', 
      'payroll_items',
      'shifts',
      'assignments',
      'invoices',
      'payroll_runs',
      'shift_templates',
      'employees',
      'sites',
      'clients',
      'users',
      'companies'
    ];

    for (const tableName of tableNames) {
      try {
        await prisma.$executeRawUnsafe(`DELETE FROM "${tableName}";`);
      } catch (error) {
        // Table might not exist yet, ignore
      }
    }
  }
});

// Export for use in tests
export { prisma };