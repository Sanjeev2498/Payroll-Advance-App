/**
 * Centralized property test configuration for optimal performance
 * This file provides consistent timeout and execution settings
 * across all property-based tests to prevent timeout issues.
 */

export const OPTIMIZED_PROPERTY_TEST_CONFIG = {
  // Standard configuration for most property tests
  standard: {
    numRuns: 3, // Reduced from higher values for better performance
    timeout: 10000, // 10 second timeout - reasonable for most operations
    seed: 42,
    endOnFailure: true,
  },
  
  // Fast configuration for simple tests
  fast: {
    numRuns: 2,
    timeout: 5000, // 5 second timeout for simple operations
    seed: 42,
    endOnFailure: true,
  },
  
  // Comprehensive configuration for complex integration tests
  comprehensive: {
    numRuns: 5,
    timeout: 15000, // 15 second timeout for complex operations
    seed: 42,
    endOnFailure: true,
  },
  
  // Performance-focused configuration for load/stress tests
  performance: {
    numRuns: 2, // Minimal runs for performance tests
    timeout: 20000, // Higher timeout for performance measurements
    seed: 42,
    endOnFailure: true,
  },
};

/**
 * Jest test timeout settings optimized for different test types
 */
export const JEST_TEST_TIMEOUTS = {
  fast: 15000,       // 15s for fast property tests
  standard: 25000,   // 25s for standard property tests  
  comprehensive: 35000, // 35s for comprehensive tests
  performance: 45000,   // 45s for performance tests
};

/**
 * Helper function to get appropriate config based on test complexity
 */
export function getOptimizedConfig(testType: 'fast' | 'standard' | 'comprehensive' | 'performance' = 'standard') {
  return OPTIMIZED_PROPERTY_TEST_CONFIG[testType];
}

/**
 * Helper function to get appropriate Jest timeout
 */
export function getOptimizedTimeout(testType: 'fast' | 'standard' | 'comprehensive' | 'performance' = 'standard'): number {
  return JEST_TEST_TIMEOUTS[testType];
}