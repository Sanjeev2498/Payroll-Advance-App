import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';

@Injectable()
export class AppService {
  constructor(private readonly prisma: PrismaService) {}

  getHello(): string {
    return 'Security Workforce & Payroll Management System API - v1.0.0';
  }

  async getDatabaseStatus() {
    try {
      // Test database connection with a simple query
      await this.prisma.$queryRaw`SELECT 1 as test`;

      // Get database version
      const result = (await this.prisma.$queryRaw`SELECT version() as db_version`) as any[];
      const version = result[0]?.db_version || 'Unknown';

      // Count tables in the schema
      const tables = (await this.prisma.$queryRaw`
        SELECT COUNT(*) as table_count 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
      `) as any[];

      return {
        status: 'connected',
        version: version.split(' ')[1] || 'Unknown',
        tableCount: parseInt(tables[0]?.table_count || '0'),
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: 'error',
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }
}
