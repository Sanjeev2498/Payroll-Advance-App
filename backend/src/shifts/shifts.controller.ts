import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ShiftsService, CoverageRequest } from './shifts.service';
import { 
  CreateShiftDto,
  UpdateShiftDto,
  ShiftResponseDto,
  ShiftListResponseDto,
  ShiftQueryDto,
  BulkShiftDto,
  ShiftStatsResponseDto,
} from './dto';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { ShiftPermissions } from '../auth/enums/permissions.enum';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';

@ApiTags('Shifts')
@ApiBearerAuth()
@Controller('shifts')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ShiftsController {
  constructor(private readonly shiftsService: ShiftsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions(ShiftPermissions.CREATE_SHIFT)
  @ApiOperation({ 
    summary: 'Create a new shift',
    description: 'Creates a new shift with optional assignment and recurring pattern support'
  })
  @ApiResponse({
    status: 201,
    description: 'Shift created successfully',
    type: ShiftResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data or validation errors',
  })
  @ApiResponse({
    status: 409,
    description: 'Scheduling conflict detected',
  })
  async create(@Body() createShiftDto: CreateShiftDto) {
    return this.shiftsService.create(createShiftDto);
  }

  @Post('bulk')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions(ShiftPermissions.CREATE_SHIFT)
  @ApiOperation({
    summary: 'Create multiple shifts',
    description: 'Creates multiple shifts from individual data or template-based generation'
  })
  @ApiResponse({
    status: 201,
    description: 'Bulk shifts creation completed',
    schema: {
      type: 'object',
      properties: {
        created: {
          type: 'array',
          items: { $ref: '#/components/schemas/ShiftResponseDto' }
        },
        errors: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              shiftData: { type: 'object' },
              error: { type: 'string' }
            }
          }
        }
      }
    }
  })
  async createBulk(@Body() bulkShiftDto: BulkShiftDto) {
    return this.shiftsService.createBulkShifts(bulkShiftDto);
  }

  @Get()
  @RequirePermissions(ShiftPermissions.READ_SHIFT)
  @ApiOperation({
    summary: 'Get all shifts',
    description: 'Retrieves paginated list of shifts with advanced filtering options'
  })
  @ApiQuery({ name: 'search', required: false, description: 'Search in site name or employee name' })
  @ApiQuery({ name: 'assignmentId', required: false, description: 'Filter by assignment ID' })
  @ApiQuery({ name: 'siteId', required: false, description: 'Filter by site ID' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by shift status' })
  @ApiQuery({ name: 'shiftType', required: false, description: 'Filter by shift type' })
  @ApiQuery({ name: 'priority', required: false, description: 'Filter by priority level' })
  @ApiQuery({ name: 'dateFrom', required: false, description: 'Filter from date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'dateTo', required: false, description: 'Filter to date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'isRecurring', required: false, description: 'Filter recurring shifts' })
  @ApiQuery({ name: 'coverageNeeded', required: false, description: 'Filter shifts needing coverage' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page (default: 20)' })
  @ApiQuery({ name: 'sortBy', required: false, description: 'Sort field (default: shiftDate)' })
  @ApiQuery({ name: 'sortOrder', required: false, description: 'Sort order (asc/desc, default: desc)' })
  @ApiResponse({
    status: 200,
    description: 'Shifts retrieved successfully',
    type: ShiftListResponseDto,
  })
  async findAll(@Query() queryDto: ShiftQueryDto) {
    return this.shiftsService.findAll(queryDto);
  }

  @Get('stats')
  @RequirePermissions(ShiftPermissions.READ_SHIFT)
  @ApiOperation({
    summary: 'Get shift statistics',
    description: 'Retrieves comprehensive shift statistics and analytics'
  })
  @ApiQuery({ name: 'dateFrom', required: false, description: 'Statistics from date' })
  @ApiQuery({ name: 'dateTo', required: false, description: 'Statistics to date' })
  @ApiResponse({
    status: 200,
    description: 'Statistics retrieved successfully',
    type: ShiftStatsResponseDto,
  })
  async getStats(
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.shiftsService.getStats(dateFrom, dateTo);
  }

  @Get('coverage-needed')
  @RequirePermissions(ShiftPermissions.READ_SHIFT)
  @ApiOperation({
    summary: 'Get shifts needing coverage',
    description: 'Retrieves shifts that are unassigned or need additional coverage'
  })
  @ApiResponse({
    status: 200,
    description: 'Shifts needing coverage retrieved successfully',
    type: [ShiftResponseDto],
  })
  async getShiftsNeedingCoverage() {
    return this.shiftsService.getShiftsNeedingCoverage();
  }

  @Get('assignment/:assignmentId')
  @RequirePermissions(ShiftPermissions.READ_SHIFT)
  @ApiOperation({
    summary: 'Get shifts by assignment',
    description: 'Retrieves all shifts for a specific assignment'
  })
  @ApiParam({ name: 'assignmentId', description: 'Assignment UUID' })
  @ApiResponse({
    status: 200,
    description: 'Assignment shifts retrieved successfully',
    type: [ShiftResponseDto],
  })
  async findByAssignment(
    @Param('assignmentId', ParseUUIDPipe) assignmentId: string,
  ) {
    return this.shiftsService.findByAssignment(assignmentId);
  }

  @Get('site/:siteId')
  @RequirePermissions(ShiftPermissions.READ_SHIFT)
  @ApiOperation({
    summary: 'Get shifts by site',
    description: 'Retrieves all shifts for a specific site with optional date filtering'
  })
  @ApiParam({ name: 'siteId', description: 'Site UUID' })
  @ApiQuery({ name: 'dateFrom', required: false, description: 'Filter from date' })
  @ApiQuery({ name: 'dateTo', required: false, description: 'Filter to date' })
  @ApiResponse({
    status: 200,
    description: 'Site shifts retrieved successfully',
    type: [ShiftResponseDto],
  })
  async findBySite(
    @Param('siteId', ParseUUIDPipe) siteId: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.shiftsService.findBySite(siteId, dateFrom, dateTo);
  }

  @Get(':id')
  @RequirePermissions(ShiftPermissions.READ_SHIFT)
  @ApiOperation({
    summary: 'Get shift by ID',
    description: 'Retrieves a specific shift with full details including relations'
  })
  @ApiParam({ name: 'id', description: 'Shift UUID' })
  @ApiResponse({
    status: 200,
    description: 'Shift retrieved successfully',
    type: ShiftResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Shift not found',
  })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.shiftsService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions(ShiftPermissions.UPDATE_SHIFT)
  @ApiOperation({
    summary: 'Update shift',
    description: 'Updates shift information with modification tracking and conflict detection'
  })
  @ApiParam({ name: 'id', description: 'Shift UUID' })
  @ApiResponse({
    status: 200,
    description: 'Shift updated successfully',
    type: ShiftResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Shift not found',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid update data',
  })
  @ApiResponse({
    status: 409,
    description: 'Update would create scheduling conflict',
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateShiftDto: UpdateShiftDto,
  ) {
    return this.shiftsService.update(id, updateShiftDto);
  }

  @Post(':id/request-coverage')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(ShiftPermissions.UPDATE_SHIFT)
  @ApiOperation({
    summary: 'Request coverage for shift',
    description: 'Marks a shift as needing coverage and sends notifications to find replacement'
  })
  @ApiParam({ name: 'id', description: 'Shift UUID' })
  @ApiResponse({
    status: 200,
    description: 'Coverage request submitted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Shift not found',
  })
  async requestCoverage(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() coverageRequest: Omit<CoverageRequest, 'shiftId'>,
  ): Promise<{ message: string }> {
    await this.shiftsService.requestCoverage({
      ...coverageRequest,
      shiftId: id,
    });
    
    return {
      message: 'Coverage request submitted successfully',
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(ShiftPermissions.DELETE_SHIFT)
  @ApiOperation({
    summary: 'Cancel shift',
    description: 'Cancels a shift (soft delete) with notification handling'
  })
  @ApiParam({ name: 'id', description: 'Shift UUID' })
  @ApiResponse({
    status: 200,
    description: 'Shift cancelled successfully',
    type: ShiftResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Shift not found',
  })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('reason') reason?: string,
  ) {
    return this.shiftsService.remove(id, reason);
  }
}