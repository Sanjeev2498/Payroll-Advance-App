import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { ContractStatus } from '../clients/dto/create-client.dto';
import { TenantContextService } from './tenant-context.service';
import { TenantContextMiddleware, AuthenticatedRequest } from './tenant-context.middleware';
import { TenantGuard } from './tenant.guard';
import { EmployeeRepository } from './repositories/employee.repository';
import { ClientRepository } from './repositories/client.repository';
import { Request, Response, NextFunction } from 'express';

describe('Tenant Context Management System', () => {
  let module: TestingModule;
  let prismaService: PrismaService;
  let tenantContextService: TenantContextService;
  let tenantContextMiddleware: TenantContextMiddleware;
  let tenantGuard: TenantGuard;
  let employeeRepository: EmployeeRepository;
  let clientRepository: ClientRepository;

  const mockTenant1 = {
    id: '11111111-1111-1111-1111-111111111111',
    user: {
      id: 'user1',
      tenantId: '11111111-1111-1111-1111-111111111111',
      companyId: '11111111-1111-1111-1111-111111111111',
      role: 'COMPANY_ADMIN',
      email: 'admin@company1.com',
    },
  };

  const mockTenant2 = {
    id: '22222222-2222-2222-2222-222222222222',
    user: {
      id: 'user2',
      tenantId: '22222222-2222-2222-2222-222222222222',
      companyId: '22222222-2222-2222-2222-222222222222',
      role: 'MANAGER',
      email: 'manager@company2.com',
    },
  };

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          cache: true,
        }),
      ],
      providers: [
        PrismaService,
        TenantContextService,
        TenantContextMiddleware,
        TenantGuard,
        EmployeeRepository,
        ClientRepository,
        {
          provide: 'Reflector',
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    prismaService = module.get<PrismaService>(PrismaService);
    tenantContextService = await module.resolve<TenantContextService>(TenantContextService);
    tenantContextMiddleware = await module.resolve<TenantContextMiddleware>(TenantContextMiddleware);
    tenantGuard = module.get<TenantGuard>(TenantGuard);
    employeeRepository = module.get<EmployeeRepository>(EmployeeRepository);
    clientRepository = module.get<ClientRepository>(ClientRepository);

    await prismaService.onModuleInit();

    // Setup test companies
    await setupTestCompanies();
  });

  afterAll(async () => {
    // Cleanup test data
    await cleanupTestData();
    await prismaService.onModuleDestroy();
    await module.close();
  });

  beforeEach(() => {
    // Clear context before each test
    tenantContextService.clearContext();
  });

  describe('TenantContextService', () => {
    it('should set and get tenant context correctly', () => {
      // Initially no context should be set
      expect(tenantContextService.hasContext()).toBe(false);

      // Set tenant context
      tenantContextService.setContext(
        mockTenant1.id,
        mockTenant1.user.id,
        mockTenant1.user.role
      );

      // Verify context is set
      expect(tenantContextService.hasContext()).toBe(true);
      expect(tenantContextService.getTenantId()).toBe(mockTenant1.id);
      expect(tenantContextService.getUserId()).toBe(mockTenant1.user.id);
      expect(tenantContextService.getUserRole()).toBe(mockTenant1.user.role);
    });

    it('should validate tenant access correctly', () => {
      tenantContextService.setContext(
        mockTenant1.id,
        mockTenant1.user.id,
        mockTenant1.user.role
      );

      // Should allow access to own tenant
      expect(tenantContextService.validateTenantAccess(mockTenant1.id)).toBe(true);

      // Should deny access to different tenant
      expect(tenantContextService.validateTenantAccess(mockTenant2.id)).toBe(false);
    });

    it('should check roles correctly', () => {
      tenantContextService.setContext(
        mockTenant1.id,
        mockTenant1.user.id,
        mockTenant1.user.role
      );

      expect(tenantContextService.isAdmin()).toBe(true);
      expect(tenantContextService.hasRole('COMPANY_ADMIN')).toBe(true);
      expect(tenantContextService.hasRole('EMPLOYEE')).toBe(false);
      expect(tenantContextService.hasAnyRole(['MANAGER', 'COMPANY_ADMIN'])).toBe(true);
      expect(tenantContextService.hasAnyRole(['EMPLOYEE', 'SUPERVISOR'])).toBe(false);
    });

    it('should clear context correctly', () => {
      tenantContextService.setContext(
        mockTenant1.id,
        mockTenant1.user.id,
        mockTenant1.user.role
      );

      expect(tenantContextService.hasContext()).toBe(true);

      tenantContextService.clearContext();

      expect(tenantContextService.hasContext()).toBe(false);
      expect(() => tenantContextService.getTenantId()).toThrow();
    });
  });

  describe('TenantContextMiddleware', () => {
    it('should set tenant context for authenticated requests', async () => {
      const mockRequest: Partial<AuthenticatedRequest> = {
        path: '/api/employees',
        user: mockTenant1.user,
      };

      const mockResponse: Partial<Response> = {};
      const mockNext: NextFunction = jest.fn();

      await tenantContextMiddleware.use(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(tenantContextService.hasContext()).toBe(true);
      expect(tenantContextService.getTenantId()).toBe(mockTenant1.id);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should skip tenant context for public endpoints', async () => {
      const mockRequest: Partial<AuthenticatedRequest> = {
        path: '/api/auth/login',
        user: undefined,
      };

      const mockResponse: Partial<Response> = {};
      const mockNext: NextFunction = jest.fn();

      await tenantContextMiddleware.use(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(tenantContextService.hasContext()).toBe(false);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should clear context for unauthenticated requests', async () => {
      // First set some context
      tenantContextService.setContext(mockTenant1.id, mockTenant1.user.id, mockTenant1.user.role);
      expect(tenantContextService.hasContext()).toBe(true);

      const mockRequest: Partial<AuthenticatedRequest> = {
        path: '/api/employees',
        user: undefined,
      };

      const mockResponse: Partial<Response> = {};
      const mockNext: NextFunction = jest.fn();

      await tenantContextMiddleware.use(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(tenantContextService.hasContext()).toBe(false);
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('Repository Tenant Isolation', () => {
    beforeEach(async () => {
      // Set tenant context for repository tests
      tenantContextService.setContext(
        mockTenant1.id,
        mockTenant1.user.id,
        mockTenant1.user.role
      );
      await prismaService.setTenantContext(mockTenant1.id, mockTenant1.user.role);
    });

    it('should create employee in correct tenant context', async () => {
      const employeeData = {
        employeeNumber: 'EMP001',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@company1.com',
        skills: ['Security', 'First Aid'],
      };

      const employee = await employeeRepository.create(employeeData);

      expect(employee).toBeDefined();
      expect(employee.companyId).toBe(mockTenant1.id);
      expect(employee.firstName).toBe('John');
      expect(employee.lastName).toBe('Doe');
    });

    it('should create client in correct tenant context', async () => {
      const clientData = {
        name: 'ABC Corporation',
        contactEmail: 'contact@abccorp.com',
        contractStatus: ContractStatus.ACTIVE,
      };

      const client = await clientRepository.create(clientData);

      expect(client).toBeDefined();
      expect(client.companyId).toBe(mockTenant1.id);
      expect(client.name).toBe('ABC Corporation');
    });

    it('should find employees only from current tenant', async () => {
      // Create employees for both tenants
      await createTestEmployee(mockTenant1.id, 'John', 'Doe', 'john@company1.com');
      await createTestEmployee(mockTenant2.id, 'Jane', 'Smith', 'jane@company2.com');

      // Search as tenant 1
      tenantContextService.setContext(mockTenant1.id, mockTenant1.user.id, mockTenant1.user.role);
      await prismaService.setTenantContext(mockTenant1.id, mockTenant1.user.role);

      const result = await employeeRepository.findMany();

      // Should only find employees from tenant 1
      expect(result.employees).toHaveLength(1);
      expect(result.employees[0].companyId).toBe(mockTenant1.id);
      expect(result.employees[0].firstName).toBe('John');
    });

    it('should search employees by skills within tenant', async () => {
      await createTestEmployee(mockTenant1.id, 'Security', 'Guard', 'guard@company1.com', ['Security', 'Patrol']);
      await createTestEmployee(mockTenant1.id, 'Office', 'Manager', 'manager@company1.com', ['Management']);

      const securityEmployees = await employeeRepository.findBySkills(['Security']);

      expect(securityEmployees).toHaveLength(1);
      expect(securityEmployees[0].firstName).toBe('Security');
      expect(securityEmployees[0].skills).toContain('Security');
    });
  });

  describe('Database RLS Integration', () => {
    it('should validate RLS configuration', async () => {
      const rlsStatus = await prismaService.validateRLSConfiguration();

      expect(rlsStatus).toBeDefined();
      expect(Array.isArray(rlsStatus)).toBe(true);
      
      // Check that key tables have RLS enabled
      const employeeRLS = rlsStatus.find(table => table.tableName === 'employees');
      const clientRLS = rlsStatus.find(table => table.tableName === 'clients');
      
      expect(employeeRLS?.rlsEnabled).toBe(true);
      expect(clientRLS?.rlsEnabled).toBe(true);
    });

    it('should test RLS isolation between tenants', async () => {
      const isolationTest = await prismaService.testRLSIsolation(mockTenant1.id, mockTenant2.id);

      expect(isolationTest).toBeDefined();
      expect(isolationTest.crossTenantLeakage).toBe(false);
      expect(typeof isolationTest.tenant1CompanyCount).toBe('number');
      expect(typeof isolationTest.tenant2CompanyCount).toBe('number');
    });

    it('should get current tenant context from database', async () => {
      await prismaService.setTenantContext(mockTenant1.id, mockTenant1.user.role);

      const context = await prismaService.getTenantContext();

      expect(context.tenantId).toBe(mockTenant1.id);
      expect(context.userRole).toBe(mockTenant1.user.role);
    });
  });

  // Helper functions
  async function setupTestCompanies() {
    await prismaService.withSystemContext(async (prisma) => {
      // Create test companies if they don't exist
      await prisma.company.upsert({
        where: { id: mockTenant1.id },
        update: {},
        create: {
          id: mockTenant1.id,
          name: 'Test Company 1',
          slug: 'test-company-1',
          settings: {},
          branding: {},
        },
      });

      await prisma.company.upsert({
        where: { id: mockTenant2.id },
        update: {},
        create: {
          id: mockTenant2.id,
          name: 'Test Company 2',
          slug: 'test-company-2',
          settings: {},
          branding: {},
        },
      });
    });
  }

  async function createTestEmployee(
    tenantId: string,
    firstName: string,
    lastName: string,
    email: string,
    skills: string[] = []
  ) {
    return prismaService.withTenant(tenantId, async (prisma) => {
      return prisma.employee.create({
        data: {
          companyId: tenantId,
          employeeNumber: `EMP${Date.now()}${Math.random()}`,
          firstName,
          lastName,
          email,
          skills,
          employmentStatus: 'ACTIVE',
        },
      });
    });
  }

  async function cleanupTestData() {
    await prismaService.withSystemContext(async (prisma) => {
      // Clean up test data
      await prisma.employee.deleteMany({
        where: {
          companyId: {
            in: [mockTenant1.id, mockTenant2.id],
          },
        },
      });

      await prisma.client.deleteMany({
        where: {
          companyId: {
            in: [mockTenant1.id, mockTenant2.id],
          },
        },
      });

      // Note: We don't delete companies as they might be used by other tests
    });
  }
});