import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
  HttpStatus,
  Logger,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { DeploymentService } from './deployment.service';
import { 
  SiteDeploymentDetailDto,
  AssignmentConflictDto,
  DeploymentEfficiencyMetricsDto,
  DeploymentAnalyticsDto,
  QuickAssignDto,
  BulkAssignDto,
  EmergencyReplacementDto,
  UpdateSiteRequirementsDto,
  ResolveConflictDto,
  OptimizeDeploymentsDto,
  AssignmentRecommendationsDto,
  SiteHealthDto
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { 
  OperationsPermissions, 
  AssignmentPermissions,
  ReportingPermissions 
} from '../auth/enums/permissions.enum';

@ApiTags('Deployment Operations')
@ApiBearerAuth()
@Controller('deployment')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class DeploymentController {
  private readonly logger = new Logger(DeploymentController.name);

  constructor(private readonly deploymentService: DeploymentService) {}

  @Get('sites')
  @RequirePermissions([OperationsPermissions.VIEW_SITE_DEPLOYMENTS])
  @ApiOperation({
    summary: 'Get detailed site deployment information',
    description: 'Retrieve comprehensive deployment details for all active sites including staffing levels and operational status',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Site deployment details retrieved successfully',
    type: [SiteDeploymentDetailDto],
  })
  async getSiteDetails(): Promise<SiteDeploymentDetailDto[]> {
    this.logger.log('GET /deployment/sites - Fetching site deployment details');
    return await this.deploymentService.getSiteDetails();
  }

  @Get('conflicts')
  @RequirePermissions([OperationsPermissions.VIEW_ASSIGNMENT_CONFLICTS])
  @ApiOperation({
    summary: 'Get assignment conflicts',
    description: 'Retrieve active assignment conflicts that require resolution',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Assignment conflicts retrieved successfully',
    type: [AssignmentConflictDto],
  })
  async getAssignmentConflicts(): Promise<AssignmentConflictDto[]> {
    this.logger.log('GET /deployment/conflicts - Fetching assignment conflicts');
    return await this.deploymentService.getAssignmentConflicts();
  }

  @Get('efficiency')
  @RequirePermissions([ReportingPermissions.VIEW_OPERATIONAL_REPORTS])
  @ApiOperation({
    summary: 'Get deployment efficiency metrics',
    description: 'Retrieve deployment efficiency statistics, trends, and optimization opportunities',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Deployment efficiency metrics retrieved successfully',
    type: DeploymentEfficiencyMetricsDto,
  })
  async getEfficiencyMetrics(): Promise<DeploymentEfficiencyMetricsDto> {
    this.logger.log('GET /deployment/efficiency - Fetching deployment efficiency metrics');
    return await this.deploymentService.getEfficiencyMetrics();
  }

  @Get('analytics')
  @RequirePermissions([ReportingPermissions.VIEW_OPERATIONAL_REPORTS])
  @ApiOperation({
    summary: 'Get deployment analytics',
    description: 'Retrieve deployment analytics data for specified timeframe',
  })
  @ApiQuery({
    name: 'timeframe',
    required: false,
    enum: ['24h', '7d', '30d'],
    description: 'Analytics timeframe (default: 24h)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Deployment analytics retrieved successfully',
    type: DeploymentAnalyticsDto,
  })
  async getAnalytics(
    @Query('timeframe') timeframe: '24h' | '7d' | '30d' = '24h',
  ): Promise<DeploymentAnalyticsDto> {
    this.logger.log(`GET /deployment/analytics - Fetching deployment analytics (timeframe: ${timeframe})`);
    return await this.deploymentService.getAnalytics(timeframe);
  }

  @Get('recommendations/:siteId')
  @RequirePermissions([AssignmentPermissions.READ_ASSIGNMENT])
  @ApiOperation({
    summary: 'Get assignment recommendations',
    description: 'Get optimal guard assignment recommendations for a specific site',
  })
  @ApiParam({
    name: 'siteId',
    description: 'Site ID to get recommendations for',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Assignment recommendations retrieved successfully',
    type: AssignmentRecommendationsDto,
  })
  async getAssignmentRecommendations(
    @Param('siteId') siteId: string,
  ): Promise<AssignmentRecommendationsDto> {
    this.logger.log(`GET /deployment/recommendations/${siteId} - Getting assignment recommendations`);
    return await this.deploymentService.getAssignmentRecommendations(siteId);
  }

  @Get('sites/:siteId/health')
  @RequirePermissions([OperationsPermissions.VIEW_SITE_DEPLOYMENTS])
  @ApiOperation({
    summary: 'Get site operational health',
    description: 'Retrieve comprehensive health metrics for a specific site',
  })
  @ApiParam({
    name: 'siteId',
    description: 'Site ID to get health metrics for',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Site health metrics retrieved successfully',
    type: SiteHealthDto,
  })
  async getSiteHealth(@Param('siteId') siteId: string): Promise<SiteHealthDto> {
    this.logger.log(`GET /deployment/sites/${siteId}/health - Getting site health metrics`);
    return await this.deploymentService.getSiteHealth(siteId);
  }

  @Post('quick-assign')
  @RequirePermissions([AssignmentPermissions.CREATE_ASSIGNMENT])
  @ApiOperation({
    summary: 'Quick assign guard to site',
    description: 'Quickly assign an available guard to a site, with automatic matching if guard not specified',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Guard assigned successfully',
  })
  async quickAssign(@Body() quickAssignDto: QuickAssignDto): Promise<void> {
    this.logger.log(`POST /deployment/quick-assign - Quick assigning guard to site ${quickAssignDto.siteId}`);
    await this.deploymentService.quickAssign(quickAssignDto);
  }

  @Post('emergency-replacement')
  @RequirePermissions([AssignmentPermissions.CREATE_ASSIGNMENT])
  @ApiOperation({
    summary: 'Request emergency replacement',
    description: 'Request emergency guard replacement for a site',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Emergency replacement requested successfully',
  })
  async requestEmergencyReplacement(
    @Body() emergencyReplacementDto: EmergencyReplacementDto,
  ): Promise<void> {
    this.logger.log(`POST /deployment/emergency-replacement - Requesting emergency replacement for site ${emergencyReplacementDto.siteId}`);
    await this.deploymentService.requestEmergencyReplacement(emergencyReplacementDto);
  }

  @Post('bulk-assign')
  @RequirePermissions([AssignmentPermissions.CREATE_ASSIGNMENT])
  @ApiOperation({
    summary: 'Bulk assign guards',
    description: 'Process multiple guard assignments in a single operation',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Bulk assignments processed successfully',
  })
  async bulkAssign(@Body() bulkAssignDto: BulkAssignDto): Promise<void> {
    this.logger.log(`POST /deployment/bulk-assign - Processing ${bulkAssignDto.assignments.length} bulk assignments`);
    await this.deploymentService.bulkAssign(bulkAssignDto);
  }

  @Post('optimize')
  @RequirePermissions([OperationsPermissions.OPTIMIZE_DEPLOYMENTS])
  @ApiOperation({
    summary: 'Optimize deployments',
    description: 'Generate optimized deployment schedule based on constraints and priorities',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Deployment optimization completed successfully',
  })
  async optimizeDeployments(
    @Body() optimizeDto: OptimizeDeploymentsDto,
  ): Promise<any> {
    this.logger.log('POST /deployment/optimize - Optimizing deployments');
    return await this.deploymentService.optimizeDeployments(optimizeDto);
  }

  @Patch('sites/:siteId/requirements')
  @RequirePermissions([OperationsPermissions.MANAGE_SITE_REQUIREMENTS])
  @ApiOperation({
    summary: 'Update site requirements',
    description: 'Update staffing requirements and preferences for a specific site',
  })
  @ApiParam({
    name: 'siteId',
    description: 'Site ID to update requirements for',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Site requirements updated successfully',
  })
  async updateSiteRequirements(
    @Param('siteId') siteId: string,
    @Body() updateRequirementsDto: UpdateSiteRequirementsDto,
  ): Promise<void> {
    this.logger.log(`PATCH /deployment/sites/${siteId}/requirements - Updating site requirements`);
    await this.deploymentService.updateSiteRequirements(siteId, updateRequirementsDto);
  }

  @Post('conflicts/:conflictId/resolve')
  @RequirePermissions([OperationsPermissions.RESOLVE_CONFLICTS])
  @ApiOperation({
    summary: 'Resolve assignment conflict',
    description: 'Resolve a specific assignment conflict with the provided resolution strategy',
  })
  @ApiParam({
    name: 'conflictId',
    description: 'Conflict ID to resolve',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Conflict resolved successfully',
  })
  async resolveConflict(
    @Param('conflictId') conflictId: string,
    @Body() resolveConflictDto: ResolveConflictDto,
  ): Promise<void> {
    this.logger.log(`POST /deployment/conflicts/${conflictId}/resolve - Resolving assignment conflict`);
    await this.deploymentService.resolveConflict(conflictId, resolveConflictDto);
  }
}