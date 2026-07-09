import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  HttpStatus,
  UseGuards,
  Logger,
  ParseUUIDPipe,
  Request,
  BadRequestException,
  ForbiddenException,
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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { EmployeePortalService } from './employee-portal.service';
import {
  EmployeeAttendanceQueryDto,
  EmployeeShiftQueryDto,
  EmployeePayrollQueryDto,
  EmployeeProfileUpdateDto,
  AttendanceRecordDto,
  AttendanceSummaryDto,
  ShiftScheduleDto,
  PayrollItemDto,
  EmployeeDocumentDto,
  EmployeeNotificationDto,
  EmployeeDashboardDto,
} from './dto/employee-portal.dto';

@ApiTags('Employee Portal')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.EMPLOYEE, UserRole.SUPERVISOR, UserRole.MANAGER, UserRole.COMPANY_ADMIN)
@Controller('employee-portal')
export class EmployeePortalController {
  private readonly logger = new Logger(EmployeePortalController.name);

  constructor(private readonly employeePortalService: EmployeePortalService) {}

  @Get('dashboard')
  @ApiOperation({
    summary: 'Get employee dashboard overview',
    description: 'Retrieve dashboard data including current shift, attendance summary, recent payslips, and notifications',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Employee dashboard data',
    type: EmployeeDashboardDto,
  })
  async getDashboard(@Request() req): Promise<EmployeeDashboardDto> {
    this.logger.log('GET /employee-portal/dashboard - Fetching employee dashboard');
    const employeeId = this.getEmployeeIdFromRequest(req);
    return await this.employeePortalService.getDashboard(employeeId);
  }

  @Get('attendance')
  @ApiOperation({
    summary: 'Get employee attendance records',
    description: 'Retrieve attendance records with filtering and search capabilities',
  })
  @ApiQuery({ name: 'filter', enum: ['today', 'this_week', 'this_month', 'custom'], required: false })
  @ApiQuery({ name: 'startDate', required: false, description: 'Start date for custom filter (ISO format)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'End date for custom filter (ISO format)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Attendance records and summary',
    type: Object,
  })
  async getAttendance(
    @Request() req,
    @Query() queryDto: EmployeeAttendanceQueryDto,
  ): Promise<{ records: AttendanceRecordDto[]; summary: AttendanceSummaryDto }> {
    this.logger.log('GET /employee-portal/attendance - Fetching attendance records');
    const employeeId = this.getEmployeeIdFromRequest(req);
    return await this.employeePortalService.getAttendanceRecords(employeeId, queryDto);
  }

  @Get('shifts')
  @ApiOperation({
    summary: 'Get employee shift schedules',
    description: 'Retrieve shift schedules (current, upcoming, past) with calendar view support',
  })
  @ApiQuery({ name: 'filter', enum: ['current', 'upcoming', 'past', 'this_week', 'next_week'], required: false })
  @ApiQuery({ name: 'startDate', required: false, description: 'Start date for custom filter (ISO format)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'End date for custom filter (ISO format)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Shift schedules',
    type: [ShiftScheduleDto],
  })
  async getShifts(
    @Request() req,
    @Query() queryDto: EmployeeShiftQueryDto,
  ): Promise<ShiftScheduleDto[]> {
    this.logger.log('GET /employee-portal/shifts - Fetching shift schedules');
    const employeeId = this.getEmployeeIdFromRequest(req);
    return await this.employeePortalService.getShiftSchedules(employeeId, queryDto);
  }

  @Get('payroll')
  @ApiOperation({
    summary: 'Get employee payroll information',
    description: 'Retrieve payslips and salary information with download capability',
  })
  @ApiQuery({ name: 'year', required: false, description: 'Filter by specific year' })
  @ApiQuery({ name: 'month', required: false, description: 'Filter by specific month (1-12)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Payroll information',
    type: [PayrollItemDto],
  })
  async getPayroll(
    @Request() req,
    @Query() queryDto: EmployeePayrollQueryDto,
  ): Promise<PayrollItemDto[]> {
    this.logger.log('GET /employee-portal/payroll - Fetching payroll information');
    const employeeId = this.getEmployeeIdFromRequest(req);
    return await this.employeePortalService.getPayrollInformation(employeeId, queryDto);
  }

  @Get('payroll/:payrollId/download')
  @ApiOperation({
    summary: 'Download payslip',
    description: 'Download a specific payslip as PDF',
  })
  @ApiParam({ name: 'payrollId', description: 'Payroll item UUID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Payslip PDF file',
  })
  async downloadPayslip(
    @Request() req,
    @Param('payrollId', ParseUUIDPipe) payrollId: string,
  ): Promise<{ downloadUrl: string }> {
    this.logger.log(`GET /employee-portal/payroll/${payrollId}/download - Downloading payslip`);
    const employeeId = this.getEmployeeIdFromRequest(req);
    const downloadUrl = await this.employeePortalService.generatePayslipDownload(employeeId, payrollId);
    return { downloadUrl };
  }

  @Get('documents')
  @ApiOperation({
    summary: 'Get employee documents',
    description: 'Retrieve all documents associated with the employee (contracts, certifications, etc.)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Employee documents',
    type: [EmployeeDocumentDto],
  })
  async getDocuments(@Request() req): Promise<EmployeeDocumentDto[]> {
    this.logger.log('GET /employee-portal/documents - Fetching employee documents');
    const employeeId = this.getEmployeeIdFromRequest(req);
    return await this.employeePortalService.getEmployeeDocuments(employeeId);
  }

  @Get('notifications')
  @ApiOperation({
    summary: 'Get employee notifications',
    description: 'Retrieve notifications for the employee with read/unread status',
  })
  @ApiQuery({ name: 'unreadOnly', required: false, description: 'Show only unread notifications' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Employee notifications',
    type: [EmployeeNotificationDto],
  })
  async getNotifications(
    @Request() req,
    @Query('unreadOnly') unreadOnly?: boolean,
  ): Promise<EmployeeNotificationDto[]> {
    this.logger.log('GET /employee-portal/notifications - Fetching employee notifications');
    const employeeId = this.getEmployeeIdFromRequest(req);
    return await this.employeePortalService.getNotifications(employeeId, unreadOnly);
  }

  @Post('notifications/:notificationId/mark-read')
  @ApiOperation({
    summary: 'Mark notification as read',
    description: 'Mark a specific notification as read',
  })
  @ApiParam({ name: 'notificationId', description: 'Notification UUID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Notification marked as read',
  })
  async markNotificationRead(
    @Request() req,
    @Param('notificationId', ParseUUIDPipe) notificationId: string,
  ): Promise<{ success: boolean }> {
    this.logger.log(`POST /employee-portal/notifications/${notificationId}/mark-read`);
    const employeeId = this.getEmployeeIdFromRequest(req);
    await this.employeePortalService.markNotificationRead(employeeId, notificationId);
    return { success: true };
  }

  @Get('profile')
  @ApiOperation({
    summary: 'Get employee profile',
    description: 'Retrieve employee profile information (editable fields only)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Employee profile information',
  })
  async getProfile(@Request() req): Promise<any> {
    this.logger.log('GET /employee-portal/profile - Fetching employee profile');
    const employeeId = this.getEmployeeIdFromRequest(req);
    return await this.employeePortalService.getEmployeeProfile(employeeId);
  }

  @Patch('profile')
  @ApiOperation({
    summary: 'Update employee profile',
    description: 'Update basic profile information (limited fields that employees can modify)',
  })
  @ApiBody({ type: EmployeeProfileUpdateDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Profile updated successfully',
  })
  async updateProfile(
    @Request() req,
    @Body() updateDto: EmployeeProfileUpdateDto,
  ): Promise<{ success: boolean }> {
    this.logger.log('PATCH /employee-portal/profile - Updating employee profile');
    const employeeId = this.getEmployeeIdFromRequest(req);
    await this.employeePortalService.updateEmployeeProfile(employeeId, updateDto);
    return { success: true };
  }

  @Post('clock-in')
  @ApiOperation({
    summary: 'Clock in for shift',
    description: 'Clock in for current shift with location verification',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        shiftId: { type: 'string', format: 'uuid' },
        location: {
          type: 'object',
          properties: {
            latitude: { type: 'number' },
            longitude: { type: 'number' },
            accuracy: { type: 'number' },
          },
        },
      },
      required: ['shiftId'],
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successfully clocked in',
  })
  async clockIn(
    @Request() req,
    @Body() clockInData: { shiftId: string; location?: any },
  ): Promise<{ success: boolean; clockInTime: string }> {
    this.logger.log('POST /employee-portal/clock-in - Clocking in employee');
    const employeeId = this.getEmployeeIdFromRequest(req);
    const result = await this.employeePortalService.clockIn(employeeId, clockInData.shiftId, clockInData.location);
    return result;
  }

  @Post('clock-out')
  @ApiOperation({
    summary: 'Clock out from shift',
    description: 'Clock out from current shift with location verification',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        shiftId: { type: 'string', format: 'uuid' },
        location: {
          type: 'object',
          properties: {
            latitude: { type: 'number' },
            longitude: { type: 'number' },
            accuracy: { type: 'number' },
          },
        },
      },
      required: ['shiftId'],
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successfully clocked out',
  })
  async clockOut(
    @Request() req,
    @Body() clockOutData: { shiftId: string; location?: any },
  ): Promise<{ success: boolean; clockOutTime: string; hoursWorked: number }> {
    this.logger.log('POST /employee-portal/clock-out - Clocking out employee');
    const employeeId = this.getEmployeeIdFromRequest(req);
    const result = await this.employeePortalService.clockOut(employeeId, clockOutData.shiftId, clockOutData.location);
    return result;
  }

  /**
   * Extract employee ID from the authenticated request
   * For employees, they can only access their own data
   * For supervisors/managers, they might access their employee's data with proper authorization
   */
  private getEmployeeIdFromRequest(req: any): string {
    const user = req.user;
    
    if (!user || !user.id) {
      throw new BadRequestException('Invalid authentication token');
    }

    // For employee role, they can only access their own data
    if (user.role === UserRole.EMPLOYEE) {
      // Assuming the user ID corresponds to the employee ID for employee role users
      return user.employeeId || user.id;
    }

    // For other roles, we might need additional logic to determine which employee data to show
    // This could be passed as a query parameter or handled differently based on business logic
    const requestedEmployeeId = req.query.employeeId || req.params.employeeId;
    
    if (!requestedEmployeeId && user.role === UserRole.EMPLOYEE) {
      return user.employeeId || user.id;
    }

    if (requestedEmployeeId) {
      // Additional authorization logic could be added here
      // to ensure the user has permission to access this employee's data
      return requestedEmployeeId;
    }

    // Default to the user's own employee record
    return user.employeeId || user.id;
  }
}