import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantContextService } from '../../common/tenant-context.service';
import { RbacTestSetup } from './rbac-test-setup';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { Reflector } from '@nestjs/core';
import { EncryptionUtil } from '../../common/utils/encryption.util';
import { DataTransformService } from '../../common/services/data-transform.service';
import { AuthService } from '../../auth/auth.service';
import { JwtStrategy } from '../../auth/strategies/jwt.strategy';
import { JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { SiteRepository } from '../../common/repositories/site.repository';
import { ClientRepository } from '../../common/repositories/client.repository';
import { EmployeeRepository } from '../../common/repositories/employee.repository';
import { InvoiceService } from '../../billing/services/invoice.service';
import { GstCalculationService } from '../../billing/services/gst-calculation.service';
import { InvoiceCalculationService } from '../../billing/services/invoice-calculation.service';
import { BillingValidationService } from '../../billing/services/billing-validation.service';
import { InvoicePdfService } from '../../billing/services/invoice-pdf.service';
import { EmployeesService } from '../../employees/employees.service';
import { SitesService } from '../../sites/sites.service';
import { BillingService } from '../../billing/billing.service';
import { SupervisorPortalService } from '../../supervisor-portal/supervisor-portal.service';
import * as fc from 'fast-check';
import { randomUUID } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { Decimal } from 'decimal.js';

/**
 * Property Test Setup Helper
 * Provides standardized setup for property-based tests with proper tenant context
 * and comprehensive dependency injection chain completion
 */
export class PropertyTestSetup {
  /**
   * Resolve services using module.resolve() for scoped services instead of module.get()
   * This handles proper service resolution for dependency injection
   * CRITICAL FIX: Updated to properly handle different service types and provide better error context
   */
  static async resolveService<T>(module: TestingModule, serviceToken: any): Promise<T> {
    // First check if the service token is valid
    if (!serviceToken) {
      throw new Error('Service token cannot be null or undefined');
    }

    const serviceName = serviceToken?.name || serviceToken.toString();
    
    try {
      // For scoped services (like TenantContextService), use module.resolve()
      const scopedServices = ['TenantContextService', 'REQUEST', 'INQUIRER'];
      const isScoped = scopedServices.some(name => serviceName.includes(name));
      
      if (isScoped) {
        return await module.resolve<T>(serviceToken);
      }
      
      // For singleton services, use module.get()
      return module.get<T>(serviceToken);
    } catch (error) {
      // Enhanced error handling with service context
      const errorMessage = `Failed to resolve service ${serviceName}: ${(error as Error).message}`;
      console.warn(errorMessage);
      
      // For scoped services (like TenantContextService), use module.resolve()
      const scopedServices = ['TenantContextService', 'REQUEST', 'INQUIRER'];
      const isScoped = scopedServices.some(name => serviceName.includes(name));
      
      // Attempt alternative resolution method
      try {
        const alternative = isScoped ? module.get<T>(serviceToken) : await module.resolve<T>(serviceToken);
        console.log(`Successfully resolved ${serviceName} using alternative method`);
        return alternative;
      } catch (fallbackError) {
        throw new Error(`${errorMessage}. Alternative resolution also failed: ${(fallbackError as Error).message}`);
      }
    }
  }

  /**
   * Resolve multiple services with proper error handling
   */
  static async resolveServices<T extends Record<string, any>>(
    module: TestingModule, 
    serviceTokens: Record<keyof T, any>
  ): Promise<T> {
    const resolved = {} as T;
    
    for (const [key, token] of Object.entries(serviceTokens)) {
      resolved[key as keyof T] = await PropertyTestSetup.resolveService(module, token);
    }
    
    return resolved;
  }

  /**
   * Implement proper cleanup for property tests to avoid data leakage
   */
  static async performTestCleanup(
    module?: TestingModule, 
    prisma?: PrismaService, 
    tenantId?: string
  ): Promise<void> {
    const errors: string[] = [];

    try {
      // Clean up test data if prisma and tenantId are provided
      if (prisma && tenantId) {
        await PropertyTestSetup.cleanupTenantData(prisma, tenantId);
      }
    } catch (error) {
      errors.push(`Data cleanup failed: ${(error as Error).message}`);
    }

    try {
      // Clean up module and close connections
      if (module) {
        await module.close();
      }
    } catch (error) {
      errors.push(`Module cleanup failed: ${(error as Error).message}`);
    }

    // Clear any Jest mocks to prevent leakage between tests
    try {
      jest.clearAllMocks();
      jest.restoreAllMocks();
    } catch (error) {
      errors.push(`Mock cleanup failed: ${(error as Error).message}`);
    }

    if (errors.length > 0) {
      console.warn('Cleanup completed with warnings:', errors);
    }
  }

  /**
   * Performance optimization: Pre-calculate and cache heavy operations
   * to reduce test execution time
   */
  static optimizeTestExecution() {
    // Cache frequently generated data patterns to reduce computation
    const dataCache = new Map<string, any>();
    
    return {
      getCachedData: (key: string, generator: () => any) => {
        if (!dataCache.has(key)) {
          dataCache.set(key, generator());
        }
        return dataCache.get(key);
      },
      clearCache: () => dataCache.clear(),
    };
  }

  /**
   * Create repository mocks that return created entities
   * CRITICAL FIX: Store created entities and return them when queried
   */
  static createRepositoryMocks() {
    // Store created entities to return them in queries
    const createdEntities = {
      clients: new Map<string, any>(),
      sites: new Map<string, any>(),
      employees: new Map<string, any>(),
      attendance: new Map<string, any>()
    };

    const mockClientRepository = {
      findById: jest.fn().mockImplementation((id) => {
        return Promise.resolve(createdEntities.clients.get(id) || null);
      }),
      findMany: jest.fn().mockImplementation(() => ({
        clients: Array.from(createdEntities.clients.values()),
        total: createdEntities.clients.size,
        page: 1,
        limit: 20,
        totalPages: Math.ceil(createdEntities.clients.size / 20),
      })),
      findAll: jest.fn().mockImplementation(() => Promise.resolve(Array.from(createdEntities.clients.values()))),
      create: jest.fn().mockImplementation((data) => {
        const client = { id: randomUUID(), ...data };
        createdEntities.clients.set(client.id, client);
        return Promise.resolve(client);
      }),
      update: jest.fn().mockImplementation((id, data) => {
        const existing = createdEntities.clients.get(id);
        if (existing) {
          const updated = { ...existing, ...data };
          createdEntities.clients.set(id, updated);
          return Promise.resolve(updated);
        }
        return Promise.resolve(null);
      }),
      delete: jest.fn().mockImplementation((id) => {
        const deleted = createdEntities.clients.get(id);
        createdEntities.clients.delete(id);
        return Promise.resolve(deleted || { id });
      }),
    };

    const mockSiteRepository = {
      findById: jest.fn().mockImplementation((id) => {
        return Promise.resolve(createdEntities.sites.get(id) || null);
      }),
      findMany: jest.fn().mockImplementation(() => ({
        sites: Array.from(createdEntities.sites.values()),
        total: createdEntities.sites.size,
        page: 1,
        limit: 20,
        totalPages: Math.ceil(createdEntities.sites.size / 20),
      })),
      findAll: jest.fn().mockImplementation(() => Promise.resolve(Array.from(createdEntities.sites.values()))),
      create: jest.fn().mockImplementation((data) => {
        const site = { id: randomUUID(), ...data };
        createdEntities.sites.set(site.id, site);
        return Promise.resolve(site);
      }),
      update: jest.fn().mockImplementation((id, data) => {
        const existing = createdEntities.sites.get(id);
        if (existing) {
          const updated = { ...existing, ...data };
          createdEntities.sites.set(id, updated);
          return Promise.resolve(updated);
        }
        return Promise.resolve(null);
      }),
      delete: jest.fn().mockImplementation((id) => {
        const deleted = createdEntities.sites.get(id);
        createdEntities.sites.delete(id);
        return Promise.resolve(deleted || { id });
      }),
    };

    const mockEmployeeRepository = {
      findById: jest.fn().mockImplementation((id) => {
        return Promise.resolve(createdEntities.employees.get(id) || null);
      }),
      findMany: jest.fn().mockImplementation(() => ({
        employees: Array.from(createdEntities.employees.values()),
        total: createdEntities.employees.size,
        page: 1,
        limit: 20,
        totalPages: Math.ceil(createdEntities.employees.size / 20),
      })),
      findAll: jest.fn().mockImplementation(() => Promise.resolve(Array.from(createdEntities.employees.values()))),
      create: jest.fn().mockImplementation((data) => {
        const employee = { id: randomUUID(), ...data };
        createdEntities.employees.set(employee.id, employee);
        return Promise.resolve(employee);
      }),
      update: jest.fn().mockImplementation((id, data) => {
        const existing = createdEntities.employees.get(id);
        if (existing) {
          const updated = { ...existing, ...data };
          createdEntities.employees.set(id, updated);
          return Promise.resolve(updated);
        }
        return Promise.resolve(null);
      }),
      delete: jest.fn().mockImplementation((id) => {
        const deleted = createdEntities.employees.get(id);
        createdEntities.employees.delete(id);
        return Promise.resolve(deleted || { id });
      }),
    };

    return {
      mockClientRepository,
      mockSiteRepository,
      mockEmployeeRepository,
      createdEntities
    };
  }

  /**
   * Create comprehensive mock providers for all test dependencies
   * Includes TenantContextService, ConfigService, PrismaService, and auth components
   */
  static createMockProviders(options: {
    tenantId?: string;
    userId?: string;
    userRole?: UserRole | string;
  } = {}) {
    const { tenantId = 'test-tenant-' + randomUUID(), userId = 'user-' + randomUUID(), userRole = UserRole.COMPANY_ADMIN } = options;

    // Create stateful repository mocks that can store and return entities
    const repositoryMocks = PropertyTestSetup.createRepositoryMocks();

    // Mock TenantContextService with all required methods
    const mockTenantContextService = {
      setContext: jest.fn(),
      getTenantId: jest.fn().mockReturnValue(tenantId),
      getUserId: jest.fn().mockReturnValue(userId),
      getUserRole: jest.fn().mockReturnValue(userRole),
      hasContext: jest.fn().mockReturnValue(true), // CRITICAL: Ensure this returns true
      getContext: jest.fn().mockReturnValue({
        tenantId,
        userId,
        userRole,
        isSet: true,
      }),
      validateTenantAccess: jest.fn().mockReturnValue(true),
      isAdmin: jest.fn().mockReturnValue(true),
      hasRole: jest.fn().mockReturnValue(true),
      hasAnyRole: jest.fn().mockReturnValue(true),
      clearContext: jest.fn(),
      getContextSnapshot: jest.fn().mockReturnValue(`Context[tenant:${tenantId},user:${userId},role:${userRole},set:true]`),
    };

    // Mock ConfigService with all encryption keys and development settings
    const mockConfigService = {
      get: jest.fn().mockImplementation((key: string, defaultValue?: any) => {
        const configMap = {
          'NODE_ENV': 'test',
          'DATABASE_URL': 'postgresql://test:test@localhost:5432/test_db',
          'JWT_SECRET': 'test-jwt-secret-key-for-testing-purposes-only',
          'JWT_EXPIRATION': '15m',
          'JWT_REFRESH_SECRET': 'test-refresh-secret',
          'JWT_REFRESH_EXPIRATION': '7d',
          'ENCRYPTION_KEY_SENSITIVE': 'test-sensitive-key-32-chars-long!!',
          'ENCRYPTION_KEY_RESTRICTED': 'test-restricted-key-32-chars-lng!',
          'ENCRYPTION_KEY_FINANCIAL': 'test-financial-key-32-chars-long!',
          'BCRYPT_ROUNDS': '10',
          'CORS_ORIGIN': 'http://localhost:3000',
          'API_PREFIX': 'api',
          'SWAGGER_ENABLED': 'true',
          'RATE_LIMIT_TTL': '60',
          'RATE_LIMIT_LIMIT': '10',
        };
        return configMap[key] || defaultValue;
      }),
      getOrThrow: jest.fn().mockImplementation((key: string) => {
        const value = mockConfigService.get(key);
        if (value === undefined) {
          throw new Error(`Configuration key "${key}" not found`);
        }
        return value;
      }),
    };

    // CRITICAL FIX: Create comprehensive Prisma mock that synchronizes with repository storage
    // This fixes the "Cannot read properties of undefined (reading 'create')" error in property tests
    const createModelMock = (entityType?: string) => ({
      findFirst: jest.fn().mockImplementation((args) => {
        if (!entityType || !repositoryMocks.createdEntities[entityType]) {
          return Promise.resolve(null);
        }
        const entities = Array.from(repositoryMocks.createdEntities[entityType].values());
        const found = entities.find(entity => {
          if (args?.where) {
            return Object.keys(args.where).every(key => entity[key] === args.where[key]);
          }
          return false;
        });
        return Promise.resolve(found || null);
      }),
      findMany: jest.fn().mockImplementation((args) => {
        if (!entityType || !repositoryMocks.createdEntities[entityType]) {
          return Promise.resolve([]);
        }
        let entities = Array.from(repositoryMocks.createdEntities[entityType].values());
        if (args?.where) {
          entities = entities.filter(entity => 
            Object.keys(args.where).every(key => entity[key] === args.where[key])
          );
        }
        return Promise.resolve(entities);
      }),
      findUnique: jest.fn().mockImplementation((args) => {
        if (!entityType || !repositoryMocks.createdEntities[entityType] || !args?.where?.id) {
          return Promise.resolve(null);
        }
        return Promise.resolve(repositoryMocks.createdEntities[entityType].get(args.where.id) || null);
      }),
      create: jest.fn().mockImplementation((args) => {
        const entity = { id: uuidv4(), ...args.data };
        
        // CRITICAL FIX: Store created entity in repository storage so services can find it
        if (entityType && repositoryMocks.createdEntities[entityType]) {
          repositoryMocks.createdEntities[entityType].set(entity.id, entity);
        }
        
        return Promise.resolve(entity);
      }),
      createMany: jest.fn().mockImplementation((args) => ({ count: args.data.length })),
      update: jest.fn().mockImplementation((args) => {
        const updated = { id: args.where.id, ...args.data };
        
        // CRITICAL FIX: Update entity in repository storage
        if (entityType && repositoryMocks.createdEntities[entityType]) {
          const existing = repositoryMocks.createdEntities[entityType].get(args.where.id);
          if (existing) {
            const updatedEntity = { ...existing, ...args.data };
            repositoryMocks.createdEntities[entityType].set(args.where.id, updatedEntity);
            return Promise.resolve(updatedEntity);
          }
        }
        
        return Promise.resolve(updated);
      }),
      updateMany: jest.fn().mockImplementation(() => ({ count: 0 })),
      upsert: jest.fn().mockImplementation((args) => ({ id: uuidv4(), ...args.create, ...args.update })),
      delete: jest.fn().mockImplementation((args) => {
        // CRITICAL FIX: Remove entity from repository storage
        if (entityType && repositoryMocks.createdEntities[entityType]) {
          const deleted = repositoryMocks.createdEntities[entityType].get(args.where.id);
          repositoryMocks.createdEntities[entityType].delete(args.where.id);
          return Promise.resolve(deleted || { id: args.where.id });
        }
        return Promise.resolve({ id: 'deleted' });
      }),
      deleteMany: jest.fn().mockImplementation(() => {
        // CRITICAL FIX: Clear entities from repository storage
        if (entityType && repositoryMocks.createdEntities[entityType]) {
          const count = repositoryMocks.createdEntities[entityType].size;
          repositoryMocks.createdEntities[entityType].clear();
          return Promise.resolve({ count });
        }
        return Promise.resolve({ count: 0 });
      }),
      count: jest.fn().mockImplementation(() => {
        if (entityType && repositoryMocks.createdEntities[entityType]) {
          return Promise.resolve(repositoryMocks.createdEntities[entityType].size);
        }
        return Promise.resolve(0);
      }),
      aggregate: jest.fn().mockResolvedValue({
        _count: { id: 0 },
        _sum: { amount: new Decimal(0) },
        _avg: { amount: new Decimal(0) },
        _min: { createdAt: new Date() },
        _max: { updatedAt: new Date() }
      }),
      groupBy: jest.fn().mockResolvedValue([]),
    });

    // CRITICAL FIX: Create a comprehensive mock that includes both singular and plural model names
    // This resolves property test Prisma service injection failures
    const createSystemPrismaProxy = () => {
      const modelMock = createModelMock();
      return new Proxy({}, {
        get(target, prop: string | symbol) {
          // Convert symbol to string for consistency
          const propName = typeof prop === 'symbol' ? prop.toString() : prop;
          
          // Return the same model mock for both singular and plural names
          const modelNames = [
            'company', 'companies',
            'client', 'clients', 
            'contract', 'contracts',
            'site', 'sites',
            'employee', 'employees',
            'user', 'users',
            'assignment', 'assignments',
            'shift', 'shifts',
            'shift_template', 'shift_templates', 'shiftTemplate', 'shiftTemplates',
            'shift_notification', 'shift_notifications', 'shiftNotification', 'shiftNotifications',
            'attendance', 'attendances',
            'payroll_run', 'payroll_runs', 'payrollRun', 'payrollRuns',
            'payroll_item', 'payroll_items', 'payrollItem', 'payrollItems',
            'invoice', 'invoices',
            'clientUser', 'client_user', 'client_users',
            'clientDocument', 'client_document', 'client_documents',
            'clientInteraction', 'client_interaction', 'client_interactions',
          ];
          
          if (modelNames.includes(propName)) {
            return modelMock;
          }
          
          // Return undefined for unknown properties
          return undefined;
        }
      });
    };

    // Mock PrismaService with all required methods and model delegates
    const mockPrismaService = {
      $connect: jest.fn().mockResolvedValue(undefined),
      $disconnect: jest.fn().mockResolvedValue(undefined),
      $executeRaw: jest.fn().mockResolvedValue(0),
      $executeRawUnsafe: jest.fn().mockResolvedValue(0),
      $queryRaw: jest.fn().mockResolvedValue([]),
      $transaction: jest.fn().mockImplementation((fn) => fn(mockPrismaService)),
      onModuleInit: jest.fn().mockResolvedValue(undefined),
      onModuleDestroy: jest.fn().mockResolvedValue(undefined),
      
      // Tenant context methods
      setTenantContext: jest.fn(),
      clearTenantContext: jest.fn(),
      withTenant: jest.fn().mockImplementation((tenantId, fn) => {
        // Create a complete mock that matches the full Prisma client interface
        const tenantPrismaProxy = new Proxy(mockPrismaService, {
          get(target, prop: string | symbol) {
            // Convert symbol to string for consistency
            const propName = typeof prop === 'symbol' ? prop.toString() : prop;
            
            // First check if it's a built-in Prisma method
            if (['$connect', '$disconnect', '$executeRaw', '$executeRawUnsafe', '$queryRaw', '$transaction'].includes(propName)) {
              return target[propName];
            }
            
            // For model delegates, return a comprehensive mock
            const modelNames = [
              'company', 'companies',
              'client', 'clients', 
              'contract', 'contracts',
              'site', 'sites',
              'employee', 'employees',
              'user', 'users',
              'assignment', 'assignments',
              'shift', 'shifts',
              'shift_template', 'shift_templates', 'shiftTemplate', 'shiftTemplates',
              'shift_notification', 'shift_notifications', 'shiftNotification', 'shiftNotifications',
              'attendance', 'attendances',
              'payroll_run', 'payroll_runs', 'payrollRun', 'payrollRuns',
              'payroll_item', 'payroll_items', 'payrollItem', 'payrollItems',
              'invoice', 'invoices',
              'clientUser', 'client_user', 'client_users',
              'clientDocument', 'client_document', 'client_documents',
              'clientInteraction', 'client_interaction', 'client_interactions',
            ];
            
            if (modelNames.includes(propName)) {
              return createModelMock();
            }
            
            // Return the property from target if it exists
            return target[propName];
          }
        });
        return fn(tenantPrismaProxy);
      }),
      // CRITICAL FIX: Proper withSystemContext implementation that provides full Prisma client interface
      withSystemContext: jest.fn().mockImplementation((fn) => {
        // Create a complete mock that matches the full Prisma client interface
        const systemPrismaProxy = new Proxy(mockPrismaService, {
          get(target, prop: string | symbol) {
            // Convert symbol to string for consistency
            const propName = typeof prop === 'symbol' ? prop.toString() : prop;
            
            // First check if it's a built-in Prisma method
            if (['$connect', '$disconnect', '$executeRaw', '$executeRawUnsafe', '$queryRaw', '$transaction'].includes(propName)) {
              return target[propName];
            }
            
            // For model delegates, return a comprehensive mock
            const modelNames = [
              'company', 'companies',
              'client', 'clients', 
              'contract', 'contracts',
              'site', 'sites',
              'employee', 'employees',
              'user', 'users',
              'assignment', 'assignments',
              'shift', 'shifts',
              'shift_template', 'shift_templates', 'shiftTemplate', 'shiftTemplates',
              'shift_notification', 'shift_notifications', 'shiftNotification', 'shiftNotifications',
              'attendance', 'attendances',
              'payroll_run', 'payroll_runs', 'payrollRun', 'payrollRuns',
              'payroll_item', 'payroll_items', 'payrollItem', 'payrollItems',
              'invoice', 'invoices',
              'clientUser', 'client_user', 'client_users',
              'clientDocument', 'client_document', 'client_documents',
              'clientInteraction', 'client_interaction', 'client_interactions',
            ];
            
            if (modelNames.includes(propName)) {
              return createModelMock();
            }
            
            // Return the property from target if it exists
            return target[propName];
          }
        });
        return fn(systemPrismaProxy);
      }),
      getTenantContext: jest.fn().mockResolvedValue({
        tenantId,
        userRole,
      }),
      validateRLSConfiguration: jest.fn().mockResolvedValue(true),
      enableRLS: jest.fn().mockResolvedValue(undefined),
      createTenantPolicy: jest.fn().mockResolvedValue(undefined),
      testRLSIsolation: jest.fn().mockResolvedValue(true),

      // CRITICAL FIX: Add both singular and plural model delegates to support all property test patterns
      // Model delegates with correct plural names to match Prisma schema
      companies: createModelMock('clients'), // Note: companies share client storage for simplicity
      company: createModelMock('clients'), // ADDED: Support singular name for property tests  
      clients: createModelMock('clients'),
      client: createModelMock('clients'), // ADDED: Support singular name for property tests
      contracts: createModelMock(),
      contract: createModelMock(), // ADDED: Support singular name for property tests
      sites: createModelMock('sites'),
      site: createModelMock('sites'), // ADDED: Support singular name for property tests
      employees: createModelMock('employees'),
      employee: createModelMock('employees'), // ADDED: Support singular name for property tests
      users: createModelMock(),
      user: createModelMock(), // ADDED: Support singular name for property tests
      assignments: createModelMock(),
      assignment: createModelMock(), // ADDED: Support singular name for property tests
      shifts: createModelMock(),
      shift: createModelMock(), // ADDED: Support singular name for property tests
      shift_templates: createModelMock(),
      shiftTemplates: createModelMock(), // ADDED: Support camelCase name for property tests
      shift_notifications: createModelMock(),
      shiftNotifications: createModelMock(), // ADDED: Support camelCase name for property tests
      attendance: createModelMock('attendance'),
      attendances: createModelMock('attendance'), // ADDED: Support plural name for property tests
      payroll_runs: createModelMock(),
      payrollRuns: createModelMock(), // ADDED: Support camelCase name for property tests
      payroll_items: createModelMock(),
      payrollItems: createModelMock(), // ADDED: Support camelCase name for property tests
      invoices: createModelMock(),
      invoice: createModelMock(), // ADDED: Support singular name for property tests
      clientUser: createModelMock(),
      client_user: createModelMock(), // ADDED: Support snake_case name for property tests
      clientDocument: createModelMock(),
      client_document: createModelMock(), // ADDED: Support snake_case name for property tests
      clientInteraction: createModelMock(),
      client_interaction: createModelMock(), // ADDED: Support snake_case name for property tests

      // Add global methods that some services might expect
      findFirst: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockImplementation((args) => ({ id: uuidv4(), ...args.data })),
      createMany: jest.fn().mockImplementation((args) => ({ count: args.data.length })),
      update: jest.fn().mockImplementation((args) => ({ id: args.where.id, ...args.data })),
      updateMany: jest.fn().mockImplementation(() => ({ count: 0 })),
      delete: jest.fn().mockResolvedValue({ id: 'deleted' }),
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      count: jest.fn().mockResolvedValue(0),
      aggregate: jest.fn().mockResolvedValue({
        _count: { id: 0 },
        _sum: { amount: new Decimal(0) },
        _avg: { amount: new Decimal(0) },
        _min: { createdAt: new Date() },
        _max: { updatedAt: new Date() }
      }),
      groupBy: jest.fn().mockResolvedValue([]),
    };

    // Mock Reflector for guards
    const mockReflector = {
      getAllAndOverride: jest.fn().mockReturnValue(false),
      get: jest.fn().mockReturnValue(undefined),
      getAll: jest.fn().mockReturnValue([]),
      getAllAndMerge: jest.fn().mockReturnValue([]),
    };

    // Mock JwtService for authentication
    const mockJwtService = {
      sign: jest.fn().mockReturnValue('mock-jwt-token'),
      signAsync: jest.fn().mockResolvedValue('mock-jwt-token'),
      verify: jest.fn().mockReturnValue({ sub: userId, tenantId, role: userRole }),
      verifyAsync: jest.fn().mockResolvedValue({ sub: userId, tenantId, role: userRole }),
      decode: jest.fn().mockReturnValue({ sub: userId, tenantId, role: userRole }),
    };

        // Mock AuthService
    const mockAuthService = {
      validateUser: jest.fn().mockResolvedValue({ id: userId, role: userRole }),
      login: jest.fn().mockResolvedValue({ accessToken: 'mock-access-token', refreshToken: 'mock-refresh-token' }),
      refresh: jest.fn().mockResolvedValue({ accessToken: 'mock-new-access-token' }),
      logout: jest.fn().mockResolvedValue(undefined),
      validateToken: jest.fn().mockResolvedValue({ id: userId, tenantId, role: userRole }),
    };

    // Mock DataTransformService
    const mockDataTransformService = {
      encryptEmployeeData: jest.fn().mockReturnValue({}),
      transformEmployeeForRole: jest.fn((employee) => employee),
      decryptEmployeeData: jest.fn((employee) => employee),
      maskSensitiveData: jest.fn((data) => data),
      transformForClient: jest.fn((data) => data),
    };

    // Mock repository services
    const mockSiteRepository = {
      findMany: jest.fn().mockResolvedValue({
        sites: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      }),
      findAll: jest.fn().mockResolvedValue([]),
      findById: jest.fn().mockResolvedValue(null),
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation((data) => ({ id: uuidv4(), ...data })),
      update: jest.fn().mockImplementation((id, data) => ({ id, ...data })),
      delete: jest.fn().mockResolvedValue({ id: 'deleted' }),
    };

    const mockClientRepository = {
      findMany: jest.fn().mockResolvedValue({
        clients: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      }),
      findAll: jest.fn().mockResolvedValue([]),
      findById: jest.fn().mockResolvedValue(null),
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation((data) => ({ id: uuidv4(), ...data })),
      update: jest.fn().mockImplementation((id, data) => ({ id, ...data })),
      delete: jest.fn().mockResolvedValue({ id: 'deleted' }),
    };

    const mockEmployeeRepository = {
      findMany: jest.fn().mockResolvedValue({
        employees: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      }),
      findAll: jest.fn().mockResolvedValue([]),
      findById: jest.fn().mockResolvedValue(null),
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation((data) => ({ id: uuidv4(), ...data })),
      update: jest.fn().mockImplementation((id, data) => ({ id, ...data })),
      delete: jest.fn().mockResolvedValue({ id: 'deleted' }),
    };

    // Mock billing services
    const mockInvoiceService = {
      generateInvoice: jest.fn().mockResolvedValue({ id: uuidv4(), amount: 1000 }),
      calculateAmount: jest.fn().mockReturnValue(1000),
      findAll: jest.fn().mockResolvedValue([]),
    };

    const mockGstCalculationService = {
      calculateGst: jest.fn().mockReturnValue({ gstAmount: 180, totalAmount: 1180 }),
      getGstRate: jest.fn().mockReturnValue(0.18),
    };

    const mockInvoicePdfService = {
      generatePdf: jest.fn().mockResolvedValue(Buffer.from('pdf-content')),
    };

    const mockBillingValidationService = {
      validateBillingData: jest.fn().mockReturnValue({ valid: true }),
      validateInvoiceData: jest.fn().mockReturnValue({ valid: true }),
    };

    // Mock SupervisorPortalService
    const mockSupervisorPortalService = {
      getDashboardOverview: jest.fn().mockResolvedValue({
        supervisorId: userId,
        assignedSites: [],
        overview: { totalSites: 0, activeSites: 0 },
      }),
      processAttendanceApproval: jest.fn().mockResolvedValue({ success: true }),
      getSiteHealthMonitoring: jest.fn().mockResolvedValue({ sites: [], overallHealth: 'GOOD' }),
      getDailyMusterRoll: jest.fn().mockResolvedValue({ sites: [], summary: {} }),
      handleEmergencyReplacement: jest.fn().mockResolvedValue({ id: uuidv4(), status: 'PENDING' }),
    };

    return {
      mockTenantContextService,
      mockConfigService,
      mockPrismaService,
      mockReflector,
      mockJwtService,
      mockAuthService,
      mockDataTransformService,
      mockSiteRepository: repositoryMocks.mockSiteRepository,
      mockClientRepository: repositoryMocks.mockClientRepository,
      mockEmployeeRepository: repositoryMocks.mockEmployeeRepository,
      mockInvoiceService,
      mockGstCalculationService,
      mockInvoicePdfService,
      mockBillingValidationService,
      mockSupervisorPortalService,
    };
  }

  /**
   * Create a standardized test module with proper RBAC, tenant context, and complete dependency injection
   * Uses proper service resolution and comprehensive mock setup
   */
  static async createTestModule(
    additionalProviders: any[] = [],
    additionalImports: any[] = [],
    options: {
      tenantId?: string;
      userId?: string;
      userRole?: UserRole | string;
      enableTestIsolation?: boolean;
    } = {},
  ): Promise<TestingModule> {
    const { enableTestIsolation = true } = options;
    const mocks = PropertyTestSetup.createMockProviders(options);

    const module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
          load: [
            () => ({
              NODE_ENV: 'development', // This enables the development mode bypass in EncryptionUtil
              DATABASE_URL: 'postgresql://test:test@localhost:5432/test_db',
              JWT_SECRET: 'test-jwt-secret-key-for-testing-purposes-only',
              JWT_EXPIRATION: '15m',
              JWT_REFRESH_SECRET: 'test-refresh-secret',
              JWT_REFRESH_EXPIRATION: '7d',
              ENCRYPTION_KEY_SENSITIVE: 'test-sensitive-key-32-chars-long!!',
              ENCRYPTION_KEY_RESTRICTED: 'test-restricted-key-32-chars-lng!',
              ENCRYPTION_KEY_FINANCIAL: 'test-financial-key-32-chars-long!',
              BCRYPT_ROUNDS: '10',
              CORS_ORIGIN: 'http://localhost:3000',
              API_PREFIX: 'api',
              SWAGGER_ENABLED: 'true',
              RATE_LIMIT_TTL: '60',
              RATE_LIMIT_LIMIT: '10',
            })
          ]
        }),
        PassportModule.register({ defaultStrategy: 'jwt' }),
        ...additionalImports
      ],
      providers: [
        // Core services with mocks
        {
          provide: PrismaService,
          useValue: mocks.mockPrismaService,
        },
        {
          provide: TenantContextService,
          useValue: mocks.mockTenantContextService,
        },
        // Use real ConfigService with test configuration
        // ConfigService will be provided by ConfigModule.forRoot
        
        // Authentication and authorization providers
        {
          provide: Reflector,
          useValue: mocks.mockReflector,
        },
        {
          provide: JwtService,
          useValue: mocks.mockJwtService,
        },
        {
          provide: AuthService,
          useValue: mocks.mockAuthService,
        },
        
        // Real services that depend on mocked services
        EncryptionUtil, // Uses ConfigService
        {
          provide: DataTransformService,
          useValue: mocks.mockDataTransformService,
        },
        
        // Repository services
        {
          provide: SiteRepository,
          useValue: mocks.mockSiteRepository,
        },
        {
          provide: ClientRepository,
          useValue: mocks.mockClientRepository,
        },
        {
          provide: EmployeeRepository,
          useValue: mocks.mockEmployeeRepository,
        },
        
        // Billing services mocks
        {
          provide: InvoiceService,
          useValue: mocks.mockInvoiceService,
        },
        {
          provide: GstCalculationService,
          useValue: mocks.mockGstCalculationService,
        },
        {
          provide: InvoiceCalculationService,
          useValue: {
            calculateAmount: jest.fn().mockReturnValue(1000),
            generateInvoiceNumber: jest.fn().mockImplementation(
              (companyId: string, contractId: string) => 
                Promise.resolve(`INV-CLI-${new Date().getFullYear()}${(new Date().getMonth() + 1).toString().padStart(2, '0')}-001`)
            ),
            calculateGst: jest.fn().mockReturnValue({ gstAmount: 180, totalAmount: 1180 }),
            findAll: jest.fn().mockResolvedValue([]),
          },
        },
        {
          provide: InvoicePdfService,
          useValue: mocks.mockInvoicePdfService,
        },
        {
          provide: BillingValidationService,
          useValue: mocks.mockBillingValidationService,
        },
        {
          provide: SupervisorPortalService,
          useValue: mocks.mockSupervisorPortalService,
        },
        
        // Guards with proper mocking
        {
          provide: JwtAuthGuard,
          useValue: {
            canActivate: jest.fn().mockResolvedValue(true),
          },
        },
        {
          provide: PermissionsGuard,
          useValue: {
            canActivate: jest.fn().mockResolvedValue(true),
          },
        },
        
        // JWT Strategy for passport
        {
          provide: JwtStrategy,
          useValue: {
            validate: jest.fn().mockResolvedValue({
              id: options.userId || 'user-' + randomUUID(),
              tenantId: options.tenantId || 'test-tenant-' + randomUUID(),
              role: options.userRole || UserRole.COMPANY_ADMIN,
            }),
          },
        },

        // RBAC providers from RbacTestSetup
        ...RbacTestSetup.getProviders(options),
        
        // Business logic services (using mocked dependencies)
        EmployeesService,
        SitesService, 
        BillingService,
        SupervisorPortalService,
        
        // Additional providers passed in
        ...additionalProviders,
      ],
    }).compile();

    // Initialize mocked services if they have onModuleInit
    try {
      const prismaService = await PropertyTestSetup.resolveService<PrismaService>(module, PrismaService);
      if (prismaService.onModuleInit) {
        await prismaService.onModuleInit();
      }
    } catch (error) {
      console.warn('Failed to initialize PrismaService:', (error as Error).message);
    }

    // CRITICAL FIX: Try to resolve TenantContextService properly
    try {
      const tenantContextService = await PropertyTestSetup.resolveService<TenantContextService>(module, TenantContextService);
      if (tenantContextService && options.tenantId) {
        PropertyTestSetup.setupTenantContext(
          tenantContextService,
          options.tenantId,
          options.userId,
          options.userRole as UserRole
        );
      }
    } catch (error) {
      console.warn('Failed to resolve TenantContextService:', (error as Error).message);
    }

    // Set up test isolation if enabled
    if (enableTestIsolation) {
      PropertyTestSetup.setupTestIsolation(module, options);
    }

    return module;
  }

  /**
   * Setup test isolation to prevent data leakage between tests
   */
  static setupTestIsolation(module: TestingModule, options: any = {}) {
    // Clear any existing timers or intervals
    if (typeof globalThis !== 'undefined' && globalThis.clearInterval) {
      // Clear any existing intervals that might cause leakage
      for (let i = 1; i < 1000; i++) {
        try {
          clearInterval(i);
          clearTimeout(i);
        } catch (e) {
          // Ignore errors for non-existent timers
        }
      }
    }

    // Reset module-level state if services have reset methods
    try {
      const tenantContext = module.get<TenantContextService>(TenantContextService, { strict: false });
      if (tenantContext && typeof tenantContext.clearContext === 'function') {
        tenantContext.clearContext();
      }
    } catch (error) {
      // Ignore if service is not available
    }

    // Set up fresh context for this test
    if (options.tenantId || options.userId) {
      try {
        const tenantContext = module.get<TenantContextService>(TenantContextService, { strict: false });
        if (tenantContext && typeof tenantContext.setContext === 'function') {
          PropertyTestSetup.setupTenantContext(
            tenantContext,
            options.tenantId,
            options.userId,
            options.userRole
          );
        }
      } catch (error) {
        // Ignore if service is not available
      }
    }
  }

  /**
   * Setup tenant context for property tests
   */
  static setupTenantContext(
    tenantContextService: TenantContextService,
    tenantId: string = 'prop-test-' + randomUUID(),
    userId: string = 'user-' + randomUUID(),
    userRole: UserRole = UserRole.COMPANY_ADMIN,
  ) {
    // Mock all TenantContextService methods
    jest.spyOn(tenantContextService, 'getTenantId').mockReturnValue(tenantId);
    jest.spyOn(tenantContextService, 'getUserId').mockReturnValue(userId);
    jest.spyOn(tenantContextService, 'getUserRole').mockReturnValue(userRole);
    jest.spyOn(tenantContextService, 'hasContext').mockReturnValue(true);
    jest.spyOn(tenantContextService, 'validateTenantAccess').mockReturnValue(true);
    jest.spyOn(tenantContextService, 'isAdmin').mockReturnValue(true);
    jest.spyOn(tenantContextService, 'hasRole').mockReturnValue(true);
    jest.spyOn(tenantContextService, 'hasAnyRole').mockReturnValue(true);
    jest.spyOn(tenantContextService, 'getContext').mockReturnValue({
      tenantId,
      userId,
      userRole,
      isSet: true,
    });
    jest.spyOn(tenantContextService, 'getContextSnapshot').mockReturnValue(
      `Context[tenant:${tenantId},user:${userId},role:${userRole},set:true]`,
    );

    return { tenantId, userId, userRole };
  }

  /**
   * Create test data with proper tenant relationships
   * CRITICAL: Uses system context to avoid foreign key constraint violations
   */
  static async createTenantData(
    prisma: PrismaService,
    tenantId: string,
    dataType: 'full' | 'minimal' = 'minimal',
  ) {
    // Use system context for ALL test data creation to avoid tenant filtering interference
    return await prisma.withSystemContext(async (systemPrisma) => {
      // 1. Create company (tenant) first - ROOT entity
      const company = await systemPrisma.companies.upsert({
        where: { id: tenantId },
        update: {},
        create: {
          id: tenantId,
          name: `Test Company ${Date.now()}`,
          slug: `test-company-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
          settings: {},
          branding: {},
        },
      });

      if (dataType === 'minimal') {
        return { company };
      }

      // 2. Create client - DEPENDS ON: Company (FIXED: removed contract fields)
      const client = await systemPrisma.clients.create({
        data: {
          id: uuidv4(),
          companyId: company.id,  // Foreign key to company
          name: `Test Client ${Date.now()}`,
          contactEmail: `client-${Date.now()}@test.com`,
          contactInfo: { phone: `+91-9999999999` },
          organizationType: 'CORPORATE_OFFICE',
          // FIXED: Removed contractStatus, contractStart, contractEnd, billingPreferences
          // These fields now belong to the Contract entity
        },
      });

      // 3. Create contract - DEPENDS ON: Client (FIXED: proper structure)
      const contract = await systemPrisma.contracts.create({
        data: {
          contractNumber: `CONTRACT-${Date.now()}`,
          title: 'Test Security Contract',
          status: 'ACTIVE',
          startDate: new Date(),
          endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          serviceDefinitions: { services: ['security'] },
          serviceLevelAgreement: { uptime: '99%' },
          billingPreferences: { cycle: 'monthly', method: 'PORTAL' },
          clientId: client.id,  // Foreign key to client
        },
      });

      // 4. Create site - DEPENDS ON: Contract (FIXED: uses contractId not clientId)
      const site = await systemPrisma.sites.create({
        data: {
          id: uuidv4(),
          contractId: contract.id,  // FIXED: Foreign key to contract (not clientId)
          name: `Test Site ${Date.now()}`,
          address: {
            street: '123 Test St',
            city: 'Test City',
            state: 'TS',
            zipCode: '12345',
          },
          operationalStatus: 'ACTIVE',
        },
      });

      // 5. Create employee - DEPENDS ON: Company
      const employee = await systemPrisma.employees.create({
        data: {
          id: uuidv4(),
          companyId: company.id,  // Foreign key to company
          employeeNumber: `EMP-${Date.now()}`,
          firstName: 'Test',
          lastName: 'Employee',
          email: `employee-${Date.now()}@test.com`,
          emailIv: 'test-iv',
          emailTag: 'test-tag',
          phone: '555-0123',
          phoneIv: 'test-iv',
          phoneTag: 'test-tag',
          employmentStatus: 'ACTIVE',
          hireDate: new Date(),
          basicSalary: '50000',
          basicSalaryIv: 'test-iv',
          basicSalaryTag: 'test-tag',
          hraAmount: '5000',
          hraAmountIv: 'test-iv',
          hraAmountTag: 'test-tag',
          otherAllowances: '2000',
          otherAllowancesIv: 'test-iv',
          otherAllowancesTag: 'test-tag',
          grossSalary: '57000',
          grossSalaryIv: 'test-iv',
          grossSalaryTag: 'test-tag',
          salaryType: 'MONTHLY',
          bankName: 'Test Bank',
          bankNameIv: 'test-iv',
          bankNameTag: 'test-tag',
          accountNumber: '1234567890',
          accountNumberIv: 'test-iv',
          accountNumberTag: 'test-tag',
          ifscCode: 'TEST0123456',
          ifscCodeIv: 'test-iv',
          ifscCodeTag: 'test-tag',
          accountType: 'SAVINGS',
          epfApplicable: true,
          esicApplicable: true,
          ptApplicable: true,
          tdsApplicable: false,
          dateOfBirth: new Date('1990-01-01'),
          certifications: [],
          skills: ['Security'],
          metadata: {},
        },
      });

      return { company, client, contract, site, employee };
    });
  }

  /**
   * Create a complete test hierarchy with all entities and proper relationships
   * CRITICAL: All operations in system context to avoid FK constraint violations
   */
  static async createCompleteHierarchy(
    prisma: PrismaService,
    tenantId: string,
    options: {
      clientCount?: number;
      employeeCount?: number;
      siteCount?: number;
      createAssignments?: boolean;
      createShifts?: boolean;
      createAttendance?: boolean;
    } = {},
  ) {
    const {
      clientCount = 1,
      employeeCount = 1,
      siteCount = 1,
      createAssignments = false,
      createShifts = false,
      createAttendance = false,
    } = options;

    return await prisma.withSystemContext(async (systemPrisma) => {
      // 1. Create company first
      const company = await systemPrisma.companies.upsert({
        where: { id: tenantId },
        update: {},
        create: {
          id: tenantId,
          name: `Test Company ${Date.now()}`,
          slug: `test-company-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
          settings: {},
          branding: {},
        },
      });

      // 2. Create clients (FIXED: removed contract fields)
      const clients = [];
      for (let i = 0; i < clientCount; i++) {
        const client = await systemPrisma.clients.create({
          data: {
            id: uuidv4(),
            companyId: company.id,
            name: `Test Client ${i + 1} - ${Date.now()}`,
            contactEmail: `client-${i + 1}-${Date.now()}@test.com`,
            contactInfo: { phone: `+91-999999999${i}` },
            organizationType: 'CORPORATE_OFFICE',
            // FIXED: Removed contractStatus, contractStart, contractEnd, billingPreferences
            // These fields now belong to the Contract entity
          },
        });
        clients.push(client);
      }

      // 3. Create contracts for each client (FIXED: proper structure and relationships)
      const contracts = [];
      for (let i = 0; i < clients.length; i++) {
        const client = clients[i];
        const contract = await systemPrisma.contracts.create({
          data: {
            contractNumber: `CONTRACT-${Date.now()}-${i}`,
            title: `Security Contract ${i + 1}`,
            status: 'ACTIVE',
            startDate: new Date(),
            endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
            serviceDefinitions: { services: ['security', 'surveillance'] },
            serviceLevelAgreement: { uptime: '99.5%', responseTime: '15min' },
            billingPreferences: { cycle: 'monthly', method: 'PORTAL' },
            clientId: client.id,  // FIXED: Proper foreign key to client
          },
        });
        contracts.push(contract);
      }

      // 4. Create sites linked to contracts (FIXED: uses contractId not clientId)
      const sites = [];
      for (let i = 0; i < siteCount; i++) {
        const contract = contracts[i % contracts.length]; // Distribute sites across contracts
        const site = await systemPrisma.sites.create({
          data: {
            id: uuidv4(),
            contractId: contract.id, // FIXED: Link to contract, not client
            name: `Test Site ${i + 1} - ${Date.now()}`,
            address: {
              street: `${100 + i} Security Street`,
              city: 'Test City',
              state: 'Test State',
              zipCode: `1234${i}`,
            },
            operationalStatus: 'ACTIVE',
            contactInfo: { emergency: `+91-888888888${i}` },
            minStaffingLevel: 1,
            maxStaffingLevel: 3,
            skillRequirements: { required: ['Security'], preferred: ['First Aid'] },
          },
        });
        sites.push(site);
      }

      // 5. Create employees
      const employees = [];
      for (let i = 0; i < employeeCount; i++) {
        const employee = await systemPrisma.employees.create({
          data: {
            id: uuidv4(),
            companyId: company.id,
            employeeNumber: `EMP-${String(i + 1).padStart(4, '0')}-${Date.now()}`,
            firstName: `Employee${i + 1}`,
            lastName: 'Test',
            email: `employee${i + 1}-${Date.now()}@test.com`,
            emailIv: 'test-iv-32chars-placeholder-val',
            emailTag: 'test-tag-32chars-placeholder',
            phone: `555012${String(i).padStart(4, '0')}`,
            phoneIv: 'test-iv-32chars-placeholder-val',
            phoneTag: 'test-tag-32chars-placeholder',
            employmentStatus: 'ACTIVE',
            hireDate: new Date(),
            basicSalary: '45000',
            basicSalaryIv: 'test-iv-32chars-placeholder-val',
            basicSalaryTag: 'test-tag-32chars-placeholder',
            hraAmount: '4500',
            hraAmountIv: 'test-iv-32chars-placeholder-val',
            hraAmountTag: 'test-tag-32chars-placeholder',
            otherAllowances: '1500',
            otherAllowancesIv: 'test-iv-32chars-placeholder-val',
            otherAllowancesTag: 'test-tag-32chars-placeholder',
            grossSalary: '51000',
            grossSalaryIv: 'test-iv-32chars-placeholder-val',
            grossSalaryTag: 'test-tag-32chars-placeholder',
            salaryType: 'MONTHLY',
            bankName: 'Test Bank Limited',
            bankNameIv: 'test-iv-32chars-placeholder-val',
            bankNameTag: 'test-tag-32chars-placeholder',
            accountNumber: `12345678${String(i).padStart(2, '0')}`,
            accountNumberIv: 'test-iv-32chars-placeholder-val',
            accountNumberTag: 'test-tag-32chars-placeholder',
            ifscCode: 'TEST0123456',
            ifscCodeIv: 'test-iv-32chars-placeholder-val',
            ifscCodeTag: 'test-tag-32chars-placeholder',
            accountType: 'SAVINGS',
            epfApplicable: true,
            esicApplicable: true,
            ptApplicable: true,
            tdsApplicable: true,
            dateOfBirth: new Date('1990-01-01'),
            certifications: [{ name: 'Security Training', issueDate: '2024-01-01' }],
            skills: ['Security', 'Surveillance', 'First Aid'],
            metadata: { training: 'completed', clearance: 'active' },
          },
        });
        employees.push(employee);
      }

      // 6. Create assignments (if requested)
      const assignments = [];
      if (createAssignments && employees.length > 0 && sites.length > 0) {
        for (let i = 0; i < Math.min(employees.length, sites.length); i++) {
          const assignment = await systemPrisma.assignments.create({
            data: {
              id: uuidv4(),
              employeeId: employees[i].id,
              siteId: sites[i].id,
              role: 'Security Guard',
              responsibilities: { duties: ['patrol', 'access control', 'monitoring'] },
              hourlyRate: '250.00', // Encrypted field
              hourlyRateIv: 'test-iv-32chars-placeholder-val',
              hourlyRateTag: 'test-tag-32chars-placeholder',
              status: 'ACTIVE',
              startDate: new Date(),
            },
          });
          assignments.push(assignment);
        }
      }

      // 7. Create shifts (if requested)
      const shifts = [];
      if (createShifts && assignments.length > 0) {
        for (const assignment of assignments) {
          const shift = await systemPrisma.shifts.create({
            data: {
              id: uuidv4(),
              assignmentId: assignment.id,
              siteId: assignment.siteId,
              shiftDate: new Date(),
              startTime: new Date(),
              endTime: new Date(Date.now() + 8 * 60 * 60 * 1000), // 8 hours later
              shiftType: 'REGULAR',
              status: 'SCHEDULED',
              priority: 'NORMAL',
              coverageRequired: 1,
              coverageAssigned: 1,
              skillRequirements: { required: ['Security'] },
              notes: { instructions: 'Standard security patrol' },
            },
          });
          shifts.push(shift);
        }
      }

      // 8. Create attendance (if requested)
      const attendanceRecords = [];
      if (createAttendance && shifts.length > 0) {
        for (const shift of shifts) {
          const attendance = await systemPrisma.attendance.create({
            data: {
              id: uuidv4(),
              employeeId: shift.assignment?.employeeId || employees[0].id,
              shiftId: shift.id,
              clockIn: new Date(),
              clockOut: null,
              status: 'PRESENT',
              locationData: {
                latitude: 28.6139,
                longitude: 77.2090,
                accuracy: 5.0,
                timestamp: new Date().toISOString(),
              },
              verificationData: {
                gpsVerified: true,
                withinGeofence: true,
                distanceFromSite: 2.5,
                verificationFlags: {
                  locationAccuracy: 'HIGH',
                  requiresApproval: false,
                },
              },
              notes: 'On-time clock-in with GPS verification',
            },
          });
          attendanceRecords.push(attendance);
        }
      }

      return {
        company,
        clients,
        contracts,
        sites,
        employees,
        assignments,
        shifts,
        attendanceRecords,
      };
    });
  }

  /**
   * Create a TestDataFactory instance with proper service injection for property tests
   * CRITICAL FIX: Ensures TestDataFactory receives properly mocked PrismaService 
   * to avoid "Cannot read properties of undefined" errors
   */
  static createTestDataFactory(module: TestingModule): any {
    try {
      // Try to resolve PrismaService from the module (which should be mocked)
      const prismaService = module.get<PrismaService>(PrismaService);
      
      // Validate that the service has the required methods
      if (!prismaService || typeof prismaService.companies?.create !== 'function') {
        throw new Error('PrismaService not properly mocked in test module');
      }

      // Create TestDataFactory class that works with mocked services
      return {
        createCompany: async (overrides: any = {}) => {
          const companyData = {
            id: overrides.id || uuidv4(),
            name: overrides.name || 'Test Security Company',
            slug: overrides.slug || `test-company-${Date.now()}`,
            created_at: new Date(),
            updated_at: new Date(),
            settings: {},
            branding: {},
            ...overrides,
          };
          return prismaService.companies.create({ data: companyData }); // CRITICAL FIX: Use correct model name
        },
        
        createClient: async (companyId: string, overrides: any = {}) => {
          const clientData = {
            id: overrides.id || uuidv4(),
            company_id: companyId, // CRITICAL FIX: Use correct field name from schema
            name: overrides.name || 'Test Client Organization',
            contact_email: overrides.contact_email || `client-${Date.now()}@example.com`, // CRITICAL FIX: Use correct field name
            contact_info: overrides.contact_info || { phone: '+91-9876543210' }, // CRITICAL FIX: Use correct field name
            organization_type: overrides.organization_type || 'CORPORATE_OFFICE', // CRITICAL FIX: Use correct field name
            contract_status: overrides.contract_status || 'ACTIVE', // CRITICAL FIX: Use correct field name
            contract_start: overrides.contract_start || new Date(), // CRITICAL FIX: Use correct field name  
            contract_end: overrides.contract_end || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // CRITICAL FIX: Use correct field name
            billing_preferences: overrides.billing_preferences || { cycle: 'monthly' }, // CRITICAL FIX: Use correct field name
            tags: overrides.tags || [],
            created_at: new Date(),
            updated_at: new Date(),
            ...overrides,
          };
          return prismaService.clients.create({ data: clientData }); // CRITICAL FIX: Use correct model name
        },

        createContract: async (clientId: string, overrides: any = {}) => {
          const contractData = {
            id: overrides.id || uuidv4(),
            client_id: clientId, // CRITICAL FIX: Use correct field name from schema
            contract_number: overrides.contract_number || `CT-${Date.now()}`, // CRITICAL FIX: Use correct field name
            title: overrides.title || 'Security Services Agreement',
            status: overrides.status || 'ACTIVE',
            start_date: overrides.start_date || new Date(), // CRITICAL FIX: Use correct field name
            end_date: overrides.end_date || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // CRITICAL FIX: Use correct field name
            service_definitions: overrides.service_definitions || { services: ['Physical Security'] }, // CRITICAL FIX: Use correct field name
            billing_preferences: overrides.billing_preferences || { cycle: 'monthly' }, // CRITICAL FIX: Use correct field name
            contract_value: overrides.contract_value || 2400000.00, // CRITICAL FIX: Use correct field name
            created_at: new Date(),
            updated_at: new Date(),
            ...overrides,
          };
          return prismaService.contracts.create({ data: contractData }); // CRITICAL FIX: Use correct model name
        },

        createSite: async (contractId: string, overrides: any = {}) => {
          const siteData = {
            id: overrides.id || uuidv4(),
            contract_id: contractId, // CRITICAL FIX: Use correct field name from schema
            name: overrides.name || 'Main Office Building',
            address: overrides.address || { city: 'Mumbai', state: 'Maharashtra' },
            operational_status: overrides.operational_status || 'ACTIVE', // CRITICAL FIX: Use correct field name
            access_requirements: overrides.access_requirements || {}, // CRITICAL FIX: Use correct field name
            safety_protocols: overrides.safety_protocols || {}, // CRITICAL FIX: Use correct field name
            contact_info: overrides.contact_info || {}, // CRITICAL FIX: Use correct field name
            min_staffing_level: overrides.min_staffing_level || 1, // CRITICAL FIX: Use correct field name
            max_staffing_level: overrides.max_staffing_level || 5, // CRITICAL FIX: Use correct field name
            created_at: new Date(),
            updated_at: new Date(),
            ...overrides,
          };
          return prismaService.sites.create({ data: siteData }); // CRITICAL FIX: Use correct model name
        },

        createEmployee: async (companyId: string, overrides: any = {}) => {
          const employeeNumber = `EMP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          const employeeData = {
            id: overrides.id || uuidv4(),
            company_id: companyId, // CRITICAL FIX: Use correct field name from schema
            employee_number: overrides.employee_number || employeeNumber, // CRITICAL FIX: Use correct field name
            first_name: overrides.first_name || 'Rajesh', // CRITICAL FIX: Use correct field name
            last_name: overrides.last_name || 'Kumar', // CRITICAL FIX: Use correct field name
            email: overrides.email || `${employeeNumber.toLowerCase()}@company.com`,
            phone: overrides.phone || '+91-9876543212',
            employment_status: overrides.employment_status || 'ACTIVE', // CRITICAL FIX: Use correct field name
            hire_date: overrides.hire_date || new Date('2023-01-01'), // CRITICAL FIX: Use correct field name
            skills: overrides.skills || ['Security'],
            address: overrides.address || {},
            certifications: overrides.certifications || {},
            created_at: new Date(),
            updated_at: new Date(),
            ...overrides,
          };
          return prismaService.employees.create({ data: employeeData }); // CRITICAL FIX: Use correct model name
        },

        createAssignment: async (employeeId: string, siteId: string, overrides: any = {}) => {
          const assignmentData = {
            id: overrides.id || uuidv4(),
            employee_id: employeeId, // CRITICAL FIX: Use correct field name from schema
            site_id: siteId, // CRITICAL FIX: Use correct field name from schema
            role: overrides.role || 'Security Guard',
            responsibilities: overrides.responsibilities || { primary: ['Security'] },
            hourly_rate: overrides.hourly_rate || '800.00', // CRITICAL FIX: Use correct field name (encrypted string)
            hourly_rate_iv: overrides.hourly_rate_iv || 'mock_iv_string_32_characters', // CRITICAL FIX: Add required encryption fields
            hourly_rate_tag: overrides.hourly_rate_tag || 'mock_tag_string_32_characters', // CRITICAL FIX: Add required encryption fields
            status: overrides.status || 'ACTIVE',
            start_date: overrides.start_date || new Date(), // CRITICAL FIX: Use correct field name
            end_date: overrides.end_date || null, // CRITICAL FIX: Use correct field name
            created_at: new Date(),
            updated_at: new Date(),
            ...overrides,
          };
          return prismaService.assignments.create({ data: assignmentData }); // CRITICAL FIX: Use correct model name
        },

        // Cleanup method that works with mocked services
        cleanupCompanyData: async (companyId: string) => {
          // Since this is mocked, just return success
          return Promise.resolve();
        },

        // Helper method to create complete hierarchy
        createFullHierarchy: async function() {
          const company = await this.createCompany();
          const client = await this.createClient(company.id);
          const contract = await this.createContract(client.id);
          const site = await this.createSite(contract.id);
          const employee = await this.createEmployee(company.id);
          const assignment = await this.createAssignment(employee.id, site.id);
          
          return {
            company,
            client,
            contract,
            site,
            employee,
            assignment,
          };
        },
      };
      
    } catch (error) {
      console.warn(`Failed to create TestDataFactory with proper service injection: ${(error as Error).message}`);
      throw new Error(`TestDataFactory creation failed: ${(error as Error).message}`);
    }
  }
  static async cleanupTenantData(prisma: PrismaService, tenantId: string) {
    return await prisma.withSystemContext(async (systemPrisma) => {
      // Delete in reverse dependency order to avoid FK constraint violations
      await systemPrisma.attendance.deleteMany({
        where: {
          employee: { company_id: tenantId },
        },
      });

      await systemPrisma.shift_notifications.deleteMany({
        where: {
          shift: {
            site: {
              contract: {
                client: { company_id: tenantId },
              },
            },
          },
        },
      });

      await systemPrisma.shifts.deleteMany({
        where: {
          site: {
            contract: {
              client: { company_id: tenantId },
            },
          },
        },
      });

      await systemPrisma.assignments.deleteMany({
        where: {
          employee: { company_id: tenantId },
        },
      });

      await systemPrisma.payroll_items.deleteMany({
        where: {
          employee: { company_id: tenantId },
        },
      });

      await systemPrisma.payroll_runs.deleteMany({
        where: { company_id: tenantId },
      });

      await systemPrisma.invoices.deleteMany({
        where: {
          contract: {
            client: { company_id: tenantId },
          },
        },
      });

      await systemPrisma.sites.deleteMany({
        where: {
          contract: {
            client: { company_id: tenantId },
          },
        },
      });

      await systemPrisma.contracts.deleteMany({
        where: {
          client: { company_id: tenantId },
        },
      });

      await systemPrisma.employees.deleteMany({
        where: { company_id: tenantId },
      });

      // Note: clientInteraction, clientDocument, clientUser models don't exist in current schema
      // await systemPrisma.clientInteraction.deleteMany({
      //   where: {
      //     client: { company_id: tenantId },
      //   },
      // });

      // await systemPrisma.clientDocument.deleteMany({
      //   where: {
      //     client: { company_id: tenantId },
      //   },
      // });

      // await systemPrisma.clientUser.deleteMany({
      //   where: {
      //     client: { company_id: tenantId },
      //   },
      // });

      await systemPrisma.clients.deleteMany({
        where: { company_id: tenantId },
      });

      await systemPrisma.users.deleteMany({
        where: { company_id: tenantId },
      });

      await systemPrisma.shift_templates.deleteMany({
        where: { company_id: tenantId },
      });

      // Finally delete the company (root entity)
      await systemPrisma.companies.deleteMany({
        where: { id: tenantId },
      });
    });
  }
}

/**
 * Enhanced data generators for property tests with proper relationships
 */
export class PropertyTestGenerators {
  /**
   * Generate valid company name that won't cause foreign key issues
   */
  static companyNameGenerator() {
    return fc
      .string({ minLength: 3, maxLength: 30 })
      .filter((s) => s.trim().length > 2 && /^[a-zA-Z0-9\s-_]+$/.test(s.trim()))
      .map((s) => s.trim());
  }

  /**
   * Generate employee data with proper validation
   */
  static employeeGenerator() {
    return fc.record({
      employeeNumber: fc.string({ minLength: 3, maxLength: 15 }).filter(s => s.trim().length > 0),
      firstName: fc.string({ minLength: 2, maxLength: 30 }).filter(s => s.trim().length > 1),
      lastName: fc.string({ minLength: 2, maxLength: 30 }).filter(s => s.trim().length > 1),
      email: fc.emailAddress(),
      employmentStatus: fc.constantFrom('ACTIVE', 'INACTIVE', 'TERMINATED', 'ON_LEAVE'),
      skills: fc.array(
        fc.constantFrom('Security', 'Surveillance', 'Patrol', 'Access Control', 'Emergency Response', 'Customer Service', 'First Aid', 'CPR'),
        { minLength: 0, maxLength: 4 }
      ),
      department: fc.option(fc.constantFrom('Security Operations', 'Patrol Division', 'Administration', 'Training'), { nil: null }),
      jobTitle: fc.option(fc.constantFrom('Security Guard', 'Senior Guard', 'Supervisor', 'Manager'), { nil: null }),
      hireDate: fc.date({ min: new Date('2020-01-01'), max: new Date() }),
      hourlyRate: fc.float({ min: 15, max: 50, noNaN: true }),
      availability: fc.option(fc.constantFrom('AVAILABLE', 'UNAVAILABLE'), { nil: null }),
      complianceStatus: fc.option(fc.constantFrom('COMPLIANT', 'PENDING', 'NON_COMPLIANT'), { nil: null }),
    });
  }

  /**
   * Generate site data with proper validation
   */
  static siteGenerator() {
    return fc.record({
      name: fc.string({ minLength: 3, maxLength: 50 }).filter(s => s.trim().length > 2),
      operationalStatus: fc.constantFrom('ACTIVE', 'INACTIVE', 'MAINTENANCE'),
      address: fc.record({
        street: fc.string({ minLength: 5, maxLength: 100 }),
        city: fc.string({ minLength: 2, maxLength: 50 }),
        state: fc.string({ minLength: 2, maxLength: 50 }),
        zipCode: fc.string({ minLength: 5, maxLength: 10 }),
      }),
    });
  }

  /**
   * Generate client data with proper validation
   */
  static clientGenerator() {
    return fc.record({
      name: fc.string({ minLength: 3, maxLength: 100 }).filter(s => s.trim().length > 2),
      contactEmail: fc.emailAddress(),
      organizationType: fc.constantFrom('CORPORATE_OFFICE', 'HOSPITAL', 'RETAIL', 'MANUFACTURING', 'RESIDENTIAL'),
      contactInfo: fc.option(fc.record({
        contactPerson: fc.string({ minLength: 2, maxLength: 50 }),
        phone: fc.string({ minLength: 10, maxLength: 15 }),
        secondaryEmail: fc.option(fc.emailAddress()),
        address: fc.option(fc.record({
          street: fc.string({ minLength: 5, maxLength: 100 }),
          city: fc.string({ minLength: 2, maxLength: 50 }),
          state: fc.string({ minLength: 2, maxLength: 50 }),
          zipCode: fc.string({ minLength: 5, maxLength: 10 }),
          country: fc.string({ minLength: 2, maxLength: 50 }),
        })),
        notes: fc.option(fc.string({ maxLength: 500 })),
      })),
    });
  }

  /**
   * Generate contract data with proper validation
   */
  static contractGenerator() {
    return fc.record({
      contractNumber: fc.string({ minLength: 5, maxLength: 20 }).filter(s => s.trim().length > 4),
      title: fc.string({ minLength: 5, maxLength: 100 }).filter(s => s.trim().length > 4),
      status: fc.constantFrom('DRAFT', 'ACTIVE', 'EXPIRED', 'TERMINATED'),
      startDate: fc.date({ min: new Date('2020-01-01'), max: new Date() }),
      endDate: fc.option(fc.date({ min: new Date(), max: new Date('2030-12-31') })),
      billingPreferences: fc.option(fc.record({
        frequency: fc.constantFrom('WEEKLY', 'MONTHLY', 'QUARTERLY'),
        method: fc.constantFrom('PORTAL', 'EMAIL', 'MANUAL'),
        paymentTerms: fc.integer({ min: 1, max: 90 }),
        billingEmail: fc.option(fc.emailAddress()),
        instructions: fc.option(fc.string({ maxLength: 500 })),
      })),
    });
  }

  /**
   * Generate attendance data with proper validation
   */
  static attendanceGenerator() {
    return fc.record({
      status: fc.constantFrom('PRESENT', 'LATE', 'ABSENT', 'PENDING'),
      clockIn: fc.date({ min: new Date('2024-01-01'), max: new Date() }),
      clockOut: fc.option(fc.date({ min: new Date('2024-01-01'), max: new Date() })),
    });
  }

  /**
   * Generate payroll data with proper validation
   */
  static payrollGenerator() {
    return fc.record({
      status: fc.constantFrom('DRAFT', 'PROCESSING', 'COMPLETED', 'CANCELLED'),
      totalAmount: fc.float({ min: 1000, max: 50000, noNaN: true, noDefaultInfinity: true }),
      payPeriodStart: fc.date({ min: new Date('2024-01-01'), max: new Date() }),
      payPeriodEnd: fc.date({ min: new Date('2024-01-01'), max: new Date() }),
    });
  }

  /**
   * Generate invoice data with proper validation
   */
  static invoiceGenerator() {
    return fc.record({
      status: fc.constantFrom('DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED'),
      totalAmount: fc.float({ min: 500, max: 25000, noNaN: true, noDefaultInfinity: true }),
      billingPeriodStart: fc.date({ min: new Date('2024-01-01'), max: new Date() }),
      billingPeriodEnd: fc.date({ min: new Date('2024-01-01'), max: new Date() }),
    });
  }
}

/**
 * Enhanced TestDataFactory for robust test data creation
 * Handles foreign key constraints and tenant isolation properly
 */
export class TestDataFactory {
  /**
   * Create a complete test hierarchy with all entities and proper relationships
   * This is the main method for creating test data that avoids FK constraint violations
   */
  static async createCompleteHierarchy(
    prisma: PrismaService,
    tenantId: string,
    options: {
      clientCount?: number;
      employeeCount?: number;
      siteCount?: number;
      createAssignments?: boolean;
      createShifts?: boolean;
      createAttendance?: boolean;
    } = {},
  ) {
    return PropertyTestSetup.createCompleteHierarchy(prisma, tenantId, options);
  }

  /**
   * Create minimal test data for basic operations
   */
  static async createMinimalHierarchy(prisma: PrismaService, tenantId: string) {
    return PropertyTestSetup.createTenantData(prisma, tenantId, 'full');
  }

  /**
   * Create test data with system context bypass
   * Use this when tenant filtering is causing FK constraint issues
   */
  static async createWithSystemContext<T>(
    prisma: PrismaService,
    operation: (systemPrisma: any) => Promise<T>,
  ): Promise<T> {
    return prisma.withSystemContext(operation);
  }

  /**
   * Clean up test data properly to avoid FK constraint violations
   * Enhanced with comprehensive cleanup and error handling
   */
  static async cleanup(prisma: PrismaService, tenantId: string): Promise<void> {
    return PropertyTestSetup.cleanupTenantData(prisma, tenantId);
  }

  /**
   * Comprehensive cleanup that handles multiple tenants and error recovery
   */
  static async comprehensiveCleanup(
    prisma: PrismaService, 
    tenantIds: string[],
    options: {
      continueOnError?: boolean;
      maxRetries?: number;
      retryDelay?: number;
    } = {}
  ): Promise<{ success: string[]; failed: Array<{ tenantId: string; error: string }> }> {
    const { continueOnError = true, maxRetries = 3, retryDelay = 100 } = options;
    const success: string[] = [];
    const failed: Array<{ tenantId: string; error: string }> = [];

    for (const tenantId of tenantIds) {
      let retries = 0;
      let lastError: Error | null = null;

      while (retries <= maxRetries) {
        try {
          await PropertyTestSetup.cleanupTenantData(prisma, tenantId);
          success.push(tenantId);
          break;
        } catch (error) {
          lastError = error as Error;
          retries++;
          
          if (retries <= maxRetries) {
            // Wait before retry
            await new Promise(resolve => setTimeout(resolve, retryDelay * retries));
          }
        }
      }

      if (retries > maxRetries) {
        const errorMsg = lastError?.message || 'Unknown cleanup error';
        failed.push({ tenantId, error: errorMsg });
        
        if (!continueOnError) {
          throw new Error(`Cleanup failed for tenant ${tenantId}: ${errorMsg}`);
        }
      }
    }

    return { success, failed };
  }

  /**
   * Create test data with automatic cleanup registration
   * Ensures proper cleanup even if tests fail
   */
  static async createWithAutoCleanup<T>(
    prisma: PrismaService,
    tenantId: string,
    operation: (systemPrisma: any) => Promise<T>,
    cleanupRegistry?: Set<string>
  ): Promise<T> {
    // Register for cleanup
    if (cleanupRegistry) {
      cleanupRegistry.add(tenantId);
    }

    try {
      return await prisma.withSystemContext(operation);
    } catch (error) {
      // If creation fails, still ensure cleanup is attempted
      try {
        await PropertyTestSetup.cleanupTenantData(prisma, tenantId);
      } catch (cleanupError) {
        console.warn(`Cleanup after creation failure failed for tenant ${tenantId}:`, (cleanupError as any).message);
      }
      throw error;
    }
  }
}

/**
 * Test Isolation Manager
 * Provides comprehensive test isolation and cleanup coordination
 */
export class TestIsolationManager {
  private static cleanupRegistry = new Set<string>();
  private static moduleRegistry = new Set<TestingModule>();

  /**
   * Register a tenant for cleanup
   */
  static registerTenantForCleanup(tenantId: string): void {
    TestIsolationManager.cleanupRegistry.add(tenantId);
  }

  /**
   * Register a module for cleanup
   */
  static registerModuleForCleanup(module: TestingModule): void {
    TestIsolationManager.moduleRegistry.add(module);
  }

  /**
   * Perform comprehensive cleanup of all registered resources
   */
  static async performGlobalCleanup(prisma?: PrismaService): Promise<void> {
    const errors: string[] = [];

    // Clean up all registered tenants
    if (prisma && TestIsolationManager.cleanupRegistry.size > 0) {
      try {
        const tenantIds = Array.from(TestIsolationManager.cleanupRegistry);
        const result = await TestDataFactory.comprehensiveCleanup(prisma, tenantIds, {
          continueOnError: true,
          maxRetries: 2,
          retryDelay: 50,
        });

        if (result.failed.length > 0) {
          errors.push(`Failed to clean up tenants: ${result.failed.map(f => f.tenantId).join(', ')}`);
        }
      } catch (error) {
        errors.push(`Tenant cleanup failed: ${(error as Error).message}`);
      }
    }

    // Clean up all registered modules
    for (const module of TestIsolationManager.moduleRegistry) {
      try {
        await module.close();
      } catch (error) {
        errors.push(`Module cleanup failed: ${(error as Error).message}`);
      }
    }

    // Clear registries
    TestIsolationManager.cleanupRegistry.clear();
    TestIsolationManager.moduleRegistry.clear();

    // Clear Jest mocks
    try {
      jest.clearAllMocks();
      jest.restoreAllMocks();
    } catch (error) {
      errors.push(`Mock cleanup failed: ${(error as Error).message}`);
    }

    if (errors.length > 0) {
      console.warn('Global cleanup completed with warnings:', errors);
    }
  }

  /**
   * Create an isolated test environment with automatic cleanup registration
   */
  static async createIsolatedTestEnvironment<T>(
    setupFn: () => Promise<{ module: TestingModule; prisma?: PrismaService; tenantId?: string; result: T }>,
    cleanupFn?: (module: TestingModule, prisma?: PrismaService, tenantId?: string) => Promise<void>
  ): Promise<T> {
    let module: TestingModule | undefined;
    let prisma: PrismaService | undefined;
    let tenantId: string | undefined;

    try {
      const setup = await setupFn();
      module = setup.module;
      prisma = setup.prisma;
      tenantId = setup.tenantId;

      // Register for cleanup
      TestIsolationManager.registerModuleForCleanup(module);
      if (tenantId) {
        TestIsolationManager.registerTenantForCleanup(tenantId);
      }

      return setup.result;
    } catch (error) {
      // Perform immediate cleanup on setup failure
      if (cleanupFn && module) {
        try {
          await cleanupFn(module, prisma, tenantId);
        } catch (cleanupError) {
          console.warn('Cleanup after setup failure failed:', (cleanupError as any).message);
        }
      }
      throw error;
    }
  }

  /**
   * Get current cleanup statistics
   */
  static getCleanupStatistics(): { tenantCount: number; moduleCount: number } {
    return {
      tenantCount: TestIsolationManager.cleanupRegistry.size,
      moduleCount: TestIsolationManager.moduleRegistry.size,
    };
  }
}