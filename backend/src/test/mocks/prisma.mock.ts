/**
 * Centralized Prisma Mock Factory
 * 
 * This factory creates consistent mocks for PrismaService across all tests.
 * Adding new Prisma methods only requires one update here.
 */

export const createPrismaMock = () => ({
  // Core Prisma methods
  $transaction: jest.fn(),
  $connect: jest.fn(),
  $disconnect: jest.fn(),
  $executeRaw: jest.fn(),
  $queryRaw: jest.fn(),

  // Employee model
  employee: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
    count: jest.fn(),
    aggregate: jest.fn(),
  },

  // Client model
  client: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
    count: jest.fn(),
    aggregate: jest.fn(),
  },

  // Contract model
  contract: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
    count: jest.fn(),
    aggregate: jest.fn(),
  },

  // Site model
  site: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
    count: jest.fn(),
    aggregate: jest.fn(),
  },

  // Assignment model
  assignment: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
    count: jest.fn(),
    aggregate: jest.fn(),
  },

  // Shift model
  shift: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
    count: jest.fn(),
    aggregate: jest.fn(),
  },

  // Attendance model
  attendance: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
    count: jest.fn(),
    aggregate: jest.fn(),
  },

  // Payroll model
  payroll: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
    count: jest.fn(),
    aggregate: jest.fn(),
  },

  // Invoice model
  invoice: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
    count: jest.fn(),
    aggregate: jest.fn(),
  },

  // User model
  user: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
    count: jest.fn(),
    aggregate: jest.fn(),
  },

  // Company model
  company: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
    count: jest.fn(),
    aggregate: jest.fn(),
  },

  // Add tenant-aware methods
  withTenant: jest.fn((tenantId: string, callback: any) => {
    // Mock implementation that calls the callback with this mock
    return callback(createPrismaMock());
  }),
});

/**
 * Create a repository mock with common CRUD operations
 */
export const createRepositoryMock = () => ({
  // Basic CRUD operations
  create: jest.fn(),
  findById: jest.fn(),
  findMany: jest.fn(),
  findAll: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  count: jest.fn(),
  exists: jest.fn(),
  
  // Common repository-specific methods
  findByEmail: jest.fn(),
  findByStatus: jest.fn(),
  findWithRelations: jest.fn(),
  softDelete: jest.fn(),
  
  // Client-specific methods
  findWithExpiringContracts: jest.fn(),
  findByContractStatus: jest.fn(),
  
  // Site-specific methods
  getSiteStats: jest.fn(),
  findByClientId: jest.fn(),
  findByOperationalStatus: jest.fn(),
  
  // Employee-specific methods
  findBySkills: jest.fn(),
  findAvailable: jest.fn(),
  findByDepartment: jest.fn(),
  
  // Assignment-specific methods
  findByEmployee: jest.fn(),
  findBySite: jest.fn(),
  findConflicts: jest.fn(),
  
  // Common query methods
  search: jest.fn(),
  paginate: jest.fn(),
  aggregate: jest.fn(),
});

/**
 * Create service mocks for common services
 */
export const createServiceMocks = () => ({
  tenantContext: {
    getTenantId: jest.fn().mockReturnValue('test-tenant-id'),
    setTenantId: jest.fn(),
    getCurrentUser: jest.fn().mockReturnValue({ id: 'test-user-id' }),
    getUserRole: jest.fn().mockReturnValue('MANAGER'),
    hasContext: jest.fn().mockReturnValue(true), // CRITICAL: Add missing hasContext method
    getContext: jest.fn().mockReturnValue({
      tenantId: 'test-tenant-id',
      userId: 'test-user-id',
      userRole: 'MANAGER',
      isSet: true,
    }),
    validateTenantAccess: jest.fn().mockReturnValue(true),
    isAdmin: jest.fn().mockReturnValue(true),
    hasRole: jest.fn().mockReturnValue(true),
    hasAnyRole: jest.fn().mockReturnValue(true),
    clearContext: jest.fn(),
    getContextSnapshot: jest.fn().mockReturnValue('Context[tenant:test-tenant-id,user:test-user-id,role:MANAGER,set:true]'),
    setContext: jest.fn(),
    getUserId: jest.fn().mockReturnValue('test-user-id'),
  },
  
  logger: {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
  
  config: {
    get: jest.fn(),
    set: jest.fn(),
  },
});

/**
 * Utility to reset all mocks
 */
export const resetAllMocks = (mocks: any) => {
  Object.values(mocks).forEach((mock: any) => {
    if (typeof mock === 'object' && mock !== null) {
      Object.values(mock).forEach((method: any) => {
        if (jest.isMockFunction(method)) {
          method.mockReset();
        }
      });
    }
  });
};