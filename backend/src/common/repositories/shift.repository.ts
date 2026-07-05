import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantAwareRepository } from '../tenant-aware.repository';
import { TenantContextService } from '../tenant-context.service';
import { 
  Shift, 
  ShiftType,
  ShiftStatus,
  Prisma,
  PrismaClient
} from '@prisma/client';

// Define ShiftPriority enum manually since it's not being exported correctly
export enum ShiftPriority {
  LOW = 'LOW',
  NORMAL = 'NORMAL', 
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export interface ShiftFilters {
  search?: string;
  assignmentId?: string;
  siteId?: string;
  status?: ShiftStatus;
  shiftType?: ShiftType;
  priority?: ShiftPriority;
  dateFrom?: Date;
  dateTo?: Date;
  isRecurring?: boolean;
  coverageNeeded?: boolean;
  templateId?: string;
  skillRequirements?: string[];
  minCoverage?: number;
  maxCoverage?: number;
  includeCompleted?: boolean;
  includeCancelled?: boolean;
}

export interface ShiftStats {
  totalShifts: number;
  shiftsByStatus: Record<ShiftStatus, number>;
  shiftsByType: Record<ShiftType, number>;
  coverageStats: {
    totalCoverageRequired: number;
    totalCoverageAssigned: number;
    coveragePercentage: number;
    shiftsNeedingCoverage: number;
  };
  upcomingShifts: number;
  recurringShifts: number;
}

@Injectable()
export class ShiftRepository extends TenantAwareRepository {
  constructor(
    protected prisma: PrismaService,
    protected tenantContext: TenantContextService,
  ) {
    super(prisma, tenantContext);
  }

  /**
   * Create a new shift with tenant isolation
   */
  async create(shiftData: Prisma.ShiftCreateInput): Promise<any> {
    this.logger.log('Creating shift');

    return this.writeWithTenant(() =>
      this.prisma.shift.create({
        data: shiftData,
        include: {
          assignment: {
            include: {
              employee: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  employeeNumber: true,
                },
              },
            },
          },
          site: {
            include: {
              client: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          template: true,
        },
      })
    );
  }

  /**
   * Find shifts with advanced filtering and pagination
   */
  async findMany(
    filters: ShiftFilters = {},
    page: number = 1,
    limit: number = 20,
    sortBy: string = 'shiftDate',
    sortOrder: 'asc' | 'desc' = 'desc',
  ) {
    this.logger.log('Finding shifts', { filters, page, limit });

    const skip = (page - 1) * limit;
    const where = this.buildWhereClause(filters);
    const orderBy = this.buildOrderBy(sortBy, sortOrder);

    return this.findWithTenant(async () => {
      const [shifts, total] = await Promise.all([
        this.prisma.shift.findMany({
          where,
          skip,
          take: limit,
          orderBy,
          include: {
            assignment: {
              include: {
                employee: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    employeeNumber: true,
                  },
                },
              },
            },
            site: {
              include: {
                client: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
            template: true,
            attendanceRecords: {
              select: {
                id: true,
                status: true,
                clockIn: true,
                clockOut: true,
              },
            },
          },
        }),
        this.prisma.shift.count({ where }),
      ]);

      return {
        shifts,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    });
  }

  /**
   * Find shift by ID with full relations
   */
  async findById(id: string): Promise<any> {
    this.logger.log(`Finding shift by ID: ${id}`);

    return this.findWithTenant(() =>
      this.prisma.shift.findFirst({
        where: {
          id,
          site: {
            client: {
              companyId: this.tenantContext.getTenantId(),
            },
          },
        },
        include: {
          assignment: {
            include: {
              employee: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  employeeNumber: true,
                  skills: true,
                  certifications: true,
                },
              },
            },
          },
          site: {
            include: {
              client: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          template: true,
          attendanceRecords: true,
          notifications: true,
        },
      })
    );
  }

  /**
   * Update shift information
   */
  async update(id: string, updateData: Prisma.ShiftUpdateInput): Promise<any> {
    this.logger.log(`Updating shift: ${id}`);

    return this.writeWithTenant(() =>
      this.prisma.shift.update({
        where: { 
          id,
          site: {
            client: {
              companyId: this.tenantContext.getTenantId(),
            },
          },
        },
        data: updateData,
        include: {
          assignment: {
            include: {
              employee: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  employeeNumber: true,
                },
              },
            },
          },
          site: {
            include: {
              client: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          template: true,
        },
      })
    );
  }

  /**
   * Find shifts by assignment
   */
  async findByAssignmentId(assignmentId: string): Promise<any[]> {
    this.logger.log(`Finding shifts for assignment: ${assignmentId}`);

    return this.findWithTenant(() =>
      this.prisma.shift.findMany({
        where: {
          assignmentId,
          site: {
            client: {
              companyId: this.tenantContext.getTenantId(),
            },
          },
        },
        include: {
          site: {
            include: {
              client: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          attendanceRecords: {
            select: {
              id: true,
              status: true,
              clockIn: true,
              clockOut: true,
            },
          },
        },
        orderBy: {
          shiftDate: 'asc',
        },
      })
    );
  }

  /**
   * Find shifts by site
   */
  async findBySiteId(siteId: string, dateFrom?: Date, dateTo?: Date): Promise<any[]> {
    this.logger.log(`Finding shifts for site: ${siteId}`);

    const where: Prisma.ShiftWhereInput = {
      siteId,
      site: {
        client: {
          companyId: this.tenantContext.getTenantId(),
        },
      },
    };

    if (dateFrom || dateTo) {
      where.shiftDate = {};
      if (dateFrom) where.shiftDate.gte = dateFrom;
      if (dateTo) where.shiftDate.lte = dateTo;
    }

    return this.findWithTenant(() =>
      this.prisma.shift.findMany({
        where,
        include: {
          assignment: {
            include: {
              employee: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  employeeNumber: true,
                },
              },
            },
          },
          attendanceRecords: {
            select: {
              id: true,
              status: true,
              clockIn: true,
              clockOut: true,
            },
          },
        },
        orderBy: {
          shiftDate: 'asc',
        },
      })
    );
  }

  /**
   * Get shifts needing coverage (unassigned or coverage gap)
   */
  async findShiftsNeedingCoverage(): Promise<any[]> {
    this.logger.log('Finding shifts needing coverage');

    return this.findWithTenant(() =>
      this.prisma.shift.findMany({
        where: {
          site: {
            client: {
              companyId: this.tenantContext.getTenantId(),
            },
          },
          OR: [
            { assignmentId: null },
            { status: 'NEEDS_COVERAGE' },
            {
              AND: [
                { 
                  coverageAssigned: { 
                    lt: this.prisma.shift.fields.coverageRequired 
                  } 
                },
                { 
                  status: { 
                    in: ['SCHEDULED', 'CONFIRMED'] 
                  } 
                },
              ],
            },
          ],
          shiftDate: {
            gte: new Date(),
          },
        },
        include: {
          site: {
            include: {
              client: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
        orderBy: [
          { priority: 'desc' },
          { shiftDate: 'asc' },
        ],
      })
    );
  }

  /**
   * Get shift statistics
   */
  async getShiftStats(dateFrom?: Date, dateTo?: Date): Promise<ShiftStats> {
    this.logger.log('Calculating shift statistics');

    const where: Prisma.ShiftWhereInput = {
      site: {
        client: {
          companyId: this.tenantContext.getTenantId(),
        },
      },
    };

    if (dateFrom || dateTo) {
      where.shiftDate = {};
      if (dateFrom) where.shiftDate.gte = dateFrom;
      if (dateTo) where.shiftDate.lte = dateTo;
    }

    return this.findWithTenant(async () => {
      const [
        totalShifts,
        shiftsByStatus,
        shiftsByType,
        coverageAggregates,
        upcomingShifts,
        recurringShifts,
      ] = await Promise.all([
        this.prisma.shift.count({ where }),
        
        this.prisma.shift.groupBy({
          by: ['status'],
          where,
          _count: { status: true },
        }),
        
        this.prisma.shift.groupBy({
          by: ['shiftType'],
          where,
          _count: { shiftType: true },
        }),
        
        this.prisma.shift.aggregate({
          where,
          _sum: {
            coverageRequired: true,
            coverageAssigned: true,
          },
        }),
        
        this.prisma.shift.count({
          where: {
            ...where,
            shiftDate: {
              gte: new Date(),
              lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Next 7 days
            },
          },
        }),
        
        this.prisma.shift.count({
          where: {
            ...where,
            isRecurring: true,
          },
        }),
      ]);

      // Build status counts object
      const statusCounts: Record<ShiftStatus, number> = {} as any;
      Object.values(ShiftStatus).forEach(status => {
        statusCounts[status] = 0;
      });
      shiftsByStatus.forEach(item => {
        statusCounts[item.status] = item._count.status;
      });

      // Build type counts object
      const typeCounts: Record<ShiftType, number> = {} as any;
      Object.values(ShiftType).forEach(type => {
        typeCounts[type] = 0;
      });
      shiftsByType.forEach(item => {
        typeCounts[item.shiftType] = item._count.shiftType;
      });

      // Calculate coverage statistics
      const totalCoverageRequired = coverageAggregates._sum.coverageRequired || 0;
      const totalCoverageAssigned = coverageAggregates._sum.coverageAssigned || 0;
      const coveragePercentage = totalCoverageRequired > 0 
        ? Math.round((totalCoverageAssigned / totalCoverageRequired) * 100)
        : 100;

      const shiftsNeedingCoverage = await this.prisma.shift.count({
        where: {
          ...where,
          coverageAssigned: {
            lt: this.prisma.shift.fields.coverageRequired,
          },
          status: {
            in: ['SCHEDULED', 'CONFIRMED', 'NEEDS_COVERAGE'],
          },
        },
      });

      return {
        totalShifts,
        shiftsByStatus: statusCounts,
        shiftsByType: typeCounts,
        coverageStats: {
          totalCoverageRequired,
          totalCoverageAssigned,
          coveragePercentage,
          shiftsNeedingCoverage,
        },
        upcomingShifts,
        recurringShifts,
      };
    });
  }

  /**
   * Detect scheduling conflicts for assignments
   */
  async detectShiftConflicts(
    assignmentId: string,
    shiftDate: Date,
    startTime: string,
    endTime: string,
    excludeShiftId?: string,
  ): Promise<any[]> {
    this.logger.log('Detecting shift conflicts', { assignmentId, shiftDate });

    const where: Prisma.ShiftWhereInput = {
      assignmentId,
      shiftDate,
      site: {
        client: {
          companyId: this.tenantContext.getTenantId(),
        },
      },
      status: {
        not: ShiftStatus.CANCELLED,
      },
      OR: [
        {
          AND: [
            { startTime: { lte: startTime } },
            { endTime: { gt: startTime } },
          ],
        },
        {
          AND: [
            { startTime: { lt: endTime } },
            { endTime: { gte: endTime } },
          ],
        },
        {
          AND: [
            { startTime: { gte: startTime } },
            { endTime: { lte: endTime } },
          ],
        },
      ],
    };

    if (excludeShiftId) {
      where.id = { not: excludeShiftId };
    }

    return this.findWithTenant(() =>
      this.prisma.shift.findMany({
        where,
        include: {
          site: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      })
    );
  }

  /**
   * Build where clause for filtering
   */
  private buildWhereClause(filters: ShiftFilters): any {
    const where: any = {
      site: {
        client: {
          companyId: this.tenantContext.getTenantId(),
        },
      },
    };

    if (filters.search) {
      where.OR = [
        {
          site: {
            name: {
              contains: filters.search,
              mode: 'insensitive',
            },
          },
        },
        {
          assignment: {
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
        },
      ];
    }

    if (filters.assignmentId) {
      where.assignmentId = filters.assignmentId;
    }

    if (filters.siteId) {
      where.siteId = filters.siteId;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.shiftType) {
      where.shiftType = filters.shiftType;
    }

    if (filters.priority) {
      where.priority = filters.priority;
    }

    if (filters.dateFrom || filters.dateTo) {
      where.shiftDate = {};
      if (filters.dateFrom) where.shiftDate.gte = filters.dateFrom;
      if (filters.dateTo) where.shiftDate.lte = filters.dateTo;
    }

    if (filters.isRecurring !== undefined) {
      where.isRecurring = filters.isRecurring;
    }

    if (filters.templateId) {
      where.templateId = filters.templateId;
    }

    return where;
  }

  /**
   * Build order by clause
   */
  private buildOrderBy(sortBy: string, sortOrder: 'asc' | 'desc'): any {
    const orderMap: Record<string, any> = {
      shiftDate: { shiftDate: sortOrder },
      startTime: { startTime: sortOrder },
      endTime: { endTime: sortOrder },
      status: { status: sortOrder },
      priority: { priority: sortOrder },
      coverageRequired: { coverageRequired: sortOrder },
      coverageAssigned: { coverageAssigned: sortOrder },
      createdAt: { createdAt: sortOrder },
      updatedAt: { updatedAt: sortOrder },
      siteName: { 
        site: { 
          name: sortOrder 
        } 
      },
      employeeName: { 
        assignment: { 
          employee: { 
            firstName: sortOrder 
          } 
        } 
      },
    };

    return orderMap[sortBy] || { shiftDate: sortOrder };
  }
}
