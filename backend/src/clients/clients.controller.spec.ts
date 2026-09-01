import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { ClientsController } from './clients.controller';
import { ClientsService } from './clients.service';
import { CreateClientDto, UpdateClientDto, ContractStatus } from './dto';
import { clients, ClientOrganizationType } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../common/tenant.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';

describe('ClientsController', () => {
  let controller: ClientsController;
  let service: jest.Mocked<ClientsService>;

  const mockClient: clients = {
    id: 'client-1',
    company_id: 'company-1',
    name: 'Test clients',
    contact_email: 'test@client.com',
    contact_info: null,
    // Updated to match current schema structure
    organization_type: 'CORPORATE_OFFICE' as any,
    industry: null,
    company_size: null,
    created_at: new Date(),
    updated_at: new Date(),
    contract_status: 'ACTIVE' as any,
    contract_start: new Date(),
    contract_end: null,
    billing_preferences: null,
    tags: [],
  };

  const mockClientsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    getStats: jest.fn(),
    findExpiringContracts: jest.fn(),
    findByOrganizationType: jest.fn(),
  };

  // Mock guard that always allows access
  const mockGuard = {
    canActivate: () => true,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClientsController],
      providers: [
        {
          provide: ClientsService,
          useValue: mockClientsService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockGuard)
      .overrideGuard(TenantGuard)
      .useValue(mockGuard)
      .overrideGuard(PermissionsGuard)
      .useValue(mockGuard)
      .compile();

    controller = module.get<ClientsController>(ClientsController);
    service = module.get(ClientsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a client successfully', async () => {
      const createDto: CreateClientDto = {
        name: 'Test clients',
        contactEmail: 'test@client.com',
        contractStatus: ContractStatus.PENDING,
      };

      service.create.mockResolvedValue(mockClient);

      const result = await controller.create(createDto);

      expect(service.create).toHaveBeenCalledWith(createDto);
      expect(result).toMatchObject({
        id: mockClient.id,
        name: mockClient.name,
        contact_email: mockClient.contact_email,
        contact_info: mockClient.contact_info,
        organizationType: mockClient.organization_type,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });
    });
  });

  describe('findAll', () => {
    it('should return paginated clients list', async () => {
      const mockListResult = {
        clients: [
          {
            ...mockClient,
            _count: { 
              sites: 0,
              clientUsers: undefined,
              contracts: undefined
            },
          },
        ],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      };

      const queryDto = { page: 1, limit: 20 };
      service.findAll.mockResolvedValue(mockListResult);

      const result = await controller.findAll(queryDto);

      expect(service.findAll).toHaveBeenCalledWith(queryDto);
      expect(result).toEqual({
        clients: [
          {
            id: mockClient.id,
            companyId: mockClient.company_id,
            name: mockClient.name,
            contact_email: mockClient.contact_email,
            contact_info: mockClient.contact_info,
            organizationType: mockClient.organization_type,
            industry: mockClient.industry,
            company_size: mockClient.company_size,
            createdAt: mockClient.created_at,
            updatedAt: mockClient.updated_at,
            _count: { 
              sites: 0,
              clientUsers: undefined,
              contracts: undefined
            },
          },
        ],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      });
    });
  });

  describe('getStats', () => {
    it('should return client statistics', async () => {
      const mockStats = {
        total: 10,
        byOrganizationType: { 'CORPORATE_OFFICE': 8, 'STARTUP': 2 },
        withActiveContracts: 8,
        withExpiringContracts: 2,
        withMultipleContracts: 1,
        withclientsUsers: 5,
      };

      service.getStats.mockResolvedValue(mockStats);

      const result = await controller.getStats();

      expect(service.getStats).toHaveBeenCalled();
      expect(result).toEqual(mockStats);
    });
  });

  describe('findExpiringContracts', () => {
    it('should return expiring contracts with default days', async () => {
      const expiringclientss = [mockClient];
      service.findExpiringContracts.mockResolvedValue(expiringclientss);

      const result = await controller.findExpiringContracts();

      expect(service.findExpiringContracts).toHaveBeenCalledWith(30);
      expect(result).toEqual([
        {
          id: mockClient.id,
          companyId: mockClient.company_id,
          name: mockClient.name,
          contact_email: mockClient.contact_email,
          contact_info: mockClient.contact_info,
          organizationType: mockClient.organization_type,
          industry: mockClient.industry,
          company_size: mockClient.company_size,
          createdAt: mockClient.created_at,
          updatedAt: mockClient.updated_at,
        },
      ]);
    });

    it('should return expiring contracts with custom days', async () => {
      const expiringclientss = [mockClient];
      service.findExpiringContracts.mockResolvedValue(expiringclientss);

      const result = await controller.findExpiringContracts(60);

      expect(service.findExpiringContracts).toHaveBeenCalledWith(60);
      expect(result).toEqual([
        {
          id: mockClient.id,
          companyId: mockClient.company_id,
          name: mockClient.name,
          contact_email: mockClient.contact_email,
          contact_info: mockClient.contact_info,
          organizationType: mockClient.organization_type,
          industry: mockClient.industry,
          company_size: mockClient.company_size,
          createdAt: mockClient.created_at,
          updatedAt: mockClient.updated_at,
        },
      ]);
    });
  });

  describe('findByStatus', () => {
    it('should return clients by contract status', async () => {
      const activeclientss = [mockClient];
      service.findByOrganizationType.mockResolvedValue(activeclientss);

      const result = await controller.findByStatus(ClientOrganizationType.CORPORATE_OFFICE);

      expect(service.findByOrganizationType).toHaveBeenCalledWith(ClientOrganizationType.CORPORATE_OFFICE);
      expect(result).toEqual([
        {
          id: mockClient.id,
          companyId: mockClient.company_id,
          name: mockClient.name,
          contact_email: mockClient.contact_email,
          contact_info: mockClient.contact_info,
          organizationType: mockClient.organization_type,
          industry: mockClient.industry,
          company_size: mockClient.company_size,
          createdAt: mockClient.created_at,
          updatedAt: mockClient.updated_at,
        },
      ]);
    });
  });

  describe('findOne', () => {
    it('should return a client by ID', async () => {
      service.findOne.mockResolvedValue(mockClient);

      const result = await controller.findOne('client-1');

      expect(service.findOne).toHaveBeenCalledWith('client-1');
      expect(result).toEqual({
        id: 'client-1',
        companyId: 'company-1',
        name: 'Test clients',
        contactEmail: 'test@client.com',
        contact_info: null,
        organizationType: 'CORPORATE_OFFICE',
        industry: null,
        company_size: null,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });
    });
  });

  describe('update', () => {
    it('should update a client successfully', async () => {
      const updateDto: UpdateClientDto = {
        name: 'Updated clients',
        contactEmail: 'updated@client.com',
      };
      const updatedclients = { ...mockClient, ...updateDto };

      service.update.mockResolvedValue(updatedclients as any);

      const result = await controller.update('client-1', updateDto);

      expect(service.update).toHaveBeenCalledWith('client-1', updateDto);
      expect(result).toEqual({
        id: 'client-1',
        companyId: 'company-1',
        name: 'Updated clients',
        contactEmail: 'updated@client.com',
        contact_info: null,
        organizationType: 'CORPORATE_OFFICE',
        industry: null,
        company_size: null,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });
    });
  });

  describe('remove', () => {
    it('should soft delete a client successfully', async () => {
      const deletedclients = { ...mockClient };
      service.remove.mockResolvedValue(deletedclients);

      const result = await controller.remove('client-1');

      expect(service.remove).toHaveBeenCalledWith('client-1');
      expect(result).toEqual({
        id: 'client-1',
        companyId: 'company-1',
        name: 'Test clients',
        contactEmail: 'test@client.com',
        contact_info: null,
        organizationType: 'CORPORATE_OFFICE',
        industry: null,
        company_size: null,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });
    });
  });
});
