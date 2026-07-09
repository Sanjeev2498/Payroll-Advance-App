import { Test, TestingModule } from '@nestjs/testing';
import { ClientsService } from './clients.service';
import { ClientRepository } from '../common/repositories/client.repository';
import { TenantContextService } from '../common/tenant-context.service';
import { CreateClientDto, ContractStatus } from './dto';

describe('Enhanced Client Management Service', () => {
  let service: ClientsService;
  let repository: ClientRepository;

  const mockClient = {
    id: 'test-client-id',
    name: 'Test Security Corp',
    contactEmail: 'contact@testsecurity.com',
    contractStatus: ContractStatus.ACTIVE,
    contractStart: new Date('2024-01-01'),
    contractEnd: new Date('2024-12-31'),
    industry: 'Security Services',
    companySize: 'MEDIUM',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockRepository = {
    create: jest.fn(),
    findById: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    getClientPerformanceMetrics: jest.fn(),
    getContractRenewalInfo: jest.fn(),
    getOnboardingStatus: jest.fn(),
  };

  const mockTenantContext = {
    getTenantId: jest.fn().mockReturnValue('test-tenant-id'),
    setTenantId: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClientsService,
        {
          provide: ClientRepository,
          useValue: mockRepository,
        },
        {
          provide: TenantContextService,
          useValue: mockTenantContext,
        },
      ],
    }).compile();

    service = module.get<ClientsService>(ClientsService);
    repository = module.get<ClientRepository>(ClientRepository);
  });

  describe('Enhanced Client Creation', () => {
    it('should create a client with enhanced fields', async () => {
      const createDto: CreateClientDto = {
        name: 'Test Security Corp',
        contactEmail: 'contact@testsecurity.com',
        industry: 'Security Services',
        companySize: 'MEDIUM',
        contractStatus: ContractStatus.PENDING,
        billingPreferences: {
          frequency: 'MONTHLY',
          paymentTerms: 30,
          currency: 'USD',
        },
        tags: ['high-priority', 'enterprise'],
        renewalNotificationDays: 60,
        autoRenewalEnabled: false,
      };

      mockRepository.create.mockResolvedValue(mockClient);

      const result = await service.create(createDto);
      
      expect(result).toBeDefined();
      expect(result.name).toBe('Test Security Corp');
      expect(mockRepository.create).toHaveBeenCalled();
    });
  });

  describe('Performance Metrics', () => {
    it('should return client performance metrics', async () => {
      const mockMetrics = {
        serviceQualityScore: 8.5,
        paymentTimelinessScore: 9.0,
        contractComplianceScore: 8.8,
        satisfactionRating: 4.2,
        complaintsThisYear: 0,
        escalationsThisYear: 0,
        avgResponseTime: 2.5,
      };

      mockRepository.getClientPerformanceMetrics.mockResolvedValue(mockMetrics);

      const metrics = await service.getClientPerformanceMetrics('test-client-id');
      
      expect(metrics).toBeDefined();
      expect(metrics.serviceQualityScore).toBe(8.5);
      expect(metrics.paymentTimelinessScore).toBe(9.0);
      expect(metrics.contractComplianceScore).toBe(8.8);
    });
  });

  describe('Contract Renewal Information', () => {
    it('should return contract renewal information', async () => {
      const mockRenewalInfo = {
        daysUntilExpiry: 180,
        renewalStatus: 'PENDING_REVIEW',
        notificationSent: false,
        renewalProbability: 8,
      };

      mockRepository.getContractRenewalInfo.mockResolvedValue(mockRenewalInfo);

      const renewalInfo = await service.getContractRenewalInfo('test-client-id');
      
      expect(renewalInfo).toBeDefined();
      expect(renewalInfo.daysUntilExpiry).toBe(180);
      expect(renewalInfo.renewalStatus).toBe('PENDING_REVIEW');
      expect(renewalInfo.renewalProbability).toBe(8);
    });

    it('should handle errors properly', async () => {
      mockRepository.getContractRenewalInfo.mockRejectedValue(
        new Error('Client not found or no contract end date')
      );

      await expect(service.getContractRenewalInfo('test-client-id'))
        .rejects.toThrow('Client not found or no contract end date');
    });
  });

  describe('Onboarding Status', () => {
    it('should return onboarding status information', async () => {
      const mockStatus = {
        completionPercentage: 75,
        completedItems: 3,
        totalItems: 4,
        documentsCollected: 3,
        documentsRequired: 4,
        status: 'IN_PROGRESS',
      };

      mockRepository.getOnboardingStatus.mockResolvedValue(mockStatus);

      const status = await service.getOnboardingStatus('test-client-id');
      
      expect(status).toBeDefined();
      expect(status.completionPercentage).toBe(75);
      expect(status.status).toBe('IN_PROGRESS');
      expect(status.totalItems).toBe(4);
    });
  });

  describe('Client Dashboard Data', () => {
    it('should return comprehensive dashboard data', async () => {
      // Mock all the dependencies
      mockRepository.findById.mockResolvedValue(mockClient);
      mockRepository.getClientPerformanceMetrics.mockResolvedValue({
        serviceQualityScore: 8.5,
        paymentTimelinessScore: 9.0,
        contractComplianceScore: 8.8,
        satisfactionRating: 4.2,
        complaintsThisYear: 0,
        escalationsThisYear: 0,
        avgResponseTime: 2.5,
      });
      mockRepository.getContractRenewalInfo.mockResolvedValue({
        daysUntilExpiry: 180,
        renewalStatus: 'PENDING_REVIEW',
        notificationSent: false,
        renewalProbability: 8,
      });
      mockRepository.getOnboardingStatus.mockResolvedValue({
        completionPercentage: 100,
        completedItems: 5,
        totalItems: 5,
        documentsCollected: 4,
        documentsRequired: 4,
        status: 'COMPLETED',
      });

      const dashboard = await service.getClientDashboard('test-client-id');
      
      expect(dashboard).toBeDefined();
      expect(dashboard.client).toBeDefined();
      expect(dashboard.performanceMetrics).toBeDefined();
      expect(dashboard.renewalInfo).toBeDefined();
      expect(dashboard.onboardingStatus).toBeDefined();
    });
  });
});