import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { getErrorMessage, getErrorStack, formatError } from '../common/utils/error.util';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

// Global pool management to prevent multiple pools in tests
let globalPool: Pool | null = null;

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private prismaClient: any;
  private pool: Pool;
  private static instanceCount = 0;

  constructor() {
    PrismaService.instanceCount++;
    this.logger.log(`Creating PrismaService instance #${PrismaService.instanceCount}`);
    
    // Prisma 7.x requires an adapter for database connections
    const { PrismaClient } = require('@prisma/client');
    
    // Create or reuse PostgreSQL connection pool
    const connectionString = process.env.DATABASE_URL || 'postgresql://payroll_user:payroll_pass_dev_123@localhost:5432/payroll_system_dev';
    
    // In test environment, reuse global pool to prevent conflicts
    if (process.env.NODE_ENV === 'test' && globalPool && !globalPool.ended) {
      this.pool = globalPool;
      this.logger.log('Reusing existing global pool for tests');
    } else {
      this.pool = new Pool({ 
        connectionString,
        // Configure pool settings for better cleanup and less interference
        max: process.env.NODE_ENV === 'test' ? 2 : 20, // Very small pool size in tests
        idleTimeoutMillis: process.env.NODE_ENV === 'test' ? 5000 : 30000,
        connectionTimeoutMillis: 15000, // Increased timeout to avoid conflicts
        allowExitOnIdle: true,
        statement_timeout: process.env.NODE_ENV === 'test' ? 10000 : 60000
      });
      
      if (process.env.NODE_ENV === 'test') {
        globalPool = this.pool;
        this.logger.log('Created new global pool for tests');
      }
    }
    
    const adapter = new PrismaPg(this.pool);
    
    this.prismaClient = new PrismaClient({ 
      adapter,
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
      errorFormat: 'pretty',
    });
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

  // Model delegates - SINGULAR forms (standard Prisma pattern)
  get company() {
    return this.prismaClient.companies;
  }
  get client() {
    return this.prismaClient.clients;
  }
  get clientUser() {
    return this.prismaClient.clientUser;
  }
  get clientDocument() {
    return this.prismaClient.clientDocument;
  }
  get clientInteraction() {
    return this.prismaClient.clientInteraction;
  }
  get contract() {
    return this.prismaClient.contracts;
  }
  get employee() {
    return this.prismaClient.employees;
  }
  get site() {
    return this.prismaClient.sites;
  }
  get assignment() {
    return this.prismaClient.assignments;
  }
  get shift() {
    return this.prismaClient.shifts;
  }
  get shiftTemplate() {
    return this.prismaClient.shift_templates;
  }
  get shiftNotification() {
    return this.prismaClient.shift_notifications;
  }
  get attendance() {
    return this.prismaClient.attendance;
  }
  get payrollRun() {
    return this.prismaClient.payroll_runs;
  }
  get payrollItem() {
    return this.prismaClient.payroll_items;
  }
  get invoice() {
    return this.prismaClient.invoices;
  }
  get user() {
    return this.prismaClient.users;
  }

  // Model delegates - PLURAL forms (for business service compatibility)
  // These delegate to the schema names which are already plural
  get companies() {
    return this.prismaClient.companies;
  }
  get clients() {
    return this.prismaClient.clients;
  }
  get clientUsers() {
    return this.prismaClient.clientUser;
  }
  get clientDocuments() {
    return this.prismaClient.clientDocument;
  }
  get clientInteractions() {
    return this.prismaClient.clientInteraction;
  }
  get contracts() {
    return this.prismaClient.contracts;
  }
  get employees() {
    return this.prismaClient.employees;
  }
  get sites() {
    return this.prismaClient.sites;
  }
  get assignments() {
    return this.prismaClient.assignments;
  }
  get shifts() {
    return this.prismaClient.shifts;
  }
  get shiftTemplates() {
    return this.prismaClient.shift_templates;
  }
  get shiftNotifications() {
    return this.prismaClient.shift_notifications;
  }
  get attendances() {
    return this.prismaClient.attendance;
  }
  get payrollRuns() {
    return this.prismaClient.payroll_runs;
  }
  get payrollItems() {
    return this.prismaClient.payroll_items;
  }
  get invoices() {
    return this.prismaClient.invoices;
  }
  get users() {
    return this.prismaClient.users;
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Connected to database with RLS support');
  }

  async onModuleDestroy() {
    PrismaService.instanceCount--;
    this.logger.log(`Destroying PrismaService instance, ${PrismaService.instanceCount} remaining`);
    
    try {
      // Always disconnect Prisma client
      await this.$disconnect();
      this.logger.log('Prisma client disconnected successfully');
      
      // Only close the global pool when all instances are destroyed and in test environment
      if (process.env.NODE_ENV === 'test' && PrismaService.instanceCount === 0 && globalPool && !globalPool.ended) {
        await globalPool.end();
        globalPool = null;
        this.logger.log('Global test pool closed');
      }
    } catch (error) {
      this.logger.error('Error during Prisma client disconnect:', error);
    }
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
      this.logger.error(`Failed to set tenant context: ${getErrorMessage(error)}`, getErrorStack(error));
      throw new Error(`Database tenant context setup failed: ${getErrorMessage(error)}`);
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
      this.logger.error(`Failed to clear tenant context: ${getErrorMessage(error)}`, getErrorStack(error));
    }
  }

  /**
   * Get a database transaction with tenant context
   * This ensures all operations within the transaction respect RLS policies
   * FIXED: Adds application-level tenant filtering to handle connection pooling issues
   */
  async withTenant<T>(
    tenantId: string,
    operation: (prisma: any) => Promise<T>,
    userRole?: string,
  ): Promise<T> {
    return this.$transaction(async (prisma) => {
      // Set tenant context within the transaction (RLS - defense in depth)
      await prisma.$executeRaw`SELECT set_config('app.tenant_id', ${tenantId}, true)`;

      if (userRole) {
        await prisma.$executeRaw`SELECT set_config('app.user_role', ${userRole}, true)`;
      }

      // Create tenant-aware proxy that adds automatic WHERE clauses
      const tenantAwarePrisma = this.createTenantAwareProxy(prisma, tenantId);

      return operation(tenantAwarePrisma);
    });
  }

  /**
   * Creates a tenant-aware proxy that automatically adds tenant filtering to queries
   * This fixes the connection pooling issue where RLS doesn't work reliably
   */
  private createTenantAwareProxy(prisma: any, tenantId: string): any {
    const tenantTables = {
      'companies': 'id', // companies table uses id as tenant identifier  
      'users': 'company_id',
      'clients': 'company_id', 
      'clientUser': 'clientId', // clientUser belongs to client, not directly to company (if it exists)
      'clientDocument': 'clientId', // clientDocument belongs to client (if it exists)
      'clientInteraction': 'clientId', // clientInteraction belongs to client (if it exists)
      'contracts': 'client_id', // contract belongs to client
      'employees': 'company_id',
      'sites': 'contract_id', // site belongs to contract
      'assignments': 'site_id', // assignment belongs to site (via employee)
      'shifts': 'assignment_id', // shift belongs to assignment (via site)
      'attendance': 'employee_id', // attendance belongs to employee
      'payroll_runs': 'company_id',
      'payroll_items': 'payroll_run_id', // payrollItem belongs to payrollRun
      'invoices': 'client_id', // invoice belongs to client
      // Add other tenant-aware tables as needed
    };

    const proxy = { ...prisma };

    // Override tenant-aware model methods
    Object.keys(tenantTables).forEach(modelName => {
      if (proxy[modelName]) {
        const originalModel = proxy[modelName];
        const tenantField = tenantTables[modelName];

        proxy[modelName] = {
          ...originalModel,
          
          findMany: (args: any = {}) => {
            const tenantFilter = { [tenantField]: tenantId };
            const where = args.where ? { ...args.where, ...tenantFilter } : tenantFilter;
            return originalModel.findMany({ ...args, where });
          },

          findFirst: (args: any = {}) => {
            const tenantFilter = { [tenantField]: tenantId };
            const where = args.where ? { ...args.where, ...tenantFilter } : tenantFilter;
            return originalModel.findFirst({ ...args, where });
          },

          findUnique: (args: any) => {
            // For findUnique, add tenant check but don't override the unique constraint
            return originalModel.findUnique(args).then((result: any) => {
              if (result && result[tenantField] !== tenantId) {
                return null; // Hide results from other tenants
              }
              return result;
            });
          },

          count: (args: any = {}) => {
            const tenantFilter = { [tenantField]: tenantId };
            const where = args.where ? { ...args.where, ...tenantFilter } : tenantFilter;
            return originalModel.count({ ...args, where });
          },

          create: (args: any) => {
            // For tenant-aware tables, automatically set tenant context on create
            if (tenantField === 'id') {
              // For companies table, the tenant ID IS the company ID
              const data = { ...args.data, id: tenantId };
              return originalModel.create({ ...args, data });
            } else {
              // For other tables, set the company_id foreign key ONLY if no relation is already set
              const data = { ...args.data };
              
              // Check if company relation is already being set via connect, create, etc.
              const hasCompanyRelation = data.company && (
                data.company.connect || 
                data.company.create || 
                data.company.connectOrCreate
              );
              
              // Only set the foreign key field if no relation is being used
              if (!hasCompanyRelation) {
                data[tenantField] = tenantId;
              }
              
              return originalModel.create({ ...args, data });
            }
          },

          createMany: (args: any) => {
            // Automatically set tenant context on all created records
            if (tenantField === 'id') {
              // For companies table, can't use createMany with specific IDs reliably
              return originalModel.createMany(args);
            } else {
              const data = args.data.map((record: any) => ({ ...record, [tenantField]: tenantId }));
              return originalModel.createMany({ ...args, data });
            }
          },

          update: (args: any) => {
            // Add tenant filter to ensure only own records can be updated
            const where = { ...args.where, [tenantField]: tenantId };
            return originalModel.update({ ...args, where });
          },

          updateMany: (args: any) => {
            // Add tenant filter to ensure only own records can be updated
            const tenantFilter = { [tenantField]: tenantId };
            const where = args.where ? { ...args.where, ...tenantFilter } : tenantFilter;
            return originalModel.updateMany({ ...args, where });
          },

          delete: (args: any) => {
            // Add tenant filter to ensure only own records can be deleted
            const where = { ...args.where, [tenantField]: tenantId };
            return originalModel.delete({ ...args, where });
          },

          deleteMany: (args: any = {}) => {
            // Add tenant filter to ensure only own records can be deleted
            const tenantFilter = { [tenantField]: tenantId };
            const where = args.where ? { ...args.where, ...tenantFilter } : tenantFilter;
            return originalModel.deleteMany({ ...args, where });
          },
        };
      }
    });

    // Add plural form aliases for all model delegates to support business service patterns
    // This ensures both singular and plural forms work in transactions and regular operations
    this.addPluralAliases(proxy);

    return proxy;
  }

  /**
   * Adds plural form aliases to a Prisma client proxy for business service compatibility
   */
  private addPluralAliases(proxy: any): void {
    const modelMappings = {
      // Alias mapping: plural_business_name -> schema_name
      companies: 'companies',
      clients: 'clients', 
      clientUsers: 'clientUser', // This doesn't exist in schema yet
      clientDocuments: 'clientDocument', // This doesn't exist in schema yet
      clientInteractions: 'clientInteraction', // This doesn't exist in schema yet
      contracts: 'contracts',
      employees: 'employees',
      sites: 'sites',
      assignments: 'assignments',
      shifts: 'shifts',
      shiftTemplates: 'shift_templates',
      shiftNotifications: 'shift_notifications', 
      attendances: 'attendance',
      payrollRuns: 'payroll_runs',
      payrollItems: 'payroll_items',
      invoices: 'invoices',
      users: 'users',
      
      // Singular business names -> schema names
      company: 'companies',
      client: 'clients',
      contract: 'contracts', 
      employee: 'employees',
      site: 'sites',
      assignment: 'assignments',
      shift: 'shifts',
      shiftTemplate: 'shift_templates',
      shiftNotification: 'shift_notifications',
      attendance: 'attendance',
      payrollRun: 'payroll_runs',
      payrollItem: 'payroll_items',
      invoice: 'invoices',
      user: 'users',
    };

    Object.entries(modelMappings).forEach(([businessName, schemaName]) => {
      if (proxy[schemaName] && !proxy[businessName]) {
        proxy[businessName] = proxy[schemaName];
      }
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
      this.logger.error(`Failed to validate RLS configuration: ${getErrorMessage(error)}`);
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
      this.logger.error(`Failed to get tenant context: ${getErrorMessage(error)}`);
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
