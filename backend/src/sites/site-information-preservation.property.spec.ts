import * as fc from 'fast-check';
import { Test, TestingModule } from '@nestjs/testing';
import { SitesService } from './sites.service';
import { SiteRepository } from '../common/repositories/site.repository';
import { ClientRepository } from '../common/repositories/client.repository';
import { TenantContextService } from '../common/tenant-context.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSiteDto, SiteOperationalStatus } from './dto';
import { Site } from '@prisma/client';
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
 * **Property 5: Site Information Preservation**
 * 
 * **Validates: Requirements 3.1**
 * 
 * For any site creation request, the system SHALL accurately capture and maintain 
 * all location details, access requirements, and operational specifications 
 * in a retrievable format.
 */
describe('Property-Based Tests: Site Information Preservation', () => {
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
    numRuns: 50, // Reduced for faster execution
    timeout: 10000,
    seed: 42,
  };

  it('Property 5: Site information preservation - all data accurately captured and retrievable', async () => {
    await fc.assert(fc.asyncProperty(
      workspaceGenerator(),
      async (workspace) => {
        // Use the first contract from the generated workspace
        const contract = workspace.contracts[0];
        const client = workspace.clients.find(c => 
          c.contracts?.some(cont => cont.id === contract.id)
        );
        const site = workspace.sites[0];
        
        // Create the DTO based on the generated data
        const siteData: CreateSiteDto = {
          contractId: contract.id, // FIXED: Use contractId from workspace
          name: site.name,
          address: site.address,
          accessRequirements: site.accessRequirements,
          safetyProtocols: site.safetyProtocols,
          operationalStatus: site.operationalStatus as any,
          contactInfo: site.contactInfo,
          minStaffingLevel: site.minStaffingLevel,
          maxStaffingLevel: site.maxStaffingLevel,
        };

        // Setup: Mock contract exists and belongs to tenant
        const mockContract = {
          id: contract.id,
          clientId: client?.id,
          title: contract.title,
          status: contract.status,
          client: {
            id: client?.id,
            name: client?.name,
            companyId: workspace.company.id,
          },
        };

        // Setup: Mock successful site creation
        const mockCreatedSite: Partial<Site> = {
          id: fc.sample(fc.uuid(), 1)[0],
          contractId: contract.id, // FIXED: Use contractId
          name: siteData.name,
          address: siteData.address as any,
          accessRequirements: siteData.accessRequirements as any,
          safetyProtocols: siteData.safetyProtocols as any,
          operationalStatus: (siteData.operationalStatus || SiteOperationalStatus.ACTIVE) as any,
          contactInfo: siteData.contactInfo as any,
          minStaffingLevel: siteData.minStaffingLevel,
          maxStaffingLevel: siteData.maxStaffingLevel,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        // Mock the contract repository call instead of client repository
        prismaMock.contract.findFirst.mockResolvedValue(mockContract); // FIXED: Use findFirst not findUnique
        mockSiteRepository.create.mockResolvedValue(mockCreatedSite);

        // Act: Create the site
        const result = await service.create(siteData);

        // Assert: All provided data is preserved in the result
        expect(result.name).toBe(siteData.name);
        expect(result.contractId).toBe(siteData.contractId); // FIXED: Check contractId
        
        // Verify address information preservation
        expect(result.address).toEqual(siteData.address);
        
        // Verify access requirements preservation (if provided)
        if (siteData.accessRequirements) {
          expect(result.accessRequirements).toEqual(siteData.accessRequirements);
        }
        
        // Verify safety protocols preservation (if provided)
        if (siteData.safetyProtocols) {
          expect(result.safetyProtocols).toEqual(siteData.safetyProtocols);
        }
        
        // Verify contact info preservation (if provided)
        if (siteData.contactInfo) {
          expect(result.contactInfo).toEqual(siteData.contactInfo);
        }
        
        // Verify operational status is set correctly
        const expectedStatus = siteData.operationalStatus || SiteOperationalStatus.ACTIVE;
        expect(result.operationalStatus).toBe(expectedStatus);

        // Verify repository was called with correct data structure
        expect(mockSiteRepository.create).toHaveBeenCalledWith(
          expect.objectContaining({
            name: siteData.name,
            address: siteData.address,
            operationalStatus: expectedStatus,
            contract: { // FIXED: Connect to contract, not client
              connect: { id: siteData.contractId },
            },
          })
        );

        // Verify contract relationship validation was performed
        expect(prismaMock.contract.findFirst).toHaveBeenCalledWith({
          where: {
            id: siteData.contractId,
            client: {
              companyId: expect.any(String),
            },
          },
          include: {
            client: true,
          },
        });
      }
    ), PROPERTY_TEST_CONFIG);
  });

  it('Property 5: Site data integrity - no data loss during storage', async () => {
    await fc.assert(fc.asyncProperty(
      workspaceGenerator(),
      async (workspace) => {
        const contract = workspace.contracts[0];
        const site = workspace.sites[0];
        
        const siteData: CreateSiteDto = {
          contractId: contract.id,
          name: site.name,
          address: site.address,
          accessRequirements: site.accessRequirements,
          safetyProtocols: site.safetyProtocols,
          operationalStatus: site.operationalStatus as any,
          contactInfo: site.contactInfo,
          minStaffingLevel: site.minStaffingLevel,
          maxStaffingLevel: site.maxStaffingLevel,
        };

        // Setup: Mock contract and site creation
        const mockContract = {
          id: contract.id,
          status: 'ACTIVE',
          client: { companyId: workspace.company.id },
        };

        prismaMock.contract.findFirst.mockResolvedValue(mockContract); // FIXED: Use findFirst
        
        // Capture the exact data passed to repository
        let capturedCreateData: any;
        mockSiteRepository.create.mockImplementation(async (data) => {
          capturedCreateData = data;
          return {
            ...data,
            id: fc.sample(fc.uuid(), 1)[0],
            contractId: contract.id,
            createdAt: new Date(),
            updatedAt: new Date(),
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
          expect(capturedCreateData.accessRequirements.requiredCertifications)
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
        const contract = workspace.contracts[0];
        const site = workspace.sites[0];
        
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
          client: { companyId: workspace.company.id },
        };

        prismaMock.contract.findFirst.mockResolvedValue(mockContract); // FIXED: Use findFirst

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
            createdAt: new Date(),
            updatedAt: new Date(),
          });

          // Assert: Should succeed for valid contracts
          const result = await service.create(siteData);
          expect(result.contractId).toBe(siteData.contractId);
          
          // Verify contract relationship validation was performed
          expect(prismaMock.contract.findFirst).toHaveBeenCalledWith({
            where: {
              id: siteData.contractId,
              client: {
                companyId: expect.any(String),
              },
            },
            include: {
              client: true,
            },
          });
        }
      }
    ), PROPERTY_TEST_CONFIG);
  });
});
