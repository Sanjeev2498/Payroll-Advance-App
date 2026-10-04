import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import './env-setup'; // Import centralized environment setup

/**
 * Per-test setup that runs for each test file
 * Database schema is set up globally, this handles connections and cleanup only
 */

let prisma: PrismaClient;

beforeAll(async () => {
  try {
    // In test environment, create a lightweight prisma client without managing the pool
    // The pool is managed by PrismaService globally
    if (process.env.NODE_ENV === 'test') {
      const pool = new Pool({ 
        connectionString: process.env.DATABASE_URL,
        connectionTimeoutMillis: 10000,
        idleTimeoutMillis: 10000,
        max: 1, // Minimal pool for test setup
        min: 0,
      });
      
      const adapter = new PrismaPg(pool);
      
      prisma = new PrismaClient({
        adapter,
        log: [], // No logging in test setup
      });
    } else {
      // For non-test environments, use standard client
      prisma = new PrismaClient({
        log: process.env.NODE_ENV === 'development' ? ['error'] : [],
      });
    }

    // Connect to the database with timeout
    await Promise.race([
      prisma.$connect(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Connection timeout after 10 seconds')), 10000)
      )
    ]);
    
    console.log('✅ Test database connection established');
    
  } catch (error) {
    console.error('Failed to connect to test database:', error);
    throw error;
  }
}, 15000); // Increased timeout

afterAll(async () => {
  // Clean up connections with better error handling
  try {
    if (prisma) {
      // Simplified disconnect without timeout race to prevent "Cannot log after tests are done"
      await prisma.$disconnect();
    }
    console.log('✅ Test database cleanup completed');
  } catch (error) {
    console.error('Error during test cleanup:', error);
    // Don't throw errors in cleanup to avoid masking test failures
  }
}, 3000); // Reduced timeout from 8000ms to 3000ms

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