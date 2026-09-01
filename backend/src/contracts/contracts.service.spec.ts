import { Test, TestingModule } from '@nestjs/testing';
import { ContractsService } from './contracts.service';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from '../common/tenant-context.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ContractStatus } from '@prisma/client';

describe('ContractsService', () => {
  let service: ContractsService;
  let prismaService: PrismaService;
  let tenantContextService: TenantContextService;

  const mockTenantId = '123e4567-e89b-12d3-a456-426614174000';
  const mockClientId = '123e4567-e89b-12d3-a456-426614174001';
  const mockContractId = '123e4567-e89b-12d3-a456-426614174002';

  const mockClient = {
    id: mockClientId,
    companyId: mockTenantId,
    name: 'Test Client',
    contactEmail: 'test@client.com',
  };

  const mockContract = {
    id: mockContractId,
    contractNumber: 'CNT-2024-0001',
    clientId: mockClientId,
    title: 'Test Security Contract',
    description: 'Test contract description',
    status: ContractStatus.ACTIVE,
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-12-31'),
    serviceDefinitions: {
      guardCount: 3,
      minStaffingLevel: 2,
      shiftPatterns: {},
    },
    serviceLevelAgreement: null,
    billingPreferences: {
      billingFrequency: 'MONTHLY',
      rates: {
        regularHourlyRate: 25.0,
      },
    },
    defaultBillingRates: null,
    contractValue: 100000,
    paymentTerms: null,
    renewalNotificationDays: 90,
    autoRenewalEnabled: false,
    contractHistory: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockCreateContractDto = {
    clientId: mockClientId,
    title: 'Test Security Contract',
    description: 'Test contract description',
    status: ContractStatus.ACTIVE,
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    serviceDefinitions: {
      guardCount: 3,
      minStaffingLevel: 2,
      shiftPatterns: {},
    },
    billingConfiguration: {
      billingFrequency: 'MONTHLY',
      rates: {
        regularHourlyRate: 25.0,
      },
    },
    contractValue: 100000,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContractsService,
        {
          provide: PrismaService,
          useValue: {
            clients: {
              findFirst: jest.fn(),
            },
            contracts: {
              create: jest.fn(),
              findMany: jest.fn(),
              findFirst: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
              count: jest.fn(),
            },
            sites: {
              count: jest.fn(),
            },
          },
        },
        {
          provide: TenantContextService,
          useValue: {
            getTenantId: jest.fn().mockReturnValue(mockTenantId),
          },
        },
      ],
    }).compile();

    service = module.get<ContractsService>(ContractsService);
    prismaService = module.get<PrismaService>(PrismaService);
    tenantContextService = module.get<TenantContextService>(TenantContextService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new contract successfully', async () => {
      // Arrange
      jest.spyOn(prismaService.clients, 'findFirst').mockResolvedValue(mockClient as any);
      jest.spyOn(prismaService.contracts, 'count').mockResolvedValue(0);
      jest.spyOn(prismaService.contracts, 'create').mockResolvedValue({
        ...mockContract,
        clients: mockClient,
      } as any);

      // Act
      const result = await service.create(mockCreateContractDto as any);

      // Assert
      expect(result).toBeDefined();
      expect(result.title).toBe(mockCreateContractDto.title);
      expect(prismaService.clients.findFirst).toHaveBeenCalledWith({
        where: {
          id: mockClientId,
          company_id: mockTenantId,
        },
      });
      expect(prismaService.contracts.create).toHaveBeenCalled();
    });

    it('should throw NotFoundException when client does not exist', async () => {
      // Arrange
      jest.spyOn(prismaService.clients, 'findFirst').mockResolvedValue(null);

      // Act & Assert
      await expect(service.create(mockCreateContractDto as any)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException when client does not belong to tenant', async () => {
      // Arrange
      const wrongTenantClient = {
        ...mockClient,
        companyId: 'different-tenant-id',
      };
      jest.spyOn(prismaService.clients, 'findFirst').mockResolvedValue(null);

      // Act & Assert
      await expect(service.create(mockCreateContractDto as any)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findAll', () => {
    it('should return paginated contracts', async () => {
      // Arrange
      const mockContracts = [
        {
          ...mockContract,
          clients: mockClient,
          sites: [],
        },
      ];
      jest.spyOn(prismaService.contracts, 'findMany').mockResolvedValue(mockContracts as any);
      jest.spyOn(prismaService.contracts, 'count').mockResolvedValue(1);

      // Act
      const result = await service.findAll(1, 10);

      // Assert
      expect(result).toBeDefined();
      expect(result.contracts).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
      expect(prismaService.contracts.findMany).toHaveBeenCalledWith({
        where: {
          clients: {
            company_id: mockTenantId,
          },
        },
        include: {
          clients: {
            select: {
              id: true,
              name: true,
              contact_email: true,
            },
          },
          sites: {
            select: {
              id: true,
              name: true,
              operational_status: true,
            },
          },
        },
        skip: 0,
        take: 10,
        orderBy: {
          created_at: 'desc',
        },
      });
    });

    it('should filter contracts by status', async () => {
      // Arrange
      jest.spyOn(prismaService.contracts, 'findMany').mockResolvedValue([]);
      jest.spyOn(prismaService.contracts, 'count').mockResolvedValue(0);

      // Act
      await service.findAll(1, 10, ContractStatus.ACTIVE);

      // Assert
      expect(prismaService.contracts.findMany).toHaveBeenCalledWith({
        where: {
          clients: {
            company_id: mockTenantId,
          },
          status: ContractStatus.ACTIVE,
        },
        include: expect.any(Object),
        skip: 0,
        take: 10,
        orderBy: {
          created_at: 'desc',
        },
      });
    });

    it('should filter contracts by client ID', async () => {
      // Arrange
      jest.spyOn(prismaService.contracts, 'findMany').mockResolvedValue([]);
      jest.spyOn(prismaService.contracts, 'count').mockResolvedValue(0);

      // Act
      await service.findAll(1, 10, undefined, mockClientId);

      // Assert
      expect(prismaService.contracts.findMany).toHaveBeenCalledWith({
        where: {
          clients: {
            company_id: mockTenantId,
          },
          client_id: mockClientId,
        },
        include: expect.any(Object),
        skip: 0,
        take: 10,
        orderBy: {
          created_at: 'desc',
        },
      });
    });
  });

  describe('findOne', () => {
    it('should return a contract by ID', async () => {
      // Arrange
      const mockContractWithRelations = {
        ...mockContract,
        clients: mockClient,
        sites: [],
      };
      jest
        .spyOn(prismaService.contracts, 'findFirst')
        .mockResolvedValue(mockContractWithRelations as any);

      // Act
      const result = await service.findOne(mockContractId);

      // Assert
      expect(result).toBeDefined();
      expect(result.id).toBe(mockContractId);
      expect(prismaService.contracts.findFirst).toHaveBeenCalledWith({
        where: {
          id: mockContractId,
          clients: {
            company_id: mockTenantId,
          },
        },
        include: expect.any(Object),
      });
    });

    it('should throw NotFoundException when contract does not exist', async () => {
      // Arrange
      jest.spyOn(prismaService.contracts, 'findFirst').mockResolvedValue(null);

      // Act & Assert
      await expect(service.findOne(mockContractId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update a contract successfully', async () => {
      // Arrange
      const updateDto = {
        title: 'Updated Contract Title',
        status: ContractStatus.ACTIVE,
      };
      
      const existingContract = {
        ...mockContract,
        clients: mockClient,
        sites: [],
      };

      jest.spyOn(service, 'findOne').mockResolvedValue(existingContract as any);
      jest.spyOn(prismaService.contracts, 'update').mockResolvedValue({
        ...existingContract,
        ...updateDto,
      } as any);

      // Act
      const result = await service.update(mockContractId, updateDto);

      // Assert
      expect(result).toBeDefined();
      expect(result.title).toBe(updateDto.title);
      expect(prismaService.contracts.update).toHaveBeenCalledWith({
        where: { id: mockContractId },
        data: expect.objectContaining({
          title: updateDto.title,
          status: updateDto.status,
          updated_at: expect.any(Date),
        }),
        include: {
          clients: {
            select: {
              id: true,
              name: true,
              contact_email: true,
            },
          },
        },
      });
    });

    it('should throw NotFoundException when contract does not exist', async () => {
      // Arrange
      jest.spyOn(service, 'findOne').mockRejectedValue(new NotFoundException());

      // Act & Assert
      await expect(
        service.update(mockContractId, { title: 'Updated Title' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should soft delete a contract with no active sites', async () => {
      // Arrange
      jest.spyOn(service, 'findOne').mockResolvedValue(mockContract as any);
      jest.spyOn(prismaService.sites, 'count').mockResolvedValue(0);
      jest.spyOn(prismaService.contracts, 'update').mockResolvedValue(mockContract as any);

      // Act
      await service.remove(mockContractId);

      // Assert
      expect(prismaService.sites.count).toHaveBeenCalledWith({
        where: {
          contract_id: mockContractId,
          operational_status: 'ACTIVE',
        },
      });
      expect(prismaService.contracts.update).toHaveBeenCalledWith({
        where: { id: mockContractId },
        data: {
          status: ContractStatus.TERMINATED,
          end_date: expect.any(Date),
        },
      });
    });

    it('should throw BadRequestException when contract has active sites', async () => {
      // Arrange
      jest.spyOn(service, 'findOne').mockResolvedValue(mockContract as any);
      jest.spyOn(prismaService.sites, 'count').mockResolvedValue(2);

      // Act & Assert
      await expect(service.remove(mockContractId)).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when contract does not exist', async () => {
      // Arrange
      jest.spyOn(service, 'findOne').mockRejectedValue(new NotFoundException());

      // Act & Assert
      await expect(service.remove(mockContractId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('contract number generation', () => {
    it('should generate unique contract numbers', async () => {
      // Arrange
      jest.spyOn(prismaService.clients, 'findFirst').mockResolvedValue(mockClient as any);
      jest.spyOn(prismaService.contracts, 'count').mockResolvedValue(5);
      jest.spyOn(prismaService.contracts, 'create').mockResolvedValue({
        ...mockContract,
        contract_number: 'CNT-2024-0006',
        clients: mockClient,
      } as any);

      // Act
      const result = await service.create(mockCreateContractDto as any);

      // Assert
      expect(result.contract_number).toMatch(/^CNT-\d{4}-\d{4}$/);
    });
  });
});