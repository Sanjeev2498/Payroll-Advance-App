import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { SitesService } from './sites.service';
import { SiteRepository } from '../common/repositories/site.repository';
import { ClientRepository } from '../common/repositories/client.repository';
import { TenantContextService } from '../common/tenant-context.service';
import { CreateSiteDto, SiteOperationalStatus } from './dto';

const mockSiteRepository = {
  create: jest.fn(),
  findById: jest.fn(),
  findMany: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  getSiteStats: jest.fn(),
  findByClientId: jest.fn(),
  findByOperationalStatus: jest.fn(),
};

const mockClientRepository = {
  findById: jest.fn(),
};

const mockTenantContextService = {
  getTenantId: jest.fn().mockReturnValue('test-tenant-id'),
  getUserRole: jest.fn().mockReturnValue('MANAGER'),
};

const mockSite = {
  id: 'test-site-id',
  clientId: 'test-client-id',
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
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new site successfully', async () => {
      const createSiteDto: CreateSiteDto = {
        clientId: 'test-client-id',
        name: 'Test Site',
        address: {
          street: '123 Test St',
          city: 'Test City',
          state: 'TS',
          zipCode: '12345',
          country: 'Test Country',
        },
      };

      mockClientRepository.findById.mockResolvedValue(mockClient);
      mockSiteRepository.create.mockResolvedValue(mockSite);

      const result = await service.create(createSiteDto);

      expect(clientRepository.findById).toHaveBeenCalledWith(createSiteDto.clientId);
      expect(siteRepository.create).toHaveBeenCalled();
      expect(result).toBe(mockSite);
    });

    it('should throw BadRequestException if client not found', async () => {
      const createSiteDto: CreateSiteDto = {
        clientId: 'non-existent-client-id',
        name: 'Test Site',
        address: {
          street: '123 Test St',
          city: 'Test City',
          state: 'TS',
          zipCode: '12345',
          country: 'Test Country',
        },
      };

      mockClientRepository.findById.mockResolvedValue(null);

      await expect(service.create(createSiteDto)).rejects.toThrow(BadRequestException);
      expect(clientRepository.findById).toHaveBeenCalledWith(createSiteDto.clientId);
    });

    it('should throw BadRequestException if client is terminated', async () => {
      const createSiteDto: CreateSiteDto = {
        clientId: 'test-client-id',
        name: 'Test Site',
        address: {
          street: '123 Test St',
          city: 'Test City',
          state: 'TS',
          zipCode: '12345',
          country: 'Test Country',
        },
      };

      const terminatedClient = { ...mockClient, contractStatus: 'TERMINATED' };
      mockClientRepository.findById.mockResolvedValue(terminatedClient);

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

      mockClientRepository.findById.mockResolvedValue(mockClient);
      mockSiteRepository.findByClientId.mockResolvedValue([mockSite]);

      const result = await service.findByClientId(clientId);

      expect(clientRepository.findById).toHaveBeenCalledWith(clientId);
      expect(siteRepository.findByClientId).toHaveBeenCalledWith(clientId);
      expect(result).toEqual([mockSite]);
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
