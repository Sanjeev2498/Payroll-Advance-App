// Test setup for property-based tests
// Configure Jest and testing environment

// Increase timeout for property tests
jest.setTimeout(30000);

// Mock environment variables for testing
process.env.DATABASE_URL = process.env.DATABASE_URL || 
  'postgresql://payroll_user:payroll_pass_dev_123@localhost:5432/payroll_system_test';
process.env.NODE_ENV = 'test';

// Global test utilities
global.console = {
  ...console,
  // Suppress logs during tests unless explicitly needed
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: console.warn,
  error: console.error,
};