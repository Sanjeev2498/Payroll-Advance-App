import * as fc from 'fast-check';
import { AssignmentsService } from './assignments.service';
import { Test, TestingModule } from '@nestjs/testing';
import { AssignmentRepository } from '../common/repositories/assignment.repository';
import { EmployeesService } from '../employees/employees.service';
import { TenantContextService } from '../common/tenant-context.service';
import { ConflictException, BadRequestException } from '@nestjs/common';

/**
 * Property-Based Tests for Assignment Logic
 * **Property 7: Assignment Skill Matching - Validates: Requirements 5.1**
 * **Property 8: Scheduling Conflict Prevention - Validates: Requirements 5.2**
 * 
 * This comprehensive test suite verifies that assignment creation and management 
 * correctly matches employee skills with site requirements and prevents scheduling conflicts.
 */
describe('Assignment Logic Property Tests', () => {
  let service: AssignmentsService;
  let assignmentRepository: jest.Mocked<AssignmentRepository>;
  let employeesService: jest.Mocked<EmployeesService>;
  let tenantContextService: jest.Mocked<TenantContextService>;

  beforeEach(async () => {
    const mockAssignmentRepository = {
      detectConflicts: jest.fn().mockResolvedValue([]),
      create: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findMany: jest.fn(),
      findByEmployeeId: jest.fn(),
      findBySiteId: jest.fn(),
      getAssignmentStats: jest.fn(),
    };

    const mockEmployeesService = {
      findAvailable: jest.fn(),
      findOne: jest.fn(),
    };

    const mockTenantContextService = {
      getTenantId: jest.fn().mockReturnValue('company-1'),
      getUserId: jest.fn().mockReturnValue('user-1'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssignmentsService,
        {
          provide: AssignmentRepository,
          useValue: mockAssignmentRepository,
        },
        {
          provide: EmployeesService,
          useValue: mockEmployeesService,
        },
        {
          provide: TenantContextService,
          useValue: mockTenantContextService,
        },
      ],
    }).compile();

    service = module.get<AssignmentsService>(AssignmentsService);
    assignmentRepository = module.get(AssignmentRepository);
    employeesService = module.get(EmployeesService);
    tenantContextService = module.get(TenantContextService);
  });

  // ===============================
  // PROPERTY TEST DATA GENERATORS
  // ===============================

  // Core skill set for security workforce
  const skillGenerator = fc.constantFrom(
    'Security', 'First Aid', 'CPR', 'Armed Security', 'K9 Handling',
    'Fire Safety', 'Customer Service', 'Surveillance', 'Access Control',
    'Emergency Response', 'Crowd Control', 'Vehicle Patrol', 'Medical Response',
    'Conflict Resolution', 'Report Writing', 'Radio Communication'
  );

  // Certification types commonly required in security industry
  const certificationGenerator = fc.record({
    name: fc.constantFrom(
      'Security Guard License', 'First Aid Certification', 'CPR Certification',
      'Armed Security License', 'Fire Safety Training', 'Medical Response Certification'
    ),
    expiryDate: fc.option(fc.date({ min: new Date(), max: new Date('2026-12-31') })),
    issueDate: fc.date({ min: new Date('2020-01-01'), max: new Date() }),
  });

  // Employee generator with comprehensive skill and availability data
  const employeeGenerator = fc.record({
    id: fc.uuid(),
    employeeNumber: fc.string({ minLength: 5, maxLength: 10 }).map(s => `EMP-${s}`),
    firstName: fc.string({ minLength: 2, maxLength: 15 }),
    lastName: fc.string({ minLength: 2, maxLength: 15 }),
    skills: fc.array(skillGenerator, { minLength: 1, maxLength: 8 }).map(skills => [...new Set(skills)]),
    certifications: fc.array(certificationGenerator, { minLength: 0, maxLength: 4 }),
    hireDate: fc.date({ min: new Date('2020-01-01'), max: new Date('2023-12-31') }),
    metadata: fc.record({
      performanceMetrics: fc.record({
        overallRating: fc.integer({ min: 1, max: 5 }),
        punctualityRating: fc.integer({ min: 1, max: 5 }),
        qualityRating: fc.integer({ min: 1, max: 5 }),
        customerFeedbackRating: fc.integer({ min: 1, max: 5 }),
      }),
      hourlyRate: fc.float({ min: 15, max: 50 }),
      availability: fc.record({
        maxHoursPerWeek: fc.integer({ min: 20, max: 60 }),
        preferredShifts: fc.array(fc.constantFrom('MORNING', 'AFTERNOON', 'EVENING', 'NIGHT'), { minLength: 1, maxLength: 4 }),
      }),
    }),
  });

  // Site generator with specific requirements and constraints
  const siteGenerator = fc.record({
    id: fc.uuid(),
    name: fc.string({ minLength: 5, maxLength: 30 }),
    maxCapacity: fc.integer({ min: 1, max: 10 }),
    requiredSkills: fc.array(skillGenerator, { minLength: 1, maxLength: 5 }).map(skills => [...new Set(skills)]),
    requiredCertifications: fc.array(fc.string({ minLength: 3, maxLength: 20 }), { minLength: 0, maxLength: 3 }),
    shiftPatterns: fc.array(fc.record({
      startTime: fc.constantFrom('06:00', '14:00', '22:00'),
      endTime: fc.constantFrom('14:00', '22:00', '06:00'),
      daysOfWeek: fc.array(fc.constantFrom('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'), { minLength: 1, maxLength: 7 }),
    }), { minLength: 1, maxLength: 3 }),
  });

  // Assignment generator for conflict testing
  const assignmentGenerator = fc.record({
    id: fc.uuid(),
    employeeId: fc.uuid(),
    siteId: fc.uuid(),
    role: fc.constantFrom('Security Guard', 'Supervisor', 'Manager', 'Patrol Officer'),
    startDate: fc.date({ min: new Date(), max: new Date('2025-06-01') }),
    endDate: fc.option(fc.date({ min: new Date('2025-06-01'), max: new Date('2025-12-31') })),
    status: fc.constantFrom('ACTIVE', 'PENDING', 'COMPLETED'),
    hourlyRate: fc.float({ min: 18, max: 45 }),
    shiftPatterns: fc.array(fc.record({
      startTime: fc.constantFrom('06:00', '08:00', '14:00', '16:00', '22:00'),
      endTime: fc.constantFrom('14:00', '16:00', '22:00', '06:00'),
      daysOfWeek: fc.array(fc.constantFrom('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'), { minLength: 1, maxLength: 5 }),
    }), { minLength: 1, maxLength: 2 }),
  });

  // Conflict scenario generator for testing overlap detection
  const conflictScenarioGenerator = fc.record({
    employee: employeeGenerator,
    existingAssignments: fc.array(assignmentGenerator, { minLength: 1, maxLength: 3 }),
    newAssignment: fc.record({
      siteId: fc.uuid(),
      role: fc.constantFrom('Security Guard', 'Supervisor'),
      startDate: fc.date({ min: new Date(), max: new Date('2025-06-01') }),
      endDate: fc.option(fc.date({ min: new Date('2025-06-01'), max: new Date('2025-12-31') })),
      requiredSkills: fc.array(skillGenerator, { minLength: 1, maxLength: 3 }).map(skills => [...new Set(skills)]),
      requiredCertifications: fc.array(fc.string(), { minLength: 0, maxLength: 2 }),
      hourlyRate: fc.float({ min: 18, max: 45 }),
    }),
  });

  // Recommendation request generator for skill matching tests
  const recommendationRequestGenerator = fc.record({
    siteId: fc.uuid(),
    role: fc.constantFrom('Security Guard', 'Supervisor', 'Manager', 'Patrol Officer'),
    requiredSkills: fc.array(skillGenerator, { minLength: 1, maxLength: 3 }).map(skills => [...new Set(skills)]), // Remove duplicates
    minPerformanceRating: fc.option(fc.integer({ min: 1, max: 5 }), { nil: undefined }),
    maxHourlyRate: fc.option(fc.float({ min: 20, max: 60 }), { nil: undefined }),
    limit: fc.option(fc.integer({ min: 1, max: 20 }), { nil: undefined }),
  });

  // ===============================
  // PROPERTY 7: ASSIGNMENT SKILL MATCHING
  // ===============================

  /**
   * Property 7.1: Skill matching percentage calculation accuracy
   * **Validates: Requirements 5.1**
   * For any employee-site skill comparison, the matching percentage must be mathematically accurate
   */
  it('Property 7.1: Skill matching percentage calculation accuracy', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(employeeGenerator, { minLength: 1, maxLength: 20 }),
        recommendationRequestGenerator,
        async (employees, request) => {
          // Setup mocks
          employeesService.findAvailable.mockResolvedValue(employees as any);

          // Execute recommendation generation
          const result = await service.getRecommendations(request);

          // Verify: All skill matching percentages are mathematically valid
          for (const recommendation of result.recommendations) {
            const { matchPercentage, matchedSkills, missingSkills } = recommendation.skillMatching;
            
            // Mathematical accuracy checks
            expect(matchPercentage).toBeGreaterThanOrEqual(0);
            expect(matchPercentage).toBeLessThanOrEqual(100);
            expect(Number.isInteger(matchPercentage)).toBe(true);
            
            // Verify calculation logic
            const totalRequired = request.requiredSkills.length;
            const actualMatches = matchedSkills.length;
            const expectedPercentage = totalRequired > 0 ? Math.round((actualMatches / totalRequired) * 100) : 100;
            
            expect(matchPercentage).toBe(Math.min(expectedPercentage, 100));
            
            // Verify completeness: matched + missing should account for all required
            const accountedSkills = new Set([...matchedSkills, ...missingSkills]);
            expect(accountedSkills.size).toBeGreaterThanOrEqual(Math.min(totalRequired, actualMatches));
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 7.2: Perfect skill match identification
   * **Validates: Requirements 5.1**
   * Employees with all required skills must be identified with 100% match
   */
  it('Property 7.2: Perfect skill match identification', async () => {
    await fc.assert(
      fc.asyncProperty(
        recommendationRequestGenerator,
        skillGenerator,
        async (request, additionalSkill) => {
          // Create employee with unique skills (avoid duplicates)
          const uniqueSkills = [...new Set([...request.requiredSkills, additionalSkill])];
          
          // Create employee with all required skills plus additional ones
          const perfectEmployee = {
            id: 'perfect-employee',
            employeeNumber: 'EMP-PERFECT',
            firstName: 'Perfect',
            lastName: 'Match',
            skills: uniqueSkills,
            certifications: [],
            hireDate: new Date('2022-01-01'),
            metadata: {
              performanceMetrics: { overallRating: 5, punctualityRating: 5, qualityRating: 5, customerFeedbackRating: 5 },
              hourlyRate: request.maxHourlyRate ? request.maxHourlyRate - 1 : 25,
              availability: { maxHoursPerWeek: 40, preferredShifts: ['MORNING', 'AFTERNOON'] },
            },
          };

          employeesService.findAvailable.mockResolvedValue([perfectEmployee] as any);

          const result = await service.getRecommendations(request);

          // Verify: Perfect match has 100% skill matching
          expect(result.recommendations).toHaveLength(1);
          expect(result.recommendations[0].skillMatching.matchPercentage).toBe(100);
          expect(result.recommendations[0].skillMatching.missingSkills).toHaveLength(0);
          expect(result.recommendations[0].skillMatching.matchedSkills).toEqual(
            expect.arrayContaining(request.requiredSkills)
          );
          
          // Verify: High overall score for perfect match
          expect(result.recommendations[0].overallScore).toBeGreaterThan(80);
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property 7.3: Skill mismatch penalty application
   * **Validates: Requirements 5.1**
   * Employees missing required skills should have proportionally lower scores
   */
  it('Property 7.3: Skill mismatch penalty application', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(skillGenerator, { minLength: 3, maxLength: 6 }).map(skills => [...new Set(skills)]),
        fc.array(skillGenerator, { minLength: 1, maxLength: 3 }).map(skills => [...new Set(skills)]),
        async (requiredSkills, employeeSkills) => {
          // Ensure there are some missing skills for testing
          const missingSkills = requiredSkills.filter(skill => !employeeSkills.includes(skill));
          if (missingSkills.length === 0) return; // Skip if perfect match
          
          const request = {
            siteId: 'test-site',
            role: 'Security Guard',
            requiredSkills,
            limit: 10,
          };

          const employee = {
            id: 'test-employee',
            employeeNumber: 'EMP-TEST',
            firstName: 'Test',
            lastName: 'Employee',
            skills: employeeSkills,
            certifications: [],
            hireDate: new Date('2022-01-01'),
            metadata: {
              performanceMetrics: { overallRating: 4, punctualityRating: 4, qualityRating: 4, customerFeedbackRating: 4 },
              hourlyRate: 25,
              availability: { maxHoursPerWeek: 40, preferredShifts: ['MORNING'] },
            },
          };

          employeesService.findAvailable.mockResolvedValue([employee] as any);

          const result = await service.getRecommendations(request);

          // Verify: Skill score reflects missing skills
          expect(result.recommendations).toHaveLength(1);
          const skillMatching = result.recommendations[0].skillMatching;
          
          const matchedCount = skillMatching.matchedSkills.length;
          const expectedPercentage = Math.round((matchedCount / requiredSkills.length) * 100);
          
          expect(skillMatching.matchPercentage).toBe(expectedPercentage);
          expect(skillMatching.matchPercentage).toBeLessThan(100);
          expect(skillMatching.missingSkills.length).toBe(missingSkills.length);
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property 7.4: Recommendation ranking consistency
   * **Validates: Requirements 5.1**
   * Recommendations must be consistently ranked by overall score in descending order
   */
  it('Property 7.4: Recommendation ranking consistency', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(employeeGenerator, { minLength: 2, maxLength: 10 }),
        recommendationRequestGenerator,
        async (employees, request) => {
          employeesService.findAvailable.mockResolvedValue(employees as any);

          const result = await service.getRecommendations(request);

          // Verify: Recommendations are sorted by overall score in descending order
          for (let i = 0; i < result.recommendations.length - 1; i++) {
            expect(result.recommendations[i].overallScore).toBeGreaterThanOrEqual(
              result.recommendations[i + 1].overallScore
            );
          }

          // Verify: Ranks are correctly assigned (1, 2, 3, ...)
          result.recommendations.forEach((rec, index) => {
            expect(rec.rank).toBe(index + 1);
          });

          // Verify: Higher skill matches should generally rank higher
          const skillSortedRecs = result.recommendations.sort((a, b) => 
            b.skillMatching.matchPercentage - a.skillMatching.matchPercentage
          );
          
          // At least the top skill match should be in the top half of recommendations
          if (skillSortedRecs.length >= 2) {
            const topSkillMatch = skillSortedRecs[0];
            const topRankedPosition = result.recommendations.findIndex(rec => rec.employee.id === topSkillMatch.employee.id);
            expect(topRankedPosition).toBeLessThan(Math.ceil(result.recommendations.length / 2));
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property 7.5: Performance and experience weighting
   * **Validates: Requirements 5.1**
   * Higher performance ratings and experience should positively influence overall scores
   */
  it('Property 7.5: Performance and experience weighting', async () => {
    await fc.assert(
      fc.asyncProperty(
        skillGenerator,
        fc.integer({ min: 1, max: 5 }),
        fc.integer({ min: 1, max: 5 }),
        async (requiredSkill, lowRating, highRating) => {
          if (lowRating >= highRating) return; // Skip if ratings don't differ
          
          const baseEmployee = {
            employeeNumber: 'EMP-BASE',
            firstName: 'Base',
            lastName: 'Employee',
            skills: [requiredSkill],
            certifications: [],
            hireDate: new Date('2022-01-01'),
            metadata: {
              hourlyRate: 25,
              availability: { maxHoursPerWeek: 40, preferredShifts: ['MORNING'] },
            },
          };

          const lowPerfEmployee = {
            ...baseEmployee,
            id: 'low-perf',
            metadata: {
              ...baseEmployee.metadata,
              performanceMetrics: { 
                overallRating: lowRating, 
                punctualityRating: lowRating, 
                qualityRating: lowRating,
                customerFeedbackRating: lowRating 
              },
            },
          };

          const highPerfEmployee = {
            ...baseEmployee,
            id: 'high-perf',
            metadata: {
              ...baseEmployee.metadata,
              performanceMetrics: { 
                overallRating: highRating, 
                punctualityRating: highRating, 
                qualityRating: highRating,
                customerFeedbackRating: highRating 
              },
            },
          };

          const request = {
            siteId: 'test-site',
            role: 'Security Guard',
            requiredSkills: [requiredSkill],
            limit: 10,
          };

          employeesService.findAvailable.mockResolvedValue([lowPerfEmployee, highPerfEmployee] as any);

          const result = await service.getRecommendations(request);

          // Verify: High performance employee ranks higher
          expect(result.recommendations).toHaveLength(2);
          
          const lowPerfRec = result.recommendations.find(rec => rec.employee.id === 'low-perf');
          const highPerfRec = result.recommendations.find(rec => rec.employee.id === 'high-perf');
          
          expect(lowPerfRec).toBeDefined();
          expect(highPerfRec).toBeDefined();
          
          // Higher performance should result in better overall score
          expect(highPerfRec!.overallScore).toBeGreaterThan(lowPerfRec!.overallScore);
          expect(highPerfRec!.performance.performanceScore).toBeGreaterThan(lowPerfRec!.performance.performanceScore);
        }
      ),
      { numRuns: 30 }
    );
  });

  // ===============================
  // PROPERTY 8: SCHEDULING CONFLICT PREVENTION  
  // ===============================

  /**
   * Property 8.1: Double booking prevention
   * **Validates: Requirements 5.2**
   * The system must prevent employees from being double-booked for overlapping periods
   */
  it('Property 8.1: Double booking prevention', async () => {
    await fc.assert(
      fc.asyncProperty(
        conflictScenarioGenerator,
        async (scenario) => {
          const { employee, existingAssignments, newAssignment } = scenario;
          
          // Setup: Mock employee data
          employeesService.findOne.mockResolvedValue({
            ...employee,
            skills: employee.skills,
            certifications: employee.certifications,
          } as any);

          // Setup: Create overlapping assignment conflict
          const conflictingAssignment = existingAssignments[0];
          const overlapConflict = {
            type: 'EMPLOYEE_DOUBLE_BOOKING',
            severity: 'CRITICAL' as const,
            description: 'Employee has overlapping assignment during this period',
            suggestions: ['Adjust assignment dates', 'Find alternative employee'],
          };

          assignmentRepository.detectConflicts.mockResolvedValue([overlapConflict]);

          // Act: Attempt to create assignment with conflict
          const conflictRequest = {
            employeeId: employee.id,
            siteId: newAssignment.siteId,
            startDate: conflictingAssignment.startDate.toISOString(),
            endDate: conflictingAssignment.endDate?.toISOString(),
            role: newAssignment.role,
            hourlyRate: newAssignment.hourlyRate,
            requiredSkills: newAssignment.requiredSkills,
            requiredCertifications: newAssignment.requiredCertifications,
          };

          // Verify: System detects and reports conflict
          const conflictResult = await service.detectConflicts(conflictRequest);
          
          expect(conflictResult.hasConflicts).toBe(true);
          expect(conflictResult.conflictCount).toBeGreaterThan(0);
          expect(conflictResult.canProceed).toBe(false);
          expect(conflictResult.highestSeverity).toBe('CRITICAL');

          // Verify: Critical conflicts prevent assignment creation
          const criticalConflicts = conflictResult.conflicts.filter(c => c.severity === 'CRITICAL');
          expect(criticalConflicts.length).toBeGreaterThan(0);

          // Verify: Assignment creation should be blocked
          await expect(service.create(conflictRequest as any)).rejects.toThrow(ConflictException);
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property 8.2: Site capacity enforcement
   * **Validates: Requirements 5.2** 
   * The system must enforce site capacity limits and prevent over-assignment
   */
  it('Property 8.2: Site capacity enforcement', async () => {
    await fc.assert(
      fc.asyncProperty(
        siteGenerator,
        fc.array(employeeGenerator, { minLength: 2, maxLength: 15 }),
        async (site, employees) => {
          // Setup: Mock site at capacity
          const capacityExceededConflict = {
            type: 'SITE_CAPACITY_EXCEEDED',
            severity: 'HIGH' as const,
            description: `Site capacity of ${site.maxCapacity} would be exceeded`,
            suggestions: ['Increase site capacity', 'Reassign to different site'],
          };

          assignmentRepository.detectConflicts.mockResolvedValue([capacityExceededConflict]);

          // Test assignment that would exceed capacity
          const testEmployee = employees[0];
          const assignmentRequest = {
            employeeId: testEmployee.id,
            siteId: site.id,
            startDate: new Date().toISOString(),
            endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            role: 'Security Guard',
            hourlyRate: 25,
            requiredSkills: site.requiredSkills,
            requiredCertifications: site.requiredCertifications,
          };

          // Verify: Capacity conflict is detected
          const conflictResult = await service.detectConflicts(assignmentRequest);
          
          if (site.maxCapacity <= 5) { // Test with realistic capacity constraints
            expect(conflictResult.conflicts.some(c => c.type === 'SITE_CAPACITY_EXCEEDED')).toBe(true);
            expect(conflictResult.riskScore).toBeGreaterThan(0);
            
            // High severity conflicts should affect risk calculation
            const hasHighSeverityConflicts = conflictResult.conflicts.some(c => 
              c.severity === 'HIGH' || c.severity === 'CRITICAL'
            );
            if (hasHighSeverityConflicts) {
              expect(conflictResult.riskScore).toBeGreaterThan(50);
            }
          }
        }
      ),
      { numRuns: 40 }
    );
  });

  /**
   * Property 8.3: Shift overlap detection
   * **Validates: Requirements 5.2**
   * The system must detect and prevent overlapping shift assignments for employees
   */
  it('Property 8.3: Shift overlap detection', async () => {
    await fc.assert(
      fc.asyncProperty(
        employeeGenerator,
        fc.tuple(
          fc.record({
            startTime: fc.constantFrom('06:00', '08:00', '14:00'),
            endTime: fc.constantFrom('14:00', '16:00', '22:00'),
            date: fc.date({ min: new Date(), max: new Date('2025-06-01') }),
          }),
          fc.record({
            startTime: fc.constantFrom('12:00', '14:00', '18:00'),
            endTime: fc.constantFrom('16:00', '20:00', '02:00'),
            date: fc.date({ min: new Date(), max: new Date('2025-06-01') }),
          })
        ),
        async (employee, [shift1, shift2]) => {
          // Create potential overlapping shifts on the same day
          if (shift1.date.toDateString() !== shift2.date.toDateString()) {
            return; // Skip non-overlapping days
          }

          // Calculate if shifts actually overlap
          const start1Minutes = timeToMinutes(shift1.startTime);
          const end1Minutes = timeToMinutes(shift1.endTime);
          const start2Minutes = timeToMinutes(shift2.startTime);
          const end2Minutes = timeToMinutes(shift2.endTime);

          const hasOverlap = (start1Minutes < end2Minutes) && (start2Minutes < end1Minutes);

          if (hasOverlap) {
            // Mock conflict detection for overlapping shifts
            const shiftOverlapConflict = {
              type: 'SHIFT_OVERLAP',
              severity: 'CRITICAL' as const,
              description: `Shifts overlap on ${shift1.date.toDateString()}`,
              suggestions: ['Adjust shift times', 'Assign to different employee'],
            };

            assignmentRepository.detectConflicts.mockResolvedValue([shiftOverlapConflict]);

            const conflictRequest = {
              employeeId: employee.id,
              siteId: 'test-site',
              startDate: shift1.date.toISOString(),
              endDate: shift1.date.toISOString(),
              role: 'Security Guard',
              hourlyRate: 25,
            };

            // Verify: Overlap is detected
            const conflictResult = await service.detectConflicts(conflictRequest);
            
            expect(conflictResult.hasConflicts).toBe(true);
            expect(conflictResult.conflicts.some(c => c.type === 'SHIFT_OVERLAP')).toBe(true);
            expect(conflictResult.canProceed).toBe(false);
          }
        }
      ),
      { numRuns: 30 }
    );
  });

  /**
   * Property 8.4: Certification expiry validation
   * **Validates: Requirements 5.2**
   * The system must prevent assignments when required certifications are expired
   */
  it('Property 8.4: Certification expiry validation', async () => {
    await fc.assert(
      fc.asyncProperty(
        employeeGenerator,
        fc.array(fc.string({ minLength: 5, maxLength: 20 }), { minLength: 1, maxLength: 3 }),
        async (employee, requiredCertifications) => {
          // Create employee with expired certifications
          const expiredCertifications = employee.certifications.map(cert => ({
            ...cert,
            expiryDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
          }));

          const employeeWithExpiredCerts = {
            ...employee,
            certifications: expiredCertifications,
          };

          employeesService.findOne.mockResolvedValue(employeeWithExpiredCerts as any);

          // Mock certification validation conflicts
          const certificationConflicts = [];
          
          if (expiredCertifications.length > 0 && requiredCertifications.length > 0) {
            certificationConflicts.push({
              type: 'CERTIFICATION_EXPIRED',
              severity: 'CRITICAL' as const,
              description: `Employee has expired certifications: ${expiredCertifications.map(c => c.name).join(', ')}`,
              suggestions: ['Renew expired certifications', 'Find employee with valid certifications'],
            });
          }

          assignmentRepository.detectConflicts.mockResolvedValue(certificationConflicts);

          const conflictRequest = {
            employeeId: employee.id,
            siteId: 'test-site',
            startDate: new Date().toISOString(),
            role: 'Security Guard',
            hourlyRate: 25,
            requiredCertifications,
          };

          // Act: Check for certification conflicts
          const conflictResult = await service.detectConflicts(conflictRequest);

          // Verify: Expired certifications are flagged as critical
          if (certificationConflicts.length > 0) {
            expect(conflictResult.hasConflicts).toBe(true);
            expect(conflictResult.conflicts.some(c => c.type === 'CERTIFICATION_EXPIRED')).toBe(true);
            expect(conflictResult.highestSeverity).toBe('CRITICAL');
            expect(conflictResult.canProceed).toBe(false);

            // Verify: Assignment creation is blocked for critical certification issues
            await expect(service.create(conflictRequest as any)).rejects.toThrow();
          }
        }
      ),
      { numRuns: 30 }
    );
  });

  /**
   * Property 8.5: Employee availability validation
   * **Validates: Requirements 5.2**
   * The system must validate employee availability constraints before assignments
   */
  it('Property 8.5: Employee availability validation', async () => {
    await fc.assert(
      fc.asyncProperty(
        employeeGenerator,
        fc.record({
          startDate: fc.date({ min: new Date(), max: new Date('2025-06-01') }),
          endDate: fc.date({ min: new Date('2025-06-01'), max: new Date('2025-12-31') }),
        }),
        async (employee, assignmentPeriod) => {
          // Setup: Employee with limited availability
          const limitedAvailabilityEmployee = {
            ...employee,
            metadata: {
              ...employee.metadata,
              availability: {
                maxHoursPerWeek: 20, // Limited hours
                availableDays: ['MONDAY', 'TUESDAY', 'WEDNESDAY'], // Limited days
                preferredShifts: ['MORNING'], // Limited shifts
              },
            },
          };

          employeesService.findOne.mockResolvedValue(limitedAvailabilityEmployee as any);

          // Mock availability conflicts for high-hour assignments
          const availabilityConflicts = [];
          const weeklyHours = 40; // Exceeds employee's 20-hour limit

          if (weeklyHours > limitedAvailabilityEmployee.metadata.availability.maxHoursPerWeek) {
            availabilityConflicts.push({
              type: 'AVAILABILITY_CONSTRAINT',
              severity: 'MEDIUM' as const,
              description: `Assignment exceeds employee's available hours (${weeklyHours} > ${limitedAvailabilityEmployee.metadata.availability.maxHoursPerWeek})`,
              suggestions: ['Reduce assignment hours', 'Split assignment between multiple employees'],
            });
          }

          assignmentRepository.detectConflicts.mockResolvedValue(availabilityConflicts);

          const conflictRequest = {
            employeeId: employee.id,
            siteId: 'test-site',
            startDate: assignmentPeriod.startDate.toISOString(),
            endDate: assignmentPeriod.endDate.toISOString(),
            role: 'Security Guard',
            hourlyRate: 25,
          };

          // Act: Check availability conflicts
          const conflictResult = await service.detectConflicts(conflictRequest);

          // Verify: Availability constraints are detected and handled appropriately
          if (availabilityConflicts.length > 0) {
            expect(conflictResult.hasConflicts).toBe(true);
            expect(conflictResult.conflicts.some(c => c.type === 'AVAILABILITY_CONSTRAINT')).toBe(true);
            
            // Medium severity conflicts should allow proceed with warnings
            const hasOnlyMediumConflicts = conflictResult.conflicts.every(c => c.severity === 'MEDIUM');
            if (hasOnlyMediumConflicts) {
              expect(conflictResult.canProceed).toBe(true);
              expect(conflictResult.proceedWarnings.length).toBeGreaterThan(0);
            }
          }
        }
      ),
      { numRuns: 25 }
    );
  });

  /**
   * Property 8.6: Conflict resolution recommendations
   * **Validates: Requirements 5.2**
   * For any detected conflict, the system must provide actionable resolution strategies
   */
  it('Property 8.6: Conflict resolution recommendations', async () => {
    await fc.assert(
      fc.asyncProperty(
        conflictScenarioGenerator,
        async (scenario) => {
          const { employee, newAssignment } = scenario;

          // Mock multiple types of conflicts
          const multipleConflicts = [
            {
              type: 'EMPLOYEE_DOUBLE_BOOKING',
              severity: 'CRITICAL' as const,
              description: 'Employee has overlapping assignment',
              suggestions: ['Adjust dates', 'Find alternative employee'],
            },
            {
              type: 'SKILL_MISMATCH',
              severity: 'MEDIUM' as const,
              description: 'Employee missing 2 required skills',
              suggestions: ['Provide training', 'Find qualified employee'],
            },
            {
              type: 'SITE_CAPACITY_EXCEEDED',
              severity: 'HIGH' as const,
              description: 'Site capacity exceeded',
              suggestions: ['Increase capacity', 'Reassign to different site'],
            }
          ];

          assignmentRepository.detectConflicts.mockResolvedValue(multipleConflicts);

          const conflictRequest = {
            employeeId: employee.id,
            siteId: newAssignment.siteId,
            startDate: newAssignment.startDate.toISOString(),
            endDate: newAssignment.endDate?.toISOString(),
            role: newAssignment.role,
            hourlyRate: newAssignment.hourlyRate,
          };

          // Act: Get conflict analysis with resolutions
          const conflictResult = await service.detectConflicts(conflictRequest);

          // Verify: Resolutions are provided for all conflicts
          expect(conflictResult.resolutions).toBeDefined();
          expect(conflictResult.resolutions.length).toBeGreaterThan(0);

          // Verify: Each resolution has required fields
          conflictResult.resolutions.forEach(resolution => {
            expect(resolution.strategy).toBeDefined();
            expect(resolution.description).toBeDefined();
            expect(resolution.steps).toBeDefined();
            expect(Array.isArray(resolution.steps)).toBe(true);
            expect(resolution.successProbability).toBeGreaterThanOrEqual(0);
            expect(resolution.successProbability).toBeLessThanOrEqual(100);
          });

          // Verify: Risk assessment is comprehensive
          expect(conflictResult.riskScore).toBeGreaterThanOrEqual(0);
          expect(conflictResult.riskScore).toBeLessThanOrEqual(100);
          expect(conflictResult.insights).toBeDefined();

          // Verify: Critical conflicts prevent proceeding
          const hasCriticalConflicts = multipleConflicts.some(c => c.severity === 'CRITICAL');
          if (hasCriticalConflicts) {
            expect(conflictResult.canProceed).toBe(false);
            expect(conflictResult.highestSeverity).toBe('CRITICAL');
          }
        }
      ),
      { numRuns: 20 }
    );
  });

  // ===============================
  // ADDITIONAL COMPREHENSIVE PROPERTY TESTS FOR ASSIGNMENT LOGIC
  // ===============================

  /**
   * Property 7.6: Cost effectiveness weighting in recommendations
   * **Validates: Requirements 5.1**
   * Lower cost employees with similar skills should be prioritized in recommendations
   */
  it('Property 7.6: Cost effectiveness weighting in recommendations', async () => {
    await fc.assert(
      fc.asyncProperty(
        skillGenerator,
        fc.tuple(
          fc.float({ min: 15, max: 25 }), // Lower hourly rate
          fc.float({ min: 35, max: 50 })  // Higher hourly rate
        ),
        async (skill, [lowRate, highRate]) => {
          const request = {
            siteId: 'test-site',
            role: 'Security Guard',
            requiredSkills: [skill],
            limit: 10,
          };

          // Create similar employees with different rates
          const lowCostEmployee = {
            id: 'low-cost',
            employeeNumber: 'EMP-LC',
            firstName: 'Low',
            lastName: 'Cost',
            skills: [skill],
            certifications: [],
            hireDate: new Date('2022-01-01'),
            metadata: {
              performanceMetrics: { overallRating: 4, punctualityRating: 4, qualityRating: 4, customerFeedbackRating: 4 },
              hourlyRate: lowRate,
              availability: { maxHoursPerWeek: 40, preferredShifts: ['MORNING'] },
            },
          };

          const highCostEmployee = {
            id: 'high-cost',
            employeeNumber: 'EMP-HC',
            firstName: 'High',
            lastName: 'Cost',
            skills: [skill],
            certifications: [],
            hireDate: new Date('2022-01-01'),
            metadata: {
              performanceMetrics: { overallRating: 4, punctualityRating: 4, qualityRating: 4, customerFeedbackRating: 4 },
              hourlyRate: highRate,
              availability: { maxHoursPerWeek: 40, preferredShifts: ['MORNING'] },
            },
          };

          employeesService.findAvailable.mockResolvedValue([lowCostEmployee, highCostEmployee] as any);

          const result = await service.getRecommendations(request);

          // Verify: Both employees have same skill match
          expect(result.recommendations).toHaveLength(2);
          const lowCostRec = result.recommendations.find(rec => rec.employee.id === 'low-cost');
          const highCostRec = result.recommendations.find(rec => rec.employee.id === 'high-cost');
          
          expect(lowCostRec).toBeDefined();
          expect(highCostRec).toBeDefined();
          expect(lowCostRec!.skillMatching.matchPercentage).toBe(100);
          expect(highCostRec!.skillMatching.matchPercentage).toBe(100);

          // Verify: Cost effectiveness affects scoring
          expect(lowCostRec!.costEffectiveness.costScore).toBeGreaterThan(highCostRec!.costEffectiveness.costScore);
          
          // Verify: Lower cost employee should generally rank higher when skills are equal
          const costDifference = highRate - lowRate;
          if (costDifference > 10) { // Significant cost difference
            expect(lowCostRec!.overallScore).toBeGreaterThanOrEqual(highCostRec!.overallScore);
          }
        }
      ),
      { numRuns: 30 }
    );
  });

  /**
   * Property 7.7: Skill level competency matching
   * **Validates: Requirements 5.1**
   * Employees with higher skill competency levels should score better
   */
  it('Property 7.7: Skill level competency matching', async () => {
    await fc.assert(
      fc.asyncProperty(
        skillGenerator,
        fc.tuple(
          fc.integer({ min: 1, max: 3 }), // Beginner level
          fc.integer({ min: 4, max: 5 })  // Advanced level
        ),
        async (skill, [beginnerLevel, advancedLevel]) => {
          const request = {
            siteId: 'test-site',
            role: 'Security Guard',
            requiredSkills: [skill],
            minSkillLevel: 3, // Require intermediate or above
            limit: 10,
          };

          // Create employees with different skill levels (simulated in metadata)
          const beginnerEmployee = {
            id: 'beginner',
            employeeNumber: 'EMP-BEG',
            firstName: 'Beginner',
            lastName: 'Level',
            skills: [skill],
            certifications: [],
            hireDate: new Date('2023-01-01'), // Recent hire
            metadata: {
              skillLevels: { [skill]: beginnerLevel },
              performanceMetrics: { overallRating: 3, punctualityRating: 3, qualityRating: 3, customerFeedbackRating: 3 },
              hourlyRate: 20,
              availability: { maxHoursPerWeek: 40, preferredShifts: ['MORNING'] },
            },
          };

          const advancedEmployee = {
            id: 'advanced',
            employeeNumber: 'EMP-ADV',
            firstName: 'Advanced',
            lastName: 'Level',
            skills: [skill],
            certifications: [],
            hireDate: new Date('2020-01-01'), // Experienced hire
            metadata: {
              skillLevels: { [skill]: advancedLevel },
              performanceMetrics: { overallRating: 4, punctualityRating: 4, qualityRating: 4, customerFeedbackRating: 4 },
              hourlyRate: 25,
              availability: { maxHoursPerWeek: 40, preferredShifts: ['MORNING'] },
            },
          };

          employeesService.findAvailable.mockResolvedValue([beginnerEmployee, advancedEmployee] as any);

          const result = await service.getRecommendations(request);

          // Verify: Both have the required skill but different competency
          expect(result.recommendations).toHaveLength(2);
          
          const beginnerRec = result.recommendations.find(rec => rec.employee.id === 'beginner');
          const advancedRec = result.recommendations.find(rec => rec.employee.id === 'advanced');
          
          expect(beginnerRec).toBeDefined();
          expect(advancedRec).toBeDefined();

          // Verify: Advanced employee should score higher
          expect(advancedRec!.overallScore).toBeGreaterThan(beginnerRec!.overallScore);
          expect(advancedRec!.experience.experienceScore).toBeGreaterThan(beginnerRec!.experience.experienceScore);
          expect(advancedRec!.rank).toBeLessThan(beginnerRec!.rank);
        }
      ),
      { numRuns: 25 }
    );
  });

  /**
   * Property 8.7: Resource allocation conflict detection
   * **Validates: Requirements 5.2**
   * System must detect when assignment would exceed resource limits
   */
  it('Property 8.7: Resource allocation conflict detection', async () => {
    await fc.assert(
      fc.asyncProperty(
        siteGenerator,
        fc.array(employeeGenerator, { minLength: 5, maxLength: 15 }),
        async (site, employees) => {
          // Setup: Site approaching capacity limit
          const nearCapacityConflict = {
            type: 'RESOURCE_ALLOCATION',
            severity: 'HIGH' as const,
            description: `Assignment would use ${site.maxCapacity + 1} of ${site.maxCapacity} available positions`,
            suggestions: ['Review resource allocation', 'Request capacity increase'],
          };

          assignmentRepository.detectConflicts.mockResolvedValue([nearCapacityConflict]);

          const testEmployee = employees[0];
          const conflictRequest = {
            employeeId: testEmployee.id,
            siteId: site.id,
            startDate: new Date().toISOString(),
            endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            role: 'Security Guard',
            hourlyRate: 25,
          };

          // Act: Check resource allocation conflicts
          const conflictResult = await service.detectConflicts(conflictRequest);

          // Verify: Resource conflicts are properly identified
          if (site.maxCapacity <= 3) { // Test with constrained sites
            expect(conflictResult.hasConflicts).toBe(true);
            expect(conflictResult.conflicts.some(c => 
              c.type === 'RESOURCE_ALLOCATION' || c.type === 'SITE_CAPACITY_EXCEEDED'
            )).toBe(true);
            
            // Verify: High severity affects ability to proceed
            const highSeverityConflicts = conflictResult.conflicts.filter(c => 
              c.severity === 'HIGH' || c.severity === 'CRITICAL'
            );
            if (highSeverityConflicts.length > 0) {
              expect(conflictResult.riskScore).toBeGreaterThan(25);
            }
          }
        }
      ),
      { numRuns: 30 }
    );
  });

  /**
   * Property 8.8: Temporal constraint validation
   * **Validates: Requirements 5.2**
   * System must validate time-based constraints and working hour limits
   */
  it('Property 8.8: Temporal constraint validation', async () => {
    await fc.assert(
      fc.asyncProperty(
        employeeGenerator,
        fc.record({
          assignmentHours: fc.integer({ min: 40, max: 80 }), // Weekly hours
          legalLimit: fc.integer({ min: 40, max: 60 }), // Legal working hour limit
        }),
        async (employee, { assignmentHours, legalLimit }) => {
          // Setup: Assignment that might exceed working hour limits
          const temporalConflicts = [];
          
          if (assignmentHours > legalLimit) {
            temporalConflicts.push({
              type: 'WORKING_HOURS_EXCEEDED',
              severity: 'HIGH' as const,
              description: `Assignment requires ${assignmentHours} hours, exceeding limit of ${legalLimit}`,
              suggestions: ['Split assignment', 'Reduce hours', 'Add additional employee'],
            });
          }

          // Additional temporal constraints
          if (assignmentHours > 60) {
            temporalConflicts.push({
              type: 'OVERTIME_THRESHOLD_EXCEEDED',
              severity: 'MEDIUM' as const,
              description: 'Assignment will result in significant overtime costs',
              suggestions: ['Consider cost implications', 'Optimize scheduling'],
            });
          }

          assignmentRepository.detectConflicts.mockResolvedValue(temporalConflicts);

          const conflictRequest = {
            employeeId: employee.id,
            siteId: 'test-site',
            startDate: new Date().toISOString(),
            endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            role: 'Security Guard',
            hourlyRate: 25,
            metadata: { weeklyHours: assignmentHours },
          };

          // Act: Check temporal constraints
          const conflictResult = await service.detectConflicts(conflictRequest);

          // Verify: Temporal violations are detected
          if (temporalConflicts.length > 0) {
            expect(conflictResult.hasConflicts).toBe(true);
            expect(conflictResult.conflicts.some(c => 
              c.type === 'WORKING_HOURS_EXCEEDED' || c.type === 'OVERTIME_THRESHOLD_EXCEEDED'
            )).toBe(true);

            // Verify: Severity escalation based on constraint violation
            const exceedsLegal = assignmentHours > legalLimit;
            if (exceedsLegal) {
              expect(conflictResult.conflicts.some(c => c.severity === 'HIGH')).toBe(true);
            }
          }
        }
      ),
      { numRuns: 25 }
    );
  });

  /**
   * Property 7.8: Assignment matching edge case handling
   * **Validates: Requirements 5.1**
   * System must handle edge cases gracefully (empty skills, null data, etc.)
   */
  it('Property 7.8: Assignment matching edge case handling', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          hasEmployeeSkills: fc.boolean(),
          hasRequiredSkills: fc.boolean(),
          hasValidData: fc.boolean(),
        }),
        async (edgeCase) => {
          // Create edge case scenarios
          const employee = {
            id: 'edge-case-employee',
            employeeNumber: 'EMP-EDGE',
            firstName: 'Edge',
            lastName: 'Case',
            skills: edgeCase.hasEmployeeSkills ? ['Security', 'First Aid'] : [],
            certifications: edgeCase.hasValidData ? [{ name: 'Security License', expiryDate: null }] : [],
            hireDate: edgeCase.hasValidData ? new Date('2022-01-01') : null,
            metadata: edgeCase.hasValidData ? {
              performanceMetrics: { overallRating: 3 },
              hourlyRate: 25,
              availability: { maxHoursPerWeek: 40 },
            } : {},
          };

          const request = {
            siteId: 'test-site',
            role: 'Security Guard',
            requiredSkills: edgeCase.hasRequiredSkills ? ['Security', 'CPR'] : [],
            limit: 5,
          };

          employeesService.findAvailable.mockResolvedValue([employee] as any);

          // Act: Generate recommendations with edge case data
          const result = await service.getRecommendations(request);

          // Verify: System handles edge cases without crashing
          expect(result).toBeDefined();
          expect(result.recommendations).toBeDefined();
          expect(Array.isArray(result.recommendations)).toBe(true);
          expect(result.totalEvaluated).toBe(1);

          if (result.recommendations.length > 0) {
            const recommendation = result.recommendations[0];
            
            // Verify: Skill matching handles empty arrays correctly
            expect(recommendation.skillMatching).toBeDefined();
            expect(recommendation.skillMatching.matchPercentage).toBeGreaterThanOrEqual(0);
            expect(recommendation.skillMatching.matchPercentage).toBeLessThanOrEqual(100);
            expect(Array.isArray(recommendation.skillMatching.matchedSkills)).toBe(true);
            expect(Array.isArray(recommendation.skillMatching.missingSkills)).toBe(true);

            // Verify: Overall score is calculated even with missing data
            expect(recommendation.overallScore).toBeGreaterThanOrEqual(0);
            expect(recommendation.overallScore).toBeLessThanOrEqual(100);
            expect(Number.isNaN(recommendation.overallScore)).toBe(false);

            // Verify: Risk assessment handles incomplete data
            expect(Array.isArray(recommendation.risks)).toBe(true);
          }
        }
      ),
      { numRuns: 40 }
    );
  });

  /**
   * Property 8.9: Comprehensive conflict severity escalation
   * **Validates: Requirements 5.2**
   * Conflict severity must escalate appropriately based on business impact
   */
  it('Property 8.9: Comprehensive conflict severity escalation', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          conflictCount: fc.integer({ min: 1, max: 5 }),
          hasComplianceIssues: fc.boolean(),
          hasSafetyRisks: fc.boolean(),
          hasFinancialImpact: fc.boolean(),
        }),
        async (scenario) => {
          // Create conflicts with varying severity
          const conflicts = [];
          
          if (scenario.hasComplianceIssues) {
            conflicts.push({
              type: 'COMPLIANCE_VIOLATION',
              severity: 'CRITICAL' as const,
              description: 'Employee lacks required regulatory compliance',
              suggestions: ['Obtain compliance certification', 'Find compliant employee'],
            });
          }

          if (scenario.hasSafetyRisks) {
            conflicts.push({
              type: 'SAFETY_RISK',
              severity: 'HIGH' as const,
              description: 'Assignment poses safety risks due to insufficient training',
              suggestions: ['Provide safety training', 'Assign experienced supervisor'],
            });
          }

          if (scenario.hasFinancialImpact) {
            conflicts.push({
              type: 'BUDGET_EXCEEDED',
              severity: 'MEDIUM' as const,
              description: 'Assignment exceeds approved budget by 25%',
              suggestions: ['Seek budget approval', 'Reduce assignment scope'],
            });
          }

          // Add regular conflicts to reach desired count
          while (conflicts.length < scenario.conflictCount) {
            conflicts.push({
              type: 'SKILL_MISMATCH',
              severity: 'LOW' as const,
              description: 'Minor skill gap identified',
              suggestions: ['Provide brief training', 'Pair with mentor'],
            });
          }

          assignmentRepository.detectConflicts.mockResolvedValue(conflicts);

          const conflictRequest = {
            employeeId: 'test-employee',
            siteId: 'test-site',
            startDate: new Date().toISOString(),
            role: 'Security Guard',
            hourlyRate: 25,
          };

          // Act: Analyze conflict severity escalation
          const conflictResult = await service.detectConflicts(conflictRequest);

          // Verify: Severity escalation follows business rules
          expect(conflictResult.hasConflicts).toBe(true);
          expect(conflictResult.conflictCount).toBe(scenario.conflictCount);

          // Verify: Critical issues prevent proceeding
          if (scenario.hasComplianceIssues) {
            expect(conflictResult.highestSeverity).toBe('CRITICAL');
            expect(conflictResult.canProceed).toBe(false);
          }

          // Verify: Risk score reflects severity appropriately
          const expectedRiskScore = conflicts.reduce((score, conflict) => {
            switch (conflict.severity) {
              case 'CRITICAL': return score + 40;
              case 'HIGH': return score + 25;
              case 'MEDIUM': return score + 15;
              case 'LOW': return score + 5;
              default: return score;
            }
          }, 0);

          expect(conflictResult.riskScore).toBe(Math.min(expectedRiskScore, 100));

          // Verify: Resolutions scale with severity
          if (conflictResult.resolutions && conflictResult.resolutions.length > 0) {
            const criticalResolutions = conflictResult.resolutions.filter(r => 
              r.strategy.toLowerCase().includes('critical') || r.strategy.toLowerCase().includes('immediate')
            );
            
            if (scenario.hasComplianceIssues || scenario.hasSafetyRisks) {
              expect(conflictResult.resolutions.length).toBeGreaterThan(0);
            }
          }
        }
      ),
      { numRuns: 30 }
    );
  });

  // ===============================
  // HELPER FUNCTIONS
  // ===============================

  /**
   * Convert time string (HH:MM) to minutes for overlap calculation
   */
  function timeToMinutes(timeStr: string): number {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  }
});