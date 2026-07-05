import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantAwareRepository } from '../tenant-aware.repository';
import { TenantContextService } from '../tenant-context.service';
import { Attendance, AttendanceStatus, Prisma } from '@prisma/client';
import { AttendanceQueryDto } from '../../attendance/dto';

export interface AttendanceWithRelations extends Attendance {
  employee: {
    id: string;
    firstName: string;
    lastName: string;
    employeeNumber: string;
    email: string | null;
  };
  shift: {
    id: string;
    shiftDate: Date;
    startTime: Date;
    endTime: Date;
    shiftType: string;
    status: string;
    site: {
      id: string;
      name: string;
      client: {
        id: string;
        name: string;
      };
    };
  };
}

export interface AttendanceFilters {
  search?: string;
  employeeId?: string;
  shiftId?: string;
  siteId?: string;
  status?: AttendanceStatus;
  dateFrom?: Date;
  dateTo?: Date;
  clockInFrom?: Date;
  clockInTo?: Date;
  anomaliesOnly?: boolean;
  pendingApproval?: boolean;
  lateOnly?: boolean;
  earlyDepartureOnly?: boolean;
  overtimeOnly?: boolean;
}

export interface AttendanceStats {
  totalRecords: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  earlyDepartureCount: number;
  overtimeCount: number;
  pendingApprovalCount: number;
  attendanceRate: number;
  onTimeRate: number;
  totalHoursWorked: number;
  totalOvertimeHours: number;
  averageDailyAttendance: number;
}

@Injectable()
export class AttendanceRepository extends TenantAwareRepository {
  protected readonly logger = new Logger(AttendanceRepository.name);

  constructor(
    prisma: PrismaService,
    tenantContext: TenantContextService,
  ) {
    super(prisma, tenantContext);
  }

  /**
   * Create attendance record with tenant context
   */
  async create(data: Prisma.AttendanceCreateInput): Promise<Attendance> {
    this.logger.log('Creating attendance record');
    
    return this.prisma.attendance.create({
      data,
      include: this.getDefaultIncludes(),
    });
  }

  /**
   * Find attendance by ID with relations
   */
  async findById(id: string): Promise<AttendanceWithRelations | null> {
    this.logger.log(`Finding attendance by ID: ${id}`);

    const attendance = await this.prisma.attendance.findFirst({
      where: {
        id,
        employee: {
          companyId: this.tenantContext.getTenantId(),
        },
      },
      include: this.getDefaultIncludes(),
    });

    return attendance as AttendanceWithRelations | null;
  }

  /**
   * Find many attendance records with advanced filtering
   */
  async findMany(
    filters: AttendanceFilters = {},
    page: number = 1,
    limit: number = 20,
    sortBy: string = 'clockIn',
    sortOrder: 'asc' | 'desc' = 'desc',
  ) {
    this.logger.log('Finding attendance records with filters', { filters, page, limit });

    const skip = (page - 1) * limit;
    const where = this.buildWhereClause(filters);
    const orderBy = this.buildOrderByClause(sortBy, sortOrder);

    const [attendance, total] = await Promise.all([
      this.prisma.attendance.findMany({
        where,
        include: this.getDefaultIncludes(),
        skip,
        take: limit,
        orderBy,
      }),
      this.prisma.attendance.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    this.logger.log(`Found ${attendance.length} attendance records (${total} total)`);

    return {
      attendance: attendance as AttendanceWithRelations[],
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrevious: page > 1,
    };
  }

  /**
   * Update attendance record
   */
  async update(id: string, data: Prisma.AttendanceUpdateInput): Promise<Attendance> {
    this.logger.log(`Updating attendance: ${id}`);

    return this.prisma.attendance.update({
      where: {
        id,
        employee: {
          companyId: this.tenantContext.getTenantId(),
        },
      },
      data,
      include: this.getDefaultIncludes(),
    });
  }

  /**
   * Delete attendance record (soft delete by updating status)
   */
  async remove(id: string): Promise<Attendance> {
    this.logger.log(`Removing attendance: ${id}`);

    return this.prisma.attendance.update({
      where: {
        id,
        employee: {
          companyId: this.tenantContext.getTenantId(),
        },
      },
      data: {
        status: AttendanceStatus.ABSENT,
        notes: 'Record removed',
      },
      include: this.getDefaultIncludes(),
    });
  }

  /**
   * Find attendance by employee and shift
   */
  async findByEmployeeAndShift(employeeId: string, shiftId: string): Promise<AttendanceWithRelations | null> {
    this.logger.log(`Finding attendance for employee ${employeeId} and shift ${shiftId}`);

    const attendance = await this.prisma.attendance.findFirst({
      where: {
        employeeId,
        shiftId,
        employee: {
          companyId: this.tenantContext.getTenantId(),
        },
      },
      include: this.getDefaultIncludes(),
    });

    return attendance as AttendanceWithRelations | null;
  }

  /**
   * Find attendance records by employee for a date range
   */
  async findByEmployeeAndDateRange(
    employeeId: string,
    dateFrom: Date,
    dateTo: Date,
  ): Promise<AttendanceWithRelations[]> {
    this.logger.log(`Finding attendance for employee ${employeeId} from ${dateFrom} to ${dateTo}`);

    const attendance = await this.prisma.attendance.findMany({
      where: {
        employeeId,
        employee: {
          companyId: this.tenantContext.getTenantId(),
        },
        shift: {
          shiftDate: {
            gte: dateFrom,
            lte: dateTo,
          },
        },
      },
      include: this.getDefaultIncludes(),
      orderBy: {
        shift: {
          shiftDate: 'asc',
        },
      },
    });

    return attendance as AttendanceWithRelations[];
  }

  /**
   * Find attendance records by site for a date range
   */
  async findBySiteAndDateRange(
    siteId: string,
    dateFrom: Date,
    dateTo: Date,
  ): Promise<AttendanceWithRelations[]> {
    this.logger.log(`Finding attendance for site ${siteId} from ${dateFrom} to ${dateTo}`);

    const attendance = await this.prisma.attendance.findMany({
      where: {
        shift: {
          siteId,
          shiftDate: {
            gte: dateFrom,
            lte: dateTo,
          },
          site: {
            client: {
              companyId: this.tenantContext.getTenantId(),
            },
          },
        },
      },
      include: this.getDefaultIncludes(),
      orderBy: [
        {
          shift: {
            shiftDate: 'asc',
          },
        },
        {
          clockIn: 'asc',
        },
      ],
    });

    return attendance as AttendanceWithRelations[];
  }

  /**
   * Detect attendance anomalies
   */
  async detectAnomalies(
    dateFrom?: Date,
    dateTo?: Date,
    anomalyTypes?: string[],
    employeeId?: string,
    siteId?: string,
  ) {
    this.logger.log('Detecting attendance anomalies');

    const where: Prisma.AttendanceWhereInput = {
      employee: {
        companyId: this.tenantContext.getTenantId(),
      },
    };

    const shiftFilter: any = {};

    if (dateFrom || dateTo) {
      shiftFilter.shiftDate = {
        ...(dateFrom && { gte: dateFrom }),
        ...(dateTo && { lte: dateTo }),
      };
    }

    if (siteId) {
      shiftFilter.siteId = siteId;
    }

    if (Object.keys(shiftFilter).length > 0) {
      where.shift = shiftFilter;
    }

    if (employeeId) {
      where.employeeId = employeeId;
    }

    const attendance = await this.prisma.attendance.findMany({
      where,
      include: this.getDefaultIncludes(),
      orderBy: {
        shift: {
          shiftDate: 'desc',
        },
      },
    });

    const anomalies = [];

    for (const record of attendance) {
      const shiftStart = this.combineDateTime(record.shift.shiftDate, record.shift.startTime);
      const shiftEnd = this.combineDateTime(record.shift.shiftDate, record.shift.endTime);

      // Late arrival detection
      if (record.clockIn && record.clockIn > shiftStart) {
        const minutesLate = Math.ceil((record.clockIn.getTime() - shiftStart.getTime()) / (1000 * 60));
        if (minutesLate > 5) { // 5 minute grace period
          anomalies.push({
            attendanceId: record.id,
            anomalyType: 'LATE_ARRIVAL',
            severity: this.calculateSeverity('LATE_ARRIVAL', minutesLate),
            description: `Employee clocked in ${minutesLate} minutes late`,
            detectedAt: new Date(),
            expectedValue: shiftStart,
            actualValue: record.clockIn,
            metadata: { thresholdMinutes: 5, minutesLate },
            attendance: record,
          });
        }
      }

      // Early departure detection
      if (record.clockOut && record.clockOut < shiftEnd) {
        const minutesEarly = Math.ceil((shiftEnd.getTime() - record.clockOut.getTime()) / (1000 * 60));
        if (minutesEarly > 5) { // 5 minute grace period
          anomalies.push({
            attendanceId: record.id,
            anomalyType: 'EARLY_DEPARTURE',
            severity: this.calculateSeverity('EARLY_DEPARTURE', minutesEarly),
            description: `Employee clocked out ${minutesEarly} minutes early`,
            detectedAt: new Date(),
            expectedValue: shiftEnd,
            actualValue: record.clockOut,
            metadata: { thresholdMinutes: 5, minutesEarly },
            attendance: record,
          });
        }
      }

      // Missed clock-out detection
      if (record.clockIn && !record.clockOut && new Date() > shiftEnd) {
        anomalies.push({
          attendanceId: record.id,
          anomalyType: 'MISSED_CLOCK_OUT',
          severity: 'HIGH',
          description: 'Employee forgot to clock out',
          detectedAt: new Date(),
          expectedValue: shiftEnd,
          actualValue: null,
          metadata: { requiresApproval: true },
          attendance: record,
        });
      }

      // Overtime threshold detection
      if (record.clockIn && record.clockOut) {
        const hoursWorked = (record.clockOut.getTime() - record.clockIn.getTime()) / (1000 * 60 * 60);
        const scheduledHours = (shiftEnd.getTime() - shiftStart.getTime()) / (1000 * 60 * 60);
        const overtimeHours = Math.max(0, hoursWorked - scheduledHours);
        
        if (overtimeHours > 2) { // 2 hour overtime threshold
          anomalies.push({
            attendanceId: record.id,
            anomalyType: 'OVERTIME_THRESHOLD',
            severity: overtimeHours > 4 ? 'HIGH' : 'MEDIUM',
            description: `Employee worked ${overtimeHours.toFixed(1)} hours of overtime`,
            detectedAt: new Date(),
            expectedValue: scheduledHours,
            actualValue: hoursWorked,
            metadata: { overtimeHours, impactOnPayroll: true },
            attendance: record,
          });
        }
      }
    }

    // Filter by anomaly types if specified
    const filteredAnomalies = anomalyTypes && anomalyTypes.length > 0
      ? anomalies.filter(a => anomalyTypes.includes(a.anomalyType))
      : anomalies;

    this.logger.log(`Detected ${filteredAnomalies.length} anomalies`);
    return filteredAnomalies;
  }

  /**
   * Get attendance statistics for a period
   */
  async getStats(
    dateFrom?: Date,
    dateTo?: Date,
    siteId?: string,
    employeeId?: string,
  ): Promise<AttendanceStats> {
    this.logger.log('Calculating attendance statistics');

    const where: Prisma.AttendanceWhereInput = {
      employee: {
        companyId: this.tenantContext.getTenantId(),
      },
    };

    if (dateFrom || dateTo || siteId) {
      const shiftFilter: any = {};
      
      if (siteId) {
        shiftFilter.siteId = siteId;
      }
      
      if (dateFrom || dateTo) {
        shiftFilter.shiftDate = {
          ...(dateFrom && { gte: dateFrom }),
          ...(dateTo && { lte: dateTo }),
        };
      }
      
      where.shift = shiftFilter;
    }

    if (employeeId) {
      where.employeeId = employeeId;
    }

    const attendance = await this.prisma.attendance.findMany({
      where,
      include: {
        shift: {
          select: {
            shiftDate: true,
            startTime: true,
            endTime: true,
          },
        },
      },
    });

    const totalRecords = attendance.length;
    const presentCount = attendance.filter(a => a.status === AttendanceStatus.PRESENT).length;
    const absentCount = attendance.filter(a => a.status === AttendanceStatus.ABSENT).length;
    
    let lateCount = 0;
    let earlyDepartureCount = 0;
    let overtimeCount = 0;
    let totalHoursWorked = 0;
    let totalOvertimeHours = 0;

    attendance.forEach(record => {
      if (record.clockIn && record.shift) {
        const shiftStart = this.combineDateTime(record.shift.shiftDate, record.shift.startTime);
        if (record.clockIn > shiftStart) {
          const minutesLate = (record.clockIn.getTime() - shiftStart.getTime()) / (1000 * 60);
          if (minutesLate > 5) lateCount++;
        }
      }

      if (record.clockOut && record.shift) {
        const shiftEnd = this.combineDateTime(record.shift.shiftDate, record.shift.endTime);
        if (record.clockOut < shiftEnd) {
          const minutesEarly = (shiftEnd.getTime() - record.clockOut.getTime()) / (1000 * 60);
          if (minutesEarly > 5) earlyDepartureCount++;
        }
      }

      if (record.clockIn && record.clockOut && record.shift) {
        const hoursWorked = (record.clockOut.getTime() - record.clockIn.getTime()) / (1000 * 60 * 60);
        const shiftStart = this.combineDateTime(record.shift.shiftDate, record.shift.startTime);
        const shiftEnd = this.combineDateTime(record.shift.shiftDate, record.shift.endTime);
        const scheduledHours = (shiftEnd.getTime() - shiftStart.getTime()) / (1000 * 60 * 60);
        
        totalHoursWorked += hoursWorked;
        
        const overtime = Math.max(0, hoursWorked - scheduledHours);
        if (overtime > 0.1) { // More than 6 minutes
          overtimeCount++;
          totalOvertimeHours += overtime;
        }
      }
    });

    const pendingApprovalCount = attendance.filter(a => 
      a.status === AttendanceStatus.PENDING || 
      (a.verificationData as any)?.flags?.requiresApproval
    ).length;

    const attendanceRate = totalRecords > 0 ? (presentCount / totalRecords) * 100 : 0;
    const onTimeRate = presentCount > 0 ? ((presentCount - lateCount) / presentCount) * 100 : 0;

    const uniqueDates = new Set(attendance.map(a => a.shift?.shiftDate.toDateString())).size;
    const averageDailyAttendance = uniqueDates > 0 ? totalRecords / uniqueDates : 0;

    return {
      totalRecords,
      presentCount,
      absentCount,
      lateCount,
      earlyDepartureCount,
      overtimeCount,
      pendingApprovalCount,
      attendanceRate: Math.round(attendanceRate * 100) / 100,
      onTimeRate: Math.round(onTimeRate * 100) / 100,
      totalHoursWorked: Math.round(totalHoursWorked * 100) / 100,
      totalOvertimeHours: Math.round(totalOvertimeHours * 100) / 100,
      averageDailyAttendance: Math.round(averageDailyAttendance * 100) / 100,
    };
  }

  /**
   * Bulk update attendance records
   */
  async bulkUpdate(
    attendanceIds: string[],
    updateData: Prisma.AttendanceUpdateInput,
  ): Promise<{ count: number }> {
    this.logger.log(`Bulk updating ${attendanceIds.length} attendance records`);

    const result = await this.prisma.attendance.updateMany({
      where: {
        id: {
          in: attendanceIds,
        },
        employee: {
          companyId: this.tenantContext.getTenantId(),
        },
      },
      data: updateData,
    });

    this.logger.log(`Successfully updated ${result.count} attendance records`);
    return result;
  }

  /**
   * Get default includes for attendance queries
   */
  private getDefaultIncludes(): Prisma.AttendanceInclude {
    return {
      employee: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          employeeNumber: true,
          email: true,
        },
      },
      shift: {
        select: {
          id: true,
          shiftDate: true,
          startTime: true,
          endTime: true,
          shiftType: true,
          status: true,
          site: {
            select: {
              id: true,
              name: true,
              client: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      },
    };
  }

  /**
   * Build WHERE clause for filtering
   */
  private buildWhereClause(filters: AttendanceFilters): Prisma.AttendanceWhereInput {
    const where: Prisma.AttendanceWhereInput = {
      employee: {
        companyId: this.tenantContext.getTenantId(),
      },
    };

    // Basic filters
    if (filters.employeeId) {
      where.employeeId = filters.employeeId;
    }

    if (filters.shiftId) {
      where.shiftId = filters.shiftId;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    // Date range filters
    if (filters.dateFrom || filters.dateTo || filters.siteId) {
      const shiftFilter: any = {};
      
      if (filters.siteId) {
        shiftFilter.siteId = filters.siteId;
      }
      
      if (filters.dateFrom || filters.dateTo) {
        shiftFilter.shiftDate = {
          ...(filters.dateFrom && { gte: filters.dateFrom }),
          ...(filters.dateTo && { lte: filters.dateTo }),
        };
      }
      
      where.shift = shiftFilter;
    }

    // Clock-in time filters
    if (filters.clockInFrom || filters.clockInTo) {
      where.clockIn = {
        ...(filters.clockInFrom && { gte: filters.clockInFrom }),
        ...(filters.clockInTo && { lte: filters.clockInTo }),
      };
    }

    // Search filter
    if (filters.search) {
      where.OR = [
        {
          employee: {
            OR: [
              {
                firstName: {
                  contains: filters.search,
                  mode: 'insensitive',
                },
              },
              {
                lastName: {
                  contains: filters.search,
                  mode: 'insensitive',
                },
              },
              {
                employeeNumber: {
                  contains: filters.search,
                  mode: 'insensitive',
                },
              },
            ],
          },
        },
        {
          shift: {
            site: {
              name: {
                contains: filters.search,
                mode: 'insensitive',
              },
            },
          },
        },
      ];
    }

    return where;
  }

  /**
   * Build ORDER BY clause for sorting
   */
  private buildOrderByClause(
    sortBy: string,
    sortOrder: 'asc' | 'desc',
  ): Prisma.AttendanceOrderByWithRelationInput {
    switch (sortBy) {
      case 'employeeId':
        return {
          employee: {
            lastName: sortOrder,
          },
        };
      case 'shiftDate':
        return {
          shift: {
            shiftDate: sortOrder,
          },
        };
      case 'clockIn':
      case 'clockOut':
      case 'status':
      case 'createdAt':
        return { [sortBy]: sortOrder };
      default:
        return { clockIn: sortOrder };
    }
  }

  /**
   * Combine date and time into a single DateTime
   */
  private combineDateTime(date: Date, time: Date): Date {
    const combined = new Date(date);
    combined.setHours(time.getHours(), time.getMinutes(), time.getSeconds(), time.getMilliseconds());
    return combined;
  }

  /**
   * Calculate severity based on anomaly type and value
   */
  private calculateSeverity(anomalyType: string, value: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    switch (anomalyType) {
      case 'LATE_ARRIVAL':
      case 'EARLY_DEPARTURE':
        if (value <= 15) return 'LOW';
        if (value <= 30) return 'MEDIUM';
        if (value <= 60) return 'HIGH';
        return 'CRITICAL';
      default:
        return 'MEDIUM';
    }
  }
}
