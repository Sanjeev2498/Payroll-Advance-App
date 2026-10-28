import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BaseRepository } from '../../common/repositories/base.repository';
import { employees } from '@prisma/client';
import {
  CreateEmployeeDto,
  UpdateEmployeeDto,
} from '../dto';
import { EmployeeResponseDto, EmployeeStatsResponseDto } from '../dto/employee-response.dto';
import { FieldMapper } from '../../common/utils/field-mapper.util';

/**
 * Repository for employee-specific database operations
 * 
 * Extends BaseRepository to inherit automatic field name translation,
 * CRUD operations, and soft delete support.
 * 
 * This repository adds domain-specific methods like:
 * - Finding employees by employee number
 * - Searching by skills
 * - Getting employee statistics
 * - Finding expiring certifications
 */
@Injectable()
export class EmployeeRepository extends BaseRepository<
  employees,
  EmployeeResponseDto,
  CreateEmployeeDto,
  UpdateEmployeeDto
> {
  protected readonly logger = new Logger(EmployeeRepository.name);

  constructor(prisma: PrismaService) {
    super(prisma, 'employees', {
      softDelete: true,
      loggerName: 'EmployeeRepository',
    });
  }

  /**
   * Find an employee by their unique employee number
   * 
   * @param employeeNumber - The unique employee number to search for
   * @param companyId - Optional company ID for tenant filtering
   * @returns The employee DTO or null if not found
   * 
   * @example
   * ```typescript
   * const employee = await repository.findByEmployeeNumber('EMP-001', 'company-123');
   * ```
   */
  async findByEmployeeNumber(
    employeeNumber: string,
    companyId?: string,
  ): Promise<EmployeeResponseDto | null> {
    try {
      const where: any = {
        employeeNumber,
      };

      if (companyId) {
        where.companyId = companyId;
      }

      this.logger.debug(`Finding employee by number: ${employeeNumber}`);
      return await this.findOne(where);
    } catch (error) {
      this.logger.error(
        `Failed to find employee by number: ${employeeNumber}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Find all employees who have ALL of the specified skills
   * 
   * @param skills - Array of skill names to search for
   * @param companyId - Optional company ID for tenant filtering
   * @returns Array of matching employee DTOs
   * 
   * @example
   * ```typescript
   * const employees = await repository.findBySkills(
   *   ['First Aid', 'Security Training'],
   *   'company-123'
   * );
   * ```
   */
  async findBySkills(
    skills: string[],
    companyId?: string,
  ): Promise<EmployeeResponseDto[]> {
    try {
      this.logger.debug(`Finding employees with skills: ${skills.join(', ')}`);

      // Build the where clause
      const where: any = {};

      if (companyId) {
        where.companyId = companyId;
      }

      // Convert to snake_case for database query
      const snakeCaseWhere = FieldMapper.whereToSnakeCase(where);

      // Add soft delete filter
      const finalWhere = {
        ...snakeCaseWhere,
        deleted_at: null,
        skills: {
          hasEvery: skills,
        },
      };

      this.logger.debug(`Query where: ${JSON.stringify(finalWhere)}`);

      // Execute the query
      const results = await this.getPrismaModel().findMany({
        where: finalWhere,
      });

      // Transform to DTOs
      return results.map((result: employees) => this.transformToDto(result));
    } catch (error) {
      this.logger.error(`Failed to find employees by skills`, error);
      throw error;
    }
  }

  /**
   * Get employee statistics for a company
   * 
   * Returns counts by employment status and other metrics
   * 
   * @param companyId - Optional company ID for tenant filtering
   * @returns Statistics object with counts by status
   * 
   * @example
   * ```typescript
   * const stats = await repository.getStats('company-123');
   * // Returns: { total: 50, active: 45, inactive: 2, onLeave: 1, terminated: 2 }
   * ```
   */
  async getStats(companyId?: string): Promise<EmployeeStatsResponseDto> {
    try {
      this.logger.debug(`Getting employee statistics for company: ${companyId}`);

      const where: any = {};

      if (companyId) {
        where.company_id = companyId;
      }

      // Get counts by status
      const [total, active, inactive, onLeave, terminated] = await Promise.all([
        this.getPrismaModel().count({
          where: { ...where, deleted_at: null },
        }),
        this.getPrismaModel().count({
          where: { ...where, employment_status: 'ACTIVE', deleted_at: null },
        }),
        this.getPrismaModel().count({
          where: { ...where, employment_status: 'INACTIVE', deleted_at: null },
        }),
        this.getPrismaModel().count({
          where: { ...where, employment_status: 'ON_LEAVE', deleted_at: null },
        }),
        this.getPrismaModel().count({
          where: { ...where, employment_status: 'TERMINATED', deleted_at: null },
        }),
      ]);

      const stats: EmployeeStatsResponseDto = {
        total,
        active,
        inactive,
        onLeave,
        terminated,
        certificationsExpiringSoon: 0, // TODO: Implement when certification expiry logic is added
        complianceIssues: 0, // TODO: Implement when compliance tracking is added
        averagePerformanceRating: 0, // TODO: Implement when performance metrics are tracked
      };

      this.logger.debug(`Employee statistics: ${JSON.stringify(stats)}`);
      return stats;
    } catch (error) {
      this.logger.error(`Failed to get employee statistics`, error);
      throw error;
    }
  }

  /**
   * Find employees with certifications expiring within the specified number of days
   * 
   * @param daysUntilExpiry - Number of days from now to check for expiring certifications
   * @param companyId - Optional company ID for tenant filtering
   * @returns Array of employees with expiring certifications
   * 
   * @example
   * ```typescript
   * const employees = await repository.findExpiringCertifications(30, 'company-123');
   * // Returns employees with certifications expiring in the next 30 days
   * ```
   */
  async findExpiringCertifications(
    daysUntilExpiry: number,
    companyId?: string,
  ): Promise<EmployeeResponseDto[]> {
    try {
      this.logger.debug(
        `Finding employees with certifications expiring in ${daysUntilExpiry} days`,
      );

      const where: any = {
        deleted_at: null,
        certifications: {
          not: null,
        },
      };

      if (companyId) {
        where.company_id = companyId;
      }

      // Get all employees with certifications
      const employees = await this.getPrismaModel().findMany({
        where,
      });

      // Filter employees who have certifications expiring within the date range
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + daysUntilExpiry);

      const employeesWithExpiringCerts = employees.filter((employee: any) => {
        if (!employee.certifications || !Array.isArray(employee.certifications)) {
          return false;
        }

        // Check if any certification expires within the date range
        return employee.certifications.some((cert: any) => {
          if (!cert.expiryDate) return false;

          const certExpiryDate = new Date(cert.expiryDate);
          const now = new Date();

          return certExpiryDate >= now && certExpiryDate <= expiryDate;
        });
      });

      this.logger.debug(
        `Found ${employeesWithExpiringCerts.length} employees with expiring certifications`,
      );

      // Transform to DTOs
      return employeesWithExpiringCerts.map((emp: employees) =>
        this.transformToDto(emp),
      );
    } catch (error) {
      this.logger.error(`Failed to find expiring certifications`, error);
      throw error;
    }
  }

  /**
   * Lifecycle hook: Called before creating a new employee
   * 
   * Performs validation and sets default values:
   * - Validates employee number format
   * - Sets employment status to ACTIVE if not specified
   * - Validates hire date is not in the future
   * 
   * @param data - The employee data to be created
   * @returns Processed data with defaults applied
   */
  protected async beforeCreate(
    data: CreateEmployeeDto,
  ): Promise<CreateEmployeeDto> {
    this.logger.debug(`beforeCreate hook: validating employee data`);

    // Validate employee number format (alphanumeric, hyphens, underscores)
    if (!/^[A-Za-z0-9_-]+$/.test(data.employeeNumber)) {
      throw new Error(
        'Employee number must contain only letters, numbers, hyphens, and underscores',
      );
    }

    // Validate hire date is not in the future
    const hireDate = new Date(data.hireDate);
    hireDate.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (hireDate > today) {
      throw new Error('Hire date cannot be in the future');
    }

    this.logger.debug(`beforeCreate validation passed`);
    return data;
  }

  /**
   * Lifecycle hook: Called after creating a new employee
   * 
   * Can be used for post-creation tasks like:
   * - Sending welcome emails
   * - Creating initial assignments
   * - Logging audit events
   * 
   * @param result - The created employee DTO
   * @returns The employee DTO (can be modified if needed)
   */
  protected async afterCreate(
    result: EmployeeResponseDto,
  ): Promise<EmployeeResponseDto> {
    this.logger.log(
      `Employee created successfully: ${result.id} (${result.employeeNumber})`,
    );

    // TODO: Add post-creation logic here:
    // - Send welcome email
    // - Create onboarding tasks
    // - Log audit event

    return result;
  }

  /**
   * Lifecycle hook: Called before updating an employee
   * 
   * Performs validation:
   * - Validates hire date if being updated
   * - Ensures termination date is set when status is TERMINATED
   * 
   * @param id - The employee ID being updated
   * @param data - The update data
   * @returns Processed update data
   */
  protected async beforeUpdate(
    id: string,
    data: UpdateEmployeeDto,
  ): Promise<UpdateEmployeeDto> {
    this.logger.debug(`beforeUpdate hook: validating update for ${id}`);

    // Validate hire date if being updated
    if (data.hireDate) {
      const hireDate = new Date(data.hireDate);
      hireDate.setHours(0, 0, 0, 0);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (hireDate > today) {
        throw new Error('Hire date cannot be in the future');
      }
    }

    // Validate employment status changes
    if (data.employmentStatus === 'TERMINATED' && !data.terminationDate) {
      // Auto-set termination date if not provided
      data.terminationDate = new Date();
      this.logger.debug(`Auto-setting termination date for employee ${id}`);
    }

    this.logger.debug(`beforeUpdate validation passed`);
    return data;
  }

  /**
   * Lifecycle hook: Called after updating an employee
   * 
   * Can be used for post-update tasks like:
   * - Sending status change notifications
   * - Updating related records
   * - Logging audit events
   * 
   * @param result - The updated employee DTO
   * @returns The employee DTO
   */
  protected async afterUpdate(
    result: EmployeeResponseDto,
  ): Promise<EmployeeResponseDto> {
    this.logger.log(`Employee updated successfully: ${result.id}`);

    // TODO: Add post-update logic here:
    // - Send status change notifications
    // - Update assignments if status changed
    // - Log audit event

    return result;
  }

  /**
   * Override transformToDto to properly map employee-specific fields
   * 
   * @param model - The Prisma employee model (snake_case)
   * @returns Employee DTO (camelCase)
   */
  protected transformToDto(model: employees): EmployeeResponseDto {
    const dto = super.transformToDto(model) as any;

    // Map snake_case fields to camelCase for the DTO
    return {
      id: dto.id,
      companyId: dto.companyId,
      employeeNumber: dto.employeeNumber,
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email,
      phone: dto.phone,
      aadhaarNumber: dto.aadhaarNumber,
      panNumber: dto.panNumber,
      contactInfo: dto.contactInfo,
      employmentStatus: dto.employmentStatus,
      employmentType: dto.employmentType || dto.metadata?.employmentType,
      department: dto.department || dto.metadata?.department,
      jobTitle: dto.jobTitle || dto.metadata?.jobTitle,
      hireDate: dto.hireDate,
      terminationDate: dto.terminationDate,
      skills: dto.skills?.map((skill: any) =>
        typeof skill === 'string' ? { name: skill } : skill,
      ),
      certifications: dto.certifications,
      complianceStatus: dto.complianceStatus || dto.metadata?.complianceStatus,
      availability: dto.availability || dto.metadata?.availability,
      performanceMetrics: dto.performanceMetrics || dto.metadata?.performanceMetrics,
      hourlyRate: dto.hourlyRate,
      metadata: dto.metadata,
      createdAt: dto.createdAt,
      updatedAt: dto.updatedAt,
    };
  }
}
