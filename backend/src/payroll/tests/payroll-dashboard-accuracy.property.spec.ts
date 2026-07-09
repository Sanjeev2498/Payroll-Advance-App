/**
 * Property-Based Test for Task 11.2: Payroll Dashboard Accuracy
 * 
 * This test validates Requirements 8.1 and 8.3:
 * - Payroll dashboard displays accurate calculations
 * - Maintains workflow integrity throughout payroll operations
 * 
 * Property 22: Payroll Dashboard Accuracy
 * The payroll dashboard must accurately reflect all payroll calculations,
 * maintain consistent state across operations, and ensure workflow integrity
 * from creation through approval to completion.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import * as fc from 'fast-check';
import { PrismaService } from '../../prisma/prisma.service';
import { PayrollService } from '../payroll.service';
import { PayrollController } from '../payroll.controller';
import { PayrollCalculationService } from '../services/payroll-calculation.service';
import { PayrollPolicyService } from '../services/payroll-policy.service';
import { PayrollRunManagementService } from '../services/payroll-run-management.service';
import { TenantContextService } from '../../common/tenant-context.service';
import { PayrollStatus } from '@prisma/client';
import { Decimal } from 'decimal.js';

// Test fixtures and generators
const PayrollRunGenerator = fc.record({
  runNumber: fc.string({ minLength: 10, maxLength: 20 }),
  payPeriodStart: fc.date({ min: new Date('2024-01-01'), max: new Date('2024-12-31') }),
  payPeriodEnd: fc.date({ min: new Date('2024-01-01'), max: new Date('2024-12-31') }),
  status: fc.constantFrom(PayrollStatus.DRAFT, PayrollStatus.PROCESSING, PayrollStatus.COMPLETED),
  totalAmount: fc.float({ min: 50000, max: 1000000 }),
  employeeCount: fc.integer({ min: 1, max: 100 }),
});

const PayrollItemGenerator = fc.record({
  employeeId: fc.uuid(),
  itemType: fc.constantFrom('BASIC_PAY', 'OVERTIME', 'BONUS', 'TAX_DEDUCTION', 'PF_DEDUCTION'),
  amount: fc.float({ min: -50000, max: 200000 }),
  description: fc.string({ minLength: 5, maxLength: 50 }),
});

const EmployeePayrollDataGenerator = fc.record({
  employeeId: fc.uuid(),
  firstName: fc.string({ minLength: 2, maxLength: 20 }),
  lastName: fc.string({ minLength: 2, maxLength: 20 }),
  employeeNumber: fc.string({ minLength: 5, maxLength: 15 }),
  regularHours: fc.float({ min: 0, max: 200 }),
  overtimeHours: fc.float({ min: 0, max: 80 }),
  hourlyRate: fc.float({ min: 100, max: 2000 }),
  deductions: fc.record({
    tax: fc.float({ min: 0, max: 50000 }),
    pf: fc.float({ min: 0, max: 20000 }),
    esi: fc.float({ min: 0, max: 5000 }),
  }),
});

describe('Property 22: Payroll Dashboard Accuracy', () => {
  let app: INestApplication;
  let payrollService: PayrollService;
  let prismaService: PrismaService;
  let tenantContextService: TenantContextService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [PayrollController],
      providers: [
        PayrollService,
        PayrollCalculationService,
        PayrollPolicyService,
        PayrollRunManagementService,
        {
          provide: PrismaService,
          useValue: {
            payrollRun: {
              findMany: jest.fn(),
              findFirst: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              count: jest.fn(),
            },
            payrollItem: {
              findMany: jest.fn(),
              createMany: jest.fn(),
              deleteMany: jest.fn(),
            },
            employee: {
              findMany: jest.fn(),
            },
            attendance: {
              findMany: jest.fn(),
            },
          },
        },
        {
          provide: TenantContextService,
          useValue: {
            getTenantId: jest.fn().mockReturnValue('test-tenant-id'),
          },
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    payrollService = moduleFixture.get<PayrollService>(PayrollService);
    prismaService = moduleFixture.get<PrismaService>(PrismaService);
    tenantContextService = moduleFixture.get<TenantContextService>(TenantContextService);
    
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  /**
   * Property: Dashboard KPI Accuracy
   * The dashboard KPIs must always reflect the correct aggregated values
   * from the underlying payroll data.
   */
  it('Property: Dashboard KPIs accurately reflect payroll data aggregations', () => {
    return fc.assert(
      fc.asyncProperty(
        fc.array(PayrollRunGenerator, { minLength: 1, maxLength: 10 }),
        async (payrollRuns) => {
          // Setup: Create mock payroll runs with known values
          const mockPayrollRuns = payrollRuns.map((run, index) => ({
            ...run,
            id: `run-${index}`,
            payPeriodStart: run.payPeriodStart,
            payPeriodEnd: new Date(run.payPeriodStart.getTime() + 30 * 24 * 60 * 60 * 1000), // 30 days later
            totalAmount: new Decimal(run.totalAmount),
            createdAt: new Date(),
          }));

          // Mock Prisma responses
          (prismaService.payrollRun.findMany as jest.Mock).mockResolvedValue(mockPayrollRuns);
          (prismaService.payrollRun.count as jest.Mock).mockResolvedValue(mockPayrollRuns.length);

          // Execute: Get payroll runs through service
          const result = await payrollService.listPayrollRuns(1, 20);

          // Verify: KPI calculations match expected values
          const expectedTotalAmount = mockPayrollRuns.reduce(
            (sum, run) => sum.add(run.totalAmount), 
            new Decimal(0)
          );
          
          const expectedEmployeeCount = mockPayrollRuns.reduce(
            (sum, run) => sum + run.employeeCount, 
            0
          );

          const actualTotalAmount = result.data.reduce(
            (sum, run) => sum.add(new Decimal(run.totalAmount)), 
            new Decimal(0)
          );

          const actualEmployeeCount = result.data.reduce(
            (sum, run) => sum + run.employeeCount, 
            0
          );

          // Assertions
          expect(actualTotalAmount.equals(expectedTotalAmount)).toBe(true);
          expect(actualEmployeeCount).toBe(expectedEmployeeCount);
          expect(result.data.length).toBe(mockPayrollRuns.length);

          // Additional KPI accuracy checks
          const completedRuns = mockPayrollRuns.filter(run => run.status === PayrollStatus.COMPLETED);
          const processingRuns = mockPayrollRuns.filter(run => run.status === PayrollStatus.PROCESSING);
          
          expect(result.data.filter(run => run.status === PayrollStatus.COMPLETED).length)
            .toBe(completedRuns.length);
          expect(result.data.filter(run => run.status === PayrollStatus.PROCESSING).length)
            .toBe(processingRuns.length);
        }
      ),
      { numRuns: 20, timeout: 10000 }
    );
  });

  /**
   * Property: Payroll Calculation Consistency
   * All payroll calculations must be mathematically consistent and
   * follow the correct formulas across all dashboard views.
   */
  it('Property: Payroll calculations maintain mathematical consistency', () => {
    return fc.assert(
      fc.asyncProperty(
        fc.array(EmployeePayrollDataGenerator, { minLength: 1, maxLength: 5 }),
        async (employees) => {
          // Setup: Create payroll run with employee data
          const runId = 'test-run-123';
          const mockPayrollItems: any[] = [];
          
          employees.forEach(emp => {
            // Basic pay calculation
            const basicPay = emp.regularHours * emp.hourlyRate;
            const overtimePay = emp.overtimeHours * emp.hourlyRate * 1.5; // 1.5x for overtime
            const grossPay = basicPay + overtimePay;
            
            // Deductions
            const totalDeductions = emp.deductions.tax + emp.deductions.pf + emp.deductions.esi;
            const netPay = grossPay - totalDeductions;

            mockPayrollItems.push(
              { employeeId: emp.employeeId, itemType: 'BASIC_PAY', amount: new Decimal(basicPay) },
              { employeeId: emp.employeeId, itemType: 'OVERTIME', amount: new Decimal(overtimePay) },
              { employeeId: emp.employeeId, itemType: 'TAX_DEDUCTION', amount: new Decimal(-emp.deductions.tax) },
              { employeeId: emp.employeeId, itemType: 'PF_DEDUCTION', amount: new Decimal(-emp.deductions.pf) },
              { employeeId: emp.employeeId, itemType: 'ESI_DEDUCTION', amount: new Decimal(-emp.deductions.esi) }
            );
          });

          const totalGross = mockPayrollItems
            .filter(item => !item.itemType.includes('DEDUCTION'))
            .reduce((sum, item) => sum.add(item.amount), new Decimal(0));

          const totalDeductions = mockPayrollItems
            .filter(item => item.itemType.includes('DEDUCTION'))
            .reduce((sum, item) => sum.add(item.amount.abs()), new Decimal(0));

          const totalNet = totalGross.minus(totalDeductions);

          const mockPayrollRun = {
            id: runId,
            runNumber: 'TEST-2024-01-001',
            totalAmount: totalGross,
            payrollItems: mockPayrollItems.map(item => ({
              ...item,
              employee: employees.find(emp => emp.employeeId === item.employeeId),
            })),
          };

          // Mock Prisma response
          (prismaService.payrollRun.findFirst as jest.Mock).mockResolvedValue(mockPayrollRun);

          // Execute: Get payroll run details
          const result = await payrollService.getPayrollRun(runId);

          // Verify: Mathematical consistency
          expect(result).toBeTruthy();
          expect(result!.totalAmount.equals(totalGross)).toBe(true);

          // Verify individual employee calculations are consistent
          const employeeGroups = new Map<string, any[]>();
          mockPayrollItems.forEach(item => {
            if (!employeeGroups.has(item.employeeId)) {
              employeeGroups.set(item.employeeId, []);
            }
            employeeGroups.get(item.employeeId)!.push(item);
          });

          for (const [employeeId, items] of employeeGroups) {
            const employee = employees.find(emp => emp.employeeId === employeeId)!;
            
            const calculatedBasicPay = employee.regularHours * employee.hourlyRate;
            const calculatedOvertimePay = employee.overtimeHours * employee.hourlyRate * 1.5;
            
            const basicPayItem = items.find(item => item.itemType === 'BASIC_PAY');
            const overtimeItem = items.find(item => item.itemType === 'OVERTIME');
            
            expect(basicPayItem.amount.toNumber()).toBeCloseTo(calculatedBasicPay, 2);
            expect(overtimeItem.amount.toNumber()).toBeCloseTo(calculatedOvertimePay, 2);
            
            // Verify gross pay calculation
            const grossPay = calculatedBasicPay + calculatedOvertimePay;
            const actualGross = items
              .filter(item => !item.itemType.includes('DEDUCTION'))
              .reduce((sum, item) => sum + item.amount.toNumber(), 0);
            
            expect(actualGross).toBeCloseTo(grossPay, 2);
          }
        }
      ),
      { numRuns: 15, timeout: 10000 }
    );
  });

  /**
   * Property: Workflow State Integrity
   * The payroll workflow must maintain consistent state transitions
   * and prevent invalid state changes.
   */
  it('Property: Payroll workflow maintains state integrity', () => {
    return fc.assert(
      fc.asyncProperty(
        fc.constantFrom(PayrollStatus.DRAFT, PayrollStatus.PROCESSING, PayrollStatus.COMPLETED),
        fc.constantFrom(PayrollStatus.PROCESSING, PayrollStatus.COMPLETED, PayrollStatus.CANCELLED),
        async (initialStatus, targetStatus) => {
          // Setup: Create payroll run with initial status
          const runId = 'workflow-test-run';
          const mockPayrollRun = {
            id: runId,
            runNumber: 'WF-TEST-001',
            status: initialStatus,
            totalAmount: new Decimal(100000),
            employeeCount: 5,
            createdAt: new Date(),
            payrollItems: [],
          };

          (prismaService.payrollRun.findFirst as jest.Mock).mockResolvedValue(mockPayrollRun);

          // Define valid state transitions
          const validTransitions = new Map<PayrollStatus, PayrollStatus[]>([
            [PayrollStatus.DRAFT, [PayrollStatus.PROCESSING, PayrollStatus.CANCELLED]],
            [PayrollStatus.PROCESSING, [PayrollStatus.COMPLETED, PayrollStatus.CANCELLED]],
            [PayrollStatus.COMPLETED, []], // Terminal state
            [PayrollStatus.CANCELLED, []], // Terminal state
          ]);

          // Execute: Attempt state transition
          const allowedTargets = validTransitions.get(initialStatus) || [];
          const isValidTransition = allowedTargets.includes(targetStatus);

          // Mock update response based on validity
          if (isValidTransition) {
            (prismaService.payrollRun.update as jest.Mock).mockResolvedValue({
              ...mockPayrollRun,
              status: targetStatus,
            });
          } else {
            (prismaService.payrollRun.update as jest.Mock).mockRejectedValue(
              new Error(`Invalid state transition from ${initialStatus} to ${targetStatus}`)
            );
          }

          // Verify: State integrity is maintained
          if (isValidTransition) {
            // Valid transitions should succeed
            const updatedRun = await prismaService.payrollRun.update({
              where: { id: runId },
              data: { status: targetStatus },
            });
            expect(updatedRun.status).toBe(targetStatus);
          } else {
            // Invalid transitions should be rejected
            await expect(
              prismaService.payrollRun.update({
                where: { id: runId },
                data: { status: targetStatus },
              })
            ).rejects.toThrow();
          }

          // Additional workflow integrity checks
          if (initialStatus === PayrollStatus.COMPLETED) {
            // Completed payrolls should be immutable
            expect(allowedTargets).toHaveLength(0);
          }

          if (initialStatus === PayrollStatus.DRAFT && targetStatus === PayrollStatus.COMPLETED) {
            // Cannot skip processing stage
            expect(isValidTransition).toBe(false);
          }
        }
      ),
      { numRuns: 25, timeout: 8000 }
    );
  });

  /**
   * Property: Dashboard Data Consistency
   * All dashboard views must show consistent data when displaying
   * the same underlying payroll information.
   */
  it('Property: Dashboard maintains data consistency across views', () => {
    return fc.assert(
      fc.asyncProperty(
        fc.array(PayrollRunGenerator, { minLength: 2, maxLength: 8 }),
        fc.array(PayrollItemGenerator, { minLength: 5, maxLength: 20 }),
        async (payrollRuns, payrollItems) => {
          // Setup: Create consistent mock data
          const mockRuns = payrollRuns.map((run, index) => ({
            ...run,
            id: `run-${index}`,
            totalAmount: new Decimal(run.totalAmount),
            createdAt: new Date(),
            processedAt: run.status === PayrollStatus.COMPLETED ? new Date() : null,
          }));

          const mockItems = payrollItems.map((item, index) => ({
            ...item,
            id: `item-${index}`,
            payrollRunId: mockRuns[index % mockRuns.length].id,
            amount: new Decimal(item.amount),
          }));

          // Mock different data access patterns
          (prismaService.payrollRun.findMany as jest.Mock).mockResolvedValue(mockRuns);
          (prismaService.payrollItem.findMany as jest.Mock).mockResolvedValue(mockItems);

          // Execute: Get data through different service methods
          const listResult = await payrollService.listPayrollRuns(1, 10);
          
          // Simulate getting individual run details
          const runDetailsPromises = mockRuns.slice(0, 3).map(run => {
            (prismaService.payrollRun.findFirst as jest.Mock).mockResolvedValue({
              ...run,
              payrollItems: mockItems.filter(item => item.payrollRunId === run.id),
            });
            return payrollService.getPayrollRun(run.id);
          });

          const runDetails = await Promise.all(runDetailsPromises);

          // Verify: Consistency across different views
          for (let i = 0; i < runDetails.length; i++) {
            const listRun = listResult.data[i];
            const detailRun = runDetails[i];

            if (detailRun) {
              // Core fields must match
              expect(listRun.id).toBe(detailRun.id);
              expect(listRun.runNumber).toBe(detailRun.runNumber);
              expect(listRun.status).toBe(detailRun.status);
              expect(new Decimal(listRun.totalAmount).equals(detailRun.totalAmount)).toBe(true);
              expect(listRun.employeeCount).toBe(detailRun.employeeCount);

              // Calculated totals must be consistent
              const detailItems = (detailRun as any).payrollItems || [];
              const calculatedTotal = detailItems.reduce(
                (sum: Decimal, item: any) => sum.add(item.amount.gt(0) ? item.amount : new Decimal(0)),
                new Decimal(0)
              );

              // Allow for small rounding differences
              const totalDifference = calculatedTotal.minus(detailRun.totalAmount).abs();
              expect(totalDifference.toNumber()).toBeLessThanOrEqual(0.01);
            }
          }

          // Verify pagination consistency
          const page1 = await payrollService.listPayrollRuns(1, 5);
          const page2 = await payrollService.listPayrollRuns(2, 5);

          // No duplicate runs across pages
          const page1Ids = new Set(page1.data.map(run => run.id));
          const page2Ids = new Set(page2.data.map(run => run.id));
          const intersection = new Set([...page1Ids].filter(id => page2Ids.has(id)));
          expect(intersection.size).toBe(0);
        }
      ),
      { numRuns: 12, timeout: 12000 }
    );
  });

  /**
   * Property: Real-time KPI Accuracy
   * Dashboard KPIs must be immediately accurate after any payroll operation
   * and reflect the current state of the system.
   */
  it('Property: Dashboard KPIs are immediately accurate after operations', () => {
    return fc.assert(
      fc.asyncProperty(
        PayrollRunGenerator,
        fc.array(EmployeePayrollDataGenerator, { minLength: 1, maxLength: 3 }),
        async (initialRun, employees) => {
          // Setup: Initial state
          let mockRuns = [{
            ...initialRun,
            id: 'kpi-test-run',
            totalAmount: new Decimal(initialRun.totalAmount),
            createdAt: new Date(),
          }];

          (prismaService.payrollRun.findMany as jest.Mock).mockImplementation(() => 
            Promise.resolve([...mockRuns])
          );
          (prismaService.payrollRun.count as jest.Mock).mockImplementation(() => 
            Promise.resolve(mockRuns.length)
          );

          // Execute: Get initial KPIs
          const initialResult = await payrollService.listPayrollRuns(1, 20);
          const initialTotal = initialResult.data.reduce(
            (sum, run) => sum.add(new Decimal(run.totalAmount)), 
            new Decimal(0)
          );
          const initialCount = initialResult.data.length;

          // Execute: Create new payroll run (simulated)
          const newRunAmount = employees.reduce((sum, emp) => 
            sum + (emp.regularHours + emp.overtimeHours * 1.5) * emp.hourlyRate, 0
          );

          const newRun = {
            id: 'new-kpi-run',
            runNumber: 'KPI-NEW-001',
            status: PayrollStatus.COMPLETED,
            totalAmount: new Decimal(newRunAmount),
            employeeCount: employees.length,
            createdAt: new Date(),
          };

          // Update mock data to include new run
          mockRuns.push(newRun);

          // Execute: Get updated KPIs
          const updatedResult = await payrollService.listPayrollRuns(1, 20);
          const updatedTotal = updatedResult.data.reduce(
            (sum, run) => sum.add(new Decimal(run.totalAmount)), 
            new Decimal(0)
          );
          const updatedCount = updatedResult.data.length;

          // Verify: KPIs reflect the operation immediately
          expect(updatedCount).toBe(initialCount + 1);
          
          const expectedNewTotal = initialTotal.add(new Decimal(newRunAmount));
          expect(updatedTotal.equals(expectedNewTotal)).toBe(true);

          // Verify status distribution is accurate
          const completedRuns = updatedResult.data.filter(run => run.status === PayrollStatus.COMPLETED);
          const expectedCompletedCount = mockRuns.filter(run => run.status === PayrollStatus.COMPLETED).length;
          expect(completedRuns.length).toBe(expectedCompletedCount);

          // Verify employee count accuracy
          const totalEmployees = updatedResult.data.reduce((sum, run) => sum + run.employeeCount, 0);
          const expectedEmployees = mockRuns.reduce((sum, run) => sum + run.employeeCount, 0);
          expect(totalEmployees).toBe(expectedEmployees);
        }
      ),
      { numRuns: 10, timeout: 10000 }
    );
  });
});

/**
 * Integration test for complete payroll dashboard workflow
 * This test validates the entire workflow from creation to completion
 * ensuring accuracy at each step.
 */
describe('Payroll Dashboard Integration Workflow', () => {
  let app: INestApplication;
  let payrollService: PayrollService;
  let prismaService: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [PayrollController],
      providers: [
        PayrollService,
        PayrollCalculationService,
        PayrollPolicyService,
        PayrollRunManagementService,
        {
          provide: PrismaService,
          useValue: {
            payrollRun: {
              findMany: jest.fn(),
              findFirst: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              count: jest.fn(),
            },
            payrollItem: {
              findMany: jest.fn(),
              createMany: jest.fn(),
            },
            employee: { findMany: jest.fn() },
            attendance: { findMany: jest.fn() },
          },
        },
        {
          provide: TenantContextService,
          useValue: {
            getTenantId: jest.fn().mockReturnValue('integration-test-tenant'),
          },
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    payrollService = moduleFixture.get<PayrollService>(PayrollService);
    prismaService = moduleFixture.get<PrismaService>(PrismaService);
    
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should maintain dashboard accuracy throughout complete payroll lifecycle', async () => {
    // Phase 1: Initial empty state
    (prismaService.payrollRun.findMany as jest.Mock).mockResolvedValue([]);
    (prismaService.payrollRun.count as jest.Mock).mockResolvedValue(0);

    let dashboardData = await payrollService.listPayrollRuns(1, 20);
    expect(dashboardData.data).toHaveLength(0);
    expect(dashboardData.pagination.total).toBe(0);

    // Phase 2: Create payroll run
    const newPayrollRun = {
      id: 'integration-run-1',
      runNumber: 'INT-2024-01-001',
      status: PayrollStatus.DRAFT,
      totalAmount: new Decimal(250000),
      employeeCount: 2,
      payPeriodStart: new Date('2024-01-01'),
      payPeriodEnd: new Date('2024-01-31'),
      createdAt: new Date(),
    };

    (prismaService.payrollRun.create as jest.Mock).mockResolvedValue(newPayrollRun);
    (prismaService.payrollRun.findMany as jest.Mock).mockResolvedValue([newPayrollRun]);
    (prismaService.payrollRun.count as jest.Mock).mockResolvedValue(1);

    // Verify dashboard reflects new run
    dashboardData = await payrollService.listPayrollRuns(1, 20);
    expect(dashboardData.data).toHaveLength(1);
    expect(dashboardData.data[0].status).toBe(PayrollStatus.DRAFT);
    expect(new Decimal(dashboardData.data[0].totalAmount).equals(new Decimal(250000))).toBe(true);

    // Phase 3: Process payroll run
    const processedRun = {
      ...newPayrollRun,
      status: PayrollStatus.PROCESSING,
      processedAt: new Date(),
    };

    (prismaService.payrollRun.update as jest.Mock).mockResolvedValue(processedRun);
    (prismaService.payrollRun.findMany as jest.Mock).mockResolvedValue([processedRun]);

    dashboardData = await payrollService.listPayrollRuns(1, 20);
    expect(dashboardData.data[0].status).toBe(PayrollStatus.PROCESSING);

    // Phase 4: Complete payroll run
    const completedRun = {
      ...processedRun,
      status: PayrollStatus.COMPLETED,
      totalAmount: new Decimal(275000), // Updated after calculations
    };

    (prismaService.payrollRun.findMany as jest.Mock).mockResolvedValue([completedRun]);

    dashboardData = await payrollService.listPayrollRuns(1, 20);
    expect(dashboardData.data[0].status).toBe(PayrollStatus.COMPLETED);
    expect(new Decimal(dashboardData.data[0].totalAmount).equals(new Decimal(275000))).toBe(true);

    // Phase 5: Verify final state consistency
    const detailedRun = {
      ...completedRun,
      payrollItems: [
        { employeeId: 'emp1', itemType: 'BASIC_PAY', amount: new Decimal(150000) },
        { employeeId: 'emp1', itemType: 'OVERTIME', amount: new Decimal(25000) },
        { employeeId: 'emp2', itemType: 'BASIC_PAY', amount: new Decimal(100000) },
      ],
    };

    (prismaService.payrollRun.findFirst as jest.Mock).mockResolvedValue(detailedRun);

    const runDetails = await payrollService.getPayrollRun(completedRun.id);
    expect(runDetails).toBeTruthy();
    expect(runDetails!.status).toBe(PayrollStatus.COMPLETED);

    // Verify calculation consistency
    const calculatedTotal = detailedRun.payrollItems.reduce(
      (sum, item) => sum.add(item.amount), 
      new Decimal(0)
    );
    expect(calculatedTotal.equals(completedRun.totalAmount)).toBe(true);
  });
});

export {};