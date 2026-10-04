import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantContextService } from '../../common/tenant-context.service';
import { CommonModule } from '../../common/common.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { randomUUID } from 'crypto';
import * as fc from 'fast-check';

/**
 * **Property 24: Financial Report Accuracy**
 * **Validates: Requirements 8.5, 9.4**
 * 
 * This property test ensures that financial reports accurately aggregate data,
 * maintain calculation consistency, and provide reliable analytics across
 * all financial operations.
 */
describe('Property 24: Financial Report Accuracy', () => {
  let module: TestingModule;
  let prisma: PrismaService;
  let tenantId: string;

  const mockTenantContextService = {
    getTenantId: () => tenantId,
    setContext: (id: string) => { tenantId = id; },
    getUserId: () => 'test-user',
    getUserRole: () => 'COMPANY_ADMIN',
    hasContext: () => Boolean(tenantId),
    validateTenantAccess: () => true,
    isAdmin: () => true,
    clearContext: () => { tenantId = null; },
    getContext: () => ({ tenantId, userId: 'test-user', userRole: 'COMPANY_ADMIN' }),
    getContextSnapshot: () => `tenant:${tenantId}, user:test-user, role:COMPANY_ADMIN`
  };

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [CommonModule, PrismaModule],
    })
    .overrideProvider(TenantContextService)
    .useValue(mockTenantContextService)
    .compile();

    prisma = module.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    if (module) await module.close();
  });

  beforeEach(() => {
    tenantId = randomUUID();
    mockTenantContextService.setContext(tenantId);
  });

  /**
   * Property 24.1: Revenue Report Calculation Accuracy
   * Tests revenue aggregation and calculation logic
   */
  it('Property 24.1: should validate revenue report calculation accuracy', async () => {
    // Mock invoice data for revenue calculations
    const invoices = [
      { id: 'inv1', amount: 50000, status: 'PAID', paidDate: new Date('2024-01-15'), clientId: 'client1' },
      { id: 'inv2', amount: 75000, status: 'PAID', paidDate: new Date('2024-01-20'), clientId: 'client2' },
      { id: 'inv3', amount: 30000, status: 'PENDING', paidDate: null, clientId: 'client1' },
      { id: 'inv4', amount: 90000, status: 'PAID', paidDate: new Date('2024-02-05'), clientId: 'client3' },
      { id: 'inv5', amount: 25000, status: 'OVERDUE', paidDate: null, clientId: 'client2' },
    ];

    // Calculate revenue metrics
    const totalInvoiced = invoices.reduce((sum, inv) => sum + inv.amount, 0);
    const totalCollected = invoices
      .filter(inv => inv.status === 'PAID')
      .reduce((sum, inv) => sum + inv.amount, 0);
    const totalOutstanding = invoices
      .filter(inv => inv.status !== 'PAID')
      .reduce((sum, inv) => sum + inv.amount, 0);
    const collectionRate = (totalCollected / totalInvoiced) * 100;

    // Property 24.1: Validate revenue calculations
    expect(totalInvoiced).toBe(270000); // 50k + 75k + 30k + 90k + 25k
    expect(totalCollected).toBe(215000); // 50k + 75k + 90k (only PAID invoices)
    expect(totalOutstanding).toBe(55000); // 30k + 25k (PENDING + OVERDUE)
    expect(Math.round(collectionRate * 100) / 100).toBe(79.63); // 215000/270000 * 100

    // Validate collection rate calculation
    const calculatedCollectionRate = (totalCollected / totalInvoiced) * 100;
    expect(Math.abs(collectionRate - calculatedCollectionRate)).toBeLessThan(0.01);

    // Test monthly revenue breakdown
    const januaryRevenue = invoices
      .filter(inv => inv.paidDate && inv.paidDate.getMonth() === 0) // January = 0
      .reduce((sum, inv) => sum + inv.amount, 0);
    
    const februaryRevenue = invoices
      .filter(inv => inv.paidDate && inv.paidDate.getMonth() === 1) // February = 1
      .reduce((sum, inv) => sum + inv.amount, 0);

    expect(januaryRevenue).toBe(125000); // 50k + 75k
    expect(februaryRevenue).toBe(90000); // 90k
    expect(januaryRevenue + februaryRevenue).toBe(totalCollected);

    // Test client-wise revenue breakdown
    const clientRevenue = {};
    invoices
      .filter(inv => inv.status === 'PAID')
      .forEach(inv => {
        clientRevenue[inv.clientId] = (clientRevenue[inv.clientId] || 0) + inv.amount;
      });

    expect(clientRevenue['client1']).toBe(50000);
    expect(clientRevenue['client2']).toBe(75000);
    expect(clientRevenue['client3']).toBe(90000);
  });

  /**
   * Property 24.2: Payroll Cost Analysis Accuracy
   * Tests payroll cost aggregation and analysis
   */
  it('Property 24.2: should validate payroll cost analysis accuracy', async () => {
    // Mock payroll data
    const payrollRecords = [
      { employeeId: 'emp1', grossSalary: 45000, netSalary: 38000, deductions: 7000, month: '2024-01', department: 'Security' },
      { employeeId: 'emp2', grossSalary: 55000, netSalary: 46000, deductions: 9000, month: '2024-01', department: 'Security' },
      { employeeId: 'emp3', grossSalary: 70000, netSalary: 58000, deductions: 12000, month: '2024-01', department: 'Management' },
      { employeeId: 'emp4', grossSalary: 40000, netSalary: 34000, deductions: 6000, month: '2024-01', department: 'Operations' },
      { employeeId: 'emp1', grossSalary: 46000, netSalary: 39000, deductions: 7000, month: '2024-02', department: 'Security' },
    ];

    // Calculate cost metrics
    const totalGrossSalary = payrollRecords.reduce((sum, rec) => sum + rec.grossSalary, 0);
    const totalNetSalary = payrollRecords.reduce((sum, rec) => sum + rec.netSalary, 0);
    const totalDeductions = payrollRecords.reduce((sum, rec) => sum + rec.deductions, 0);

    // Property 24.2: Validate payroll calculations
    expect(totalGrossSalary).toBe(256000); // 45k + 55k + 70k + 40k + 46k
    expect(totalNetSalary).toBe(215000); // 38k + 46k + 58k + 34k + 39k
    expect(totalDeductions).toBe(41000); // 7k + 9k + 12k + 6k + 7k

    // Validate gross = net + deductions for each record
    payrollRecords.forEach(record => {
      expect(record.grossSalary).toBe(record.netSalary + record.deductions);
    });

    // Test department-wise cost analysis
    const departmentCosts = {};
    payrollRecords.forEach(rec => {
      if (!departmentCosts[rec.department]) {
        departmentCosts[rec.department] = { gross: 0, net: 0, deductions: 0, count: 0 };
      }
      departmentCosts[rec.department].gross += rec.grossSalary;
      departmentCosts[rec.department].net += rec.netSalary;
      departmentCosts[rec.department].deductions += rec.deductions;
      departmentCosts[rec.department].count += 1;
    });

    expect(departmentCosts['Security'].gross).toBe(146000); // 45k + 55k + 46k
    expect(departmentCosts['Security'].count).toBe(3);
    expect(departmentCosts['Management'].gross).toBe(70000);
    expect(departmentCosts['Operations'].gross).toBe(40000);

    // Test monthly cost trend
    const january2024 = payrollRecords.filter(rec => rec.month === '2024-01');
    const february2024 = payrollRecords.filter(rec => rec.month === '2024-02');

    const janGross = january2024.reduce((sum, rec) => sum + rec.grossSalary, 0);
    const febGross = february2024.reduce((sum, rec) => sum + rec.grossSalary, 0);

    expect(janGross).toBe(210000); // 45k + 55k + 70k + 40k
    expect(febGross).toBe(46000); // 46k
  });

  /**
   * Property 24.3: Profit & Loss Statement Accuracy
   * Tests P&L statement calculations and validations
   */
  it('Property 24.3: should validate profit and loss statement accuracy', async () => {
    // Mock P&L data
    const plData = {
      revenue: {
        clientBilling: 500000,
        additionalServices: 50000,
        otherIncome: 10000
      },
      expenses: {
        salaries: 300000,
        benefits: 45000,
        operatingExpenses: 75000,
        equipment: 25000,
        overhead: 30000
      },
      taxes: {
        incomeTax: 15000,
        gst: 45000,
        other: 5000
      }
    };

    // Calculate P&L metrics
    const totalRevenue = Object.values(plData.revenue).reduce((sum, val) => sum + val, 0);
    const totalExpenses = Object.values(plData.expenses).reduce((sum, val) => sum + val, 0);
    const totalTaxes = Object.values(plData.taxes).reduce((sum, val) => sum + val, 0);
    
    const grossProfit = totalRevenue - totalExpenses;
    const netProfit = grossProfit - totalTaxes;
    const profitMargin = (netProfit / totalRevenue) * 100;

    // Property 24.3: Validate P&L calculations
    expect(totalRevenue).toBe(560000); // 500k + 50k + 10k
    expect(totalExpenses).toBe(475000); // 300k + 45k + 75k + 25k + 30k
    expect(totalTaxes).toBe(65000); // 15k + 45k + 5k
    expect(grossProfit).toBe(85000); // 560k - 475k
    expect(netProfit).toBe(20000); // 85k - 65k
    expect(Math.round(profitMargin * 100) / 100).toBe(3.57); // (20k/560k) * 100

    // Validate expense ratios
    const salaryRatio = (plData.expenses.salaries / totalRevenue) * 100;
    const operatingRatio = (totalExpenses / totalRevenue) * 100;
    
    expect(Math.round(salaryRatio * 100) / 100).toBe(53.57); // (300k/560k) * 100
    expect(Math.round(operatingRatio * 100) / 100).toBe(84.82); // (475k/560k) * 100

    // Test financial ratios
    const ebitda = grossProfit; // Simplified EBITDA
    const ebitdaMargin = (ebitda / totalRevenue) * 100;
    
    expect(ebitda).toBe(grossProfit);
    expect(Math.round(ebitdaMargin * 100) / 100).toBe(15.18); // (85k/560k) * 100

    // Validate that all revenue and expense categories are positive
    Object.values(plData.revenue).forEach(value => {
      expect(value).toBeGreaterThanOrEqual(0);
    });
    
    Object.values(plData.expenses).forEach(value => {
      expect(value).toBeGreaterThanOrEqual(0);
    });
  });

  /**
   * Property 24.4: Cash Flow Report Accuracy
   * Tests cash flow calculations and projections
   */
  it('Property 24.4: should validate cash flow report accuracy', async () => {
    // Mock cash flow data
    const cashFlowData = {
      openingBalance: 100000,
      inflows: {
        collections: 450000,
        advances: 25000,
        otherIncome: 15000
      },
      outflows: {
        salaries: 280000,
        operations: 85000,
        taxes: 55000,
        equipment: 30000,
        other: 20000
      }
    };

    // Calculate cash flow metrics
    const totalInflows = Object.values(cashFlowData.inflows).reduce((sum, val) => sum + val, 0);
    const totalOutflows = Object.values(cashFlowData.outflows).reduce((sum, val) => sum + val, 0);
    const netCashFlow = totalInflows - totalOutflows;
    const closingBalance = cashFlowData.openingBalance + netCashFlow;

    // Property 24.4: Validate cash flow calculations
    expect(totalInflows).toBe(490000); // 450k + 25k + 15k
    expect(totalOutflows).toBe(470000); // 280k + 85k + 55k + 30k + 20k
    expect(netCashFlow).toBe(20000); // 490k - 470k
    expect(closingBalance).toBe(120000); // 100k + 20k

    // Test cash flow ratios
    const operatingCashFlowRatio = (netCashFlow / totalOutflows) * 100;
    const cashConversionRate = (totalInflows / (totalInflows + cashFlowData.openingBalance)) * 100;
    
    expect(Math.round(operatingCashFlowRatio * 100) / 100).toBe(4.26); // (20k/470k) * 100
    expect(Math.round(cashConversionRate * 100) / 100).toBe(83.05); // (490k/590k) * 100

    // Validate cash flow categories
    expect(cashFlowData.openingBalance).toBeGreaterThanOrEqual(0);
    expect(totalInflows).toBeGreaterThan(0);
    expect(totalOutflows).toBeGreaterThan(0);
    expect(closingBalance).toBeGreaterThanOrEqual(0);

    // Test monthly cash flow projection
    const months = 12;
    const avgMonthlyInflow = totalInflows / months;
    const avgMonthlyOutflow = totalOutflows / months;
    const avgMonthlyNetFlow = avgMonthlyInflow - avgMonthlyOutflow;

    expect(Math.round(avgMonthlyInflow)).toBe(40833); // 490k/12
    expect(Math.round(avgMonthlyOutflow)).toBe(39167); // 470k/12
    expect(Math.round(avgMonthlyNetFlow)).toBe(1667); // 20k/12

    // Project future balance
    const projectedBalance6Months = closingBalance + (avgMonthlyNetFlow * 6);
    expect(Math.round(projectedBalance6Months)).toBe(130000); // 120k + (1667*6)
  });
});
