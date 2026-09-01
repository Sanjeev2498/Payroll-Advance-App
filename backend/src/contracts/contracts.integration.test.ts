import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../prisma/prisma.service';
import { ContractsModule } from './contracts.module';
import { CommonModule } from '../common/common.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { ContractStatus, UserRole } from '@prisma/client';
import { TestDataUtil } from '../test/utils/test-data.util';
import { JwtService } from '@nestjs/jwt';
import { TenantContextService } from '../common/tenant-context.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

describe('ContractsController (e2e)', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let jwtService: JwtService;
  let moduleRef: TestingModule;

  const testTenantId = '123e4567-e89b-12d3-a456-426614174000';
  const testClientId = '123e4567-e89b-12d3-a456-426614174001';
  
  // Test user for authentication
  const testUser = {
    id: '123e4567-e89b-12d3-a456-426614174002',
    email: 'admin@test.com',
    role: UserRole.COMPANY_ADMIN,
    tenantId: testTenantId,
  };

  beforeEach(async () => {
    const mockTenantContextService = {
      hasContext: jest.fn().mockReturnValue(true),
      getUserId: jest.fn().mockReturnValue(testUser.id),
      getUserRole: jest.fn().mockReturnValue(testUser.role),
      getTenantId: jest.fn().mockReturnValue(testUser.tenantId),
      setContext: jest.fn(),
      clearContext: jest.fn(),
    };

    moduleRef = await Test.createTestingModule({
      imports: [
        PrismaModule,
        CommonModule,
        AuthModule,
        ContractsModule,
      ],
    })
    .overrideGuard(JwtAuthGuard)
    .useValue({
      canActivate: (context) => {
        const request = context.switchToHttp().getRequest();
        
        // Extract JWT token and validate
        const authHeader = request.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return false;
        }
        
        try {
          const token = authHeader.substring(7);
          const jwtService = moduleRef.get(JwtService);
          const payload = jwtService.verify(token);
          
          // Set up request.user for the application
          request.user = {
            id: payload.sub,
            email: payload.email,
            role: payload.role,
            companyId: payload.companyId,
            tenantId: payload.companyId,
          };
          
          // Set tenant context
          mockTenantContextService.setContext(payload.sub, payload.companyId, payload.role);
          request.tenantContext = mockTenantContextService;
          
          return true;
        } catch (error) {
          return false;
        }
      },
    })
    .overrideProvider(TenantContextService)
    .useValue(mockTenantContextService)
    .compile();

    app = moduleRef.createNestApplication();
    
    // Set up ValidationPipe to catch validation errors
    app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }));
    
    prismaService = moduleRef.get<PrismaService>(PrismaService);
    jwtService = moduleRef.get<JwtService>(JwtService);
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
    await prismaService.companies.upsert({
      where: { id: testTenantId },
      update: {},
      create: TestDataUtil.createTestCompanyData({ id: testTenantId }),
    });

    // Create test client
    await prismaService.clients.upsert({
      where: { id: testClientId },
      update: {},
      create: TestDataUtil.createTestClientData(testTenantId, { id: testClientId }),
    });
  };

  const cleanupTestData = async () => {
    await prismaService.contracts.deleteMany({
      where: {
        clients: {
          company_id: testTenantId,
        },
      },
    });

    await prismaService.clients.deleteMany({
      where: {
        company_id: testTenantId,
      },
    });

    await prismaService.companies.deleteMany({
      where: {
        id: testTenantId,
      },
    });
  };

  const createAuthToken = () => {
    // Generate proper JWT token using JwtService
    const payload = {
      sub: testUser.id,
      email: testUser.email,
      role: testUser.role,
      companyId: testUser.tenantId,
      type: 'access',
    };
    return `Bearer ${jwtService.sign(payload)}`;
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
          expect(res.body.data.title).toBe(createContractDto.title);
          expect(res.body.data.contract_number).toMatch(/^CNT-\d{4}-\d{4}$/);
          expect(res.body.data.status).toBe(ContractStatus.ACTIVE);
          expect(res.body.data.service_definitions.guardCount).toBe(3);
          expect(res.body.data.billing_preferences.billingFrequency).toBe('MONTHLY');
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
      const contract = await prismaService.contracts.create({
        data: {
          contract_number: 'CNT-2024-TEST',
          client_id: testClientId,
          title: 'Test Contract',
          status: ContractStatus.ACTIVE,
          start_date: new Date('2024-01-01'),
          service_definitions: {
            guardCount: 2,
          },
          billing_preferences: {
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
          expect(res.body.data.contracts).toBeDefined();
          expect(res.body.data.pagination).toBeDefined();
          expect(res.body.data.pagination.total).toBeGreaterThan(0);
        });
    });

    it('should filter contracts by status', () => {
      return request(app.getHttpServer())
        .get('/contracts?status=ACTIVE')
        .set('Authorization', createAuthToken())
        .expect(200)
        .expect((res) => {
          expect(res.body.data.contracts).toBeDefined();
        });
    });
  });

  describe('GET /contracts/:id', () => {
    it('should return a specific contract', async () => {
      // Create a test contract first
      const contract = await prismaService.contracts.create({
        data: {
          contract_number: 'CNT-2024-SPECIFIC',
          client_id: testClientId,
          title: 'Specific Test Contract',
          status: ContractStatus.ACTIVE,
          start_date: new Date('2024-01-01'),
          service_definitions: {
            guardCount: 2,
          },
          billing_preferences: {
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
          expect(res.body.data.id).toBe(contract.id);
          expect(res.body.data.title).toBe('Specific Test Contract');
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
      const contract = await prismaService.contracts.create({
        data: {
          contract_number: 'CNT-2024-AMENDMENT',
          client_id: testClientId,
          title: 'Amendment Test Contract',
          status: ContractStatus.ACTIVE,
          start_date: new Date('2024-01-01'),
          service_definitions: {
            guardCount: 2,
          },
          billing_preferences: {
            billingFrequency: 'MONTHLY',
            rates: { regularHourlyRate: 20 },
          },
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
          expect(res.body.data.status).toBe('IMPLEMENTED');
        });
    });
  });

  describe('SLA Compliance Tracking', () => {
    it('should create and retrieve SLA compliance reports', async () => {
      // Create a test contract first
      const contract = await prismaService.contracts.create({
        data: {
          contract_number: 'CNT-2024-SLA',
          client_id: testClientId,
          title: 'SLA Test Contract',
          status: ContractStatus.ACTIVE,
          start_date: new Date('2024-01-01'),
          service_definitions: {
            guardCount: 3,
          },
          billing_preferences: {
            billingFrequency: 'MONTHLY',
            rates: { regularHourlyRate: 25 },
          },
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
          expect(res.body.data.contractId).toBe(contract.id);
          expect(res.body.data.reports).toBeDefined();
          expect(res.body.data.aggregatedMetrics).toBeDefined();
        });
    });
  });
});