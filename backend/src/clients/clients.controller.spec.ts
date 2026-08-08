import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { ClientsController } from './clients.controller';
import { ClientsService } from './clients.service';
import { CreateClientDto, UpdateClientDto, ContractStatus } from './dto';
import { Client, ClientOrganizationType } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../common/tenant.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';

describe('ClientsController', () => {
  let controller: ClientsController;
  let service: jest.Mocked<ClientsService>;

  const mockClient: Client = {
    id: 'client-1',
    companyId: 'company-1',
    name: 'Test Client',
    contactEmail: 'test@client.com',
    contactInfo: null,
    // Using the embedded contract fields from the simplified schema
    contractStatus: 'ACTIVE' as any, // Using string instead of enum for now
    contractStart: null,
    contractEnd: null,
    billingPreferences: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockClientService = {
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
          useValue: mockClientService,
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
        name: 'Test Client',
        contactEmail: 'test@client.com',
        contractStatus: ContractStatus.PENDING,
      };

      service.create.mockResolvedValue(mockClient);

      const result = await controller.create(createDto);

      expect(service.create).toHaveBeenCalledWith(createDto);
      expect(result).toMatchObject({
        id: mockClient.id,
        name: mockClient.name,
        contactEmail: mockClient.contactEmail,
        contactInfo: mockClient.contactInfo,
        organizationType: mockClient.organizationType,
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
            name: mockClient.name,
            contactEmail: mockClient.contactEmail,
            contactInfo: mockClient.contactInfo,
            organizationType: mockClient.organizationType,
            industry: mockClient.industry,
            companySize: mockClient.companySize,
            tags: mockClient.tags,
            accountManagerId: mockClient.accountManagerId,
            createdAt: mockClient.createdAt,
            updatedAt: mockClient.updatedAt,
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
        active: undefined,
        suspended: 0,
        expired: 0,
        terminated: 0,
        expiringThisMonth: undefined,
      };

      service.getStats.mockResolvedValue(mockStats);

      const result = await controller.getStats();

      expect(service.getStats).toHaveBeenCalled();
      expect(result).toEqual(mockStats);
    });
  });

  describe('findExpiringContracts', () => {
    it('should return expiring contracts with default days', async () => {
      const expiringClients = [mockClient];
      service.findExpiringContracts.mockResolvedValue(expiringClients);

      const result = await controller.findExpiringContracts();

      expect(service.findExpiringContracts).toHaveBeenCalledWith(30);
      expect(result).toEqual([
        {
          id: mockClient.id,
          name: mockClient.name,
          contactEmail: mockClient.contactEmail,
          contactInfo: mockClient.contactInfo,
          organizationType: mockClient.organizationType,
          industry: mockClient.industry,
          companySize: mockClient.companySize,
          createdAt: mockClient.createdAt,
          updatedAt: mockClient.updatedAt,
        },
      ]);
    });

    it('should return expiring contracts with custom days', async () => {
      const expiringClients = [mockClient];
      service.findExpiringContracts.mockResolvedValue(expiringClients);

      const result = await controller.findExpiringContracts(60);

      expect(service.findExpiringContracts).toHaveBeenCalledWith(60);
      expect(result).toEqual([
        {
          id: mockClient.id,
          name: mockClient.name,
          contactEmail: mockClient.contactEmail,
          contactInfo: mockClient.contactInfo,
          organizationType: mockClient.organizationType,
          industry: mockClient.industry,
          companySize: mockClient.companySize,
          createdAt: mockClient.createdAt,
          updatedAt: mockClient.updatedAt,
        },
      ]);
    });
  });

  describe('findByStatus', () => {
    it('should return clients by contract status', async () => {
      const activeClients = [mockClient];
      service.findByOrganizationType.mockResolvedValue(activeClients);

      const result = await controller.findByStatus(ClientOrganizationType.CORPORATE_OFFICE);

      expect(service.findByOrganizationType).toHaveBeenCalledWith(ClientOrganizationType.CORPORATE_OFFICE);
      expect(result).toEqual([
        {
          id: mockClient.id,
          name: mockClient.name,
          contactEmail: mockClient.contactEmail,
          contactInfo: mockClient.contactInfo,
          organizationType: mockClient.organizationType,
          industry: mockClient.industry,
          companySize: mockClient.companySize,
          accountManagerId: mockClient.accountManagerId,
          tags: mockClient.tags,
          createdAt: mockClient.createdAt,
          updatedAt: mockClient.updatedAt,
        },
      ]);
    });
  });

  describe('findOne', () => {
    it('should return a client by ID', async () => {
      service.findOne.mockResolvedValue(mockClient);

      const result = await controller.findOne('client-1');

      expect(service.findOne).toHaveBeenCalledWith('client-1');
      expect(result).toEqual(mockClient);
    });
  });

  describe('update', () => {
    it('should update a client successfully', async () => {
      const updateDto: UpdateClientDto = {
        name: 'Updated Client',
        contactEmail: 'updated@client.com',
      };
      const updatedClient = { ...mockClient, ...updateDto };

      service.update.mockResolvedValue(updatedClient as any);

      const result = await controller.update('client-1', updateDto);

      expect(service.update).toHaveBeenCalledWith('client-1', updateDto);
      expect(result).toEqual(updatedClient);
    });
  });

  describe('remove', () => {
    it('should soft delete a client successfully', async () => {
      const deletedClient = { ...mockClient };
      service.remove.mockResolvedValue(deletedClient);

      const result = await controller.remove('client-1');

      expect(service.remove).toHaveBeenCalledWith('client-1');
      expect(result).toEqual(deletedClient);
    });
  });
});
