import { execSync } from 'child_process';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import * as fs from 'fs';
import * as path from 'path';
import './env-setup'; // Import centralized environment setup

/**
 * Global test setup that runs ONCE before all test suites
 * This prevents multiple concurrent prisma db push operations
 */

const SETUP_LOCK_FILE = path.join(__dirname, '.db-setup-lock');
const MAX_SETUP_WAIT = 30000; // 30 seconds max wait for setup

export default async function globalSetup() {
  console.log('🔧 Starting global database setup...');

  // Check if another process is already setting up the database
  if (fs.existsSync(SETUP_LOCK_FILE)) {
    console.log('⏳ Another process is setting up database, waiting...');
    const startTime = Date.now();
    while (fs.existsSync(SETUP_LOCK_FILE)) {
      if (Date.now() - startTime > MAX_SETUP_WAIT) {
        console.log('⚠️ Database setup timeout, proceeding anyway...');
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    console.log('✅ Database setup completed by another process');
    return;
  }

  // Create lock file to prevent concurrent setup
  fs.writeFileSync(SETUP_LOCK_FILE, process.pid.toString());

  try {
    console.log('🗄️ Setting up database schema...');
    
    // Run database schema setup ONCE
    execSync('npx prisma db push --schema=./prisma/schema.prisma --accept-data-loss', {
      env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL },
      stdio: 'pipe',
      timeout: 30000, // 30 second timeout
    });

    console.log('✅ Database schema setup completed');

    // Test database connectivity
    const pool = new Pool({ 
      connectionString: process.env.DATABASE_URL,
      connectionTimeoutMillis: 5000,
      max: 1
    });
    
    const adapter = new PrismaPg(pool);
    const prisma = new PrismaClient({ adapter, log: ['error'] });

    await prisma.$connect();
    await prisma.$queryRaw`SELECT 1`;
    
    console.log('✅ Database connectivity verified');
    
    await prisma.$disconnect();
    await pool.end();

  } catch (error) {
    console.error('❌ Global database setup failed:', error);
    throw error;
  } finally {
    // Always remove lock file
    if (fs.existsSync(SETUP_LOCK_FILE)) {
      fs.unlinkSync(SETUP_LOCK_FILE);
    }
  }

  console.log('🎯 Global database setup completed successfully');
}