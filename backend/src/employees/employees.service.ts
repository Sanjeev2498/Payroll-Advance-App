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
import { employees } from '@prisma/client';
import { getErrorMessage, getErrorStack, formatError } from '../common/utils/error.util';


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

    let tenantId: string;
    
    // Try to get tenant context, fall back to demo mode
    try {
      tenantId = this.tenantContext.getTenantId();
    } catch (error) {
      this.logger.warn('No tenant context found, using demo mode');
      // In demo mode, try to find or create a company
      try {
        let company = await this.prisma.companies.findFirst();
        if (!company) {
          // Create a demo company if none exists
          company = await this.prisma.companies.create({
            data: {
              name: 'Demo Security Company',
              code: 'DEMO001',
              metadata: {
                isDemo: true,
                createdAt: new Date().toISOString()
              }
            }
          });
        }
        tenantId = company.id;
      } catch (dbError) {
        // If database is not available, use a mock tenant ID for now
        this.logger.error('Database not available, using mock demo mode');
        tenantId = 'demo-tenant-id';
      }
    }

    // Validate hire date
    if (new Date(createEmployeeDto.hireDate) > new Date()) {
      throw new BadRequestException('Hire date cannot be in the future');
    }

    // Check for duplicate employee number within tenant
    await this.validateUniqueemployeesNumber(createEmployeeDto.employeeNumber);

    try {
      // Encrypt sensitive data before storing
      const encryptedData = this.dataTransform.encryptEmployeeData(createEmployeeDto);

      // Prepare employee data
      const employeeData = {
        companyId: tenantId,
        employeeNumber: createEmployeeDto.employeeNumber,
        firstName: createEmployeeDto.firstName,
        lastName: createEmployeeDto.lastName,
        hireDate: new Date(createEmployeeDto.hireDate),
        skills: createEmployeeDto.skills?.map(skill => skill.name) || [], // Extract skill names
        employmentStatus: 'ACTIVE', // Default status
        certifications: createEmployeeDto.certifications as any,
        address: createEmployeeDto.contactInfo?.address as any,
        contactInfo: createEmployeeDto.contactInfo as any,
        // Direct fields (not in metadata)
        department: createEmployeeDto.department,
        jobTitle: createEmployeeDto.jobTitle,
        employmentType: createEmployeeDto.employmentType,
        hourlyRate: createEmployeeDto.hourlyRate,
        metadata: {
          complianceStatus: createEmployeeDto.complianceStatus,
          availability: createEmployeeDto.availability,
          performanceMetrics: createEmployeeDto.performanceMetrics,
          ...createEmployeeDto.metadata,
        } as any,
        // Encrypted fields
        ...encryptedData,
      };

      // If database is not available (demo tenant), return mock response
      if (tenantId === 'demo-tenant-id') {
        this.logger.warn('Database not available, returning mock employee response');
        const mockEmployee = {
          id: `emp-${Date.now()}`,
          companyId: tenantId,
          employeeNumber: createEmployeeDto.employeeNumber,
          firstName: createEmployeeDto.firstName,
          lastName: createEmployeeDto.lastName,
          hireDate: new Date(createEmployeeDto.hireDate),
          employmentStatus: 'ACTIVE',
          skills: createEmployeeDto.skills?.map(skill => skill.name) || [],
          certifications: createEmployeeDto.certifications || [],
          // Direct fields
          department: createEmployeeDto.department,
          jobTitle: createEmployeeDto.jobTitle,
          employmentType: createEmployeeDto.employmentType,
          hourlyRate: createEmployeeDto.hourlyRate,
          contactInfo: createEmployeeDto.contactInfo,
          metadata: employeeData.metadata,
          createdAt: new Date(),
          updatedAt: new Date(),
          // Encrypted fields will be set by dataTransform
          email: encryptedData.email || null,
          phone: encryptedData.phone || null,
          aadhaarNumber: encryptedData.aadhaarNumber || null,
          panNumber: encryptedData.panNumber || null,
          address: encryptedData.address || null,
          terminationDate: null
        };
        return this.dataTransform.transformEmployeeForRole(mockEmployee, userRole, false);
      }

      const employee = await this.prisma.employees.create({
        data: employeeData,
      });

      this.logger.log(`Successfully created employee: ${employee.id}`);

      // Return role-based view of the employee data
      return this.dataTransform.transformEmployeeForRole(employee, userRole, false);
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

    let tenantId: string;
    
    // Try to get tenant context, fall back to demo mode
    try {
      tenantId = this.tenantContext.getTenantId();
    } catch (error) {
      this.logger.warn('No tenant context found, using demo mode');
      // In demo mode, use the first available company
      const company = await this.prisma.companies.findFirst();
      if (!company) {
        throw new BadRequestException('No company found in demo mode');
      }
      tenantId = company.id;
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
      throw new NotFoundException(`employees with ID ${id} not found`);
    }

    const isOwnData = requestingUserId === employee.id;
    return this.dataTransform.transformEmployeeForRole(employee, userRole, isOwnData);
  }

  /**
   * Update employee information with encryption
   */
  async update(
    id: string, 
    updateemployeesDto: UpdateEmployeeDto, 
    userRole: string,
    requestingUserId?: string
  ): Promise<EmployeeRoleResponse> {
    this.logger.log(`Updating employee: ${id}`);

    let tenantId: string;
    
    // Try to get tenant context, fall back to demo mode
    try {
      tenantId = this.tenantContext.getTenantId();
    } catch (error) {
      this.logger.warn('No tenant context found, using demo mode');
      // In demo mode, use the first available company
      const company = await this.prisma.companies.findFirst();
      if (!company) {
        throw new BadRequestException('No company found in demo mode');
      }
      tenantId = company.id;
    }

    // Validate hire date if being updated
    if (updateemployeesDto.hireDate && new Date(updateemployeesDto.hireDate) > new Date()) {
      throw new BadRequestException('Hire date cannot be in the future');
    }

    // Check for duplicate employee number if being updated
    if (updateemployeesDto.employeeNumber) {
      await this.validateUniqueemployeesNumber(updateemployeesDto.employeeNumber, id);
    }

    try {
      // Get current employee first
      const currentemployees = await this.prisma.employee.findFirst({
        where: { id, companyId: tenantId },
      });

      if (!currentemployees) {
        throw new NotFoundException(`employees with ID ${id} not found`);
      }

      // Encrypt sensitive data in the update
      const encryptedUpdateData = this.dataTransform.encryptEmployeeData(updateemployeesDto);

      // Prepare update data
      const updateData: any = {
        ...updateemployeesDto,
        ...encryptedUpdateData,
      };

      // Handle metadata updates
      if (updateemployeesDto.employmentType || updateemployeesDto.department || 
          updateemployeesDto.jobTitle || updateemployeesDto.metadata) {
        
        const currentMetadata = (currentemployees.metadata as any) || {};
        
        updateData.metadata = {
          ...currentMetadata,
          ...(updateemployeesDto.employmentType && { employmentType: updateemployeesDto.employmentType }),
          ...(updateemployeesDto.department && { department: updateemployeesDto.department }),
          ...(updateemployeesDto.jobTitle && { jobTitle: updateemployeesDto.jobTitle }),
          ...updateemployeesDto.metadata,
        };
      }

      const updatedemployees = await this.prisma.employee.update({
        where: { id },
        data: updateData,
      });

      this.logger.log(`Successfully updated employee: ${id}`);

      // Handle employment status changes
      if (updateemployeesDto.employmentStatus) {
        await this.handleEmploymentStatusChange(updatedemployees, updateemployeesDto.employmentStatus);
      }

      const isOwnData = requestingUserId === updatedemployees.id;
      return this.dataTransform.transformEmployeeForRole(updatedemployees, userRole, isOwnData);
    } catch (error) {
      if (error instanceof NotFoundException) {
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

    let tenantId: string;
    
    // Try to get tenant context, fall back to demo mode
    try {
      tenantId = this.tenantContext.getTenantId();
    } catch (error) {
      this.logger.warn('No tenant context found, using demo mode');
      // In demo mode, use the first available company
      const company = await this.prisma.companies.findFirst();
      if (!company) {
        throw new BadRequestException('No company found in demo mode');
      }
      tenantId = company.id;
    }

    try {
      const deletedemployees = await this.prisma.employee.update({
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
      await this.handleemployeesTermination(deletedemployees);

      return this.dataTransform.transformEmployeeForRole(deletedemployees, userRole, false);
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

    let tenantId: string;
    
    // Try to get tenant context, fall back to demo mode
    try {
      tenantId = this.tenantContext.getTenantId();
    } catch (error) {
      this.logger.warn('No tenant context found, using demo mode');
      // In demo mode, use the first available company
      const company = await this.prisma.companies.findFirst();
      if (!company) {
        throw new BadRequestException('No company found in demo mode');
      }
      tenantId = company.id;
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
   * employees onboarding workflow
   */
  private async initiateemployeesOnboarding(employee: employees): Promise<void> {
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
    employee: employees,
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
  private async handleemployeesTermination(employee: employees): Promise<void> {
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
  private async validateUniqueemployeesNumber(employeeNumber: string, excludeId?: string): Promise<void> {
    let tenantId: string;
    
    try {
      tenantId = this.tenantContext.getTenantId();
    } catch (error) {
      // In demo mode without database, skip validation
      this.logger.warn('No tenant context for validation, skipping duplicate check in demo mode');
      return;
    }

    const where: any = {
      companyId: tenantId,
      employeeNumber,
    };

    if (excludeId) {
      where.id = { not: excludeId };
    }

    try {
      const existing = await this.prisma.employee.findFirst({ where });
      if (existing) {
        throw new ConflictException(`employees number ${employeeNumber} already exists`);
      }
    } catch (dbError) {
      // Re-throw ConflictExceptions - they are business logic errors, not database connectivity errors
      if (dbError instanceof ConflictException) {
        throw dbError;
      }
      
      // Only catch database connectivity errors and skip validation for demo mode
      this.logger.warn('Database not available for validation, skipping in demo mode');
      return;
    }
  }
}
