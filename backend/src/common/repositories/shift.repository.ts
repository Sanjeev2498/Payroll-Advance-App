import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantAwareRepository } from '../tenant-aware.repository';
import { TenantContextService } from '../tenant-context.service';
import { 
  shifts, 
  ShiftType,
  ShiftStatus,
  Prisma,
  PrismaClient
} from '@prisma/client';

// Define shiftsPriority enum manually since it's not being exported correctly
export enum shiftsPriority {
  LOW = 'LOW',
  NORMAL = 'NORMAL', 
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export interface ShiftFilters {
  search?: string;
  assignmentId?: string;
  site_id?: string;
  status?: ShiftStatus;
  shiftType?: ShiftType;
  priority?: shiftsPriority;
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
  upcomingshiftss: number;
  recurringshiftss: number;
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
  async create(shiftData: Prisma.shiftsCreateInput): Promise<any> {
    this.logger.log('Creating shift');

    try {
      const result = await this.writeWithTenant(() =>
        this.prisma.shifts.create({
          data: shiftData,
          include: {
            assignments: {
              include: {
                employees: {
                  select: {
                    id: true,
                    first_name: true,
                    last_name: true,
                    employee_number: true,
                  },
                },
              },
            },
            sites: {
              include: {
                clients: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
            shift_templates: true,
          },
        })
      );
      
      if (!result) {
        throw new Error('Shift creation failed - Prisma returned undefined');
      }
      
      this.logger.log(`Successfully created shift with ID: ${result.id}`);
      return result;
    } catch (error) {
      this.logger.error('Database write operation failed:', error);
      throw error;
    }
  }

  /**
   * Find shifts with advanced filtering and pagination
   */
  async findMany(
    filters: ShiftFilters = {},
    page: number = 1,
    limit: number = 20,
    sortBy: string = 'shift_date',
    sortOrder: 'asc' | 'desc' = 'desc',
  ) {
    this.logger.log('Finding shifts', { filters, page, limit });

    const skip = (page - 1) * limit;
    const where = this.buildWhereClause(filters);
    const orderBy = this.buildOrderBy(sortBy, sortOrder);

    return this.findWithTenant(async () => {
      const [shifts, total] = await Promise.all([
        this.prisma.shifts.findMany({
          where,
          skip,
          take: limit,
          orderBy,
          include: {
            assignments: {
              include: {
                employees: {
                  select: {
                    id: true,
                    first_name: true,
                    last_name: true,
                    employee_number: true,
                  },
                },
              },
            },
            sites: {
              include: {
                contracts: {
                  include: {
                    clients: {
                      select: {
                        id: true,
                        name: true,
                      },
                    },
                  },
                },
              },
            },
            shift_templates: true,
            attendance: {
              select: {
                id: true,
                status: true,
                clockIn: true,
                clockOut: true,
              },
            },
          },
        }),
        this.prisma.shifts.count({ where }),
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
      this.prisma.shifts.findFirst({
        where: {
          id,
          sites: {
            contracts: {
              clients: {
                company_id: this.tenantContext.getTenantId(),
              },
            },
          },
        },
        include: {
          assignments: {
            include: {
              employees: {
                select: {
                  id: true,
                  first_name: true,
                  last_name: true,
                  employee_number: true,
                  skills: true,
                  certifications: true,
                },
              },
            },
          },
          sites: {
            include: {
              contracts: {
                include: {
                  clients: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                },
              },
            },
          },
          shift_templates: true,
          attendance: true,
          shift_notifications: true,
        },
      })
    );
  }

  /**
   * Update shift information
   */
  async update(id: string, updateData: Prisma.shiftsUpdateInput): Promise<any> {
    this.logger.log(`Updating shift: ${id}`);

    return this.writeWithTenant(() =>
      this.prisma.shifts.update({
        where: { 
          id,
          sites: {
            clients: {
              company_id: this.tenantContext.getTenantId(),
            },
          },
        },
        data: updateData,
        include: {
          assignments: {
            include: {
              employees: {
                select: {
                  id: true,
                  first_name: true,
                  last_name: true,
                  employee_number: true,
                },
              },
            },
          },
          sites: {
            include: {
              clients: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          shift_templates: true,
        },
      })
    );
  }

  /**
   * Find shifts by assignment
   */
  async findByAssignmentId(assignmentId: string): Promise<any[]> {
    this.logger.log(`Finding shifts for assignments: ${assignmentId}`);

    return this.findWithTenant(() =>
      this.prisma.shifts.findMany({
        where: {
          assignment_id: assignmentId,
          sites: {
            clients: {
              company_id: this.tenantContext.getTenantId(),
            },
          },
        },
        include: {
          sites: {
            include: {
              clients: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          attendance: {
            select: {
              id: true,
              status: true,
              clockIn: true,
              clockOut: true,
            },
          },
        },
        orderBy: {
          shift_date: 'asc',
        },
      })
    );
  }

  /**
   * Find shifts by site
   */
  async findBySiteId(site_id: string, dateFrom?: Date, dateTo?: Date): Promise<any[]> {
    this.logger.log(`Finding shifts for site: ${site_id}`);

    const where: Prisma.shiftsWhereInput = {
      site_id: site_id,
      sites: {
        contracts: {
          clients: {
            company_id: this.tenantContext.getTenantId(),
          },
        },
      },
    };

    if (dateFrom || dateTo) {
      where.shift_date = {};
      if (dateFrom) where.shift_date.gte = dateFrom;
      if (dateTo) where.shift_date.lte = dateTo;
    }

    return this.findWithTenant(() =>
      this.prisma.shifts.findMany({
        where,
        include: {
          assignments: {
            include: {
              employees: {
                select: {
                  id: true,
                  first_name: true,
                  last_name: true,
                  employee_number: true,
                },
              },
            },
          },
          attendance: {
            select: {
              id: true,
              status: true,
              clockIn: true,
              clockOut: true,
            },
          },
        },
        orderBy: {
          shift_date: 'asc',
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
      this.prisma.shifts.findMany({
        where: {
          sites: {
            clients: {
              company_id: this.tenantContext.getTenantId(),
            },
          },
          OR: [
            { assignment_id: null },
            { status: 'NEEDS_COVERAGE' },
            {
              AND: [
                { 
                  coverage_assigned: { 
                    lt: this.prisma.shifts.fields.coverage_required 
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
          shift_date: {
            gte: new Date(),
          },
        },
        include: {
          sites: {
            include: {
              clients: {
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
          { shift_date: 'asc' },
        ],
      })
    );
  }

  /**
   * Get shift statistics
   */
  async getShiftStats(dateFrom?: Date, dateTo?: Date): Promise<ShiftStats> {
    this.logger.log('Calculating shift statistics');

    const where: Prisma.shiftsWhereInput = {
      sites: {
        contracts: {
          clients: {
            company_id: this.tenantContext.getTenantId(),
          },
        },
      },
    };

    if (dateFrom || dateTo) {
      where.shift_date = {};
      if (dateFrom) where.shift_date.gte = dateFrom;
      if (dateTo) where.shift_date.lte = dateTo;
    }

    return this.findWithTenant(async () => {
      const [
        totalshiftss,
        shiftsByStatus,
        shiftsByType,
        coverageAggregates,
        upcomingshiftss,
        recurringshiftss,
      ] = await Promise.all([
        this.prisma.shifts.count({ where }),
        
        this.prisma.shifts.groupBy({
          by: ['status'],
          where,
          _count: { status: true },
        }),
        
        this.prisma.shifts.groupBy({
          by: ['shiftType'],
          where,
          _count: { shiftType: true },
        }),
        
        this.prisma.shifts.aggregate({
          where,
          _sum: {
            coverage_required: true,
            coverage_assigned: true,
          },
        }),
        
        this.prisma.shifts.count({
          where: {
            ...where,
            shift_date: {
              gte: new Date(),
              lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Next 7 days
            },
          },
        }),
        
        this.prisma.shifts.count({
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
      const totalCoverageRequired = coverageAggregates._sum.coverage_required || 0;
      const totalCoverageAssigned = coverageAggregates._sum.coverage_assigned || 0;
      const coveragePercentage = totalCoverageRequired > 0 
        ? Math.round((totalCoverageAssigned / totalCoverageRequired) * 100)
        : 100;

      const shiftsNeedingCoverage = await this.prisma.shifts.count({
        where: {
          ...where,
          coverage_assigned: {
            lt: this.prisma.shifts.fields.coverage_required,
          },
          status: {
            in: ['SCHEDULED', 'CONFIRMED', 'NEEDS_COVERAGE'],
          },
        },
      });

      return {
        totalShifts: totalshiftss,
        shiftsByStatus: statusCounts,
        shiftsByType: typeCounts,
        coverageStats: {
          totalCoverageRequired,
          totalCoverageAssigned,
          coveragePercentage,
          shiftsNeedingCoverage,
        },
        upcomingshiftss: upcomingshiftss,
        recurringshiftss: recurringshiftss,
      };
    });
  }

  /**
   * Detect scheduling conflicts for assignments
   */
  async detectShiftConflicts(
    assignmentId: string,
    shift_date: Date,
    startTime: string,
    endTime: string,
    excludeshiftsId?: string,
  ): Promise<any[]> {
    this.logger.log('Detecting shift conflicts', { assignmentId, shift_date });

    // Convert time strings to DateTime objects for the same date
    // Time strings are in format "HH:MM" so we need to add seconds
    const shift_dateStr = shift_date.toISOString().split('T')[0]; // Get YYYY-MM-DD format
    
    // Ensure time strings have seconds (HH:MM:SS format)
    const formatTimeString = (timeStr: string): string => {
      // If time string is just HH:MM, add :00 for seconds
      if (timeStr.length === 5 && timeStr.includes(':')) {
        return `${timeStr}:00`;
      }
      return timeStr;
    };
    
    const startDateTime = new Date(`${shift_dateStr}T${formatTimeString(startTime)}.000Z`);
    const endDateTime = new Date(`${shift_dateStr}T${formatTimeString(endTime)}.000Z`);

    const where: Prisma.shiftsWhereInput = {
      assignment_id: assignmentId,
      shift_date: shift_date,
      sites: {
        contracts: {
          clients: {
            company_id: this.tenantContext.getTenantId(),
          },
        },
      },
      status: {
        not: ShiftStatus.CANCELLED,
      },
      OR: [
        {
          AND: [
            { start_time: { lte: startDateTime } },
            { end_time: { gt: startDateTime } },
          ],
        },
        {
          AND: [
            { start_time: { lt: endDateTime } },
            { end_time: { gte: endDateTime } },
          ],
        },
        {
          AND: [
            { start_time: { gte: startDateTime } },
            { end_time: { lte: endDateTime } },
          ],
        },
      ],
    };

    if (excludeshiftsId) {
      where.id = { not: excludeshiftsId };
    }

    return this.findWithTenant(() =>
      this.prisma.shifts.findMany({
        where,
        include: {
          sites: {
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
        contracts: {
          clients: {
            company_id: this.tenantContext.getTenantId(),
          },
        },
      },
    };

    if (filters.search) {
      where.OR = [
        {
          sites: {
            name: {
              contains: filters.search,
              mode: 'insensitive',
            },
          },
        },
        {
          assignments: {
            employees: {
              OR: [
                {
                  first_name: {
                    contains: filters.search,
                    mode: 'insensitive',
                  },
                },
                {
                  last_name: {
                    contains: filters.search,
                    mode: 'insensitive',
                  },
                },
                {
                  employee_number: {
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

    if (filters.site_id) {
      where.site_id = filters.site_id;
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
      where.shift_date = {};
      if (filters.dateFrom) where.shift_date.gte = filters.dateFrom;
      if (filters.dateTo) where.shift_date.lte = filters.dateTo;
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
      shift_date: { shift_date: sortOrder },
      startTime: { startTime: sortOrder },
      endTime: { endTime: sortOrder },
      status: { status: sortOrder },
      priority: { priority: sortOrder },
      coverage_required: { coverage_required: sortOrder },
      coverage_assigned: { coverage_assigned: sortOrder },
      createdAt: { createdAt: sortOrder },
      updatedAt: { updatedAt: sortOrder },
      siteName: { 
        site: { 
          name: sortOrder 
        } 
      },
      employeeName: { 
        assignments: { 
          employees: { 
            first_name: sortOrder 
          } 
        } 
      },
    };

    return orderMap[sortBy] || { shift_date: sortOrder };
  }
}
