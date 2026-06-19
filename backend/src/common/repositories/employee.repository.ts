import { Injectable } from '@nestjs/common';
import { TenantAwareRepository } from '../tenant-aware.repository';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantContextService } from '../tenant-context.service';
import { Employee, Prisma } from '@prisma/client';

export interface CreateEmployeeDto {
  employeeNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  address?: Prisma.JsonValue;
  skills?: string[];
  certifications?: Prisma.JsonValue;
  hourlyRate?: number;
  hireDate?: Date;
}

export interface UpdateEmployeeDto extends Partial<CreateEmployeeDto> {}

export interface EmployeeSearchFilters {
  search?: string;
  skills?: string[];
  employmentStatus?: string;
  hireDateFrom?: Date;
  hireDateTo?: Date;
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

    return this.writeWithTenant(() =>
      this.prisma.employee.create({
        data: {
          ...data,
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
      throw new Error(`Employee with ID ${id} not found`);
    }

    return this.writeWithTenant(() =>
      this.prisma.employee.update({
        where: { id },
        data,
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
      throw new Error(`Employee with ID ${id} not found`);
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
    sortOrder?: 'asc' | 'desc'
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
      this.findWithTenant(() =>
        this.prisma.employee.count({ where }),
      ) as Promise<number>,
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
   * Find employees by skills
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
   * Find available employees for a specific time range
   */
  async findAvailableEmployees(
    startDate: Date,
    endDate: Date,
    requiredSkills?: string[]
  ): Promise<Employee[]> {
    this.logOperation('SEARCH', 'Employee', `available:${startDate.toISOString()}-${endDate.toISOString()}`);

    const skillsFilter = requiredSkills ? {
      skills: { hasAll: requiredSkills }
    } : {};

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
  }> {
    this.logOperation('STATS', 'Employee');

    const [total, active, inactive, onLeave] = await Promise.all([
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
            employmentStatus: 'TERMINATED',
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
    ]);

    return { total, active, inactive, onLeave };
  }

  /**
   * Build search filter for employee queries
   */
  private buildEmployeeSearchFilter(filters: EmployeeSearchFilters): Prisma.EmployeeWhereInput {
    const conditions: Prisma.EmployeeWhereInput[] = [];

    // Text search across name and email
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

    // Hire date range filter
    if (filters.hireDateFrom || filters.hireDateTo) {
      const dateFilter = this.buildDateRangeFilter(
        filters.hireDateFrom,
        filters.hireDateTo
      );
      if (dateFilter) {
        conditions.push({
          hireDate: dateFilter,
        });
      }
    }

    return conditions.length > 0 ? { AND: conditions } : {};
  }
}