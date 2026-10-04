import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';
import { SecurityMiddleware } from './common/middleware/security.middleware';
import { RequestSizeLimitMiddleware } from './common/middleware/request-size-limit.middleware';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import * as express from 'express';
import helmet from 'helmet';
import * as fs from 'fs';
import * as path from 'path';

async function bootstrap() {
  const configService = new ConfigService();
  
  const app = await NestFactory.create(AppModule, {
    // Enable HTTPS in production
    httpsOptions: process.env.NODE_ENV === 'production' ? {
      // Add your SSL certificates here for production
    } : undefined,
  });

  // Request size limits for security
  app.use('/api', express.json({ limit: '10mb' }));
  app.use('/api', express.urlencoded({ limit: '10mb', extended: true }));
  app.use('/api', express.raw({ limit: '10mb' }));
  app.use('/api', express.text({ limit: '10mb' }));

  // Apply Helmet security middleware first
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    },
    xssFilter: false, // Disable legacy XSS protection (modern approach)
    referrerPolicy: { policy: 'no-referrer' }
  }));

  // Security middleware - order matters (apply after Helmet)
  app.use(new RequestSizeLimitMiddleware().use);
  app.use(new SecurityMiddleware().use);
  app.use(new RequestIdMiddleware().use);

  // Global logging interceptor for audit trails
  app.useGlobalInterceptors(new LoggingInterceptor());

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
    maxAge: 86400, // 24 hours
  });

  // API versioning
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
    prefix: 'v',
  });

  // Enhanced global validation pipe with security configuration
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
      // Enhanced validation options
      skipMissingProperties: false,
      skipNullProperties: false,
      skipUndefinedProperties: false,
      stopAtFirstError: false,
      transformOptions: {
        enableImplicitConversion: false, // Strict type conversion
      },
    }),
  );

  // Global prefix for API routes
  app.setGlobalPrefix('api');

  // Swagger API documentation with comprehensive security and documentation
  if (process.env.NODE_ENV !== 'production') {
    const { ApiDocsGenerator } = require('./common/utils/api-docs-generator');
    
    const document = ApiDocsGenerator.setupSwagger(app);
    
    // Custom CSS for better documentation appearance
    const customCss = `
      .swagger-ui .topbar { display: none; }
      .swagger-ui .info { margin: 20px 0; }
      .swagger-ui .info .title { color: #1f2937; }
      .swagger-ui .scheme-container { background: #f8fafc; padding: 15px; border-radius: 8px; }
    `;

    SwaggerModule.setup('api/docs', app, document, {
      customCss,
      customSiteTitle: 'Workforce & Payroll API Documentation',
      customfavIcon: '/favicon.ico',
      swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true,
        docExpansion: 'none',
        filter: true,
        showRequestHeaders: true,
        tryItOutEnabled: true,
        supportedSubmitMethods: ['get', 'post', 'put', 'patch', 'delete'],
        validatorUrl: null,
        defaultModelsExpandDepth: 2,
        defaultModelExpandDepth: 2,
        displayOperationId: true,
        showExtensions: true,
        showCommonExtensions: true,
      },
      explorer: true,
    });
    
    // Generate comprehensive documentation files
    ApiDocsGenerator.generateDocumentationFiles(document);
  }

  const port = configService.get('PORT') || 3005;

  await app.listen(port);
  
  console.log(`🚀 Application is running on: http://localhost:${port}/api/v1`);
  console.log(`📚 API Documentation: http://localhost:${port}/api/docs`);
  console.log(`🔒 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🛡️  Enhanced security headers enabled`);
  console.log(`🛡️  Request size limits: 10MB max`);
  console.log(`📝 Request logging and audit trails enabled`);
  console.log(`⚡ Rate limiting enabled`);
  console.log(`🔐 CORS configured for secure cross-origin requests`);
  console.log(`🔒 Input validation and sanitization enabled`);
}

bootstrap().catch(error => {
  console.error('❌ Application failed to start:', error);
  process.exit(1);
});
