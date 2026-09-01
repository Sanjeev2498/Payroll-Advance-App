import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import './env-setup'; // Import centralized environment setup

/**
 * Per-test setup that runs for each test file
 * Database schema is set up globally, this handles connections and cleanup only
 */

let prisma: PrismaClient;
let pool: Pool;

beforeAll(async () => {
  try {
    // Initialize database connection (schema already set up globally)
    pool = new Pool({ 
      connectionString: process.env.DATABASE_URL,
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 5000,
      max: 2, // Reduced connection pool for tests
      min: 0,
    });
    
    const adapter = new PrismaPg(pool);
    
    // Initialize Prisma client (no schema setup needed)
    prisma = new PrismaClient({
      adapter,
      log: process.env.NODE_ENV === 'test' ? [] : ['error'], // Reduce logging in tests
    });

    // Connect to the database with timeout
    await Promise.race([
      prisma.$connect(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Connection timeout after 5 seconds')), 5000)
      )
    ]);
    
    console.log('✅ Test database connection established');
    
  } catch (error) {
    console.error('Failed to connect to test database:', error);
    throw error;
  }
}, 8000); // Reduced timeout since no schema setup

afterAll(async () => {
  // Clean up connections
  try {
    if (prisma) {
      await Promise.race([
        prisma.$disconnect(),
        new Promise((resolve) => setTimeout(() => resolve('timeout'), 3000))
      ]);
    }
    if (pool) {
      await Promise.race([
        pool.end(),
        new Promise((resolve) => setTimeout(() => resolve('timeout'), 2000))
      ]);
    }
    console.log('✅ Test database cleanup completed');
  } catch (error) {
    console.error('Error during test cleanup:', error);
  }
}, 5000);

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
      'contracts',
      'clients',
      'users',
      'companies'
    ];

    for (const tableName of tableNames) {
      try {
        await Promise.race([
          prisma.$executeRawUnsafe(`DELETE FROM "${tableName}";`),
          new Promise((resolve) => setTimeout(() => resolve('timeout'), 1000))
        ]);
      } catch (error) {
        // Table might not exist or have dependencies, continue
      }
    }
  }
}, 3000); // Reduced timeout for cleanup

// Export for use in tests
export { prisma };