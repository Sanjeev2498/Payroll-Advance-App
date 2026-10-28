import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { SitesService } from './sites.service';
import { SiteRepository } from '../common/repositories/site.repository';
import { ClientRepository } from '../common/repositories/client.repository';
import { TenantContextService } from '../common/tenant-context.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSiteDto, SiteOperationalStatus } from './dto';
import { 
  createPrismaMock, 
  createRepositoryMock, 
  createServiceMocks 
} from '../test/mocks';

// Use centralized mocks
const mockSiteRepository = createRepositoryMock();
const mockClientRepository = createRepositoryMock();
const mockServiceMocks = createServiceMocks();

// Add repository-specific methods to mocks
mockSiteRepository.getSitesStats = jest.fn();
mockSiteRepository.findByClientId = jest.fn();
mockSiteRepository.findByOperationalStatus = jest.fn();
mockSiteRepository.getSitesStats = jest.fn(); // Add missing getSitesStats mock
mockSiteRepository.findMany = jest.fn(); // Add missing findMany mock
mockSiteRepository.delete = jest.fn(); // Add missing delete mock

const mockSite = {
  // Snake case fields for Phase 2 field mapping compatibility
  client_id: "test-client-id",
  contact_info: { phone: "123-456-7890", email: "test@example.com" },
  operational_status: "ACTIVE",
  created_at: new Date(),
  updated_at: new Date(),
  id: 'test-site-id',
  contractId: 'test-contract-id',
  name: 'Test Site',
  address: {
    street: '123 Test St',
    city: 'Test City',
    state: 'TS',
    zipCode: '12345',
    country: 'Test Country',
  },
  operationalStatus: SiteOperationalStatus.ACTIVE,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockClient = {
  id: 'test-client-id',
  name: 'Test Client',
  contract_status: 'ACTIVE',
  companyId: 'test-tenant-id',
};

describe('SitesService', () => {
  let service: SitesService;
  let siteRepository: SiteRepository;
  let clientRepository: ClientRepository;
  let prismaMock: any;

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
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new site successfully', async () => {
      const createSiteDto: CreateSiteDto = {
        contractId: 'test-contract-id',
        name: 'Test Site',
        address: {
          street: '123 Test St',
          city: 'Test City',
          state: 'TS',
          zipCode: '12345',
          country: 'Test Country',
        },
      };

      const mockContract = {
        id: 'test-contract-id',
        status: 'ACTIVE',
        client_id: mockClient.id,
        clients: mockClient,
      };

      mockClientRepository.findById.mockResolvedValue(mockClient);
      prismaMock.contracts.findFirst.mockResolvedValue(mockContract); // Updated to match plural schema
      mockSiteRepository.create.mockResolvedValue(mockSite);

      const result = await service.create(createSiteDto);

      expect(prismaMock.contracts.findFirst).toHaveBeenCalledWith({
        where: {
          id: createSiteDto.contractId,
          clients: {
            company_id: expect.any(String),
          },
        },
        include: {
          clients: true,
        },
      });
      expect(siteRepository.create).toHaveBeenCalled();
      expect(result).toBe(mockSite);
    });

    it('should throw BadRequestException if client not found', async () => {
      const createSiteDto: CreateSiteDto = {
        contractId: 'test-contract-id',
        name: 'Test Site',
        address: {
          street: '123 Test St',
          city: 'Test City',
          state: 'TS',
          zipCode: '12345',
          country: 'Test Country',
        },
      };

      prismaMock.contracts.findFirst.mockResolvedValue(null); // No contract found

      await expect(service.create(createSiteDto)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if client is terminated', async () => {
      const createSiteDto: CreateSiteDto = {
        contractId: 'test-contract-id',
        name: 'Test Site',
        address: {
          street: '123 Test St',
          city: 'Test City',
          state: 'TS',
          zipCode: '12345',
          country: 'Test Country',
        },
      };

      const terminatedContract = {
        id: 'test-contract-id',
        status: 'TERMINATED',
        client_id: mockClient.id,
        clients: mockClient,
      };

      prismaMock.contracts.findFirst.mockResolvedValue(terminatedContract);

      await expect(service.create(createSiteDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAll', () => {
    it('should return paginated sites', async () => {
      const queryDto = { page: 1, limit: 20, sortBy: 'name', sortOrder: 'asc' as const };
      const mockResult = {
        sites: [mockSite],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      };

      mockSiteRepository.findMany.mockResolvedValue([mockSite]); // Return array, not wrapped object

      const result = await service.findAll(queryDto);

      expect(siteRepository.findMany).toHaveBeenCalledWith(
        expect.any(Object),
        queryDto.page,
        queryDto.limit,
        queryDto.sortBy,
        queryDto.sortOrder,
      );
      // Flexible assertions that test actual functionality
      expect(result.sites).toHaveLength(1);
      expect(result.sites[0].id).toBe('test-site-id');
      expect(result.sites[0].name).toBe('Test Site');
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
    });
  });

  describe('findOne', () => {
    it('should return a site by ID', async () => {
      const siteId = 'test-site-id';
      mockSiteRepository.findById.mockResolvedValue(mockSite);

      const result = await service.findOne(siteId);

      expect(siteRepository.findById).toHaveBeenCalledWith(siteId);
      expect(result).toBe(mockSite);
    });

    it('should throw NotFoundException if site not found', async () => {
      const siteId = 'non-existent-site-id';
      mockSiteRepository.findById.mockResolvedValue(null);

      await expect(service.findOne(siteId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update a site successfully', async () => {
      const siteId = 'test-site-id';
      const updateSiteDto = { name: 'Updated Site Name' };
      const updatedSite = { ...mockSite, ...updateSiteDto };

      mockSiteRepository.findById.mockResolvedValue(mockSite);
      mockSiteRepository.update.mockResolvedValue(updatedSite);

      // Mock the validateStatusTransition method by making it not throw
      jest.spyOn(service as any, 'validateStatusTransition').mockResolvedValue(undefined);

      const result = await service.update(siteId, updateSiteDto);

      expect(siteRepository.update).toHaveBeenCalledWith(siteId, expect.any(Object));
      expect(result).toBe(updatedSite);
    });
  });

  describe('remove', () => {
    it('should soft delete a site', async () => {
      const siteId = 'test-site-id';
      const deletedSite = { ...mockSite, operationalStatus: SiteOperationalStatus.INACTIVE };

      mockSiteRepository.delete.mockResolvedValue(deletedSite);

      const result = await service.remove(siteId);

      expect(siteRepository.delete).toHaveBeenCalledWith(siteId);
      expect(result).toBe(deletedSite);
    });
  });

  describe('getStats', () => {
    it('should return site statistics', async () => {
      const mockStats = {
        totalSites: 10, // Repository returns totalSites
        active: 8,
        inactive: 1,
        maintenance: 1,
        suspended: 0,
        totalAssignments: 25,
        averageAssignmentsPerSite: 2.5,
      };

      mockSiteRepository.getSitesStats.mockResolvedValue(mockStats);

      const result = await service.getStats();

      expect(siteRepository.getSitesStats).toHaveBeenCalled();
      // Test specific fields the service returns
      expect(result.active).toBe(8);
      expect(result.inactive).toBe(1);
      expect(result.totalSites).toBe(10);
      expect(result.total).toBe(10); // Service maps totalSites to total
    });
  });

  describe('findByClientId', () => {
    it('should return sites for a specific client', async () => {
      const clientId = 'test-client-id';
      const sites = [mockSite];

      mockClientRepository.findById.mockResolvedValue(mockClient);
      prismaMock.sites.findMany.mockResolvedValue(sites);

      const result = await service.findByClientId(clientId);

      expect(clientRepository.findById).toHaveBeenCalledWith(clientId);
      expect(prismaMock.sites.findMany).toHaveBeenCalledWith({
        where: {
          contracts: {
            client_id: clientId,
            clients: {
              company_id: expect.any(String),
            },
          },
        },
        include: {
          contracts: {
            include: {
              clients: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          _count: {
            select: {
              assignments: true,
              shifts: true,
            },
          },
        },
        orderBy: { name: 'asc' },
      });
      expect(result).toEqual(sites);
    });

    it('should throw NotFoundException if client not found', async () => {
      const clientId = 'non-existent-client-id';
      mockClientRepository.findById.mockResolvedValue(null);

      await expect(service.findByClientId(clientId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByOperationalStatus', () => {
    it('should return sites with specific operational status', async () => {
      const status = SiteOperationalStatus.ACTIVE;
      mockSiteRepository.findByOperationalStatus.mockResolvedValue([mockSite]);

      const result = await service.findByOperationalStatus(status);

      expect(siteRepository.findByOperationalStatus).toHaveBeenCalledWith(status);
      expect(result).toEqual([mockSite]);
    });
  });
});


