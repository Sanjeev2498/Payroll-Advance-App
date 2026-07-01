import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import helmet from '@fastify/helmet';
import { AppModule } from './app.module';
import * as fs from 'fs';
import * as path from 'path';

async function bootstrap() {
  const configService = new ConfigService();
  
  // HTTPS Configuration for production
  const httpsOptions = getHttpsOptions(configService);
  
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule, 
    new FastifyAdapter({ 
      https: httpsOptions,
      logger: configService.get('NODE_ENV') === 'development',
      trustProxy: false, // Disable proxy trust that might cause upgrade issues
      ignoreTrailingSlash: true,
      caseSensitive: false
    })
  );

  // Enhanced security middleware (Fastify version) - Temporarily disabled for testing
  if (configService.get('NODE_ENV') === 'production') {
    await app.register(helmet, {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
          fontSrc: ["'self'", 'https://fonts.gstatic.com'],
          imgSrc: ["'self'", 'data:', 'https:'],
          scriptSrc: ["'self'"],
          connectSrc: ["'self'"],
        },
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
      }
    });
  }
  // Commenting out helmet for development testing
  // else {
  //   // Relaxed security for development
  //   await app.register(helmet, {
  //     contentSecurityPolicy: false,
  //     hsts: false
  //   });
  // }

  // Enhanced CORS with security headers
  app.enableCors({
    origin: configService.get('CORS_ORIGIN')?.split(',') || ['http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['X-Total-Count', 'X-Rate-Limit-Remaining']
  });

  // Global validation pipe with enhanced security
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: false, // Prevent prototype pollution
      },
      validationError: {
        target: false, // Don't expose class info in errors
        value: false   // Don't expose values in errors
      }
    }),
  );

  // Global prefix for API routes
  app.setGlobalPrefix('api/v1');

  const port = configService.get('PORT') || 4000;
  const protocol = httpsOptions ? 'https' : 'http';

  await app.listen(port, '0.0.0.0');
  
  console.log(`🚀 Application is running on: ${protocol}://localhost:${port}/api/v1`);
  console.log(`🔒 Security Enhanced: Fastify + Helmet + Role-Based Encryption`);
  console.log(`🔐 Encryption: Field-level AES-256-GCM encryption active for sensitive data`);
  console.log(`🛡️  Transport: ${httpsOptions ? 'HTTPS/TLS enabled' : 'HTTP (development)'}`);
}

function getHttpsOptions(configService: ConfigService) {
  if (configService.get('NODE_ENV') === 'production') {
    const certPath = configService.get('SSL_CERT_PATH');
    const keyPath = configService.get('SSL_KEY_PATH');
    
    if (certPath && keyPath && fs.existsSync(certPath) && fs.existsSync(keyPath)) {
      return {
        key: fs.readFileSync(keyPath),
        cert: fs.readFileSync(certPath)
      };
    }
  }
  
  // For development - create self-signed certificate
  if (configService.get('ENABLE_HTTPS_DEV') === 'true') {
    const certDir = path.join(process.cwd(), 'ssl');
    const keyFile = path.join(certDir, 'dev-key.pem');
    const certFile = path.join(certDir, 'dev-cert.pem');
    
    if (fs.existsSync(keyFile) && fs.existsSync(certFile)) {
      return {
        key: fs.readFileSync(keyFile),
        cert: fs.readFileSync(certFile)
      };
    }
  }
  
  return null; // Use HTTP
}

bootstrap().catch(error => {
  console.error('❌ Application failed to start:', error);
  process.exit(1);
});
