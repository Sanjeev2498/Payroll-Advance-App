import { Test, TestingModule } from '@nestjs/testing';
import { PayrollService } from './payroll.service';
import { PayrollCalculationService } from './services/payroll-calculation.service';
import { PayrollPolicyService } from './services/payroll-policy.service';
import { PayrollRunManagementService } from './services/payroll-run-management.service';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from '../common/tenant-context.service';
import { BadRequestException } from '@nestjs/common';
import { PayrollStatus, AttendanceStatus, PayrollItemType } from '@prisma/client';
import { Decimal } from 'decimal.js';

describe('PayrollService', () => {
  let service: PayrollService;
  let prismaService: PrismaService;
  let tenantContextService: TenantContextService;
  let payrollCalculationService: PayrollCalculationService;
  let payrollPolicyService: PayrollPolicyService;

  const mockCompanyId = 'company-uuid';
  const mockEmployeeId = 'employee-uuid';
  const mockPayrollRunId = 'payroll-run-uuid';

  const mockAttendanceRecord = {
    id: 'attendance-uuid',
    employeeId: mockEmployeeId,
    clockIn: new Date('2024-01-01T09:00:00Z'),
    clockOut: new Date('2024-01-01T17:00:00Z'), // 8 hours
    status: AttendanceStatus.PRESENT,
    shift: {
      startTime: new Date('2024-01-01T09:00:00Z'),
      endTime: new Date('2024-01-01T17:00:00Z'),
      shiftType: 'REGULAR',
      assignment: {
        hourlyRate: new Decimal(25.00), // ₹25 per hour
      },
    },
    employee: {
      id: mockEmployeeId,
      firstName: 'John',
      lastName: 'Doe',
    },
    assignment: {
      hourlyRate: new Decimal(25.00),
    },
  };

  const mockPrismaService = {
    payrollRun: {
      create: jest.fn(),
      update: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    payrollItem: {
      createMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    attendance: {
      findMany: jest.fn(),
    },
  };

  const mockTenantContextService = {
    getTenantId: jest.fn().mockReturnValue(mockCompanyId),
  };

  const mockPayrollCalculationService = {
    calculateEmployeePayroll: jest.fn(),
  };

  const mockPayrollPolicyService = {
    getPayrollPolicy: jest.fn(),
    calculateShiftDifferential: jest.fn(),
    calculateAllowances: jest.fn(),
    calculateOvertimeHours: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PayrollService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: TenantContextService,
          useValue: mockTenantContextService,
        },
        {
          provide: PayrollCalculationService,
          useValue: mockPayrollCalculationService,
        },
        {
          provide: PayrollPolicyService,
          useValue: mockPayrollPolicyService,
        },
        {
          provide: PayrollRunManagementService,
          useValue: {
            createPayrollRunBatch: jest.fn(),
            getPayrollRuns: jest.fn(),
            approvePayrollRun: jest.fn(),
            correctPayrollRun: jest.fn(),
            exportPayrollRun: jest.fn(),
            getPayrollRunAnalytics: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<PayrollService>(PayrollService);
    prismaService = module.get<PrismaService>(PrismaService);
    tenantContextService = module.get<TenantContextService>(TenantContextService);
    payrollCalculationService = module.get<PayrollCalculationService>(PayrollCalculationService);
    payrollPolicyService = module.get<PayrollPolicyService>(PayrollPolicyService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createPayrollRun', () => {
    const createPayrollRunDto = {
      payPeriodStart: '2024-01-01',
      payPeriodEnd: '2024-01-31',
    };

    beforeEach(() => {
      // Mock no overlapping runs
      mockPrismaService.payrollRun.findFirst.mockResolvedValue(null);
      // Mock run number generation
      mockPrismaService.payrollRun.count.mockResolvedValue(0);
      // Mock payroll run creation
      mockPrismaService.payrollRun.create.mockResolvedValue({
        id: mockPayrollRunId,
        runNumber: 'PAY-2024-01-001',
        companyId: mockCompanyId,
        payPeriodStart: new Date('2024-01-01'),
        payPeriodEnd: new Date('2024-01-31'),
        status: PayrollStatus.PROCESSING,
        totalAmount: new Decimal(0),
      });
      // Mock attendance data
      mockPrismaService.attendance.findMany.mockResolvedValue([mockAttendanceRecord]);
      // Mock payroll calculation service
      mockPayrollCalculationService.calculateEmployeePayroll.mockResolvedValue({
        employeeId: mockEmployeeId,
        employeeName: 'John Doe',
        employeeNumber: 'EMP001',
        totalHours: 8,
        regularHours: 8,
        overtimeHours: 0,
        doubleOvertimeHours: 0,
        nightShiftHours: 0,
        weekendHours: 0,
        holidayHours: 0,
        basicPay: new Decimal(200.00),
        overtimePay: new Decimal(0),
        doubleOvertimePay: new Decimal(0),
        differentialPay: new Decimal(0),
        allowances: new Decimal(0),
        grossSalary: new Decimal(200.00),
        totalDeductions: new Decimal(50.00),
        netSalary: new Decimal(150.00),
        items: [
          {
            itemType: PayrollItemType.BASIC_PAY,
            description: 'Basic Pay (8 hours)',
            amount: new Decimal(200.00),
            calculationData: {
              hours: 8,
              hourlyRate: '25.00',
              calculation: '8 × 25.00',
            },
          },
        ],
      });
      // Mock payroll items creation
      mockPrismaService.payrollItem.createMany.mockResolvedValue({ count: 5 });
      // Mock payroll run update
      mockPrismaService.payrollRun.update.mockResolvedValue({
        id: mockPayrollRunId,
        status: PayrollStatus.COMPLETED,
        totalAmount: new Decimal(200.00),
      });
    });

    it('should create a payroll run successfully', async () => {
      const result = await service.createPayrollRun(createPayrollRunDto);

      expect(result.payrollRunId).toBe(mockPayrollRunId);
      expect(result.employeeCount).toBe(1);
      expect(result.totalGrossAmount).toBeInstanceOf(Decimal);
      expect(result.employeeResults).toHaveLength(1);
      
      // Verify the employee calculation
      const employeeResult = result.employeeResults[0];
      expect(employeeResult.employeeId).toBe(mockEmployeeId);
      expect(employeeResult.employeeName).toBe('John Doe');
      expect(employeeResult.totalHours).toBe(8);
      expect(employeeResult.regularHours).toBe(8);
      expect(employeeResult.overtimeHours).toBe(0);
      expect(employeeResult.basicPay).toEqual(new Decimal(200.00)); // 8 hours × ₹25
    });

    it('should handle overtime calculation correctly', async () => {
      // Mock 10-hour attendance (2 hours overtime)
      const overtimeAttendance = {
        ...mockAttendanceRecord,
        clockOut: new Date('2024-01-01T19:00:00Z'), // 10 hours total
      };
      mockPrismaService.attendance.findMany.mockResolvedValue([overtimeAttendance]);
      
      // Mock overtime calculation result
      mockPayrollCalculationService.calculateEmployeePayroll.mockResolvedValue({
        employeeId: mockEmployeeId,
        employeeName: 'John Doe',
        employeeNumber: 'EMP001',
        totalHours: 10,
        regularHours: 8,
        overtimeHours: 2,
        doubleOvertimeHours: 0,
        nightShiftHours: 0,
        weekendHours: 0,
        holidayHours: 0,
        basicPay: new Decimal(200.00),
        overtimePay: new Decimal(75.00),
        doubleOvertimePay: new Decimal(0),
        differentialPay: new Decimal(0),
        allowances: new Decimal(0),
        grossSalary: new Decimal(275.00),
        totalDeductions: new Decimal(75.00),
        netSalary: new Decimal(200.00),
        items: [
          {
            itemType: PayrollItemType.BASIC_PAY,
            description: 'Basic Pay (8 hours)',
            amount: new Decimal(200.00),
            calculationData: {
              hours: 8,
              hourlyRate: '25.00',
              calculation: '8 × 25.00',
            },
          },
          {
            itemType: PayrollItemType.OVERTIME,
            description: 'Overtime Pay (2 hours)',
            amount: new Decimal(75.00),
            calculationData: {
              hours: 2,
              hourlyRate: '25.00',
              multiplier: 1.5,
              calculation: '2 × 25.00 × 1.5',
            },
          },
        ],
      });

      const result = await service.createPayrollRun(createPayrollRunDto);
      const employeeResult = result.employeeResults[0];

      expect(employeeResult.totalHours).toBe(10);
      expect(employeeResult.regularHours).toBe(8);
      expect(employeeResult.overtimeHours).toBe(2);
      expect(employeeResult.basicPay).toEqual(new Decimal(200.00)); // 8 × ₹25
      expect(employeeResult.overtimePay).toEqual(new Decimal(75.00)); // 2 × ₹25 × 1.5
    });

    it('should validate pay period dates', async () => {
      const invalidDto = {
        payPeriodStart: '2024-01-31',
        payPeriodEnd: '2024-01-01', // End before start
      };

      await expect(service.createPayrollRun(invalidDto))
        .rejects
        .toThrow(BadRequestException);
    });

    it('should prevent overlapping payroll runs', async () => {
      // Mock existing overlapping run
      mockPrismaService.payrollRun.findFirst.mockResolvedValue({
        id: 'existing-run-id',
        runNumber: 'PAY-2024-01-000',
        payPeriodStart: new Date('2024-01-15'),
        payPeriodEnd: new Date('2024-01-31'),
      });

      await expect(service.createPayrollRun(createPayrollRunDto))
        .rejects
        .toThrow(BadRequestException);
    });

    it('should calculate Indian payroll deductions correctly', async () => {
      // Mock calculation result with deductions
      mockPayrollCalculationService.calculateEmployeePayroll.mockResolvedValue({
        employeeId: mockEmployeeId,
        employeeName: 'John Doe',
        employeeNumber: 'EMP001',
        totalHours: 8,
        regularHours: 8,
        overtimeHours: 0,
        doubleOvertimeHours: 0,
        nightShiftHours: 0,
        weekendHours: 0,
        holidayHours: 0,
        basicPay: new Decimal(200.00),
        overtimePay: new Decimal(0),
        doubleOvertimePay: new Decimal(0),
        differentialPay: new Decimal(0),
        allowances: new Decimal(0),
        grossSalary: new Decimal(200.00),
        totalDeductions: new Decimal(54.00),
        netSalary: new Decimal(146.00),
        items: [
          {
            itemType: PayrollItemType.BASIC_PAY,
            description: 'Basic Pay (8 hours)',
            amount: new Decimal(200.00),
            calculationData: {
              hours: 8,
              hourlyRate: '25.00',
              calculation: '8 × 25.00',
            },
          },
          {
            itemType: PayrollItemType.TAX_DEDUCTION,
            description: 'Income Tax (10%)',
            amount: new Decimal(-20.00),
            calculationData: {
              rate: 0.10,
              grossSalary: '200.00',
              calculation: '200.00 × 0.10',
            },
          },
          {
            itemType: PayrollItemType.SOCIAL_SECURITY,
            description: 'Provident Fund (12%)',
            amount: new Decimal(-24.00),
            calculationData: {
              rate: 0.12,
              grossSalary: '200.00',
              calculation: '200.00 × 0.12',
            },
          },
          {
            itemType: PayrollItemType.OTHER_DEDUCTION,
            description: 'Professional Tax',
            amount: new Decimal(-10.00),
            calculationData: {
              fixedAmount: 200,
              calculation: 'Fixed amount: ₹200',
            },
          },
        ],
      });
      
      const result = await service.createPayrollRun(createPayrollRunDto);
      const employeeResult = result.employeeResults[0];

      // Check that deductions are calculated
      expect(employeeResult.totalDeductions.toNumber()).toBeGreaterThan(0);
      
      // Verify payroll items include deductions
      const deductionItems = employeeResult.items.filter(item => 
        item.amount.toNumber() < 0 // Deductions are negative
      );
      
      expect(deductionItems.length).toBeGreaterThanOrEqual(3); // Tax, PF, Professional Tax at minimum
      
      // Check for specific deduction types
      const itemTypes = employeeResult.items.map(item => item.itemType);
      expect(itemTypes).toContain(PayrollItemType.TAX_DEDUCTION);
      expect(itemTypes).toContain(PayrollItemType.SOCIAL_SECURITY); // PF
      expect(itemTypes).toContain(PayrollItemType.OTHER_DEDUCTION); // Professional Tax
    });

    it('should handle rollback on calculation error', async () => {
      // Mock error during payroll item creation
      mockPrismaService.payrollItem.createMany.mockRejectedValue(new Error('Database error'));

      await expect(service.createPayrollRun(createPayrollRunDto))
        .rejects
        .toThrow('Database error');

      // Verify rollback calls
      expect(mockPrismaService.payrollRun.update).toHaveBeenCalledWith({
        where: { id: mockPayrollRunId },
        data: { status: PayrollStatus.CANCELLED },
      });
      
      expect(mockPrismaService.payrollItem.deleteMany).toHaveBeenCalledWith({
        where: { payrollRunId: mockPayrollRunId },
      });
    });
  });

  describe('getPayrollRun', () => {
    it('should retrieve payroll run with items', async () => {
      const mockPayrollRun = {
        id: mockPayrollRunId,
        runNumber: 'PAY-2024-01-001',
        companyId: mockCompanyId,
        status: PayrollStatus.COMPLETED,
        payrollItems: [
          {
            id: 'item-1',
            itemType: PayrollItemType.BASIC_PAY,
            amount: new Decimal(200.00),
            employee: {
              id: mockEmployeeId,
              firstName: 'John',
              lastName: 'Doe',
              employeeNumber: 'EMP-001',
            },
          },
        ],
      };

      mockPrismaService.payrollRun.findFirst.mockResolvedValue(mockPayrollRun);

      const result = await service.getPayrollRun(mockPayrollRunId);

      expect(result).toEqual(mockPayrollRun);
      expect(mockPrismaService.payrollRun.findFirst).toHaveBeenCalledWith({
        where: { id: mockPayrollRunId, companyId: mockCompanyId },
        include: {
          payrollItems: {
            include: {
              employee: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  employeeNumber: true,
                },
              },
            },
          },
        },
      });
    });

    it('should return null for non-existent payroll run', async () => {
      mockPrismaService.payrollRun.findFirst.mockResolvedValue(null);

      const result = await service.getPayrollRun('non-existent-id');

      expect(result).toBeNull();
    });
  });

  describe('listPayrollRuns', () => {
    it('should return paginated payroll runs', async () => {
      const mockPayrollRuns = [
        {
          id: 'run-1',
          runNumber: 'PAY-2024-01-001',
          status: PayrollStatus.COMPLETED,
          _count: { payrollItems: 5 },
        },
        {
          id: 'run-2',
          runNumber: 'PAY-2024-01-002',
          status: PayrollStatus.PROCESSING,
          _count: { payrollItems: 3 },
        },
      ];

      mockPrismaService.payrollRun.findMany.mockResolvedValue(mockPayrollRuns);
      mockPrismaService.payrollRun.count.mockResolvedValue(10);

      const result = await service.listPayrollRuns(1, 20);

      expect(result.data).toEqual(mockPayrollRuns);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 10,
        pages: 1,
      });
    });
  });
});
