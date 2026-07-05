import { Injectable, NotFoundException } from '@nestjs/common';
import { TenantAwareRepository } from '../tenant-aware.repository';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantContextService } from '../tenant-context.service';
import { Assignment, Prisma, Employee, Site } from '@prisma/client';

export interface CreateAssignmentDto {
  employeeId: string;
  siteId: string;
  role: string;
  responsibilities?: Prisma.JsonValue;
  hourlyRate: number;
  status?: string;
  startDate: Date;
  endDate?: Date;
  shiftPatterns?: Prisma.JsonValue;
  priority?: number;
  urgency?: number;
  requiredCertifications?: string[];
  requiredSkills?: string[];
  notes?: string;
  metadata?: Prisma.JsonValue;
}

export interface UpdateAssignmentDto extends Partial<Omit<CreateAssignmentDto, 'employeeId' | 'siteId'>> {
  // Intentionally exclude employeeId and siteId from updates
}

export interface AssignmentSearchFilters {
  search?: string;
  employeeId?: string;
  siteId?: string;
  status?: string;
  role?: string;
  startDateFrom?: Date;
  startDateTo?: Date;
  endDateFrom?: Date;
  endDateTo?: Date;
  requiredSkills?: string[];
  requiredCertifications?: string[];
  minHourlyRate?: number;
  maxHourlyRate?: number;
  priority?: number;
  urgency?: number;
  includeInactive?: boolean;
  includeCompleted?: boolean;
  includeCancelled?: boolean;
}

export interface AssignmentWithRelations extends Assignment {
  employee: Employee;
  site: Site & {
    client: {
      id: string;
      name: string;
    };
  };
}

export interface SkillMatchingScore {
  assignmentId: string;
  matchPercentage: number;
  matchedSkills: string[];
  missingSkills: string[];
  competencyScore: number;
  experienceScore: number;
}

export interface ConflictDetails {
  type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  conflictingEntityId?: string;
  suggestions: string[];
}

@Injectable()
export class AssignmentRepository extends TenantAwareRepository {
  constructor(
    protected readonly prisma: PrismaService,
    protected readonly tenantContext: TenantContextService,
  ) {
    super(prisma, tenantContext);
  }

  /**
   * Create a new assignment with validation
   */
  async create(data: CreateAssignmentDto): Promise<AssignmentWithRelations> {
    this.logOperation('CREATE', 'Assignment');

    // Validate employee and site belong to current tenant
    await this.validateEmployeeBelongsToTenant(data.employeeId);
    await this.validateSiteBelongsToTenant(data.siteId);

    return this.writeWithTenant(() =>
      this.prisma.assignment.create({
        data: {
          ...data,
          status: (data.status as any) || 'ACTIVE',
        },
        include: {
          employee: true,
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
      }),
    );
  }

  /**
   * Find assignment by ID with relations
   */
  async findById(id: string): Promise<AssignmentWithRelations | null> {
    this.logOperation('READ', 'Assignment', id);

    const assignment = await this.findWithTenant(() =>
      this.prisma.assignment.findFirst({
        where: { id },
        include: {
          employee: true,
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
      }),
    ) as AssignmentWithRelations | null;

    // Validate assignment belongs to current tenant through employee
    if (assignment) {
      this.validateTenantOwnership(assignment.employee.companyId);
    }

    return assignment as AssignmentWithRelations | null;
  }

  /**
   * Update assignment by ID
   */
  async update(id: string, data: UpdateAssignmentDto): Promise<AssignmentWithRelations> {
    this.logOperation('UPDATE', 'Assignment', id);

    // First verify the assignment exists and belongs to the current tenant
    const existing = await this.findById(id);
    if (!existing) {
      throw new NotFoundException(`Assignment with ID ${id} not found`);
    }

    return this.writeWithTenant(() =>
      this.prisma.assignment.update({
        where: { id },
        data,
        include: {
          employee: true,
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
      }),
    );
  }

  /**
   * Soft delete assignment (set to CANCELLED status)
   */
  async delete(id: string): Promise<AssignmentWithRelations> {
    this.logOperation('DELETE', 'Assignment', id);

    // First verify the assignment exists and belongs to the current tenant
    const existing = await this.findById(id);
    if (!existing) {
      throw new NotFoundException(`Assignment with ID ${id} not found`);
    }

    return this.writeWithTenant(() =>
      this.prisma.assignment.update({
        where: { id },
        data: {
          status: 'CANCELLED',
          endDate: new Date(),
        },
        include: {
          employee: true,
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
      }),
    );
  }

  /**
   * Find assignments with search and filtering
   */
  async findMany(
    filters: AssignmentSearchFilters = {},
    page?: number,
    limit?: number,
    sortBy?: keyof Assignment,
    sortOrder?: 'asc' | 'desc',
  ): Promise<{
    assignments: AssignmentWithRelations[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    this.logOperation('LIST', 'Assignment');

    const pagination = this.getPaginationParams(page, limit);
    const sorting = this.getSortingParams(sortBy, sortOrder);

    const where = this.buildAssignmentSearchFilter(filters);

    const [assignments, total] = await Promise.all([
      this.findWithTenant(() =>
        this.prisma.assignment.findMany({
          where,
          include: {
            employee: true,
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
          orderBy: sorting,
          skip: pagination.skip,
          take: pagination.take,
        }),
      ) as Promise<AssignmentWithRelations[]>,
      this.findWithTenant(() => this.prisma.assignment.count({ where })) as Promise<number>,
    ]);

    return {
      assignments,
      total,
      page: page || 1,
      limit: limit || 20,
      totalPages: Math.ceil(total / (limit || 20)),
    };
  }

  /**
   * Find assignments by employee ID
   */
  async findByEmployeeId(employeeId: string): Promise<AssignmentWithRelations[]> {
    this.logOperation('SEARCH', 'Assignment', `employee:${employeeId}`);

    // Validate employee belongs to current tenant
    await this.validateEmployeeBelongsToTenant(employeeId);

    return this.findWithTenant(() =>
      this.prisma.assignment.findMany({
        where: {
          employeeId,
          status: {
            not: 'CANCELLED',
          },
        },
        include: {
          employee: true,
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
        orderBy: { startDate: 'desc' },
      }),
    ) as Promise<AssignmentWithRelations[]>;
  }

  /**
   * Find assignments by site ID
   */
  async findBySiteId(siteId: string): Promise<AssignmentWithRelations[]> {
    this.logOperation('SEARCH', 'Assignment', `site:${siteId}`);

    // Validate site belongs to current tenant
    await this.validateSiteBelongsToTenant(siteId);

    return this.findWithTenant(() =>
      this.prisma.assignment.findMany({
        where: {
          siteId,
          status: {
            not: 'CANCELLED',
          },
        },
        include: {
          employee: true,
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
        orderBy: { startDate: 'desc' },
      }),
    ) as Promise<AssignmentWithRelations[]>;
  }

  /**
   * Find active assignments with skill matching scores
   */
  async findAssignmentsWithSkillMatching(
    requiredSkills: string[],
  ): Promise<(AssignmentWithRelations & { skillMatchingScore: SkillMatchingScore })[]> {
    this.logOperation('MATCH', 'Assignment', `skills:${requiredSkills.join(',')}`);

    const assignments = await this.findWithTenant(() =>
      this.prisma.assignment.findMany({
        where: {
          employee: {
            companyId: this.getTenantFilter().companyId,
            employmentStatus: 'ACTIVE',
          },
          status: 'ACTIVE',
        },
        include: {
          employee: true,
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
      }),
    ) as AssignmentWithRelations[];

    // Calculate skill matching scores
    return assignments.map(assignment => {
      const employeeSkills = assignment.employee.skills || [];
      const matchedSkills = employeeSkills.filter(skill => 
        requiredSkills.includes(skill)
      );
      const missingSkills = requiredSkills.filter(skill => 
        !employeeSkills.includes(skill)
      );
      
      const matchPercentage = requiredSkills.length > 0 
        ? Math.round((matchedSkills.length / requiredSkills.length) * 100)
        : 100;

      const competencyScore = this.calculateCompetencyScore(assignment.employee, requiredSkills);
      const experienceScore = this.calculateExperienceScore(assignment.employee, assignment.role);

      const skillMatchingScore: SkillMatchingScore = {
        assignmentId: assignment.id,
        matchPercentage,
        matchedSkills,
        missingSkills,
        competencyScore,
        experienceScore,
      };

      return {
        ...assignment,
        skillMatchingScore,
      };
    }).sort((a, b) => b.skillMatchingScore.matchPercentage - a.skillMatchingScore.matchPercentage);
  }

  /**
   * Check for scheduling conflicts
   */
  async detectConflicts(
    employeeId: string,
    siteId: string,
    startDate: Date,
    endDate?: Date,
    excludeAssignmentId?: string,
  ): Promise<ConflictDetails[]> {
    this.logOperation('CONFLICT_CHECK', 'Assignment', `${employeeId}-${siteId}`);

    const conflicts: ConflictDetails[] = [];

    // Check for employee double booking
    const employeeConflicts = await this.findWithTenant(() =>
      this.prisma.assignment.findMany({
        where: {
          employeeId,
          status: {
            in: ['ACTIVE', 'PENDING'],
          },
          id: excludeAssignmentId ? { not: excludeAssignmentId } : undefined,
          OR: [
            {
              startDate: { lte: endDate || startDate },
              endDate: { gte: startDate },
            },
            {
              startDate: { lte: endDate || startDate },
              endDate: null, // Ongoing assignments
            },
          ],
        },
        include: {
          site: {
            select: { name: true }
          }
        },
      }),
    ) as Array<Assignment & { site: { name: string } }>;

    if (employeeConflicts.length > 0) {
      conflicts.push({
        type: 'EMPLOYEE_DOUBLE_BOOKING',
        severity: 'HIGH',
        description: `Employee is already assigned to ${employeeConflicts.length} other site(s) during this period`,
        conflictingEntityId: employeeConflicts[0].id,
        suggestions: [
          'Adjust the assignment dates',
          'Find an alternative employee',
          'Negotiate with existing client for schedule changes',
        ],
      });
    }

    // Check site capacity (simplified - would need site capacity requirements)
    const siteAssignments = await this.findWithTenant(() =>
      this.prisma.assignment.count({
        where: {
          siteId,
          status: {
            in: ['ACTIVE', 'PENDING'],
          },
          id: excludeAssignmentId ? { not: excludeAssignmentId } : undefined,
          OR: [
            {
              startDate: { lte: endDate || startDate },
              endDate: { gte: startDate },
            },
            {
              startDate: { lte: endDate || startDate },
              endDate: null,
            },
          ],
        },
      }),
    ) as number;

    // Assume max 5 concurrent assignments per site (would be configurable in real system)
    if (siteAssignments >= 5) {
      conflicts.push({
        type: 'SITE_CAPACITY_EXCEEDED',
        severity: 'MEDIUM',
        description: `Site already has ${siteAssignments} active assignments (approaching capacity limit)`,
        suggestions: [
          'Review site staffing requirements',
          'Consider staggered shift times',
          'Evaluate if all current assignments are necessary',
        ],
      });
    }

    return conflicts;
  }

  /**
   * Get assignment statistics for the current tenant
   */
  async getAssignmentStats(): Promise<{
    total: number;
    active: number;
    inactive: number;
    completed: number;
    cancelled: number;
    averageHourlyRate: number;
    uniqueEmployees: number;
    uniqueSites: number;
    roleDistribution: Record<string, number>;
  }> {
    this.logOperation('STATS', 'Assignment');

    const tenantFilter = {
      employee: {
        companyId: this.getTenantFilter().companyId,
      },
    };

    const [total, active, inactive, completed, cancelled] = await Promise.all([
      this.findWithTenant(() =>
        this.prisma.assignment.count({
          where: tenantFilter,
        }),
      ) as Promise<number>,
      this.findWithTenant(() =>
        this.prisma.assignment.count({
          where: { ...tenantFilter, status: 'ACTIVE' },
        }),
      ) as Promise<number>,
      this.findWithTenant(() =>
        this.prisma.assignment.count({
          where: { ...tenantFilter, status: 'INACTIVE' },
        }),
      ) as Promise<number>,
      this.findWithTenant(() =>
        this.prisma.assignment.count({
          where: { ...tenantFilter, status: 'COMPLETED' },
        }),
      ) as Promise<number>,
      this.findWithTenant(() =>
        this.prisma.assignment.count({
          where: { ...tenantFilter, status: 'CANCELLED' },
        }),
      ) as Promise<number>,
    ]);

    // Calculate average hourly rate
    const assignments = await this.findWithTenant(() =>
      this.prisma.assignment.findMany({
        where: tenantFilter,
        select: {
          hourlyRate: true,
          role: true,
          employeeId: true,
          siteId: true,
        },
      }),
    ) as Array<{ hourlyRate: any; role: string; employeeId: string; siteId: string }>;

    const totalRate = assignments.reduce((sum, assignment) => {
      return sum + parseFloat(assignment.hourlyRate.toString());
    }, 0);
    const averageHourlyRate = assignments.length > 0 ? totalRate / assignments.length : 0;

    // Calculate unique employees and sites
    const uniqueEmployees = new Set(assignments.map(a => a.employeeId)).size;
    const uniqueSites = new Set(assignments.map(a => a.siteId)).size;

    // Calculate role distribution
    const roleDistribution = assignments.reduce((dist, assignment) => {
      dist[assignment.role] = (dist[assignment.role] || 0) + 1;
      return dist;
    }, {} as Record<string, number>);

    return {
      total,
      active,
      inactive,
      completed,
      cancelled,
      averageHourlyRate,
      uniqueEmployees,
      uniqueSites,
      roleDistribution,
    };
  }

  /**
   * Build search filter for assignment queries
   */
  private buildAssignmentSearchFilter(filters: AssignmentSearchFilters): Prisma.AssignmentWhereInput {
    const conditions: Prisma.AssignmentWhereInput[] = [];

    // Add tenant filter through employee relationship
    conditions.push({
      employee: {
        companyId: this.getTenantFilter().companyId,
      },
    });

    // Text search across role, employee names, and site names
    if (filters.search) {
      conditions.push({
        OR: [
          { role: { contains: filters.search, mode: 'insensitive' } },
          {
            employee: {
              OR: [
                { firstName: { contains: filters.search, mode: 'insensitive' } },
                { lastName: { contains: filters.search, mode: 'insensitive' } },
                { employeeNumber: { contains: filters.search, mode: 'insensitive' } },
              ],
            },
          },
          {
            site: {
              name: { contains: filters.search, mode: 'insensitive' },
            },
          },
        ],
      });
    }

    // Specific filters
    if (filters.employeeId) {
      conditions.push({ employeeId: filters.employeeId });
    }

    if (filters.siteId) {
      conditions.push({ siteId: filters.siteId });
    }

    if (filters.role) {
      conditions.push({ role: { contains: filters.role, mode: 'insensitive' } });
    }

    // Status filters
    const statusFilters = [];
    if (!filters.includeInactive) {
      statusFilters.push('INACTIVE');
    }
    if (!filters.includeCompleted) {
      statusFilters.push('COMPLETED');
    }
    if (!filters.includeCancelled) {
      statusFilters.push('CANCELLED');
    }

    if (filters.status) {
      conditions.push({ status: filters.status as any });
    } else if (statusFilters.length > 0) {
      conditions.push({
        status: {
          notIn: statusFilters as any[],
        },
      });
    }

    // Date range filters
    if (filters.startDateFrom || filters.startDateTo) {
      const dateFilter = this.buildDateRangeFilter(filters.startDateFrom, filters.startDateTo);
      if (dateFilter) {
        conditions.push({ startDate: dateFilter });
      }
    }

    if (filters.endDateFrom || filters.endDateTo) {
      const dateFilter = this.buildDateRangeFilter(filters.endDateFrom, filters.endDateTo);
      if (dateFilter) {
        conditions.push({ endDate: dateFilter });
      }
    }

    // Hourly rate range
    if (filters.minHourlyRate || filters.maxHourlyRate) {
      const rateFilter: any = {};
      if (filters.minHourlyRate) {
        rateFilter.gte = filters.minHourlyRate;
      }
      if (filters.maxHourlyRate) {
        rateFilter.lte = filters.maxHourlyRate;
      }
      conditions.push({ hourlyRate: rateFilter });
    }

    // Priority and urgency filters
    if (filters.priority !== undefined) {
      // Priority would be stored in metadata or responsibilities JSON
      // This is a simplified implementation
    }

    if (filters.urgency !== undefined) {
      // Urgency would be stored in metadata
      // This is a simplified implementation
    }

    return conditions.length > 0 ? { AND: conditions } : {};
  }

  /**
   * Validate that an employee belongs to the current tenant
   */
  private async validateEmployeeBelongsToTenant(employeeId: string): Promise<void> {
    const employee = await this.findWithTenant(() =>
      this.prisma.employee.findUnique({
        where: { id: employeeId },
        select: { companyId: true },
      }),
    ) as { companyId: string } | null;

    if (!employee) {
      throw new NotFoundException(`Employee with ID ${employeeId} not found`);
    }

    this.validateTenantOwnership(employee.companyId);
  }

  /**
   * Validate that a site belongs to the current tenant (through client relationship)
   */
  private async validateSiteBelongsToTenant(siteId: string): Promise<void> {
    const site = await this.findWithTenant(() =>
      this.prisma.site.findUnique({
        where: { id: siteId },
        include: {
          client: {
            select: { companyId: true },
          },
        },
      }),
    ) as { client: { companyId: string } } | null;

    if (!site) {
      throw new NotFoundException(`Site with ID ${siteId} not found`);
    }

    this.validateTenantOwnership(site.client.companyId);
  }

  /**
   * Calculate competency score for an employee based on required skills
   */
  private calculateCompetencyScore(employee: Employee, requiredSkills: string[]): number {
    const employeeSkills = employee.skills || [];
    const certifications = (employee.certifications as any) || [];
    
    let score = 0;
    let maxScore = requiredSkills.length * 5; // Max 5 points per skill
    
    requiredSkills.forEach(skill => {
      if (employeeSkills.includes(skill)) {
        score += 3; // Base points for having the skill
        
        // Bonus points for certifications
        const hasCertification = Array.isArray(certifications) && 
          certifications.some((cert: any) => 
            cert.name && cert.name.toLowerCase().includes(skill.toLowerCase())
          );
        
        if (hasCertification) {
          score += 2;
        }
      }
    });
    
    return maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
  }

  /**
   * Calculate experience score for an employee in a specific role
   */
  private calculateExperienceScore(employee: Employee, role: string): number {
    const metadata = (employee.metadata as any) || {};
    const performanceMetrics = metadata.performanceMetrics || {};
    
    // Base score from hire date (tenure)
    const hireDate = new Date(employee.hireDate);
    const now = new Date();
    const yearsOfService = (now.getTime() - hireDate.getTime()) / (1000 * 60 * 60 * 24 * 365);
    const tenureScore = Math.min(yearsOfService * 20, 60); // Max 60 points from tenure
    
    // Performance rating score
    const performanceRating = performanceMetrics.overallRating || 3;
    const performanceScore = (performanceRating / 5) * 40; // Max 40 points from performance
    
    return Math.round(tenureScore + performanceScore);
  }
}
