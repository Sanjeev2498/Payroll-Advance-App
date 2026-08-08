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
            client: {
              findFirst: jest.fn(),
            },
            contract: {
              create: jest.fn(),
              findMany: jest.fn(),
              findFirst: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
              count: jest.fn(),
            },
            site: {
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
      jest.spyOn(prismaService.client, 'findFirst').mockResolvedValue(mockClient as any);
      jest.spyOn(prismaService.contract, 'count').mockResolvedValue(0);
      jest.spyOn(prismaService.contract, 'create').mockResolvedValue({
        ...mockContract,
        client: mockClient,
      } as any);

      // Act
      const result = await service.create(mockCreateContractDto as any);

      // Assert
      expect(result).toBeDefined();
      expect(result.title).toBe(mockCreateContractDto.title);
      expect(prismaService.client.findFirst).toHaveBeenCalledWith({
        where: {
          id: mockClientId,
          companyId: mockTenantId,
        },
      });
      expect(prismaService.contract.create).toHaveBeenCalled();
    });

    it('should throw NotFoundException when client does not exist', async () => {
      // Arrange
      jest.spyOn(prismaService.client, 'findFirst').mockResolvedValue(null);

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
      jest.spyOn(prismaService.client, 'findFirst').mockResolvedValue(null);

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
          client: mockClient,
          sites: [],
          _count: { sites: 0, invoices: 0 },
        },
      ];
      jest.spyOn(prismaService.contract, 'findMany').mockResolvedValue(mockContracts as any);
      jest.spyOn(prismaService.contract, 'count').mockResolvedValue(1);

      // Act
      const result = await service.findAll(1, 10);

      // Assert
      expect(result).toBeDefined();
      expect(result.contracts).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
      expect(prismaService.contract.findMany).toHaveBeenCalledWith({
        where: {
          client: {
            companyId: mockTenantId,
          },
        },
        include: {
          client: {
            select: {
              id: true,
              name: true,
              contactEmail: true,
            },
          },
          sites: {
            select: {
              id: true,
              name: true,
              operationalStatus: true,
            },
          },
          _count: {
            select: {
              sites: true,
              invoices: true,
            },
          },
        },
        skip: 0,
        take: 10,
        orderBy: {
          createdAt: 'desc',
        },
      });
    });

    it('should filter contracts by status', async () => {
      // Arrange
      jest.spyOn(prismaService.contract, 'findMany').mockResolvedValue([]);
      jest.spyOn(prismaService.contract, 'count').mockResolvedValue(0);

      // Act
      await service.findAll(1, 10, ContractStatus.ACTIVE);

      // Assert
      expect(prismaService.contract.findMany).toHaveBeenCalledWith({
        where: {
          client: {
            companyId: mockTenantId,
          },
          status: ContractStatus.ACTIVE,
        },
        include: expect.any(Object),
        skip: 0,
        take: 10,
        orderBy: {
          createdAt: 'desc',
        },
      });
    });

    it('should filter contracts by client ID', async () => {
      // Arrange
      jest.spyOn(prismaService.contract, 'findMany').mockResolvedValue([]);
      jest.spyOn(prismaService.contract, 'count').mockResolvedValue(0);

      // Act
      await service.findAll(1, 10, undefined, mockClientId);

      // Assert
      expect(prismaService.contract.findMany).toHaveBeenCalledWith({
        where: {
          client: {
            companyId: mockTenantId,
          },
          clientId: mockClientId,
        },
        include: expect.any(Object),
        skip: 0,
        take: 10,
        orderBy: {
          createdAt: 'desc',
        },
      });
    });
  });

  describe('findOne', () => {
    it('should return a contract by ID', async () => {
      // Arrange
      const mockContractWithRelations = {
        ...mockContract,
        client: mockClient,
        sites: [],
        invoices: [],
      };
      jest
        .spyOn(prismaService.contract, 'findFirst')
        .mockResolvedValue(mockContractWithRelations as any);

      // Act
      const result = await service.findOne(mockContractId);

      // Assert
      expect(result).toBeDefined();
      expect(result.id).toBe(mockContractId);
      expect(prismaService.contract.findFirst).toHaveBeenCalledWith({
        where: {
          id: mockContractId,
          client: {
            companyId: mockTenantId,
          },
        },
        include: expect.any(Object),
      });
    });

    it('should throw NotFoundException when contract does not exist', async () => {
      // Arrange
      jest.spyOn(prismaService.contract, 'findFirst').mockResolvedValue(null);

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
        client: mockClient,
        sites: [],
        invoices: [],
        contractHistory: {},
      };

      jest.spyOn(service, 'findOne').mockResolvedValue(existingContract as any);
      jest.spyOn(prismaService.contract, 'update').mockResolvedValue({
        ...existingContract,
        ...updateDto,
      } as any);

      // Act
      const result = await service.update(mockContractId, updateDto);

      // Assert
      expect(result).toBeDefined();
      expect(result.title).toBe(updateDto.title);
      expect(prismaService.contract.update).toHaveBeenCalledWith({
        where: { id: mockContractId },
        data: expect.objectContaining({
          title: updateDto.title,
          status: updateDto.status,
          contractHistory: expect.any(Object),
        }),
        include: {
          client: {
            select: {
              id: true,
              name: true,
              contactEmail: true,
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
      jest.spyOn(prismaService.site, 'count').mockResolvedValue(0);
      jest.spyOn(prismaService.contract, 'update').mockResolvedValue(mockContract as any);

      // Act
      await service.remove(mockContractId);

      // Assert
      expect(prismaService.site.count).toHaveBeenCalledWith({
        where: {
          contractId: mockContractId,
          operationalStatus: 'ACTIVE',
        },
      });
      expect(prismaService.contract.update).toHaveBeenCalledWith({
        where: { id: mockContractId },
        data: {
          status: ContractStatus.TERMINATED,
          endDate: expect.any(Date),
        },
      });
    });

    it('should throw BadRequestException when contract has active sites', async () => {
      // Arrange
      jest.spyOn(service, 'findOne').mockResolvedValue(mockContract as any);
      jest.spyOn(prismaService.site, 'count').mockResolvedValue(2);

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
      jest.spyOn(prismaService.client, 'findFirst').mockResolvedValue(mockClient as any);
      jest.spyOn(prismaService.contract, 'count').mockResolvedValue(5);
      jest.spyOn(prismaService.contract, 'create').mockResolvedValue({
        ...mockContract,
        contractNumber: 'CNT-2024-0006',
        client: mockClient,
      } as any);

      // Act
      const result = await service.create(mockCreateContractDto as any);

      // Assert
      expect(result.contractNumber).toMatch(/^CNT-\d{4}-\d{4}$/);
    });
  });
});