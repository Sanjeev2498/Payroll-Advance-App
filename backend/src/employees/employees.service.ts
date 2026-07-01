import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from '../common/tenant-context.service';
import { DataTransformService } from '../common/services/data-transform.service';
import { EncryptionUtil } from '../common/utils/encryption.util';
import { 
  CreateEmployeeDto, 
  UpdateEmployeeDto, 
  EmployeeQueryDto, 
  EmployeeSearchDto,
  EmploymentStatus 
} from './dto';
import { EmployeeRoleResponse } from '../common/dto/encrypted-field.dto';
import { Employee } from '@prisma/client';

@Injectable()
export class EmployeesService {
  private readonly logger = new Logger(EmployeesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
    private readonly dataTransform: DataTransformService,
    private readonly encryptionUtil: EncryptionUtil,
  ) {}

  /**
   * Create a new employee with encrypted sensitive data
   */
  async create(createEmployeeDto: CreateEmployeeDto, userRole: string): Promise<EmployeeRoleResponse> {
    this.logger.log(`Creating new employee: ${createEmployeeDto.firstName} ${createEmployeeDto.lastName}`);

    const tenantId = this.tenantContext.getTenantId();
    if (!tenantId) {
      throw new BadRequestException('Tenant context not found');
    }

    // Validate hire date
    if (createEmployeeDto.hireDate > new Date()) {
      throw new BadRequestException('Hire date cannot be in the future');
    }

    // Check for duplicate employee number within tenant
    await this.validateUniqueEmployeeNumber(createEmployeeDto.employeeNumber);

    try {
      // Encrypt sensitive data before storing
      const encryptedData = this.dataTransform.encryptEmployeeData(createEmployeeDto);

      // Prepare employee data
      const employeeData = {
        companyId: tenantId,
        employeeNumber: createEmployeeDto.employeeNumber,
        firstName: createEmployeeDto.firstName,
        lastName: createEmployeeDto.lastName,
        hireDate: createEmployeeDto.hireDate,
        skills: createEmployeeDto.skills?.map(skill => skill.name) || [], // Extract skill names
        employmentStatus: 'ACTIVE', // Default status
        certifications: createEmployeeDto.certifications as any,
        address: createEmployeeDto.contactInfo?.address as any,
        metadata: {
          employmentType: createEmployeeDto.employmentType,
          department: createEmployeeDto.department,
          jobTitle: createEmployeeDto.jobTitle,
          contactInfo: createEmployeeDto.contactInfo,
          complianceStatus: createEmployeeDto.complianceStatus,
          availability: createEmployeeDto.availability,
          performanceMetrics: createEmployeeDto.performanceMetrics,
          hourlyRate: createEmployeeDto.hourlyRate,
          ...createEmployeeDto.metadata,
        } as any,
        // Encrypted fields
        ...encryptedData,
      };

      const employee = await this.prisma.employee.create({
        data: employeeData,
      });

      this.logger.log(`Successfully created employee: ${employee.id}`);

      // Return role-based view of the employee data
      return this.dataTransform.transformEmployeeForRole(employee, userRole, false);
    } catch (error) {
      this.logger.error(`Failed to create employee: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to create employee: ${error.message}`);
    }
  }

  /**
   * Find all employees with role-based data filtering
   */
  async findAll(queryDto: EmployeeQueryDto, userRole: string, requestingUserId?: string) {
    this.logger.log('Fetching employees list with filters', { queryDto });

    const tenantId = this.tenantContext.getTenantId();
    if (!tenantId) {
      throw new BadRequestException('Tenant context not found');
    }

    const where: any = {
      companyId: tenantId,
    };

    // Apply filters
    if (queryDto.search) {
      where.OR = [
        { firstName: { contains: queryDto.search, mode: 'insensitive' } },
        { lastName: { contains: queryDto.search, mode: 'insensitive' } },
        { employeeNumber: { contains: queryDto.search, mode: 'insensitive' } },
      ];
    }

    if (queryDto.employmentStatus) {
      where.employmentStatus = queryDto.employmentStatus;
    }

    if (queryDto.skills && queryDto.skills.length > 0) {
      where.skills = {
        hasEvery: queryDto.skills,
      };
    }

    // Handle date filters
    if (queryDto.hireDateFrom || queryDto.hireDateTo) {
      where.hireDate = {};
      if (queryDto.hireDateFrom) {
        where.hireDate.gte = new Date(queryDto.hireDateFrom);
      }
      if (queryDto.hireDateTo) {
        where.hireDate.lte = new Date(queryDto.hireDateTo);
      }
    }

    try {
      const skip = ((queryDto.page || 1) - 1) * (queryDto.limit || 10);
      const take = queryDto.limit || 10;

      const [employees, total] = await Promise.all([
        this.prisma.employee.findMany({
          where,
          skip,
          take,
          orderBy: {
            [queryDto.sortBy || 'createdAt']: queryDto.sortOrder || 'desc',
          },
        }),
        this.prisma.employee.count({ where }),
      ]);

      // Transform each employee based on user role
      const transformedEmployees = employees.map((employee) => {
        const isOwnData = requestingUserId === employee.id;
        return this.dataTransform.transformEmployeeForRole(employee, userRole, isOwnData);
      });

      this.logger.log(`Found ${total} employees`);
      
      return {
        employees: transformedEmployees,
        total,
        page: queryDto.page || 1,
        limit: queryDto.limit || 10,
        pages: Math.ceil(total / (queryDto.limit || 10)),
      };
    } catch (error) {
      this.logger.error(`Failed to fetch employees: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to fetch employees: ${error.message}`);
    }
  }

  /**
   * Find employee by ID with role-based data filtering
   */
  async findOne(id: string, userRole: string, requestingUserId?: string): Promise<EmployeeRoleResponse> {
    this.logger.log(`Fetching employee: ${id}`);

    const tenantId = this.tenantContext.getTenantId();
    if (!tenantId) {
      throw new BadRequestException('Tenant context not found');
    }

    const employee = await this.prisma.employee.findFirst({
      where: {
        id,
        companyId: tenantId,
      },
    });

    if (!employee) {
      throw new NotFoundException(`Employee with ID ${id} not found`);
    }

    const isOwnData = requestingUserId === employee.id;
    return this.dataTransform.transformEmployeeForRole(employee, userRole, isOwnData);
  }

  /**
   * Update employee information with encryption
   */
  async update(
    id: string, 
    updateEmployeeDto: UpdateEmployeeDto, 
    userRole: string,
    requestingUserId?: string
  ): Promise<EmployeeRoleResponse> {
    this.logger.log(`Updating employee: ${id}`);

    const tenantId = this.tenantContext.getTenantId();
    if (!tenantId) {
      throw new BadRequestException('Tenant context not found');
    }

    // Validate hire date if being updated
    if (updateEmployeeDto.hireDate && updateEmployeeDto.hireDate > new Date()) {
      throw new BadRequestException('Hire date cannot be in the future');
    }

    // Check for duplicate employee number if being updated
    if (updateEmployeeDto.employeeNumber) {
      await this.validateUniqueEmployeeNumber(updateEmployeeDto.employeeNumber, id);
    }

    try {
      // Get current employee first
      const currentEmployee = await this.prisma.employee.findFirst({
        where: { id, companyId: tenantId },
      });

      if (!currentEmployee) {
        throw new NotFoundException(`Employee with ID ${id} not found`);
      }

      // Encrypt sensitive data in the update
      const encryptedUpdateData = this.dataTransform.encryptEmployeeData(updateEmployeeDto);

      // Prepare update data
      const updateData: any = {
        ...updateEmployeeDto,
        ...encryptedUpdateData,
      };

      // Handle metadata updates
      if (updateEmployeeDto.employmentType || updateEmployeeDto.department || 
          updateEmployeeDto.jobTitle || updateEmployeeDto.metadata) {
        
        const currentMetadata = (currentEmployee.metadata as any) || {};
        
        updateData.metadata = {
          ...currentMetadata,
          ...(updateEmployeeDto.employmentType && { employmentType: updateEmployeeDto.employmentType }),
          ...(updateEmployeeDto.department && { department: updateEmployeeDto.department }),
          ...(updateEmployeeDto.jobTitle && { jobTitle: updateEmployeeDto.jobTitle }),
          ...updateEmployeeDto.metadata,
        };
      }

      const updatedEmployee = await this.prisma.employee.update({
        where: { id },
        data: updateData,
      });

      this.logger.log(`Successfully updated employee: ${id}`);

      // Handle employment status changes
      if (updateEmployeeDto.employmentStatus) {
        await this.handleEmploymentStatusChange(updatedEmployee, updateEmployeeDto.employmentStatus);
      }

      const isOwnData = requestingUserId === updatedEmployee.id;
      return this.dataTransform.transformEmployeeForRole(updatedEmployee, userRole, isOwnData);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to update employee: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to update employee: ${error.message}`);
    }
  }

  /**
   * Soft delete employee (set to TERMINATED status)
   */
  async remove(id: string, userRole: string): Promise<EmployeeRoleResponse> {
    this.logger.log(`Soft deleting employee: ${id}`);

    const tenantId = this.tenantContext.getTenantId();
    if (!tenantId) {
      throw new BadRequestException('Tenant context not found');
    }

    try {
      const deletedEmployee = await this.prisma.employee.update({
        where: { 
          id,
          companyId: tenantId,
        },
        data: {
          employmentStatus: 'TERMINATED',
          terminationDate: new Date(),
        },
      });

      this.logger.log(`Successfully soft deleted employee: ${id}`);

      // Handle termination workflow
      await this.handleEmployeeTermination(deletedEmployee);

      return this.dataTransform.transformEmployeeForRole(deletedEmployee, userRole, false);
    } catch (error) {
      this.logger.error(`Failed to delete employee: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to delete employee: ${error.message}`);
    }
  }

  /**
   * Advanced search by skills and availability (simplified)
   */
  async searchEmployees(searchDto: EmployeeSearchDto, userRole: string) {
    this.logger.log('Performing advanced employee search', { searchDto });

    const tenantId = this.tenantContext.getTenantId();
    if (!tenantId) {
      throw new BadRequestException('Tenant context not found');
    }

    try {
      const where: any = {
        companyId: tenantId,
        employmentStatus: 'ACTIVE',
      };

      if (searchDto.requiredSkills && searchDto.requiredSkills.length > 0) {
        where.skills = {
          hasEvery: searchDto.requiredSkills,
        };
      }

      const employees = await this.prisma.employee.findMany({
        where,
        take: 50, // Limit results
      });

      const results = employees.map(employee => {
        const transformedEmployee = this.dataTransform.transformEmployeeForRole(employee, userRole, false);
        
        // Calculate match percentage (simplified)
        const matchPercentage = searchDto.requiredSkills 
          ? Math.min(100, (employee.skills.length / searchDto.requiredSkills.length) * 100)
          : 100;

        return {
          employee: transformedEmployee,
          matchPercentage,
          matchedSkills: employee.skills,
          missingSkills: [],
          availabilityScore: 75, // Default score
        };
      });

      this.logger.log(`Found ${results.length} matching employees`);
      return results;
    } catch (error) {
      this.logger.error(`Failed to search employees: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to search employees: ${error.message}`);
    }
  }

  /**
   * Find employees by specific skills
   */
  async findBySkills(skills: string[], userRole: string) {
    this.logger.log(`Finding employees with skills: ${skills.join(', ')}`);

    const tenantId = this.tenantContext.getTenantId();
    if (!tenantId) {
      throw new BadRequestException('Tenant context not found');
    }

    try {
      const employees = await this.prisma.employee.findMany({
        where: {
          companyId: tenantId,
          employmentStatus: 'ACTIVE',
          skills: {
            hasEvery: skills,
          },
        },
      });

      const transformedEmployees = employees.map(employee => 
        this.dataTransform.transformEmployeeForRole(employee, userRole, false)
      );

      this.logger.log(`Found ${transformedEmployees.length} employees with required skills`);
      return transformedEmployees;
    } catch (error) {
      this.logger.error(`Failed to find employees by skills: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to find employees by skills: ${error.message}`);
    }
  }

  /**
   * Find available employees for scheduling (simplified)
   */
  async findAvailable(startDate?: string, endDate?: string, requiredSkills?: string[], userRole?: string) {
    this.logger.log('Finding available employees for scheduling');

    const tenantId = this.tenantContext.getTenantId();
    if (!tenantId) {
      throw new BadRequestException('Tenant context not found');
    }

    try {
      const where: any = {
        companyId: tenantId,
        employmentStatus: 'ACTIVE',
      };

      if (requiredSkills && requiredSkills.length > 0) {
        where.skills = {
          hasEvery: requiredSkills,
        };
      }

      const employees = await this.prisma.employee.findMany({
        where,
      });

      if (userRole) {
        return employees.map(employee => 
          this.dataTransform.transformEmployeeForRole(employee, userRole, false)
        );
      }

      return employees;
    } catch (error) {
      this.logger.error(`Failed to find available employees: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to find available employees: ${error.message}`);
    }
  }

  /**
   * Get employee statistics
   */
  async getStats(userRole: string) {
    this.logger.log('Fetching employee statistics');

    const tenantId = this.tenantContext.getTenantId();
    if (!tenantId) {
      throw new BadRequestException('Tenant context not found');
    }

    try {
      const [total, active, inactive, onLeave, terminated] = await Promise.all([
        this.prisma.employee.count({ where: { companyId: tenantId } }),
        this.prisma.employee.count({ where: { companyId: tenantId, employmentStatus: 'ACTIVE' } }),
        this.prisma.employee.count({ where: { companyId: tenantId, employmentStatus: 'INACTIVE' } }),
        this.prisma.employee.count({ where: { companyId: tenantId, employmentStatus: 'ON_LEAVE' } }),
        this.prisma.employee.count({ where: { companyId: tenantId, employmentStatus: 'TERMINATED' } }),
      ]);

      const stats = {
        total,
        active,
        inactive,
        onLeave,
        terminated,
        certificationsExpiringSoon: 0, // TODO: Implement when certification tracking is added
        complianceIssues: 0, // TODO: Implement when compliance tracking is added
        averagePerformanceRating: 0, // TODO: Implement when performance tracking is added
      };

      this.logger.log('Successfully fetched employee statistics', stats);
      return stats;
    } catch (error) {
      this.logger.error(`Failed to fetch stats: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to fetch employee statistics: ${error.message}`);
    }
  }

  /**
   * Find employees with expiring certifications (simplified)
   */
  async findExpiringCertifications(days: number = 30, userRole: string) {
    this.logger.log(`Finding employees with certifications expiring in ${days} days`);

    const tenantId = this.tenantContext.getTenantId();
    if (!tenantId) {
      throw new BadRequestException('Tenant context not found');
    }

    try {
      // This is a simplified version - would need more complex logic for actual certification tracking
      const employees = await this.prisma.employee.findMany({
        where: {
          companyId: tenantId,
          employmentStatus: 'ACTIVE',
          certifications: {
            not: null,
          },
        },
      });

      const transformedEmployees = employees.map(employee => 
        this.dataTransform.transformEmployeeForRole(employee, userRole, false)
      );

      this.logger.log(`Found ${transformedEmployees.length} employees with certifications`);
      return transformedEmployees;
    } catch (error) {
      this.logger.error(`Failed to find expiring certifications: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to find expiring certifications: ${error.message}`);
    }
  }

  /**
   * Handle employee documents (placeholder for future implementation)
   */
  async getEmployeeDocuments(employeeId: string, userRole: string = 'ADMIN') {
    this.logger.log(`Fetching documents for employee: ${employeeId}`);
    
    // Verify employee exists
    await this.findOne(employeeId, userRole);
    
    // TODO: Implement document management
    return [];
  }

  /**
   * Upload employee document (placeholder for future implementation)
   */
  async uploadDocument(employeeId: string, documentData: any, userRole: string = 'ADMIN'): Promise<any> {
    this.logger.log(`Uploading document for employee: ${employeeId}`);
    
    // Verify employee exists
    await this.findOne(employeeId, userRole);
    
    // TODO: Implement document upload
    // For now, return a mock response
    return {
      id: 'doc-123',
      employeeId,
      type: documentData.type,
      name: documentData.name,
      filePath: '/documents/mock-path',
      fileSize: 1024,
      uploadedAt: new Date(),
      status: 'UPLOADED',
      expiryDate: documentData.expiryDate,
      metadata: documentData.metadata,
    };
  }

  /**
   * Employee onboarding workflow
   */
  private async initiateEmployeeOnboarding(employee: Employee): Promise<void> {
    this.logger.log(`Initiating onboarding workflow for employee: ${employee.id}`);

    try {
      // TODO: Implement onboarding steps:
      // 1. Send welcome email with handbook
      // 2. Create training checklist
      // 3. Schedule orientation sessions
      // 4. Set up compliance tracking
      // 5. Generate employee ID card
      // 6. Create initial performance review schedule

      this.logger.log(`Onboarding workflow initiated for employee: ${employee.id}`);
    } catch (error) {
      this.logger.error(`Onboarding workflow failed for employee ${employee.id}: ${error.message}`);
      // Don't throw here - onboarding failure shouldn't prevent employee creation
    }
  }

  /**
   * Handle employment status changes
   */
  private async handleEmploymentStatusChange(
    employee: Employee,
    newStatus: EmploymentStatus,
  ): Promise<void> {
    this.logger.log(`Handling status change for employee ${employee.id}: ${newStatus}`);

    try {
      switch (newStatus) {
        case EmploymentStatus.ACTIVE:
          // TODO: Reactivate services, send activation notification
          break;
        case EmploymentStatus.TERMINATED:
          // TODO: Deactivate services, final pay calculations, exit interview
          break;
        case EmploymentStatus.ON_LEAVE:
          // TODO: Suspend assignments, notify supervisors
          break;
        case EmploymentStatus.INACTIVE:
          // TODO: Temporary suspension of duties
          break;
      }
    } catch (error) {
      this.logger.error(`Status change handling failed for employee ${employee.id}: ${error.message}`);
      // Don't throw here - status change workflow failure shouldn't prevent the update
    }
  }

  /**
   * Handle employee termination workflow
   */
  private async handleEmployeeTermination(employee: Employee): Promise<void> {
    this.logger.log(`Handling termination workflow for employee: ${employee.id}`);

    try {
      // TODO: Implement termination steps:
      // 1. Calculate final pay and benefits
      // 2. Return company property checklist
      // 3. Export employee data for retention
      // 4. Notify relevant stakeholders
      // 5. Update related assignments and schedules
      // 6. Schedule exit interview

      this.logger.log(`Termination workflow completed for employee: ${employee.id}`);
    } catch (error) {
      this.logger.error(`Termination workflow failed for employee ${employee.id}: ${error.message}`);
      // Don't throw here - termination workflow failure shouldn't prevent the deletion
    }
  }

  /**
   * Validate employee number uniqueness within tenant
   */
  private async validateUniqueEmployeeNumber(employeeNumber: string, excludeId?: string): Promise<void> {
    const tenantId = this.tenantContext.getTenantId();
    if (!tenantId) {
      throw new BadRequestException('Tenant context not found');
    }

    const where: any = {
      companyId: tenantId,
      employeeNumber,
    };

    if (excludeId) {
      where.id = { not: excludeId };
    }

    const existing = await this.prisma.employee.findFirst({ where });
    if (existing) {
      throw new ConflictException(`Employee number ${employeeNumber} already exists`);
    }
  }
}