import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { ClientsController } from './clients.controller';
import { ClientsService } from './clients.service';
import { CreateClientDto, UpdateClientDto, ContractStatus } from './dto';
import { Client } from '@prisma/client';
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
    contractStatus: 'ACTIVE' as any,
    contractStart: new Date('2024-01-01'),
    contractEnd: new Date('2024-12-31'),
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
    findByContractStatus: jest.fn(),
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
      expect(result).toEqual({
        id: mockClient.id,
        name: mockClient.name,
        contactEmail: mockClient.contactEmail,
        contactInfo: mockClient.contactInfo,
        contractStatus: mockClient.contractStatus,
        contractStart: mockClient.contractStart,
        contractEnd: mockClient.contractEnd,
        billingPreferences: mockClient.billingPreferences,
        createdAt: mockClient.createdAt,
        updatedAt: mockClient.updatedAt,
      });
    });
  });

  describe('findAll', () => {
    it('should return paginated clients list', async () => {
      const mockListResult = {
        clients: [
          {
            ...mockClient,
            _count: { sites: 0 },
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
            contractStatus: mockClient.contractStatus,
            contractStart: mockClient.contractStart,
            contractEnd: mockClient.contractEnd,
            billingPreferences: mockClient.billingPreferences,
            createdAt: mockClient.createdAt,
            updatedAt: mockClient.updatedAt,
            _count: { sites: 0 },
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
        active: 8,
        suspended: 1,
        terminated: 1,
        expiringThisMonth: 2,
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
          contractStatus: mockClient.contractStatus,
          contractStart: mockClient.contractStart,
          contractEnd: mockClient.contractEnd,
          billingPreferences: mockClient.billingPreferences,
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
          contractStatus: mockClient.contractStatus,
          contractStart: mockClient.contractStart,
          contractEnd: mockClient.contractEnd,
          billingPreferences: mockClient.billingPreferences,
          createdAt: mockClient.createdAt,
          updatedAt: mockClient.updatedAt,
        },
      ]);
    });
  });

  describe('findByStatus', () => {
    it('should return clients by contract status', async () => {
      const activeClients = [mockClient];
      service.findByContractStatus.mockResolvedValue(activeClients);

      const result = await controller.findByStatus(ContractStatus.ACTIVE);

      expect(service.findByContractStatus).toHaveBeenCalledWith(ContractStatus.ACTIVE);
      expect(result).toEqual([
        {
          id: mockClient.id,
          name: mockClient.name,
          contactEmail: mockClient.contactEmail,
          contactInfo: mockClient.contactInfo,
          contractStatus: mockClient.contractStatus,
          contractStart: mockClient.contractStart,
          contractEnd: mockClient.contractEnd,
          billingPreferences: mockClient.billingPreferences,
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
      expect(result).toEqual({
        id: mockClient.id,
        name: mockClient.name,
        contactEmail: mockClient.contactEmail,
        contactInfo: mockClient.contactInfo,
        contractStatus: mockClient.contractStatus,
        contractStart: mockClient.contractStart,
        contractEnd: mockClient.contractEnd,
        billingPreferences: mockClient.billingPreferences,
        createdAt: mockClient.createdAt,
        updatedAt: mockClient.updatedAt,
      });
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
      expect(result).toEqual({
        id: updatedClient.id,
        name: updatedClient.name,
        contactEmail: updatedClient.contactEmail,
        contactInfo: updatedClient.contactInfo,
        contractStatus: updatedClient.contractStatus,
        contractStart: updatedClient.contractStart,
        contractEnd: updatedClient.contractEnd,
        billingPreferences: updatedClient.billingPreferences,
        createdAt: updatedClient.createdAt,
        updatedAt: updatedClient.updatedAt,
      });
    });
  });

  describe('remove', () => {
    it('should soft delete a client successfully', async () => {
      const deletedClient = { ...mockClient, contractStatus: 'TERMINATED' as any };
      service.remove.mockResolvedValue(deletedClient);

      const result = await controller.remove('client-1');

      expect(service.remove).toHaveBeenCalledWith('client-1');
      expect(result).toEqual({
        id: deletedClient.id,
        name: deletedClient.name,
        contactEmail: deletedClient.contactEmail,
        contactInfo: deletedClient.contactInfo,
        contractStatus: deletedClient.contractStatus,
        contractStart: deletedClient.contractStart,
        contractEnd: deletedClient.contractEnd,
        billingPreferences: deletedClient.billingPreferences,
        createdAt: deletedClient.createdAt,
        updatedAt: deletedClient.updatedAt,
      });
    });
  });
});
