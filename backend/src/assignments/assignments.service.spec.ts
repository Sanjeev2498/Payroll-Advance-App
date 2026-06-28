import { Test, TestingModule } from '@nestjs/testing';
import { AssignmentsService } from './assignments.service';
import { AssignmentRepository } from '../common/repositories/assignment.repository';
import { EmployeesService } from '../employees/employees.service';
import { TenantContextService } from '../common/tenant-context.service';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';

describe('AssignmentsService', () => {
  let service: AssignmentsService;
  let assignmentRepository: jest.Mocked<AssignmentRepository>;
  let employeesService: jest.Mocked<EmployeesService>;
  let tenantContextService: jest.Mocked<TenantContextService>;

  const mockAssignment = {
    id: 'assignment-1',
    employeeId: 'employee-1',
    siteId: 'site-1',
    role: 'Security Guard',
    hourlyRate: 25.50,
    status: 'ACTIVE',
    startDate: new Date('2024-01-15'),
    endDate: new Date('2024-12-31'),
    createdAt: new Date(),
    updatedAt: new Date(),
    employee: {
      id: 'employee-1',
      companyId: 'company-1',
      employeeNumber: 'EMP001',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      skills: ['Security', 'First Aid'],
      employmentStatus: 'ACTIVE',
      hireDate: new Date('2023-01-01'),
    },
    site: {
      id: 'site-1',
      name: 'Main Office',
      client: {
        id: 'client-1',
        name: 'Test Client',
      },
    },
  };

  beforeEach(async () => {
    const mockAssignmentRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findMany: jest.fn(),
      findByEmployeeId: jest.fn(),
      findBySiteId: jest.fn(),
      detectConflicts: jest.fn(),
      getAssignmentStats: jest.fn(),
    };

    const mockEmployeesService = {
      findOne: jest.fn(),
      findAvailable: jest.fn(),
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

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createAssignmentDto = {
      employeeId: 'employee-1',
      siteId: 'site-1',
      role: 'Security Guard',
      hourlyRate: 25.50,
      startDate: '2026-07-01',
      endDate: '2026-12-31',
    };

    it('should create an assignment successfully', async () => {
      assignmentRepository.detectConflicts.mockResolvedValue([]);
      assignmentRepository.create.mockResolvedValue(mockAssignment as any);

      const result = await service.create(createAssignmentDto);

      expect(assignmentRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          employeeId: createAssignmentDto.employeeId,
          siteId: createAssignmentDto.siteId,
          role: createAssignmentDto.role,
          hourlyRate: createAssignmentDto.hourlyRate,
        })
      );
      expect(result).toEqual(mockAssignment);
    });

    it('should reject assignment with start date in the past', async () => {
      const pastDateDto = {
        ...createAssignmentDto,
        startDate: '2023-01-01',
      };

      await expect(service.create(pastDateDto)).rejects.toThrow(BadRequestException);
      expect(assignmentRepository.create).not.toHaveBeenCalled();
    });

    it('should reject assignment with end date before start date', async () => {
      const invalidDateDto = {
        ...createAssignmentDto,
        startDate: '2024-12-31',
        endDate: '2024-02-01',
      };

      await expect(service.create(invalidDateDto)).rejects.toThrow(BadRequestException);
      expect(assignmentRepository.create).not.toHaveBeenCalled();
    });

    it('should reject assignment with critical conflicts', async () => {
      const criticalConflicts = [
        {
          type: 'EMPLOYEE_DOUBLE_BOOKING',
          severity: 'CRITICAL' as const,
          description: 'Critical conflict detected',
          suggestions: ['Reschedule assignment', 'Find alternative employee'],
        },
      ];
      
      assignmentRepository.detectConflicts.mockResolvedValue(criticalConflicts);

      await expect(service.create(createAssignmentDto)).rejects.toThrow(ConflictException);
      expect(assignmentRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return assignment by id', async () => {
      assignmentRepository.findById.mockResolvedValue(mockAssignment as any);

      const result = await service.findOne('assignment-1');

      expect(assignmentRepository.findById).toHaveBeenCalledWith('assignment-1');
      expect(result).toEqual(mockAssignment);
    });

    it('should throw NotFoundException when assignment not found', async () => {
      assignmentRepository.findById.mockResolvedValue(null);

      await expect(service.findOne('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    const updateDto = {
      role: 'Senior Security Guard',
      hourlyRate: 30.00,
    };

    it('should update assignment successfully', async () => {
      const updatedAssignment = { ...mockAssignment, ...updateDto };
      assignmentRepository.findById.mockResolvedValue(mockAssignment as any);
      assignmentRepository.update.mockResolvedValue(updatedAssignment as any);

      const result = await service.update('assignment-1', updateDto);

      expect(assignmentRepository.update).toHaveBeenCalledWith(
        'assignment-1',
        expect.objectContaining(updateDto)
      );
      expect(result).toEqual(updatedAssignment);
    });

    it('should validate date constraints on update', async () => {
      const invalidUpdate = {
        startDate: '2024-12-31',
        endDate: '2024-01-01',
      };

      await expect(service.update('assignment-1', invalidUpdate)).rejects.toThrow(BadRequestException);
      expect(assignmentRepository.update).not.toHaveBeenCalled();
    });
  });

  describe('detectConflicts', () => {
    const conflictRequest = {
      employeeId: 'employee-1',
      siteId: 'site-1',
      startDate: '2024-02-01',
      endDate: '2024-02-28',
    };

    it('should detect no conflicts', async () => {
      assignmentRepository.detectConflicts.mockResolvedValue([]);
      employeesService.findOne.mockResolvedValue({
        skills: ['Security', 'First Aid'],
        certifications: [{ name: 'Security License', expiryDate: '2025-01-01' }],
      } as any);

      const result = await service.detectConflicts(conflictRequest);

      expect(result.hasConflicts).toBe(false);
      expect(result.conflictCount).toBe(0);
      expect(result.canProceed).toBe(true);
    });

    it('should detect employee double booking', async () => {
      const conflicts = [
        {
          type: 'EMPLOYEE_DOUBLE_BOOKING',
          severity: 'HIGH' as const,
          description: 'Employee already assigned',
          suggestions: ['Reschedule assignment', 'Find alternative employee'],
        },
      ];
      
      assignmentRepository.detectConflicts.mockResolvedValue(conflicts);

      const result = await service.detectConflicts(conflictRequest);

      expect(result.hasConflicts).toBe(true);
      expect(result.conflictCount).toBe(1);
      expect(result.highestSeverity).toBe('HIGH');
    });

    it('should detect skill mismatches', async () => {
      const requestWithSkills = {
        ...conflictRequest,
        requiredSkills: ['Armed Security', 'K9 Handling'],
      };

      employeesService.findOne.mockResolvedValue({
        skills: ['Security'], // Missing required skills
      } as any);

      assignmentRepository.detectConflicts.mockResolvedValue([]);

      const result = await service.detectConflicts(requestWithSkills);

      expect(result.conflicts.some(c => c.type === 'SKILL_MISMATCH')).toBe(true);
    });
  });

  describe('getRecommendations', () => {
    const recommendationRequest = {
      siteId: 'site-1',
      role: 'Security Guard',
      requiredSkills: ['Security', 'First Aid'],
      limit: 5,
    };

    it('should generate employee recommendations', async () => {
      const availableEmployees = [
        {
          id: 'employee-1',
          firstName: 'John',
          lastName: 'Doe',
          skills: ['Security', 'First Aid'],
          hireDate: new Date('2023-01-01'),
          metadata: {
            performanceMetrics: { overallRating: 4 },
            hourlyRate: 25,
          },
        },
        {
          id: 'employee-2',
          firstName: 'Jane',
          lastName: 'Smith',
          skills: ['Security'],
          hireDate: new Date('2022-06-01'),
          metadata: {
            performanceMetrics: { overallRating: 5 },
            hourlyRate: 28,
          },
        },
      ];

      employeesService.findAvailable.mockResolvedValue(availableEmployees as any);

      const result = await service.getRecommendations(recommendationRequest);

      expect(result.siteId).toBe(recommendationRequest.siteId);
      expect(result.recommendations).toHaveLength(2);
      expect(result.recommendations[0].overallScore).toBeGreaterThan(0);
      expect(result.recommendations[0].rank).toBe(1);
      expect(result.totalEvaluated).toBe(2);
    });

    it('should filter by performance rating', async () => {
      const requestWithPerformance = {
        ...recommendationRequest,
        minPerformanceRating: 4,
      };

      const employees = [
        {
          id: 'employee-1',
          skills: ['Security'],
          metadata: { performanceMetrics: { overallRating: 5 } },
          hireDate: new Date('2023-01-01'),
        },
        {
          id: 'employee-2', 
          skills: ['Security'],
          metadata: { performanceMetrics: { overallRating: 3 } },
          hireDate: new Date('2023-01-01'),
        },
      ];

      employeesService.findAvailable.mockResolvedValue(employees as any);

      const result = await service.getRecommendations(requestWithPerformance);

      expect(result.totalEvaluated).toBe(1); // Only employee-1 meets criteria
    });
  });

  describe('getStats', () => {
    it('should return assignment statistics', async () => {
      const mockStats = {
        total: 100,
        active: 85,
        inactive: 5,
        completed: 8,
        cancelled: 2,
        averageHourlyRate: 26.75,
        uniqueEmployees: 45,
        uniqueSites: 12,
        roleDistribution: {
          'Security Guard': 70,
          'Supervisor': 15,
          'Manager': 15,
        },
      };

      assignmentRepository.getAssignmentStats.mockResolvedValue(mockStats);

      const result = await service.getStats();

      expect(result).toMatchObject(mockStats);
      expect(result.conflicted).toBeDefined();
      expect(result.urgent).toBeDefined();
      expect(result.averageSkillMatchScore).toBeDefined();
    });
  });
});