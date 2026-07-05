import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { Controller, Get, Module } from '@nestjs/common';

@Controller()
class TestController {
  @Get('test')
  test() {
    return { message: 'Test successful', timestamp: new Date().toISOString() };
  }
}

@Module({
  controllers: [TestController],
})
class TestModule {}

async function testBootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    TestModule,
    new FastifyAdapter({
      logger: true
    })
  );

  app.enableCors();
  
  await app.listen(3002, '0.0.0.0');
  console.log('🧪 Test server running on: http://localhost:3002');
}

testBootstrap().catch(console.error);
