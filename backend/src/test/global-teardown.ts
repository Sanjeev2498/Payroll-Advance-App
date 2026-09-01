import * as fs from 'fs';
import * as path from 'path';

/**
 * Global test teardown that runs ONCE after all test suites
 */

const SETUP_LOCK_FILE = path.join(__dirname, '.db-setup-lock');

export default async function globalTeardown() {
  console.log('🧹 Running global test teardown...');

  // Clean up any remaining lock files
  if (fs.existsSync(SETUP_LOCK_FILE)) {
    fs.unlinkSync(SETUP_LOCK_FILE);
    console.log('🗑️ Removed database setup lock file');
  }

  console.log('✅ Global teardown completed');
}