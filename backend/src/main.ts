import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Security middleware
  app.use(helmet());
  
  // Enable CORS with appropriate configuration
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  });

  // Global validation pipe with transformation
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Global prefix for API routes
  app.setGlobalPrefix('api/v1');

  const configService = app.get(ConfigService);
  const port = configService.get('PORT') || 4000;

  await app.listen(port);
  console.log(`🚀 Application is running on: http://localhost:${port}/api/v1`);
}

bootstrap();