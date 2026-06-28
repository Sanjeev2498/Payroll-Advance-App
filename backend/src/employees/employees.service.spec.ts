import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { EmployeesService } from './employees.service';
import { EmployeeRepository } from '../common/repositories/employee.repository';
import { TenantContextService } from '../common/tenant-context.service';
import { CreateEmployeeDto, EmploymentStatus, EmploymentType } from './dto';

describe('EmployeesService', () => {
  let service: EmployeesService;
  let employeeRepository: jest.Mocked<EmployeeRepository>;
  let tenantContext: jest.Mocked<TenantContextService>;

  const mockEmployee = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    companyId: 'company-123',
    employeeNumber: 'EMP-001',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    phone: '+1-555-123-4567',
    address: null,
    employmentStatus: EmploymentStatus.ACTIVE,
    hireDate: new Date('2024-01-01'),
    terminationDate: null,
    skills: ['security', 'patrol'],
    certifications: null,
    metadata: {
      department: 'Security',
      jobTitle: 'Security Guard',
      hourlyRate: 25.50,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  } as any;

  beforeEach(async () => {
    const mockEmployeeRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByEmployeeNumber: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findMany: jest.fn(),
      findBySkills: jest.fn(),
      findAvailableEmployees: jest.fn(),
      findEmployeesWithSkillMatching: jest.fn(),
      getEmployeeStats: jest.fn(),
      findEmployeesWithExpiringCertifications: jest.fn(),
    };

    const mockTenantContext = {
      getTenantId: jest.fn().mockReturnValue('company-123'),
      setTenantId: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmployeesService,
        { provide: EmployeeRepository, useValue: mockEmployeeRepository },
        { provide: TenantContextService, useValue: mockTenantContext },
      ],
    }).compile();

    service = module.get<EmployeesService>(EmployeesService);
    employeeRepository = module.get(EmployeeRepository);
    tenantContext = module.get(TenantContextService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createEmployeeDto: CreateEmployeeDto = {
      employeeNumber: 'EMP-001',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      phone: '+1-555-123-4567',
      hireDate: new Date('2024-01-01'),
      employmentType: EmploymentType.FULL_TIME,
      department: 'Security',
      jobTitle: 'Security Guard',
      skills: [
        { name: 'security', level: 8, yearsExperience: 5 },
        { name: 'patrol', level: 7, yearsExperience: 3 }
      ],
      hourlyRate: 25.50,
    };

    it('should create employee successfully', async () => {
      employeeRepository.findByEmployeeNumber.mockResolvedValue(null);
      employeeRepository.findMany.mockResolvedValue({
        employees: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      });
      employeeRepository.create.mockResolvedValue(mockEmployee as any);

      const result = await service.create(createEmployeeDto);

      expect(employeeRepository.create).toHaveBeenCalledWith(expect.objectContaining({
        employeeNumber: createEmployeeDto.employeeNumber,
        firstName: createEmployeeDto.firstName,
        lastName: createEmployeeDto.lastName,
        email: createEmployeeDto.email,
        hireDate: createEmployeeDto.hireDate,
        skills: createEmployeeDto.skills,
        metadata: expect.objectContaining({
          employmentType: createEmployeeDto.employmentType,
          department: createEmployeeDto.department,
          jobTitle: createEmployeeDto.jobTitle,
          hourlyRate: createEmployeeDto.hourlyRate,
        }),
      }));
      expect(result).toEqual(mockEmployee);
    });

    it('should throw BadRequestException for future hire date', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);

      const invalidDto = {
        ...createEmployeeDto,
        hireDate: futureDate,
      };

      await expect(service.create(invalidDto)).rejects.toThrow(BadRequestException);
      expect(employeeRepository.create).not.toHaveBeenCalled();
    });

    it('should throw ConflictException for duplicate employee number', async () => {
      employeeRepository.findByEmployeeNumber.mockResolvedValue(mockEmployee as any);

      await expect(service.create(createEmployeeDto)).rejects.toThrow(ConflictException);
      expect(employeeRepository.create).not.toHaveBeenCalled();
    });

    it('should throw ConflictException for duplicate email', async () => {
      employeeRepository.findByEmployeeNumber.mockResolvedValue(null);
      employeeRepository.findMany.mockResolvedValue({
        employees: [mockEmployee],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      });

      await expect(service.create(createEmployeeDto)).rejects.toThrow(ConflictException);
      expect(employeeRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return employee when found', async () => {
      employeeRepository.findById.mockResolvedValue(mockEmployee as any);

      const result = await service.findOne(mockEmployee.id);

      expect(employeeRepository.findById).toHaveBeenCalledWith(mockEmployee.id);
      expect(result).toEqual(mockEmployee);
    });

    it('should throw NotFoundException when employee not found', async () => {
      employeeRepository.findById.mockResolvedValue(null);

      await expect(service.findOne('non-existent-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    const updateDto = {
      firstName: 'Jane',
      department: 'Operations',
      hourlyRate: 28.00,
    };

    it('should update employee successfully', async () => {
      const updatedEmployee = { ...mockEmployee, ...updateDto };
      
      employeeRepository.findById.mockResolvedValue(mockEmployee as any);
      employeeRepository.update.mockResolvedValue(updatedEmployee as any);

      const result = await service.update(mockEmployee.id, updateDto);

      expect(employeeRepository.update).toHaveBeenCalledWith(
        mockEmployee.id,
        expect.objectContaining({
          firstName: updateDto.firstName,
          metadata: expect.objectContaining({
            department: updateDto.department,
            hourlyRate: updateDto.hourlyRate,
          }),
        })
      );
      expect(result).toEqual(updatedEmployee);
    });

    it('should throw NotFoundException for non-existent employee', async () => {
      employeeRepository.findById.mockResolvedValue(null);

      await expect(service.update('non-existent-id', updateDto)).rejects.toThrow(NotFoundException);
      expect(employeeRepository.update).not.toHaveBeenCalled();
    });

    it('should validate unique employee number on update', async () => {
      const updateWithEmployeeNumber = {
        employeeNumber: 'EMP-002',
      };

      employeeRepository.findById.mockResolvedValue(mockEmployee as any);
      employeeRepository.findByEmployeeNumber.mockResolvedValue({
        ...mockEmployee,
        id: 'different-id',
        employeeNumber: 'EMP-002',
      } as any);

      await expect(service.update(mockEmployee.id, updateWithEmployeeNumber))
        .rejects.toThrow(ConflictException);
      expect(employeeRepository.update).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should soft delete employee successfully', async () => {
      const terminatedEmployee = {
        ...mockEmployee,
        employmentStatus: 'TERMINATED',
        terminationDate: new Date(),
      };

      employeeRepository.delete.mockResolvedValue(terminatedEmployee as any);

      const result = await service.remove(mockEmployee.id);

      expect(employeeRepository.delete).toHaveBeenCalledWith(mockEmployee.id);
      expect(result).toEqual(terminatedEmployee);
    });

    it('should throw NotFoundException for non-existent employee', async () => {
      employeeRepository.delete.mockRejectedValue(new NotFoundException('Employee not found'));

      await expect(service.remove('non-existent-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findBySkills', () => {
    const requiredSkills = ['security', 'patrol'];

    it('should return employees with matching skills', async () => {
      const employeesWithSkills = [mockEmployee];
      employeeRepository.findBySkills.mockResolvedValue(employeesWithSkills as any);

      const result = await service.findBySkills(requiredSkills);

      expect(employeeRepository.findBySkills).toHaveBeenCalledWith(requiredSkills);
      expect(result).toEqual(employeesWithSkills);
    });
  });

  describe('searchEmployees', () => {
    const searchDto = {
      requiredSkills: ['security', 'patrol'],
      minPerformanceRating: 4,
    };

    it('should return skill-matched employees', async () => {
      const employeeWithPerformance = {
        ...mockEmployee, 
        address: null, 
        employmentStatus: EmploymentStatus.ACTIVE,
        metadata: {
          ...mockEmployee.metadata,
          performanceMetrics: { overallRating: 5 }, // Above minimum rating
        },
      };

      const skillMatches = [
        {
          employee: employeeWithPerformance,
          matchPercentage: 100,
          matchedSkills: ['security', 'patrol'],
          missingSkills: [],
          availabilityScore: 85,
        },
      ];

      employeeRepository.findEmployeesWithSkillMatching.mockResolvedValue(skillMatches);

      const result = await service.searchEmployees(searchDto);

      expect(employeeRepository.findEmployeesWithSkillMatching)
        .toHaveBeenCalledWith(searchDto.requiredSkills);
      expect(result).toHaveLength(1);
      expect(result[0].employee.id).toBe(mockEmployee.id);
      expect(result[0].matchPercentage).toBe(100);
    });

    it('should filter by performance rating when specified', async () => {
      const employeeWithLowRating = {
        ...mockEmployee,
        metadata: {
          ...mockEmployee.metadata,
          performanceMetrics: { overallRating: 3 },
        },
      };

      const skillMatches = [
        {
          employee: {
            ...mockEmployee,
            address: null,
            employmentStatus: EmploymentStatus.ACTIVE,
            metadata: {
              ...mockEmployee.metadata,
              performanceMetrics: { overallRating: 3 },
            },
          },
          matchPercentage: 100,
          matchedSkills: ['security', 'patrol'],
          missingSkills: [],
          availabilityScore: 85,
        },
      ];

      employeeRepository.findEmployeesWithSkillMatching.mockResolvedValue(skillMatches);

      const result = await service.searchEmployees(searchDto);

      // Should filter out employees below minimum rating
      expect(result).toHaveLength(0);
    });
  });

  describe('getStats', () => {
    it('should return employee statistics', async () => {
      const mockStats = {
        total: 100,
        active: 85,
        inactive: 5,
        onLeave: 3,
        terminated: 7,
        certificationsExpiringSoon: 12,
        complianceIssues: 8,
        averagePerformanceRating: 4.2,
      };

      employeeRepository.getEmployeeStats.mockResolvedValue(mockStats);

      const result = await service.getStats();

      expect(employeeRepository.getEmployeeStats).toHaveBeenCalled();
      expect(result).toEqual(mockStats);
    });
  });

  describe('findAvailable', () => {
    it('should return available employees for date range', async () => {
      const startDate = '2024-01-15T09:00:00Z';
      const endDate = '2024-01-15T17:00:00Z';
      const availableEmployees = [mockEmployee];

      employeeRepository.findAvailableEmployees.mockResolvedValue(availableEmployees as any);

      const result = await service.findAvailable(startDate, endDate);

      expect(employeeRepository.findAvailableEmployees).toHaveBeenCalledWith(
        new Date(startDate),
        new Date(endDate),
        undefined
      );
      expect(result).toEqual(availableEmployees);
    });

    it('should return all active employees when no date range provided', async () => {
      const allActiveEmployees = { employees: [mockEmployee] };
      employeeRepository.findMany.mockResolvedValue(allActiveEmployees as any);

      const result = await service.findAvailable();

      expect(employeeRepository.findMany).toHaveBeenCalledWith({
        employmentStatus: 'ACTIVE',
      });
      expect(result).toEqual([mockEmployee]);
    });
  });
});