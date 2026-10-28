/**
 * Category 2: Authentication Middleware HTTP Status Codes - Bug Exploration Tests
 * 
 * PURPOSE: These tests MUST FAIL on unfixed code to prove the bug exists.
 * 
 * EXPECTED FAILURES:
 * - GET /protected returns 400 instead of 401 for missing token
 * - GET /protected returns 404 instead of 401 for invalid token
 * - POST /api/v1/auth/login returns 403 instead of 200 (tenant context incorrectly required)
 * - POST /api/v1/auth/refresh returns 403 instead of 200 
 * - GET /health returns 403 instead of 200 (should not require tenant context)
 * 
 * Bug Condition: Authentication middleware returns wrong HTTP status codes
 * and incorrectly enforces tenant context on auth/health endpoints.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../../app.module';

describe('Category 2: Authentication Middleware - Bug Exploration', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  /**
   * Exploration Test 2.1: Missing Token Returns Wrong Status
   * EXPECTED TO FAIL: Returns 400 instead of 401
   */
  it('should return 401 Unauthorized for missing authentication token', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/employees')
      .expect(401); // BUG: Currently returns 400

    expect(response.body).toHaveProperty('statusCode', 401);
    expect(response.body).toHaveProperty('message');
    expect(['Unauthorized', 'Missing or invalid authentication token']).toContain(
      response.body.message || response.body.error
    );
  });

  /**
   * Exploration Test 2.2: Invalid Token Returns Wrong Status
   * EXPECTED TO FAIL: Returns 404 instead of 401
   */
  it('should return 401 Unauthorized for invalid authentication token', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/employees')
      .set('Authorization', 'Bearer invalid-token-12345')
      .expect(401); // BUG: Currently returns 404

    expect(response.body).toHaveProperty('statusCode', 401);
    expect(response.body.message).toMatch(/unauthorized|invalid.*token/i);
  });

  /**
   * Exploration Test 2.3: Malformed Token Returns Wrong Status
   * EXPECTED TO FAIL: Returns 400 instead of 401
   */
  it('should return 401 Unauthorized for malformed authentication token', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/clients')
      .set('Authorization', 'NotBearer malformed')
      .expect(401); // BUG: Currently returns 400

    expect(response.body).toHaveProperty('statusCode', 401);
  });

  /**
   * Exploration Test 2.4: Login Endpoint Incorrectly Blocked by Tenant Context
   * EXPECTED TO FAIL: Returns 403 instead of allowing login (200 for valid, 401 for invalid)
   */
  it('should allow login without tenant context header', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'test@example.com',
        password: 'testpassword123'
      });

    // BUG: Currently returns 403 because tenant context middleware is applied
    // Expected: Should return 401 for invalid credentials OR 200 for valid credentials
    // Should NOT return 403 (tenant context should not be required for login)
    expect([200, 401]).toContain(response.status);
    expect(response.status).not.toBe(403);
  });

  /**
   * Exploration Test 2.5: Refresh Token Endpoint Incorrectly Blocked
   * EXPECTED TO FAIL: Returns 403 instead of processing refresh request
   */
  it('should allow token refresh without tenant context header', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({
        refreshToken: 'some-refresh-token'
      });

    // BUG: Currently returns 403 
    // Expected: Should return 401 for invalid token OR 200 for valid token
    // Should NOT return 403 (tenant context should not be required for refresh)
    expect([200, 401]).toContain(response.status);
    expect(response.status).not.toBe(403);
  });

  /**
   * Exploration Test 2.6: Health Endpoint Incorrectly Requires Tenant Context
   * EXPECTED TO FAIL: Returns 403 instead of 200
   */
  it('should allow health check without authentication or tenant context', async () => {
    const response = await request(app.getHttpServer())
      .get('/health')
      .expect(200); // BUG: Currently returns 403

    expect(response.body).toHaveProperty('status');
    expect(['ok', 'healthy', 'up']).toContain(response.body.status);
  });

  /**
   * Exploration Test 2.7: API Health Endpoint Incorrectly Requires Tenant Context
   * EXPECTED TO FAIL: Returns 403 instead of 200
   */
  it('should allow /api/health check without authentication or tenant context', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/health')
      .expect(200); // BUG: Currently returns 403

    expect(response.body).toBeDefined();
  });

  /**
   * Exploration Test 2.8: Versioned Health Endpoint Incorrectly Requires Tenant Context
   * EXPECTED TO FAIL: Returns 403 instead of 200
   */
  it('should allow /api/v1/health check without authentication or tenant context', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/health')
      .expect(200); // BUG: Currently returns 403

    expect(response.body).toBeDefined();
  });

  /**
   * Exploration Test 2.9: WWW-Authenticate Header Missing
   * EXPECTED TO FAIL: 401 response missing WWW-Authenticate header
   */
  it('should include WWW-Authenticate header in 401 responses', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/employees');

    // BUG: May return wrong status AND missing header
    if (response.status === 401) {
      expect(response.headers['www-authenticate']).toBeDefined();
      expect(response.headers['www-authenticate']).toMatch(/Bearer/i);
    } else {
      // If not 401, test documents the wrong status code
      expect(response.status).toBe(401);
    }
  });

  /**
   * Exploration Test 2.10: Protected Endpoint with Expired Token
   * EXPECTED TO FAIL: Returns wrong status code
   */
  it('should return 401 for expired authentication token', async () => {
    // Use a token that's clearly expired (JWT with exp in the past)
    const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwiZXhwIjoxNTE2MjM5MDIyfQ.1234567890';
    
    const response = await request(app.getHttpServer())
      .get('/api/v1/employees')
      .set('Authorization', `Bearer ${expiredToken}`);

    // BUG: May return 400, 404, or other wrong status
    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty('statusCode', 401);
  });
});
