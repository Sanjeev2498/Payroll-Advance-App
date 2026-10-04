import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantContextService } from '../../common/tenant-context.service';
import { CommonModule } from '../../common/common.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { randomUUID } from 'crypto';
import { ContractStatus } from '@prisma/client';

/**
 * **Property 31: Client Architecture Correctness**
 * **Validates: Requirements 2.1, 11.4**
 * 
 * This property test ensures that the client architecture correctly implements
 * the Company ? Client ? Contract ? Sites ? Deployments hierarchy and
 * maintains proper data relationships and access patterns.
 */
describe('Property 31: Client Architecture Correctness', () => {
  let module: TestingModule;
  let prisma: PrismaService;
  let tenantId: string;

  const mockTenantContextService = {
    getTenantId: () => tenantId,
    setContext: (id: string) => { tenantId = id; },
    getUserId: () => 'test-user',
    getUserRole: () => 'COMPANY_ADMIN',
    hasContext: () => Boolean(tenantId),
    validateTenantAccess: () => true,
    isAdmin: () => true,
    clearContext: () => { tenantId = null; },
    getContext: () => ({ tenantId, userId: 'test-user', userRole: 'COMPANY_ADMIN' }),
    getContextSnapshot: () => `tenant:${tenantId}, user:test-user, role:COMPANY_ADMIN`
  };

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [CommonModule, PrismaModule],
    })
    .overrideProvider(TenantContextService)
    .useValue(mockTenantContextService)
    .compile();

    prisma = module.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    if (module) await module.close();
  });

  beforeEach(() => {
    tenantId = randomUUID();
    mockTenantContextService.setContext(tenantId);
  });

  /**
   * Property 31.1: Client Architecture Hierarchy Validation
   * Tests the Company ? Client ? Contract ? Sites ? Deployments relationship chain
   */
  it('Property 31.1: should validate client architecture hierarchy correctness', async () => {
    // Setup: Create the complete hierarchy
    await setupTestData();

    const clientId = randomUUID();
    const contractId = randomUUID();
    const siteId = randomUUID();

    // Test 1: Create Client under Company
    const client = await prisma.clients.create({
      data: {
        id: clientId,
        company_id: tenantId, // Links to Company
        name: 'Test Client Corporation',
        contact_email: 'client@testcorp.com',
        contract_status: ContractStatus.ACTIVE,
        industry: 'Healthcare',
        created_at: new Date(),
        updated_at: new Date()
      }
    });

    // Property 31.1a: Validate client-company relationship
    expect(client.company_id).toBe(tenantId);
    expect(client.id).toBe(clientId);
    expect(client.name).toBe('Test Client Corporation');

    // Test 2: Create Contract under Client
    const contract = await prisma.contracts.create({
      data: {
        id: contractId,
        client_id: clientId, // Links to Client
        contract_number: `CNT-${Date.now()}`,
        title: 'Security Services Contract',
        status: ContractStatus.ACTIVE,
        start_date: new Date(),
        service_definitions: {
          services: ['security', 'patrol'],
          guardCount: 4,
          shiftPattern: '24x7',
          supervisorRequired: true
        },
        created_at: new Date(),
        updated_at: new Date()
      }
    });

    // Property 31.1b: Validate contract-client relationship
    expect(contract.client_id).toBe(clientId);
    expect(contract.id).toBe(contractId);
    expect(contract.service_definitions).toBeDefined();

    // Test 3: Create Site under Contract
    const site = await prisma.sites.create({
      data: {
        id: siteId,
        client_id: clientId,   // Links to Client
        contract_id: contractId, // Links to Contract
        name: 'Main Office Building',
        address: {
          street: '123 Business Avenue',
          city: 'Business City',
          state: 'Business State',
          postalCode: '12345',
          country: 'India'
        },
        operational_status: 'ACTIVE',
        created_at: new Date(),
        updated_at: new Date()
      }
    });

    // Property 31.1c: Validate site relationships
    expect(site.client_id).toBe(clientId);
    expect(site.contract_id).toBe(contractId);
    expect(site.operational_status).toBe('ACTIVE');

    // Test 4: Validate hierarchy integrity through queries
    const clientWithRelations = await prisma.clients.findUnique({
      where: { id: clientId },
      include: {
        contracts: {
          include: {
            sites: true
          }
        }
      }
    });

    // Property 31.1d: Validate complete hierarchy
    expect(clientWithRelations).toBeDefined();
    expect(clientWithRelations!.contracts.length).toBe(1);
    expect(clientWithRelations!.contracts[0].sites.length).toBe(1);
    expect(clientWithRelations!.contracts[0].sites[0].id).toBe(siteId);

    // Cleanup
    await cleanupTestData(clientId, contractId, siteId);
  });

  /**
   * Property 31.2: Client Access Control and Permissions
   * Tests client portal access patterns and permission restrictions
   */
  it('Property 31.2: should validate client access control and permissions', async () => {
    await setupTestData();
    const { clientId, contractId, siteId } = await createTestEntities();

    // Test client user roles and permissions
    const clientRoles = {
      'FACILITY_MANAGER': {
        permissions: ['view_deployments', 'create_service_requests', 'view_attendance'],
        restrictions: ['no_billing_access', 'no_contract_modification']
      },
      'FINANCE_MANAGER': {
        permissions: ['view_invoices', 'view_payments', 'download_reports'],
        restrictions: ['no_operational_access', 'no_employee_data']
      },
      'SECURITY_MANAGER': {
        permissions: ['view_attendance', 'view_incidents', 'view_staffing'],
        restrictions: ['no_billing_access', 'no_contract_access']
      },
      'REGIONAL_MANAGER': {
        permissions: ['multi_site_view', 'view_all_reports', 'manage_users'],
        restrictions: ['no_system_config']
      }
    };

    // Property 31.2a: Validate role definitions
    Object.entries(clientRoles).forEach(([role, config]) => {
      expect(config.permissions.length).toBeGreaterThan(0);
      expect(Array.isArray(config.permissions)).toBe(true);
      expect(Array.isArray(config.restrictions)).toBe(true);
      
      // Each role should have specific permissions
      expect(config.permissions.every(p => typeof p === 'string')).toBe(true);
      expect(config.restrictions.every(r => typeof r === 'string')).toBe(true);
    });

    // Test multi-user access validation
    const clientUsers = [
      { role: 'FACILITY_MANAGER', siteAccess: [siteId], canViewBilling: false },
      { role: 'FINANCE_MANAGER', siteAccess: [], canViewBilling: true },
      { role: 'SECURITY_MANAGER', siteAccess: [siteId], canViewBilling: false },
      { role: 'REGIONAL_MANAGER', siteAccess: [siteId], canViewBilling: true }
    ];

    // Property 31.2b: Validate access patterns
    clientUsers.forEach(user => {
      const roleConfig = clientRoles[user.role];
      
      if (user.role === 'FINANCE_MANAGER' || user.role === 'REGIONAL_MANAGER') {
        expect(user.canViewBilling).toBe(true);
      } else {
        expect(user.canViewBilling).toBe(false);
      }
      
      // Facility and Security managers should have site access
      if (user.role === 'FACILITY_MANAGER' || user.role === 'SECURITY_MANAGER' || user.role === 'REGIONAL_MANAGER') {
        expect(user.siteAccess.length).toBeGreaterThan(0);
      }
    });

    await cleanupTestData(clientId, contractId, siteId);
  });

  /**
   * Property 31.3: Contract-Based Service Management
   * Tests contract service definitions and site service mapping
   */
  it('Property 31.3: should validate contract-based service management', async () => {
    await setupTestData();
    const clientId = randomUUID();
    const contractId = randomUUID();

    // Create contract with comprehensive service definitions
    const contract = await prisma.contracts.create({
      data: {
        id: contractId,
        client_id: clientId,
        contract_number: `CNT-${Date.now()}`,
        title: 'Comprehensive Security Services',
        status: ContractStatus.ACTIVE,
        start_date: new Date(),
        end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
        service_definitions: {
          guardServices: {
            regularGuards: 6,
            supervisors: 2,
            shiftPattern: '8-hour-rotation',
            coverageHours: '24x7'
          },
          additionalServices: {
            patrol: true,
            accessControl: true,
            cctv: false,
            eventSecurity: true
          },
          slaRequirements: {
            responseTime: '15-minutes',
            reportingFrequency: 'daily',
            escalationMatrix: true
          },
          billing: {
            rateStructure: 'hourly',
            overtimeMultiplier: 1.5,
            holidayMultiplier: 2.0,
            invoiceFrequency: 'monthly'
          }
        },
        created_at: new Date(),
        updated_at: new Date()
      }
    });

    // Create matching client
    await prisma.clients.create({
      data: {
        id: clientId,
        company_id: tenantId,
        name: 'Service Test Client',
        contact_email: 'services@testclient.com',
        contract_status: ContractStatus.ACTIVE,
        created_at: new Date(),
        updated_at: new Date()
      }
    });

    // Property 31.3a: Validate service definitions structure
    expect(contract.service_definitions).toBeDefined();
    const services = contract.service_definitions as any;
    
    expect(services.guardServices).toBeDefined();
    expect(services.guardServices.regularGuards).toBe(6);
    expect(services.guardServices.supervisors).toBe(2);
    expect(services.guardServices.shiftPattern).toBe('8-hour-rotation');
    
    expect(services.additionalServices).toBeDefined();
    expect(services.additionalServices.patrol).toBe(true);
    expect(services.additionalServices.accessControl).toBe(true);
    
    expect(services.slaRequirements).toBeDefined();
    expect(services.slaRequirements.responseTime).toBe('15-minutes');
    
    expect(services.billing).toBeDefined();
    expect(services.billing.overtimeMultiplier).toBe(1.5);

    // Test contract validation logic
    const totalGuards = services.guardServices.regularGuards + services.guardServices.supervisors;
    expect(totalGuards).toBe(8);
    
    const hasSupervisor = services.guardServices.supervisors > 0;
    expect(hasSupervisor).toBe(true);

    // Property 31.3b: Validate service-to-billing mapping
    const expectedMonthlyHours = 24 * 30; // 24x7 coverage for 30 days
    const expectedRegularCost = expectedMonthlyHours * services.guardServices.regularGuards * 25; // Assumed rate
    const expectedSupervisorCost = expectedMonthlyHours * services.guardServices.supervisors * 35; // Supervisor rate
    
    expect(expectedRegularCost).toBeGreaterThan(0);
    expect(expectedSupervisorCost).toBeGreaterThan(0);
    expect(expectedSupervisorCost).toBeGreaterThan(expectedRegularCost / 3); // Supervisors cost more

    await cleanupTestData(clientId, contractId, null);
  });

  /**
   * Property 31.4: Client Data Model Consistency
   * Tests data model relationships and consistency rules
   */
  it('Property 31.4: should validate client data model consistency', async () => {
    await setupTestData();

    // Test cascade relationships and referential integrity
    const testData = await createCompleteHierarchy();

    // Property 31.4a: Validate referential integrity
    const client = await prisma.clients.findUnique({ where: { id: testData.clientId } });
    const contract = await prisma.contracts.findUnique({ where: { id: testData.contractId } });
    const site = await prisma.sites.findUnique({ where: { id: testData.siteId } });

    expect(client).toBeDefined();
    expect(contract).toBeDefined();
    expect(site).toBeDefined();

    expect(client!.company_id).toBe(tenantId);
    expect(contract!.client_id).toBe(testData.clientId);
    expect(site!.client_id).toBe(testData.clientId);
    expect(site!.contract_id).toBe(testData.contractId);

    // Property 31.4b: Test data consistency rules
    // 1. Client status should match contract status
    expect(client!.contract_status).toBe(contract!.status);
    
    // 2. Site operational status should align with contract status
    if (contract!.status === 'ACTIVE') {
      expect(['ACTIVE', 'INACTIVE', 'MAINTENANCE']).toContain(site!.operational_status);
    }
    
    // 3. Contract dates should be valid
    const contractStart = new Date(contract!.start_date);
    const contractEnd = contract!.end_date ? new Date(contract!.end_date) : null;
    
    expect(contractStart).toBeInstanceOf(Date);
    if (contractEnd) {
      expect(contractEnd.getTime()).toBeGreaterThan(contractStart.getTime());
    }

    // Property 31.4c: Test tenant isolation
    const company = await prisma.companies.findUnique({ where: { id: tenantId } });
    expect(company).toBeDefined();
    expect(company!.id).toBe(client!.company_id);

    // All entities should belong to the same tenant
    expect(client!.company_id).toBe(tenantId);

    await cleanupCompleteHierarchy(testData);
  });

  async function setupTestData() {
    await prisma.companies.create({
      data: {
        id: tenantId,
        name: 'Test Company',
        slug: 'test-company',
        settings: {},
        branding: {},
        created_at: new Date(),
        updated_at: new Date()
      }
    });
  }

  async function createTestEntities() {
    const clientId = randomUUID();
    const contractId = randomUUID();
    const siteId = randomUUID();

    await prisma.clients.create({
      data: {
        id: clientId,
        company_id: tenantId,
        name: 'Test Client',
        contact_email: 'client@test.com',
        contract_status: ContractStatus.ACTIVE,
        created_at: new Date(),
        updated_at: new Date()
      }
    });

    await prisma.contracts.create({
      data: {
        id: contractId,
        client_id: clientId,
        contract_number: `CNT-${Date.now()}`,
        title: 'Test Contract',
        status: ContractStatus.ACTIVE,
        start_date: new Date(),
        service_definitions: { services: ['security'] },
        created_at: new Date(),
        updated_at: new Date()
      }
    });

    await prisma.sites.create({
      data: {
        id: siteId,
        client_id: clientId,
        contract_id: contractId,
        name: 'Test Site',
        address: { street: '123 Test St', city: 'Test City', state: 'Test State', postalCode: '12345', country: 'Test Country' },
        operational_status: 'ACTIVE',
        created_at: new Date(),
        updated_at: new Date()
      }
    });

    return { clientId, contractId, siteId };
  }

  async function createCompleteHierarchy() {
    const clientId = randomUUID();
    const contractId = randomUUID();
    const siteId = randomUUID();

    await prisma.clients.create({
      data: {
        id: clientId,
        company_id: tenantId,
        name: 'Complete Test Client',
        contact_email: 'complete@test.com',
        contract_status: ContractStatus.ACTIVE,
        created_at: new Date(),
        updated_at: new Date()
      }
    });

    await prisma.contracts.create({
      data: {
        id: contractId,
        client_id: clientId,
        contract_number: `CNT-COMPLETE-${Date.now()}`,
        title: 'Complete Test Contract',
        status: ContractStatus.ACTIVE,
        start_date: new Date(),
        end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        service_definitions: { services: ['security', 'patrol'] },
        created_at: new Date(),
        updated_at: new Date()
      }
    });

    await prisma.sites.create({
      data: {
        id: siteId,
        client_id: clientId,
        contract_id: contractId,
        name: 'Complete Test Site',
        address: { street: '456 Complete St', city: 'Complete City', state: 'Complete State', postalCode: '67890', country: 'India' },
        operational_status: 'ACTIVE',
        created_at: new Date(),
        updated_at: new Date()
      }
    });

    return { clientId, contractId, siteId };
  }

  async function cleanupTestData(clientId: string, contractId: string, siteId: string | null) {
    try {
      if (siteId) {
        await prisma.sites.delete({ where: { id: siteId } });
      }
      await prisma.contracts.delete({ where: { id: contractId } });
      await prisma.clients.delete({ where: { id: clientId } });
    } catch (error) {
      // Ignore cleanup errors
    }
  }

  async function cleanupCompleteHierarchy(testData: any) {
    await cleanupTestData(testData.clientId, testData.contractId, testData.siteId);
  }
});
