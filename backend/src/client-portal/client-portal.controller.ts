import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
  UseGuards,
  HttpStatus,
  ParseUUIDPipe,
  HttpCode,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { ClientPortalService } from './client-portal.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { ClientPermissions } from '../auth/enums/permissions.enum';
import {
  ClientDashboardDto,
  ClientDashboardResponseDto,
  GuardMonitoringQueryDto,
  GuardDeploymentResponseDto,
  ClientAttendanceQueryDto,
  ClientAttendanceResponseDto,
  AttendanceTrendsResponseDto,
  ClientInvoiceQueryDto,
  ClientBillingResponseDto,
  InvoiceDownloadResponseDto,
  ClientReportsQueryDto,
  ClientReportsResponseDto,
  ReportDownloadResponseDto,
  CommunicationResponseDto,
  CreateComplaintDto,
  CreateServiceRequestDto,
  GuardReplacementRequestDto,
} from './dto';

@ApiTags('Client Portal')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('client-portal')
export class ClientPortalController {
  constructor(private readonly clientPortalService: ClientPortalService) {}

  // Dashboard endpoints

  @Get('dashboard')
  @RequirePermissions(ClientPermissions.READ_CLIENT)
  @ApiOperation({
    summary: 'Get client dashboard',
    description: 'Retrieve real-time dashboard with site overview, guard deployment, and key metrics',
  })
  @ApiQuery({ name: 'clientId', description: 'Client ID', type: 'string' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Start date (ISO format)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'End date (ISO format)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Dashboard data retrieved successfully',
    type: ClientDashboardResponseDto,
  })
  async getDashboard(@Query() dto: ClientDashboardDto): Promise<ClientDashboardResponseDto> {
    return this.clientPortalService.getClientDashboard(dto);
  }

  // Guard monitoring endpoints

  @Get('guard-monitoring')
  @RequirePermissions(ClientPermissions.READ_CLIENT)
  @ApiOperation({
    summary: 'Get guard deployment monitoring',
    description: 'Monitor deployed guards in real-time with status, location, and performance metrics',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Guard monitoring data retrieved successfully',
    type: GuardDeploymentResponseDto,
  })
  async getGuardMonitoring(
    @Query() dto: GuardMonitoringQueryDto,
  ): Promise<GuardDeploymentResponseDto> {
    return this.clientPortalService.getGuardMonitoring(dto);
  }

  @Post('guard-replacement')
  @RequirePermissions(ClientPermissions.READ_CLIENT)
  @ApiOperation({
    summary: 'Request guard replacement',
    description: 'Submit a request for guard replacement with urgency and requirements',
  })
  @ApiBody({ type: GuardReplacementRequestDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Guard replacement request submitted successfully',
  })
  async requestGuardReplacement(
    @Body() dto: GuardReplacementRequestDto,
    @Query('clientId') clientId: string,
  ) {
    return this.clientPortalService.requestGuardReplacement(clientId, dto);
  }
  // Attendance management endpoints

  @Get('attendance')
  @RequirePermissions(ClientPermissions.READ_CLIENT)
  @ApiOperation({
    summary: 'Get attendance management data',
    description: 'View attendance records, real-time status, and site-specific attendance data',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Attendance data retrieved successfully',
    type: ClientAttendanceResponseDto,
  })
  async getAttendance(@Query() dto: ClientAttendanceQueryDto): Promise<ClientAttendanceResponseDto> {
    return this.clientPortalService.getClientAttendance(dto);
  }

  @Get('attendance/trends')
  @RequirePermissions(ClientPermissions.READ_CLIENT)
  @ApiOperation({
    summary: 'Get attendance trends and patterns',
    description: 'Analyze attendance trends, patterns, and site-wise comparisons',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Attendance trends retrieved successfully',
    type: AttendanceTrendsResponseDto,
  })
  async getAttendanceTrends(
    @Query() dto: ClientAttendanceQueryDto,
  ): Promise<AttendanceTrendsResponseDto> {
    return this.clientPortalService.getAttendanceTrends(dto);
  }

  // Invoice and billing endpoints

  @Get('billing')
  @RequirePermissions(ClientPermissions.VIEW_CLIENT_BILLING)
  @ApiOperation({
    summary: 'Get billing and invoice data',
    description: 'Access invoices, billing history, payment tracking, and service charges breakdown',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Billing data retrieved successfully',
    type: ClientBillingResponseDto,
  })
  async getBilling(@Query() dto: ClientInvoiceQueryDto): Promise<ClientBillingResponseDto> {
    return this.clientPortalService.getClientBilling(dto);
  }

  @Post('invoices/:invoiceId/download')
  @RequirePermissions(ClientPermissions.VIEW_CLIENT_BILLING)
  @ApiOperation({
    summary: 'Download invoice PDF',
    description: 'Generate and download invoice in PDF format',
  })
  @ApiParam({ name: 'invoiceId', description: 'Invoice ID' })
  @ApiQuery({ name: 'clientId', description: 'Client ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Invoice PDF generated successfully',
    type: InvoiceDownloadResponseDto,
  })
  async downloadInvoice(
    @Param('invoiceId', ParseUUIDPipe) invoiceId: string,
    @Query('clientId') clientId: string,
  ): Promise<InvoiceDownloadResponseDto> {
    return this.clientPortalService.downloadInvoice(clientId, invoiceId);
  }

  // Reports and analytics endpoints

  @Get('reports')
  @RequirePermissions(ClientPermissions.READ_CLIENT)
  @ApiOperation({
    summary: 'Get reports and analytics',
    description: 'Access comprehensive reports including site performance, deployment analytics, and service compliance',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Reports generated successfully',
    type: ClientReportsResponseDto,
  })
  async getReports(@Query() dto: ClientReportsQueryDto): Promise<ClientReportsResponseDto> {
    return this.clientPortalService.getClientReports(dto);
  }
  @Post('reports/download')
  @RequirePermissions(ClientPermissions.READ_CLIENT)
  @ApiOperation({
    summary: 'Download report',
    description: 'Generate and download reports in specified format (PDF, Excel, CSV)',
  })
  @ApiBody({ type: ClientReportsQueryDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Report download link generated successfully',
    type: ReportDownloadResponseDto,
  })
  async downloadReport(@Body() dto: ClientReportsQueryDto): Promise<ReportDownloadResponseDto> {
    return this.clientPortalService.downloadReport(dto);
  }

  // Communication endpoints

  @Get('communication')
  @RequirePermissions(ClientPermissions.READ_CLIENT)
  @ApiOperation({
    summary: 'Get communication data',
    description: 'View incident reports, complaints, service requests, and communication statistics',
  })
  @ApiQuery({ name: 'clientId', description: 'Client ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Communication data retrieved successfully',
    type: CommunicationResponseDto,
  })
  async getCommunicationData(@Query('clientId') clientId: string): Promise<CommunicationResponseDto> {
    return this.clientPortalService.getCommunicationData(clientId);
  }

  @Post('complaints')
  @RequirePermissions(ClientPermissions.READ_CLIENT)
  @ApiOperation({
    summary: 'Submit complaint',
    description: 'Raise complaints and issues with detailed information and attachments',
  })
  @ApiBody({ type: CreateComplaintDto })
  @ApiQuery({ name: 'clientId', description: 'Client ID' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Complaint submitted successfully',
  })
  @HttpCode(HttpStatus.CREATED)
  async submitComplaint(
    @Body() dto: CreateComplaintDto,
    @Query('clientId') clientId: string,
  ) {
    return this.clientPortalService.submitComplaint(clientId, dto);
  }

  @Post('service-requests')
  @RequirePermissions(ClientPermissions.READ_CLIENT)
  @ApiOperation({
    summary: 'Submit service request',
    description: 'Request additional services, modifications, or support with priority levels',
  })
  @ApiBody({ type: CreateServiceRequestDto })
  @ApiQuery({ name: 'clientId', description: 'Client ID' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Service request submitted successfully',
  })
  @HttpCode(HttpStatus.CREATED)
  async submitServiceRequest(
    @Body() dto: CreateServiceRequestDto,
    @Query('clientId') clientId: string,
  ) {
    return this.clientPortalService.submitServiceRequest(clientId, dto);
  }
}