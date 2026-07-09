import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from '../common/tenant-context.service';
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
  AttendanceFilterType,
  ShiftFilterType,
} from './dto/employee-portal.dto';

@Injectable()
export class EmployeePortalService {
  private readonly logger = new Logger(EmployeePortalService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
  ) {}

  async getDashboard(employeeId: string): Promise<EmployeeDashboardDto> {
    const employee = await this.findEmployeeById(employeeId);
    
    // Get current shift (active now)
    const now = new Date();
    const currentShift = await this.prisma.shift.findFirst({
      where: {
        assignment: {
          employeeId,
          status: 'ACTIVE',
        },
        shiftDate: {
          equals: new Date(now.toISOString().split('T')[0]),
        },
        startTime: { lte: now.toTimeString().split(' ')[0] },
        endTime: { gte: now.toTimeString().split(' ')[0] },
        status: 'SCHEDULED',
      },
      include: {
        assignment: {
          include: {
            site: true,
          },
        },
      },
    });

    // Get next upcoming shift
    const nextShift = await this.prisma.shift.findFirst({
      where: {
        assignment: {
          employeeId,
          status: 'ACTIVE',
        },
        OR: [
          {
            shiftDate: { gt: now.toISOString().split('T')[0] },
          },
          {
            shiftDate: { equals: now.toISOString().split('T')[0] },
            startTime: { gt: now.toTimeString().split(' ')[0] },
          },
        ],
        status: 'SCHEDULED',
      },
      include: {
        assignment: {
          include: {
            site: true,
          },
        },
      },
      orderBy: [
        { shiftDate: 'asc' },
        { startTime: 'asc' },
      ],
    });

    // Get today's attendance
    const todaysAttendance = await this.prisma.attendance.findFirst({
      where: {
        employeeId,
        clockIn: {
          gte: new Date(now.toISOString().split('T')[0]),
        },
      },
      include: {
        shift: {
          include: {
            assignment: {
              include: {
                site: true,
              },
            },
          },
        },
      },
    });

    // Get attendance summary for this month
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const attendanceSummary = await this.calculateAttendanceSummary(employeeId, monthStart, monthEnd);

    // Get recent payslips (last 3)
    const recentPayslips = await this.prisma.payrollItem.findMany({
      where: {
        employeeId,
        payrollRun: {
          status: 'FINALIZED',
        },
      },
      include: {
        payrollRun: true,
      },
      orderBy: {
        payrollRun: {
          payPeriodEnd: 'desc',
        },
      },
      take: 3,
    });

    // Get unread notifications count
    const unreadNotifications = await this.prisma.shiftNotification.count({
      where: {
        employeeId,
        readAt: null,
      },
    });

    // Get upcoming shifts this week
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    const upcomingShifts = await this.prisma.shift.findMany({
      where: {
        assignment: {
          employeeId,
          status: 'ACTIVE',
        },
        shiftDate: {
          gte: now.toISOString().split('T')[0],
          lte: weekEnd.toISOString().split('T')[0],
        },
        status: 'SCHEDULED',
      },
      include: {
        assignment: {
          include: {
            site: true,
          },
        },
      },
      orderBy: [
        { shiftDate: 'asc' },
        { startTime: 'asc' },
      ],
      take: 5,
    });

    // Check clock-in/out status
    const lastAttendance = await this.prisma.attendance.findFirst({
      where: {
        employeeId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const clockStatus = {
      isClockedIn: lastAttendance?.clockIn && !lastAttendance?.clockOut,
      lastAction: lastAttendance?.clockOut ? 'CLOCK_OUT' : lastAttendance?.clockIn ? 'CLOCK_IN' : undefined,
      lastActionTime: lastAttendance?.clockOut || lastAttendance?.clockIn || undefined,
    };

    return {
      currentShift: currentShift ? this.mapToShiftDto(currentShift) : undefined,
      nextShift: nextShift ? this.mapToShiftDto(nextShift) : undefined,
      todaysAttendance: todaysAttendance ? this.mapToAttendanceDto(todaysAttendance) : undefined,
      attendanceSummary,
      recentPayslips: recentPayslips.map(item => this.mapToPayrollDto(item)),
      unreadNotifications,
      upcomingShifts: upcomingShifts.map(shift => this.mapToShiftDto(shift)),
      clockStatus,
    };
  }

  async getAttendanceRecords(
    employeeId: string,
    queryDto: EmployeeAttendanceQueryDto,
  ): Promise<{ records: AttendanceRecordDto[]; summary: AttendanceSummaryDto }> {
    await this.findEmployeeById(employeeId);

    const { startDate, endDate } = this.getDateRange(queryDto.filter, queryDto.startDate, queryDto.endDate);

    const records = await this.prisma.attendance.findMany({
      where: {
        employeeId,
        clockIn: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        shift: {
          include: {
            assignment: {
              include: {
                site: true,
              },
            },
          },
        },
      },
      orderBy: {
        clockIn: 'desc',
      },
    });

    const summary = await this.calculateAttendanceSummary(employeeId, startDate, endDate);

    return {
      records: records.map(record => this.mapToAttendanceDto(record)),
      summary,
    };
  }

  async getShiftSchedules(
    employeeId: string,
    queryDto: EmployeeShiftQueryDto,
  ): Promise<ShiftScheduleDto[]> {
    await this.findEmployeeById(employeeId);

    const { startDate, endDate } = this.getShiftDateRange(queryDto.filter, queryDto.startDate, queryDto.endDate);

    const shifts = await this.prisma.shift.findMany({
      where: {
        assignment: {
          employeeId,
          status: 'ACTIVE',
        },
        shiftDate: {
          gte: startDate.toISOString().split('T')[0],
          lte: endDate.toISOString().split('T')[0],
        },
      },
      include: {
        assignment: {
          include: {
            site: true,
          },
        },
      },
      orderBy: [
        { shiftDate: 'asc' },
        { startTime: 'asc' },
      ],
    });

    return shifts.map(shift => this.mapToShiftDto(shift));
  }

  async getPayrollInformation(
    employeeId: string,
    queryDto: EmployeePayrollQueryDto,
  ): Promise<PayrollItemDto[]> {
    await this.findEmployeeById(employeeId);

    const whereCondition: any = {
      employeeId,
      payrollRun: {
        status: 'FINALIZED',
      },
    };

    if (queryDto.year) {
      const year = parseInt(queryDto.year);
      const yearStart = new Date(year, 0, 1);
      const yearEnd = new Date(year, 11, 31);
      
      whereCondition.payrollRun.payPeriodEnd = {
        gte: yearStart,
        lte: yearEnd,
      };
    }

    if (queryDto.month && queryDto.year) {
      const year = parseInt(queryDto.year);
      const month = parseInt(queryDto.month) - 1; // JavaScript months are 0-based
      const monthStart = new Date(year, month, 1);
      const monthEnd = new Date(year, month + 1, 0);
      
      whereCondition.payrollRun.payPeriodEnd = {
        gte: monthStart,
        lte: monthEnd,
      };
    }

    const payrollItems = await this.prisma.payrollItem.findMany({
      where: whereCondition,
      include: {
        payrollRun: true,
      },
      orderBy: {
        payrollRun: {
          payPeriodEnd: 'desc',
        },
      },
    });

    return payrollItems.map(item => this.mapToPayrollDto(item));
  }

  async generatePayslipDownload(employeeId: string, payrollId: string): Promise<string> {
    await this.findEmployeeById(employeeId);

    const payrollItem = await this.prisma.payrollItem.findFirst({
      where: {
        id: payrollId,
        employeeId,
        payrollRun: {
          status: 'FINALIZED',
        },
      },
      include: {
        payrollRun: true,
        employee: true,
      },
    });

    if (!payrollItem) {
      throw new NotFoundException('Payslip not found or not accessible');
    }

    // In a real implementation, you would generate a PDF or secure download URL
    // For now, we'll return a mock URL
    return `/api/payroll/payslips/${payrollId}/download?token=${this.generateSecureToken()}`;
  }

  async getEmployeeDocuments(employeeId: string): Promise<EmployeeDocumentDto[]> {
    await this.findEmployeeById(employeeId);

    // In a real implementation, this would fetch from a document management system
    // For now, we'll return mock data based on employee metadata
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
    });

    const metadata = (employee?.metadata as any) || {};
    const documents = metadata.documents || [];

    return documents.map((doc: any) => ({
      id: doc.id || `doc_${Math.random().toString(36).substr(2, 9)}`,
      name: doc.name || 'Document',
      type: doc.type || 'general',
      description: doc.description,
      uploadedAt: doc.uploadedAt || new Date().toISOString(),
      downloadUrl: `/api/employee-portal/documents/${doc.id}/download`,
      size: doc.size || 0,
      fileExtension: doc.fileExtension || 'pdf',
    }));
  }

  async getNotifications(employeeId: string, unreadOnly?: boolean): Promise<EmployeeNotificationDto[]> {
    await this.findEmployeeById(employeeId);

    const whereCondition: any = { employeeId };
    if (unreadOnly) {
      whereCondition.readAt = null;
    }

    const notifications = await this.prisma.shiftNotification.findMany({
      where: whereCondition,
      orderBy: {
        createdAt: 'desc',
      },
      take: 50, // Limit to recent notifications
    });

    return notifications.map(notification => ({
      id: notification.id,
      title: notification.title,
      message: notification.message,
      type: notification.type,
      isRead: !!notification.readAt,
      priority: (notification.metadata as any)?.priority || 'normal',
      createdAt: notification.createdAt.toISOString(),
      actionUrl: (notification.metadata as any)?.actionUrl,
    }));
  }

  async markNotificationRead(employeeId: string, notificationId: string): Promise<void> {
    await this.findEmployeeById(employeeId);

    const notification = await this.prisma.shiftNotification.findFirst({
      where: {
        id: notificationId,
        employeeId,
      },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    await this.prisma.shiftNotification.update({
      where: { id: notificationId },
      data: { readAt: new Date() },
    });
  }

  async getEmployeeProfile(employeeId: string): Promise<any> {
    const employee = await this.findEmployeeById(employeeId);
    const metadata = (employee.metadata as any) || {};

    return {
      id: employee.id,
      firstName: employee.firstName,
      lastName: employee.lastName,
      email: employee.email,
      phone: employee.phone,
      employeeNumber: employee.employeeNumber,
      hireDate: employee.hireDate,
      department: metadata.department,
      jobTitle: metadata.jobTitle,
      emergencyContact: metadata.emergencyContact,
      address: metadata.address,
      notificationPreferences: metadata.notificationPreferences || {
        email: true,
        sms: false,
        pushNotifications: true,
      },
    };
  }

  async updateEmployeeProfile(employeeId: string, updateDto: EmployeeProfileUpdateDto): Promise<void> {
    const employee = await this.findEmployeeById(employeeId);
    const currentMetadata = (employee.metadata as any) || {};

    const updateData: any = {};

    if (updateDto.phone) {
      updateData.phone = updateDto.phone;
    }

    if (updateDto.emergencyContact || updateDto.address || updateDto.notificationPreferences) {
      const newMetadata = {
        ...currentMetadata,
        ...(updateDto.emergencyContact && { emergencyContact: updateDto.emergencyContact }),
        ...(updateDto.address && { address: updateDto.address }),
        ...(updateDto.notificationPreferences && { notificationPreferences: updateDto.notificationPreferences }),
      };
      updateData.metadata = newMetadata;
    }

    if (Object.keys(updateData).length > 0) {
      await this.prisma.employee.update({
        where: { id: employeeId },
        data: updateData,
      });
    }
  }

  async clockIn(employeeId: string, shiftId: string, location?: any): Promise<{ success: boolean; clockInTime: string }> {
    const employee = await this.findEmployeeById(employeeId);

    const shift = await this.prisma.shift.findFirst({
      where: {
        id: shiftId,
        assignment: {
          employeeId,
          status: 'ACTIVE',
        },
      },
    });

    if (!shift) {
      throw new NotFoundException('Shift not found or not accessible');
    }

    // Check if already clocked in for this shift
    const existingAttendance = await this.prisma.attendance.findFirst({
      where: {
        employeeId,
        shiftId,
        clockIn: { not: null },
        clockOut: null,
      },
    });

    if (existingAttendance) {
      throw new BadRequestException('Already clocked in for this shift');
    }

    const clockInTime = new Date();

    const attendance = await this.prisma.attendance.create({
      data: {
        employeeId,
        shiftId,
        clockIn: clockInTime,
        status: 'PRESENT',
        metadata: {
          location,
          clockInSource: 'employee_portal',
        },
      },
    });

    return {
      success: true,
      clockInTime: clockInTime.toISOString(),
    };
  }

  async clockOut(employeeId: string, shiftId: string, location?: any): Promise<{ success: boolean; clockOutTime: string; hoursWorked: number }> {
    const employee = await this.findEmployeeById(employeeId);

    const attendance = await this.prisma.attendance.findFirst({
      where: {
        employeeId,
        shiftId,
        clockIn: { not: null },
        clockOut: null,
      },
    });

    if (!attendance) {
      throw new BadRequestException('No active clock-in found for this shift');
    }

    const clockOutTime = new Date();
    const hoursWorked = (clockOutTime.getTime() - attendance.clockIn.getTime()) / (1000 * 60 * 60);

    await this.prisma.attendance.update({
      where: { id: attendance.id },
      data: {
        clockOut: clockOutTime,
        metadata: {
          ...((attendance.metadata as any) || {}),
          clockOutLocation: location,
          clockOutSource: 'employee_portal',
          hoursWorked,
        },
      },
    });

    return {
      success: true,
      clockOutTime: clockOutTime.toISOString(),
      hoursWorked: Math.round(hoursWorked * 100) / 100, // Round to 2 decimal places
    };
  }

  // Helper methods

  private async findEmployeeById(employeeId: string) {
    const employee = await this.prisma.employee.findFirst({
      where: {
        id: employeeId,
        companyId: this.tenantContext.getTenantId(),
      },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    return employee;
  }

  private getDateRange(filter?: AttendanceFilterType, customStart?: string, customEnd?: string) {
    const now = new Date();
    let startDate: Date;
    let endDate: Date = new Date();

    switch (filter) {
      case AttendanceFilterType.TODAY:
        startDate = new Date(now.toISOString().split('T')[0]);
        endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 1);
        break;
      case AttendanceFilterType.THIS_WEEK:
        startDate = new Date(now);
        startDate.setDate(now.getDate() - now.getDay());
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
        break;
      case AttendanceFilterType.THIS_MONTH:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      case AttendanceFilterType.CUSTOM:
        if (customStart && customEnd) {
          startDate = new Date(customStart);
          endDate = new Date(customEnd);
        } else {
          throw new BadRequestException('Custom date range requires both startDate and endDate');
        }
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    }

    return { startDate, endDate };
  }

  private getShiftDateRange(filter?: ShiftFilterType, customStart?: string, customEnd?: string) {
    const now = new Date();
    let startDate: Date;
    let endDate: Date;

    switch (filter) {
      case ShiftFilterType.CURRENT:
        startDate = new Date(now.toISOString().split('T')[0]);
        endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 1);
        break;
      case ShiftFilterType.UPCOMING:
        startDate = new Date(now.toISOString().split('T')[0]);
        endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 30); // Next 30 days
        break;
      case ShiftFilterType.PAST:
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 30); // Last 30 days
        endDate = new Date(now.toISOString().split('T')[0]);
        break;
      case ShiftFilterType.THIS_WEEK:
        startDate = new Date(now);
        startDate.setDate(now.getDate() - now.getDay());
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
        break;
      case ShiftFilterType.NEXT_WEEK:
        startDate = new Date(now);
        startDate.setDate(now.getDate() - now.getDay() + 7);
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
        break;
      default:
        startDate = new Date(now.toISOString().split('T')[0]);
        endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 30);
    }

    if (filter === ('custom' as any) && customStart && customEnd) {
      startDate = new Date(customStart);
      endDate = new Date(customEnd);
    }

    return { startDate, endDate };
  }

  private async calculateAttendanceSummary(employeeId: string, startDate: Date, endDate: Date): Promise<AttendanceSummaryDto> {
    const attendanceRecords = await this.prisma.attendance.findMany({
      where: {
        employeeId,
        clockIn: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    const totalDaysWorked = attendanceRecords.length;
    const totalHoursWorked = attendanceRecords.reduce((sum, record) => {
      if (record.clockIn && record.clockOut) {
        const hours = (record.clockOut.getTime() - record.clockIn.getTime()) / (1000 * 60 * 60);
        return sum + hours;
      }
      return sum;
    }, 0);

    const overtimeHours = attendanceRecords.reduce((sum, record) => {
      if (record.clockIn && record.clockOut) {
        const hours = (record.clockOut.getTime() - record.clockIn.getTime()) / (1000 * 60 * 60);
        return sum + Math.max(0, hours - 8); // Assuming 8-hour standard workday
      }
      return sum;
    }, 0);

    // Calculate late arrivals and early departures (simplified logic)
    const lateArrivals = attendanceRecords.filter(record => {
      // This would need more sophisticated logic based on shift start times
      return false; // Placeholder
    }).length;

    const earlyDepartures = attendanceRecords.filter(record => {
      // This would need more sophisticated logic based on shift end times
      return false; // Placeholder
    }).length;

    // Calculate attendance rate (assuming working days in period)
    const workingDaysInPeriod = this.getWorkingDays(startDate, endDate);
    const attendanceRate = workingDaysInPeriod > 0 ? (totalDaysWorked / workingDaysInPeriod) * 100 : 100;

    return {
      totalDaysWorked,
      totalHoursWorked: Math.round(totalHoursWorked * 100) / 100,
      overtimeHours: Math.round(overtimeHours * 100) / 100,
      lateArrivals,
      earlyDepartures,
      attendanceRate: Math.round(attendanceRate * 100) / 100,
    };
  }

  private getWorkingDays(startDate: Date, endDate: Date): number {
    let count = 0;
    const current = new Date(startDate);
    
    while (current <= endDate) {
      const day = current.getDay();
      if (day !== 0 && day !== 6) { // Not Sunday (0) or Saturday (6)
        count++;
      }
      current.setDate(current.getDate() + 1);
    }
    
    return count;
  }

  private mapToAttendanceDto(attendance: any): AttendanceRecordDto {
    const hoursWorked = attendance.clockIn && attendance.clockOut
      ? (attendance.clockOut.getTime() - attendance.clockIn.getTime()) / (1000 * 60 * 60)
      : 0;

    return {
      id: attendance.id,
      shiftDate: attendance.shift?.shiftDate || new Date().toISOString().split('T')[0],
      siteName: attendance.shift?.assignment?.site?.name || 'Unknown Site',
      clockIn: attendance.clockIn?.toISOString() || null,
      clockOut: attendance.clockOut?.toISOString() || null,
      hoursWorked: Math.round(hoursWorked * 100) / 100,
      status: attendance.status,
      locationVerified: !!(attendance.metadata as any)?.location,
      notes: (attendance.metadata as any)?.notes,
    };
  }

  private mapToShiftDto(shift: any): ShiftScheduleDto {
    return {
      id: shift.id,
      siteName: shift.assignment?.site?.name || 'Unknown Site',
      siteAddress: shift.assignment?.site?.address || 'Unknown Address',
      shiftDate: shift.shiftDate,
      startTime: shift.startTime,
      endTime: shift.endTime,
      shiftType: shift.shiftType || 'regular',
      role: shift.assignment?.role || 'Security Guard',
      status: shift.status,
      instructions: (shift.metadata as any)?.instructions,
      requiresCheckIn: true, // Default to true for security
    };
  }

  private mapToPayrollDto(payrollItem: any): PayrollItemDto {
    const metadata = (payrollItem.metadata as any) || {};
    const calculationData = (payrollItem.calculationData as any) || {};

    return {
      id: payrollItem.id,
      payPeriodStart: payrollItem.payrollRun.payPeriodStart.toISOString().split('T')[0],
      payPeriodEnd: payrollItem.payrollRun.payPeriodEnd.toISOString().split('T')[0],
      grossPay: calculationData.grossPay || payrollItem.amount || 0,
      netPay: payrollItem.amount || 0,
      taxDeductions: calculationData.taxDeductions || 0,
      otherDeductions: calculationData.otherDeductions || 0,
      overtimePay: calculationData.overtimePay || 0,
      regularHours: calculationData.regularHours || 0,
      overtimeHours: calculationData.overtimeHours || 0,
      payslipUrl: metadata.payslipUrl,
      status: payrollItem.payrollRun.status,
      paidDate: payrollItem.payrollRun.processedAt?.toISOString().split('T')[0],
    };
  }

  private generateSecureToken(): string {
    return Math.random().toString(36).substr(2) + Date.now().toString(36);
  }
}