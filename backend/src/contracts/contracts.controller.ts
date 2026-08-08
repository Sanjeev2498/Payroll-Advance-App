import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  ParseUUIDPipe,
  ParseIntPipe,
  DefaultValuePipe,
  Logger,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { ContractPermissions } from '../auth/enums/permissions.enum';
import { ContractsService } from './contracts.service';
import { CreateContractDto } from './dto/create-contract.dto';
import { UpdateContractDto } from './dto/update-contract.dto';
import { CreateContractAmendmentDto, ApproveAmendmentDto } from './dto/contract-amendment.dto';
import { InitiateRenewalDto, ApproveRenewalDto } from './dto/contract-renewal.dto';
import { CreateSLAComplianceReportDto, SLAComplianceQueryDto } from './dto/sla-compliance.dto';
import { ContractStatus } from '@prisma/client';

@ApiTags('Contracts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('contracts')
export class ContractsController {
  private readonly logger = new Logger(ContractsController.name);

  constructor(private readonly contractsService: ContractsService) {}

  @Post()
  @RequirePermissions(ContractPermissions.CREATE_CONTRACT)
  @ApiOperation({ summary: 'Create a new contract' })
  @ApiResponse({
    status: 201,
    description: 'Contract created successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid contract data provided',
  })
  @ApiResponse({
    status: 404,
    description: 'Client not found',
  })
  async create(@Body() createContractDto: CreateContractDto) {
    this.logger.log(`Creating contract for client: ${createContractDto.clientId}`);
    return this.contractsService.create(createContractDto);
  }

  @Get()
  @RequirePermissions(ContractPermissions.READ_CONTRACT)
  @ApiOperation({ summary: 'Get all contracts with pagination and filtering' })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (default: 10)',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ContractStatus,
    description: 'Filter by contract status',
  })
  @ApiQuery({
    name: 'clientId',
    required: false,
    type: String,
    description: 'Filter by client ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Contracts retrieved successfully',
  })
  async findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('status') status?: ContractStatus,
    @Query('clientId') clientId?: string,
  ) {
    this.logger.log(`Retrieving contracts - Page: ${page}, Limit: ${limit}`);
    return this.contractsService.findAll(page, limit, status, clientId);
  }

  @Get(':id')
  @RequirePermissions(ContractPermissions.READ_CONTRACT)
  @ApiOperation({ summary: 'Get contract by ID' })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Contract UUID',
  })
  @ApiResponse({
    status: 200,
    description: 'Contract retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Contract not found',
  })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    this.logger.log(`Retrieving contract: ${id}`);
    return this.contractsService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions(ContractPermissions.UPDATE_CONTRACT)
  @ApiOperation({ summary: 'Update contract' })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Contract UUID',
  })
  @ApiResponse({
    status: 200,
    description: 'Contract updated successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Contract not found',
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateContractDto: UpdateContractDto,
  ) {
    this.logger.log(`Updating contract: ${id}`);
    return this.contractsService.update(id, updateContractDto);
  }

  @Delete(':id')
  @RequirePermissions(ContractPermissions.DELETE_CONTRACT)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete contract (set status to TERMINATED)' })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Contract UUID',
  })
  @ApiResponse({
    status: 204,
    description: 'Contract deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Contract not found',
  })
  @ApiResponse({
    status: 400,
    description: 'Cannot delete contract with active sites',
  })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    this.logger.log(`Deleting contract: ${id}`);
    await this.contractsService.remove(id);
  }

  // Contract Amendment Management
  @Post(':id/amendments')
  @RequirePermissions(ContractPermissions.MANAGE_CONTRACT_AMENDMENTS)
  @ApiOperation({ summary: 'Create contract amendment' })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Contract UUID',
  })
  @ApiResponse({
    status: 201,
    description: 'Amendment created successfully',
  })
  async createAmendment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() amendmentDto: Omit<CreateContractAmendmentDto, 'contractId'>,
  ) {
    this.logger.log(`Creating amendment for contract: ${id}`);
    const fullAmendmentDto = { ...amendmentDto, contractId: id };
    return this.contractsService.createAmendment(fullAmendmentDto);
  }

  @Patch(':id/amendments/:amendmentId/approve')
  @RequirePermissions(ContractPermissions.APPROVE_CONTRACT)
  @ApiOperation({ summary: 'Approve or reject contract amendment' })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Contract UUID',
  })
  @ApiParam({
    name: 'amendmentId',
    type: String,
    description: 'Amendment ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Amendment approval processed successfully',
  })
  async approveAmendment(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('amendmentId') amendmentId: string,
    @Body() approvalDto: ApproveAmendmentDto,
  ) {
    this.logger.log(`Processing amendment approval: ${amendmentId} for contract: ${id}`);
    return this.contractsService.approveAmendment(id, amendmentId, approvalDto);
  }

  // Contract Renewal Management
  @Post(':id/renewals')
  @RequirePermissions(ContractPermissions.MANAGE_CONTRACT_RENEWALS)
  @ApiOperation({ summary: 'Initiate contract renewal' })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Contract UUID',
  })
  @ApiResponse({
    status: 201,
    description: 'Renewal initiated successfully',
  })
  async initiateRenewal(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() renewalDto: Omit<InitiateRenewalDto, 'contractId'>,
  ) {
    this.logger.log(`Initiating renewal for contract: ${id}`);
    const fullRenewalDto = { ...renewalDto, contractId: id };
    return this.contractsService.initiateRenewal(fullRenewalDto);
  }

  @Patch(':id/renewals/:renewalId/approve')
  @RequirePermissions(ContractPermissions.APPROVE_CONTRACT)
  @ApiOperation({ summary: 'Approve or reject contract renewal' })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Contract UUID',
  })
  @ApiParam({
    name: 'renewalId',
    type: String,
    description: 'Renewal ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Renewal approval processed successfully',
  })
  async approveRenewal(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('renewalId') renewalId: string,
    @Body() approvalDto: ApproveRenewalDto,
  ) {
    this.logger.log(`Processing renewal approval: ${renewalId} for contract: ${id}`);
    return this.contractsService.approveRenewal(id, renewalId, approvalDto);
  }

  // SLA Tracking and Compliance
  @Post(':id/sla-reports')
  @RequirePermissions(ContractPermissions.MANAGE_SLA_REPORTS)
  @ApiOperation({ summary: 'Create SLA compliance report' })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Contract UUID',
  })
  @ApiResponse({
    status: 201,
    description: 'SLA compliance report created successfully',
  })
  async createSLAReport(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() reportDto: Omit<CreateSLAComplianceReportDto, 'contractId'>,
  ) {
    this.logger.log(`Creating SLA report for contract: ${id}`);
    const fullReportDto = { ...reportDto, contractId: id };
    return this.contractsService.createSLAComplianceReport(fullReportDto);
  }

  @Get(':id/sla-compliance')
  @RequirePermissions(ContractPermissions.VIEW_SLA_COMPLIANCE)
  @ApiOperation({ summary: 'Get SLA compliance data and metrics' })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Contract UUID',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    type: String,
    description: 'Start date for compliance data (ISO format)',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    type: String,
    description: 'End date for compliance data (ISO format)',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Filter by compliance status',
  })
  @ApiQuery({
    name: 'siteId',
    required: false,
    type: String,
    description: 'Filter by site ID',
  })
  @ApiResponse({
    status: 200,
    description: 'SLA compliance data retrieved successfully',
  })
  async getSLACompliance(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: SLAComplianceQueryDto,
  ) {
    this.logger.log(`Retrieving SLA compliance for contract: ${id}`);
    return this.contractsService.getSLACompliance(id, query);
  }

  // Contract Analytics and Reports
  @Get(':id/performance-metrics')
  @RequirePermissions(ContractPermissions.VIEW_CONTRACT_ANALYTICS)
  @ApiOperation({ summary: 'Get contract performance metrics' })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Contract UUID',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    type: String,
    description: 'Start date for metrics (ISO format)',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    type: String,
    description: 'End date for metrics (ISO format)',
  })
  @ApiResponse({
    status: 200,
    description: 'Performance metrics retrieved successfully',
  })
  async getPerformanceMetrics(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    this.logger.log(`Retrieving performance metrics for contract: ${id}`);
    
    // Get contract with related data for performance calculation
    const contract = await this.contractsService.findOne(id);
    
    // Calculate performance metrics
    const metrics = {
      contractId: id,
      period: {
        startDate: startDate || contract.startDate,
        endDate: endDate || new Date().toISOString(),
      },
      financialMetrics: {
        totalRevenue: 0, // Calculate from invoices
        averageMonthlyRevenue: 0,
        outstandingAmount: 0,
      },
      operationalMetrics: {
        activeSites: (contract as any).sites?.filter((site: any) => site.operationalStatus === 'ACTIVE').length || 0,
        totalSites: (contract as any).sites?.length || 0,
        activeAssignments: 0, // Calculate from assignments
        staffingEfficiency: 0,
      },
      complianceMetrics: {
        slaCompliance: 0, // Calculate from SLA reports
        qualityScore: 0,
        incidentCount: 0,
      },
    };

    return metrics;
  }

  @Get(':id/billing-summary')
  @RequirePermissions(ContractPermissions.VIEW_CONTRACT_ANALYTICS)
  @ApiOperation({ summary: 'Get contract billing summary' })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Contract UUID',
  })
  @ApiQuery({
    name: 'year',
    required: false,
    type: Number,
    description: 'Year for billing summary (default: current year)',
  })
  @ApiResponse({
    status: 200,
    description: 'Billing summary retrieved successfully',
  })
  async getBillingSummary(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('year', new DefaultValuePipe(new Date().getFullYear()), ParseIntPipe) year: number,
  ) {
    this.logger.log(`Retrieving billing summary for contract: ${id}, year: ${year}`);
    
    const contract = await this.contractsService.findOne(id);
    
    // Calculate billing summary from invoices
    const billingSummary = {
      contractId: id,
      year,
      totalBilled: 0,
      totalPaid: 0,
      totalOutstanding: 0,
      invoiceCount: (contract as any).invoices?.length || 0,
      averageInvoiceAmount: 0,
      billingFrequency: (contract.billingPreferences as any)?.billingFrequency || 'MONTHLY',
      monthlyBreakdown: [], // Monthly billing breakdown
      paymentMetrics: {
        onTimePaymentRate: 0,
        averagePaymentDays: 0,
        overdueAmount: 0,
      },
    };

    return billingSummary;
  }
}