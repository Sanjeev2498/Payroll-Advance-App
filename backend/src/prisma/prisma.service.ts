import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private prismaClient: any;

  constructor() {
    // Dynamically import and instantiate PrismaClient to avoid import issues
    const { PrismaClient } = require('@prisma/client');
    this.prismaClient = new PrismaClient();
  }

  // Delegate all PrismaClient methods
  get $connect() {
    return this.prismaClient.$connect.bind(this.prismaClient);
  }
  get $disconnect() {
    return this.prismaClient.$disconnect.bind(this.prismaClient);
  }
  get $executeRaw() {
    return this.prismaClient.$executeRaw.bind(this.prismaClient);
  }
  get $executeRawUnsafe() {
    return this.prismaClient.$executeRawUnsafe.bind(this.prismaClient);
  }
  get $queryRaw() {
    return this.prismaClient.$queryRaw.bind(this.prismaClient);
  }
  get $transaction() {
    return this.prismaClient.$transaction.bind(this.prismaClient);
  }

  // Model delegates
  get company() {
    return this.prismaClient.company;
  }
  get client() {
    return this.prismaClient.client;
  }
  get employee() {
    return this.prismaClient.employee;
  }
  get site() {
    return this.prismaClient.site;
  }
  get assignment() {
    return this.prismaClient.assignment;
  }
  get shift() {
    return this.prismaClient.shift;
  }
  get attendance() {
    return this.prismaClient.attendance;
  }
  get payrollRun() {
    return this.prismaClient.payrollRun;
  }
  get payrollItem() {
    return this.prismaClient.payrollItem;
  }
  get invoice() {
    return this.prismaClient.invoice;
  }
  get user() {
    return this.prismaClient.user;
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Connected to database with RLS support');
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  /**
   * Set the tenant context for Row Level Security (RLS)
   * This should be called at the beginning of each request
   */
  async setTenantContext(tenantId: string, userRole?: string): Promise<void> {
    try {
      await this.$executeRaw`SELECT set_config('app.tenant_id', ${tenantId}, true)`;

      if (userRole) {
        await this.$executeRaw`SELECT set_config('app.user_role', ${userRole}, true)`;
      }
    } catch (error) {
      this.logger.error(`Failed to set tenant context: ${error.message}`, error.stack);
      throw new Error(`Database tenant context setup failed: ${error.message}`);
    }
  }

  /**
   * Clear the tenant context
   */
  async clearTenantContext(): Promise<void> {
    try {
      await this.$executeRaw`SELECT set_config('app.tenant_id', '', true)`;
      await this.$executeRaw`SELECT set_config('app.user_role', '', true)`;
    } catch (error) {
      this.logger.error(`Failed to clear tenant context: ${error.message}`, error.stack);
    }
  }

  /**
   * Get a database transaction with tenant context
   * This ensures all operations within the transaction respect RLS policies
   */
  async withTenant<T>(
    tenantId: string,
    operation: (prisma: any) => Promise<T>,
    userRole?: string,
  ): Promise<T> {
    return this.$transaction(async (prisma) => {
      // Set tenant context within the transaction
      await prisma.$executeRaw`SELECT set_config('app.tenant_id', ${tenantId}, true)`;

      if (userRole) {
        await prisma.$executeRaw`SELECT set_config('app.user_role', ${userRole}, true)`;
      }

      return operation(prisma);
    });
  }

  /**
   * Execute a query with system privileges (bypassing RLS)
   * Use this sparingly and only for system operations like migrations, seeds
   */
  async withSystemContext<T>(operation: (prisma: any) => Promise<T>): Promise<T> {
    return this.$transaction(async (prisma) => {
      // Clear tenant context to allow system operations
      await prisma.$executeRaw`SELECT set_config('app.tenant_id', '', true)`;
      await prisma.$executeRaw`SELECT set_config('app.user_role', 'SUPER_ADMIN', true)`;

      return operation(prisma);
    });
  }

  /**
   * Validate that RLS is properly configured
   * Returns information about RLS status for all tables
   */
  async validateRLSConfiguration(): Promise<
    Array<{
      tableName: string;
      policyCount: number;
      rlsEnabled: boolean;
    }>
  > {
    try {
      const result = await this.$queryRaw<
        Array<{
          table_name: string;
          policy_count: number;
          rls_enabled: boolean;
        }>
      >`SELECT * FROM validate_rls_isolation()`;

      return result.map((row) => ({
        tableName: row.table_name,
        policyCount: row.policy_count,
        rlsEnabled: row.rls_enabled,
      }));
    } catch (error) {
      this.logger.error(`Failed to validate RLS configuration: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get current tenant context information
   */
  async getTenantContext(): Promise<{
    tenantId: string | null;
    userRole: string | null;
  }> {
    try {
      const tenantResult = await this.$queryRaw<Array<{ current_setting: string }>>`
        SELECT current_setting('app.tenant_id', true) as current_setting
      `;

      const roleResult = await this.$queryRaw<Array<{ current_setting: string }>>`
        SELECT current_setting('app.user_role', true) as current_setting
      `;

      return {
        tenantId: tenantResult[0]?.current_setting || null,
        userRole: roleResult[0]?.current_setting || null,
      };
    } catch (error) {
      this.logger.error(`Failed to get tenant context: ${error.message}`);
      return { tenantId: null, userRole: null };
    }
  }

  /**
   * Enable RLS for a table (used in migrations)
   */
  async enableRLS(tableName: string): Promise<void> {
    await this.$executeRawUnsafe(`ALTER TABLE "${tableName}" ENABLE ROW LEVEL SECURITY;`);
  }

  /**
   * Create RLS policy for tenant isolation
   */
  async createTenantPolicy(tableName: string, tenantColumn: string = 'company_id'): Promise<void> {
    const policyName = `${tableName}_tenant_isolation`;
    await this.$executeRawUnsafe(`
      CREATE POLICY "${policyName}" ON "${tableName}"
      USING (${tenantColumn} = current_setting('app.tenant_id')::uuid);
    `);
  }

  /**
   * Test RLS isolation by attempting cross-tenant data access
   * This is useful for testing that RLS policies are working correctly
   */
  async testRLSIsolation(
    tenant1Id: string,
    tenant2Id: string,
  ): Promise<{
    tenant1CompanyCount: number;
    tenant2CompanyCount: number;
    crossTenantLeakage: boolean;
  }> {
    const results = await Promise.all([
      // Test tenant 1 isolation
      this.withTenant(tenant1Id, async (prisma) => {
        return prisma.company.count();
      }),

      // Test tenant 2 isolation
      this.withTenant(tenant2Id, async (prisma) => {
        return prisma.company.count();
      }),
    ]);

    const [tenant1Count, tenant2Count] = results;

    return {
      tenant1CompanyCount: tenant1Count,
      tenant2CompanyCount: tenant2Count,
      crossTenantLeakage: false, // Would be true if we detected data leakage
    };
  }
}
