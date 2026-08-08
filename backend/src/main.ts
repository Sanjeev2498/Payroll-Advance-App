import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';
import { SecurityMiddleware } from './common/middleware/security.middleware';

async function bootstrap() {
  const configService = new ConfigService();
  
  const app = await NestFactory.create(AppModule);

  // Security headers middleware
  app.use(new SecurityMiddleware().use);

  // Request ID middleware for tracing
  app.use(new RequestIdMiddleware().use);

  // CORS configuration for development and production
  app.enableCors({
    origin: process.env.NODE_ENV === 'production' 
      ? process.env.FRONTEND_URLS?.split(',') || ['https://your-domain.com']
      : ['http://localhost:3002', 'http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type', 
      'Authorization', 
      'X-Requested-With',
      'X-Request-ID',
      'X-Correlation-ID'
    ],
    exposedHeaders: [
      'X-Request-ID',
      'X-Correlation-ID',
      'X-RateLimit-Limit',
      'X-RateLimit-Remaining',
      'X-RateLimit-Reset'
    ],
  });

  // API versioning
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
    prefix: 'v',
  });

  // Global validation pipe with enhanced configuration
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      disableErrorMessages: process.env.NODE_ENV === 'production',
      validationError: {
        target: false,
        value: false,
      },
    }),
  );

  // Global prefix for API routes
  app.setGlobalPrefix('api');

  // Swagger API documentation
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Security Workforce & Payroll Management API')
      .setDescription('Comprehensive API for workforce operations, payroll processing, and client management')
      .setVersion('1.0')
      .addBearerAuth()
      .addApiKey(
        {
          type: 'apiKey',
          name: 'X-API-Key',
          in: 'header',
        },
        'api-key',
      )
      .addTag('Authentication', 'User authentication and authorization')
      .addTag('Clients', 'Client management and relationships')
      .addTag('Employees', 'Employee lifecycle and skills management')
      .addTag('Sites', 'Site operations and requirements')
      .addTag('Assignments', 'Workforce assignment and scheduling')
      .addTag('Attendance', 'Real-time attendance tracking')
      .addTag('Payroll', 'Payroll processing and calculations')
      .addTag('Billing', 'Client billing and invoicing')
      .addTag('Dashboard', 'Operational dashboards and analytics')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true,
        docExpansion: 'none',
        filter: true,
        showRequestHeaders: true,
      },
    });
  }

  const port = configService.get('PORT') || 3005;

  await app.listen(port);
  
  console.log(`🚀 Application is running on: http://localhost:${port}/api/v1`);
  console.log(`📚 API Documentation: http://localhost:${port}/api/docs`);
  console.log(`🔒 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🛡️  Security headers enabled`);
  console.log(`📝 Request logging enabled`);
  console.log(`⚡ Rate limiting enabled`);
}

bootstrap().catch(error => {
  console.error('❌ Application failed to start:', error);
  process.exit(1);
});
