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
mockSiteRepository.getSiteStats = jest.fn();
mockSiteRepository.findByClientId = jest.fn();
mockSiteRepository.findByOperationalStatus = jest.fn();

const mockSite = {
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
  contractStatus: 'ACTIVE',
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
        client: mockClient,
      };

      mockClientRepository.findById.mockResolvedValue(mockClient);
      prismaMock.contract.findFirst.mockResolvedValue(mockContract);
      mockSiteRepository.create.mockResolvedValue(mockSite);

      const result = await service.create(createSiteDto);

      expect(prismaMock.contract.findFirst).toHaveBeenCalledWith({
        where: {
          id: createSiteDto.contractId,
          client: {
            companyId: expect.any(String),
          },
        },
        include: {
          client: true,
        },
      });
      expect(siteRepository.create).toHaveBeenCalled();
      expect(result).toBe(mockSite);
    });

    it('should throw BadRequestException if client not found', async () => {
      const createSiteDto: CreateSiteDto = {
        clientId: 'non-existent-client-id',
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

      prismaMock.contract.findFirst.mockResolvedValue(null); // No contract found

      await expect(service.create(createSiteDto)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if client is terminated', async () => {
      const createSiteDto: CreateSiteDto = {
        clientId: 'test-client-id',
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
        client: mockClient,
      };

      prismaMock.contract.findFirst.mockResolvedValue(terminatedContract);

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

      mockSiteRepository.findMany.mockResolvedValue(mockResult);

      const result = await service.findAll(queryDto);

      expect(siteRepository.findMany).toHaveBeenCalledWith(
        expect.any(Object),
        queryDto.page,
        queryDto.limit,
        queryDto.sortBy,
        queryDto.sortOrder,
      );
      expect(result).toBe(mockResult);
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
        total: 10,
        active: 8,
        inactive: 1,
        maintenance: 1,
        suspended: 0,
        totalAssignments: 25,
        averageAssignmentsPerSite: 2.5,
      };

      mockSiteRepository.getSiteStats.mockResolvedValue(mockStats);

      const result = await service.getStats();

      expect(siteRepository.getSiteStats).toHaveBeenCalled();
      expect(result).toBe(mockStats);
    });
  });

  describe('findByClientId', () => {
    it('should return sites for a specific client', async () => {
      const clientId = 'test-client-id';
      const sites = [mockSite];

      mockClientRepository.findById.mockResolvedValue(mockClient);
      prismaMock.site.findMany.mockResolvedValue(sites);

      const result = await service.findByClientId(clientId);

      expect(clientRepository.findById).toHaveBeenCalledWith(clientId);
      expect(prismaMock.site.findMany).toHaveBeenCalledWith({
        where: {
          contract: {
            clientId: clientId,
            client: {
              companyId: 'test-tenant-id',
            },
          },
        },
        include: {
          contract: {
            include: {
              client: {
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
