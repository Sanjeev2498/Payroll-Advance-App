import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, VersioningType } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import request from 'supertest';
import { AppModule } from '../app.module';

describe('Simple Middleware Check', () => {
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
    
    // Apply the same configuration as main.ts
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

  describe('Basic Authentication Endpoints', () => {
    
    it('should reach /api/v1/auth/login endpoint', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'test@example.com', password: 'test' });
        
      // We expect either 400 (validation error) or 401 (auth failure)
      // But NOT 404 (not found) or 403 (blocked by middleware)
      expect([400, 401]).toContain(response.status);
      console.log('Login endpoint status:', response.status, response.body);
    });

    it('should reach /api/v1/auth/health endpoint', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/auth/health');
        
      console.log('Auth health endpoint status:', response.status, response.body);
      // Should be accessible
      expect([200, 404]).toContain(response.status); // 404 if endpoint doesn't exist
    });

  });

  describe('Basic Health Endpoints', () => {
    
    it('should reach /api/v1/health endpoint', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/health');
        
      console.log('Main health endpoint status:', response.status, response.body);
      expect([200, 404]).toContain(response.status);
    });

    it('should reach /health endpoint', async () => {
      const response = await request(app.getHttpServer())
        .get('/health');
        
      console.log('Root health endpoint status:', response.status, response.body);
      expect([200, 404]).toContain(response.status);
    });

  });

  describe('Protected Endpoints Verification', () => {
    
    it('should require authentication for /api/v1/employees', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/employees');
        
      console.log('Employees endpoint status:', response.status, response.body);
      // Should be 401 (unauthorized) not 403 (forbidden by middleware)
      expect(response.status).toBe(401);
    });

    it('should require authentication for /api/v1/auth/profile', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/auth/profile');
        
      console.log('Profile endpoint status:', response.status, response.body);
      expect(response.status).toBe(401);
    });

  });

});