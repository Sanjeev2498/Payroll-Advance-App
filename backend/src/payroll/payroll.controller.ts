import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Param, 
  Query, 
  UseGuards,
  ParseUUIDPipe,
  ParseIntPipe,
  HttpStatus,
  NotFoundException,
  Put,
  Patch
} from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiBearerAuth, 
  ApiQuery 
} from '@nestjs/swagger';
import { PayrollService } from './payroll.service';
import { 
  CreatePayrollRunDto, 
  PayrollSummary,
  PayrollRunFilterDto,
  PayrollRunApprovalDto,
  PayrollBatchProcessingDto,
  PayrollRunCorrectionDto,
  PayrollExportDto
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { PayrollPermissions } from '../auth/enums/permissions.enum';
import { TenantGuard } from '../common/tenant.guard';

@ApiTags('payroll')
@Controller('payroll')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@ApiBearerAuth()
export class PayrollController {
  constructor(private readonly payrollService: PayrollService) {}

  @Post('runs')
  @ApiOperation({ 
    summary: 'Create new payroll run',
    description: 'Initialize a new payroll run and calculate salaries for employees based on attendance data'
  })
  @ApiResponse({ 
    status: HttpStatus.CREATED, 
    description: 'Payroll run created successfully',
    type: PayrollSummary
  })
  @ApiResponse({ 
    status: HttpStatus.BAD_REQUEST, 
    description: 'Invalid input data or overlapping payroll periods' 
  })
  @ApiResponse({ 
    status: HttpStatus.FORBIDDEN, 
    description: 'Insufficient permissions to create payroll runs' 
  })
  @RequirePermissions(PayrollPermissions.CREATE_PAYROLL_RUN)
  async createPayrollRun(
    @Body() createPayrollRunDto: CreatePayrollRunDto,
  ): Promise<{ success: boolean; data: PayrollSummary }> {
    const result = await this.payrollService.createPayrollRun(createPayrollRunDto);
    
    return {
      success: true,
      data: result,
    };
  }

  @Get('runs')
  @ApiOperation({ 
    summary: 'List payroll runs',
    description: 'Get paginated list of payroll runs for the current company'
  })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Payroll runs retrieved successfully' 
  })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 20)' })
  @RequirePermissions(PayrollPermissions.READ_PAYROLL)
  async listPayrollRuns(
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 20,
  ) {
    const result = await this.payrollService.listPayrollRuns(page, limit);
    
    return {
      success: true,
      data: result.data,
      pagination: result.pagination,
    };
  }

  @Get('runs/:id')
  @ApiOperation({ 
    summary: 'Get payroll run details',
    description: 'Retrieve detailed information about a specific payroll run including all payroll items'
  })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Payroll run details retrieved successfully' 
  })
  @ApiResponse({ 
    status: HttpStatus.NOT_FOUND, 
    description: 'Payroll run not found' 
  })
  @RequirePermissions(PayrollPermissions.READ_PAYROLL)
  async getPayrollRun(
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const payrollRun = await this.payrollService.getPayrollRun(id);
    
    if (!payrollRun) {
      throw new NotFoundException(`Payroll run with ID ${id} not found`);
    }

    return {
      success: true,
      data: payrollRun,
    };
  }

  @Get('runs/:id/summary')
  @ApiOperation({ 
    summary: 'Get payroll run summary',
    description: 'Get aggregated summary statistics for a payroll run'
  })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Payroll run summary retrieved successfully' 
  })
  @ApiResponse({ 
    status: HttpStatus.NOT_FOUND, 
    description: 'Payroll run not found' 
  })
  @RequirePermissions(PayrollPermissions.READ_PAYROLL)
  async getPayrollRunSummary(
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const payrollRun = await this.payrollService.getPayrollRun(id);
    
    if (!payrollRun) {
      throw new NotFoundException(`Payroll run with ID ${id} not found`);
    }

    // Calculate summary from payroll items
    const summary = {
      payrollRunId: payrollRun.id,
      runNumber: payrollRun.runNumber,
      payPeriod: {
        start: payrollRun.payPeriodStart,
        end: payrollRun.payPeriodEnd,
      },
      status: payrollRun.status,
      employeeCount: new Set((payrollRun as any).payrollItems?.map((item: any) => item.employeeId) || []).size,
      totalAmount: payrollRun.totalAmount,
      processedAt: payrollRun.processedAt,
      itemBreakdown: this.calculateItemBreakdown((payrollRun as any).payrollItems || []),
    };

    return {
      success: true,
      data: summary,
    };
  }

  @Get('employees/:employeeId/history')
  @ApiOperation({ 
    summary: 'Get employee payroll history',
    description: 'Retrieve payroll history for a specific employee'
  })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Employee payroll history retrieved successfully' 
  })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of recent payroll runs to fetch (default: 12)' })
  @RequirePermissions(PayrollPermissions.READ_PAYROLL)
  async getEmployeePayrollHistory(
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 12,
  ) {
    // This would be implemented to get employee's payroll history
    // For now, returning a placeholder structure
    return {
      success: true,
      data: {
        employeeId,
        payrollHistory: [], // Would contain actual payroll items for this employee
        totalEarnings: 0,
        totalDeductions: 0,
      },
    };
  }

  @Post('runs/batch')
  @ApiOperation({ 
    summary: 'Create payroll run with batch processing',
    description: 'Create payroll run with advanced batch processing capabilities including dry run and error handling'
  })
  @ApiResponse({ 
    status: HttpStatus.CREATED, 
    description: 'Payroll batch processing completed' 
  })
  @RequirePermissions(PayrollPermissions.CREATE_PAYROLL_RUN)
  async createPayrollRunBatch(
    @Body() dto: PayrollBatchProcessingDto,
  ) {
    const result = await this.payrollService.createPayrollRunAdvanced(dto);
    
    return {
      success: result.success,
      data: result,
    };
  }

  @Get('runs/filtered')
  @ApiOperation({ 
    summary: 'Get filtered payroll runs',
    description: 'Get payroll runs with advanced filtering and pagination'
  })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Filtered payroll runs retrieved successfully' 
  })
  @RequirePermissions(PayrollPermissions.READ_PAYROLL)
  async getFilteredPayrollRuns(@Query() filter: PayrollRunFilterDto) {
    const result = await this.payrollService.getFilteredPayrollRuns(filter);
    
    return {
      success: true,
      data: result.data,
      pagination: result.pagination,
    };
  }

  @Patch('runs/:id/approval')
  @ApiOperation({ 
    summary: 'Approve or reject payroll run',
    description: 'Approve, reject, or request changes for a payroll run'
  })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Payroll run approval processed successfully' 
  })
  @RequirePermissions(PayrollPermissions.APPROVE_PAYROLL)
  async approvePayrollRun(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() approval: PayrollRunApprovalDto,
  ) {
    const result = await this.payrollService.approvePayrollRun(id, approval);
    
    return {
      success: true,
      data: result,
    };
  }

  @Patch('runs/:id/corrections')
  @ApiOperation({ 
    summary: 'Apply corrections to payroll run',
    description: 'Apply corrections to specific payroll items in a payroll run'
  })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Payroll corrections applied successfully' 
  })
  @RequirePermissions(PayrollPermissions.CORRECT_PAYROLL)
  async correctPayrollRun(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() corrections: PayrollRunCorrectionDto,
  ) {
    const result = await this.payrollService.correctPayrollRun(id, corrections);
    
    return {
      success: true,
      data: result,
    };
  }

  @Post('runs/:id/export')
  @ApiOperation({ 
    summary: 'Export payroll run',
    description: 'Export payroll run in various formats (PDF, Excel, CSV, JSON)'
  })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Payroll export generated successfully' 
  })
  @RequirePermissions(PayrollPermissions.EXPORT_PAYROLL)
  async exportPayrollRun(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() exportOptions: PayrollExportDto,
  ) {
    const result = await this.payrollService.exportPayrollRun(id, exportOptions);
    
    return {
      success: true,
      data: result,
    };
  }

  @Get('runs/:id/analytics')
  @ApiOperation({ 
    summary: 'Get payroll run analytics',
    description: 'Get comprehensive analytics and statistics for a payroll run'
  })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Payroll analytics retrieved successfully' 
  })
  @RequirePermissions(PayrollPermissions.READ_PAYROLL)
  async getPayrollRunAnalytics(
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const result = await this.payrollService.getPayrollRunAnalytics(id);
    
    return {
      success: true,
      data: result,
    };
  }

  /**
   * Helper method to calculate item breakdown from payroll items
   */
  private calculateItemBreakdown(payrollItems: any[]) {
    const breakdown = {
      basicPay: 0,
      overtime: 0,
      bonuses: 0,
      allowances: 0,
      taxDeductions: 0,
      socialSecurity: 0,
      healthInsurance: 0,
      otherDeductions: 0,
    };

    payrollItems.forEach(item => {
      const amount = parseFloat(item.amount.toString());
      
      switch (item.itemType) {
        case 'BASIC_PAY':
          breakdown.basicPay += amount;
          break;
        case 'OVERTIME':
          breakdown.overtime += amount;
          break;
        case 'BONUS':
          breakdown.bonuses += amount;
          break;
        case 'ALLOWANCE':
          breakdown.allowances += amount;
          break;
        case 'TAX_DEDUCTION':
          breakdown.taxDeductions += Math.abs(amount);
          break;
        case 'SOCIAL_SECURITY':
          breakdown.socialSecurity += Math.abs(amount);
          break;
        case 'HEALTH_INSURANCE':
          breakdown.healthInsurance += Math.abs(amount);
          break;
        case 'OTHER_DEDUCTION':
          breakdown.otherDeductions += Math.abs(amount);
          break;
      }
    });

    return breakdown;
  }
}