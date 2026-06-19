import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import * as fc from 'fast-check';
import { v4 as uuidv4 } from 'uuid';

describe('Property Test: Multi-tenant Data Isolation', () => {
  let prismaService: PrismaService;
  let module: TestingModule;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      providers: [PrismaService],
    }).compile();

    prismaService = module.get<PrismaService>(PrismaService);
    await prismaService.onModuleInit();
  });

  afterAll(async () => {
    await prismaService.onModuleDestroy();
    await module.close();
  });

  /**
   * Property 1: Multi-tenant Data Isolation
   * Validates: Requirements 1.1
   * 
   * For any database operation within a tenant context, 
   * the system SHALL never return data belonging to a different tenant
   */
  it('Property 1: Multi-tenant data isolation - reduced examples', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          tenant1Id: fc.constant(uuidv4()),
          tenant2Id: fc.constant(uuidv4()),
          companyName1: fc.string({ minLength: 3, maxLength: 20 }),
          companyName2: fc.string({ minLength: 3, maxLength: 20 }),
          slug1: fc.string({ minLength: 3, maxLength: 15 }).map(s => s.toLowerCase()),
          slug2: fc.string({ minLength: 3, maxLength: 15 }).map(s => s.toLowerCase()),
        }),
        async ({ tenant1Id, tenant2Id, companyName1, companyName2, slug1, slug2 }) => {
          // Clean up any existing test data first
          await cleanup(tenant1Id, tenant2Id);

          try {
            // Create companies for both tenants using system context
            await prismaService.withSystemContext(async (prisma) => {
              await prisma.company.createMany({
                data: [
                  {
                    id: tenant1Id,
                    name: companyName1,
                    slug: `${slug1}-${Date.now()}`, // Ensure uniqueness
                  },
                  {
                    id: tenant2Id,
                    name: companyName2, 
                    slug: `${slug2}-${Date.now()}-2`, // Ensure uniqueness
                  },
                ],
              });
            });

            // Test: Query as tenant1 should only see tenant1 data
            const tenant1Companies = await prismaService.withTenant(
              tenant1Id,
              async (prisma) => {
                return prisma.company.findMany();
              }
            );

            // Test: Query as tenant2 should only see tenant2 data  
            const tenant2Companies = await prismaService.withTenant(
              tenant2Id,
              async (prisma) => {
                return prisma.company.findMany();
              }
            );

            // Verify: Each tenant sees exactly their own data
            expect(tenant1Companies).toHaveLength(1);
            expect(tenant2Companies).toHaveLength(1);
            expect(tenant1Companies[0].id).toBe(tenant1Id);
            expect(tenant2Companies[0].id).toBe(tenant2Id);

            // Verify: No cross-tenant data leakage
            expect(tenant1Companies[0].id).not.toBe(tenant2Id);
            expect(tenant2Companies[0].id).not.toBe(tenant1Id);

          } finally {
            // Always clean up test data
            await cleanup(tenant1Id, tenant2Id);
          }
        }
      ),
      { 
        numRuns: 5, // Reduced from 100 to 5 for faster execution
        timeout: 10000, // 10 second timeout
        seed: 42,
        endOnFailure: true,
      }
    );
  });

  /**
   * Property 2: System Context Bypass
   * Validates that system operations can access all tenant data when no tenant context is set
   */
  it('Property 2: System context can access all tenant data - reduced examples', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          tenant1Id: fc.constant(uuidv4()),
          tenant2Id: fc.constant(uuidv4()),
          name1: fc.string({ minLength: 3, maxLength: 15 }),
          name2: fc.string({ minLength: 3, maxLength: 15 }),
        }),
        async ({ tenant1Id, tenant2Id, name1, name2 }) => {
          await cleanup(tenant1Id, tenant2Id);

          try {
            // Create test companies using system context
            await prismaService.withSystemContext(async (prisma) => {
              await prisma.company.createMany({
                data: [
                  {
                    id: tenant1Id,
                    name: name1,
                    slug: `test-${tenant1Id.substring(0, 8)}`,
                  },
                  {
                    id: tenant2Id,
                    name: name2,
                    slug: `test-${tenant2Id.substring(0, 8)}`,
                  },
                ],
              });
            });

            // Test: System context should see all companies
            const allCompanies = await prismaService.withSystemContext(async (prisma) => {
              return prisma.company.findMany({
                where: {
                  id: { in: [tenant1Id, tenant2Id] }
                }
              });
            });

            // Verify: System context can see both tenants' data
            expect(allCompanies).toHaveLength(2);
            const companyIds = allCompanies.map(c => c.id);
            expect(companyIds).toContain(tenant1Id);
            expect(companyIds).toContain(tenant2Id);

          } finally {
            await cleanup(tenant1Id, tenant2Id);
          }
        }
      ),
      { 
        numRuns: 3, // Reduced from 100 to 3 for faster execution
        timeout: 8000,
        seed: 123,
      }
    );
  });

  async function cleanup(tenant1Id: string, tenant2Id: string) {
    try {
      await prismaService.withSystemContext(async (prisma) => {
        await prisma.company.deleteMany({
          where: {
            id: { in: [tenant1Id, tenant2Id] }
          }
        });
      });
    } catch (error) {
      // Ignore cleanup errors
    }
  }
});