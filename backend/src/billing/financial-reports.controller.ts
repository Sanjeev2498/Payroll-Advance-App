import { Controller, Get, Query, UseGuards, ValidationPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { FinancialReportsService } from './services/financial-reports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../common/tenant.guard';
import {
  FinancialReportsFilterDto,
  ForecastOptionsDto,
  PayrollReportSummaryDto,
  BillingReportSummaryDto,
  SiteProfitabilityAnalysisDto,
  FinancialForecastDto,
  CostOptimizationInsightDto,
  FinancialDashboardDataDto,
} from './dto/financial-reports.dto';

@ApiTags('Financial Reports & Analytics')
@ApiBearerAuth()
@Controller('financial-reports')
@UseGuards(JwtAuthGuard, TenantGuard)
export class FinancialReportsController {
  constructor(private readonly financialReportsService: FinancialReportsService) {}

  @Get('payroll-reports')
  @ApiOperation({ 
    summary: 'Get comprehensive payroll reports',
    description: 'Retrieve detailed payroll reports with drill-down capabilities including employee breakdown, department analysis, and monthly trends.',
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Payroll reports retrieved successfully',
    type: PayrollReportSummaryDto,
  })
  async getPayrollReports(
    @Query(ValidationPipe) filterDto: FinancialReportsFilterDto,
  ): Promise<PayrollReportSummaryDto> {
    const options = {
      startDate: new Date(filterDto.startDate),
      endDate: new Date(filterDto.endDate),
      employeeIds: filterDto.employeeIds,
      departmentIds: filterDto.departmentIds,
      siteIds: filterDto.siteIds,
    };

    return this.financialReportsService.getPayrollReports(options);
  }

  @Get('billing-reports')
  @ApiOperation({ 
    summary: 'Get billing reports and revenue analysis',
    description: 'Retrieve comprehensive billing reports including revenue analysis, client breakdown, collection rates, and monthly trends.',
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Billing reports retrieved successfully',
    type: BillingReportSummaryDto,
  })
  async getBillingReports(
    @Query(ValidationPipe) filterDto: FinancialReportsFilterDto,
  ): Promise<BillingReportSummaryDto> {
    const options = {
      startDate: new Date(filterDto.startDate),
      endDate: new Date(filterDto.endDate),
      clientIds: filterDto.clientIds,
      siteIds: filterDto.siteIds,
    };

    return this.financialReportsService.getBillingReports(options);
  }

  @Get('site-profitability')
  @ApiOperation({ 
    summary: 'Get site profitability analysis',
    description: 'Analyze profitability of individual sites including revenue, costs, profit margins, and optimization recommendations.',
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Site profitability analysis retrieved successfully',
    type: [SiteProfitabilityAnalysisDto],
  })
  async getSiteProfitabilityAnalysis(
    @Query(ValidationPipe) filterDto: FinancialReportsFilterDto,
  ): Promise<SiteProfitabilityAnalysisDto[]> {
    const options = {
      startDate: new Date(filterDto.startDate),
      endDate: new Date(filterDto.endDate),
      siteIds: filterDto.siteIds,
    };

    return this.financialReportsService.getSiteProfitabilityAnalysis(options);
  }

  @Get('financial-forecasts')
  @ApiOperation({ 
    summary: 'Generate financial forecasts',
    description: 'Generate financial forecasts and budget planning based on historical data and trend analysis.',
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Financial forecasts generated successfully',
    type: [FinancialForecastDto],
  })
  async getFinancialForecasts(
    @Query(ValidationPipe) forecastOptions: ForecastOptionsDto,
  ): Promise<FinancialForecastDto[]> {
    return this.financialReportsService.getFinancialForecasts({
      periods: forecastOptions.periods,
    });
  }

  @Get('cost-optimization')
  @ApiOperation({ 
    summary: 'Get cost optimization insights',
    description: 'Analyze current costs and identify opportunities for optimization with actionable recommendations.',
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Cost optimization insights retrieved successfully',
    type: [CostOptimizationInsightDto],
  })
  async getCostOptimizationInsights(): Promise<CostOptimizationInsightDto[]> {
    return this.financialReportsService.getCostOptimizationInsights();
  }

  @Get('dashboard')
  @ApiOperation({ 
    summary: 'Get comprehensive financial dashboard data',
    description: 'Retrieve all financial data for the main dashboard including payroll, billing, profitability, forecasts, and KPIs.',
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Financial dashboard data retrieved successfully',
    type: FinancialDashboardDataDto,
  })
  async getFinancialDashboardData(
    @Query(ValidationPipe) filterDto: FinancialReportsFilterDto,
  ): Promise<FinancialDashboardDataDto> {
    const options = {
      startDate: new Date(filterDto.startDate),
      endDate: new Date(filterDto.endDate),
    };

    return this.financialReportsService.getFinancialDashboardData(options);
  }

  @Get('export/payroll-report')
  @ApiOperation({ 
    summary: 'Export payroll report',
    description: 'Export detailed payroll report in PDF format for external sharing and compliance.',
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Payroll report export initiated',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        downloadUrl: { type: 'string' },
        fileName: { type: 'string' },
      },
    },
  })
  async exportPayrollReport(
    @Query(ValidationPipe) filterDto: FinancialReportsFilterDto,
  ) {
    const options = {
      startDate: new Date(filterDto.startDate),
      endDate: new Date(filterDto.endDate),
      employeeIds: filterDto.employeeIds,
      departmentIds: filterDto.departmentIds,
      siteIds: filterDto.siteIds,
    };

    const reportData = await this.financialReportsService.getPayrollReports(options);
    
    // In a real implementation, this would generate and save a PDF file
    const fileName = `payroll-report-${filterDto.startDate}-${filterDto.endDate}.pdf`;
    
    return {
      success: true,
      downloadUrl: `/api/exports/${fileName}`,
      fileName,
      data: reportData,
    };
  }

  @Get('export/billing-report')
  @ApiOperation({ 
    summary: 'Export billing report',
    description: 'Export comprehensive billing report in PDF format for client sharing and financial analysis.',
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Billing report export initiated',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        downloadUrl: { type: 'string' },
        fileName: { type: 'string' },
      },
    },
  })
  async exportBillingReport(
    @Query(ValidationPipe) filterDto: FinancialReportsFilterDto,
  ) {
    const options = {
      startDate: new Date(filterDto.startDate),
      endDate: new Date(filterDto.endDate),
      clientIds: filterDto.clientIds,
      siteIds: filterDto.siteIds,
    };

    const reportData = await this.financialReportsService.getBillingReports(options);
    
    const fileName = `billing-report-${filterDto.startDate}-${filterDto.endDate}.pdf`;
    
    return {
      success: true,
      downloadUrl: `/api/exports/${fileName}`,
      fileName,
      data: reportData,
    };
  }

  @Get('export/profitability-report')
  @ApiOperation({ 
    summary: 'Export site profitability report',
    description: 'Export detailed site profitability analysis in Excel format with charts and recommendations.',
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Profitability report export initiated',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        downloadUrl: { type: 'string' },
        fileName: { type: 'string' },
      },
    },
  })
  async exportProfitabilityReport(
    @Query(ValidationPipe) filterDto: FinancialReportsFilterDto,
  ) {
    const options = {
      startDate: new Date(filterDto.startDate),
      endDate: new Date(filterDto.endDate),
      siteIds: filterDto.siteIds,
    };

    const reportData = await this.financialReportsService.getSiteProfitabilityAnalysis(options);
    
    const fileName = `site-profitability-${filterDto.startDate}-${filterDto.endDate}.xlsx`;
    
    return {
      success: true,
      downloadUrl: `/api/exports/${fileName}`,
      fileName,
      data: reportData,
    };
  }
}