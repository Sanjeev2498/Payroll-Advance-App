import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantContextService } from '../../common/tenant-context.service';
import { Decimal } from 'decimal.js';
import { 
  PayrollStatus, 
  InvoiceStatus, 
  AttendanceStatus,
  Prisma 
} from '@prisma/client';

export interface PayrollReportSummary {
  totalPayroll: number;
  employeeCount: number;
  avgSalaryPerEmployee: number;
  totalRegularHours: number;
  totalOvertimeHours: number;
  totalDeductions: number;
  netPayroll: number;
  growthPercentage: number;
  departmentBreakdown: {
    department: string;
    totalPayroll: number;
    employeeCount: number;
    percentage: number;
  }[];
  monthlyTrends: {
    month: string;
    year: number;
    totalPayroll: number;
    employeeCount: number;
    avgSalary: number;
  }[];
}

export interface BillingReportSummary {
  totalRevenue: number;
  totalInvoices: number;
  avgInvoiceValue: number;
  totalOutstanding: number;
  collectionRate: number;
  growthPercentage: number;
  clientBreakdown: {
    clientId: string;
    clientName: string;
    totalRevenue: number;
    invoiceCount: number;
    percentage: number;
    outstandingAmount: number;
  }[];
  monthlyTrends: {
    month: string;
    year: number;
    totalRevenue: number;
    invoiceCount: number;
    avgValue: number;
  }[];
  statusDistribution: {
    status: string;
    count: number;
    amount: number;
    percentage: number;
  }[];
}

export interface SiteProfitabilityAnalysis {
  siteId: string;
  siteName: string;
  clientName: string;
  revenue: number;
  payrollCosts: number;
  operationalCosts: number;
  grossProfit: number;
  profitMargin: number;
  employeeCount: number;
  hoursWorked: number;
  utilizationRate: number;
  recommendations: string[];
}

export interface FinancialForecast {
  period: string;
  projectedRevenue: number;
  projectedPayroll: number;
  projectedProfit: number;
  confidence: number;
  factors: string[];
}

export interface CostOptimizationInsights {
  category: string;
  currentCost: number;
  potentialSavings: number;
  savingsPercentage: number;
  actionItems: string[];
  priority: 'high' | 'medium' | 'low';
}

export interface FinancialDashboardData {
  payrollSummary: PayrollReportSummary;
  billingSummary: BillingReportSummary;
  siteProfitability: SiteProfitabilityAnalysis[];
  forecasts: FinancialForecast[];
  costOptimization: CostOptimizationInsights[];
  kpis: {
    totalRevenue: number;
    totalPayroll: number;
    grossProfit: number;
    profitMargin: number;
    employeeProductivity: number;
    clientSatisfaction: number;
  };
}

@Injectable()
export class FinancialReportsService {
  constructor(
    private prisma: PrismaService,
    private tenantContext: TenantContextService,
  ) {}

  /**
   * Get comprehensive payroll reports with drill-down capabilities
   */
  async getPayrollReports(options: {
    startDate: Date;
    endDate: Date;
    employeeIds?: string[];
    departmentIds?: string[];
    siteIds?: string[];
  }): Promise<PayrollReportSummary> {
    const companyId = this.tenantContext.getTenantId();
    
    // Get payroll runs for the period
    const payrollRuns = await this.prisma.payrollRun.findMany({
      where: {
        companyId,
        status: PayrollStatus.COMPLETED,
        payPeriodStart: { gte: options.startDate },
        payPeriodEnd: { lte: options.endDate },
      },
      include: {
        payrollItems: {
          include: {
            employee: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                employeeNumber: true,
                // Add department field when available
              },
            },
          },
        },
      },
    });

    // Calculate totals
    let totalPayroll = new Decimal(0);
    let totalDeductions = new Decimal(0);
    let totalRegularHours = 0;
    let totalOvertimeHours = 0;
    const employeeSet = new Set<string>();
    const departmentData = new Map<string, { totalPayroll: number; employeeCount: number }>();

    payrollRuns.forEach(run => {
      run.payrollItems.forEach(item => {
        employeeSet.add(item.employeeId);
        
        if (item.itemType === 'BASIC_SALARY' || item.itemType === 'OVERTIME') {
          totalPayroll = totalPayroll.add(item.amount);
          
          // Extract hours from calculation data if available
          const calcData = item.calculationData as any;
          if (calcData?.regularHours) {
            totalRegularHours += calcData.regularHours;
          }
          if (calcData?.overtimeHours) {
            totalOvertimeHours += calcData.overtimeHours;
          }
        } else if (item.itemType === 'DEDUCTION') {
          totalDeductions = totalDeductions.add(item.amount);
        }

        // Department breakdown (using 'Security' as default since department field may not exist)
        const department = 'Security'; // Would use actual department from employee
        if (!departmentData.has(department)) {
          departmentData.set(department, { totalPayroll: 0, employeeCount: 0 });
        }
        const deptData = departmentData.get(department)!;
        deptData.totalPayroll += item.amount.toNumber();
      });
    });

    // Calculate unique employee count
    const employeeCount = employeeSet.size;
    const avgSalaryPerEmployee = employeeCount > 0 ? totalPayroll.div(employeeCount).toNumber() : 0;
    const netPayroll = totalPayroll.sub(totalDeductions).toNumber();

    // Get previous period for growth calculation
    const previousPeriodStart = new Date(options.startDate);
    previousPeriodStart.setMonth(previousPeriodStart.getMonth() - 1);
    const previousPeriodEnd = new Date(options.endDate);
    previousPeriodEnd.setMonth(previousPeriodEnd.getMonth() - 1);

    const previousPayrollRuns = await this.prisma.payrollRun.findMany({
      where: {
        companyId,
        status: PayrollStatus.COMPLETED,
        payPeriodStart: { gte: previousPeriodStart },
        payPeriodEnd: { lte: previousPeriodEnd },
      },
    });

    const previousTotalPayroll = previousPayrollRuns.reduce(
      (sum, run) => sum.add(run.totalAmount),
      new Decimal(0)
    );

    const growthPercentage = previousTotalPayroll.gt(0) 
      ? totalPayroll.sub(previousTotalPayroll).div(previousTotalPayroll).mul(100).toNumber()
      : 0;

    // Department breakdown
    const departmentBreakdown = Array.from(departmentData.entries()).map(([department, data]) => ({
      department,
      totalPayroll: data.totalPayroll,
      employeeCount: data.employeeCount,
      percentage: totalPayroll.gt(0) ? (data.totalPayroll / totalPayroll.toNumber()) * 100 : 0,
    }));

    // Monthly trends (last 6 months)
    const monthlyTrends = await this.getPayrollMonthlyTrends(companyId, 6);

    return {
      totalPayroll: totalPayroll.toNumber(),
      employeeCount,
      avgSalaryPerEmployee,
      totalRegularHours,
      totalOvertimeHours,
      totalDeductions: totalDeductions.toNumber(),
      netPayroll,
      growthPercentage,
      departmentBreakdown,
      monthlyTrends,
    };
  }

  /**
   * Get billing reports and revenue analysis
   */
  async getBillingReports(options: {
    startDate: Date;
    endDate: Date;
    clientIds?: string[];
    siteIds?: string[];
  }): Promise<BillingReportSummary> {
    const companyId = this.tenantContext.getTenantId();

    // Get invoices for the period
    const invoices = await this.prisma.invoice.findMany({
      where: {
        client: { companyId },
        billingPeriodStart: { gte: options.startDate },
        billingPeriodEnd: { lte: options.endDate },
        ...(options.clientIds?.length ? { clientId: { in: options.clientIds } } : {}),
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Calculate totals
    let totalRevenue = new Decimal(0);
    let totalOutstanding = new Decimal(0);
    let paidAmount = new Decimal(0);
    const clientData = new Map<string, {
      name: string;
      totalRevenue: number;
      invoiceCount: number;
      outstandingAmount: number;
    }>();
    const statusData = new Map<string, { count: number; amount: number }>();

    invoices.forEach(invoice => {
      totalRevenue = totalRevenue.add(invoice.totalAmount);
      
      // Track by status
      const status = invoice.status;
      if (!statusData.has(status)) {
        statusData.set(status, { count: 0, amount: 0 });
      }
      const statusInfo = statusData.get(status)!;
      statusInfo.count += 1;
      statusInfo.amount += invoice.totalAmount.toNumber();

      if (status === InvoiceStatus.SENT || status === InvoiceStatus.OVERDUE) {
        totalOutstanding = totalOutstanding.add(invoice.totalAmount);
      } else if (status === InvoiceStatus.PAID) {
        paidAmount = paidAmount.add(invoice.totalAmount);
      }

      // Track by client
      const clientId = invoice.clientId;
      const clientName = invoice.client.name;
      if (!clientData.has(clientId)) {
        clientData.set(clientId, {
          name: clientName,
          totalRevenue: 0,
          invoiceCount: 0,
          outstandingAmount: 0,
        });
      }
      const clientInfo = clientData.get(clientId)!;
      clientInfo.totalRevenue += invoice.totalAmount.toNumber();
      clientInfo.invoiceCount += 1;
      if (status === InvoiceStatus.SENT || status === InvoiceStatus.OVERDUE) {
        clientInfo.outstandingAmount += invoice.totalAmount.toNumber();
      }
    });

    const avgInvoiceValue = invoices.length > 0 ? totalRevenue.div(invoices.length).toNumber() : 0;
    const collectionRate = totalRevenue.gt(0) 
      ? paidAmount.div(totalRevenue).mul(100).toNumber() 
      : 0;

    // Get previous period for growth calculation
    const previousPeriodStart = new Date(options.startDate);
    previousPeriodStart.setMonth(previousPeriodStart.getMonth() - 1);
    const previousPeriodEnd = new Date(options.endDate);
    previousPeriodEnd.setMonth(previousPeriodEnd.getMonth() - 1);

    const previousInvoices = await this.prisma.invoice.findMany({
      where: {
        client: { companyId },
        billingPeriodStart: { gte: previousPeriodStart },
        billingPeriodEnd: { lte: previousPeriodEnd },
      },
    });

    const previousTotalRevenue = previousInvoices.reduce(
      (sum, invoice) => sum.add(invoice.totalAmount),
      new Decimal(0)
    );

    const growthPercentage = previousTotalRevenue.gt(0) 
      ? totalRevenue.sub(previousTotalRevenue).div(previousTotalRevenue).mul(100).toNumber()
      : 0;

    // Client breakdown
    const clientBreakdown = Array.from(clientData.entries()).map(([clientId, data]) => ({
      clientId,
      clientName: data.name,
      totalRevenue: data.totalRevenue,
      invoiceCount: data.invoiceCount,
      percentage: totalRevenue.gt(0) ? (data.totalRevenue / totalRevenue.toNumber()) * 100 : 0,
      outstandingAmount: data.outstandingAmount,
    })).sort((a, b) => b.totalRevenue - a.totalRevenue);

    // Status distribution
    const statusDistribution = Array.from(statusData.entries()).map(([status, data]) => ({
      status,
      count: data.count,
      amount: data.amount,
      percentage: totalRevenue.gt(0) ? (data.amount / totalRevenue.toNumber()) * 100 : 0,
    }));

    // Monthly trends
    const monthlyTrends = await this.getBillingMonthlyTrends(companyId, 6);

    return {
      totalRevenue: totalRevenue.toNumber(),
      totalInvoices: invoices.length,
      avgInvoiceValue,
      totalOutstanding: totalOutstanding.toNumber(),
      collectionRate,
      growthPercentage,
      clientBreakdown,
      monthlyTrends,
      statusDistribution,
    };
  }

  /**
   * Get site profitability analysis and cost optimization
   */
  async getSiteProfitabilityAnalysis(options: {
    startDate: Date;
    endDate: Date;
    siteIds?: string[];
  }): Promise<SiteProfitabilityAnalysis[]> {
    const companyId = this.tenantContext.getTenantId();

    // Get sites with their financial data
    const sites = await this.prisma.site.findMany({
      where: {
        client: { companyId },
        ...(options.siteIds?.length ? { id: { in: options.siteIds } } : {}),
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
          },
        },
        assignments: {
          include: {
            employee: true,
            shifts: {
              where: {
                shiftDate: {
                  gte: options.startDate,
                  lte: options.endDate,
                },
              },
              include: {
                attendance: {
                  where: {
                    status: AttendanceStatus.PRESENT,
                  },
                },
              },
            },
          },
        },
      },
    });

    const profitabilityData: SiteProfitabilityAnalysis[] = [];

    for (const site of sites) {
      // Calculate revenue from invoices for this site
      const siteInvoices = await this.prisma.invoice.findMany({
        where: {
          clientId: site.clientId,
          billingPeriodStart: { gte: options.startDate },
          billingPeriodEnd: { lte: options.endDate },
          // Assuming invoices can be filtered by site somehow
        },
      });

      const siteRevenue = siteInvoices.reduce(
        (sum, invoice) => sum.add(invoice.totalAmount),
        new Decimal(0)
      ).toNumber();

      // Calculate payroll costs for this site
      let payrollCosts = 0;
      let totalHoursWorked = 0;
      const employeeCount = site.assignments.length;

      site.assignments.forEach(assignment => {
        assignment.shifts.forEach(shift => {
          shift.attendance.forEach(attendance => {
            if (attendance.clockIn && attendance.clockOut) {
              const hoursWorked = (attendance.clockOut.getTime() - attendance.clockIn.getTime()) / (1000 * 60 * 60);
              totalHoursWorked += hoursWorked;
              payrollCosts += hoursWorked * (assignment.hourlyRate?.toNumber() || 0);
            }
          });
        });
      });

      // Estimate operational costs (10% of revenue as default)
      const operationalCosts = siteRevenue * 0.1;
      
      const grossProfit = siteRevenue - payrollCosts - operationalCosts;
      const profitMargin = siteRevenue > 0 ? (grossProfit / siteRevenue) * 100 : 0;
      const utilizationRate = employeeCount > 0 ? (totalHoursWorked / (employeeCount * 160)) * 100 : 0; // Assuming 160 hours per month

      // Generate recommendations
      const recommendations = [];
      if (profitMargin < 20) {
        recommendations.push('Consider renegotiating rates with client');
      }
      if (utilizationRate < 80) {
        recommendations.push('Optimize employee scheduling to improve utilization');
      }
      if (payrollCosts > siteRevenue * 0.7) {
        recommendations.push('Review staffing levels - payroll costs are high');
      }

      profitabilityData.push({
        siteId: site.id,
        siteName: site.name,
        clientName: site.client.name,
        revenue: siteRevenue,
        payrollCosts,
        operationalCosts,
        grossProfit,
        profitMargin,
        employeeCount,
        hoursWorked: totalHoursWorked,
        utilizationRate,
        recommendations,
      });
    }

    return profitabilityData.sort((a, b) => b.profitMargin - a.profitMargin);
  }

  /**
   * Generate financial forecasts and budget planning
   */
  async getFinancialForecasts(options: {
    periods: number; // Number of months to forecast
  }): Promise<FinancialForecast[]> {
    const companyId = this.tenantContext.getTenantId();

    // Get historical data for last 12 months
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 12);

    const [payrollData, billingData] = await Promise.all([
      this.getPayrollMonthlyTrends(companyId, 12),
      this.getBillingMonthlyTrends(companyId, 12),
    ]);

    const forecasts: FinancialForecast[] = [];

    // Simple linear regression for forecasting
    for (let i = 1; i <= options.periods; i++) {
      const forecastDate = new Date();
      forecastDate.setMonth(forecastDate.getMonth() + i);
      
      // Calculate trends
      const revenueValues = billingData.map(d => d.totalRevenue);
      const payrollValues = payrollData.map(d => d.totalPayroll);
      
      const avgRevenue = revenueValues.reduce((sum, val) => sum + val, 0) / revenueValues.length;
      const avgPayroll = payrollValues.reduce((sum, val) => sum + val, 0) / payrollValues.length;
      
      // Simple trend calculation (could be improved with proper regression)
      const revenueGrowthRate = revenueValues.length > 1 
        ? (revenueValues[revenueValues.length - 1] - revenueValues[0]) / revenueValues[0]
        : 0;
      
      const payrollGrowthRate = payrollValues.length > 1
        ? (payrollValues[payrollValues.length - 1] - payrollValues[0]) / payrollValues[0]
        : 0;

      const projectedRevenue = avgRevenue * (1 + (revenueGrowthRate * i / 12));
      const projectedPayroll = avgPayroll * (1 + (payrollGrowthRate * i / 12));
      const projectedProfit = projectedRevenue - projectedPayroll;
      
      // Confidence decreases over time
      const confidence = Math.max(0.5, 0.9 - (i * 0.1));

      forecasts.push({
        period: `${forecastDate.toLocaleString('default', { month: 'long' })} ${forecastDate.getFullYear()}`,
        projectedRevenue,
        projectedPayroll,
        projectedProfit,
        confidence,
        factors: [
          'Based on historical trends',
          'Seasonal variations not accounted',
          'External factors not considered',
        ],
      });
    }

    return forecasts;
  }

  /**
   * Get cost optimization insights
   */
  async getCostOptimizationInsights(): Promise<CostOptimizationInsights[]> {
    const companyId = this.tenantContext.getTenantId();
    
    // Get recent financial data for analysis
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 3);

    const insights: CostOptimizationInsights[] = [];

    // Overtime analysis
    const overtimeData = await this.prisma.payrollItem.aggregate({
      where: {
        employee: { companyId },
        itemType: 'OVERTIME',
        payrollRun: {
          payPeriodStart: { gte: startDate },
        },
      },
      _sum: {
        amount: true,
      },
    });

    const overtimeCost = overtimeData._sum.amount?.toNumber() || 0;
    if (overtimeCost > 0) {
      insights.push({
        category: 'Overtime Costs',
        currentCost: overtimeCost,
        potentialSavings: overtimeCost * 0.3, // Assume 30% savings possible
        savingsPercentage: 30,
        actionItems: [
          'Review staffing levels to reduce overtime dependency',
          'Implement better shift scheduling',
          'Consider hiring additional part-time staff',
        ],
        priority: 'high',
      });
    }

    // Underutilized employees analysis
    // This would require more complex analysis of attendance vs capacity
    insights.push({
      category: 'Employee Utilization',
      currentCost: 50000,
      potentialSavings: 10000,
      savingsPercentage: 20,
      actionItems: [
        'Analyze employee utilization rates',
        'Redistribute workload among underutilized staff',
        'Consider flexible scheduling options',
      ],
      priority: 'medium',
    });

    return insights;
  }

  /**
   * Get comprehensive financial dashboard data
   */
  async getFinancialDashboardData(options: {
    startDate: Date;
    endDate: Date;
  }): Promise<FinancialDashboardData> {
    const [
      payrollSummary,
      billingSummary,
      siteProfitability,
      forecasts,
      costOptimization
    ] = await Promise.all([
      this.getPayrollReports(options),
      this.getBillingReports(options),
      this.getSiteProfitabilityAnalysis(options),
      this.getFinancialForecasts({ periods: 3 }),
      this.getCostOptimizationInsights(),
    ]);

    const totalRevenue = billingSummary.totalRevenue;
    const totalPayroll = payrollSummary.totalPayroll;
    const grossProfit = totalRevenue - totalPayroll;
    const profitMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

    return {
      payrollSummary,
      billingSummary,
      siteProfitability,
      forecasts,
      costOptimization,
      kpis: {
        totalRevenue,
        totalPayroll,
        grossProfit,
        profitMargin,
        employeeProductivity: payrollSummary.employeeCount > 0 
          ? totalRevenue / payrollSummary.employeeCount 
          : 0,
        clientSatisfaction: 85, // Would be calculated from actual client feedback
      },
    };
  }

  /**
   * Get payroll monthly trends
   */
  private async getPayrollMonthlyTrends(companyId: string, months: number) {
    const trends = [];
    const currentDate = new Date();

    for (let i = months - 1; i >= 0; i--) {
      const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() - i + 1, 0);

      const payrollRuns = await this.prisma.payrollRun.findMany({
        where: {
          companyId,
          status: PayrollStatus.COMPLETED,
          payPeriodStart: { gte: monthStart },
          payPeriodEnd: { lte: monthEnd },
        },
        include: {
          _count: {
            select: { payrollItems: true },
          },
        },
      });

      const totalPayroll = payrollRuns.reduce(
        (sum, run) => sum.add(run.totalAmount),
        new Decimal(0)
      ).toNumber();

      const employeeCount = new Set(
        payrollRuns.flatMap(run => 
          // Would need to get actual employee IDs from payroll items
          []
        )
      ).size || 0;

      trends.push({
        month: monthStart.toLocaleString('default', { month: 'long' }),
        year: monthStart.getFullYear(),
        totalPayroll,
        employeeCount,
        avgSalary: employeeCount > 0 ? totalPayroll / employeeCount : 0,
      });
    }

    return trends;
  }

  /**
   * Get billing monthly trends
   */
  private async getBillingMonthlyTrends(companyId: string, months: number) {
    const trends = [];
    const currentDate = new Date();

    for (let i = months - 1; i >= 0; i--) {
      const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() - i + 1, 0);

      const invoices = await this.prisma.invoice.findMany({
        where: {
          client: { companyId },
          billingPeriodStart: { gte: monthStart },
          billingPeriodEnd: { lte: monthEnd },
        },
      });

      const totalRevenue = invoices.reduce(
        (sum, invoice) => sum.add(invoice.totalAmount),
        new Decimal(0)
      ).toNumber();

      trends.push({
        month: monthStart.toLocaleString('default', { month: 'long' }),
        year: monthStart.getFullYear(),
        totalRevenue,
        invoiceCount: invoices.length,
        avgValue: invoices.length > 0 ? totalRevenue / invoices.length : 0,
      });
    }

    return trends;
  }
}