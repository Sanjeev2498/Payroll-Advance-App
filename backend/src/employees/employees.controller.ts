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
  ParseIntPipe,
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
import { EmployeesService } from './employees.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { EmployeePermissions } from '../auth/enums/permissions.enum';
import {
  CreateEmployeeDto,
  UpdateEmployeeDto,
  EmployeeQueryDto,
  EmployeeSearchDto,
  EmployeeResponseDto,
  EmployeeListResponseDto,
  EmployeeStatsResponseDto,
  SkillMatchDto,
  EmployeeAvailabilityDto,
  DocumentQueryDto,
  DocumentUploadDto,
  DocumentResponseDto,
  EmploymentStatus,
} from './dto';

@ApiTags('Employees')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('employees')
export class EmployeesController {
  private readonly logger = new Logger(EmployeesController.name);

  constructor(private readonly employeesService: EmployeesService) {}

  @Post()
  @RequirePermissions(EmployeePermissions.CREATE_EMPLOYEE)
  @ApiOperation({
    summary: 'Create a new employee',
    description: 'Create a new employee with skills, certifications, and compliance tracking',
  })
  @ApiBody({ type: CreateEmployeeDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Employee successfully created',
    type: EmployeeResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data or business rule violation',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Employee number or email already exists',
  })
  async create(@Body() createEmployeeDto: CreateEmployeeDto): Promise<EmployeeResponseDto> {
    this.logger.log('POST /employees - Creating new employee');
    const employee = await this.employeesService.create(createEmployeeDto, 'ADMIN');
    return this.mapToResponseDto(employee);
  }

  @Get()
  @RequirePermissions(EmployeePermissions.READ_EMPLOYEE)
  @ApiOperation({
    summary: 'Get all employees',
    description: 'Retrieve a paginated list of employees with advanced filtering and search capabilities',
  })
  @ApiQuery({ name: 'search', required: false, description: 'Search by name, email, or employee number' })
  @ApiQuery({
    name: 'employmentStatus',
    required: false,
    enum: EmploymentStatus,
    description: 'Filter by employment status',
  })
  @ApiQuery({ name: 'skills', required: false, description: 'Filter by skills (comma-separated)' })
  @ApiQuery({ name: 'department', required: false, description: 'Filter by department' })
  @ApiQuery({ name: 'jobTitle', required: false, description: 'Filter by job title' })
  @ApiQuery({ name: 'hireDateFrom', required: false, description: 'Filter by hire date from (ISO format)' })
  @ApiQuery({ name: 'hireDateTo', required: false, description: 'Filter by hire date to (ISO format)' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page (default: 20, max: 100)' })
  @ApiQuery({ name: 'sortBy', required: false, description: 'Field to sort by' })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'], description: 'Sort order' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of employees with pagination metadata',
    type: EmployeeListResponseDto,
  })
  async findAll(@Query() queryDto: EmployeeQueryDto): Promise<EmployeeListResponseDto> {
    this.logger.log('GET /employees - Fetching employees list');
    const result = await this.employeesService.findAll(queryDto, 'ADMIN');

    return {
      employees: result.employees.map(employee => this.mapToResponseDto(employee)),
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.pages,
    };
  }

  @Get('stats')
  @RequirePermissions(EmployeePermissions.READ_EMPLOYEE)
  @ApiOperation({
    summary: 'Get employee statistics',
    description: 'Retrieve aggregated statistics about employees (counts by status, performance metrics, etc.)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Employee statistics',
    type: EmployeeStatsResponseDto,
  })
  async getStats(): Promise<EmployeeStatsResponseDto> {
    this.logger.log('GET /employees/stats - Fetching employee statistics');
    return await this.employeesService.getStats('ADMIN');
  }

  @Get('search')
  @RequirePermissions(EmployeePermissions.READ_EMPLOYEE)
  @ApiOperation({
    summary: 'Advanced employee search',
    description: 'Search employees by skills, availability, location, and performance criteria',
  })
  @ApiQuery({ name: 'requiredSkills', required: false, description: 'Required skills (comma-separated)' })
  @ApiQuery({ name: 'location', required: false, description: 'Location for proximity search' })
  @ApiQuery({ name: 'maxDistance', required: false, description: 'Maximum distance in kilometers' })
  @ApiQuery({ name: 'availableFrom', required: false, description: 'Available from (ISO format)' })
  @ApiQuery({ name: 'availableUntil', required: false, description: 'Available until (ISO format)' })
  @ApiQuery({ name: 'minPerformanceRating', required: false, description: 'Minimum performance rating (1-5)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of employees with skill matching scores',
    type: [SkillMatchDto],
  })
  async searchEmployees(@Query() searchDto: EmployeeSearchDto): Promise<SkillMatchDto[]> {
    this.logger.log('GET /employees/search - Performing advanced employee search');
    const results = await this.employeesService.searchEmployees(searchDto, 'ADMIN');
    
    return results.map(result => ({
      employee: this.mapToResponseDto(result.employee),
      matchPercentage: result.matchPercentage,
      matchedSkills: result.matchedSkills,
      missingSkills: result.missingSkills,
      availabilityScore: result.availabilityScore,
    }));
  }

  @Get('by-skills')
  @RequirePermissions(EmployeePermissions.READ_EMPLOYEE)
  @ApiOperation({
    summary: 'Find employees by skills',
    description: 'Retrieve employees that have specific skills for assignment matching',
  })
  @ApiQuery({ name: 'skills', required: true, description: 'Required skills (comma-separated)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of employees with matching skills',
    type: [EmployeeResponseDto],
  })
  async findBySkills(@Query('skills') skills: string): Promise<EmployeeResponseDto[]> {
    this.logger.log(`GET /employees/by-skills - Finding employees with skills: ${skills}`);
    const skillsArray = skills.split(',').map(skill => skill.trim());
    const employees = await this.employeesService.findBySkills(skillsArray, 'ADMIN');
    return employees.map(employee => this.mapToResponseDto(employee));
  }

  @Get('available')
  @RequirePermissions(EmployeePermissions.READ_EMPLOYEE)
  @ApiOperation({
    summary: 'Find available employees',
    description: 'Get employees available for scheduling within a specific time range',
  })
  @ApiQuery({ name: 'startDate', required: false, description: 'Start date (ISO format)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'End date (ISO format)' })
  @ApiQuery({ name: 'requiredSkills', required: false, description: 'Required skills (comma-separated)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of available employees',
    type: [EmployeeResponseDto],
  })
  async findAvailable(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('requiredSkills') requiredSkills?: string,
  ): Promise<EmployeeResponseDto[]> {
    this.logger.log('GET /employees/available - Finding available employees');
    const skillsArray = requiredSkills ? requiredSkills.split(',').map(skill => skill.trim()) : undefined;
    const employees = await this.employeesService.findAvailable(startDate, endDate, skillsArray);
    return employees.map(employee => this.mapToResponseDto(employee));
  }

  @Get('expiring-certifications')
  @RequirePermissions(EmployeePermissions.READ_EMPLOYEE)
  @ApiOperation({
    summary: 'Find employees with expiring certifications',
    description: 'Retrieve employees whose certifications are expiring within the specified number of days',
  })
  @ApiQuery({
    name: 'days',
    required: false,
    description: 'Number of days until expiry (default: 30)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of employees with expiring certifications',
    type: [EmployeeResponseDto],
  })
  async findExpiringCertifications(
    @Query('days', new ParseIntPipe({ optional: true })) days: number = 30,
  ): Promise<EmployeeResponseDto[]> {
    this.logger.log(`GET /employees/expiring-certifications - Finding certifications expiring in ${days} days`);
    const employees = await this.employeesService.findExpiringCertifications(days, 'ADMIN');
    return employees.map(employee => this.mapToResponseDto(employee));
  }

  @Get(':id')
  @RequirePermissions(EmployeePermissions.READ_EMPLOYEE)
  @ApiOperation({
    summary: 'Get employee by ID',
    description: 'Retrieve detailed information about a specific employee including skills, certifications, and performance data',
  })
  @ApiParam({ name: 'id', description: 'Employee UUID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Employee details',
    type: EmployeeResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Employee not found',
  })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<EmployeeResponseDto> {
    this.logger.log(`GET /employees/${id} - Fetching employee details`);
    const employee = await this.employeesService.findOne(id, 'ADMIN');
    return this.mapToResponseDto(employee);
  }

  @Get(':id/documents')
  @RequirePermissions(EmployeePermissions.READ_EMPLOYEE)
  @ApiOperation({
    summary: 'Get employee documents',
    description: 'Retrieve all documents associated with an employee (licenses, certificates, etc.)',
  })
  @ApiParam({ name: 'id', description: 'Employee UUID' })
  @ApiQuery({ name: 'type', required: false, description: 'Filter by document type' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by document status' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of employee documents',
    type: [DocumentResponseDto],
  })
  async getDocuments(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() queryDto: DocumentQueryDto,
  ): Promise<DocumentResponseDto[]> {
    this.logger.log(`GET /employees/${id}/documents - Fetching employee documents`);
    return await this.employeesService.getEmployeeDocuments(id);
  }

  @Post(':id/documents')
  @RequirePermissions(EmployeePermissions.UPDATE_EMPLOYEE)
  @ApiOperation({
    summary: 'Upload employee document',
    description: 'Upload a new document for an employee (license, certificate, ID copy, etc.)',
  })
  @ApiParam({ name: 'id', description: 'Employee UUID' })
  @ApiBody({ type: DocumentUploadDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Document successfully uploaded',
    type: DocumentResponseDto,
  })
  async uploadDocument(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() documentData: DocumentUploadDto,
  ): Promise<DocumentResponseDto> {
    this.logger.log(`POST /employees/${id}/documents - Uploading employee document`);
    return await this.employeesService.uploadDocument(id, documentData);
  }

  @Patch(':id')
  @RequirePermissions(EmployeePermissions.UPDATE_EMPLOYEE)
  @ApiOperation({
    summary: 'Update employee',
    description: 'Update employee information including skills, certifications, and employment status',
  })
  @ApiParam({ name: 'id', description: 'Employee UUID' })
  @ApiBody({ type: UpdateEmployeeDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Employee successfully updated',
    type: EmployeeResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Employee not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data or business rule violation',
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateEmployeeDto: UpdateEmployeeDto,
  ): Promise<EmployeeResponseDto> {
    this.logger.log(`PATCH /employees/${id} - Updating employee`);
    const employee = await this.employeesService.update(id, updateEmployeeDto, 'ADMIN');
    return this.mapToResponseDto(employee);
  }

  @Delete(':id')
  @RequirePermissions(EmployeePermissions.DELETE_EMPLOYEE)
  @ApiOperation({
    summary: 'Delete employee',
    description: 'Soft delete an employee by setting employment status to TERMINATED',
  })
  @ApiParam({ name: 'id', description: 'Employee UUID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Employee successfully deleted (terminated)',
    type: EmployeeResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Employee not found',
  })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<EmployeeResponseDto> {
    this.logger.log(`DELETE /employees/${id} - Soft deleting employee`);
    const employee = await this.employeesService.remove(id, 'ADMIN');
    return this.mapToResponseDto(employee);
  }

  /**
   * Map Employee entity to response DTO
   */
  private mapToResponseDto(employee: any): EmployeeResponseDto {
    const metadata = (employee.metadata as any) || {};
    
    return {
      id: employee.id,
      companyId: employee.companyId,
      employeeNumber: employee.employeeNumber,
      firstName: employee.firstName,
      lastName: employee.lastName,
      email: employee.email,
      phone: employee.phone,
      contactInfo: metadata.contactInfo,
      employmentStatus: employee.employmentStatus as EmploymentStatus,
      employmentType: metadata.employmentType,
      department: metadata.department,
      jobTitle: metadata.jobTitle,
      hireDate: employee.hireDate,
      terminationDate: employee.terminationDate,
      skills: employee.skills || metadata.skills,
      certifications: employee.certifications || metadata.certifications,
      complianceStatus: metadata.complianceStatus,
      availability: metadata.availability,
      performanceMetrics: metadata.performanceMetrics,
      hourlyRate: metadata.hourlyRate,
      metadata: metadata,
      createdAt: employee.createdAt,
      updatedAt: employee.updatedAt,
    };
  }
}
