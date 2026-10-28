import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
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
import { EmployeeRepository } from './repositories/employee.repository';
import { EmployeeResponseDto } from './dto/employee-response.dto';
import { getErrorMessage, getErrorStack, formatError } from '../common/utils/error.util';



@Injectable()
export class EmployeesService {
  private readonly logger = new Logger(EmployeesService.name);

  constructor(
    private readonly employeeRepository: EmployeeRepository,
    private readonly tenantContext: TenantContextService,
    private readonly dataTransform: DataTransformService,
    private readonly encryptionUtil: EncryptionUtil,
  ) {}

  /**
   * Create a new employee with encrypted sensitive data
   */
  async create(createEmployeeDto: CreateEmployeeDto, userRole: string): Promise<EmployeeRoleResponse> {
    this.logger.log(`Creating new employee: ${createEmployeeDto.firstName} ${createEmployeeDto.lastName}`);

    const tenantId = this.getTenantIdOrThrow();

    // Check for duplicate employee number within tenant
    await this.validateUniqueEmployeeNumber(createEmployeeDto.employeeNumber, tenantId);

    // Validate conditional field requirements
    if (createEmployeeDto.employmentStatus === EmploymentStatus.TERMINATED) {
      if (!createEmployeeDto.terminationDate) {
        throw new BadRequestException('Termination date is required when employment status is TERMINATED');
      }
    }

    try {
      // Encrypt sensitive data before storing
      const encryptedData = this.dataTransform.encryptEmployeeData(createEmployeeDto);

      // Prepare employee data with camelCase (repository handles conversion)
      const employeeData: CreateEmployeeDto = {
        ...createEmployeeDto,
        ...encryptedData,
        companyId: tenantId,
        employmentStatus: createEmployeeDto.employmentStatus || EmploymentStatus.ACTIVE, // Default status
      };

      // Use repository to create employee
      const employee = await this.employeeRepository.create(employeeData);

      this.logger.log(`Successfully created employee: ${employee.id}`);

      // Return role-based view of the employee data
      return this.dataTransform.transformEmployeeForRole(employee as any, userRole, false);
    } catch (error) {
      const errorInfo = formatError(error);
      this.logger.error(`${errorInfo.message}`, errorInfo.stack);
      throw new BadRequestException(`${errorInfo.message}`);
    }
  }

  /**
   * Find all employees with role-based data filtering
   */
  async findAll(queryDto: EmployeeQueryDto, userRole: string, requestingUserId?: string) {
    this.logger.log('Fetching employees list with filters', { queryDto });

    const tenantId = this.getTenantIdOrThrow();

    const where: any = {
      companyId: tenantId,
    };

    // Apply filters (using camelCase - repository handles conversion)
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
      const page = queryDto.page || 1;
      const limit = queryDto.limit || 10;
      const skip = (page - 1) * limit;

      // Use repository's findMany with options
      const employees = await this.employeeRepository.findMany(where, {
        skip,
        take: limit,
        orderBy: {
          [queryDto.sortBy || 'createdAt']: queryDto.sortOrder || 'desc',
        },
      });

      const total = await this.employeeRepository.count(where);

      // Transform each employee based on user role
      const transformedEmployees = employees.map((employee) => {
        const isOwnData = requestingUserId === employee.id;
        return this.dataTransform.transformEmployeeForRole(employee as any, userRole, isOwnData);
      });

      this.logger.log(`Found ${total} employees`);
      
      return {
        employees: transformedEmployees,
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      };
    } catch (error) {
      const errorInfo = formatError(error);
      this.logger.error(`${errorInfo.message}`, errorInfo.stack);
      throw new BadRequestException(`${errorInfo.message}`);
    }
  }

  /**
   * Find employee by ID with role-based data filtering
   */
  async findOne(id: string, userRole: string, requestingUserId?: string): Promise<EmployeeRoleResponse> {
    this.logger.log(`Fetching employee: ${id}`);

    const tenantId = this.getTenantIdOrThrow();

    const employee = await this.employeeRepository.findById(id);

    if (!employee || employee.companyId !== tenantId) {
      throw new NotFoundException(`Employee with ID ${id} not found`);
    }

    const isOwnData = requestingUserId === employee.id;
    return this.dataTransform.transformEmployeeForRole(employee as any, userRole, isOwnData);
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

    const tenantId = this.getTenantIdOrThrow();

    // Check for duplicate employee number if being updated
    if (updateEmployeeDto.employeeNumber) {
      await this.validateUniqueEmployeeNumber(updateEmployeeDto.employeeNumber, tenantId, id);
    }

    try {
      // Get current employee first
      const currentEmployee = await this.employeeRepository.findById(id);

      if (!currentEmployee || currentEmployee.companyId !== tenantId) {
        throw new NotFoundException(`Employee with ID ${id} not found`);
      }

      // Validate employment status transition if status is being changed
      if (updateEmployeeDto.employmentStatus && 
          updateEmployeeDto.employmentStatus !== currentEmployee.employmentStatus) {
        this.validateEmploymentStatusTransition(
          currentEmployee.employmentStatus,
          updateEmployeeDto.employmentStatus
        );
      }

      // Validate conditional field requirements
      if (updateEmployeeDto.employmentStatus === EmploymentStatus.TERMINATED) {
        if (!updateEmployeeDto.terminationDate && !currentEmployee.terminationDate) {
          throw new BadRequestException('Termination date is required when employment status is TERMINATED');
        }
      }

      // Encrypt sensitive data in the update
      const encryptedUpdateData = this.dataTransform.encryptEmployeeData(updateEmployeeDto);

      // Prepare update data (repository handles field mapping)
      const updateData: UpdateEmployeeDto = {
        ...updateEmployeeDto,
        ...encryptedUpdateData,
      };

      const updatedEmployee = await this.employeeRepository.update(id, updateData);

      this.logger.log(`Successfully updated employee: ${id}`);

      // Handle employment status changes
      if (updateEmployeeDto.employmentStatus) {
        await this.handleEmploymentStatusChange(updatedEmployee as any, updateEmployeeDto.employmentStatus);
      }

      const isOwnData = requestingUserId === updatedEmployee.id;
      return this.dataTransform.transformEmployeeForRole(updatedEmployee as any, userRole, isOwnData);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Failed to update employee: ${getErrorMessage(error)}`, getErrorStack(error));
      throw new BadRequestException(`Failed to update employee: ${getErrorMessage(error)}`);
    }
  }

  /**
   * Soft delete employee (set to TERMINATED status)
   */
  async remove(id: string, userRole: string): Promise<EmployeeRoleResponse> {
    this.logger.log(`Soft deleting employee: ${id}`);

    const tenantId = this.getTenantIdOrThrow();

    try {
      // First get the employee to verify it exists
      const employee = await this.employeeRepository.findById(id);
      
      if (!employee) {
        throw new NotFoundException(`Employee with ID ${id} not found`);
      }

      // Update to TERMINATED status and set termination date
      const terminatedEmployee = await this.employeeRepository.update(id, {
        employmentStatus: EmploymentStatus.TERMINATED,
        terminationDate: new Date(),
      });

      // Also perform soft delete (sets deleted_at)
      await this.employeeRepository.delete(id);

      this.logger.log(`Successfully soft deleted employee: ${id}`);

      // Handle termination workflow
      await this.handleEmployeeTermination(terminatedEmployee as any);

      return this.dataTransform.transformEmployeeForRole(terminatedEmployee as any, userRole, false);
    } catch (error) {
      const errorInfo = formatError(error);
      this.logger.error(`${errorInfo.message}`, errorInfo.stack);
      throw new BadRequestException(`${errorInfo.message}`);
    }
  }

  /**
   * Advanced search by skills and availability (simplified)
   */
  async searchEmployees(searchDto: EmployeeSearchDto, userRole: string) {
    this.logger.log('Performing advanced employee search', { searchDto });

    const tenantId = this.getTenantIdOrThrow();

    try {
      const where: any = {
        companyId: tenantId,
        employmentStatus: EmploymentStatus.ACTIVE,
      };

      if (searchDto.requiredSkills && searchDto.requiredSkills.length > 0) {
        where.skills = {
          hasEvery: searchDto.requiredSkills,
        };
      }

      const employees = await this.employeeRepository.findMany(where, {
        take: 50, // Limit results
      });

      const results = employees.map(employee => {
        const transformedEmployee = this.dataTransform.transformEmployeeForRole(employee as any, userRole, false);
        
        // Calculate match percentage (simplified)
        const empSkills = Array.isArray(employee.skills) ? employee.skills : [];
        // Extract skill names from skill objects or use strings directly
        const skillNames = empSkills.map((skill: any) => 
          typeof skill === 'string' ? skill : skill.name || skill
        );
        
        const matchPercentage = searchDto.requiredSkills 
          ? Math.min(100, (skillNames.length / searchDto.requiredSkills.length) * 100)
          : 100;

        return {
          employee: transformedEmployee,
          matchPercentage,
          matchedSkills: skillNames,
          missingSkills: [],
          availabilityScore: 75, // Default score
        };
      });

      this.logger.log(`Found ${results.length} matching employees`);
      return results;
    } catch (error) {
      const errorInfo = formatError(error);
      this.logger.error(`${errorInfo.message}`, errorInfo.stack);
      throw new BadRequestException(`${errorInfo.message}`);
    }
  }

  /**
   * Find employees by specific skills
   */
  async findBySkills(skills: string[], userRole: string) {
    this.logger.log(`Finding employees with skills: ${skills.join(', ')}`);

    const tenantId = this.getTenantIdOrThrow();

    try {
      const employees = await this.employeeRepository.findBySkills(skills, tenantId);

      const transformedEmployees = employees.map(employee => 
        this.dataTransform.transformEmployeeForRole(employee as any, userRole, false)
      );

      this.logger.log(`Found ${transformedEmployees.length} employees with required skills`);
      return transformedEmployees;
    } catch (error) {
      const errorInfo = formatError(error);
      this.logger.error(`${errorInfo.message}`, errorInfo.stack);
      throw new BadRequestException(`${errorInfo.message}`);
    }
  }

  /**
   * Find available employees for scheduling (simplified)
   */
  async findAvailable(startDate?: string, endDate?: string, requiredSkills?: string[], userRole?: string) {
    this.logger.log('Finding available employees for scheduling');

    const tenantId = this.getTenantIdOrThrow();

    try {
      const where: any = {
        companyId: tenantId,
        employmentStatus: EmploymentStatus.ACTIVE,
      };

      if (requiredSkills && requiredSkills.length > 0) {
        where.skills = {
          hasEvery: requiredSkills,
        };
      }

      const employees = await this.employeeRepository.findMany(where);

      if (userRole) {
        return employees.map(employee => 
          this.dataTransform.transformEmployeeForRole(employee as any, userRole, false)
        );
      }

      return employees;
    } catch (error) {
      const errorInfo = formatError(error);
      this.logger.error(`${errorInfo.message}`, errorInfo.stack);
      throw new BadRequestException(`${errorInfo.message}`);
    }
  }

  /**
   * Get employee statistics
   */
  async getStats(userRole: string) {
    this.logger.log('Fetching employee statistics');

    const tenantId = this.getTenantIdOrThrow();

    try {
      const stats = await this.employeeRepository.getStats(tenantId);

      this.logger.log('Successfully fetched employee statistics', stats);
      return stats;
    } catch (error) {
      const errorInfo = formatError(error);
      this.logger.error(`${errorInfo.message}`, errorInfo.stack);
      throw new BadRequestException(`${errorInfo.message}`);
    }
  }

  /**
   * Find employees with expiring certifications (simplified)
   */
  async findExpiringCertifications(days: number = 30, userRole: string) {
    this.logger.log(`Finding employees with certifications expiring in ${days} days`);

    const tenantId = this.getTenantIdOrThrow();

    try {
      const employees = await this.employeeRepository.findExpiringCertifications(days, tenantId);

      const transformedEmployees = employees.map(employee => 
        this.dataTransform.transformEmployeeForRole(employee as any, userRole, false)
      );

      this.logger.log(`Found ${transformedEmployees.length} employees with certifications`);
      return transformedEmployees;
    } catch (error) {
      const errorInfo = formatError(error);
      this.logger.error(`${errorInfo.message}`, errorInfo.stack);
      throw new BadRequestException(`${errorInfo.message}`);
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
   * Assign employee to client with business rule validation
   */
  async assignToClient(employeeId: string, clientId: string): Promise<void> {
    this.logger.log(`Assigning employee ${employeeId} to client ${clientId}`);

    const tenantId = this.getTenantIdOrThrow();

    // Validate employee exists and belongs to tenant
    const employee = await this.employeeRepository.findById(employeeId);
    if (!employee || employee.companyId !== tenantId) {
      throw new NotFoundException(`Employee with ID ${employeeId} not found`);
    }

    // Validate employee status is ACTIVE
    if (employee.employmentStatus === EmploymentStatus.TERMINATED) {
      throw new BadRequestException('Cannot assign terminated employee to client');
    }

    if (employee.employmentStatus !== EmploymentStatus.ACTIVE) {
      throw new BadRequestException(`Cannot assign employee with status ${employee.employmentStatus} to client`);
    }

    // Validate client exists (would need ClientRepository injected)
    // For now, we'll implement basic validation
    // TODO: Inject ClientRepository and validate client exists
    
    this.logger.log(`Successfully validated assignment of employee ${employeeId} to client ${clientId}`);
    
    // TODO: Implement actual assignment logic when assignment entity is available
    // await this.assignmentRepository.create({ employeeId, clientId, ... });
  }

  /**
   * Get tenant ID or throw exception
   */
  private getTenantIdOrThrow(): string {
    try {
      const tenantId = this.tenantContext.getTenantId();
      if (!tenantId) {
        throw new BadRequestException('Tenant context not found');
      }
      return tenantId;
    } catch (error) {
      throw new BadRequestException('Tenant context not found');
    }
  }

  /**
   * Employee onboarding workflow
   */
  private async initiateEmployeeOnboarding(employee: EmployeeResponseDto): Promise<void> {
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
      this.logger.error(`Onboarding workflow failed for employee ${employee.id}: ${getErrorMessage(error)}`);
      // Don't throw here - onboarding failure shouldn't prevent employee creation
    }
  }

  /**
   * Handle employment status changes
   */
  private async handleEmploymentStatusChange(
    employee: EmployeeResponseDto,
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
      this.logger.error(`Status change handling failed for employee ${employee.id}: ${getErrorMessage(error)}`);
      // Don't throw here - status change workflow failure shouldn't prevent the update
    }
  }

  /**
   * Handle employee termination workflow
   */
  private async handleEmployeeTermination(employee: EmployeeResponseDto): Promise<void> {
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
      this.logger.error(`Termination workflow failed for employee ${employee.id}: ${getErrorMessage(error)}`);
      // Don't throw here - termination workflow failure shouldn't prevent the deletion
    }
  }

  /**
   * Validate employee number uniqueness within tenant
   */
  private async validateUniqueEmployeeNumber(employeeNumber: string, tenantId: string, excludeId?: string): Promise<void> {
    try {
      const existing = await this.employeeRepository.findByEmployeeNumber(employeeNumber, tenantId);
      
      if (existing && existing.id !== excludeId) {
        throw new ConflictException(`Employee number ${employeeNumber} already exists`);
      }
    } catch (error) {
      // Re-throw ConflictExceptions - they are business logic errors
      if (error instanceof ConflictException) {
        throw error;
      }
      
      // Log other errors but don't throw
      this.logger.error(`Error validating employee number uniqueness: ${getErrorMessage(error)}`);
    }
  }

  /**
   * Validate employment status transition rules
   */
  private validateEmploymentStatusTransition(
    currentStatus: EmploymentStatus,
    newStatus: EmploymentStatus
  ): void {
    // Define invalid status transitions
    const invalidTransitions = [
      { from: EmploymentStatus.TERMINATED, to: EmploymentStatus.ACTIVE, reason: 'Cannot reactivate a terminated employee' },
      { from: EmploymentStatus.TERMINATED, to: EmploymentStatus.ON_LEAVE, reason: 'Terminated employees cannot go on leave' },
      { from: EmploymentStatus.TERMINATED, to: EmploymentStatus.INACTIVE, reason: 'Terminated employees cannot be set to inactive' },
    ];

    const invalidTransition = invalidTransitions.find(
      t => t.from === currentStatus && t.to === newStatus
    );

    if (invalidTransition) {
      throw new BadRequestException(
        `Invalid employment status transition: ${invalidTransition.reason}`
      );
    }
  }
}





