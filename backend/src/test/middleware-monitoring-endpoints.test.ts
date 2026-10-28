import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, VersioningType } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import request from 'supertest';
import { AppModule } from '../app.module';

describe('Middleware Monitoring Endpoints', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        AppModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.enableVersioning({
      type: VersioningType.URI,
      defaultVersion: '1',
      prefix: 'v',
    });
    
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Task 3.4: Additional Health Check Verification', () => {
    
    it('should allow /api/v1/health/database without tenant context', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/health/database');
        
      console.log('Database health endpoint:', response.status, response.body);
      // Should not be blocked by middleware (may fail for other reasons)
      expect(response.status).not.toBe(403);
    });

    it('should allow monitoring endpoints without tenant context', async () => {
      const monitoringPaths = [
        '/api/v1/monitoring/health',
        '/api/v1/monitoring/metrics',
        '/api/v1/monitoring/stats',
        '/api/v1/monitoring/performance',
        '/api/v1/monitoring/errors'
      ];

      for (const path of monitoringPaths) {
        const response = await request(app.getHttpServer())
          .get(path);
          
        console.log(`Monitoring endpoint ${path}:`, response.status);
        // Should not be blocked by tenant middleware (404 is acceptable)
        expect(response.status).not.toBe(403);
      }
    });

    it('should allow supervisor portal health endpoint without tenant context', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/supervisor-portal/sites/health');
        
      console.log('Supervisor portal health:', response.status, response.body);
      // Should not be blocked by middleware
      expect(response.status).not.toBe(403);
    });

  });

  describe('Task 3.4: Tenant Context Still Applied to Protected Resources', () => {
    
    it('should still protect non-public endpoints', async () => {
      const protectedPaths = [
        '/api/v1/payroll',
        '/api/v1/attendance/submit',
        '/api/v1/users'
      ];

      for (const path of protectedPaths) {
        const response = await request(app.getHttpServer())
          .get(path);
          
        console.log(`Protected endpoint ${path}:`, response.status);
        // Should require authentication but not be blocked by middleware
        expect([401, 400, 404]).toContain(response.status); // Not 403 (middleware blocked)
      }
    });

  });

});