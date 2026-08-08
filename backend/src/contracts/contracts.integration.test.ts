import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../prisma/prisma.service';
import { ContractsModule } from './contracts.module';
import { CommonModule } from '../common/common.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { ContractStatus } from '@prisma/client';

describe('ContractsController (e2e)', () => {
  let app: INestApplication;
  let prismaService: PrismaService;

  const testTenantId = '123e4567-e89b-12d3-a456-426614174000';
  const testClientId = '123e4567-e89b-12d3-a456-426614174001';

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        PrismaModule,
        CommonModule,
        AuthModule,
        ContractsModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    prismaService = moduleFixture.get<PrismaService>(PrismaService);
    await app.init();

    // Setup test data
    await setupTestData();
  });

  afterEach(async () => {
    await cleanupTestData();
    await app.close();
  });

  const setupTestData = async () => {
    // Create test company
    await prismaService.company.upsert({
      where: { id: testTenantId },
      update: {},
      create: {
        id: testTenantId,
        name: 'Test Company',
        slug: 'test-company',
      },
    });

    // Create test client
    await prismaService.client.upsert({
      where: { id: testClientId },
      update: {},
      create: {
        id: testClientId,
        companyId: testTenantId,
        name: 'Test Client',
        contactEmail: 'test@client.com',
        contactInfo: { phone: '555-0123' },
      },
    });
  };

  const cleanupTestData = async () => {
    await prismaService.contract.deleteMany({
      where: {
        client: {
          companyId: testTenantId,
        },
      },
    });

    await prismaService.client.deleteMany({
      where: {
        companyId: testTenantId,
      },
    });

    await prismaService.company.deleteMany({
      where: {
        id: testTenantId,
      },
    });
  };

  const createAuthToken = () => {
    // Mock JWT token for testing - in real implementation this would be generated properly
    return 'Bearer mock-jwt-token';
  };

  describe('POST /contracts', () => {
    it('should create a new contract', () => {
      const createContractDto = {
        clientId: testClientId,
        title: 'Test Security Services Contract',
        description: 'Comprehensive security services for the facility',
        status: ContractStatus.ACTIVE,
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        serviceDefinitions: {
          guardCount: 3,
          minStaffingLevel: 2,
          maxStaffingLevel: 5,
          shiftPatterns: {
            day: {
              startTime: '08:00',
              endTime: '16:00',
              duration: 8,
              breakTime: 1,
            },
            night: {
              startTime: '20:00',
              endTime: '08:00',
              duration: 12,
              breakTime: 2,
            },
          },
          supervisorRequirements: {
            required: true,
            ratio: 10,
            qualifications: ['Security License', 'First Aid'],
          },
          coverageSpecifications: {
            coverage24x7: true,
            weekendCoverage: true,
            holidayCoverage: true,
            emergencyResponse: true,
            responseTimeMinutes: 15,
          },
          requiredSkills: ['Security License', 'CCTV Operation', 'Access Control'],
        },
        billingConfiguration: {
          billingFrequency: 'MONTHLY',
          rates: {
            regularHourlyRate: 25.00,
            overtimeHourlyRate: 37.50,
            holidayHourlyRate: 50.00,
            weekendHourlyRate: 30.00,
            currency: 'INR',
          },
          paymentTerms: 30,
          autoInvoiceGeneration: true,
          taxRate: 8.25,
        },
        serviceLevelAgreement: {
          responseTimeSLA: 15,
          coverageTarget: 99.5,
          attendanceAccuracyTarget: 98.0,
          qualityMetrics: {
            customerSatisfactionTarget: 95,
            incidentResponseTime: 10,
            trainingCompletionRate: 100,
          },
          reportingFrequency: 'MONTHLY',
        },
        contractValue: 500000,
        renewalNotificationDays: 90,
        autoRenewalEnabled: false,
      };

      return request(app.getHttpServer())
        .post('/contracts')
        .set('Authorization', createAuthToken())
        .send(createContractDto)
        .expect(201)
        .expect((res) => {
          expect(res.body.title).toBe(createContractDto.title);
          expect(res.body.contractNumber).toMatch(/^CNT-\d{4}-\d{4}$/);
          expect(res.body.status).toBe(ContractStatus.ACTIVE);
          expect(res.body.serviceDefinitions.guardCount).toBe(3);
          expect(res.body.billingPreferences.billingFrequency).toBe('MONTHLY');
        });
    });

    it('should return validation error for invalid contract data', () => {
      const invalidContractDto = {
        clientId: 'invalid-uuid',
        title: '', // Empty title should fail validation
        status: 'INVALID_STATUS',
      };

      return request(app.getHttpServer())
        .post('/contracts')
        .set('Authorization', createAuthToken())
        .send(invalidContractDto)
        .expect(400);
    });
  });

  describe('GET /contracts', () => {
    it('should return paginated contracts', async () => {
      // Create a test contract first
      const contract = await prismaService.contract.create({
        data: {
          contractNumber: 'CNT-2024-TEST',
          clientId: testClientId,
          title: 'Test Contract',
          status: ContractStatus.ACTIVE,
          startDate: new Date('2024-01-01'),
          serviceDefinitions: {
            guardCount: 2,
          },
          billingPreferences: {
            billingFrequency: 'MONTHLY',
            rates: { regularHourlyRate: 20 },
          },
        },
      });

      return request(app.getHttpServer())
        .get('/contracts')
        .set('Authorization', createAuthToken())
        .expect(200)
        .expect((res) => {
          expect(res.body.contracts).toBeDefined();
          expect(res.body.pagination).toBeDefined();
          expect(res.body.pagination.total).toBeGreaterThan(0);
        });
    });

    it('should filter contracts by status', () => {
      return request(app.getHttpServer())
        .get('/contracts?status=ACTIVE')
        .set('Authorization', createAuthToken())
        .expect(200)
        .expect((res) => {
          expect(res.body.contracts).toBeDefined();
        });
    });
  });

  describe('GET /contracts/:id', () => {
    it('should return a specific contract', async () => {
      // Create a test contract first
      const contract = await prismaService.contract.create({
        data: {
          contractNumber: 'CNT-2024-SPECIFIC',
          clientId: testClientId,
          title: 'Specific Test Contract',
          status: ContractStatus.ACTIVE,
          startDate: new Date('2024-01-01'),
          serviceDefinitions: {
            guardCount: 2,
          },
          billingPreferences: {
            billingFrequency: 'MONTHLY',
            rates: { regularHourlyRate: 20 },
          },
        },
      });

      return request(app.getHttpServer())
        .get(`/contracts/${contract.id}`)
        .set('Authorization', createAuthToken())
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(contract.id);
          expect(res.body.title).toBe('Specific Test Contract');
        });
    });

    it('should return 404 for non-existent contract', () => {
      const nonExistentId = '123e4567-e89b-12d3-a456-000000000000';
      
      return request(app.getHttpServer())
        .get(`/contracts/${nonExistentId}`)
        .set('Authorization', createAuthToken())
        .expect(404);
    });
  });

  describe('Contract Amendment Workflow', () => {
    it('should create and approve a contract amendment', async () => {
      // Create a test contract first
      const contract = await prismaService.contract.create({
        data: {
          contractNumber: 'CNT-2024-AMENDMENT',
          clientId: testClientId,
          title: 'Amendment Test Contract',
          status: ContractStatus.ACTIVE,
          startDate: new Date('2024-01-01'),
          serviceDefinitions: {
            guardCount: 2,
          },
          billingPreferences: {
            billingFrequency: 'MONTHLY',
            rates: { regularHourlyRate: 20 },
          },
          contractHistory: {},
        },
      });

      // Create amendment
      const amendmentDto = {
        type: 'RATE_CHANGE',
        title: 'Rate Increase Amendment',
        description: 'Annual rate increase to reflect market conditions',
        effectiveDate: '2024-07-01',
        changes: [
          {
            field: 'billingRates.regularHourlyRate',
            previousValue: 20.00,
            newValue: 22.00,
            reason: 'Market rate adjustment',
          },
        ],
        justification: 'Annual cost of living adjustment',
        financialImpact: {
          estimatedAnnualChange: 24000,
          currency: 'INR',
        },
      };

      const amendmentResponse = await request(app.getHttpServer())
        .post(`/contracts/${contract.id}/amendments`)
        .set('Authorization', createAuthToken())
        .send(amendmentDto)
        .expect(201);

      const amendmentId = amendmentResponse.body.id;

      // Approve amendment
      const approvalDto = {
        approved: true,
        comments: 'Approved for market rate alignment',
      };

      return request(app.getHttpServer())
        .patch(`/contracts/${contract.id}/amendments/${amendmentId}/approve`)
        .set('Authorization', createAuthToken())
        .send(approvalDto)
        .expect(200)
        .expect((res) => {
          expect(res.body.status).toBe('IMPLEMENTED');
        });
    });
  });

  describe('SLA Compliance Tracking', () => {
    it('should create and retrieve SLA compliance reports', async () => {
      // Create a test contract first
      const contract = await prismaService.contract.create({
        data: {
          contractNumber: 'CNT-2024-SLA',
          clientId: testClientId,
          title: 'SLA Test Contract',
          status: ContractStatus.ACTIVE,
          startDate: new Date('2024-01-01'),
          serviceDefinitions: {
            guardCount: 3,
          },
          billingPreferences: {
            billingFrequency: 'MONTHLY',
            rates: { regularHourlyRate: 25 },
          },
          contractHistory: {},
        },
      });

      // Create SLA compliance report
      const slaReportDto = {
        periodStart: '2024-01-01',
        periodEnd: '2024-01-31',
        overallStatus: 'COMPLIANT',
        compliancePercentage: 98.5,
        metrics: [
          {
            name: 'Response Time',
            target: 15,
            actual: 12,
            unit: 'minutes',
            status: 'COMPLIANT',
            variance: -3,
          },
          {
            name: 'Coverage Percentage',
            target: 99.5,
            actual: 99.8,
            unit: 'percentage',
            status: 'COMPLIANT',
            variance: 0.3,
          },
        ],
        performanceSummary: 'Excellent performance across all metrics',
        recommendations: [
          'Continue current training programs',
          'Monitor weekend coverage closely',
        ],
      };

      const reportResponse = await request(app.getHttpServer())
        .post(`/contracts/${contract.id}/sla-reports`)
        .set('Authorization', createAuthToken())
        .send(slaReportDto)
        .expect(201);

      // Retrieve SLA compliance data
      return request(app.getHttpServer())
        .get(`/contracts/${contract.id}/sla-compliance`)
        .set('Authorization', createAuthToken())
        .expect(200)
        .expect((res) => {
          expect(res.body.contractId).toBe(contract.id);
          expect(res.body.reports).toBeDefined();
          expect(res.body.aggregatedMetrics).toBeDefined();
        });
    });
  });
});