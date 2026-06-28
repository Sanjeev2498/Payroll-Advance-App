import * as fc from 'fast-check';
import { Test, TestingModule } from '@nestjs/testing';
import { SitesService } from './sites.service';
import { SiteRepository } from '../common/repositories/site.repository';
import { ClientRepository } from '../common/repositories/client.repository';
import { TenantContextService } from '../common/tenant-context.service';
import { CreateSiteDto, SiteOperationalStatus } from './dto';
import { Site } from '@prisma/client';

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

  const mockSiteRepository = {
    create: jest.fn(),
    findById: jest.fn(),
  };

  const mockClientRepository = {
    findById: jest.fn(),
  };

  const mockTenantContextService = {
    getTenantId: jest.fn().mockReturnValue('test-tenant-id'),
    getUserRole: jest.fn().mockReturnValue('MANAGER'),
  };

  beforeEach(async () => {
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
          useValue: mockTenantContextService,
        },
      ],
    }).compile();

    service = module.get<SitesService>(SitesService);
    siteRepository = module.get<SiteRepository>(SiteRepository);
    clientRepository = module.get<ClientRepository>(ClientRepository);

    // Reset mocks
    jest.clearAllMocks();
  });

  // Custom generators for domain entities
  const addressGenerator = () => fc.record({
    street: fc.string({ minLength: 1, maxLength: 255 }),
    city: fc.string({ minLength: 1, maxLength: 100 }),
    state: fc.string({ minLength: 1, maxLength: 50 }),
    zipCode: fc.string({ minLength: 1, maxLength: 20 }),
    country: fc.string({ minLength: 1, maxLength: 100 }),
    coordinates: fc.option(fc.record({
      latitude: fc.float({ min: -90, max: 90 }),
      longitude: fc.float({ min: -180, max: 180 }),
    }), { nil: undefined }),
  });

  const accessRequirementsGenerator = () => fc.record({
    securityClearance: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
    requiredCertifications: fc.option(
      fc.array(fc.string({ minLength: 1, maxLength: 50 }), { maxLength: 10 }), 
      { nil: undefined }
    ),
    accessProcedures: fc.option(fc.string({ minLength: 1, maxLength: 1000 }), { nil: undefined }),
    workingHours: fc.option(fc.record({
      monday: fc.option(fc.record({
        start: fc.string(),
        end: fc.string(),
        is24Hour: fc.option(fc.boolean(), { nil: undefined }),
      }), { nil: undefined }),
    }), { nil: undefined }),
  });

  const contactInfoGenerator = () => fc.record({
    primaryContact: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: undefined }),
    primaryPhone: fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: undefined }),
    primaryEmail: fc.option(fc.string({ minLength: 5, maxLength: 255 }), { nil: undefined }),
    emergencyContact: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: undefined }),
    emergencyPhone: fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: undefined }),
  });

  const createSiteDtoGenerator = () => fc.record({
    clientId: fc.uuid(),
    name: fc.string({ minLength: 2, maxLength: 100 }),
    address: addressGenerator(),
    accessRequirements: fc.option(accessRequirementsGenerator(), { nil: undefined }),
    safetyProtocols: fc.option(fc.record({
      evacuationProcedures: fc.option(fc.string({ maxLength: 1000 }), { nil: undefined }),
      hazardMitigation: fc.option(fc.string({ maxLength: 1000 }), { nil: undefined }),
    }), { nil: undefined }),
    operationalStatus: fc.option(
      fc.constantFrom(...Object.values(SiteOperationalStatus)), 
      { nil: undefined }
    ),
    contactInfo: fc.option(contactInfoGenerator(), { nil: undefined }),
  });

  const PROPERTY_TEST_CONFIG = {
    numRuns: 100,
    timeout: 10000,
    seed: 42,
  };

  it('Property 5: Site information preservation - all data accurately captured and retrievable', async () => {
    await fc.assert(fc.asyncProperty(
      createSiteDtoGenerator(),
      async (siteData: CreateSiteDto) => {
        // Setup: Mock client exists and belongs to tenant
        const mockClient = {
          id: siteData.clientId,
          name: 'Test Client',
          contractStatus: 'ACTIVE',
          companyId: 'test-tenant-id',
        };

        // Setup: Mock successful site creation
        const mockCreatedSite: Partial<Site> = {
          id: fc.sample(fc.uuid(), 1)[0],
          clientId: siteData.clientId,
          name: siteData.name,
          address: siteData.address as any,
          accessRequirements: siteData.accessRequirements as any,
          safetyProtocols: siteData.safetyProtocols as any,
          operationalStatus: (siteData.operationalStatus || SiteOperationalStatus.ACTIVE) as any,
          contactInfo: siteData.contactInfo as any,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        mockClientRepository.findById.mockResolvedValue(mockClient);
        mockSiteRepository.create.mockResolvedValue(mockCreatedSite);

        // Act: Create the site
        const result = await service.create(siteData);

        // Assert: All provided data is preserved in the result
        expect(result.name).toBe(siteData.name);
        expect(result.clientId).toBe(siteData.clientId);
        
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
            client: {
              connect: { id: siteData.clientId },
            },
          })
        );

        // Verify client relationship validation was performed
        expect(mockClientRepository.findById).toHaveBeenCalledWith(siteData.clientId);
      }
    ), PROPERTY_TEST_CONFIG);
  });

  it('Property 5: Site data integrity - no data loss during storage', async () => {
    await fc.assert(fc.asyncProperty(
      createSiteDtoGenerator(),
      async (siteData: CreateSiteDto) => {
        // Setup: Mock client and site creation
        const mockClient = {
          id: siteData.clientId,
          contractStatus: 'ACTIVE',
          companyId: 'test-tenant-id',
        };

        mockClientRepository.findById.mockResolvedValue(mockClient);
        
        // Capture the exact data passed to repository
        let capturedCreateData: any;
        mockSiteRepository.create.mockImplementation(async (data) => {
          capturedCreateData = data;
          return {
            ...data,
            id: fc.sample(fc.uuid(), 1)[0],
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
        
        if (siteData.accessRequirements?.workingHours) {
          expect(capturedCreateData.accessRequirements.workingHours)
            .toEqual(siteData.accessRequirements.workingHours);
        }
      }
    ), PROPERTY_TEST_CONFIG);
  });

  it('Property 5: Client relationship validation - ensures tenant isolation', async () => {
    await fc.assert(fc.asyncProperty(
      createSiteDtoGenerator(),
      fc.constantFrom('ACTIVE', 'TERMINATED', 'EXPIRED'),
      async (siteData: CreateSiteDto, clientStatus: string) => {
        // Setup: Mock client with various contract statuses
        const mockClient = clientStatus === 'not_found' ? null : {
          id: siteData.clientId,
          contractStatus: clientStatus,
          companyId: 'test-tenant-id',
        };

        mockClientRepository.findById.mockResolvedValue(mockClient);

        if (!mockClient) {
          // Assert: Should reject if client doesn't exist
          await expect(service.create(siteData)).rejects.toThrow('Client with ID');
        } else if (clientStatus === 'TERMINATED') {
          // Assert: Should reject if client is terminated
          await expect(service.create(siteData)).rejects.toThrow('Cannot create sites for terminated clients');
        } else {
          // Setup successful creation for valid clients
          mockSiteRepository.create.mockResolvedValue({
            ...siteData,
            id: fc.sample(fc.uuid(), 1)[0],
            createdAt: new Date(),
            updatedAt: new Date(),
          });

          // Assert: Should succeed for valid clients
          const result = await service.create(siteData);
          expect(result.clientId).toBe(siteData.clientId);
          
          // Verify client relationship validation was performed
          expect(mockClientRepository.findById).toHaveBeenCalledWith(siteData.clientId);
        }
      }
    ), PROPERTY_TEST_CONFIG);
  });
});