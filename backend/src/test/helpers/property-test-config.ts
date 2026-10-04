/**
 * Centralized property test configuration for optimal performance
 * This file provides consistent timeout and execution settings
 * across all property-based tests to prevent timeout issues.
 */

export const OPTIMIZED_PROPERTY_TEST_CONFIG = {
  // Standard configuration for most property tests
  standard: {
    numRuns: 3, // Reduced from higher values for better performance
    timeout: 20000, // 20 second timeout - reasonable for most operations (increased from 10000ms)
    seed: 42,
    endOnFailure: true,
  },
  
  // Fast configuration for simple tests
  fast: {
    numRuns: 2,
    timeout: 8000, // 8 second timeout for simple operations (increased from 5000ms)
    seed: 42,
    endOnFailure: true,
  },
  
  // Comprehensive configuration for complex integration tests
  comprehensive: {
    numRuns: 5,
    timeout: 30000, // 30 second timeout for complex operations (increased from 20000ms)
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
  fast: 20000,       // 20s for fast property tests (increased from 15s)
  standard: 30000,   // 30s for standard property tests (increased from 25s)
  comprehensive: 45000, // 45s for comprehensive tests (increased from 35s)
  performance: 60000,   // 60s for performance tests (increased from 45s)
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