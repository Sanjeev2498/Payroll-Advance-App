import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';

describe('Tenant Proxy Verification', () => {
  let prismaService: PrismaService;
  let moduleRef: TestingModule;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      providers: [PrismaService],
    }).compile();

    prismaService = moduleRef.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    await moduleRef.close();
  });

  it('should apply tenant filtering to clients.findMany', async () => {
    const tenantId = uuidv4();
    const otherTenantId = uuidv4();
    const clientId1 = uuidv4();
    const clientId2 = uuidv4();

    // Create test data
    await prismaService.withSystemContext(async (prisma) => {
      // Clean up any existing test data
      await prisma.clients.deleteMany({
        where: { name: { startsWith: 'test-client-' } }
      });
      await prisma.companies.deleteMany({
        where: { name: { startsWith: 'test-company-' } }
      });

      // Create two companies
      await prisma.companies.create({
        data: {
          id: tenantId,
          name: 'test-company-1',
          slug: 'test-company-1',
          settings: {},
          branding: {},
          updated_at: new Date(),
        }
      });

      await prisma.companies.create({
        data: {
          id: otherTenantId,
          name: 'test-company-2',
          slug: 'test-company-2',
          settings: {},
          branding: {},
          updated_at: new Date(),
        }
      });

      // Create clients for each company
      await prisma.clients.create({
        data: {
          id: clientId1,
          company_id: tenantId,
          name: 'test-client-1',
          contact_email: 'test1@example.com',
          contact_info: {},
          updated_at: new Date(),
        }
      });

      await prisma.clients.create({
        data: {
          id: clientId2,
          company_id: otherTenantId,
          name: 'test-client-2',
          contact_email: 'test2@example.com',
          contact_info: {},
          updated_at: new Date(),
        }
      });
    });

    // Test tenant isolation
    const clientsForTenant = await prismaService.withTenant(tenantId, async (prisma) => {
      console.log('🔍 About to call prisma.clients.findMany()');
      return prisma.clients.findMany();
    });

    console.log('🎯 Clients found for tenant:', clientsForTenant.length);
    console.log('🎯 Client company_ids:', clientsForTenant.map(c => c.company_id));

    // Verify filtering works
    expect(clientsForTenant).toHaveLength(1);
    expect(clientsForTenant[0].company_id).toBe(tenantId);
    expect(clientsForTenant[0].name).toBe('test-client-1');

    // Clean up
    await prismaService.withSystemContext(async (prisma) => {
      await prisma.clients.deleteMany({
        where: { name: { startsWith: 'test-client-' } }
      });
      await prisma.companies.deleteMany({
        where: { name: { startsWith: 'test-company-' } }
      });
    });
  });
});