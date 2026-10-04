import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ClientsService } from './clients.service';
import { ClientRepository } from '../common/repositories/client.repository';
import { TenantContextService } from '../common/tenant-context.service';
import { CreateClientDto, UpdateClientDto } from './dto';
import { clients } from '@prisma/client';

describe('ClientsService', () => {
  let service: ClientsService;
  let clientRepository: jest.Mocked<ClientRepository>;
  let tenantContext: jest.Mocked<TenantContextService>;

  const mockclients: clients = {
    id: 'client-1',
    company_id: 'company-1',
    name: 'Test clients',
    contact_email: 'test@client.com',
    contact_info: null,
    organization_type: 'CORPORATE_OFFICE' as any,
    industry: null,
    company_size: null,
    tags: [],
    contract_status: 'ACTIVE' as any,
    contract_start: new Date(),
    contract_end: null,
    billing_preferences: null,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const mockClientRepository = {
    create: jest.fn(),
    findById: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    getclientsStats: jest.fn(),
    findExpiringContracts: jest.fn(),
    findByContractStatus: jest.fn(),
    findWithExpiringContracts: jest.fn(),
    findByOrganizationType: jest.fn(),
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
    tenantContext = await module.resolve(TenantContextService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createclientsDto: CreateClientDto = {
      name: 'Test clients',
      contactEmail: 'test@client.com',
    };

    it('should create a client successfully', async () => {
      clientRepository.create.mockResolvedValue(mockclients);

      const result = await service.create(createclientsDto);

      expect(clientRepository.create).toHaveBeenCalledWith(createclientsDto);
      expect(result).toEqual(mockclients);
    });

    it('should create client with organization type and industry', async () => {
      const dtoWithDetails = {
        ...createclientsDto,
        organizationType: 'CORPORATE_OFFICE' as any,
        industry: 'Technology',
        companySize: '500-1000',
      };

      clientRepository.create.mockResolvedValue(mockclients);

      const result = await service.create(dtoWithDetails);

      expect(clientRepository.create).toHaveBeenCalledWith(dtoWithDetails);
      expect(result).toEqual(mockclients);
    });

    it('should create client with tags and account manager', async () => {
      const dtoWithTags = { 
        ...createclientsDto,
        tags: ['high-priority', 'tech-client'],
        accountManagerId: 'manager-123',
      };

      clientRepository.create.mockResolvedValue(mockclients);

      await service.create(dtoWithTags);

      expect(clientRepository.create).toHaveBeenCalledWith(dtoWithTags);
    });

    it('should handle repository errors', async () => {
      const error = new Error('Database error');
      clientRepository.create.mockRejectedValue(error);

      await expect(service.create(createclientsDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAll', () => {
    const mockListResult = {
      clients: [
        {
          ...mockclients,
          _count: { sites: 0 },
        },
      ] as any,
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
          organizationType: undefined,
          industry: undefined,
        },
        1,
        20,
        'created_at',
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
      clientRepository.findById.mockResolvedValue(mockclients);

      const result = await service.findOne('client-1');

      expect(clientRepository.findById).toHaveBeenCalledWith('client-1');
      expect(result).toEqual(mockclients);
    });

    it('should throw NotFoundException when client not found', async () => {
      clientRepository.findById.mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    const updateDto: UpdateClientDto = {
      name: 'Updated clients',
      contactEmail: 'updated@client.com',
    };

    it('should update a client successfully', async () => {
      const updatedclients = { ...mockclients, ...updateDto };
      clientRepository.findById.mockResolvedValue(mockclients);
      clientRepository.update.mockResolvedValue(updatedclients as any);

      const result = await service.update('client-1', updateDto);

      expect(clientRepository.update).toHaveBeenCalledWith('client-1', updateDto);
      expect(result).toEqual(updatedclients);
    });

    it('should update client with organization and performance data', async () => {
      const validDto = {
        organizationType: 'HOSPITAL' as any,
        industry: 'Healthcare',
        performanceMetrics: { satisfactionScore: 4.5 },
        relationshipNotes: 'Excellent long-term client',
      };

      const updatedclientsWithData = { ...mockclients, ...validDto };
      clientRepository.findById.mockResolvedValue(mockclients);
      clientRepository.update.mockResolvedValue(updatedclientsWithData as any);

      const result = await service.update('client-1', validDto);

      expect(clientRepository.update).toHaveBeenCalledWith('client-1', validDto);
      expect(result).toEqual(updatedclientsWithData);
    });

    it('should handle not found errors from repository', async () => {
      const error = new Error('clients with ID client-1 not found');
      clientRepository.update.mockRejectedValue(error);

      await expect(service.update('client-1', updateDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('remove', () => {
    it('should soft delete a client successfully', async () => {
      const deletedclients = { ...mockclients };
      clientRepository.delete.mockResolvedValue(deletedclients);

      const result = await service.remove('client-1');

      expect(clientRepository.delete).toHaveBeenCalledWith('client-1');
      expect(result).toEqual(deletedclients);
    });

    it('should handle not found errors from repository', async () => {
      const error = new Error('clients with ID client-1 not found');
      clientRepository.delete.mockRejectedValue(error);

      await expect(service.remove('client-1')).rejects.toThrow(BadRequestException);
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
      clientRepository.getclientsStats.mockResolvedValue(mockStats);

      const result = await service.getStats();

      expect(clientRepository.getclientsStats).toHaveBeenCalled();
      expect(result).toEqual(mockStats);
    });

    it('should handle repository errors', async () => {
      const error = new Error('Database error');
      clientRepository.getclientsStats.mockRejectedValue(error);

      await expect(service.getStats()).rejects.toThrow(BadRequestException);
    });
  });

  describe('findExpiringContracts', () => {
    it('should return clients with expiring contracts with default days', async () => {
      const clientsWithExpiringContracts = [mockclients];
      clientRepository.findWithExpiringContracts.mockResolvedValue(clientsWithExpiringContracts);

      const result = await service.findExpiringContracts();

      expect(clientRepository.findWithExpiringContracts).toHaveBeenCalledWith(30);
      expect(result).toEqual(clientsWithExpiringContracts);
    });

    it('should return clients with expiring contracts with custom days', async () => {
      const clientsWithExpiringContracts = [mockclients];
      clientRepository.findWithExpiringContracts.mockResolvedValue(clientsWithExpiringContracts);

      const result = await service.findExpiringContracts(60);

      expect(clientRepository.findWithExpiringContracts).toHaveBeenCalledWith(60);
      expect(result).toEqual(clientsWithExpiringContracts);
    });

    it('should handle repository errors', async () => {
      const error = new Error('Database error');
      clientRepository.findWithExpiringContracts.mockRejectedValue(error);

      await expect(service.findExpiringContracts()).rejects.toThrow(BadRequestException);
    });
  });

  describe('findByOrganizationType', () => {
    it('should return clients by organization type', async () => {
      const corporateclientss = [mockclients];
      clientRepository.findByOrganizationType.mockResolvedValue(corporateclientss);

      const result = await service.findByOrganizationType('CORPORATE_OFFICE');

      expect(clientRepository.findByOrganizationType).toHaveBeenCalledWith('CORPORATE_OFFICE');
      expect(result).toEqual(corporateclientss);
    });

    it('should handle repository errors', async () => {
      const error = new Error('Database error');
      clientRepository.findByOrganizationType.mockRejectedValue(error);

      await expect(service.findByOrganizationType('CORPORATE_OFFICE')).rejects.toThrow(BadRequestException);
    });
  });
});
