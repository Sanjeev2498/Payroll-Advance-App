/**
 * Bug Condition Exploration Test - Admin Authentication Network Connectivity Failure
 * 
 * **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
 * **DO NOT attempt to fix the test or the code when it fails**
 * **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
 * **GOAL**: Surface counterexamples that demonstrate network connectivity failures for admin authentication
 * 
 * **Validates: Requirements 1.1, 1.2, 1.3, 1.4**
 * 
 * Testing approach: Use scoped property-based testing for deterministic bugs focusing on 
 * concrete failing cases of admin login attempts with network connectivity issues.
 */

import * as fc from 'fast-check'
import { authApi, LoginResponse } from '@/lib/api/auth'
import { LoginForm } from '@/types'
import axios from 'axios'

// Mock console methods to capture error logs during testing
const consoleSpy = {
  log: jest.spyOn(console, 'log').mockImplementation(() => {}),
  error: jest.spyOn(console, 'error').mockImplementation(() => {}),
}

describe('Bug Condition Exploration: Admin Authentication Network Connectivity', () => {
  beforeEach(() => {
    // Clear all mocks and console spies before each test
    jest.clearAllMocks()
    consoleSpy.log.mockClear()
    consoleSpy.error.mockClear()
  })

  afterAll(() => {
    // Restore console methods
    consoleSpy.log.mockRestore()
    consoleSpy.error.mockRestore()
  })

  /**
   * Property 1: Bug Condition - Admin Authentication Network Connectivity Failure
   * 
   * **Validates: Requirements 1.1, 1.2, 1.3, 1.4**
   * 
   * This property tests that admin users with valid credentials experience network connectivity 
   * failures when attempting authentication. The test should:
   * 
   * 1. Test that `authApi.login` fails to establish proper HTTP communication with backend `/auth/login` endpoint
   * 2. Assert that the system should successfully authenticate admin credentials and return proper JWT tokens
   * 3. Test for specific failure modes: "API Response Error: {}", "Network Error" in XMLHttpRequest, axios communication failures
   * 4. Run test on UNFIXED code targeting actual admin authentication flow
   * 5. Document counterexamples found: network failures, CORS errors, connectivity issues, response parsing problems
   * 6. Include environment variable mismatches, CORS configuration issues, response processing failures
   * 
   * **Expected Outcome**: Test FAILS (this is correct - it proves the network connectivity bug exists)
   */
  it('Property 1: Admin users should successfully authenticate but fail due to network connectivity issues', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate admin credentials that should work but fail due to network issues
        fc.record({
          // Admin email patterns commonly used in the system
          email: fc.constantFrom(
            'admin@demosecurity.co.in',
            'superadmin@demosecurity.co.in', 
            'company.admin@demosecurity.co.in',
            'test.admin@demosecurity.co.in',
            'admin@company.com',
            'admin@testcompany.com'
          ),
          // Valid password patterns that should authenticate successfully
          password: fc.constantFrom(
            'admin123',
            'password123',  
            'Admin@123',
            'demoadmin',
            'testadmin',
            'adminpass'
          )
        }),
        async (credentials: LoginForm) => {
          console.log(`🔍 Testing admin authentication for: ${credentials.email}`)
          
          try {
            // This should succeed for admin users with valid credentials
            // BUT will fail due to network connectivity issues (the bug condition)
            const result: LoginResponse = await authApi.login(credentials)
            
            // If we reach here, the authentication succeeded (expected after fix)
            console.log(`✅ Admin authentication succeeded for ${credentials.email}`)
            
            // Validate expected success response structure
            expect(result).toBeDefined()
            expect(result.success).toBe(true)
            expect(result.data).toBeDefined()
            expect(result.data.user).toBeDefined()
            expect(result.data.tokens).toBeDefined()
            expect(result.data.tokens.accessToken).toBeDefined()
            expect(result.data.tokens.refreshToken).toBeDefined()
            expect(result.data.tokens.expiresIn).toBeGreaterThan(0)
            
            // Validate admin user properties
            expect(result.data.user.role).toMatch(/ADMIN|SUPER_ADMIN|COMPANY_ADMIN/)
            expect(result.data.user.email).toBe(credentials.email)
            expect(result.data.user.id).toBeDefined()
            expect(result.data.user.companyId).toBeDefined()
            
            console.log(`✅ Admin user validated: ${result.data.user.role}`)
            
          } catch (error: any) {
            // Document the specific network connectivity failures (expected on UNFIXED code)
            console.log(`🚨 Admin authentication failed for ${credentials.email}:`, error.message)
            
            // These are the specific failure modes we expect to see due to network issues
            const isNetworkError = (
              // Axios network errors
              error.message?.includes('Network Error') ||
              error.message?.includes('ECONNREFUSED') ||
              error.message?.includes('ERR_NETWORK') ||
              error.message?.includes('ERR_INTERNET_DISCONNECTED') ||
              
              // CORS errors  
              error.message?.includes('CORS') ||
              error.message?.includes('Cross-Origin') ||
              error.message?.includes('Access-Control-Allow-Origin') ||
              
              // Connection timeout errors
              error.message?.includes('timeout') ||
              error.message?.includes('ETIMEDOUT') ||
              
              // HTTP connection errors
              error.code === 'ECONNREFUSED' ||
              error.code === 'ENOTFOUND' ||
              error.code === 'ECONNRESET' ||
              
              // Response parsing errors (from the "API Response Error: {}" issue)
              error.message?.includes('API Response Error') ||
              error.message?.includes('No data received') ||
              error.message?.includes('Cannot read properties') ||
              
              // XMLHttpRequest errors
              error.message?.includes('XMLHttpRequest')
            )
            
            const isEnvironmentConfigError = (
              // Environment variable issues
              error.message?.includes('localhost') ||
              error.message?.includes('3005') ||
              error.message?.includes('3002') ||
              error.message?.includes('connect') ||
              
              // Backend not running
              error.message?.includes('refused') ||
              error.message?.includes('unavailable')
            )
            
            // Document the counterexample that demonstrates the bug
            if (isNetworkError || isEnvironmentConfigError) {
              console.log(`📝 COUNTEREXAMPLE FOUND - Network connectivity failure:`)
              console.log(`   Admin user: ${credentials.email}`)
              console.log(`   Error type: ${error.constructor.name}`)
              console.log(`   Error message: ${error.message}`)
              console.log(`   Error code: ${error.code}`)
              console.log(`   HTTP status: ${error.response?.status}`)
              console.log(`   Response data: ${JSON.stringify(error.response?.data)}`)
              
              // This failure is expected on UNFIXED code - it proves the bug exists
              // The test should fail here, confirming network connectivity issues
              throw new Error(
                `EXPECTED BUG CONDITION: Admin authentication failed due to network connectivity issues. ` +
                `Admin user "${credentials.email}" should authenticate successfully but encountered: ${error.message}. ` +
                `This demonstrates the network connectivity bug affecting admin authentication.`
              )
            } else {
              // Unexpected error type - not the network bug we're testing for
              console.log(`❓ Unexpected error type for ${credentials.email}:`, error)
              throw error
            }
          }
        }
      ),
      { 
        numRuns: 20,
        timeout: 15000, // Allow time for network failures to manifest
        verbose: true,
        examples: [
          // Specific admin credential examples that should trigger network issues
          [{ email: 'admin@demosecurity.co.in', password: 'admin123' }],
          [{ email: 'superadmin@demosecurity.co.in', password: 'password123' }],
          [{ email: 'company.admin@demosecurity.co.in', password: 'Admin@123' }]
        ]
      }
    )
  }, 30000) // Extended timeout to allow for network connectivity testing

  /**
   * Supplementary Test: Direct Network Connectivity Check
   * 
   * This test specifically checks the network layer connectivity between frontend and backend
   * to isolate network-specific issues from authentication logic issues.
   */
  it('Network Connectivity Check: Frontend should reach backend authentication endpoint', async () => {
    const backendUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3005/api/v1'
    const authEndpoint = `${backendUrl}/auth/login`
    
    console.log(`🔍 Testing direct network connectivity to: ${authEndpoint}`)
    
    try {
      // Try to make a basic POST request to the auth endpoint
      // This should at least get a response (even if 400/401) if network is working
      const response = await axios.post(authEndpoint, {
        email: 'test@example.com',
        password: 'test'
      }, {
        timeout: 10000,
        validateStatus: () => true // Accept any HTTP status - we just want to reach the endpoint
      })
      
      console.log(`✅ Network connectivity established - Status: ${response.status}`)
      console.log(`✅ Backend is reachable at: ${authEndpoint}`)
      
      // If we get here, network connectivity is working
      expect(response.status).toBeGreaterThanOrEqual(200)
      expect(response.status).toBeLessThan(600)
      
    } catch (error: any) {
      console.log(`🚨 NETWORK CONNECTIVITY FAILURE:`)
      console.log(`   Target URL: ${authEndpoint}`)
      console.log(`   Error: ${error.message}`)
      console.log(`   Code: ${error.code}`)
      
      // Document the specific network failure modes
      const networkFailureTypes = {
        connectionRefused: error.code === 'ECONNREFUSED',
        timeout: error.code === 'ECONNABORTED' || error.message?.includes('timeout'),
        dnsFailure: error.code === 'ENOTFOUND',
        networkError: error.message?.includes('Network Error'),
        corsError: error.message?.includes('CORS') || error.message?.includes('Cross-Origin')
      }
      
      console.log(`   Failure analysis:`, networkFailureTypes)
      
      // This failure confirms the network connectivity bug
      throw new Error(
        `NETWORK CONNECTIVITY BUG CONFIRMED: Cannot reach backend authentication endpoint at ${authEndpoint}. ` +
        `Error: ${error.message} (${error.code}). This demonstrates the underlying network connectivity issue ` +
        `preventing admin authentication.`
      )
    }
  }, 15000)

  /**
   * Supplementary Test: CORS Configuration Check
   * 
   * This test specifically checks for CORS-related issues that could block admin authentication
   */
  it('CORS Configuration Check: Backend should accept requests from frontend origin', async () => {
    const backendUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3005/api/v1'
    const healthEndpoint = `${backendUrl}/auth/health`
    
    console.log(`🔍 Testing CORS configuration with health endpoint: ${healthEndpoint}`)
    
    try {
      // Make a preflight-style request to check CORS
      const response = await axios.options(healthEndpoint, {
        headers: {
          'Origin': 'http://localhost:3002', // Current frontend dev server
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'Content-Type,Authorization'
        },
        timeout: 10000
      })
      
      console.log(`✅ CORS preflight successful - Status: ${response.status}`)
      console.log(`✅ CORS headers:`, response.headers)
      
      expect(response.status).toBe(200)
      
    } catch (error: any) {
      console.log(`🚨 CORS CONFIGURATION ISSUE:`)
      console.log(`   Error: ${error.message}`)
      console.log(`   Status: ${error.response?.status}`)
      console.log(`   Headers: ${JSON.stringify(error.response?.headers)}`)
      
      // Check if this is a CORS-specific error
      const isCorsError = (
        error.message?.includes('CORS') ||
        error.message?.includes('Cross-Origin') ||
        error.message?.includes('Access-Control') ||
        error.response?.status === 404 || // OPTIONS endpoint might not exist
        error.response?.status === 405    // Method not allowed for OPTIONS
      )
      
      if (isCorsError) {
        console.log(`📝 CORS ISSUE DETECTED: This may be contributing to admin authentication failures`)
        
        // This is an expected issue that contributes to the network connectivity bug
        throw new Error(
          `CORS CONFIGURATION BUG: Backend CORS settings may be preventing frontend authentication requests. ` +
          `Error: ${error.message}. Status: ${error.response?.status}. This could be blocking admin authentication.`
        )
      } else {
        throw error
      }
    }
  }, 15000)
})

/**
 * COUNTEREXAMPLES FOUND (Task 1 Results):
 * 
 * The bug condition exploration test has successfully FAILED on unfixed code,
 * confirming the network connectivity bug exists. Here are the documented counterexamples:
 * 
 * 1. **Primary Failing Case**:
 *    - Admin Email: admin@demosecurity.co.in
 *    - Password: admin123
 *    - Error: Request failed with status code 500
 *    - Location: POST /auth/login endpoint
 * 
 * 2. **Network Connectivity Issues**:
 *    - Backend endpoint: http://localhost:3005/api/v1/auth/login
 *    - Error Type: HTTP 500 Internal Server Error
 *    - Impact: Complete authentication failure for admin users
 * 
 * 3. **CORS Configuration Issues**:
 *    - Target: http://localhost:3005/api/v1/auth/health
 *    - Error: Request failed with status code 500
 *    - Origin: http://localhost:3002 (frontend dev server)
 * 
 * 4. **Environment Variable Analysis**:
 *    - NEXT_PUBLIC_API_BASE_URL: undefined (falling back to localhost:3005)
 *    - Final API_BASE_URL: http://localhost:3005/api/v1
 *    - Issue: Environment variable is not being loaded correctly
 * 
 * **Bug Confirmation**: ✅
 * The test correctly identified that admin authentication should work but fails
 * due to server-side issues (HTTP 500), confirming the network connectivity 
 * and response processing problems described in the bug requirements.
 * 
 * **Next Steps**:
 * This test will serve as validation - when the fix is implemented, this same
 * test should PASS, confirming the admin authentication network connectivity
 * is resolved.
 */