import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpStatus,
  UseGuards,
  Logger,
  ParseUUIDPipe,
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
import { SitesService } from './sites.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { SitePermissions } from '../auth/enums/permissions.enum';
import {
  CreateSiteDto,
  UpdateSiteDto,
  SiteQueryDto,
  SiteResponseDto,
  SiteListResponseDto,
  SiteStatsResponseDto,
  SiteOperationalStatus,
} from './dto';

@ApiTags('Sites')
// @ApiBearerAuth() // Comment out for demo
// @UseGuards(JwtAuthGuard, PermissionsGuard) // Comment out for demo
@Controller('sites')
export class SitesController {
  private readonly logger = new Logger(SitesController.name);

  constructor(private readonly sitesService: SitesService) {}

  @Public() // Add public decorator for demo purposes
  @Post()
  // @RequirePermissions(SitePermissions.CREATE_SITE) // Comment out for demo
  @ApiOperation({
    summary: 'Create a new site',
    description:
      'Create a new site with location details, operational specifications, and client relationship',
  })
  @ApiBody({ type: CreateSiteDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Site successfully created',
    type: SiteResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data or business rule violation',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Client not found',
  })
  async create(@Body() createSiteDto: CreateSiteDto): Promise<SiteResponseDto> {
    this.logger.log('POST /sites - Creating new site');
    const site = await this.sitesService.create(createSiteDto);
    return this.mapToResponseDto(site);
  }

  @Public() // Add public decorator for demo purposes
  @Get()
  // @RequirePermissions(SitePermissions.READ_SITE) // Comment out for demo
  @ApiOperation({
    summary: 'Get all sites',
    description: 'Retrieve a paginated list of sites with optional filtering and search',
  })
  @ApiQuery({ name: 'search', required: false, description: 'Search by site name or address' })
  @ApiQuery({
    name: 'clientId',
    required: false,
    description: 'Filter by client ID',
  })
  @ApiQuery({
    name: 'operationalStatus',
    required: false,
    enum: SiteOperationalStatus,
    description: 'Filter by operational status',
  })
  @ApiQuery({ name: 'page', required: false, description: 'Page number (default: 1)' })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Items per page (default: 20, max: 100)',
  })
  @ApiQuery({ name: 'sortBy', required: false, description: 'Field to sort by' })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    enum: ['asc', 'desc'],
    description: 'Sort order',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of sites with pagination metadata',
    type: SiteListResponseDto,
  })
  async findAll(@Query() queryDto: SiteQueryDto): Promise<SiteListResponseDto> {
    this.logger.log('GET /sites - Fetching sites list');
    const result = await this.sitesService.findAll(queryDto);

    return {
      sites: result.sites.map((site) => this.mapToResponseDto(site)),
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    };
  }

  @Get('stats')
  @RequirePermissions(SitePermissions.READ_SITE)
  @ApiOperation({
    summary: 'Get site statistics',
    description: 'Retrieve aggregated statistics about sites (counts by status, assignments, etc.)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Site statistics',
    type: SiteStatsResponseDto,
  })
  async getStats(): Promise<SiteStatsResponseDto> {
    this.logger.log('GET /sites/stats - Fetching site statistics');
    return await this.sitesService.getStats();
  }

  @Get('by-client/:clientId')
  @RequirePermissions(SitePermissions.READ_SITE)
  @ApiOperation({
    summary: 'Get sites by client',
    description: 'Retrieve all sites belonging to a specific client',
  })
  @ApiParam({ name: 'clientId', description: 'Client UUID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of sites for the specified client',
    type: [SiteResponseDto],
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Client not found',
  })
  async findByClientId(
    @Param('clientId', ParseUUIDPipe) clientId: string,
  ): Promise<SiteResponseDto[]> {
    this.logger.log(`GET /sites/by-client/${clientId} - Fetching sites for client ${clientId}`);
    const sites = await this.sitesService.findByClientId(clientId);
    return sites.map((site) => this.mapToResponseDto(site));
  }

  @Get('by-status/:status')
  @RequirePermissions(SitePermissions.READ_SITE)
  @ApiOperation({
    summary: 'Get sites by operational status',
    description: 'Retrieve all sites with a specific operational status',
  })
  @ApiParam({
    name: 'status',
    enum: SiteOperationalStatus,
    description: 'Operational status to filter by',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of sites with the specified operational status',
    type: [SiteResponseDto],
  })
  async findByStatus(@Param('status') status: SiteOperationalStatus): Promise<SiteResponseDto[]> {
    this.logger.log(`GET /sites/by-status/${status} - Fetching sites with status ${status}`);
    const sites = await this.sitesService.findByOperationalStatus(status);
    return sites.map((site) => this.mapToResponseDto(site));
  }

  @Public() // Add public decorator for demo purposes
  @Get(':id')
  // @RequirePermissions(SitePermissions.READ_SITE) // Comment out for demo
  @ApiOperation({
    summary: 'Get site by ID',
    description:
      'Retrieve detailed information about a specific site including client and assignment data',
  })
  @ApiParam({ name: 'id', description: 'Site UUID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Site details',
    type: SiteResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Site not found',
  })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<SiteResponseDto> {
    this.logger.log(`GET /sites/${id} - Fetching site details`);
    const site = await this.sitesService.findOne(id);
    return this.mapToResponseDto(site);
  }

  @Patch(':id')
  @RequirePermissions(SitePermissions.UPDATE_SITE)
  @ApiOperation({
    summary: 'Update site',
    description: 'Update site information, operational specifications, and status',
  })
  @ApiParam({ name: 'id', description: 'Site UUID' })
  @ApiBody({ type: UpdateSiteDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Site successfully updated',
    type: SiteResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Site not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data or business rule violation',
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateSiteDto: UpdateSiteDto,
  ): Promise<SiteResponseDto> {
    this.logger.log(`PATCH /sites/${id} - Updating site`);
    const site = await this.sitesService.update(id, updateSiteDto);
    return this.mapToResponseDto(site);
  }

  @Delete(':id')
  @RequirePermissions(SitePermissions.DELETE_SITE)
  @ApiOperation({
    summary: 'Delete site',
    description: 'Soft delete a site by setting operational status to INACTIVE',
  })
  @ApiParam({ name: 'id', description: 'Site UUID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Site successfully deleted (deactivated)',
    type: SiteResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Site not found',
  })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<SiteResponseDto> {
    this.logger.log(`DELETE /sites/${id} - Soft deleting site`);
    const site = await this.sitesService.remove(id);
    return this.mapToResponseDto(site);
  }

  @Public() // Add public decorator for demo purposes
  @Get(':id/employees')
  @ApiOperation({
    summary: 'Get employees assigned to site',
    description: 'Retrieve all employees currently assigned to a specific site with their assignment details',
  })
  @ApiParam({ name: 'id', description: 'Site UUID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of employees assigned to the site',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Site not found',
  })
  async getSiteEmployees(@Param('id', ParseUUIDPipe) id: string): Promise<any[]> {
    this.logger.log(`GET /sites/${id}/employees - Fetching employees for site ${id}`);
    return await this.sitesService.getSiteEmployees(id);
  }

  @Public() // Add public decorator for demo purposes
  @Get(':id/attendance')
  @ApiOperation({
    summary: 'Get attendance records for site',
    description: 'Retrieve attendance records for all employees assigned to a specific site',
  })
  @ApiParam({ name: 'id', description: 'Site UUID' })
  @ApiQuery({ name: 'date', required: false, description: 'Specific date (YYYY-MM-DD) or defaults to today' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Attendance records for the site',
  })
  async getSiteAttendance(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('date') date?: string,
  ): Promise<any[]> {
    this.logger.log(`GET /sites/${id}/attendance - Fetching attendance for site ${id}`);
    return await this.sitesService.getSiteAttendance(id, date);
  }

  @Public() // Add public decorator for demo purposes
  @Get(':id/assignments')
  @ApiOperation({
    summary: 'Get assignments for site',
    description: 'Retrieve all active assignments for a specific site',
  })
  @ApiParam({ name: 'id', description: 'Site UUID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of assignments for the site',
  })
  async getSiteAssignments(@Param('id', ParseUUIDPipe) id: string): Promise<any[]> {
    this.logger.log(`GET /sites/${id}/assignments - Fetching assignments for site ${id}`);
    return await this.sitesService.getSiteAssignments(id);
  }

  @Public() // Add public decorator for demo purposes
  @Get(':id/shifts')
  @ApiOperation({
    summary: 'Get shifts for site',
    description: 'Retrieve shifts scheduled for a specific site',
  })
  @ApiParam({ name: 'id', description: 'Site UUID' })
  @ApiQuery({ name: 'date', required: false, description: 'Specific date (YYYY-MM-DD) or defaults to today' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of shifts for the site',
  })
  async getSiteShifts(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('date') date?: string,
  ): Promise<any[]> {
    this.logger.log(`GET /sites/${id}/shifts - Fetching shifts for site ${id}`);
    return await this.sitesService.getSiteShifts(id, date);
  }

  @Public() // Add public decorator for demo purposes
  @Get(':id/performance')
  @ApiOperation({
    summary: 'Get site performance metrics',
    description: 'Retrieve performance KPIs and metrics for a specific site',
  })
  @ApiParam({ name: 'id', description: 'Site UUID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Site performance metrics',
  })
  async getSitePerformance(@Param('id', ParseUUIDPipe) id: string): Promise<any> {
    this.logger.log(`GET /sites/${id}/performance - Fetching performance metrics for site ${id}`);
    return await this.sitesService.getSitePerformance(id);
  }

  /**
   * Map Site entity to response DTO
   */
  private mapToResponseDto(site: any): SiteResponseDto {
    // Extract metadata from stored JSON fields
    const accessRequirements = site.accessRequirements || {};
    const metadata = accessRequirements.metadata || {};

    return {
      id: site.id,
      clientId: site.contract?.client?.id || site.contract?.clientId, // Get clientId from contract relationship
      name: site.name,
      address: site.address,
      accessRequirements: {
        ...accessRequirements,
        metadata: undefined, // Remove metadata from access requirements
      },
      safetyProtocols: site.safetyProtocols,
      operationalStatus: site.operationalStatus as SiteOperationalStatus,
      contactInfo: site.contactInfo,
      createdAt: site.createdAt,
      updatedAt: site.updatedAt,
      client: site.contract?.client
        ? {
            id: site.contract.client.id,
            name: site.contract.client.name,
            contractStatus: site.contract.status, // Contract status, not client status
          }
        : undefined,
      _count: site._count
        ? {
            assignments: site._count.assignments,
            shifts: site._count.shifts,
          }
        : undefined,
      staffingRequirements: metadata.staffingRequirements,
      contractDetails: metadata.contractDetails,
      metadata: {
        timezone: metadata.timezone,
        clientReferences: metadata.clientReferences,
        internalNotes: metadata.internalNotes,
        tags: metadata.tags,
      },
    };
  }
}
