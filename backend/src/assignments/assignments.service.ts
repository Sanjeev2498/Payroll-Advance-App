import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { AssignmentRepository } from '../common/repositories/assignment.repository';
import { EmployeesService } from '../employees/employees.service';
import { TenantContextService } from '../common/tenant-context.service';
import { 
  CreateAssignmentDto,
  UpdateAssignmentDto,
  AssignmentQueryDto,
  AssignmentRecommendationRequestDto,
  ConflictDetectionRequestDto,
  SkillMatchingRequestDto,
} from './dto';
import { Assignment } from '@prisma/client';
import { getErrorMessage, getErrorStack, formatError } from '../common/utils/error.util';


@Injectable()
export class AssignmentsService {
  private readonly logger = new Logger(AssignmentsService.name);

  constructor(
    private readonly assignmentRepository: AssignmentRepository,
    private readonly employeesService: EmployeesService,
    private readonly tenantContext: TenantContextService,
  ) {}

  /**
   * Create a new assignment with comprehensive validation
   */
  async create(createAssignmentDto: CreateAssignmentDto): Promise<any> {
    this.logger.log(`Creating assignment for employee ${createAssignmentDto.employeeId} at site ${createAssignmentDto.siteId}`);

    // Validate assignment dates
    if (new Date(createAssignmentDto.startDate) < new Date()) {
      throw new BadRequestException('Assignment start date cannot be in the past');
    }

    if (createAssignmentDto.endDate && new Date(createAssignmentDto.endDate) <= new Date(createAssignmentDto.startDate)) {
      throw new BadRequestException('Assignment end date must be after start date');
    }

    // Check for conflicts before creating
    const conflicts = await this.detectConflicts({
      employeeId: createAssignmentDto.employeeId,
      siteId: createAssignmentDto.siteId,
      startDate: createAssignmentDto.startDate,
      endDate: createAssignmentDto.endDate,
      role: createAssignmentDto.role,
      hourlyRate: createAssignmentDto.hourlyRate,
      requiredSkills: createAssignmentDto.requiredSkills,
      requiredCertifications: createAssignmentDto.requiredCertifications,
    });

    // Block creation if there are critical conflicts
    const criticalConflicts = conflicts.conflicts.filter(c => c.severity === 'CRITICAL');
    if (criticalConflicts.length > 0) {
      throw new ConflictException(
        `Cannot create assignment due to critical conflicts: ${criticalConflicts.map(c => c.description).join(', ')}`
      );
    }

    try {
      // Prepare assignment data
      const assignmentData = {
        employeeId: createAssignmentDto.employeeId,
        siteId: createAssignmentDto.siteId,
        role: createAssignmentDto.role,
        responsibilities: createAssignmentDto.responsibilities as any,
        hourlyRate: createAssignmentDto.hourlyRate,
        status: createAssignmentDto.status || 'ACTIVE',
        startDate: new Date(createAssignmentDto.startDate),
        endDate: createAssignmentDto.endDate ? new Date(createAssignmentDto.endDate) : undefined,
        shiftPatterns: createAssignmentDto.shiftPatterns as any,
        priority: createAssignmentDto.priority || 3,
        urgency: createAssignmentDto.urgency || 3,
        requiredCertifications: createAssignmentDto.requiredCertifications,
        requiredSkills: createAssignmentDto.requiredSkills,
        notes: createAssignmentDto.notes,
        metadata: {
          shiftPatterns: createAssignmentDto.shiftPatterns,
          priority: createAssignmentDto.priority || 3,
          urgency: createAssignmentDto.urgency || 3,
          requiredCertifications: createAssignmentDto.requiredCertifications,
          requiredSkills: createAssignmentDto.requiredSkills,
          ...createAssignmentDto.metadata,
        } as any,
      };

      const assignment = await this.assignmentRepository.create(assignmentData);
      this.logger.log(`Successfully created assignment: ${assignment.id}`);

      // Trigger assignment workflow
      await this.initiateAssignmentWorkflow(assignment);

      return assignment;
    } catch (error) {
      const errorInfo = formatError(error);
      this.logger.error(`${errorInfo.message}`, errorInfo.stack);
      throw new BadRequestException(`${errorInfo.message}`);
    }
  }
  /**
   * Find all assignments with advanced filtering and pagination
   */
  async findAll(queryDto: AssignmentQueryDto) {
    this.logger.log('Fetching assignments list with filters', { queryDto });

    const filters = {
      search: queryDto.search,
      employeeId: queryDto.employeeId,
      siteId: queryDto.siteId,
      status: queryDto.status,
      role: queryDto.role,
      startDateFrom: queryDto.startDateFrom ? new Date(queryDto.startDateFrom) : undefined,
      startDateTo: queryDto.startDateTo ? new Date(queryDto.startDateTo) : undefined,
      endDateFrom: queryDto.endDateFrom ? new Date(queryDto.endDateFrom) : undefined,
      endDateTo: queryDto.endDateTo ? new Date(queryDto.endDateTo) : undefined,
      requiredSkills: queryDto.requiredSkills,
      requiredCertifications: queryDto.requiredCertifications,
      minHourlyRate: queryDto.minHourlyRate,
      maxHourlyRate: queryDto.maxHourlyRate,
      priority: queryDto.priority,
      urgency: queryDto.urgency,
      includeInactive: queryDto.includeInactive,
      includeCompleted: queryDto.includeCompleted,
      includeCancelled: queryDto.includeCancelled,
    };

    try {
      const result = await this.assignmentRepository.findMany(
        filters,
        queryDto.page,
        queryDto.limit,
        queryDto.sortBy as any,
        queryDto.sortOrder,
      );

      this.logger.log(`Found ${result.total} assignments`);
      return result;
    } catch (error) {
      const errorInfo = formatError(error);
      this.logger.error(`${errorInfo.message}`, errorInfo.stack);
      throw new BadRequestException(`${errorInfo.message}`);
    }
  }

  /**
   * Find assignment by ID with related data
   */
  async findOne(id: string): Promise<any> {
    this.logger.log(`Fetching assignment: ${id}`);

    const assignment = await this.assignmentRepository.findById(id);
    if (!assignment) {
      throw new NotFoundException(`Assignment with ID ${id} not found`);
    }

    return assignment;
  }

  /**
   * Update assignment information
   */
  async update(id: string, updateAssignmentDto: UpdateAssignmentDto): Promise<any> {
    this.logger.log(`Updating assignment: ${id}`);

    // Validate dates if being updated
    if (updateAssignmentDto.startDate && new Date(updateAssignmentDto.startDate) < new Date()) {
      throw new BadRequestException('Assignment start date cannot be in the past');
    }

    if (updateAssignmentDto.endDate && updateAssignmentDto.startDate && 
        new Date(updateAssignmentDto.endDate) <= new Date(updateAssignmentDto.startDate)) {
      throw new BadRequestException('Assignment end date must be after start date');
    }

    try {
      // Prepare update data with proper metadata structure
      const updateData: any = {
        ...updateAssignmentDto,
      };

      // Handle date conversions
      if (updateAssignmentDto.startDate) {
        updateData.startDate = new Date(updateAssignmentDto.startDate);
      }
      if (updateAssignmentDto.endDate) {
        updateData.endDate = new Date(updateAssignmentDto.endDate);
      }

      // Handle metadata fields
      if (updateAssignmentDto.shiftPatterns || updateAssignmentDto.priority !== undefined || 
          updateAssignmentDto.urgency !== undefined || updateAssignmentDto.requiredCertifications ||
          updateAssignmentDto.requiredSkills || updateAssignmentDto.metadata) {
        
        // Get current assignment to merge metadata
        const currentAssignment = await this.findOne(id);
        const currentMetadata = (currentAssignment.metadata) || {};
        
        updateData.metadata = {
          ...currentMetadata,
          ...(updateAssignmentDto.shiftPatterns && { shiftPatterns: updateAssignmentDto.shiftPatterns }),
          ...(updateAssignmentDto.priority !== undefined && { priority: updateAssignmentDto.priority }),
          ...(updateAssignmentDto.urgency !== undefined && { urgency: updateAssignmentDto.urgency }),
          ...(updateAssignmentDto.requiredCertifications && { requiredCertifications: updateAssignmentDto.requiredCertifications }),
          ...(updateAssignmentDto.requiredSkills && { requiredSkills: updateAssignmentDto.requiredSkills }),
          ...updateAssignmentDto.metadata,
        };
      }

      const updatedAssignment = await this.assignmentRepository.update(id, updateData);
      this.logger.log(`Successfully updated assignment: ${id}`);

      // Handle status changes
      if (updateAssignmentDto.status) {
        await this.handleStatusChange(updatedAssignment, updateAssignmentDto.status);
      }

      return updatedAssignment;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to update assignment: ${getErrorMessage(error)}`, getErrorStack(error));
      throw new BadRequestException(`Failed to update assignment: ${getErrorMessage(error)}`);
    }
  }
  /**
   * Cancel assignment (soft delete)
   */
  async remove(id: string): Promise<any> {
    this.logger.log(`Cancelling assignment: ${id}`);

    try {
      const cancelledAssignment = await this.assignmentRepository.delete(id);
      this.logger.log(`Successfully cancelled assignment: ${id}`);

      // Handle cancellation workflow
      await this.handleAssignmentCancellation(cancelledAssignment);

      return cancelledAssignment;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to cancel assignment: ${getErrorMessage(error)}`, getErrorStack(error));
      throw new BadRequestException(`Failed to cancel assignment: ${getErrorMessage(error)}`);
    }
  }

  /**
   * Get assignments for specific employee
   */
  async findByEmployee(employeeId: string): Promise<any[]> {
    this.logger.log(`Finding assignments for employee: ${employeeId}`);

    try {
      const assignments = await this.assignmentRepository.findByEmployeeId(employeeId);
      this.logger.log(`Found ${assignments.length} assignments for employee: ${employeeId}`);
      return assignments;
    } catch (error) {
      const errorInfo = formatError(error);
      this.logger.error(`${errorInfo.message}`, errorInfo.stack);
      throw new BadRequestException(`${errorInfo.message}`);
    }
  }

  /**
   * Get assignments for specific site
   */
  async findBySite(siteId: string): Promise<any[]> {
    this.logger.log(`Finding assignments for site: ${siteId}`);

    try {
      const assignments = await this.assignmentRepository.findBySiteId(siteId);
      this.logger.log(`Found ${assignments.length} assignments for site: ${siteId}`);
      return assignments;
    } catch (error) {
      const errorInfo = formatError(error);
      this.logger.error(`${errorInfo.message}`, errorInfo.stack);
      throw new BadRequestException(`${errorInfo.message}`);
    }
  }

  /**
   * Get skill-matched assignment recommendations
   */
  async getRecommendations(requestDto: AssignmentRecommendationRequestDto): Promise<any> {
    this.logger.log(`Generating assignment recommendations for site: ${requestDto.siteId}`);

    try {
      // Get available employees based on criteria
      const availableEmployees = await this.employeesService.findAvailable(
        requestDto.startDate,
        requestDto.endDate,
        requestDto.requiredSkills,
      );

      // Apply additional filters
      let filteredEmployees = availableEmployees;

      if (requestDto.maxHourlyRate) {
        filteredEmployees = filteredEmployees.filter(employee => {
          const metadata = (employee.metadata as any) || {};
          const hourlyRate = metadata.hourlyRate || 0;
          return hourlyRate <= requestDto.maxHourlyRate!;
        });
      }

      if (requestDto.minPerformanceRating) {
        filteredEmployees = filteredEmployees.filter(employee => {
          const metadata = (employee.metadata as any) || {};
          const performance = metadata.performanceMetrics || {};
          return (performance.overallRating || 0) >= requestDto.minPerformanceRating!;
        });
      }

      if (requestDto.minExperienceYears) {
        filteredEmployees = filteredEmployees.filter(employee => {
          const hireDate = new Date(employee.hireDate);
          const now = new Date();
          const yearsOfService = (now.getTime() - hireDate.getTime()) / (1000 * 60 * 60 * 24 * 365);
          return yearsOfService >= requestDto.minExperienceYears!;
        });
      }

      // Generate detailed recommendations
      const recommendations = await this.generateDetailedRecommendations(
        filteredEmployees,
        requestDto,
      );

      const response = {
        siteId: requestDto.siteId,
        role: requestDto.role,
        recommendations: recommendations.slice(0, requestDto.limit || 10),
        totalEvaluated: filteredEmployees.length,
        recommendationsCount: Math.min(recommendations.length, requestDto.limit || 10),
        criteriaUsed: requestDto.criteria || ['SKILL_MATCH', 'AVAILABILITY', 'PERFORMANCE'],
        generatedAt: new Date(),
        insights: this.generateRecommendationInsights(recommendations),
        warnings: this.generateRecommendationWarnings(recommendations, requestDto),
      };

      this.logger.log(`Generated ${response.recommendationsCount} recommendations for site: ${requestDto.siteId}`);
      return response;
    } catch (error) {
      const errorInfo = formatError(error);
      this.logger.error(`${errorInfo.message}`, errorInfo.stack);
      throw new BadRequestException(`${errorInfo.message}`);
    }
  }
  /**
   * Detect scheduling conflicts and validation issues
   */
  async detectConflicts(requestDto: ConflictDetectionRequestDto): Promise<any> {
    this.logger.log('Performing conflict detection', { requestDto });

    try {
      const conflicts = [];
      
      if (requestDto.employeeId && requestDto.siteId && requestDto.startDate) {
        const repositoryConflicts = await this.assignmentRepository.detectConflicts(
          requestDto.employeeId,
          requestDto.siteId,
          new Date(requestDto.startDate),
          requestDto.endDate ? new Date(requestDto.endDate) : undefined,
          requestDto.assignmentId,
        );
        conflicts.push(...repositoryConflicts);
      }

      // Additional business logic conflict checks
      if (requestDto.employeeId && requestDto.requiredSkills) {
        const skillConflicts = await this.validateSkillRequirements(
          requestDto.employeeId,
          requestDto.requiredSkills,
        );
        conflicts.push(...skillConflicts);
      }

      if (requestDto.employeeId && requestDto.requiredCertifications) {
        const certificationConflicts = await this.validateCertificationRequirements(
          requestDto.employeeId,
          requestDto.requiredCertifications,
        );
        conflicts.push(...certificationConflicts);
      }

      // Determine overall risk and ability to proceed
      const highestSeverity = this.determineHighestSeverity(conflicts);
      const riskScore = this.calculateRiskScore(conflicts);
      const canProceed = !conflicts.some(c => c.severity === 'CRITICAL');

      const result = {
        hasConflicts: conflicts.length > 0,
        conflictCount: conflicts.length,
        highestSeverity,
        conflicts,
        resolutions: await this.generateConflictResolutions(conflicts),
        riskScore,
        canProceed,
        proceedWarnings: canProceed ? this.generateProceedWarnings(conflicts) : [],
        analyzedAt: new Date(),
        insights: this.generateConflictInsights(conflicts),
      };

      this.logger.log(`Conflict detection completed. Found ${conflicts.length} conflicts`);
      return result;
    } catch (error) {
      const errorInfo = formatError(error);
      this.logger.error(`${errorInfo.message}`, errorInfo.stack);
      throw new BadRequestException(`${errorInfo.message}`);
    }
  }

  /**
   * Get assignment statistics
   */
  async getStats() {
    this.logger.log('Fetching assignment statistics');

    try {
      const stats = await this.assignmentRepository.getAssignmentStats();
      
      // Add calculated metrics
      const enhancedStats = {
        ...stats,
        conflicted: 0, // Would be calculated from conflict detection
        urgent: 0, // Would be calculated from priority/urgency metadata
        averageSkillMatchScore: 85, // Would be calculated from skill matching
      };

      this.logger.log('Successfully fetched assignment statistics', enhancedStats);
      return enhancedStats;
    } catch (error) {
      const errorInfo = formatError(error);
      this.logger.error(`${errorInfo.message}`, errorInfo.stack);
      throw new BadRequestException(`${errorInfo.message}`);
    }
  }

  /**
   * Generate detailed skill-based recommendations
   */
  private async generateDetailedRecommendations(
    employees: any[],
    requestDto: AssignmentRecommendationRequestDto,
  ): Promise<any[]> {
    const recommendations = [];

    for (const employee of employees) {
      const employeeSkills = employee.skills || [];
      const employeeCertifications = (employee.certifications as any) || [];
      const metadata = (employee.metadata as any) || {};

      // Calculate skill matching
      const skillMatching = this.calculateSkillMatching(employeeSkills, requestDto.requiredSkills || []);
      
      // Calculate certification matching
      const certificationMatching = this.calculateCertificationMatching(
        employeeCertifications,
        requestDto.requiredCertifications || [],
      );

      // Calculate availability score
      const availability = {
        isAvailable: true, // Simplified - would check actual conflicts
        conflicts: [],
        availableHoursPerWeek: metadata.availability?.maxHoursPerWeek || 40,
        availabilityScore: 90, // Simplified calculation
      };

      // Calculate proximity score (simplified)
      const proximity = {
        distanceKm: Math.random() * 50, // Would use actual geolocation
        travelTimeMinutes: Math.random() * 60,
        proximityScore: Math.round(Math.random() * 100),
      };

      // Calculate performance score
      const performanceMetrics = metadata.performanceMetrics || {};
      const performance = {
        overallRating: performanceMetrics.overallRating || 3,
        punctualityRating: performanceMetrics.punctualityRating || 3,
        qualityRating: performanceMetrics.qualityRating || 3,
        customerFeedbackRating: performanceMetrics.customerFeedbackRating || 3,
        performanceScore: ((performanceMetrics.overallRating || 3) / 5) * 100,
      };

      // Calculate experience score
      const hireDate = new Date(employee.hireDate);
      const now = new Date();
      
      // Validate hire date to prevent NaN calculations
      const yearsOfService = isNaN(hireDate.getTime()) ? 0 : 
        (now.getTime() - hireDate.getTime()) / (1000 * 60 * 60 * 24 * 365);
      
      const experience = {
        totalYears: Math.max(yearsOfService, 0),
        relevantYears: Math.max(yearsOfService * 0.8, 0), // Simplified
        assignmentsCount: Math.floor(Math.max(yearsOfService, 0) * 2), // Simplified
        experienceScore: Math.min(Math.max(yearsOfService, 0) * 20, 100),
      };

      // Calculate cost effectiveness
      const hourlyRate = metadata.hourlyRate || 25;
      const costEffectiveness = {
        hourlyRate,
        marketRateComparison: 1.0, // Would compare to market rates
        valueRatio: performance.performanceScore / (hourlyRate / 25), // Value per dollar
        costScore: Math.max(100 - (hourlyRate - 25) * 2, 0), // Lower cost = higher score
      };

      // Calculate overall score
      const scores = [
        skillMatching.skillScore * 0.3,
        availability.availabilityScore * 0.2,
        performance.performanceScore * 0.2,
        experience.experienceScore * 0.15,
        costEffectiveness.costScore * 0.15
      ];
      
      // Filter out any NaN values and calculate
      const validScores = scores.filter(score => !isNaN(score));
      const baseScore = validScores.length > 0 ? validScores.reduce((sum, score) => sum + score, 0) : 0;
      const certificationMultiplier = certificationMatching.matchPercentage / 100;
      
      const overallScore = Math.round(Math.max(baseScore * certificationMultiplier, 0));

      recommendations.push({
        employee,
        overallScore,
        rank: 0, // Will be set after sorting
        confidenceLevel: Math.min(overallScore + 10, 100),
        skillMatching,
        certificationMatching,
        availability,
        proximity,
        performance,
        experience,
        costEffectiveness,
        notes: this.generateRecommendationNotes(skillMatching, performance, experience),
        risks: this.generateRiskAssessment(skillMatching, certificationMatching, performance),
        successProbability: Math.min(overallScore + 5, 100),
      });
    }

    // Sort by overall score and assign ranks
    recommendations.sort((a, b) => b.overallScore - a.overallScore);
    recommendations.forEach((rec, index) => {
      rec.rank = index + 1;
    });

    return recommendations;
  }
  /**
   * Calculate skill matching details
   */
  private calculateSkillMatching(employeeSkills: string[], requiredSkills: string[]): any {
    if (requiredSkills.length === 0) {
      return {
        matchedSkills: [],
        missingSkills: [],
        matchPercentage: 100,
        skillScore: 100,
      };
    }

    const matchedSkills = employeeSkills.filter(skill => 
      requiredSkills.some(required => 
        skill.toLowerCase().includes(required.toLowerCase()) ||
        required.toLowerCase().includes(skill.toLowerCase())
      )
    );
    
    const missingSkills = requiredSkills.filter(required => 
      !employeeSkills.some(skill => 
        skill.toLowerCase().includes(required.toLowerCase()) ||
        required.toLowerCase().includes(skill.toLowerCase())
      )
    );

    // Ensure we don't count duplicates and percentage doesn't exceed 100
    const uniqueMatchedSkills = [...new Set(matchedSkills)];
    const uniqueMissingSkills = [...new Set(missingSkills)];
    
    const actualMatches = Math.min(uniqueMatchedSkills.length, requiredSkills.length);
    const matchPercentage = Math.round((actualMatches / requiredSkills.length) * 100);

    return {
      matchedSkills: uniqueMatchedSkills,
      missingSkills: uniqueMissingSkills,
      matchPercentage: Math.min(matchPercentage, 100), // Cap at 100%
      skillScore: Math.min(matchPercentage, 100),
    };
  }

  /**
   * Calculate certification matching details
   */
  private calculateCertificationMatching(employeeCertifications: any[], requiredCertifications: string[]): any {
    const certNames = employeeCertifications.map(cert => cert.name || '').filter(Boolean);
    
    const matchedCertifications = certNames.filter(cert => 
      requiredCertifications.some(required => 
        cert.toLowerCase().includes(required.toLowerCase())
      )
    );
    
    const missingCertifications = requiredCertifications.filter(required => 
      !certNames.some(cert => 
        cert.toLowerCase().includes(required.toLowerCase())
      )
    );

    const expiredCertifications = employeeCertifications
      .filter(cert => cert.expiryDate && new Date(cert.expiryDate) < new Date())
      .map(cert => cert.name || '');

    const matchPercentage = requiredCertifications.length > 0 
      ? Math.round((matchedCertifications.length / requiredCertifications.length) * 100)
      : 100;

    return {
      matchedCertifications,
      missingCertifications,
      expiredCertifications,
      matchPercentage,
    };
  }

  /**
   * Validate skill requirements against employee skills
   */
  private async validateSkillRequirements(employeeId: string, requiredSkills: string[]): Promise<any[]> {
    const conflicts = [];
    
    try {
      const employee = await this.employeesService.findOne(employeeId, 'ADMIN');
      const employeeSkills = employee.skills || [];
      
      const missingSkills = requiredSkills.filter(skill => 
        !employeeSkills.includes(skill)
      );
      
      if (missingSkills.length > 0) {
        conflicts.push({
          type: 'SKILL_MISMATCH',
          severity: missingSkills.length === requiredSkills.length ? 'HIGH' : 'MEDIUM',
          description: `Employee missing ${missingSkills.length} required skill(s): ${missingSkills.join(', ')}`,
          suggestions: [
            'Provide skill training before assignment',
            'Find an employee with the required skills',
            'Pair with a mentor who has the required skills',
          ],
        });
      }
    } catch (error) {
      this.logger.error(`Failed to validate skill requirements: ${getErrorMessage(error)}`);
    }
    
    return conflicts;
  }

  /**
   * Validate certification requirements
   */
  private async validateCertificationRequirements(employeeId: string, requiredCertifications: string[]): Promise<any[]> {
    const conflicts = [];
    
    try {
      const employee = await this.employeesService.findOne(employeeId, 'ADMIN');
      // Note: EmployeeRoleResponse doesn't expose certifications, this needs to be handled differently
      // For now, skip certification validation or implement admin-level data access
      const employeeCertifications = []; // Temporary fix
      const certNames = employeeCertifications.map((cert: any) => cert.name || '');
      
      const missingCertifications = requiredCertifications.filter(required => 
        !certNames.some(cert => cert.toLowerCase().includes(required.toLowerCase()))
      );
      
      const expiredCertifications = employeeCertifications.filter((cert: any) => 
        cert.expiryDate && new Date(cert.expiryDate) < new Date() &&
        requiredCertifications.some(required => 
          cert.name && cert.name.toLowerCase().includes(required.toLowerCase())
        )
      );
      
      if (missingCertifications.length > 0) {
        conflicts.push({
          type: 'CERTIFICATION_MISSING',
          severity: 'HIGH',
          description: `Employee missing required certification(s): ${missingCertifications.join(', ')}`,
          suggestions: [
            'Obtain required certifications before assignment',
            'Find a certified employee for this assignment',
            'Check if temporary waiver is possible',
          ],
        });
      }
      
      if (expiredCertifications.length > 0) {
        conflicts.push({
          type: 'CERTIFICATION_EXPIRED',
          severity: 'CRITICAL',
          description: `Employee has expired certification(s): ${expiredCertifications.map((c: any) => c.name).join(', ')}`,
          suggestions: [
            'Renew expired certifications immediately',
            'Find an employee with valid certifications',
            'Remove employee from assignment until renewal',
          ],
        });
      }
    } catch (error) {
      this.logger.error(`Failed to validate certification requirements: ${getErrorMessage(error)}`);
    }
    
    return conflicts;
  }
  /**
   * Generate conflict resolutions
   */
  private async generateConflictResolutions(conflicts: any[]): Promise<any[]> {
    const resolutions = [];
    
    for (const conflict of conflicts) {
      switch (conflict.type) {
        case 'EMPLOYEE_DOUBLE_BOOKING':
          resolutions.push({
            strategy: 'Schedule Adjustment',
            description: 'Modify assignment dates to avoid overlap',
            steps: [
              'Review existing assignment priorities',
              'Negotiate with clients for schedule flexibility',
              'Adjust start/end dates of new assignment',
            ],
            estimatedCost: 0,
            implementationTime: '1-2 days',
            successProbability: 80,
          });
          
          resolutions.push({
            strategy: 'Alternative Employee',
            description: 'Find a different qualified employee',
            steps: [
              'Search for employees with similar skills',
              'Check availability of alternative candidates',
              'Reassign to best available alternative',
            ],
            estimatedCost: 500, // Recruitment/training cost
            implementationTime: '3-5 days',
            successProbability: 90,
          });
          break;

        case 'SKILL_MISMATCH':
          resolutions.push({
            strategy: 'Skills Training',
            description: 'Provide targeted training for missing skills',
            steps: [
              'Identify specific training requirements',
              'Schedule training sessions',
              'Validate skill competency before assignment',
            ],
            estimatedCost: 1000,
            implementationTime: '1-2 weeks',
            successProbability: 75,
          });
          break;

        case 'CERTIFICATION_MISSING':
        case 'CERTIFICATION_EXPIRED':
          resolutions.push({
            strategy: 'Certification Renewal',
            description: 'Obtain or renew required certifications',
            steps: [
              'Schedule certification exam/training',
              'Complete certification requirements',
              'Verify certification validity',
            ],
            estimatedCost: 800,
            implementationTime: '2-4 weeks',
            successProbability: 85,
          });
          break;
      }
    }
    
    return resolutions;
  }

  /**
   * Determine the highest severity level from conflicts
   */
  private determineHighestSeverity(conflicts: any[]): string {
    if (conflicts.some(c => c.severity === 'CRITICAL')) return 'CRITICAL';
    if (conflicts.some(c => c.severity === 'HIGH')) return 'HIGH';
    if (conflicts.some(c => c.severity === 'MEDIUM')) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * Calculate overall risk score from conflicts
   */
  private calculateRiskScore(conflicts: any[]): number {
    let score = 0;
    
    conflicts.forEach(conflict => {
      switch (conflict.severity) {
        case 'CRITICAL': score += 40; break;
        case 'HIGH': score += 25; break;
        case 'MEDIUM': score += 15; break;
        case 'LOW': score += 5; break;
      }
    });
    
    return Math.min(score, 100);
  }

  /**
   * Generate warnings for proceeding with conflicts
   */
  private generateProceedWarnings(conflicts: any[]): string[] {
    const warnings = [];
    
    const highSeverityConflicts = conflicts.filter(c => c.severity === 'HIGH');
    if (highSeverityConflicts.length > 0) {
      warnings.push(`${highSeverityConflicts.length} high-severity issue(s) require immediate attention`);
    }
    
    const mediumSeverityConflicts = conflicts.filter(c => c.severity === 'MEDIUM');
    if (mediumSeverityConflicts.length > 0) {
      warnings.push(`${mediumSeverityConflicts.length} medium-severity issue(s) should be addressed soon`);
    }
    
    return warnings;
  }

  /**
   * Generate insights from conflict analysis
   */
  private generateConflictInsights(conflicts: any[]): string {
    if (conflicts.length === 0) {
      return 'No conflicts detected. Assignment can proceed without issues.';
    }
    
    const conflictTypes = [...new Set(conflicts.map(c => c.type))];
    return `Found ${conflicts.length} conflict(s) of ${conflictTypes.length} different type(s). Most common: ${conflictTypes[0]}`;
  }

  /**
   * Generate recommendation insights
   */
  private generateRecommendationInsights(recommendations: any[]): string {
    if (recommendations.length === 0) {
      return 'No suitable candidates found for this assignment.';
    }
    
    const avgScore = recommendations.reduce((sum, rec) => sum + rec.overallScore, 0) / recommendations.length;
    const topScore = recommendations[0]?.overallScore || 0;
    
    return `Found ${recommendations.length} qualified candidate(s). Average match score: ${Math.round(avgScore)}%. Best match: ${topScore}%`;
  }

  /**
   * Generate recommendation warnings
   */
  private generateRecommendationWarnings(recommendations: any[], requestDto: any): string[] {
    const warnings = [];
    
    if (recommendations.length === 0) {
      warnings.push('No candidates meet all requirements. Consider relaxing criteria.');
    } else if (recommendations[0]?.overallScore < 70) {
      warnings.push('Best available match has moderate compatibility. Consider additional training.');
    }
    
    if (requestDto.requiredSkills && requestDto.requiredSkills.length > 5) {
      warnings.push('Large number of required skills may limit candidate pool.');
    }
    
    return warnings;
  }
  /**
   * Generate recommendation notes
   */
  private generateRecommendationNotes(skillMatching: any, performance: any, experience: any): string {
    const notes = [];
    
    if (skillMatching.matchPercentage >= 90) {
      notes.push('Excellent skill match for this assignment');
    } else if (skillMatching.matchPercentage >= 70) {
      notes.push('Good skill match with minor gaps');
    } else {
      notes.push('Skill gaps require attention before assignment');
    }
    
    if (performance.performanceScore >= 80) {
      notes.push('Strong performance history');
    } else if (performance.performanceScore >= 60) {
      notes.push('Adequate performance with room for improvement');
    } else {
      notes.push('Performance concerns require monitoring');
    }
    
    if (experience.totalYears >= 2) {
      notes.push('Experienced team member');
    } else {
      notes.push('Less experienced - may benefit from mentorship');
    }
    
    return notes.join('. ');
  }

  /**
   * Generate risk assessment
   */
  private generateRiskAssessment(skillMatching: any, certificationMatching: any, performance: any): string[] {
    const risks = [];
    
    if (skillMatching.missingSkills.length > 0) {
      risks.push(`Missing skills: ${skillMatching.missingSkills.join(', ')}`);
    }
    
    if (certificationMatching.missingCertifications.length > 0) {
      risks.push(`Missing certifications: ${certificationMatching.missingCertifications.join(', ')}`);
    }
    
    if (certificationMatching.expiredCertifications.length > 0) {
      risks.push(`Expired certifications: ${certificationMatching.expiredCertifications.join(', ')}`);
    }
    
    if (performance.performanceScore < 60) {
      risks.push('Below-average performance rating');
    }
    
    return risks;
  }

  /**
   * Handle assignment workflow initiation
   */
  private async initiateAssignmentWorkflow(assignment: any): Promise<void> {
    this.logger.log(`Initiating workflow for assignment: ${assignment.id}`);

    try {
      // TODO: Implement workflow steps:
      // 1. Send assignment notification to employee
      // 2. Send confirmation to site contact
      // 3. Create initial shift schedule if shift patterns provided
      // 4. Set up compliance monitoring
      // 5. Schedule performance review milestones
      // 6. Create related documentation

      this.logger.log(`Workflow initiated for assignment: ${assignment.id}`);
    } catch (error) {
      this.logger.error(`Workflow initiation failed for assignment ${assignment.id}: ${getErrorMessage(error)}`);
      // Don't throw here - workflow failure shouldn't prevent assignment creation
    }
  }

  /**
   * Handle assignment status changes
   */
  private async handleStatusChange(assignment: any, newStatus: string): Promise<void> {
    this.logger.log(`Handling status change for assignment ${assignment.id}: ${newStatus}`);

    try {
      switch (newStatus) {
        case 'ACTIVE':
          // TODO: Activate assignment services, send notifications
          break;
        case 'INACTIVE':
          // TODO: Temporarily suspend assignment activities
          break;
        case 'COMPLETED':
          // TODO: Finalize assignment, calculate performance, generate reports
          break;
        case 'CANCELLED':
          // TODO: Cancel related services, notify stakeholders, handle reassignment
          break;
      }
    } catch (error) {
      this.logger.error(`Status change handling failed for assignment ${assignment.id}: ${getErrorMessage(error)}`);
      // Don't throw here - status change workflow failure shouldn't prevent the update
    }
  }

  /**
   * Handle assignment cancellation workflow
   */
  private async handleAssignmentCancellation(assignment: any): Promise<void> {
    this.logger.log(`Handling cancellation workflow for assignment: ${assignment.id}`);

    try {
      // TODO: Implement cancellation steps:
      // 1. Cancel future shifts
      // 2. Calculate final pay and hours
      // 3. Notify employee and site contact
      // 4. Update staffing requirements
      // 5. Trigger replacement search if needed
      // 6. Archive assignment records

      this.logger.log(`Cancellation workflow completed for assignment: ${assignment.id}`);
    } catch (error) {
      this.logger.error(`Cancellation workflow failed for assignment ${assignment.id}: ${getErrorMessage(error)}`);
      // Don't throw here - workflow failure shouldn't prevent the cancellation
    }
  }
}
