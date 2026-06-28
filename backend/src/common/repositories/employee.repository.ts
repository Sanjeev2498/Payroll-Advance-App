import { Injectable, NotFoundException } from '@nestjs/common';
import { TenantAwareRepository } from '../tenant-aware.repository';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantContextService } from '../tenant-context.service';
import { Employee, Prisma } from '@prisma/client';

export interface CreateEmployeeDto {
  employeeNumber: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  contactInfo?: Prisma.JsonValue;
  hireDate: Date;
  employmentType?: string;
  department?: string;
  jobTitle?: string;
  skills?: Prisma.JsonValue;
  certifications?: Prisma.JsonValue;
  complianceStatus?: Prisma.JsonValue;
  availability?: Prisma.JsonValue;
  performanceMetrics?: Prisma.JsonValue;
  hourlyRate?: number;
  metadata?: Prisma.JsonValue;
}

export interface UpdateEmployeeDto extends Partial<CreateEmployeeDto> {
  employmentStatus?: string;
  terminationDate?: Date;
}

export interface EmployeeSearchFilters {
  search?: string;
  skills?: string[];
  employmentStatus?: string;
  department?: string;
  jobTitle?: string;
  hireDateFrom?: Date;
  hireDateTo?: Date;
  availabilityStatus?: string;
  certificationExpiringBefore?: string;
  complianceStatus?: string;
}

export interface SkillMatchResult {
  employee: Employee;
  matchPercentage: number;
  matchedSkills: string[];
  missingSkills: string[];
  availabilityScore: number;
}

@Injectable()
export class EmployeeRepository extends TenantAwareRepository {
  constructor(
    protected readonly prisma: PrismaService,
    protected readonly tenantContext: TenantContextService,
  ) {
    super(prisma, tenantContext);
  }

  /**
   * Create a new employee
   */
  async create(data: CreateEmployeeDto): Promise<Employee> {
    this.logOperation('CREATE', 'Employee');

    // Convert skills array to proper format for database storage
    const skillsArray = this.extractSkillNames(data.skills);

    return this.writeWithTenant(() =>
      this.prisma.employee.create({
        data: {
          ...data,
          skills: skillsArray,
          ...this.getTenantFilter(),
          employmentStatus: 'ACTIVE',
        },
      }),
    );
  }

  /**
   * Find employee by ID with tenant isolation
   */
  async findById(id: string): Promise<Employee | null> {
    this.logOperation('READ', 'Employee', id);

    return this.findWithTenant(() =>
      this.prisma.employee.findFirst({
        where: {
          id,
          ...this.getTenantFilter(),
        },
      }),
    );
  }

  /**
   * Find employee by employee number
   */
  async findByEmployeeNumber(employeeNumber: string): Promise<Employee | null> {
    this.logOperation('READ', 'Employee', `number:${employeeNumber}`);

    return this.findWithTenant(() =>
      this.prisma.employee.findFirst({
        where: {
          employeeNumber,
          ...this.getTenantFilter(),
        },
      }),
    );
  }

  /**
   * Update employee by ID
   */
  async update(id: string, data: UpdateEmployeeDto): Promise<Employee> {
    this.logOperation('UPDATE', 'Employee', id);

    // First verify the employee exists and belongs to the current tenant
    const existing = await this.findById(id);
    if (!existing) {
      throw new NotFoundException(`Employee with ID ${id} not found`);
    }

    // Convert skills array to proper format for database storage
    const updateData = { ...data };
    if (data.skills) {
      updateData.skills = this.extractSkillNames(data.skills);
    }

    return this.writeWithTenant(() =>
      this.prisma.employee.update({
        where: { id },
        data: updateData,
      }),
    );
  }

  /**
   * Soft delete employee
   */
  async delete(id: string): Promise<Employee> {
    this.logOperation('DELETE', 'Employee', id);

    // First verify the employee exists and belongs to the current tenant
    const existing = await this.findById(id);
    if (!existing) {
      throw new NotFoundException(`Employee with ID ${id} not found`);
    }

    return this.writeWithTenant(() =>
      this.prisma.employee.update({
        where: { id },
        data: {
          employmentStatus: 'TERMINATED',
          terminationDate: new Date(),
        },
      }),
    );
  }

  /**
   * Find employees with search and filtering
   */
  async findMany(
    filters: EmployeeSearchFilters = {},
    page?: number,
    limit?: number,
    sortBy?: keyof Employee,
    sortOrder?: 'asc' | 'desc',
  ): Promise<{
    employees: Employee[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    this.logOperation('LIST', 'Employee');

    const pagination = this.getPaginationParams(page, limit);
    const sorting = this.getSortingParams(sortBy, sortOrder);

    const where: Prisma.EmployeeWhereInput = {
      ...this.getTenantFilter(),
      ...this.buildEmployeeSearchFilter(filters),
    };

    const [employees, total] = await Promise.all([
      this.findWithTenant(() =>
        this.prisma.employee.findMany({
          where,
          orderBy: sorting,
          skip: pagination.skip,
          take: pagination.take,
        }),
      ) as Promise<Employee[]>,
      this.findWithTenant(() => this.prisma.employee.count({ where })) as Promise<number>,
    ]);

    return {
      employees,
      total,
      page: page || 1,
      limit: limit || 20,
      totalPages: Math.ceil(total / (limit || 20)),
    };
  }

  /**
   * Find employees by skills with advanced matching
   */
  async findBySkills(requiredSkills: string[]): Promise<Employee[]> {
    this.logOperation('SEARCH', 'Employee', `skills:${requiredSkills.join(',')}`);

    return this.findWithTenant(() =>
      this.prisma.employee.findMany({
        where: {
          ...this.getTenantFilter(),
          skills: {
            hasSome: requiredSkills,
          },
          employmentStatus: 'ACTIVE',
        },
        orderBy: { lastName: 'asc' },
      }),
    );
  }

  /**
   * Advanced skills-based matching with scoring
   */
  async findEmployeesWithSkillMatching(requiredSkills: string[]): Promise<SkillMatchResult[]> {
    this.logOperation('MATCH', 'Employee', `skills-match:${requiredSkills.join(',')}`);

    const employees = await this.findWithTenant(() =>
      this.prisma.employee.findMany({
        where: {
          ...this.getTenantFilter(),
          employmentStatus: 'ACTIVE',
        },
        orderBy: { lastName: 'asc' },
      }),
    ) as Employee[];

    return employees.map(employee => {
      const employeeSkills = employee.skills || [];
      const matchedSkills = employeeSkills.filter(skill => 
        requiredSkills.includes(skill)
      );
      const missingSkills = requiredSkills.filter(skill => 
        !employeeSkills.includes(skill)
      );
      
      const matchPercentage = requiredSkills.length > 0 
        ? Math.round((matchedSkills.length / requiredSkills.length) * 100)
        : 100;

      // Calculate availability score (simplified for now)
      const availabilityScore = this.calculateAvailabilityScore(employee);

      return {
        employee,
        matchPercentage,
        matchedSkills,
        missingSkills,
        availabilityScore,
      };
    }).filter(result => result.matchPercentage > 0)
      .sort((a, b) => b.matchPercentage - a.matchPercentage);
  }

  /**
   * Find available employees for a specific time range
   */
  async findAvailableEmployees(
    startDate: Date,
    endDate: Date,
    requiredSkills?: string[],
  ): Promise<Employee[]> {
    this.logOperation(
      'SEARCH',
      'Employee',
      `available:${startDate.toISOString()}-${endDate.toISOString()}`,
    );

    const skillsFilter = requiredSkills
      ? {
          skills: { hasAll: requiredSkills },
        }
      : {};

    return this.findWithTenant(() =>
      this.prisma.employee.findMany({
        where: {
          ...this.getTenantFilter(),
          ...skillsFilter,
          employmentStatus: 'ACTIVE',
          // Find employees with no conflicting assignments in the date range
          assignments: {
            none: {
              OR: [
                {
                  startDate: { lte: endDate },
                  endDate: { gte: startDate },
                },
                {
                  startDate: { lte: endDate },
                  endDate: null, // Ongoing assignments
                },
              ],
            },
          },
        },
        orderBy: { lastName: 'asc' },
      }),
    );
  }

  /**
   * Get employee statistics for the current tenant
   */
  async getEmployeeStats(): Promise<{
    total: number;
    active: number;
    inactive: number;
    onLeave: number;
    terminated: number;
    certificationsExpiringSoon: number;
    complianceIssues: number;
    averagePerformanceRating: number;
  }> {
    this.logOperation('STATS', 'Employee');

    const [total, active, inactive, onLeave, terminated] = await Promise.all([
      this.findWithTenant(() =>
        this.prisma.employee.count({
          where: this.getTenantFilter(),
        }),
      ) as Promise<number>,
      this.findWithTenant(() =>
        this.prisma.employee.count({
          where: {
            ...this.getTenantFilter(),
            employmentStatus: 'ACTIVE',
          },
        }),
      ) as Promise<number>,
      this.findWithTenant(() =>
        this.prisma.employee.count({
          where: {
            ...this.getTenantFilter(),
            employmentStatus: 'INACTIVE',
          },
        }),
      ) as Promise<number>,
      this.findWithTenant(() =>
        this.prisma.employee.count({
          where: {
            ...this.getTenantFilter(),
            employmentStatus: 'ON_LEAVE',
          },
        }),
      ) as Promise<number>,
      this.findWithTenant(() =>
        this.prisma.employee.count({
          where: {
            ...this.getTenantFilter(),
            employmentStatus: 'TERMINATED',
          },
        }),
      ) as Promise<number>,
    ]);

    // Calculate certifications expiring soon and compliance issues
    const certificationsExpiringSoon = await this.countCertificationsExpiringSoon();
    const complianceIssues = await this.countComplianceIssues();
    const averagePerformanceRating = await this.calculateAveragePerformanceRating();

    return { 
      total, 
      active, 
      inactive, 
      onLeave, 
      terminated,
      certificationsExpiringSoon,
      complianceIssues,
      averagePerformanceRating,
    };
  }

  /**
   * Find employees with expiring certifications
   */
  async findEmployeesWithExpiringCertifications(daysUntilExpiry: number = 30): Promise<Employee[]> {
    this.logOperation('SEARCH', 'Employee', `certifications-expiring:${daysUntilExpiry}`);

    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + daysUntilExpiry);

    // This is a simplified implementation - in reality, we'd need to parse the certifications JSON
    // and check individual certification expiry dates
    return this.findWithTenant(() =>
      this.prisma.employee.findMany({
        where: {
          ...this.getTenantFilter(),
          employmentStatus: 'ACTIVE',
          certifications: {
            not: null,
          },
        },
        orderBy: { lastName: 'asc' },
      }),
    );
  }

  /**
   * Find employees by compliance status
   */
  async findByComplianceStatus(status: 'COMPLIANT' | 'NON_COMPLIANT' | 'PENDING'): Promise<Employee[]> {
    this.logOperation('SEARCH', 'Employee', `compliance:${status}`);

    // This would need to be implemented based on the actual compliance status logic
    // For now, return all active employees
    return this.findWithTenant(() =>
      this.prisma.employee.findMany({
        where: {
          ...this.getTenantFilter(),
          employmentStatus: 'ACTIVE',
        },
        orderBy: { lastName: 'asc' },
      }),
    );
  }

  /**
   * Build search filter for employee queries
   */
  private buildEmployeeSearchFilter(filters: EmployeeSearchFilters): Prisma.EmployeeWhereInput {
    const conditions: Prisma.EmployeeWhereInput[] = [];

    // Text search across name, email, and employee number
    if (filters.search) {
      const textSearch = this.buildTextSearchFilter(filters.search, [
        'firstName',
        'lastName',
        'email',
        'employeeNumber',
      ]);
      conditions.push(textSearch);
    }

    // Skills filter
    if (filters.skills && filters.skills.length > 0) {
      conditions.push({
        skills: { hasSome: filters.skills },
      });
    }

    // Employment status filter
    if (filters.employmentStatus) {
      conditions.push({
        employmentStatus: filters.employmentStatus as any,
      });
    }

    // Department filter
    if (filters.department) {
      // Since we don't have complex JSONB path queries in this simplified version,
      // we'll skip the department filter for now
      // In a production system, you'd implement proper JSONB querying
    }

    // Job title filter
    if (filters.jobTitle) {
      // Since we don't have complex JSONB path queries in this simplified version,
      // we'll skip the job title filter for now
      // In a production system, you'd implement proper JSONB querying
    }

    // Hire date range filter
    if (filters.hireDateFrom || filters.hireDateTo) {
      const dateFilter = this.buildDateRangeFilter(filters.hireDateFrom, filters.hireDateTo);
      if (dateFilter) {
        conditions.push({
          hireDate: dateFilter,
        });
      }
    }

    return conditions.length > 0 ? { AND: conditions } : {};
  }

  /**
   * Extract skill names from skills data structure
   */
  private extractSkillNames(skills: any): string[] {
    if (!skills) return [];
    
    if (Array.isArray(skills)) {
      // Handle array of skill objects or strings
      return skills.map(skill => {
        if (typeof skill === 'string') return skill;
        if (skill && skill.name) return skill.name;
        return skill;
      }).filter(Boolean);
    }
    
    return [];
  }

  /**
   * Calculate availability score for an employee
   */
  private calculateAvailabilityScore(employee: Employee): number {
    // This is a simplified calculation
    // In a real implementation, you'd check current assignments, time off, etc.
    const availability = employee.metadata as any;
    
    if (!availability?.availability) return 50;
    
    // Sample scoring logic based on availability preferences
    let score = 50;
    
    if (availability.availability.maxHoursPerWeek > 30) score += 20;
    if (availability.availability.overtimeAvailability === 'YES') score += 15;
    if (availability.availability.travelAvailability === 'YES') score += 15;
    
    return Math.min(score, 100);
  }

  /**
   * Count certifications expiring soon
   */
  private async countCertificationsExpiringSoon(days: number = 30): Promise<number> {
    // This is a simplified implementation
    // In reality, you'd parse the certifications JSON and check expiry dates
    const employees = await this.findWithTenant(() =>
      this.prisma.employee.findMany({
        where: {
          ...this.getTenantFilter(),
          employmentStatus: 'ACTIVE',
          certifications: { not: null },
        },
      }),
    ) as Employee[];

    return employees.filter(employee => {
      const certifications = employee.certifications as any;
      if (!Array.isArray(certifications)) return false;
      
      const expiryThreshold = new Date();
      expiryThreshold.setDate(expiryThreshold.getDate() + days);
      
      return certifications.some((cert: any) => {
        if (!cert.expiryDate) return false;
        const expiryDate = new Date(cert.expiryDate);
        return expiryDate <= expiryThreshold;
      });
    }).length;
  }

  /**
   * Count employees with compliance issues
   */
  private async countComplianceIssues(): Promise<number> {
    // This is a simplified implementation
    // In reality, you'd check various compliance requirements
    const employees = await this.findWithTenant(() =>
      this.prisma.employee.findMany({
        where: {
          ...this.getTenantFilter(),
          employmentStatus: 'ACTIVE',
        },
      }),
    ) as Employee[];

    return employees.filter(employee => {
      const compliance = (employee.metadata as any)?.complianceStatus;
      if (!compliance) return true; // No compliance data = issue
      
      return (
        compliance.backgroundCheck !== 'APPROVED' ||
        compliance.medicalClearance !== 'APPROVED' ||
        compliance.drugTestStatus !== 'PASSED'
      );
    }).length;
  }

  /**
   * Calculate average performance rating
   */
  private async calculateAveragePerformanceRating(): Promise<number> {
    const employees = await this.findWithTenant(() =>
      this.prisma.employee.findMany({
        where: {
          ...this.getTenantFilter(),
          employmentStatus: 'ACTIVE',
        },
      }),
    ) as Employee[];

    const ratingsSum = employees.reduce((sum, employee) => {
      const performance = (employee.metadata as any)?.performanceMetrics;
      const rating = performance?.overallRating || 0;
      return sum + rating;
    }, 0);

    const employeesWithRatings = employees.filter(employee => {
      const performance = (employee.metadata as any)?.performanceMetrics;
      return performance?.overallRating > 0;
    }).length;

    return employeesWithRatings > 0 ? ratingsSum / employeesWithRatings : 0;
  }
}
