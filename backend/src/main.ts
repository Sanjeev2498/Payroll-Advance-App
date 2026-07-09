import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap() {
  const configService = new ConfigService();
  
  const app = await NestFactory.create(AppModule);

  // Simple CORS configuration for development
  app.enableCors({
    origin: ['http://localhost:3002', 'http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Global prefix for API routes
  app.setGlobalPrefix('api/v1');

  const port = configService.get('PORT') || 3005;

  await app.listen(port);
  
  console.log(`🚀 Application is running on: http://localhost:${port}/api/v1`);
  console.log(`🔒 Using Express adapter for compatibility`);
  console.log(`🛡️  Transport: HTTP (development)`);
}

bootstrap().catch(error => {
  console.error('❌ Application failed to start:', error);
  process.exit(1);
});
