import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext } from '@nestjs/common';
import { SitesController } from './sites.controller';
import { SitesService } from './sites.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { CreateSiteDto, UpdateSiteDto, SiteOperationalStatus } from './dto';

const mockSitesService = {
  create: jest.fn(),
  findAll: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
  getStats: jest.fn(),
  findByClientId: jest.fn(),
  findByOperationalStatus: jest.fn(),
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
  client: {
    id: 'test-client-id',
    name: 'Test Client',
    contractStatus: 'ACTIVE',
  },
  _count: {
    assignments: 2,
    shifts: 5,
  },
};

describe('SitesController', () => {
  let controller: SitesController;
  let service: SitesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SitesController],
      providers: [
        {
          provide: SitesService,
          useValue: mockSitesService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context: ExecutionContext) => true,
      })
      .overrideGuard(PermissionsGuard)
      .useValue({
        canActivate: (context: ExecutionContext) => true,
      })
      .compile();

    controller = module.get<SitesController>(SitesController);
    service = module.get<SitesService>(SitesService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a new site', async () => {
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

      mockSitesService.create.mockResolvedValue(mockSite);

      const result = await controller.create(createSiteDto);

      expect(service.create).toHaveBeenCalledWith(createSiteDto);
      expect(result.id).toBe(mockSite.id);
      expect(result.name).toBe(mockSite.name);
    });
  });

  describe('findAll', () => {
    it('should return a paginated list of sites', async () => {
      const queryDto = { page: 1, limit: 20 };
      const mockResult = {
        sites: [mockSite],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      };

      mockSitesService.findAll.mockResolvedValue(mockResult);

      const result = await controller.findAll(queryDto);

      expect(service.findAll).toHaveBeenCalledWith(queryDto);
      expect(result.sites).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });

  describe('findOne', () => {
    it('should return a site by ID', async () => {
      const siteId = 'test-site-id';
      mockSitesService.findOne.mockResolvedValue(mockSite);

      const result = await controller.findOne(siteId);

      expect(service.findOne).toHaveBeenCalledWith(siteId);
      expect(result.id).toBe(mockSite.id);
    });
  });

  describe('update', () => {
    it('should update a site', async () => {
      const siteId = 'test-site-id';
      const updateSiteDto: UpdateSiteDto = {
        name: 'Updated Site Name',
      };
      const updatedSite = { ...mockSite, ...updateSiteDto };

      mockSitesService.update.mockResolvedValue(updatedSite);

      const result = await controller.update(siteId, updateSiteDto);

      expect(service.update).toHaveBeenCalledWith(siteId, updateSiteDto);
      expect(result.name).toBe(updateSiteDto.name);
    });
  });

  describe('remove', () => {
    it('should soft delete a site', async () => {
      const siteId = 'test-site-id';
      const deletedSite = { ...mockSite, operationalStatus: SiteOperationalStatus.INACTIVE };

      mockSitesService.remove.mockResolvedValue(deletedSite);

      const result = await controller.remove(siteId);

      expect(service.remove).toHaveBeenCalledWith(siteId);
      expect(result.operationalStatus).toBe(SiteOperationalStatus.INACTIVE);
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

      mockSitesService.getStats.mockResolvedValue(mockStats);

      const result = await controller.getStats();

      expect(service.getStats).toHaveBeenCalled();
      expect(result.total).toBe(mockStats.total);
      expect(result.active).toBe(mockStats.active);
    });
  });

  describe('findByClientId', () => {
    it('should return sites for a specific client', async () => {
      const clientId = 'test-client-id';
      mockSitesService.findByClientId.mockResolvedValue([mockSite]);

      const result = await controller.findByClientId(clientId);

      expect(service.findByClientId).toHaveBeenCalledWith(clientId);
      expect(result).toHaveLength(1);
      expect(result[0].clientId).toBe(clientId);
    });
  });

  describe('findByStatus', () => {
    it('should return sites with a specific operational status', async () => {
      const status = SiteOperationalStatus.ACTIVE;
      mockSitesService.findByOperationalStatus.mockResolvedValue([mockSite]);

      const result = await controller.findByStatus(status);

      expect(service.findByOperationalStatus).toHaveBeenCalledWith(status);
      expect(result).toHaveLength(1);
      expect(result[0].operationalStatus).toBe(status);
    });
  });
});
