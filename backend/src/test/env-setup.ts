/**
 * Centralized test environment variable setup
 * This ensures all test processes use consistent environment configuration
 */

export function setupTestEnvironment(): void {
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = 'postgresql://payroll_user:payroll_pass_dev_123@localhost:5432/payroll_test?schema=public';
  process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-purposes';
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key-for-testing';
  process.env.BCRYPT_ROUNDS = '4';
  process.env.LOG_LEVEL = 'error';
  process.env.DISABLE_EXTERNAL_APIS = 'true';

  // Encryption keys for testing
  process.env.ENCRYPTION_KEY_SENSITIVE = 'test-sensitive-key-for-testing-32-chars';
  process.env.ENCRYPTION_KEY_RESTRICTED = 'test-restricted-key-for-testing-32-chars';
  process.env.ENCRYPTION_KEY_FINANCIAL = 'test-financial-key-for-testing-32-chars';
}

// Auto-setup when imported
setupTestEnvironment();