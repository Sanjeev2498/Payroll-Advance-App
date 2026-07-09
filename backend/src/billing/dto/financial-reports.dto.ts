import { IsDateString, IsOptional, IsArray, IsString, IsNumber, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class FinancialReportsFilterDto {
  @ApiProperty({
    description: 'Start date for the report period',
    example: '2024-01-01T00:00:00Z',
  })
  @IsDateString()
  startDate: string;

  @ApiProperty({
    description: 'End date for the report period',
    example: '2024-12-31T23:59:59Z',
  })
  @IsDateString()
  endDate: string;

  @ApiPropertyOptional({
    description: 'Filter by specific employee IDs',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  employeeIds?: string[];

  @ApiPropertyOptional({
    description: 'Filter by specific client IDs',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  clientIds?: string[];

  @ApiPropertyOptional({
    description: 'Filter by specific site IDs',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  siteIds?: string[];

  @ApiPropertyOptional({
    description: 'Filter by department IDs',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  departmentIds?: string[];
}

export class ForecastOptionsDto {
  @ApiProperty({
    description: 'Number of periods to forecast (months)',
    minimum: 1,
    maximum: 12,
    example: 6,
  })
  @IsNumber()
  @Min(1)
  @Max(12)
  @Transform(({ value }) => parseInt(value))
  periods: number;
}

export class PayrollReportSummaryDto {
  @ApiProperty({ description: 'Total payroll amount', example: 2500000 })
  totalPayroll: number;

  @ApiProperty({ description: 'Number of employees', example: 50 })
  employeeCount: number;

  @ApiProperty({ description: 'Average salary per employee', example: 50000 })
  avgSalaryPerEmployee: number;

  @ApiProperty({ description: 'Total regular hours worked', example: 8000 })
  totalRegularHours: number;

  @ApiProperty({ description: 'Total overtime hours worked', example: 400 })
  totalOvertimeHours: number;

  @ApiProperty({ description: 'Total deductions', example: 150000 })
  totalDeductions: number;

  @ApiProperty({ description: 'Net payroll after deductions', example: 2350000 })
  netPayroll: number;

  @ApiProperty({ description: 'Growth percentage from previous period', example: 12.5 })
  growthPercentage: number;

  @ApiProperty({ 
    description: 'Payroll breakdown by department',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        department: { type: 'string', example: 'Security' },
        totalPayroll: { type: 'number', example: 1500000 },
        employeeCount: { type: 'number', example: 30 },
        percentage: { type: 'number', example: 60 },
      },
    },
  })
  departmentBreakdown: {
    department: string;
    totalPayroll: number;
    employeeCount: number;
    percentage: number;
  }[];

  @ApiProperty({
    description: 'Monthly payroll trends',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        month: { type: 'string', example: 'January' },
        year: { type: 'number', example: 2024 },
        totalPayroll: { type: 'number', example: 2500000 },
        employeeCount: { type: 'number', example: 50 },
        avgSalary: { type: 'number', example: 50000 },
      },
    },
  })
  monthlyTrends: {
    month: string;
    year: number;
    totalPayroll: number;
    employeeCount: number;
    avgSalary: number;
  }[];
}

export class BillingReportSummaryDto {
  @ApiProperty({ description: 'Total revenue', example: 3000000 })
  totalRevenue: number;

  @ApiProperty({ description: 'Total number of invoices', example: 120 })
  totalInvoices: number;

  @ApiProperty({ description: 'Average invoice value', example: 25000 })
  avgInvoiceValue: number;

  @ApiProperty({ description: 'Total outstanding amount', example: 450000 })
  totalOutstanding: number;

  @ApiProperty({ description: 'Collection rate percentage', example: 85.5 })
  collectionRate: number;

  @ApiProperty({ description: 'Revenue growth percentage', example: 18.2 })
  growthPercentage: number;

  @ApiProperty({
    description: 'Revenue breakdown by client',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        clientId: { type: 'string', example: 'client-123' },
        clientName: { type: 'string', example: 'Tech Corp Ltd' },
        totalRevenue: { type: 'number', example: 750000 },
        invoiceCount: { type: 'number', example: 30 },
        percentage: { type: 'number', example: 25 },
        outstandingAmount: { type: 'number', example: 125000 },
      },
    },
  })
  clientBreakdown: {
    clientId: string;
    clientName: string;
    totalRevenue: number;
    invoiceCount: number;
    percentage: number;
    outstandingAmount: number;
  }[];

  @ApiProperty({
    description: 'Monthly billing trends',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        month: { type: 'string', example: 'January' },
        year: { type: 'number', example: 2024 },
        totalRevenue: { type: 'number', example: 250000 },
        invoiceCount: { type: 'number', example: 10 },
        avgValue: { type: 'number', example: 25000 },
      },
    },
  })
  monthlyTrends: {
    month: string;
    year: number;
    totalRevenue: number;
    invoiceCount: number;
    avgValue: number;
  }[];

  @ApiProperty({
    description: 'Invoice status distribution',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'PAID' },
        count: { type: 'number', example: 80 },
        amount: { type: 'number', example: 2000000 },
        percentage: { type: 'number', example: 66.7 },
      },
    },
  })
  statusDistribution: {
    status: string;
    count: number;
    amount: number;
    percentage: number;
  }[];
}

export class SiteProfitabilityAnalysisDto {
  @ApiProperty({ description: 'Site ID', example: 'site-123' })
  siteId: string;

  @ApiProperty({ description: 'Site name', example: 'Corporate Tower A' })
  siteName: string;

  @ApiProperty({ description: 'Client name', example: 'Tech Corp Ltd' })
  clientName: string;

  @ApiProperty({ description: 'Total revenue from site', example: 500000 })
  revenue: number;

  @ApiProperty({ description: 'Payroll costs for site', example: 300000 })
  payrollCosts: number;

  @ApiProperty({ description: 'Operational costs', example: 50000 })
  operationalCosts: number;

  @ApiProperty({ description: 'Gross profit', example: 150000 })
  grossProfit: number;

  @ApiProperty({ description: 'Profit margin percentage', example: 30 })
  profitMargin: number;

  @ApiProperty({ description: 'Number of employees assigned', example: 8 })
  employeeCount: number;

  @ApiProperty({ description: 'Total hours worked', example: 1280 })
  hoursWorked: number;

  @ApiProperty({ description: 'Employee utilization rate', example: 95.5 })
  utilizationRate: number;

  @ApiProperty({
    description: 'Optimization recommendations',
    type: [String],
    example: ['Consider renegotiating rates with client', 'Optimize employee scheduling'],
  })
  recommendations: string[];
}

export class FinancialForecastDto {
  @ApiProperty({ description: 'Forecast period', example: 'March 2024' })
  period: string;

  @ApiProperty({ description: 'Projected revenue', example: 2800000 })
  projectedRevenue: number;

  @ApiProperty({ description: 'Projected payroll', example: 2100000 })
  projectedPayroll: number;

  @ApiProperty({ description: 'Projected profit', example: 700000 })
  projectedProfit: number;

  @ApiProperty({ description: 'Confidence level (0-1)', example: 0.85 })
  confidence: number;

  @ApiProperty({
    description: 'Factors affecting forecast',
    type: [String],
    example: ['Based on historical trends', 'Seasonal variations not accounted'],
  })
  factors: string[];
}

export class CostOptimizationInsightDto {
  @ApiProperty({ description: 'Cost category', example: 'Overtime Costs' })
  category: string;

  @ApiProperty({ description: 'Current cost', example: 180000 })
  currentCost: number;

  @ApiProperty({ description: 'Potential savings', example: 54000 })
  potentialSavings: number;

  @ApiProperty({ description: 'Savings percentage', example: 30 })
  savingsPercentage: number;

  @ApiProperty({
    description: 'Recommended action items',
    type: [String],
    example: ['Review staffing levels', 'Implement better shift scheduling'],
  })
  actionItems: string[];

  @ApiProperty({ 
    description: 'Priority level',
    enum: ['high', 'medium', 'low'],
    example: 'high',
  })
  priority: 'high' | 'medium' | 'low';
}

export class FinancialDashboardDataDto {
  @ApiProperty({ description: 'Payroll summary data' })
  payrollSummary: PayrollReportSummaryDto;

  @ApiProperty({ description: 'Billing summary data' })
  billingSummary: BillingReportSummaryDto;

  @ApiProperty({ 
    description: 'Site profitability analysis',
    type: [SiteProfitabilityAnalysisDto],
  })
  siteProfitability: SiteProfitabilityAnalysisDto[];

  @ApiProperty({ 
    description: 'Financial forecasts',
    type: [FinancialForecastDto],
  })
  forecasts: FinancialForecastDto[];

  @ApiProperty({ 
    description: 'Cost optimization insights',
    type: [CostOptimizationInsightDto],
  })
  costOptimization: CostOptimizationInsightDto[];

  @ApiProperty({
    description: 'Key performance indicators',
    type: 'object',
    properties: {
      totalRevenue: { type: 'number', example: 3000000 },
      totalPayroll: { type: 'number', example: 2500000 },
      grossProfit: { type: 'number', example: 500000 },
      profitMargin: { type: 'number', example: 16.67 },
      employeeProductivity: { type: 'number', example: 60000 },
      clientSatisfaction: { type: 'number', example: 85 },
    },
  })
  kpis: {
    totalRevenue: number;
    totalPayroll: number;
    grossProfit: number;
    profitMargin: number;
    employeeProductivity: number;
    clientSatisfaction: number;
  };
}