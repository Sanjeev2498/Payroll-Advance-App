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
import { AssignmentsService } from './assignments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { AssignmentPermissions } from '../auth/enums/permissions.enum';
import {
  CreateAssignmentDto,
  UpdateAssignmentDto,
  AssignmentQueryDto,
  AssignmentResponseDto,
  AssignmentListResponseDto,
  AssignmentStatsResponseDto,
  AssignmentRecommendationRequestDto,
  AssignmentRecommendationResponseDto,
  ConflictDetectionRequestDto,
  ConflictDetectionResultDto,
} from './dto';

@ApiTags('Assignments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('assignments')
export class AssignmentsController {
  private readonly logger = new Logger(AssignmentsController.name);

  constructor(private readonly assignmentsService: AssignmentsService) {}

  @Post()
  @RequirePermissions(AssignmentPermissions.CREATE_ASSIGNMENT)
  @ApiOperation({
    summary: 'Create a new assignment',
    description: 'Create a new employee-to-site assignment with skill matching and conflict detection',
  })
  @ApiBody({ type: CreateAssignmentDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Assignment successfully created',
    type: AssignmentResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data or business rule violation',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Assignment conflicts detected (double booking, capacity, etc.)',
  })
  async create(@Body() createAssignmentDto: CreateAssignmentDto): Promise<AssignmentResponseDto> {
    this.logger.log(`POST /assignments - Creating assignment for employee ${createAssignmentDto.employeeId}`);
    const assignment = await this.assignmentsService.create(createAssignmentDto);
    return this.mapToResponseDto(assignment);
  }

  @Get()
  @RequirePermissions(AssignmentPermissions.READ_ASSIGNMENT)
  @ApiOperation({
    summary: 'Get all assignments',
    description: 'Retrieve a paginated list of assignments with advanced filtering capabilities',
  })
  @ApiQuery({ name: 'search', required: false, description: 'Search by employee name, site name, or role' })
  @ApiQuery({ name: 'employeeId', required: false, description: 'Filter by employee ID' })
  @ApiQuery({ name: 'siteId', required: false, description: 'Filter by site ID' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by assignment status' })
  @ApiQuery({ name: 'role', required: false, description: 'Filter by role' })
  @ApiQuery({ name: 'startDateFrom', required: false, description: 'Filter assignments starting from date' })
  @ApiQuery({ name: 'startDateTo', required: false, description: 'Filter assignments starting until date' })
  @ApiQuery({ name: 'minHourlyRate', required: false, description: 'Filter by minimum hourly rate' })
  @ApiQuery({ name: 'maxHourlyRate', required: false, description: 'Filter by maximum hourly rate' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page (default: 20, max: 100)' })
  @ApiQuery({ name: 'sortBy', required: false, description: 'Field to sort by' })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'], description: 'Sort order' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of assignments with pagination metadata',
    type: AssignmentListResponseDto,
  })
  async findAll(@Query() queryDto: AssignmentQueryDto): Promise<AssignmentListResponseDto> {
    this.logger.log('GET /assignments - Fetching assignments list');
    const result = await this.assignmentsService.findAll(queryDto);

    return {
      assignments: result.assignments.map(assignment => this.mapToResponseDto(assignment)),
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    };
  }
  @Get('stats')
  @RequirePermissions(AssignmentPermissions.READ_ASSIGNMENT)
  @ApiOperation({
    summary: 'Get assignment statistics',
    description: 'Retrieve aggregated statistics about assignments (counts by status, performance metrics, etc.)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Assignment statistics',
    type: AssignmentStatsResponseDto,
  })
  async getStats(): Promise<AssignmentStatsResponseDto> {
    this.logger.log('GET /assignments/stats - Fetching assignment statistics');
    return await this.assignmentsService.getStats();
  }

  @Post('recommend')
  @RequirePermissions(AssignmentPermissions.READ_ASSIGNMENT)
  @ApiOperation({
    summary: 'Get assignment recommendations',
    description: 'Get skill-matched employee recommendations for a site assignment using intelligent matching algorithms',
  })
  @ApiBody({ type: AssignmentRecommendationRequestDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of recommended employees with skill matching scores',
    type: AssignmentRecommendationResponseDto,
  })
  async getRecommendations(
    @Body() recommendationRequest: AssignmentRecommendationRequestDto,
  ): Promise<AssignmentRecommendationResponseDto> {
    this.logger.log(`POST /assignments/recommend - Generating recommendations for site ${recommendationRequest.siteId}`);
    return await this.assignmentsService.getRecommendations(recommendationRequest);
  }

  @Post('conflicts')
  @RequirePermissions(AssignmentPermissions.READ_ASSIGNMENT)
  @ApiOperation({
    summary: 'Check for assignment conflicts',
    description: 'Detect scheduling conflicts, capacity issues, and validation problems for assignment scenarios',
  })
  @ApiBody({ type: ConflictDetectionRequestDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Conflict detection results with resolution suggestions',
    type: ConflictDetectionResultDto,
  })
  async detectConflicts(
    @Body() conflictRequest: ConflictDetectionRequestDto,
  ): Promise<ConflictDetectionResultDto> {
    this.logger.log('POST /assignments/conflicts - Performing conflict detection');
    return await this.assignmentsService.detectConflicts(conflictRequest);
  }

  @Get('by-employee/:employeeId')
  @RequirePermissions(AssignmentPermissions.READ_ASSIGNMENT)
  @ApiOperation({
    summary: 'Get assignments for specific employee',
    description: 'Retrieve all assignments for a specific employee including historical data',
  })
  @ApiParam({ name: 'employeeId', description: 'Employee UUID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of assignments for the employee',
    type: [AssignmentResponseDto],
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Employee not found',
  })
  async findByEmployee(@Param('employeeId', ParseUUIDPipe) employeeId: string): Promise<AssignmentResponseDto[]> {
    this.logger.log(`GET /assignments/by-employee/${employeeId} - Fetching assignments for employee`);
    const assignments = await this.assignmentsService.findByEmployee(employeeId);
    return assignments.map(assignment => this.mapToResponseDto(assignment));
  }

  @Get('by-site/:siteId')
  @RequirePermissions(AssignmentPermissions.READ_ASSIGNMENT)
  @ApiOperation({
    summary: 'Get assignments for specific site',
    description: 'Retrieve all assignments for a specific site including current and historical data',
  })
  @ApiParam({ name: 'siteId', description: 'Site UUID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of assignments for the site',
    type: [AssignmentResponseDto],
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Site not found',
  })
  async findBySite(@Param('siteId', ParseUUIDPipe) siteId: string): Promise<AssignmentResponseDto[]> {
    this.logger.log(`GET /assignments/by-site/${siteId} - Fetching assignments for site`);
    const assignments = await this.assignmentsService.findBySite(siteId);
    return assignments.map(assignment => this.mapToResponseDto(assignment));
  }

  @Get(':id')
  @RequirePermissions(AssignmentPermissions.READ_ASSIGNMENT)
  @ApiOperation({
    summary: 'Get assignment by ID',
    description: 'Retrieve detailed information about a specific assignment including employee and site details',
  })
  @ApiParam({ name: 'id', description: 'Assignment UUID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Assignment details',
    type: AssignmentResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Assignment not found',
  })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<AssignmentResponseDto> {
    this.logger.log(`GET /assignments/${id} - Fetching assignment details`);
    const assignment = await this.assignmentsService.findOne(id);
    return this.mapToResponseDto(assignment);
  }
  @Patch(':id')
  @RequirePermissions(AssignmentPermissions.UPDATE_ASSIGNMENT)
  @ApiOperation({
    summary: 'Update assignment',
    description: 'Update assignment information including status, rates, and requirements',
  })
  @ApiParam({ name: 'id', description: 'Assignment UUID' })
  @ApiBody({ type: UpdateAssignmentDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Assignment successfully updated',
    type: AssignmentResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Assignment not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data or business rule violation',
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateAssignmentDto: UpdateAssignmentDto,
  ): Promise<AssignmentResponseDto> {
    this.logger.log(`PATCH /assignments/${id} - Updating assignment`);
    const assignment = await this.assignmentsService.update(id, updateAssignmentDto);
    return this.mapToResponseDto(assignment);
  }

  @Delete(':id')
  @RequirePermissions(AssignmentPermissions.DELETE_ASSIGNMENT)
  @ApiOperation({
    summary: 'Cancel assignment',
    description: 'Cancel an assignment by setting status to CANCELLED (soft delete)',
  })
  @ApiParam({ name: 'id', description: 'Assignment UUID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Assignment successfully cancelled',
    type: AssignmentResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Assignment not found',
  })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<AssignmentResponseDto> {
    this.logger.log(`DELETE /assignments/${id} - Cancelling assignment`);
    const assignment = await this.assignmentsService.remove(id);
    return this.mapToResponseDto(assignment);
  }

  /**
   * Map Assignment entity to response DTO
   */
  private mapToResponseDto(assignment: any): AssignmentResponseDto {
    const metadata = (assignment.metadata as any) || {};
    
    return {
      id: assignment.id,
      employeeId: assignment.employeeId,
      siteId: assignment.siteId,
      role: assignment.role,
      responsibilities: assignment.responsibilities || metadata.responsibilities,
      hourlyRate: parseFloat(assignment.hourlyRate.toString()),
      status: assignment.status,
      startDate: assignment.startDate,
      endDate: assignment.endDate,
      shiftPatterns: metadata.shiftPatterns,
      priority: metadata.priority,
      urgency: metadata.urgency,
      requiredCertifications: metadata.requiredCertifications,
      requiredSkills: metadata.requiredSkills,
      notes: assignment.notes,
      metadata: metadata,
      createdAt: assignment.createdAt,
      updatedAt: assignment.updatedAt,
      
      // Include related entities if available
      employee: assignment.employee ? {
        id: assignment.employee.id,
        companyId: assignment.employee.companyId,
        employeeNumber: assignment.employee.employeeNumber,
        firstName: assignment.employee.firstName,
        lastName: assignment.employee.lastName,
        email: assignment.employee.email,
        phone: assignment.employee.phone,
        employmentStatus: assignment.employee.employmentStatus,
        skills: assignment.employee.skills,
        hireDate: assignment.employee.hireDate,
        createdAt: assignment.employee.createdAt,
        updatedAt: assignment.employee.updatedAt,
      } as any : undefined,
      
      site: assignment.site ? {
        id: assignment.site.id,
        clientId: assignment.site.clientId,
        name: assignment.site.name,
        address: assignment.site.address,
        operationalStatus: assignment.site.operationalStatus,
        contactInfo: assignment.site.contactInfo,
        createdAt: assignment.site.createdAt,
        updatedAt: assignment.site.updatedAt,
        client: assignment.site.client ? {
          id: assignment.site.client.id,
          name: assignment.site.client.name,
        } : undefined,
      } as any : undefined,
      
      // Calculate additional metrics if shift data is available
      activeShiftsCount: assignment.shifts?.filter((s: any) => s.status === 'SCHEDULED' || s.status === 'IN_PROGRESS').length || 0,
      totalShiftsCount: assignment.shifts?.length || 0,
      
      // Skill matching score if available
      skillMatchingScore: assignment.skillMatchingScore?.matchPercentage,
      
      // Performance rating from employee metadata
      performanceRating: assignment.employee?.metadata?.performanceMetrics?.overallRating,
    };
  }
}