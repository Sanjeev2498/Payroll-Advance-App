import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { Public } from './auth/decorators/public.decorator';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Public()
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Public()
  @Get('health')
  getHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'Security Workforce & Payroll Management System',
      version: '1.0.0',
    };
  }

  @Public()
  @Get('health/database')
  async getDatabaseHealth() {
    return this.appService.getDatabaseStatus();
  }
}
