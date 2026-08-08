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
      const errorMessage = `Failed to resolve service ${serviceName}: ${error.message}`;
      console.warn(errorMessage);
      
      // Attempt alternative resolution method
      try {
        const alternative = isScoped ? module.get<T>(serviceToken) : await module.resolve<T>(serviceToken);
        console.log(`Successfully resolved ${serviceName} using alternative method`);
        return alternative;
      } catch (fallbackError) {
        throw new Error(`${errorMessage}. Alternative resolution also failed: ${fallbackError.message}`);
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
      errors.push(`Data cleanup failed: ${error.message}`);
    }

    try {
      // Clean up module and close connections
      if (module) {
        await module.close();
      }
    } catch (error) {
      errors.push(`Module cleanup failed: ${error.message}`);
    }

    // Clear any Jest mocks to prevent leakage between tests
    try {
      jest.clearAllMocks();
      jest.restoreAllMocks();
    } catch (error) {
      errors.push(`Mock cleanup failed: ${error.message}`);
    }

    if (errors.length > 0) {
      console.warn('Cleanup completed with warnings:', errors);
    }
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
      withTenant: jest.fn().mockImplementation((tenantId, fn) => fn(mockPrismaService)),
      withSystemContext: jest.fn().mockImplementation((fn) => fn(mockPrismaService)),
      getTenantContext: jest.fn().mockResolvedValue({
        tenantId,
        userRole,
      }),
      validateRLSConfiguration: jest.fn().mockResolvedValue(true),
      enableRLS: jest.fn().mockResolvedValue(undefined),
      createTenantPolicy: jest.fn().mockResolvedValue(undefined),
      testRLSIsolation: jest.fn().mockResolvedValue(true),

      // Model delegates with findFirst, findMany, create, update, delete methods
      company: {
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockImplementation((args) => ({ id: uuidv4(), ...args.data })),
        createMany: jest.fn().mockImplementation((args) => ({ count: args.data.length })),
        update: jest.fn().mockImplementation((args) => ({ id: args.where.id, ...args.data })),
        updateMany: jest.fn().mockImplementation(() => ({ count: 0 })),
        upsert: jest.fn().mockImplementation((args) => ({ id: uuidv4(), ...args.create, ...args.update })),
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
      },
      client: {
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockImplementation((args) => ({ id: uuidv4(), ...args.data })),
        createMany: jest.fn().mockImplementation((args) => ({ count: args.data.length })),
        update: jest.fn().mockImplementation((args) => ({ id: args.where.id, ...args.data })),
        updateMany: jest.fn().mockImplementation(() => ({ count: 0 })),
        upsert: jest.fn().mockImplementation((args) => ({ id: uuidv4(), ...args.create, ...args.update })),
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
      },
      contract: {
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockImplementation((args) => ({ id: uuidv4(), ...args.data })),
        createMany: jest.fn().mockImplementation((args) => ({ count: args.data.length })),
        update: jest.fn().mockImplementation((args) => ({ id: args.where.id, ...args.data })),
        updateMany: jest.fn().mockImplementation(() => ({ count: 0 })),
        upsert: jest.fn().mockImplementation((args) => ({ id: uuidv4(), ...args.create, ...args.update })),
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
      },
      site: {
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockImplementation((args) => ({ id: uuidv4(), ...args.data })),
        update: jest.fn().mockImplementation((args) => ({ id: args.where.id, ...args.data })),
        upsert: jest.fn().mockImplementation((args) => ({ id: uuidv4(), ...args.create, ...args.update })),
        delete: jest.fn().mockResolvedValue({ id: 'deleted' }),
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        count: jest.fn().mockResolvedValue(0),
      },
      employee: {
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockImplementation((args) => ({ id: uuidv4(), ...args.data })),
        createMany: jest.fn().mockImplementation((args) => ({ count: args.data.length })),
        update: jest.fn().mockImplementation((args) => ({ id: args.where.id, ...args.data })),
        updateMany: jest.fn().mockImplementation(() => ({ count: 0 })),
        upsert: jest.fn().mockImplementation((args) => ({ id: uuidv4(), ...args.create, ...args.update })),
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
      },
      user: {
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockImplementation((args) => ({ id: uuidv4(), ...args.data })),
        update: jest.fn().mockImplementation((args) => ({ id: args.where.id, ...args.data })),
        upsert: jest.fn().mockImplementation((args) => ({ id: uuidv4(), ...args.create, ...args.update })),
        delete: jest.fn().mockResolvedValue({ id: 'deleted' }),
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        count: jest.fn().mockResolvedValue(0),
      },
      assignment: {
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockImplementation((args) => ({ id: uuidv4(), ...args.data })),
        update: jest.fn().mockImplementation((args) => ({ id: args.where.id, ...args.data })),
        upsert: jest.fn().mockImplementation((args) => ({ id: uuidv4(), ...args.create, ...args.update })),
        delete: jest.fn().mockResolvedValue({ id: 'deleted' }),
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        count: jest.fn().mockResolvedValue(0),
      },
      shift: {
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockImplementation((args) => ({ id: uuidv4(), ...args.data })),
        update: jest.fn().mockImplementation((args) => ({ id: args.where.id, ...args.data })),
        upsert: jest.fn().mockImplementation((args) => ({ id: uuidv4(), ...args.create, ...args.update })),
        delete: jest.fn().mockResolvedValue({ id: 'deleted' }),
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        count: jest.fn().mockResolvedValue(0),
      },
      shiftTemplate: {
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockImplementation((args) => ({ id: uuidv4(), ...args.data })),
        update: jest.fn().mockImplementation((args) => ({ id: args.where.id, ...args.data })),
        upsert: jest.fn().mockImplementation((args) => ({ id: uuidv4(), ...args.create, ...args.update })),
        delete: jest.fn().mockResolvedValue({ id: 'deleted' }),
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        count: jest.fn().mockResolvedValue(0),
      },
      shiftNotification: {
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockImplementation((args) => ({ id: uuidv4(), ...args.data })),
        update: jest.fn().mockImplementation((args) => ({ id: args.where.id, ...args.data })),
        upsert: jest.fn().mockImplementation((args) => ({ id: uuidv4(), ...args.create, ...args.update })),
        delete: jest.fn().mockResolvedValue({ id: 'deleted' }),
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        count: jest.fn().mockResolvedValue(0),
      },
      attendance: {
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockImplementation((args) => ({ id: uuidv4(), ...args.data })),
        update: jest.fn().mockImplementation((args) => ({ id: args.where.id, ...args.data })),
        upsert: jest.fn().mockImplementation((args) => ({ id: uuidv4(), ...args.create, ...args.update })),
        delete: jest.fn().mockResolvedValue({ id: 'deleted' }),
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        count: jest.fn().mockResolvedValue(0),
      },
      payrollRun: {
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockImplementation((args) => ({ id: uuidv4(), ...args.data })),
        update: jest.fn().mockImplementation((args) => ({ id: args.where.id, ...args.data })),
        upsert: jest.fn().mockImplementation((args) => ({ id: uuidv4(), ...args.create, ...args.update })),
        delete: jest.fn().mockResolvedValue({ id: 'deleted' }),
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        count: jest.fn().mockResolvedValue(0),
      },
      payrollItem: {
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockImplementation((args) => ({ id: uuidv4(), ...args.data })),
        createMany: jest.fn().mockImplementation((args) => ({ count: args.data.length })),
        update: jest.fn().mockImplementation((args) => ({ id: args.where.id, ...args.data })),
        updateMany: jest.fn().mockImplementation(() => ({ count: 0 })),
        upsert: jest.fn().mockImplementation((args) => ({ id: uuidv4(), ...args.create, ...args.update })),
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
      },
      invoice: {
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockImplementation((args) => ({ id: uuidv4(), ...args.data })),
        createMany: jest.fn().mockImplementation((args) => ({ count: args.data.length })),
        update: jest.fn().mockImplementation((args) => ({ id: args.where.id, ...args.data })),
        updateMany: jest.fn().mockImplementation(() => ({ count: 0 })),
        upsert: jest.fn().mockImplementation((args) => ({ id: uuidv4(), ...args.create, ...args.update })),
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
      },
      clientUser: {
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockImplementation((args) => ({ id: uuidv4(), ...args.data })),
        update: jest.fn().mockImplementation((args) => ({ id: args.where.id, ...args.data })),
        upsert: jest.fn().mockImplementation((args) => ({ id: uuidv4(), ...args.create, ...args.update })),
        delete: jest.fn().mockResolvedValue({ id: 'deleted' }),
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        count: jest.fn().mockResolvedValue(0),
      },
      clientDocument: {
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockImplementation((args) => ({ id: uuidv4(), ...args.data })),
        update: jest.fn().mockImplementation((args) => ({ id: args.where.id, ...args.data })),
        upsert: jest.fn().mockImplementation((args) => ({ id: uuidv4(), ...args.create, ...args.update })),
        delete: jest.fn().mockResolvedValue({ id: 'deleted' }),
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        count: jest.fn().mockResolvedValue(0),
      },
      clientInteraction: {
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockImplementation((args) => ({ id: uuidv4(), ...args.data })),
        update: jest.fn().mockImplementation((args) => ({ id: args.where.id, ...args.data })),
        upsert: jest.fn().mockImplementation((args) => ({ id: uuidv4(), ...args.create, ...args.update })),
        delete: jest.fn().mockResolvedValue({ id: 'deleted' }),
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        count: jest.fn().mockResolvedValue(0),
      },

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
      findAll: jest.fn().mockResolvedValue([]),
      findById: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation((data) => ({ id: uuidv4(), ...data })),
      update: jest.fn().mockImplementation((id, data) => ({ id, ...data })),
      delete: jest.fn().mockResolvedValue({ id: 'deleted' }),
    };

    const mockClientRepository = {
      findAll: jest.fn().mockResolvedValue([]),
      findById: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation((data) => ({ id: uuidv4(), ...data })),
      update: jest.fn().mockImplementation((id, data) => ({ id, ...data })),
      delete: jest.fn().mockResolvedValue({ id: 'deleted' }),
    };

    const mockEmployeeRepository = {
      findAll: jest.fn().mockResolvedValue([]),
      findById: jest.fn().mockResolvedValue(null),
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
      mockSiteRepository,
      mockClientRepository,
      mockEmployeeRepository,
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
          useValue: mocks.mockGstCalculationService, // Reuse for simplicity
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
      console.warn('Failed to initialize PrismaService:', error.message);
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
      console.warn('Failed to resolve TenantContextService:', error.message);
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
      const company = await systemPrisma.company.upsert({
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
      const client = await systemPrisma.client.create({
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
      const contract = await systemPrisma.contract.create({
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
      const site = await systemPrisma.site.create({
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
      const employee = await systemPrisma.employee.create({
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
      const company = await systemPrisma.company.upsert({
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
        const client = await systemPrisma.client.create({
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
        const contract = await systemPrisma.contract.create({
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
        const site = await systemPrisma.site.create({
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
        const employee = await systemPrisma.employee.create({
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
          const assignment = await systemPrisma.assignment.create({
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
          const shift = await systemPrisma.shift.create({
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
   * Clean up all test data for a tenant
   * CRITICAL: Uses system context and deletes in reverse dependency order
   */
  static async cleanupTenantData(prisma: PrismaService, tenantId: string) {
    return await prisma.withSystemContext(async (systemPrisma) => {
      // Delete in reverse dependency order to avoid FK constraint violations
      await systemPrisma.attendance.deleteMany({
        where: {
          employee: { companyId: tenantId },
        },
      });

      await systemPrisma.shiftNotification.deleteMany({
        where: {
          shift: {
            site: {
              contract: {
                client: { companyId: tenantId },
              },
            },
          },
        },
      });

      await systemPrisma.shift.deleteMany({
        where: {
          site: {
            contract: {
              client: { companyId: tenantId },
            },
          },
        },
      });

      await systemPrisma.assignment.deleteMany({
        where: {
          employee: { companyId: tenantId },
        },
      });

      await systemPrisma.payrollItem.deleteMany({
        where: {
          employee: { companyId: tenantId },
        },
      });

      await systemPrisma.payrollRun.deleteMany({
        where: { companyId: tenantId },
      });

      await systemPrisma.invoice.deleteMany({
        where: {
          contract: {
            client: { companyId: tenantId },
          },
        },
      });

      await systemPrisma.site.deleteMany({
        where: {
          contract: {
            client: { companyId: tenantId },
          },
        },
      });

      await systemPrisma.contract.deleteMany({
        where: {
          client: { companyId: tenantId },
        },
      });

      await systemPrisma.employee.deleteMany({
        where: { companyId: tenantId },
      });

      await systemPrisma.clientInteraction.deleteMany({
        where: {
          client: { companyId: tenantId },
        },
      });

      await systemPrisma.clientDocument.deleteMany({
        where: {
          client: { companyId: tenantId },
        },
      });

      await systemPrisma.clientUser.deleteMany({
        where: {
          client: { companyId: tenantId },
        },
      });

      await systemPrisma.client.deleteMany({
        where: { companyId: tenantId },
      });

      await systemPrisma.user.deleteMany({
        where: { companyId: tenantId },
      });

      await systemPrisma.shiftTemplate.deleteMany({
        where: { companyId: tenantId },
      });

      // Finally delete the company (root entity)
      await systemPrisma.company.deleteMany({
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
          lastError = error;
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
        console.warn(`Cleanup after creation failure failed for tenant ${tenantId}:`, cleanupError.message);
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
        errors.push(`Tenant cleanup failed: ${error.message}`);
      }
    }

    // Clean up all registered modules
    for (const module of TestIsolationManager.moduleRegistry) {
      try {
        await module.close();
      } catch (error) {
        errors.push(`Module cleanup failed: ${error.message}`);
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
      errors.push(`Mock cleanup failed: ${error.message}`);
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
          console.warn('Cleanup after setup failure failed:', cleanupError.message);
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