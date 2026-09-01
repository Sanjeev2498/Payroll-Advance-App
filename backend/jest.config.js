const { pathsToModuleNameMapper } = require('ts-jest');
const { compilerOptions } = require('./tsconfig.json');

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: [
    '**/__tests__/**/*.+(ts|tsx|js)',
    '**/*.(test|spec).+(ts|tsx|js)'
  ],
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: 'tsconfig.json',
      useESM: false
    }]
  },
  collectCoverageFrom: [
    'src/**/*.{js,ts}',
    '!src/**/*.d.ts',
    '!src/**/*.spec.ts',
    '!src/**/*.test.ts',
  ],
  testTimeout: 45000, // Reduced from 60s to 45s for better performance
  
  // Global setup and teardown to prevent concurrent schema operations
  globalSetup: '<rootDir>/src/test/global-setup.ts',
  globalTeardown: '<rootDir>/src/test/global-teardown.ts',
  
  // Per-test setup (no schema operations)
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],
  
  // Run tests serially to prevent database conflicts during development
  // Optimized for better performance in CI environments
  maxWorkers: process.env.CI ? '25%' : 1, // Reduced from 50% for better stability
  
  moduleNameMapper: {
    ...pathsToModuleNameMapper(compilerOptions.paths || {}, { 
      prefix: '<rootDir>/'
    }),
    // Mock uuid to avoid ESM issues in Jest
    '^uuid$': '<rootDir>/src/tests/__mocks__/uuid.js'
  },
  moduleFileExtensions: [
    'js',
    'json',
    'ts',
  ],
  transformIgnorePatterns: [
    // Don't transform uuid - use CommonJS version
    'node_modules/(?!uuid)'
  ],
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/dist/'
  ]
};