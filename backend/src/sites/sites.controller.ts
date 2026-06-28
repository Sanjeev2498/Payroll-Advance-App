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
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('sites')
export class SitesController {
  private readonly logger = new Logger(SitesController.name);

  constructor(private readonly sitesService: SitesService) {}

  @Post()
  @RequirePermissions(SitePermissions.CREATE_SITE)
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

  @Get()
  @RequirePermissions(SitePermissions.READ_SITE)
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

  @Get(':id')
  @RequirePermissions(SitePermissions.READ_SITE)
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

  /**
   * Map Site entity to response DTO
   */
  private mapToResponseDto(site: any): SiteResponseDto {
    // Extract metadata from stored JSON fields
    const accessRequirements = site.accessRequirements || {};
    const metadata = accessRequirements.metadata || {};

    return {
      id: site.id,
      clientId: site.clientId,
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
      client: site.client
        ? {
            id: site.client.id,
            name: site.client.name,
            contractStatus: site.client.contractStatus,
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
