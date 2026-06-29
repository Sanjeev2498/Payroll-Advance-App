import * as fc from 'fast-check';
import { Test, TestingModule } from '@nestjs/testing';
import { PayrollCalculationService } from './payroll-calculation.service';
import { PayrollPolicyService, PayrollPolicy } from './payroll-policy.service';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantContextService } from '../../common/tenant-context.service';
import { AttendanceStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * Property-Based Tests for Payroll Calculation Service
 * 
 * **Property 10: Payroll Calculation Correctness**
 * **Validates: Requirements 8.1**
 * 
 * **Property 11: Complex Payroll Component Accuracy**
 * **Validates: Requirements 8.2**
 */

describe('PayrollCalculationService - Property Tests', () => {
  let service: PayrollCalculationService;
  let policyService: PayrollPolicyService;
  let testingModule: TestingModule;

  const mockPrismaService = {};
  const mockTenantContextService = {
    getTenantId: () => 'test-tenant-id',
  };

  beforeAll(async () => {
    testingModule = await Test.createTestingModule({
      providers: [
        PayrollCalculationService,
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

    service = testingModule.get<PayrollCalculationService>(PayrollCalculationService);
    policyService = testingModule.get<PayrollPolicyService>(PayrollPolicyService);
  });

  afterAll(async () => {
    await testingModule?.close();
  });

  // Custom generators for test data
  const employeeGenerator = () => fc.record({
    id: fc.uuid(),
    firstName: fc.string({ minLength: 1, maxLength: 50 }),
    lastName: fc.string({ minLength: 1, maxLength: 50 }),
    employeeNumber: fc.string({ minLength: 1, maxLength: 20 }),
  });
  const hourlyRateGenerator = () => fc.float({ min: 15.0, max: 100.0, noNaN: true });

  const attendanceRecordGenerator = (employee: any, hourlyRate: number) => {
    return fc.record({
      id: fc.uuid(),
      employeeId: fc.constant(employee.id),
      baseDate: fc.date({ min: new Date('2024-01-01'), max: new Date('2024-06-30') }),
      workHours: fc.float({ min: 1, max: 16, noNaN: true }),
      shiftType: fc.constantFrom('REGULAR', 'OVERTIME', 'NIGHT', 'HOLIDAY'),
      status: fc.constantFrom(AttendanceStatus.PRESENT),
      employee: fc.constant(employee),
    }).map(record => {
      // Create valid clock in/out times
      const clockIn = new Date(record.baseDate);
      clockIn.setHours(9, 0, 0, 0); // Start at 9 AM
      
      const clockOut = new Date(clockIn.getTime() + record.workHours * 60 * 60 * 1000);
      
      return {
        id: record.id,
        employeeId: record.employeeId,
        clockIn,
        clockOut,
        status: record.status,
        shift: {
          id: fc.sample(fc.uuid(), 1)[0],
          startTime: clockIn,
          endTime: clockOut,
          shiftType: record.shiftType,
          shiftDate: new Date(record.baseDate),
          assignment: {
            hourlyRate: new Decimal(hourlyRate),
          },
        },
        employee: record.employee,
      };
    });
  };

  const validAttendanceRecordsGenerator = () => {
    return fc.tuple(employeeGenerator(), hourlyRateGenerator()).chain(([employee, hourlyRate]) => {
      return fc.array(attendanceRecordGenerator(employee, hourlyRate), { minLength: 1, maxLength: 10 })
        .filter(records => 
          records.length > 0 && 
          records.every(r => 
            r.clockIn && r.clockOut && 
            !isNaN(r.clockIn.getTime()) && !isNaN(r.clockOut.getTime()) &&
            r.clockOut.getTime() > r.clockIn.getTime()
          )
        )
        .map(records => ({ employee, hourlyRate, records }));
    });
  };
  /**
   * **Property 10: Payroll Calculation Correctness**
   * **Validates: Requirements 8.1**
   * 
   * For any payroll calculation with valid attendance data and rates, 
   * the system SHALL produce mathematically accurate salary calculations
   * that properly account for all attendance records, rates, and policies.
   */
  describe('Property 10: Payroll Calculation Correctness', () => {
    it('should maintain mathematical consistency in basic pay calculations', async () => {
      await fc.assert(
        fc.asyncProperty(
          validAttendanceRecordsGenerator(),
          async ({ employee, hourlyRate, records }) => {
            // Precondition: Ensure we have valid data
            fc.pre(records.length > 0);
            fc.pre(records.every(r => r.clockIn && r.clockOut && !isNaN(r.clockIn.getTime()) && !isNaN(r.clockOut.getTime())));
            fc.pre(hourlyRate > 0 && !isNaN(hourlyRate));

            // Setup
            const policy = await policyService.getPayrollPolicy();
            const payrollRunId = fc.sample(fc.uuid(), 1)[0];

            // Execute
            const result = await service.calculateEmployeePayroll(
              payrollRunId,
              employee.id,
              records
            );

            // Property: Basic pay should equal regular hours * hourly rate
            const expectedBasicPay = new Decimal(hourlyRate).mul(result.regularHours);
            const actualBasicPay = result.basicPay;

            // Verify mathematical accuracy (within decimal precision)
            const difference = actualBasicPay.sub(expectedBasicPay).abs();
            expect(difference.lt(new Decimal(0.01))).toBe(true);
          }
        ),
        { numRuns: 50, timeout: 10000 }
      );
    });

    it('should ensure overtime calculations follow policy multipliers exactly', async () => {
      await fc.assert(
        fc.asyncProperty(
          validAttendanceRecordsGenerator(),
          async ({ employee, hourlyRate, records }) => {
            // Setup
            const policy = await policyService.getPayrollPolicy();
            const payrollRunId = fc.sample(fc.uuid(), 1)[0];

            // Execute
            const result = await service.calculateEmployeePayroll(
              payrollRunId,
              employee.id,
              records
            );

            // Property: Overtime pay should equal overtime hours * hourly rate * overtime multiplier
            if (result.overtimeHours > 0) {
              const expectedOvertimePay = new Decimal(hourlyRate)
                .mul(policy.overtimeMultiplier)
                .mul(result.overtimeHours);
              
              const difference = result.overtimePay.sub(expectedOvertimePay).abs();
              expect(difference.lt(new Decimal(0.01))).toBe(true);
            }
          }
        ),
        { numRuns: 100, timeout: 10000 }
      );
    });
    it('should maintain total hours calculation accuracy', async () => {
      await fc.assert(
        fc.asyncProperty(
          validAttendanceRecordsGenerator(),
          async ({ employee, hourlyRate, records }) => {
            // Precondition: Ensure we have valid data
            fc.pre(records.length > 0);
            fc.pre(records.every(r => r.clockIn && r.clockOut && !isNaN(r.clockIn.getTime()) && !isNaN(r.clockOut.getTime())));

            // Setup
            const payrollRunId = fc.sample(fc.uuid(), 1)[0];

            // Execute
            const result = await service.calculateEmployeePayroll(
              payrollRunId,
              employee.id,
              records
            );

            // Property: Total hours should equal sum of regular + overtime + double overtime hours
            const calculatedTotal = result.regularHours + result.overtimeHours + result.doubleOvertimeHours;
            const difference = Math.abs(result.totalHours - calculatedTotal);
            
            // Verify all values are valid numbers
            expect(isNaN(result.totalHours)).toBe(false);
            expect(isNaN(calculatedTotal)).toBe(false);
            
            // Allow small floating point differences (0.01 hour = 36 seconds)
            expect(difference).toBeLessThan(0.01);
          }
        ),
        { numRuns: 50, timeout: 10000 }
      );
    });

    it('should ensure gross salary includes all pay components accurately', async () => {
      await fc.assert(
        fc.asyncProperty(
          validAttendanceRecordsGenerator(),
          async ({ employee, hourlyRate, records }) => {
            // Precondition: Ensure we have valid data
            fc.pre(records.length > 0);
            fc.pre(records.every(r => r.clockIn && r.clockOut && !isNaN(r.clockIn.getTime()) && !isNaN(r.clockOut.getTime())));

            // Setup
            const payrollRunId = fc.sample(fc.uuid(), 1)[0];

            // Execute
            const result = await service.calculateEmployeePayroll(
              payrollRunId,
              employee.id,
              records
            );

            // Property: Gross salary should equal sum of all earning components
            const expectedGross = result.basicPay
              .add(result.overtimePay)
              .add(result.doubleOvertimePay)
              .add(result.differentialPay)
              .add(result.allowances);

            const difference = result.grossSalary.sub(expectedGross).abs();
            expect(difference.lt(new Decimal(0.01))).toBe(true);
          }
        ),
        { numRuns: 50, timeout: 10000 }
      );
    });

    it('should ensure net salary calculation is mathematically correct', async () => {
      await fc.assert(
        fc.asyncProperty(
          validAttendanceRecordsGenerator(),
          async ({ employee, hourlyRate, records }) => {
            // Precondition: Ensure we have valid data
            fc.pre(records.length > 0);
            fc.pre(records.every(r => r.clockIn && r.clockOut && !isNaN(r.clockIn.getTime()) && !isNaN(r.clockOut.getTime())));

            // Setup
            const payrollRunId = fc.sample(fc.uuid(), 1)[0];

            // Execute
            const result = await service.calculateEmployeePayroll(
              payrollRunId,
              employee.id,
              records
            );

            // Property: Net salary should equal gross salary minus total deductions
            const expectedNet = result.grossSalary.sub(result.totalDeductions);
            const difference = result.netSalary.sub(expectedNet).abs();
            
            expect(difference.lt(new Decimal(0.01))).toBe(true);
          }
        ),
        { numRuns: 50, timeout: 10000 }
      );
    });
  });

  /**
   * **Property 11: Complex Payroll Component Accuracy**  
   * **Validates: Requirements 8.2**
   * 
   * For any payroll calculation involving multiple compensation components
   * (overtime, bonuses, deductions, taxes), the system SHALL compute 
   * each component correctly and maintain mathematical consistency.
   */
  describe('Property 11: Complex Payroll Component Accuracy', () => {
    it('should calculate Indian statutory deductions with correct rates', async () => {
      await fc.assert(
        fc.asyncProperty(
          validAttendanceRecordsGenerator(),
          async ({ employee, hourlyRate, records }) => {
            // Precondition: Ensure we have valid data
            fc.pre(records.length > 0);
            fc.pre(records.every(r => r.clockIn && r.clockOut && !isNaN(r.clockIn.getTime()) && !isNaN(r.clockOut.getTime())));

            // Setup
            const policy = await policyService.getPayrollPolicy();
            const payrollRunId = fc.sample(fc.uuid(), 1)[0];

            // Execute
            const result = await service.calculateEmployeePayroll(
              payrollRunId,
              employee.id,
              records
            );

            // Property: Tax deduction should equal gross salary * tax rate
            const expectedTax = result.grossSalary.mul(policy.taxRate);
            
            // Find tax deduction in items
            const taxItem = result.items.find(item => 
              item.itemType === 'TAX_DEDUCTION'
            );
            
            expect(taxItem).toBeDefined();
            const actualTax = taxItem!.amount.abs();
            const taxDifference = actualTax.sub(expectedTax).abs();
            
            expect(taxDifference.lt(new Decimal(0.01))).toBe(true);
          }
        ),
        { numRuns: 50, timeout: 10000 }
      );
    });

    it('should calculate provident fund with correct threshold handling', async () => {
      await fc.assert(
        fc.asyncProperty(
          validAttendanceRecordsGenerator(),
          async ({ employee, hourlyRate, records }) => {
            // Precondition: Ensure we have valid data
            fc.pre(records.length > 0);
            fc.pre(records.every(r => r.clockIn && r.clockOut && !isNaN(r.clockIn.getTime()) && !isNaN(r.clockOut.getTime())));

            // Setup
            const policy = await policyService.getPayrollPolicy();
            const payrollRunId = fc.sample(fc.uuid(), 1)[0];

            // Execute
            const result = await service.calculateEmployeePayroll(
              payrollRunId,
              employee.id,
              records
            );

            // Property: PF should be calculated on basic salary up to threshold
            const pfBaseSalary = result.basicPay.gt(policy.pfThreshold) 
              ? new Decimal(policy.pfThreshold) 
              : result.basicPay;
            const expectedPF = pfBaseSalary.mul(policy.providentFundRate);
            
            // Find PF deduction in items
            const pfItem = result.items.find(item => 
              item.itemType === 'SOCIAL_SECURITY'
            );
            
            expect(pfItem).toBeDefined();
            const actualPF = pfItem!.amount.abs();
            const pfDifference = actualPF.sub(expectedPF).abs();
            
            expect(pfDifference.lt(new Decimal(0.01))).toBe(true);
          }
        ),
        { numRuns: 50, timeout: 10000 }
      );
    });
    it('should handle ESIC calculations with salary threshold correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          validAttendanceRecordsGenerator(),
          async ({ employee, hourlyRate, records }) => {
            // Setup
            const policy = await policyService.getPayrollPolicy();
            const payrollRunId = fc.sample(fc.uuid(), 1)[0];

            // Execute
            const result = await service.calculateEmployeePayroll(
              payrollRunId,
              employee.id,
              records
            );

            // Property: ESIC should only apply if gross salary is within threshold
            const esicItem = result.items.find(item => 
              item.itemType === 'HEALTH_INSURANCE'
            );

            if (result.grossSalary.lte(policy.esicThreshold)) {
              // Should have ESIC deduction
              expect(esicItem).toBeDefined();
              const expectedESIC = result.grossSalary.mul(policy.esicRate);
              const actualESIC = esicItem!.amount.abs();
              const esicDifference = actualESIC.sub(expectedESIC).abs();
              expect(esicDifference.lt(new Decimal(0.01))).toBe(true);
            } else {
              // Should not have ESIC deduction
              expect(esicItem).toBeUndefined();
            }
          }
        ),
        { numRuns: 100, timeout: 10000 }
      );
    });

    it('should calculate double overtime with correct multipliers', async () => {
      // Generate attendance data that will trigger double overtime
      const doubleOvertimeGenerator = fc.tuple(employeeGenerator(), hourlyRateGenerator()).chain(([employee, hourlyRate]) => {
        return fc.record({
          employee: fc.constant(employee),
          hourlyRate: fc.constant(hourlyRate),
          records: fc.array(attendanceRecordGenerator(employee, hourlyRate).map(record => {
            // Force long shifts (13-16 hours) to trigger double overtime
            const workHours = Math.random() * 3 + 13; // 13-16 hours
            const clockOut = new Date(record.clockIn.getTime() + workHours * 60 * 60 * 1000);
            
            return {
              ...record,
              clockOut,
              shift: {
                ...record.shift,
                startTime: record.clockIn,
                endTime: clockOut,
              },
            };
          }), { minLength: 1, maxLength: 5 })
        });
      });

      await fc.assert(
        fc.asyncProperty(
          doubleOvertimeGenerator,
          async ({ employee, hourlyRate, records }) => {
            // Setup
            const policy = await policyService.getPayrollPolicy();
            const payrollRunId = fc.sample(fc.uuid(), 1)[0];

            // Execute
            const result = await service.calculateEmployeePayroll(
              payrollRunId,
              employee.id,
              records
            );

            // Property: If double overtime hours exist, they should be calculated at 2x rate
            if (result.doubleOvertimeHours > 0) {
              const expectedDoubleOvertimePay = new Decimal(hourlyRate)
                .mul(policy.doubleOvertimeMultiplier || 2.0)
                .mul(result.doubleOvertimeHours);
              
              const difference = result.doubleOvertimePay.sub(expectedDoubleOvertimePay).abs();
              expect(difference.lt(new Decimal(0.01))).toBe(true);
            }
          }
        ),
        { numRuns: 50, timeout: 10000 }
      );
    });
    it('should calculate shift differentials accurately for special shifts', async () => {
      // Generator for night shifts and special shift types
      const specialShiftGenerator = fc.tuple(employeeGenerator(), hourlyRateGenerator()).chain(([employee, hourlyRate]) => {
        return fc.record({
          employee: fc.constant(employee),
          hourlyRate: fc.constant(hourlyRate),
          records: fc.array(attendanceRecordGenerator(employee, hourlyRate).map(record => {
            // Create night shifts (10 PM - 6 AM) or weekend shifts
            const isNightShift = Math.random() > 0.5;
            const isWeekend = Math.random() > 0.7;
            
            let shiftDate = record.shift.shiftDate;
            let startTime, endTime;
            
            if (isWeekend) {
              // Make it a weekend (Saturday or Sunday)
              const dayOfWeek = shiftDate.getDay();
              if (dayOfWeek !== 0 && dayOfWeek !== 6) {
                const daysToSaturday = (6 - dayOfWeek + 7) % 7;
                shiftDate = new Date(shiftDate.getTime() + daysToSaturday * 24 * 60 * 60 * 1000);
              }
            }
            
            if (isNightShift) {
              // Night shift: 10 PM to 6 AM
              startTime = new Date(shiftDate);
              startTime.setHours(22, 0, 0, 0);
              endTime = new Date(startTime.getTime() + 8 * 60 * 60 * 1000); // 8 hours
            } else {
              // Regular day shift
              startTime = new Date(shiftDate);
              startTime.setHours(9, 0, 0, 0);
              endTime = new Date(startTime.getTime() + 8 * 60 * 60 * 1000); // 8 hours
            }
            
            return {
              ...record,
              clockIn: startTime,
              clockOut: endTime,
              shift: {
                ...record.shift,
                startTime,
                endTime,
                shiftDate,
                shiftType: isWeekend ? 'WEEKEND' : (isNightShift ? 'NIGHT' : 'REGULAR'),
              },
            };
          }), { minLength: 1, maxLength: 10 })
        });
      });

      await fc.assert(
        fc.asyncProperty(
          specialShiftGenerator,
          async ({ employee, hourlyRate, records }) => {
            // Setup
            const policy = await policyService.getPayrollPolicy();
            const payrollRunId = fc.sample(fc.uuid(), 1)[0];

            // Execute
            const result = await service.calculateEmployeePayroll(
              payrollRunId,
              employee.id,
              records
            );

            // Property: Differential pay should reflect actual shift characteristics
            if (result.nightShiftHours > 0 || result.weekendHours > 0 || result.holidayHours > 0) {
              expect(result.differentialPay.gt(0)).toBe(true);
              
              // Should not exceed reasonable bounds (max 25% differential)
              const maxExpectedDifferential = new Decimal(hourlyRate)
                .mul(0.25)
                .mul(result.totalHours);
              
              expect(result.differentialPay.lte(maxExpectedDifferential)).toBe(true);
            }
          }
        ),
        { numRuns: 50, timeout: 10000 }
      );
    });
    it('should maintain allowance calculations based on basic salary correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          validAttendanceRecordsGenerator(),
          async ({ employee, hourlyRate, records }) => {
            // Precondition: Ensure we have valid data
            fc.pre(records.length > 0);
            fc.pre(records.every(r => r.clockIn && r.clockOut && !isNaN(r.clockIn.getTime()) && !isNaN(r.clockOut.getTime())));

            // Setup
            const policy = await policyService.getPayrollPolicy();
            const payrollRunId = fc.sample(fc.uuid(), 1)[0];

            // Execute
            const result = await service.calculateEmployeePayroll(
              payrollRunId,
              employee.id,
              records
            );

            // Property: Allowances should be calculated correctly based on policy
            const expectedHRA = policy.allowances.hra 
              ? result.basicPay.mul(policy.allowances.hra)
              : new Decimal(0);
            const expectedTransport = new Decimal(policy.allowances.transport || 0);
            const expectedMedical = new Decimal(policy.allowances.medical || 0);
            const expectedTotal = expectedHRA.add(expectedTransport).add(expectedMedical);

            // Find allowance items
            const hraItem = result.items.find(item => 
              item.description.includes('House Rent Allowance')
            );
            const transportItem = result.items.find(item => 
              item.description.includes('Transport Allowance')
            );
            const medicalItem = result.items.find(item => 
              item.description.includes('Medical Allowance')
            );

            // Verify individual allowances
            if (expectedHRA.gt(0)) {
              expect(hraItem).toBeDefined();
              const hraDifference = hraItem!.amount.sub(expectedHRA).abs();
              expect(hraDifference.lt(new Decimal(0.01))).toBe(true);
            }

            if (expectedTransport.gt(0)) {
              expect(transportItem).toBeDefined();
              const transportDifference = transportItem!.amount.sub(expectedTransport).abs();
              expect(transportDifference.lt(new Decimal(0.01))).toBe(true);
            }

            if (expectedMedical.gt(0)) {
              expect(medicalItem).toBeDefined();
              const medicalDifference = medicalItem!.amount.sub(expectedMedical).abs();
              expect(medicalDifference.lt(new Decimal(0.01))).toBe(true);
            }

            // Verify total allowances
            const totalDifference = result.allowances.sub(expectedTotal).abs();
            expect(totalDifference.lt(new Decimal(0.01))).toBe(true);
          }
        ),
        { numRuns: 50, timeout: 10000 }
      );
    });

    it('should ensure professional tax is applied as a fixed amount', async () => {
      await fc.assert(
        fc.asyncProperty(
          validAttendanceRecordsGenerator(),
          async ({ employee, hourlyRate, records }) => {
            // Setup
            const policy = await policyService.getPayrollPolicy();
            const payrollRunId = fc.sample(fc.uuid(), 1)[0];

            // Execute
            const result = await service.calculateEmployeePayroll(
              payrollRunId,
              employee.id,
              records
            );

            // Property: Professional tax should always be the fixed policy amount
            const professionalTaxItem = result.items.find(item => 
              item.description === 'Professional Tax'
            );
            
            expect(professionalTaxItem).toBeDefined();
            const actualProfessionalTax = professionalTaxItem!.amount.abs();
            const expectedProfessionalTax = new Decimal(policy.professionalTax);
            
            expect(actualProfessionalTax.eq(expectedProfessionalTax)).toBe(true);
          }
        ),
        { numRuns: 100, timeout: 10000 }
      );
    });
  });
});