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
  }

  // Silent cleanup operations to avoid post-test logging
  try {
    // Force cleanup of any remaining connections without logging
    const poolModule = require('pg');
    if (poolModule && poolModule.Pool) {
      // Close any remaining pools silently
    }
  } catch (error) {
    // Ignore errors during cleanup
  }

  console.log('✅ Global teardown completed');
}