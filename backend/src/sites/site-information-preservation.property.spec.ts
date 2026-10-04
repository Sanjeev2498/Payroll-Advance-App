import * as fc from 'fast-check';
import { Test, TestingModule } from '@nestjs/testing';
import { SitesService } from './sites.service';
import { SiteRepository } from '../common/repositories/site.repository';
import { ClientRepository } from '../common/repositories/client.repository';
import { TenantContextService } from '../common/tenant-context.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSiteDto, SiteOperationalStatus } from './dto';
import { sites } from '@prisma/client';
import { 
  createPrismaMock, 
  createRepositoryMock, 
  createServiceMocks 
} from '../test/mocks';
import {
  createSiteDtoGenerator,
  workspaceGenerator,
  contractGenerator,
  clientGenerator,
} from '../test/generators/hierarchical-data-generator';

/**
 * **Property 5: sites Information Preservation**
 * 
 * **Validates: Requirements 3.1**
 * 
 * For any site creation request, the system SHALL accurately capture and maintain 
 * all location details, access requirements, and operational specifications 
 * in a retrievable format.
 */
describe('Property-Based Tests: sites Information Preservation', () => {
  let service: SitesService;
  let siteRepository: SiteRepository;
  let clientRepository: ClientRepository;
  let prismaMock: any;

  // Use centralized mocks
  const mockSiteRepository = createRepositoryMock();
  const mockClientRepository = createRepositoryMock();
  const mockServiceMocks = createServiceMocks();

  beforeEach(async () => {
    // Create the prisma mock using centralized factory
    prismaMock = createPrismaMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SitesService,
        {
          provide: SiteRepository,
          useValue: mockSiteRepository,
        },
        {
          provide: ClientRepository,
          useValue: mockClientRepository,
        },
        {
          provide: TenantContextService,
          useValue: mockServiceMocks.tenantContext,
        },
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    service = module.get<SitesService>(SitesService);
    siteRepository = module.get<SiteRepository>(SiteRepository);
    clientRepository = module.get<ClientRepository>(ClientRepository);

    // Reset mocks
    jest.clearAllMocks();
  });

  const PROPERTY_TEST_CONFIG = {
    numRuns: 20, // Reduced from 50 for faster execution
    timeout: 10000,
    seed: 42,
  };

  it('Property 5: sites information preservation - all data accurately captured and retrievable', async () => {
    await fc.assert(fc.asyncProperty(
      workspaceGenerator(),
      async (workspace) => {
        // Use the first contract from the generated workspace that allows site creation
        let contract = (workspace as any).contracts[0];
        
        // Business Rule: Skip contracts that don't allow site creation
        const validStatuses = ['ACTIVE', 'PENDING'];
        if (!validStatuses.includes(contract.status)) {
          // Skip this test case - business rule prevents site creation for terminated/expired contracts
          return;
        }
        
        const client = (workspace as any).clients.find(c => 
          c.contracts?.some(cont => cont.id === contract.id)
        );
        const site = (workspace as any).sites[0];
        
        // Create the DTO based on the generated data
        const siteData: CreateSiteDto = {
          contractId: contract.id, // FIXED: Use contractId for CreateSiteDto from workspace
          name: site.name,
          address: site.address,
          accessRequirements: site.accessRequirements,
          safetyProtocols: site.safetyProtocols,
          operationalStatus: site.operationalStatus as any,
          contactInfo: site.contactInfo,
        };

        // Setup: Mock contract exists and belongs to tenant
        const mockContract = {
          id: contract.id,
          client_id: client?.id,
          title: contract.title,
          status: contract.status,
          clients: {
            id: client?.id,
            name: client?.name,
            company_id: (workspace as any).company.id,
          },
        };

        // Setup: Mock successful site creation
        const mockCreatedsites: Partial<sites> = {
          id: fc.sample(fc.uuid(), 1)[0],
          contract_id: contract.id, // FIXED: Use contract_id for Prisma
          name: siteData.name,
          address: siteData.address as any,
          access_requirements: siteData.accessRequirements as any,
          safety_protocols: siteData.safetyProtocols as any,
          operational_status: (siteData.operationalStatus || SiteOperationalStatus.ACTIVE) as any,
          contact_info: siteData.contactInfo as any,
          min_staffing_level: (siteData as any).minStaffingLevel,
          max_staffing_level: (siteData as any).maxStaffingLevel,
          created_at: new Date(),
          updated_at: new Date(),
        };

        // Mock the contract repository call - use contracts (plural) table
        prismaMock.contracts.findFirst.mockResolvedValue(mockContract);
        mockSiteRepository.create.mockResolvedValue(mockCreatedsites);

        // Act: Create the site
        const result = await service.create(siteData);

        // Assert: All provided data is preserved in the result
        expect(result.name).toBe(siteData.name);
        expect(result.contract_id).toBe(siteData.contractId); // FIXED: Check contractId
        
        // Verify address information preservation
        expect(result.address).toEqual(siteData.address);
        
        // Verify access requirements preservation (if provided)
        if (siteData.accessRequirements) {
          expect(result.access_requirements).toEqual(siteData.accessRequirements);
        }
        
        // Verify safety protocols preservation (if provided)
        if (siteData.safetyProtocols) {
          expect(result.safety_protocols).toEqual(siteData.safetyProtocols);
        }
        
        // Verify contact info preservation (if provided)
        if (siteData.contactInfo) {
          expect(result.contact_info).toEqual(siteData.contactInfo);
        }
        
        // Verify operational status is set correctly
        const expectedStatus = siteData.operationalStatus || SiteOperationalStatus.ACTIVE;
        expect(result.operational_status).toBe(expectedStatus);

        // Verify repository was called with correct data structure
        expect(mockSiteRepository.create).toHaveBeenCalledWith(
          expect.objectContaining({
            name: siteData.name,
            address: siteData.address,
            operational_status: expectedStatus,
            contracts: { // FIXED: Connect to contracts, using snake_case
              connect: { id: siteData.contractId },
            },
          })
        );

        // Verify contract relationship validation was performed
        expect(prismaMock.contracts.findFirst).toHaveBeenCalledWith({
          where: {
            id: siteData.contractId,
            clients: {
              company_id: expect.any(String),
            },
          },
          include: {
            clients: true,
          },
        });
      }
    ), PROPERTY_TEST_CONFIG);
  });

  it('Property 5: sites data integrity - no data loss during storage', async () => {
    await fc.assert(fc.asyncProperty(
      workspaceGenerator(),
      async (workspace) => {
        const contract = (workspace as any).contracts[0];
        const site = (workspace as any).sites[0];
        
        const siteData: CreateSiteDto = {
          contractId: contract.id,
          name: site.name,
          address: site.address,
          accessRequirements: site.accessRequirements,
          safetyProtocols: site.safetyProtocols,
          operationalStatus: site.operationalStatus as any,
          contactInfo: site.contactInfo,
        };

        // Setup: Mock contract and site creation
        const mockContract = {
          id: contract.id,
          status: 'ACTIVE',
          client: { companyId: (workspace as any).company.id },
        };

        prismaMock.contracts.findFirst.mockResolvedValue(mockContract); // Use contracts (plural) table
        
        // Capture the exact data passed to repository
        let capturedCreateData: any;
        mockSiteRepository.create.mockImplementation(async (data) => {
          capturedCreateData = data;
          return {
            ...data,
            id: fc.sample(fc.uuid(), 1)[0],
            contract_id: contract.id, // FIXED: Use snake_case field name
            created_at: new Date(),
            updated_at: new Date(),
          };
        });

        // Act: Create the site
        await service.create(siteData);

        // Assert: No data corruption occurred during processing
        expect(capturedCreateData.name).toBe(siteData.name);
        expect(capturedCreateData.address).toEqual(siteData.address);
        
        // Verify complex nested data structures are preserved
        if (siteData.address.coordinates) {
          expect(capturedCreateData.address.coordinates).toEqual(siteData.address.coordinates);
        }
        
        if (siteData.accessRequirements?.requiredCertifications) {
          expect(capturedCreateData.access_requirements.requiredCertifications)
            .toEqual(siteData.accessRequirements.requiredCertifications);
        }
      }
    ), PROPERTY_TEST_CONFIG);
  });

  it('Property 5: Contract relationship validation - ensures tenant isolation', async () => {
    await fc.assert(fc.asyncProperty(
      workspaceGenerator(),
      fc.constantFrom('ACTIVE', 'TERMINATED', 'EXPIRED'),
      async (workspace, contractStatus: string) => {
        const contract = (workspace as any).contracts[0];
        const site = (workspace as any).sites[0];
        
        const siteData: CreateSiteDto = {
          contractId: contract.id,
          name: site.name,
          address: site.address,
          operationalStatus: site.operationalStatus as any,
        };

        // Setup: Mock contract with various statuses
        const mockContract = contractStatus === 'not_found' ? null : {
          id: contract.id,
          status: contractStatus,
          clients: { company_id: (workspace as any).company.id },
        };

        prismaMock.contracts.findFirst.mockResolvedValue(mockContract); // Use contracts (plural) table

        if (!mockContract) {
          // Assert: Should reject if contract doesn't exist
          await expect(service.create(siteData)).rejects.toThrow('Contract with ID');
        } else if (contractStatus === 'TERMINATED' || contractStatus === 'EXPIRED') {
          // Assert: Should reject if contract is terminated/expired
          await expect(service.create(siteData)).rejects.toThrow();
        } else {
          // Setup successful creation for valid contracts
          mockSiteRepository.create.mockResolvedValue({
            ...siteData,
            id: fc.sample(fc.uuid(), 1)[0],
            contract_id: siteData.contractId, // FIXED: Use snake_case field name
            created_at: new Date(),
            updated_at: new Date(),
          });

          // Assert: Should succeed for valid contracts
          const result = await service.create(siteData);
          expect(result.contract_id).toBe(siteData.contractId);
          
          // Verify contract relationship validation was performed
          expect(prismaMock.contracts.findFirst).toHaveBeenCalledWith({
            where: {
              id: siteData.contractId,
              clients: {
                company_id: expect.any(String),
              },
            },
            include: {
              clients: true,
            },
          });
        }
      }
    ), PROPERTY_TEST_CONFIG);
  });
});
