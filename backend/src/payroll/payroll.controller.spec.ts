import { Test, TestingModule } from '@nestjs/testing';
import { PayrollController } from './payroll.controller';
import { PayrollService } from './payroll.service';
import { NotFoundException } from '@nestjs/common';
import { PayrollStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

// Mock all guards
jest.mock('../auth/guards/jwt-auth.guard');
jest.mock('../auth/guards/permissions.guard');
jest.mock('../common/tenant.guard');

describe('PayrollController', () => {
  let controller: PayrollController;
  let payrollService: PayrollService;

  const mockPayrollSummary = {
    payrollRunId: 'run-uuid',
    employeeCount: 5,
    totalGrossAmount: new Decimal(10000),
    totalDeductions: new Decimal(2000),
    totalNetAmount: new Decimal(8000),
    employeeResults: [],
  };

  const mockPayrollRun = {
    id: 'run-uuid',
    runNumber: 'PAY-2024-01-001',
    companyId: 'company-uuid',
    status: PayrollStatus.COMPLETED,
    payPeriodStart: new Date('2024-01-01'),
    payPeriodEnd: new Date('2024-01-31'),
    totalAmount: new Decimal(10000),
    processedAt: new Date(),
    payrollItems: [],
  };

  const mockPayrollService = {
    createPayrollRun: jest.fn(),
    getPayrollRun: jest.fn(),
    listPayrollRuns: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PayrollController],
      providers: [
        {
          provide: PayrollService,
          useValue: mockPayrollService,
        },
      ],
    }).compile();

    controller = module.get<PayrollController>(PayrollController);
    payrollService = module.get<PayrollService>(PayrollService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createPayrollRun', () => {
    const createPayrollRunDto = {
      payPeriodStart: '2024-01-01',
      payPeriodEnd: '2024-01-31',
    };

    it('should create a payroll run successfully', async () => {
      mockPayrollService.createPayrollRun.mockResolvedValue(mockPayrollSummary);

      const result = await controller.createPayrollRun(createPayrollRunDto);

      expect(result).toEqual({
        success: true,
        data: mockPayrollSummary,
      });
      expect(payrollService.createPayrollRun).toHaveBeenCalledWith(createPayrollRunDto);
    });

    it('should pass through service errors', async () => {
      const error = new Error('Validation failed');
      mockPayrollService.createPayrollRun.mockRejectedValue(error);

      await expect(controller.createPayrollRun(createPayrollRunDto))
        .rejects
        .toThrow(error);
    });
  });

  describe('listPayrollRuns', () => {
    it('should list payroll runs with default pagination', async () => {
      const mockResult = {
        data: [mockPayrollRun],
        pagination: {
          page: 1,
          limit: 20,
          total: 1,
          pages: 1,
        },
      };
      mockPayrollService.listPayrollRuns.mockResolvedValue(mockResult);

      const result = await controller.listPayrollRuns();

      expect(result).toEqual({
        success: true,
        data: mockResult.data,
        pagination: mockResult.pagination,
      });
      expect(payrollService.listPayrollRuns).toHaveBeenCalledWith(1, 20);
    });

    it('should list payroll runs with custom pagination', async () => {
      const mockResult = {
        data: [mockPayrollRun],
        pagination: {
          page: 2,
          limit: 10,
          total: 15,
          pages: 2,
        },
      };
      mockPayrollService.listPayrollRuns.mockResolvedValue(mockResult);

      const result = await controller.listPayrollRuns(2, 10);

      expect(result).toEqual({
        success: true,
        data: mockResult.data,
        pagination: mockResult.pagination,
      });
      expect(payrollService.listPayrollRuns).toHaveBeenCalledWith(2, 10);
    });
  });

  describe('getPayrollRun', () => {
    const payrollRunId = 'run-uuid';

    it('should get payroll run by ID', async () => {
      mockPayrollService.getPayrollRun.mockResolvedValue(mockPayrollRun);

      const result = await controller.getPayrollRun(payrollRunId);

      expect(result).toEqual({
        success: true,
        data: mockPayrollRun,
      });
      expect(payrollService.getPayrollRun).toHaveBeenCalledWith(payrollRunId);
    });

    it('should throw NotFoundException for non-existent payroll run', async () => {
      mockPayrollService.getPayrollRun.mockResolvedValue(null);

      await expect(controller.getPayrollRun(payrollRunId))
        .rejects
        .toThrow(NotFoundException);
    });
  });

  describe('getPayrollRunSummary', () => {
    const payrollRunId = 'run-uuid';

    it('should get payroll run summary', async () => {
      const mockPayrollRunWithItems = {
        ...mockPayrollRun,
        payrollItems: [
          {
            itemType: 'BASIC_PAY',
            amount: new Decimal(8000),
            employeeId: 'emp-1',
          },
          {
            itemType: 'OVERTIME',
            amount: new Decimal(1000),
            employeeId: 'emp-1',
          },
          {
            itemType: 'TAX_DEDUCTION',
            amount: new Decimal(-1000),
            employeeId: 'emp-1',
          },
        ],
      };
      mockPayrollService.getPayrollRun.mockResolvedValue(mockPayrollRunWithItems);

      const result = await controller.getPayrollRunSummary(payrollRunId);

      expect(result.success).toBe(true);
      expect(result.data.payrollRunId).toBe(payrollRunId);
      expect(result.data.runNumber).toBe('PAY-2024-01-001');
      expect(result.data.employeeCount).toBe(1); // Unique employee count
      expect(result.data.itemBreakdown).toHaveProperty('basicPay');
      expect(result.data.itemBreakdown).toHaveProperty('overtime');
      expect(result.data.itemBreakdown).toHaveProperty('taxDeductions');
    });

    it('should throw NotFoundException for non-existent payroll run', async () => {
      mockPayrollService.getPayrollRun.mockResolvedValue(null);

      await expect(controller.getPayrollRunSummary(payrollRunId))
        .rejects
        .toThrow(NotFoundException);
    });
  });

  describe('getEmployeePayrollHistory', () => {
    const employeeId = 'employee-uuid';

    it('should get employee payroll history', async () => {
      const result = await controller.getEmployeePayrollHistory(employeeId);

      expect(result).toEqual({
        success: true,
        data: {
          employeeId,
          payrollHistory: [],
          totalEarnings: 0,
          totalDeductions: 0,
        },
      });
    });

    it('should accept custom limit parameter', async () => {
      const result = await controller.getEmployeePayrollHistory(employeeId, 6);

      expect(result.success).toBe(true);
      expect(result.data.employeeId).toBe(employeeId);
    });
  });

  describe('calculateItemBreakdown', () => {
    it('should calculate breakdown correctly', () => {
      const payrollItems = [
        { itemType: 'BASIC_PAY', amount: new Decimal(5000) },
        { itemType: 'OVERTIME', amount: new Decimal(1500) },
        { itemType: 'BONUS', amount: new Decimal(500) },
        { itemType: 'TAX_DEDUCTION', amount: new Decimal(-650) },
        { itemType: 'SOCIAL_SECURITY', amount: new Decimal(-780) },
        { itemType: 'OTHER_DEDUCTION', amount: new Decimal(-200) },
      ];

      // Access the private method through type assertion
      const breakdown = (controller as any).calculateItemBreakdown(payrollItems);

      expect(breakdown.basicPay).toBe(5000);
      expect(breakdown.overtime).toBe(1500);
      expect(breakdown.bonuses).toBe(500);
      expect(breakdown.taxDeductions).toBe(650); // Absolute value
      expect(breakdown.socialSecurity).toBe(780); // Absolute value
      expect(breakdown.otherDeductions).toBe(200); // Absolute value
    });
  });
});