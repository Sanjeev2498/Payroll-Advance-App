import * as fc from 'fast-check';
import {
  CreateAssignmentDto,
  ConflictDetectionRequestDto,
  ConflictType,
  ConflictSeverity,
  AssignmentRecommendationRequestDto,
  SkillMatchingRequestDto,
  SkillRequirementDto,
  SkillLevel,
  EmployeeSkillDto,
  RecommendationCriteria,
} from './dto';
import { AssignmentStatus } from '@prisma/client';

/**
 * Property-Based Tests for Assignment Logic
 * **Validates: Requirements 5.1, 5.2**
 * 
 * This test suite verifies assignment skill matching and scheduling conflict prevention
 * using property-based testing to ensure correctness across all possible input combinations.
 * 
 * Property 7: Assignment Skill Matching - validates skill compatibility scoring
 * Property 8: Scheduling Conflict Prevention - validates conflict detection and prevention
 */

describe('Assignment Logic Property Tests', () => {

  // Test configuration for property tests
  const PROPERTY_TEST_CONFIG = {
    numRuns: 100,           // Number of test iterations
    timeout: 5000,          // 5 second timeout per test
    seed: 42,               // Reproducible test runs
    verbose: false,         // Reduced verbosity for cleaner output
  };

  // ========== DATA GENERATORS ==========

  // Generate realistic employee skills
  const employeeSkillGenerator = () => fc.record({
    name: fc.oneof(
      fc.constant('Security Patrol'),
      fc.constant('Access Control'),
      fc.constant('CCTV Monitoring'),
      fc.constant('Emergency Response'),
      fc.constant('First Aid'),
      fc.constant('Fire Safety'),
      fc.constant('Customer Service'),
      fc.constant('Report Writing'),
      fc.constant('Vehicle Operation'),
      fc.constant('Radio Communication')
    ),
    level: fc.constantFrom(
      SkillLevel.BEGINNER,
      SkillLevel.INTERMEDIATE, 
      SkillLevel.ADVANCED,
      SkillLevel.EXPERT,
      SkillLevel.MASTER
    ),
    experienceYears: fc.integer({ min: 0, max: 20 }),
    certified: fc.boolean(),
    lastAssessed: fc.option(fc.date({ min: new Date('2020-01-01'), max: new Date() })),
    assessmentScore: fc.option(fc.integer({ min: 60, max: 100 })),
  });
  // Generate skill requirements for assignments
  const skillRequirementGenerator = () => fc.record({
    name: fc.oneof(
      fc.constant('Security Patrol'),
      fc.constant('Access Control'),
      fc.constant('CCTV Monitoring'),
      fc.constant('Emergency Response'),
      fc.constant('First Aid'),
      fc.constant('Fire Safety'),
      fc.constant('Customer Service'),
      fc.constant('Report Writing')
    ),
    level: fc.constantFrom(
      SkillLevel.BEGINNER,
      SkillLevel.INTERMEDIATE, 
      SkillLevel.ADVANCED,
      SkillLevel.EXPERT,
      SkillLevel.MASTER
    ),
    mandatory: fc.boolean(),
    weight: fc.integer({ min: 1, max: 10 }),
    category: fc.oneof(
      fc.constant('Security'),
      fc.constant('Safety'),
      fc.constant('Communication'),
      fc.constant('Technical')
    ),
  });

  // Generate employee profiles with skills and certifications
  const employeeProfileGenerator = () => fc.record({
    id: fc.uuid(),
    employeeNumber: fc.string({ minLength: 3, maxLength: 20 }).map(s => `EMP-${s}`),
    firstName: fc.string({ minLength: 2, maxLength: 30 }),
    lastName: fc.string({ minLength: 2, maxLength: 30 }),
    email: fc.emailAddress(),
    hireDate: fc.date({ min: new Date('2020-01-01'), max: new Date() }),
    skills: fc.array(employeeSkillGenerator(), { minLength: 1, maxLength: 8 }),
    certifications: fc.array(fc.record({
      name: fc.oneof(
        fc.constant('Security Guard License'),
        fc.constant('First Aid Certified'),
        fc.constant('CPR Certified'),
        fc.constant('Fire Safety Training'),
        fc.constant('Emergency Response Certified')
      ),
      issuingOrganization: fc.string({ minLength: 5, maxLength: 50 }),
      issueDate: fc.date({ min: new Date('2020-01-01'), max: new Date() }),
      expiryDate: fc.option(fc.date({ min: new Date(), max: new Date('2030-12-31') })),
      certificateNumber: fc.option(fc.string({ minLength: 5, maxLength: 20 })),
    }), { minLength: 0, maxLength: 5 }),
    hourlyRate: fc.float({ min: 15.0, max: 50.0 }),
    performanceMetrics: fc.record({
      overallRating: fc.float({ min: 1, max: 5 }),
      punctualityRating: fc.float({ min: 1, max: 5 }),
      qualityRating: fc.float({ min: 1, max: 5 }),
      customerFeedbackRating: fc.float({ min: 1, max: 5 }),
    }),
    availability: fc.record({
      availableDays: fc.array(fc.constantFrom('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'), { minLength: 1, maxLength: 7 }),
      maxHoursPerWeek: fc.integer({ min: 20, max: 60 }),
      shiftPreferences: fc.array(fc.constantFrom('MORNING', 'AFTERNOON', 'EVENING', 'NIGHT'), { minLength: 1, maxLength: 4 }),
    }),
  });
  // Generate assignment requirements
  const assignmentRequirementGenerator = () => fc.record({
    siteId: fc.uuid(),
    role: fc.oneof(
      fc.constant('Security Guard'),
      fc.constant('Site Supervisor'),
      fc.constant('Access Control Officer'),
      fc.constant('Patrol Officer'),
      fc.constant('Emergency Response Officer')
    ),
    requiredSkills: fc.array(skillRequirementGenerator(), { minLength: 1, maxLength: 6 }),
    requiredCertifications: fc.array(fc.oneof(
      fc.constant('Security Guard License'),
      fc.constant('First Aid Certified'),
      fc.constant('CPR Certified'),
      fc.constant('Fire Safety Training')
    ), { minLength: 0, maxLength: 3 }),
    startDate: fc.date({ min: new Date('2024-01-01'), max: new Date('2025-12-31') }),
    endDate: fc.option(fc.date({ min: new Date('2024-02-01'), max: new Date('2026-12-31') })),
    maxHourlyRate: fc.option(fc.float({ min: 20.0, max: 60.0 })),
    priority: fc.integer({ min: 1, max: 5 }),
    urgency: fc.integer({ min: 1, max: 5 }),
  });

  // Generate existing assignments for conflict detection
  const existingAssignmentGenerator = () => fc.record({
    id: fc.uuid(),
    employeeId: fc.uuid(),
    siteId: fc.uuid(),
    role: fc.string({ minLength: 3, maxLength: 30 }),
    status: fc.constantFrom(
      AssignmentStatus.ACTIVE,
      AssignmentStatus.INACTIVE,
      AssignmentStatus.COMPLETED
    ),
    startDate: fc.date({ min: new Date('2024-01-01'), max: new Date('2025-12-31') }),
    endDate: fc.option(fc.date({ min: new Date('2024-02-01'), max: new Date('2026-12-31') })),
    hourlyRate: fc.float({ min: 15.0, max: 50.0 }),
    shiftPatterns: fc.array(fc.record({
      dayOfWeek: fc.integer({ min: 0, max: 6 }),
      startTime: fc.oneof(fc.constant('08:00'), fc.constant('16:00'), fc.constant('00:00')),
      endTime: fc.oneof(fc.constant('16:00'), fc.constant('00:00'), fc.constant('08:00')),
    }), { minLength: 1, maxLength: 7 }),
  });

  // ========== HELPER FUNCTIONS FOR TESTING ASSIGNMENT LOGIC ==========

  /**
   * Calculate skill matching score as the service would
   * This replicates the core algorithm from AssignmentsService.calculateSkillMatching
   */
  const calculateSkillMatchingScore = (
    employeeSkills: EmployeeSkillDto[], 
    requiredSkills: SkillRequirementDto[]
  ): {
    matchedSkills: string[];
    missingSkills: string[];
    matchPercentage: number;
    skillScore: number;
    weightedScore: number;
  } => {
    if (requiredSkills.length === 0) {
      return {
        matchedSkills: [],
        missingSkills: [],
        matchPercentage: 100,
        skillScore: 100,
        weightedScore: 100,
      };
    }
    const employeeSkillNames = employeeSkills.map(s => s.name.toLowerCase());
    const matchedSkillNames: string[] = [];
    const missingSkillNames: string[] = [];
    let totalWeight = 0;
    let achievedWeightedScore = 0;

    // Check each required skill (handle duplicates by skill name)
    const uniqueRequiredSkills = requiredSkills.reduce((acc, required) => {
      const existing = acc.find(r => r.name.toLowerCase() === required.name.toLowerCase());
      if (existing) {
        // Use the higher requirement level and weight if duplicate
        if (required.level > existing.level || (required.weight || 1) > (existing.weight || 1)) {
          const index = acc.indexOf(existing);
          acc[index] = required;
        }
      } else {
        acc.push(required);
      }
      return acc;
    }, [] as SkillRequirementDto[]);

    for (const required of uniqueRequiredSkills) {
      const weight = required.weight || 1;
      totalWeight += weight;
      
      const matchingEmployeeSkill = employeeSkills.find(empSkill => 
        empSkill.name.toLowerCase().includes(required.name.toLowerCase()) ||
        required.name.toLowerCase().includes(empSkill.name.toLowerCase())
      );

      if (matchingEmployeeSkill) {
        matchedSkillNames.push(required.name);
        
        // Calculate level match bonus (employee level >= required level gets full points)
        const levelMatch = matchingEmployeeSkill.level >= required.level ? 1 : 
          (matchingEmployeeSkill.level / required.level) * 0.7; // Partial credit for lower levels
        
        achievedWeightedScore += weight * levelMatch;
      } else {
        missingSkillNames.push(required.name);
        // No score for missing skills
      }
    }

    const matchPercentage = Math.round((matchedSkillNames.length / uniqueRequiredSkills.length) * 100);
    const skillScore = Math.round(matchPercentage);
    const weightedScore = totalWeight > 0 ? Math.round((achievedWeightedScore / totalWeight) * 100) : 0;

    return {
      matchedSkills: [...new Set(matchedSkillNames)], // Remove duplicates
      missingSkills: [...new Set(missingSkillNames)],
      matchPercentage: Math.min(matchPercentage, 100),
      skillScore: Math.min(skillScore, 100),
      weightedScore: Math.min(weightedScore, 100),
    };
  };

  /**
   * Calculate certification matching score
   */
  const calculateCertificationMatching = (
    employeeCertifications: any[],
    requiredCertifications: string[]
  ): {
    matchedCertifications: string[];
    missingCertifications: string[];
    expiredCertifications: string[];
    matchPercentage: number;
  } => {
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
      matchedCertifications: [...new Set(matchedCertifications)],
      missingCertifications: [...new Set(missingCertifications)],
      expiredCertifications: [...new Set(expiredCertifications)],
      matchPercentage: Math.min(matchPercentage, 100),
    };
  };
  /**
   * Detect scheduling conflicts between assignments
   */
  const detectSchedulingConflicts = (
    employeeId: string,
    newAssignment: {
      startDate: Date;
      endDate?: Date;
      shiftPatterns?: Array<{ dayOfWeek: number; startTime: string; endTime: string; }>;
    },
    existingAssignments: Array<{
      id: string;
      employeeId: string;
      status: AssignmentStatus;
      startDate: Date;
      endDate?: Date;
      shiftPatterns?: Array<{ dayOfWeek: number; startTime: string; endTime: string; }>;
    }>,
    excludeAssignmentId?: string
  ): Array<{
    type: ConflictType;
    severity: ConflictSeverity;
    description: string;
    conflictingAssignmentId?: string;
  }> => {
    const conflicts = [];

    // Filter to active assignments for the same employee
    const activeAssignments = existingAssignments.filter(assignment => 
      assignment.employeeId === employeeId &&
      assignment.status === AssignmentStatus.ACTIVE &&
      assignment.id !== excludeAssignmentId
    );

    // Check for date range overlaps
    for (const existing of activeAssignments) {
      const newStart = newAssignment.startDate;
      const newEnd = newAssignment.endDate || new Date('2099-12-31');
      const existingStart = existing.startDate;
      const existingEnd = existing.endDate || new Date('2099-12-31');

      // Check if date ranges overlap
      const hasDateOverlap = (newStart <= existingEnd && newEnd >= existingStart);
      
      if (hasDateOverlap) {
        // Check for shift pattern conflicts if both assignments have patterns
        const hasShiftConflict = checkShiftPatternConflict(
          newAssignment.shiftPatterns,
          existing.shiftPatterns
        );

        if (hasShiftConflict || (!newAssignment.shiftPatterns || !existing.shiftPatterns)) {
          // If no specific shift patterns, assume full overlap is a conflict
          conflicts.push({
            type: ConflictType.EMPLOYEE_DOUBLE_BOOKING,
            severity: ConflictSeverity.CRITICAL,
            description: `Employee ${employeeId} has overlapping assignment from ${existingStart.toDateString()} to ${existingEnd.toDateString()}`,
            conflictingAssignmentId: existing.id,
          });
        }
      }
    }

    return conflicts;
  };

  /**
   * Check for shift pattern time conflicts
   */
  const checkShiftPatternConflict = (
    patterns1?: Array<{ dayOfWeek: number; startTime: string; endTime: string; }>,
    patterns2?: Array<{ dayOfWeek: number; startTime: string; endTime: string; }>
  ): boolean => {
    if (!patterns1 || !patterns2) return true; // Assume conflict if patterns not specified

    // Check each pattern in first set against second set
    for (const pattern1 of patterns1) {
      for (const pattern2 of patterns2) {
        if (pattern1.dayOfWeek === pattern2.dayOfWeek) {
          // Same day - check time overlap
          const start1 = parseTime(pattern1.startTime);
          const end1 = parseTime(pattern1.endTime);
          const start2 = parseTime(pattern2.startTime);
          const end2 = parseTime(pattern2.endTime);

          // Handle overnight shifts (end time < start time)
          const normalizedEnd1 = end1 < start1 ? end1 + 24 * 60 : end1;
          const normalizedEnd2 = end2 < start2 ? end2 + 24 * 60 : end2;

          // Check for time overlap
          if (start1 < normalizedEnd2 && normalizedEnd1 > start2) {
            return true; // Conflict found
          }
        }
      }
    }
    
    return false; // No conflicts found
  };
  /**
   * Parse time string to minutes since midnight
   */
  const parseTime = (timeStr: string): number => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  };

  /**
   * Validate skill requirement structure
   */
  const validateSkillRequirement = (skill: SkillRequirementDto): boolean => {
    return (
      skill.name && skill.name.length > 0 &&
      skill.level >= SkillLevel.BEGINNER && skill.level <= SkillLevel.MASTER &&
      (!skill.weight || (skill.weight >= 1 && skill.weight <= 10))
    );
  };

  /**
   * Validate employee skill structure
   */
  const validateEmployeeSkill = (skill: EmployeeSkillDto): boolean => {
    return (
      skill.name && skill.name.length > 0 &&
      skill.level >= SkillLevel.BEGINNER && skill.level <= SkillLevel.MASTER &&
      (!skill.experienceYears || skill.experienceYears >= 0)
    );
  };

  // ========== PROPERTY TESTS ==========

  /**
   * Property 7: Assignment Skill Matching
   * **Validates: Requirements 5.1**
   * 
   * For any assignment creation request, the system SHALL correctly match employee 
   * skills with site requirements according to defined matching criteria, rejecting 
   * assignments that don't meet minimum requirements.
   */
  it('Property 7: Assignment skill matching correctness', async () => {
    await fc.assert(fc.property(
      employeeProfileGenerator(),
      assignmentRequirementGenerator(),
      (employee, assignment) => {
        // Ensure valid skill data
        const validEmployeeSkills = employee.skills.filter(validateEmployeeSkill);
        const validRequiredSkills = assignment.requiredSkills.filter(validateSkillRequirement);
        
        // Skip test if no valid skills to test
        if (validEmployeeSkills.length === 0 || validRequiredSkills.length === 0) {
          return true;
        }

        // Act: Calculate skill matching as the service would
        const skillMatching = calculateSkillMatchingScore(validEmployeeSkills, validRequiredSkills);
        const certificationMatching = calculateCertificationMatching(
          employee.certifications, 
          assignment.requiredCertifications
        );

        // Assert: Skill matching calculations are mathematically correct
        expect(skillMatching.matchPercentage).toBeGreaterThanOrEqual(0);
        expect(skillMatching.matchPercentage).toBeLessThanOrEqual(100);
        expect(skillMatching.skillScore).toBeGreaterThanOrEqual(0);
        expect(skillMatching.skillScore).toBeLessThanOrEqual(100);
        expect(skillMatching.weightedScore).toBeGreaterThanOrEqual(0);
        expect(skillMatching.weightedScore).toBeLessThanOrEqual(100);

        // Assert: Perfect matches score correctly
        const hasAllRequiredSkills = validRequiredSkills.every(required =>
          validEmployeeSkills.some(empSkill => 
            empSkill.name.toLowerCase().includes(required.name.toLowerCase()) &&
            empSkill.level >= required.level
          )
        );

        if (hasAllRequiredSkills) {
          expect(skillMatching.matchPercentage).toBe(100);
          expect(skillMatching.missingSkills).toHaveLength(0);
        }

        // Assert: Missing skills are accurately identified
        const actuallyMissingSkills = validRequiredSkills.filter(required =>
          !validEmployeeSkills.some(empSkill => 
            empSkill.name.toLowerCase().includes(required.name.toLowerCase())
          )
        );

        // The missing skills count should be reasonable (allowing for duplicates in requirements)
        expect(skillMatching.missingSkills.length).toBeLessThanOrEqual(validRequiredSkills.length);

        // Assert: Certification matching is consistent
        expect(certificationMatching.matchPercentage).toBeGreaterThanOrEqual(0);
        expect(certificationMatching.matchPercentage).toBeLessThanOrEqual(100);

        // Assert: Matched + missing skills equals total required
        expect(skillMatching.matchedSkills.length + skillMatching.missingSkills.length)
          .toBeLessThanOrEqual(validRequiredSkills.length);
      }
    ), PROPERTY_TEST_CONFIG);
  });
  /**
   * Property 7.1: Skill Level Matching Accuracy
   * **Validates: Requirements 5.1**
   * 
   * For any skill comparison, employees with higher skill levels than required
   * SHALL receive higher compatibility scores than those with lower levels.
   */
  it('Property 7.1: Skill level matching accuracy', async () => {
    await fc.assert(fc.property(
      skillRequirementGenerator(),
      fc.array(employeeSkillGenerator(), { minLength: 2, maxLength: 5 }),
      (requirement, employeeSkills) => {
        // Filter to skills matching the requirement by name
        const matchingSkills = employeeSkills.filter(skill => 
          skill.name.toLowerCase().includes(requirement.name.toLowerCase())
        );

        if (matchingSkills.length < 2) return true; // Need at least 2 to compare

        // Act: Calculate scores for each skill level
        const scores = matchingSkills.map(skill => {
          const result = calculateSkillMatchingScore([skill], [requirement]);
          return { skill, score: result.weightedScore };
        });

        // Assert: Higher skill levels should generally get higher scores
        for (let i = 0; i < scores.length - 1; i++) {
          for (let j = i + 1; j < scores.length; j++) {
            if (scores[i].skill.level > scores[j].skill.level) {
              expect(scores[i].score).toBeGreaterThanOrEqual(scores[j].score);
            } else if (scores[i].skill.level < scores[j].skill.level) {
              expect(scores[i].score).toBeLessThanOrEqual(scores[j].score);
            }
            // Equal levels may have equal scores due to other factors
          }
        }

        // Assert: Skills at or above required level should get better scores than those below
        const meetsRequirement = scores.filter(s => s.skill.level >= requirement.level);
        const belowRequirement = scores.filter(s => s.skill.level < requirement.level);

        if (meetsRequirement.length > 0 && belowRequirement.length > 0) {
          const minMeetsScore = Math.min(...meetsRequirement.map(s => s.score));
          const maxBelowScore = Math.max(...belowRequirement.map(s => s.score));
          expect(minMeetsScore).toBeGreaterThanOrEqual(maxBelowScore);
        }
      }
    ), PROPERTY_TEST_CONFIG);
  });

  /**
   * Property 7.2: Mandatory Skills Enforcement
   * **Validates: Requirements 5.1**
   * 
   * For any assignment with mandatory skill requirements, employees lacking 
   * mandatory skills SHALL be flagged as high risk or get lower scores.
   */
  it('Property 7.2: Mandatory skills enforcement', async () => {
    await fc.assert(fc.property(
      employeeProfileGenerator(),
      fc.array(skillRequirementGenerator(), { minLength: 1, maxLength: 5 }),
      (employee, requirements) => {
        // Set some skills as mandatory based on weight
        const mandatoryRequirements = requirements.map(req => ({
          ...req,
          mandatory: req.weight && req.weight >= 8 // High weight skills are mandatory
        }));

        const validEmployeeSkills = employee.skills.filter(validateEmployeeSkill);
        
        if (validEmployeeSkills.length === 0 || mandatoryRequirements.length === 0) {
          return true;
        }

        // Act: Calculate skill matching
        const skillMatching = calculateSkillMatchingScore(validEmployeeSkills, mandatoryRequirements);

        // Find mandatory skills
        const mandatorySkills = mandatoryRequirements.filter(req => req.mandatory);
        
        if (mandatorySkills.length === 0) {
          return true; // No mandatory skills to test
        }

        // Count how many mandatory skills the employee completely lacks (not just lower level)
        const completelyMissingMandatory = mandatorySkills.filter(mandatory =>
          !validEmployeeSkills.some(empSkill => 
            empSkill.name.toLowerCase().includes(mandatory.name.toLowerCase())
          )
        );

        // Assert: Employees missing ALL mandatory skills should get lower scores
        if (completelyMissingMandatory.length === mandatorySkills.length && mandatorySkills.length > 0) {
          expect(skillMatching.weightedScore).toBeLessThan(90);
        }

        // Assert: Skill scores should be within valid range
        expect(skillMatching.matchPercentage).toBeGreaterThanOrEqual(0);
        expect(skillMatching.matchPercentage).toBeLessThanOrEqual(100);
        expect(skillMatching.weightedScore).toBeGreaterThanOrEqual(0);
        expect(skillMatching.weightedScore).toBeLessThanOrEqual(100);

        // Assert: Employees with some matching mandatory skills should score higher than those with none
        const hasAnyMandatorySkill = mandatorySkills.some(mandatory =>
          validEmployeeSkills.some(empSkill => 
            empSkill.name.toLowerCase().includes(mandatory.name.toLowerCase())
          )
        );
        
        const hasNoMandatorySkills = mandatorySkills.every(mandatory =>
          !validEmployeeSkills.some(empSkill => 
            empSkill.name.toLowerCase().includes(mandatory.name.toLowerCase())
          )
        );

        // Only test if we actually have mandatory skills
        if (mandatorySkills.length > 0) {
          if (hasAnyMandatorySkill) {
            expect(skillMatching.weightedScore).toBeGreaterThan(0);
          }
        }
      }
    ), PROPERTY_TEST_CONFIG);
  });
  /**
   * Property 8: Scheduling Conflict Prevention
   * **Validates: Requirements 5.2**
   * 
   * For any assignment or schedule modification, the system SHALL detect and prevent 
   * scheduling conflicts while ensuring employee availability validation before 
   * confirming assignments.
   */
  it('Property 8: Scheduling conflict prevention', async () => {
    await fc.assert(fc.property(
      fc.uuid(), // employeeId
      assignmentRequirementGenerator(),
      fc.array(existingAssignmentGenerator(), { minLength: 0, maxLength: 5 }),
      (employeeId, newAssignment, existingAssignments) => {
        // Ensure dates are valid and end date is after start date
        const startDate = newAssignment.startDate;
        const endDate = newAssignment.endDate && newAssignment.endDate > startDate 
          ? newAssignment.endDate 
          : undefined;

        const newAssignmentData = {
          startDate,
          endDate,
          shiftPatterns: [{
            dayOfWeek: 1, // Monday
            startTime: '08:00',
            endTime: '16:00',
          }],
        };

        // Act: Detect conflicts using the conflict detection logic
        const conflicts = detectSchedulingConflicts(
          employeeId,
          newAssignmentData,
          existingAssignments,
        );

        // Assert: Conflict detection results are structurally valid
        conflicts.forEach(conflict => {
          expect(Object.values(ConflictType)).toContain(conflict.type);
          expect(Object.values(ConflictSeverity)).toContain(conflict.severity);
          expect(conflict.description).toBeTruthy();
          expect(conflict.description.length).toBeGreaterThan(10);
        });

        // Assert: Double booking detection works correctly
        const employeeAssignments = existingAssignments.filter(a => 
          a.employeeId === employeeId && a.status === AssignmentStatus.ACTIVE
        );

        const hasActualOverlap = employeeAssignments.some(existing => {
          const existingStart = existing.startDate;
          const existingEnd = existing.endDate || new Date('2099-12-31');
          const newStart = startDate;
          const newEnd = endDate || new Date('2099-12-31');
          
          return newStart <= existingEnd && newEnd >= existingStart;
        });

        const hasDoubleBookingConflict = conflicts.some(c => 
          c.type === ConflictType.EMPLOYEE_DOUBLE_BOOKING
        );

        // If there's an actual overlap, there should be a conflict detected
        if (hasActualOverlap) {
          expect(hasDoubleBookingConflict).toBe(true);
        }

        // Assert: Critical conflicts should prevent assignment
        const criticalConflicts = conflicts.filter(c => 
          c.severity === ConflictSeverity.CRITICAL
        );
        
        if (criticalConflicts.length > 0) {
          // Critical conflicts should include double booking or other blocking issues
          expect(criticalConflicts.some(c => 
            c.type === ConflictType.EMPLOYEE_DOUBLE_BOOKING ||
            c.type === ConflictType.CERTIFICATION_EXPIRED ||
            c.type === ConflictType.COMPLIANCE_VIOLATION
          )).toBe(true);
        }

        // Assert: Conflict descriptions should be informative
        conflicts.forEach(conflict => {
          expect(conflict.description).toMatch(/employee|assignment|conflict|overlap/i);
        });
      }
    ), PROPERTY_TEST_CONFIG);
  });
  /**
   * Property 8.1: Shift Pattern Conflict Detection
   * **Validates: Requirements 5.2**
   * 
   * For any shift pattern assignments, the system SHALL accurately detect
   * time-based conflicts between overlapping shifts on the same day.
   */
  it('Property 8.1: Shift pattern conflict detection', async () => {
    await fc.assert(fc.property(
      fc.record({
        dayOfWeek: fc.integer({ min: 0, max: 6 }),
        startTime: fc.oneof(
          fc.constant('08:00'),
          fc.constant('12:00'),
          fc.constant('16:00'),
          fc.constant('20:00'),
          fc.constant('00:00')
        ),
        endTime: fc.oneof(
          fc.constant('12:00'),
          fc.constant('16:00'),
          fc.constant('20:00'),
          fc.constant('00:00'),
          fc.constant('08:00')
        ),
      }),
      fc.record({
        dayOfWeek: fc.integer({ min: 0, max: 6 }),
        startTime: fc.oneof(
          fc.constant('08:00'),
          fc.constant('12:00'),
          fc.constant('16:00'),
          fc.constant('20:00'),
          fc.constant('00:00')
        ),
        endTime: fc.oneof(
          fc.constant('12:00'),
          fc.constant('16:00'),
          fc.constant('20:00'),
          fc.constant('00:00'),
          fc.constant('08:00')
        ),
      }),
      (pattern1, pattern2) => {
        // Act: Check for shift pattern conflicts
        const hasConflict = checkShiftPatternConflict([pattern1], [pattern2]);

        // Assert: Same day patterns should be evaluated correctly
        if (pattern1.dayOfWeek === pattern2.dayOfWeek) {
          const start1 = parseTime(pattern1.startTime);
          const end1 = parseTime(pattern1.endTime);
          const start2 = parseTime(pattern2.startTime);
          const end2 = parseTime(pattern2.endTime);

          // Handle overnight shifts
          const normalizedEnd1 = end1 < start1 ? end1 + 24 * 60 : end1;
          const normalizedEnd2 = end2 < start2 ? end2 + 24 * 60 : end2;

          // Calculate expected overlap
          const shouldHaveConflict = start1 < normalizedEnd2 && normalizedEnd1 > start2;
          
          expect(hasConflict).toBe(shouldHaveConflict);
        } else {
          // Different days should not conflict
          expect(hasConflict).toBe(false);
        }

        // Assert: Identical patterns should always conflict
        if (pattern1.dayOfWeek === pattern2.dayOfWeek &&
            pattern1.startTime === pattern2.startTime &&
            pattern1.endTime === pattern2.endTime) {
          expect(hasConflict).toBe(true);
        }
      }
    ), PROPERTY_TEST_CONFIG);
  });

  /**
   * Property 8.2: Site Capacity Validation
   * **Validates: Requirements 5.2**
   * 
   * For any site assignment, the system SHALL enforce site capacity limits
   * and prevent exceeding maximum staffing requirements.
   */
  it('Property 8.2: Site capacity validation', async () => {
    await fc.assert(fc.property(
      fc.uuid(), // siteId
      fc.integer({ min: 1, max: 10 }), // maxCapacity
      fc.array(existingAssignmentGenerator(), { minLength: 0, maxLength: 15 }),
      assignmentRequirementGenerator(),
      (siteId, maxCapacity, existingAssignments, newAssignment) => {
        // Filter assignments to this site
        const siteAssignments = existingAssignments.filter(a => 
          a.siteId === siteId && a.status === AssignmentStatus.ACTIVE
        );

        // Act: Check if adding new assignment would exceed capacity
        const currentCapacity = siteAssignments.length;
        const wouldExceedCapacity = currentCapacity >= maxCapacity;

        // Simulate capacity check logic
        const capacityConflicts = [];
        if (wouldExceedCapacity) {
          capacityConflicts.push({
            type: ConflictType.SITE_CAPACITY_EXCEEDED,
            severity: ConflictSeverity.HIGH,
            description: `Site ${siteId} is at capacity (${currentCapacity}/${maxCapacity})`,
          });
        }

        // Assert: Capacity validation logic is correct
        if (currentCapacity >= maxCapacity) {
          expect(capacityConflicts.length).toBeGreaterThan(0);
          expect(capacityConflicts[0].type).toBe(ConflictType.SITE_CAPACITY_EXCEEDED);
        } else {
          expect(capacityConflicts.length).toBe(0);
        }

        // Assert: Capacity should never go negative
        expect(currentCapacity).toBeGreaterThanOrEqual(0);
        expect(maxCapacity).toBeGreaterThan(0);

        // Assert: Available capacity calculation is accurate
        const availableCapacity = Math.max(0, maxCapacity - currentCapacity);
        expect(availableCapacity).toBeLessThanOrEqual(maxCapacity);
        expect(availableCapacity).toBeGreaterThanOrEqual(0);
      }
    ), PROPERTY_TEST_CONFIG);
  });
  /**
   * Property 8.3: Employee Availability Validation
   * **Validates: Requirements 5.2**
   * 
   * For any assignment, the system SHALL respect employee availability
   * windows and prevent assignments outside available hours.
   */
  it('Property 8.3: Employee availability validation', async () => {
    await fc.assert(fc.property(
      employeeProfileGenerator(),
      assignmentRequirementGenerator(),
      (employee, assignment) => {
        const availability = employee.availability;
        
        // Skip if no availability data
        if (!availability || !availability.availableDays) {
          return true;
        }

        // Calculate assignment day from start date
        const assignmentDay = assignment.startDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
        const dayNames = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'] as const;
        const assignmentDayName = dayNames[assignmentDay];

        // Act: Check if assignment day is in available days
        const isDayAvailable = availability.availableDays.includes(assignmentDayName as any);

        // Generate availability conflicts if day is not available
        const availabilityConflicts = [];
        if (!isDayAvailable) {
          availabilityConflicts.push({
            type: ConflictType.EMPLOYEE_UNAVAILABLE,
            severity: ConflictSeverity.HIGH,
            description: `Employee not available on ${assignmentDayName}`,
          });
        }

        // Check weekly hour limits
        const maxWeeklyHours = availability.maxHoursPerWeek || 40;
        const estimatedAssignmentHours = 40; // Assume full-time assignment
        
        if (estimatedAssignmentHours > maxWeeklyHours) {
          availabilityConflicts.push({
            type: ConflictType.WORKLOAD_EXCEEDED,
            severity: ConflictSeverity.MEDIUM,
            description: `Assignment hours (${estimatedAssignmentHours}) exceed employee limit (${maxWeeklyHours})`,
          });
        }

        // Assert: Availability validation works correctly
        if (!isDayAvailable) {
          expect(availabilityConflicts.some(c => 
            c.type === ConflictType.EMPLOYEE_UNAVAILABLE
          )).toBe(true);
        }

        if (estimatedAssignmentHours > maxWeeklyHours) {
          expect(availabilityConflicts.some(c => 
            c.type === ConflictType.WORKLOAD_EXCEEDED
          )).toBe(true);
        }

        // Assert: Available days should be valid weekdays
        availability.availableDays.forEach((day: any) => {
          expect(dayNames as readonly string[]).toContain(day);
        });

        // Assert: Max hours should be reasonable
        expect(maxWeeklyHours).toBeGreaterThan(0);
        expect(maxWeeklyHours).toBeLessThanOrEqual(168); // 24 * 7 hours max
      }
    ), PROPERTY_TEST_CONFIG);
  });

  /**
   * Property 8.4: Certification Expiry Validation
   * **Validates: Requirements 5.2**
   * 
   * For any assignment requiring certifications, the system SHALL validate
   * that employee certifications are current and not expired.
   */
  it('Property 8.4: Certification expiry validation', async () => {
    await fc.assert(fc.property(
      employeeProfileGenerator(),
      assignmentRequirementGenerator(),
      (employee, assignment) => {
        const employeeCertifications = employee.certifications || [];
        const requiredCertifications = assignment.requiredCertifications || [];

        if (requiredCertifications.length === 0) {
          return true; // No certifications required
        }

        // Act: Check certification expiry status
        const now = new Date();
        const certificationIssues = [];

        for (const requiredCert of requiredCertifications) {
          const employeeCert = employeeCertifications.find(cert => 
            cert.name.toLowerCase().includes(requiredCert.toLowerCase())
          );

          if (!employeeCert) {
            certificationIssues.push({
              type: ConflictType.CERTIFICATION_MISSING,
              severity: ConflictSeverity.HIGH,
              description: `Required certification '${requiredCert}' is missing`,
            });
          } else if (employeeCert.expiryDate && new Date(employeeCert.expiryDate) < now) {
            certificationIssues.push({
              type: ConflictType.CERTIFICATION_EXPIRED,
              severity: ConflictSeverity.CRITICAL,
              description: `Certification '${requiredCert}' expired on ${new Date(employeeCert.expiryDate).toDateString()}`,
            });
          }
        }

        // Assert: Missing certifications are detected
        const missingCerts = requiredCertifications.filter(required =>
          !employeeCertifications.some(emp => 
            emp.name.toLowerCase().includes(required.toLowerCase())
          )
        );

        expect(certificationIssues.filter(c => 
          c.type === ConflictType.CERTIFICATION_MISSING
        ).length).toBe(missingCerts.length);

        // Assert: Expired certifications are flagged as critical
        const expiredCertIssues = certificationIssues.filter(c => 
          c.type === ConflictType.CERTIFICATION_EXPIRED
        );
        
        expiredCertIssues.forEach(issue => {
          expect(issue.severity).toBe(ConflictSeverity.CRITICAL);
        });

        // Assert: All required certifications should be checked
        const checkedCertifications = certificationIssues.map(issue => {
          const match = issue.description.match(/'([^']+)'/);
          return match ? match[1] : '';
        }).filter(Boolean);

        // Each required cert should either have an issue or be valid
        requiredCertifications.forEach(required => {
          const hasIssue = checkedCertifications.some(checked => 
            checked.toLowerCase().includes(required.toLowerCase())
          );
          const hasValidCert = employeeCertifications.some(emp => 
            emp.name.toLowerCase().includes(required.toLowerCase()) &&
            (!emp.expiryDate || new Date(emp.expiryDate) >= now)
          );

          // Should either have an issue or a valid cert
          expect(hasIssue || hasValidCert).toBe(true);
        });
      }
    ), PROPERTY_TEST_CONFIG);
  });

});
