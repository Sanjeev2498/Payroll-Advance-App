import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ClientsService } from './clients.service';
import { ClientRepository } from '../common/repositories/client.repository';
import { TenantContextService } from '../common/tenant-context.service';
import { CreateClientDto, UpdateClientDto, ContractStatus } from './dto';
import { Client } from '@prisma/client';

describe('ClientsService', () => {
  let service: ClientsService;
  let clientRepository: jest.Mocked<ClientRepository>;
  let tenantContext: jest.Mocked<TenantContextService>;

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

  const mockClientRepository = {
    create: jest.fn(),
    findById: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    getClientStats: jest.fn(),
    findExpiringContracts: jest.fn(),
    findByContractStatus: jest.fn(),
  };

  const mockTenantContext = {
    getTenantId: jest.fn().mockReturnValue('company-1'),
    getUserId: jest.fn().mockReturnValue('user-1'),
    getUserRole: jest.fn().mockReturnValue('MANAGER'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClientsService,
        {
          provide: ClientRepository,
          useValue: mockClientRepository,
        },
        {
          provide: TenantContextService,
          useValue: mockTenantContext,
        },
      ],
    }).compile();

    service = module.get<ClientsService>(ClientsService);
    clientRepository = module.get(ClientRepository);
    tenantContext = module.get(TenantContextService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createClientDto: CreateClientDto = {
      name: 'Test Client',
      contactEmail: 'test@client.com',
      contractStatus: ContractStatus.PENDING,
      contractStart: new Date('2024-01-01'),
      contractEnd: new Date('2024-12-31'),
    };

    it('should create a client successfully', async () => {
      clientRepository.create.mockResolvedValue(mockClient);

      const result = await service.create(createClientDto);

      expect(clientRepository.create).toHaveBeenCalledWith(createClientDto);
      expect(result).toEqual(mockClient);
    });

    it('should throw BadRequestException for invalid contract dates', async () => {
      const invalidDto = {
        ...createClientDto,
        contractStart: new Date('2024-12-31'),
        contractEnd: new Date('2024-01-01'), // End before start
      };

      await expect(service.create(invalidDto)).rejects.toThrow(BadRequestException);
      expect(clientRepository.create).not.toHaveBeenCalled();
    });

    it('should set default contract status if not provided', async () => {
      const dtoWithoutStatus = { ...createClientDto };
      delete dtoWithoutStatus.contractStatus;

      clientRepository.create.mockResolvedValue(mockClient);

      await service.create(dtoWithoutStatus);

      expect(clientRepository.create).toHaveBeenCalledWith({
        ...dtoWithoutStatus,
        contractStatus: ContractStatus.PENDING,
      });
    });

    it('should handle repository errors', async () => {
      const error = new Error('Database error');
      clientRepository.create.mockRejectedValue(error);

      await expect(service.create(createClientDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAll', () => {
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

    it('should return paginated clients list', async () => {
      const queryDto = { page: 1, limit: 20 };
      clientRepository.findMany.mockResolvedValue(mockListResult);

      const result = await service.findAll(queryDto);

      expect(clientRepository.findMany).toHaveBeenCalledWith(
        {
          search: undefined,
          contractStatus: undefined,
          contractExpiringBefore: undefined,
        },
        1,
        20,
        undefined,
        undefined,
      );
      expect(result).toEqual(mockListResult);
    });

    it('should handle repository errors', async () => {
      const error = new Error('Database error');
      clientRepository.findMany.mockRejectedValue(error);

      await expect(service.findAll({})).rejects.toThrow(BadRequestException);
    });
  });

  describe('findOne', () => {
    it('should return a client by ID', async () => {
      clientRepository.findById.mockResolvedValue(mockClient);

      const result = await service.findOne('client-1');

      expect(clientRepository.findById).toHaveBeenCalledWith('client-1');
      expect(result).toEqual(mockClient);
    });

    it('should throw NotFoundException when client not found', async () => {
      clientRepository.findById.mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    const updateDto: UpdateClientDto = {
      name: 'Updated Client',
      contactEmail: 'updated@client.com',
    };

    it('should update a client successfully', async () => {
      const updatedClient = { ...mockClient, ...updateDto };
      clientRepository.findById.mockResolvedValue(mockClient);
      clientRepository.update.mockResolvedValue(updatedClient as any);

      const result = await service.update('client-1', updateDto);

      expect(clientRepository.update).toHaveBeenCalledWith('client-1', updateDto);
      expect(result).toEqual(updatedClient);
    });

    it('should throw BadRequestException for invalid contract dates', async () => {
      const invalidDto = {
        contractStart: new Date('2024-12-31'),
        contractEnd: new Date('2024-01-01'), // End before start
      };

      await expect(service.update('client-1', invalidDto)).rejects.toThrow(BadRequestException);
      expect(clientRepository.update).not.toHaveBeenCalled();
    });

    it('should handle not found errors from repository', async () => {
      const error = new Error('Client with ID client-1 not found');
      clientRepository.update.mockRejectedValue(error);

      await expect(service.update('client-1', updateDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('remove', () => {
    it('should soft delete a client successfully', async () => {
      const deletedClient = { ...mockClient, contractStatus: 'TERMINATED' as any };
      clientRepository.delete.mockResolvedValue(deletedClient);

      const result = await service.remove('client-1');

      expect(clientRepository.delete).toHaveBeenCalledWith('client-1');
      expect(result).toEqual(deletedClient);
    });

    it('should handle not found errors from repository', async () => {
      const error = new Error('Client with ID client-1 not found');
      clientRepository.delete.mockRejectedValue(error);

      await expect(service.remove('client-1')).rejects.toThrow(BadRequestException);
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
      clientRepository.getClientStats.mockResolvedValue(mockStats);

      const result = await service.getStats();

      expect(clientRepository.getClientStats).toHaveBeenCalled();
      expect(result).toEqual(mockStats);
    });

    it('should handle repository errors', async () => {
      const error = new Error('Database error');
      clientRepository.getClientStats.mockRejectedValue(error);

      await expect(service.getStats()).rejects.toThrow(BadRequestException);
    });
  });

  describe('findExpiringContracts', () => {
    it('should return expiring contracts with default days', async () => {
      const expiringClients = [mockClient];
      clientRepository.findExpiringContracts.mockResolvedValue(expiringClients);

      const result = await service.findExpiringContracts();

      expect(clientRepository.findExpiringContracts).toHaveBeenCalledWith(30);
      expect(result).toEqual(expiringClients);
    });

    it('should return expiring contracts with custom days', async () => {
      const expiringClients = [mockClient];
      clientRepository.findExpiringContracts.mockResolvedValue(expiringClients);

      const result = await service.findExpiringContracts(60);

      expect(clientRepository.findExpiringContracts).toHaveBeenCalledWith(60);
      expect(result).toEqual(expiringClients);
    });

    it('should handle repository errors', async () => {
      const error = new Error('Database error');
      clientRepository.findExpiringContracts.mockRejectedValue(error);

      await expect(service.findExpiringContracts()).rejects.toThrow(BadRequestException);
    });
  });

  describe('findByContractStatus', () => {
    it('should return clients by status', async () => {
      const activeClients = [mockClient];
      clientRepository.findByContractStatus.mockResolvedValue(activeClients);

      const result = await service.findByContractStatus(ContractStatus.ACTIVE);

      expect(clientRepository.findByContractStatus).toHaveBeenCalledWith(ContractStatus.ACTIVE);
      expect(result).toEqual(activeClients);
    });

    it('should handle repository errors', async () => {
      const error = new Error('Database error');
      clientRepository.findByContractStatus.mockRejectedValue(error);

      await expect(service.findByContractStatus(ContractStatus.ACTIVE)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
