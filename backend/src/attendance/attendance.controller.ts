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
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AttendanceService } from './attendance.service';
import {
  CreateAttendanceDto,
  UpdateAttendanceDto,
  AttendanceQueryDto,
  ClockInDto,
  ClockOutDto,
  AttendanceCorrectionDto,
  AttendanceApprovalDto,
  BulkAttendanceUpdateDto,
  AttendanceAnomalyQueryDto,
  AttendanceResponseDto,
  AttendancePaginatedResponseDto,
  ClockActionResponseDto,
  AttendanceStatsDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { TenantGuard } from '../common/tenant.guard';
import {
  RequireAttendanceRead,
  RequireAttendanceWrite,
  RequireAttendanceManage,
} from '../auth/decorators/permissions.decorator';
import { RequireAttendanceAccess } from '../auth/decorators/resource-authorization.decorator';

@ApiTags('Attendance')
@ApiBearerAuth()
@Controller('attendance')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post()
  @RequireAttendanceWrite()
  @ApiOperation({ 
    summary: 'Create attendance record',
    description: 'Create a new attendance record with validation and verification data'
  })
  @ApiResponse({ 
    status: HttpStatus.CREATED, 
    description: 'Attendance record created successfully',
    type: AttendanceResponseDto
  })
  @ApiResponse({ 
    status: HttpStatus.BAD_REQUEST, 
    description: 'Invalid attendance data or validation failed' 
  })
  @ApiResponse({ 
    status: HttpStatus.CONFLICT, 
    description: 'Attendance record already exists for this employee and shift' 
  })
  async create(@Body() createAttendanceDto: CreateAttendanceDto) {
    return this.attendanceService.create(createAttendanceDto);
  }

  @Post('clock-in')
  @RequireAttendanceWrite()
  @ApiOperation({ 
    summary: 'Clock in employee',
    description: 'Process employee clock-in with location verification and anomaly detection'
  })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Employee clocked in successfully',
    type: ClockActionResponseDto
  })
  @ApiResponse({ 
    status: HttpStatus.BAD_REQUEST, 
    description: 'Invalid clock-in data or employee not assigned' 
  })
  @ApiResponse({ 
    status: HttpStatus.CONFLICT, 
    description: 'Employee already clocked in for this shift' 
  })
  async clockIn(@Body() clockInDto: ClockInDto) {
    return this.attendanceService.clockIn(clockInDto);
  }

  @Post('clock-out')
  @RequireAttendanceWrite()
  @ApiOperation({ 
    summary: 'Clock out employee',
    description: 'Process employee clock-out with validation and overtime calculation'
  })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Employee clocked out successfully',
    type: ClockActionResponseDto
  })
  @ApiResponse({ 
    status: HttpStatus.BAD_REQUEST, 
    description: 'Invalid clock-out data or employee not clocked in' 
  })
  @ApiResponse({ 
    status: HttpStatus.NOT_FOUND, 
    description: 'No attendance record found for employee and shift' 
  })
  async clockOut(@Body() clockOutDto: ClockOutDto) {
    return this.attendanceService.clockOut(clockOutDto);
  }
  @Get()
  @RequireAttendanceRead()
  @ApiOperation({ 
    summary: 'List attendance records',
    description: 'Retrieve attendance records with advanced filtering and pagination'
  })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Attendance records retrieved successfully',
    type: AttendancePaginatedResponseDto
  })
  async findAll(@Query() queryDto: AttendanceQueryDto) {
    return this.attendanceService.findAll(queryDto);
  }

  @Get('stats')
  @RequireAttendanceRead()
  @ApiOperation({ 
    summary: 'Get attendance statistics',
    description: 'Retrieve attendance statistics and analytics for specified period'
  })
  @ApiQuery({ name: 'dateFrom', required: false, description: 'Start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'dateTo', required: false, description: 'End date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'siteId', required: false, description: 'Filter by site ID' })
  @ApiQuery({ name: 'employeeId', required: false, description: 'Filter by employee ID' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Attendance statistics retrieved successfully',
    type: AttendanceStatsDto
  })
  async getStats(
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('siteId') siteId?: string,
    @Query('employeeId') employeeId?: string,
  ) {
    return this.attendanceService.getStats(dateFrom, dateTo, siteId, employeeId);
  }

  @Get('anomalies')
  @RequireAttendanceRead()
  @ApiOperation({ 
    summary: 'Detect attendance anomalies',
    description: 'Detect and analyze attendance anomalies with filtering options'
  })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Attendance anomalies detected successfully'
  })
  async detectAnomalies(@Query() queryDto: AttendanceAnomalyQueryDto) {
    return this.attendanceService.detectAnomalies(queryDto);
  }

  @Get(':id')
  @RequireAttendanceRead()
  @RequireAttendanceAccess()
  @ApiOperation({ 
    summary: 'Get attendance record',
    description: 'Retrieve a specific attendance record by ID with calculated metrics'
  })
  @ApiParam({ name: 'id', description: 'Attendance record ID' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Attendance record retrieved successfully',
    type: AttendanceResponseDto
  })
  @ApiResponse({ 
    status: HttpStatus.NOT_FOUND, 
    description: 'Attendance record not found' 
  })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.attendanceService.findOne(id);
  }

  @Patch(':id')
  @RequireAttendanceWrite()
  @RequireAttendanceAccess()
  @ApiOperation({ 
    summary: 'Update attendance record',
    description: 'Update attendance record with modification tracking'
  })
  @ApiParam({ name: 'id', description: 'Attendance record ID' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Attendance record updated successfully',
    type: AttendanceResponseDto
  })
  @ApiResponse({ 
    status: HttpStatus.NOT_FOUND, 
    description: 'Attendance record not found' 
  })
  @ApiResponse({ 
    status: HttpStatus.FORBIDDEN, 
    description: 'Insufficient permissions to update record' 
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateAttendanceDto: UpdateAttendanceDto,
  ) {
    return this.attendanceService.update(id, updateAttendanceDto);
  }
  @Post(':id/correction')
  @RequireAttendanceWrite()
  @RequireAttendanceAccess()
  @ApiOperation({ 
    summary: 'Request attendance correction',
    description: 'Submit a request for attendance record correction with approval workflow'
  })
  @ApiParam({ name: 'id', description: 'Attendance record ID' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Correction request submitted successfully'
  })
  @ApiResponse({ 
    status: HttpStatus.NOT_FOUND, 
    description: 'Attendance record not found' 
  })
  @ApiResponse({ 
    status: HttpStatus.BAD_REQUEST, 
    description: 'Invalid correction request data' 
  })
  async requestCorrection(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() correctionDto: AttendanceCorrectionDto,
  ) {
    return this.attendanceService.requestCorrection(id, correctionDto);
  }

  @Post(':id/correction/:correctionId/approve')
  @RequireAttendanceManage()
  @RequireAttendanceAccess()
  @ApiOperation({ 
    summary: 'Process attendance correction',
    description: 'Approve, reject, or request changes for an attendance correction'
  })
  @ApiParam({ name: 'id', description: 'Attendance record ID' })
  @ApiParam({ name: 'correctionId', description: 'Correction request ID' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Correction processed successfully'
  })
  @ApiResponse({ 
    status: HttpStatus.NOT_FOUND, 
    description: 'Attendance record or correction not found' 
  })
  @ApiResponse({ 
    status: HttpStatus.BAD_REQUEST, 
    description: 'Correction already processed or invalid data' 
  })
  async processCorrection(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('correctionId') correctionId: string,
    @Body() approvalDto: AttendanceApprovalDto,
  ) {
    return this.attendanceService.processCorrection(id, correctionId, approvalDto);
  }

  @Post('bulk-update')
  @RequireAttendanceManage()
  @ApiOperation({ 
    summary: 'Bulk update attendance records',
    description: 'Perform bulk operations on multiple attendance records'
  })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Bulk update completed successfully'
  })
  @ApiResponse({ 
    status: HttpStatus.BAD_REQUEST, 
    description: 'Invalid bulk update data or operation' 
  })
  async bulkUpdate(@Body() bulkUpdateDto: BulkAttendanceUpdateDto) {
    return this.attendanceService.bulkUpdate(bulkUpdateDto);
  }

  // Employee-specific endpoints for mobile app access
  @Get('employee/:employeeId/today')
  @RequireAttendanceRead()
  @ApiOperation({ 
    summary: 'Get employee today attendance',
    description: 'Get attendance records for an employee for today'
  })
  @ApiParam({ name: 'employeeId', description: 'Employee ID' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Employee attendance for today retrieved successfully'
  })
  async getEmployeeTodayAttendance(@Param('employeeId', ParseUUIDPipe) employeeId: string) {
    const today = new Date().toISOString().split('T')[0];
    return this.attendanceService.findAll({
      employeeId,
      dateFrom: today,
      dateTo: today,
      limit: 10,
    });
  }

  @Get('employee/:employeeId/current-status')
  @RequireAttendanceRead()
  @ApiOperation({ 
    summary: 'Get employee current attendance status',
    description: 'Get current clock-in status and next expected action for employee'
  })
  @ApiParam({ name: 'employeeId', description: 'Employee ID' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Employee current status retrieved successfully'
  })
  async getEmployeeCurrentStatus(@Param('employeeId', ParseUUIDPipe) employeeId: string) {
    const today = new Date().toISOString().split('T')[0];
    const todayAttendance = await this.attendanceService.findAll({
      employeeId,
      dateFrom: today,
      dateTo: today,
      limit: 1,
      sortBy: 'clockIn',
      sortOrder: 'desc',
    });

    const currentAttendance = todayAttendance.attendance[0];
    
    let status = 'NOT_CLOCKED_IN';
    let nextAction = 'CLOCK_IN';
    let activeShift = null;

    if (currentAttendance) {
      if (currentAttendance.clockIn && !currentAttendance.clockOut) {
        status = 'CLOCKED_IN';
        nextAction = 'CLOCK_OUT';
        activeShift = currentAttendance.shift;
      } else if (currentAttendance.clockIn && currentAttendance.clockOut) {
        status = 'SHIFT_COMPLETED';
        nextAction = 'NONE';
      }
    }

    return {
      employeeId,
      status,
      nextAction,
      currentAttendance,
      activeShift,
      lastUpdate: new Date(),
    };
  }
}