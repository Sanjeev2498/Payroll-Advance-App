import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { EmployeeRepository } from '../common/repositories/employee.repository';
import { TenantContextService } from '../common/tenant-context.service';
import { 
  CreateEmployeeDto, 
  UpdateEmployeeDto, 
  EmployeeQueryDto, 
  EmployeeSearchDto,
  EmploymentStatus 
} from './dto';
import { Employee } from '@prisma/client';

@Injectable()
export class EmployeesService {
  private readonly logger = new Logger(EmployeesService.name);

  constructor(
    private readonly employeeRepository: EmployeeRepository,
    private readonly tenantContext: TenantContextService,
  ) {}

  /**
   * Create a new employee with comprehensive data validation
   */
  async create(createEmployeeDto: CreateEmployeeDto): Promise<Employee> {
    this.logger.log(`Creating new employee: ${createEmployeeDto.firstName} ${createEmployeeDto.lastName}`);

    // Validate hire date
    if (createEmployeeDto.hireDate > new Date()) {
      throw new BadRequestException('Hire date cannot be in the future');
    }

    // Check for duplicate employee number within tenant
    await this.validateUniqueEmployeeNumber(createEmployeeDto.employeeNumber);

    // Check for duplicate email if provided
    if (createEmployeeDto.email) {
      await this.validateUniqueEmail(createEmployeeDto.email);
    }

    try {
      // Prepare employee data with proper metadata structure
      const employeeData = {
        employeeNumber: createEmployeeDto.employeeNumber,
        firstName: createEmployeeDto.firstName,
        lastName: createEmployeeDto.lastName,
        email: createEmployeeDto.email,
        phone: createEmployeeDto.phone,
        hireDate: createEmployeeDto.hireDate,
        skills: createEmployeeDto.skills as any, // Repository will handle the conversion
        certifications: createEmployeeDto.certifications as any,
        contactInfo: createEmployeeDto.contactInfo as any,
        employmentType: createEmployeeDto.employmentType,
        department: createEmployeeDto.department,
        jobTitle: createEmployeeDto.jobTitle,
        complianceStatus: createEmployeeDto.complianceStatus as any,
        availability: createEmployeeDto.availability as any,
        performanceMetrics: createEmployeeDto.performanceMetrics as any,
        hourlyRate: createEmployeeDto.hourlyRate,
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
      };

      const employee = await this.employeeRepository.create(employeeData);
      this.logger.log(`Successfully created employee: ${employee.id}`);

      // Trigger onboarding workflow
      await this.initiateEmployeeOnboarding(employee);

      return employee;
    } catch (error) {
      this.logger.error(`Failed to create employee: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to create employee: ${error.message}`);
    }
  }

  /**
   * Find all employees with advanced filtering and pagination
   */
  async findAll(queryDto: EmployeeQueryDto) {
    this.logger.log('Fetching employees list with filters', { queryDto });

    const filters = {
      search: queryDto.search,
      skills: queryDto.skills,
      employmentStatus: queryDto.employmentStatus,
      department: queryDto.department,
      jobTitle: queryDto.jobTitle,
      hireDateFrom: queryDto.hireDateFrom ? new Date(queryDto.hireDateFrom) : undefined,
      hireDateTo: queryDto.hireDateTo ? new Date(queryDto.hireDateTo) : undefined,
      availabilityStatus: queryDto.availabilityStatus,
      certificationExpiringBefore: queryDto.certificationExpiringBefore,
      complianceStatus: queryDto.complianceStatus,
    };

    try {
      const result = await this.employeeRepository.findMany(
        filters,
        queryDto.page,
        queryDto.limit,
        queryDto.sortBy as any,
        queryDto.sortOrder,
      );

      this.logger.log(`Found ${result.total} employees`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to fetch employees: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to fetch employees: ${error.message}`);
    }
  }

  /**
   * Find employee by ID with related data
   */
  async findOne(id: string): Promise<Employee> {
    this.logger.log(`Fetching employee: ${id}`);

    const employee = await this.employeeRepository.findById(id);
    if (!employee) {
      throw new NotFoundException(`Employee with ID ${id} not found`);
    }

    return employee;
  }

  /**
   * Update employee information
   */
  async update(id: string, updateEmployeeDto: UpdateEmployeeDto): Promise<Employee> {
    this.logger.log(`Updating employee: ${id}`);

    // Validate hire date if being updated
    if (updateEmployeeDto.hireDate && updateEmployeeDto.hireDate > new Date()) {
      throw new BadRequestException('Hire date cannot be in the future');
    }

    // Check for duplicate employee number if being updated
    if (updateEmployeeDto.employeeNumber) {
      await this.validateUniqueEmployeeNumber(updateEmployeeDto.employeeNumber, id);
    }

    // Check for duplicate email if being updated
    if (updateEmployeeDto.email) {
      await this.validateUniqueEmail(updateEmployeeDto.email, id);
    }

    try {
      // Prepare update data with proper metadata structure
      const updateData: any = {
        ...updateEmployeeDto,
      };

      // Handle metadata fields
      if (updateEmployeeDto.employmentType || updateEmployeeDto.department || 
          updateEmployeeDto.jobTitle || updateEmployeeDto.contactInfo ||
          updateEmployeeDto.complianceStatus || updateEmployeeDto.availability ||
          updateEmployeeDto.performanceMetrics || updateEmployeeDto.hourlyRate ||
          updateEmployeeDto.metadata) {
        
        // Get current employee to merge metadata
        const currentEmployee = await this.findOne(id);
        const currentMetadata = ((currentEmployee as any).metadata) || {};
        
        updateData.metadata = {
          ...currentMetadata,
          ...(updateEmployeeDto.employmentType && { employmentType: updateEmployeeDto.employmentType }),
          ...(updateEmployeeDto.department && { department: updateEmployeeDto.department }),
          ...(updateEmployeeDto.jobTitle && { jobTitle: updateEmployeeDto.jobTitle }),
          ...(updateEmployeeDto.contactInfo && { contactInfo: updateEmployeeDto.contactInfo }),
          ...(updateEmployeeDto.complianceStatus && { complianceStatus: updateEmployeeDto.complianceStatus }),
          ...(updateEmployeeDto.availability && { availability: updateEmployeeDto.availability }),
          ...(updateEmployeeDto.performanceMetrics && { performanceMetrics: updateEmployeeDto.performanceMetrics }),
          ...(updateEmployeeDto.hourlyRate && { hourlyRate: updateEmployeeDto.hourlyRate }),
          ...updateEmployeeDto.metadata,
        };
      }

      const updatedEmployee = await this.employeeRepository.update(id, updateData);
      this.logger.log(`Successfully updated employee: ${id}`);

      // Handle employment status changes
      if (updateEmployeeDto.employmentStatus) {
        await this.handleEmploymentStatusChange(updatedEmployee, updateEmployeeDto.employmentStatus);
      }

      return updatedEmployee;
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
  async remove(id: string): Promise<Employee> {
    this.logger.log(`Soft deleting employee: ${id}`);

    try {
      const deletedEmployee = await this.employeeRepository.delete(id);
      this.logger.log(`Successfully soft deleted employee: ${id}`);

      // Handle termination workflow
      await this.handleEmployeeTermination(deletedEmployee);

      return deletedEmployee;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to delete employee: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to delete employee: ${error.message}`);
    }
  }

  /**
   * Advanced search by skills and availability
   */
  async searchEmployees(searchDto: EmployeeSearchDto) {
    this.logger.log('Performing advanced employee search', { searchDto });

    try {
      const results = [];

      if (searchDto.requiredSkills && searchDto.requiredSkills.length > 0) {
        // Use skill matching algorithm
        const skillMatches = await this.employeeRepository.findEmployeesWithSkillMatching(
          searchDto.requiredSkills
        );
        
        // Filter by performance rating if specified
        const filtered = searchDto.minPerformanceRating
          ? skillMatches.filter(match => {
              const performance = ((match.employee as any).metadata)?.performanceMetrics;
              return performance?.overallRating >= searchDto.minPerformanceRating!;
            })
          : skillMatches;

        results.push(...filtered);
      } else {
        // Basic search without skills
        const employees = await this.employeeRepository.findMany({
          employmentStatus: 'ACTIVE',
        });
        
        results.push(...employees.employees.map(employee => ({
          employee,
          matchPercentage: 100,
          matchedSkills: [],
          missingSkills: [],
          availabilityScore: 75, // Default score
        })));
      }

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
  async findBySkills(skills: string[]) {
    this.logger.log(`Finding employees with skills: ${skills.join(', ')}`);

    try {
      const employees = await this.employeeRepository.findBySkills(skills);
      this.logger.log(`Found ${employees.length} employees with required skills`);
      return employees;
    } catch (error) {
      this.logger.error(`Failed to find employees by skills: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to find employees by skills: ${error.message}`);
    }
  }

  /**
   * Find available employees for scheduling
   */
  async findAvailable(startDate?: string, endDate?: string, requiredSkills?: string[]) {
    this.logger.log('Finding available employees for scheduling');

    try {
      if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const employees = await this.employeeRepository.findAvailableEmployees(
          start,
          end,
          requiredSkills
        );
        return employees;
      } else {
        // Return all active employees if no date range specified
        const result = await this.employeeRepository.findMany({
          employmentStatus: 'ACTIVE',
        });
        return result.employees;
      }
    } catch (error) {
      this.logger.error(`Failed to find available employees: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to find available employees: ${error.message}`);
    }
  }

  /**
   * Get employee statistics
   */
  async getStats() {
    this.logger.log('Fetching employee statistics');

    try {
      const stats = await this.employeeRepository.getEmployeeStats();
      this.logger.log('Successfully fetched employee statistics', stats);
      return stats;
    } catch (error) {
      this.logger.error(`Failed to fetch stats: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to fetch employee statistics: ${error.message}`);
    }
  }

  /**
   * Find employees with expiring certifications
   */
  async findExpiringCertifications(days: number = 30) {
    this.logger.log(`Finding employees with certifications expiring in ${days} days`);

    try {
      const employees = await this.employeeRepository.findEmployeesWithExpiringCertifications(days);
      this.logger.log(`Found ${employees.length} employees with expiring certifications`);
      return employees;
    } catch (error) {
      this.logger.error(`Failed to find expiring certifications: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to find expiring certifications: ${error.message}`);
    }
  }

  /**
   * Handle employee documents (placeholder for future implementation)
   */
  async getEmployeeDocuments(employeeId: string) {
    this.logger.log(`Fetching documents for employee: ${employeeId}`);
    
    // Verify employee exists
    await this.findOne(employeeId);
    
    // TODO: Implement document management
    return [];
  }

  /**
   * Upload employee document (placeholder for future implementation)
   */
  async uploadDocument(employeeId: string, documentData: any): Promise<any> {
    this.logger.log(`Uploading document for employee: ${employeeId}`);
    
    // Verify employee exists
    await this.findOne(employeeId);
    
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
    const existing = await this.employeeRepository.findByEmployeeNumber(employeeNumber);
    if (existing && (!excludeId || existing.id !== excludeId)) {
      throw new ConflictException(`Employee number ${employeeNumber} already exists`);
    }
  }

  /**
   * Validate email uniqueness within tenant
   */
  private async validateUniqueEmail(email: string, excludeId?: string): Promise<void> {
    const result = await this.employeeRepository.findMany({
      search: email,
    });
    
    const existing = result.employees.find(emp => emp.email === email);
    if (existing && (!excludeId || existing.id !== excludeId)) {
      throw new ConflictException(`Email ${email} already exists`);
    }
  }
}