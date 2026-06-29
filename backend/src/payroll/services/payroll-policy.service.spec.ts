import { Test, TestingModule } from '@nestjs/testing';
import { PayrollPolicyService } from './payroll-policy.service';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantContextService } from '../../common/tenant-context.service';
import { Decimal } from '@prisma/client/runtime/library';

describe('PayrollPolicyService', () => {
  let service: PayrollPolicyService;

  const mockPrismaService = {
    // Add any prisma mocks as needed
  };

  const mockTenantContextService = {
    getTenantId: jest.fn().mockReturnValue('company-uuid'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PayrollPolicyService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: TenantContextService,
          useValue: mockTenantContextService,
        },
      ],
    }).compile();

    service = module.get<PayrollPolicyService>(PayrollPolicyService);
  });

  describe('getPayrollPolicy', () => {
    it('should return default Indian payroll policy', async () => {
      const policy = await service.getPayrollPolicy();

      expect(policy.overtimeThreshold).toBe(8);
      expect(policy.overtimeMultiplier).toBe(1.5);
      expect(policy.doubleOvertimeThreshold).toBe(12);
      expect(policy.doubleOvertimeMultiplier).toBe(2.0);
      expect(policy.taxRate).toBe(0.10);
      expect(policy.providentFundRate).toBe(0.12);
      expect(policy.esicRate).toBe(0.0175);
      expect(policy.professionalTax).toBe(200);
      expect(policy.minimumWage).toBe(176);
      expect(policy.esicThreshold).toBe(21000);
      expect(policy.pfThreshold).toBe(15000);
    });

    it('should include allowances configuration', async () => {
      const policy = await service.getPayrollPolicy();

      expect(policy.allowances.hra).toBe(0.40);
      expect(policy.allowances.transport).toBe(1600);
      expect(policy.allowances.medical).toBe(1250);
    });

    it('should include shift differentials', async () => {
      const policy = await service.getPayrollPolicy();

      expect(policy.shiftDifferentials.night).toBe(0.10);
      expect(policy.shiftDifferentials.weekend).toBe(0.15);
      expect(policy.shiftDifferentials.holiday).toBe(0.25);
    });
  });

  describe('calculateShiftDifferential', () => {
    it('should calculate night shift differential', () => {
      const policy = {
        shiftDifferentials: { night: 0.10, weekend: 0.15, holiday: 0.25 }
      } as any;

      // Create times with proper hours (not UTC which might shift the hours)
      const startTime = new Date(2024, 0, 1, 22, 0, 0); // 10 PM local time
      const endTime = new Date(2024, 0, 2, 6, 0, 0); // 6 AM next day local time
      const shiftDate = new Date(2024, 0, 1); // January 1st
      
      const differential = service.calculateShiftDifferential(
        startTime, endTime, shiftDate, 'REGULAR', policy
      );

      expect(differential).toBe(0.10);
    });

    it('should calculate weekend differential', () => {
      const policy = {
        shiftDifferentials: { night: 0.10, weekend: 0.15, holiday: 0.25 }
      } as any;

      // Saturday morning and evening
      const startTime = new Date(2024, 0, 6, 9, 0, 0); // Saturday morning
      const endTime = new Date(2024, 0, 6, 17, 0, 0); // Saturday evening
      const shiftDate = new Date(2024, 0, 6); // Saturday
      
      const differential = service.calculateShiftDifferential(
        startTime, endTime, shiftDate, 'REGULAR', policy
      );

      expect(differential).toBe(0.15);
    });

    it('should calculate holiday differential', () => {
      const policy = {
        shiftDifferentials: { night: 0.10, weekend: 0.15, holiday: 0.25 }
      } as any;

      const startTime = new Date(2024, 0, 26, 9, 0, 0); // Republic Day morning
      const endTime = new Date(2024, 0, 26, 17, 0, 0); // Republic Day evening
      const shiftDate = new Date(2024, 0, 26); // Republic Day
      
      const differential = service.calculateShiftDifferential(
        startTime, endTime, shiftDate, 'HOLIDAY', policy
      );

      expect(differential).toBe(0.25);
    });

    it('should combine multiple differentials', () => {
      const policy = {
        shiftDifferentials: { night: 0.10, weekend: 0.15, holiday: 0.25 }
      } as any;

      const startTime = new Date(2024, 0, 7, 22, 0, 0); // Sunday night (10 PM)
      const endTime = new Date(2024, 0, 8, 6, 0, 0); // Monday morning (6 AM)
      const shiftDate = new Date(2024, 0, 7); // Sunday
      
      const differential = service.calculateShiftDifferential(
        startTime, endTime, shiftDate, 'REGULAR', policy
      );

      expect(differential).toBe(0.25); // Night (0.10) + Weekend (0.15)
    });
  });

  describe('calculateAllowances', () => {
    it('should calculate HRA based on basic salary', () => {
      const basicSalary = new Decimal(10000);
      const policy = {
        allowances: { hra: 0.40, transport: 1600, medical: 1250 }
      } as any;

      const allowances = service.calculateAllowances(basicSalary, policy);

      expect(allowances.hra).toEqual(new Decimal(4000)); // 40% of 10000
      expect(allowances.transport).toEqual(new Decimal(1600));
      expect(allowances.medical).toEqual(new Decimal(1250));
      expect(allowances.totalAllowances).toEqual(new Decimal(6850));
    });

    it('should handle zero allowances', () => {
      const basicSalary = new Decimal(10000);
      const policy = { allowances: {} } as any;

      const allowances = service.calculateAllowances(basicSalary, policy);

      expect(allowances.hra).toEqual(new Decimal(0));
      expect(allowances.transport).toEqual(new Decimal(0));
      expect(allowances.medical).toEqual(new Decimal(0));
      expect(allowances.totalAllowances).toEqual(new Decimal(0));
    });
  });

  describe('calculateOvertimeHours', () => {
    it('should calculate regular overtime only', () => {
      const policy = {
        overtimeThreshold: 8,
        doubleOvertimeThreshold: 12,
      } as any;

      const result = service.calculateOvertimeHours(10, policy);

      expect(result.regularHours).toBe(8);
      expect(result.overtimeHours).toBe(2);
      expect(result.doubleOvertimeHours).toBe(0);
    });

    it('should calculate double overtime', () => {
      const policy = {
        overtimeThreshold: 8,
        doubleOvertimeThreshold: 12,
      } as any;

      const result = service.calculateOvertimeHours(14, policy);

      expect(result.regularHours).toBe(8);
      expect(result.overtimeHours).toBe(4); // 8-12 hours
      expect(result.doubleOvertimeHours).toBe(2); // 12-14 hours
    });

    it('should handle no overtime', () => {
      const policy = {
        overtimeThreshold: 8,
        doubleOvertimeThreshold: 12,
      } as any;

      const result = service.calculateOvertimeHours(6, policy);

      expect(result.regularHours).toBe(6);
      expect(result.overtimeHours).toBe(0);
      expect(result.doubleOvertimeHours).toBe(0);
    });

    it('should handle no double overtime threshold', () => {
      const policy = {
        overtimeThreshold: 8,
        // No doubleOvertimeThreshold
      } as any;

      const result = service.calculateOvertimeHours(12, policy);

      expect(result.regularHours).toBe(8);
      expect(result.overtimeHours).toBe(4);
      expect(result.doubleOvertimeHours).toBe(0);
    });
  });
});