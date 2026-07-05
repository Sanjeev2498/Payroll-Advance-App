import { Test, TestingModule } from '@nestjs/testing';
import { EmployeesController } from './employees.controller';
import { EmployeesService } from './employees.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { CreateEmployeeDto, EmployeeQueryDto, EmploymentStatus, DocumentQueryDto } from './dto';

describe('EmployeesController', () => {
  let controller: EmployeesController;
  let service: jest.Mocked<EmployeesService>;

  const mockEmployee = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    companyId: 'company-123',
    employeeNumber: 'EMP-001',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    phone: '+91 98765-43210', // Indian format
    address: null,
    employmentStatus: 'ACTIVE' as EmploymentStatus,
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
  };

  beforeEach(async () => {
    const mockService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      searchEmployees: jest.fn(),
      findBySkills: jest.fn(),
      findAvailable: jest.fn(),
      getStats: jest.fn(),
      findExpiringCertifications: jest.fn(),
      getEmployeeDocuments: jest.fn(),
      uploadDocument: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [EmployeesController],
      providers: [
        { provide: EmployeesService, useValue: mockService },
      ],
    })
    .overrideGuard(JwtAuthGuard)
    .useValue({ canActivate: () => true })
    .overrideGuard(PermissionsGuard)
    .useValue({ canActivate: () => true })
    .compile();

    controller = module.get<EmployeesController>(EmployeesController);
    service = module.get(EmployeesService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create an employee', async () => {
      const createDto: CreateEmployeeDto = {
        employeeNumber: 'EMP-001',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        hireDate: new Date('2024-01-01'),
      };

      service.create.mockResolvedValue(mockEmployee as any);

      const result = await controller.create(createDto);

      expect(service.create).toHaveBeenCalledWith(createDto);
      expect(result).toMatchObject({
        id: mockEmployee.id,
        employeeNumber: mockEmployee.employeeNumber,
        firstName: mockEmployee.firstName,
        lastName: mockEmployee.lastName,
        email: mockEmployee.email,
        employmentStatus: mockEmployee.employmentStatus,
      });
    });
  });

  describe('findAll', () => {
    it('should return paginated employee list', async () => {
      const queryDto: EmployeeQueryDto = {
        page: 1,
        limit: 20,
        search: 'John',
      };

      const serviceResponse = {
        employees: [mockEmployee],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      };

      service.findAll.mockResolvedValue(serviceResponse);

      const result = await controller.findAll(queryDto);

      expect(service.findAll).toHaveBeenCalledWith(queryDto);
      expect(result).toMatchObject({
        employees: expect.any(Array),
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      });
      expect(result.employees).toHaveLength(1);
    });
  });

  describe('findOne', () => {
    it('should return a single employee', async () => {
      service.findOne.mockResolvedValue(mockEmployee as any);

      const result = await controller.findOne(mockEmployee.id);

      expect(service.findOne).toHaveBeenCalledWith(mockEmployee.id);
      expect(result).toMatchObject({
        id: mockEmployee.id,
        employeeNumber: mockEmployee.employeeNumber,
        firstName: mockEmployee.firstName,
        lastName: mockEmployee.lastName,
      });
    });
  });

  describe('update', () => {
    it('should update an employee', async () => {
      const updateDto = {
        firstName: 'Jane',
        department: 'Operations',
      };

      const updatedEmployee = { ...mockEmployee, ...updateDto };
      service.update.mockResolvedValue(updatedEmployee as any);

      const result = await controller.update(mockEmployee.id, updateDto);

      expect(service.update).toHaveBeenCalledWith(mockEmployee.id, updateDto);
      expect(result.firstName).toBe(updateDto.firstName);
    });
  });

  describe('remove', () => {
    it('should soft delete an employee', async () => {
      const terminatedEmployee = {
        ...mockEmployee,
        employmentStatus: 'TERMINATED' as EmploymentStatus,
        terminationDate: new Date(),
      };

      service.remove.mockResolvedValue(terminatedEmployee as any);

      const result = await controller.remove(mockEmployee.id);

      expect(service.remove).toHaveBeenCalledWith(mockEmployee.id);
      expect(result.employmentStatus).toBe('TERMINATED');
      expect(result.terminationDate).toBeDefined();
    });
  });

  describe('findBySkills', () => {
    it('should return employees with matching skills', async () => {
      const skills = 'security,patrol';
      const expectedSkillsArray = ['security', 'patrol'];

      service.findBySkills.mockResolvedValue([mockEmployee] as any);

      const result = await controller.findBySkills(skills);

      expect(service.findBySkills).toHaveBeenCalledWith(expectedSkillsArray);
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: mockEmployee.id,
        employeeNumber: mockEmployee.employeeNumber,
      });
    });
  });

  describe('searchEmployees', () => {
    it('should return employees with skill matching', async () => {
      const searchDto = {
        requiredSkills: ['security'],
        minPerformanceRating: 4,
      };

      const skillMatchResult = {
        employee: mockEmployee,
        matchPercentage: 100,
        matchedSkills: ['security'],
        missingSkills: [],
        availabilityScore: 85,
      };

      service.searchEmployees.mockResolvedValue([skillMatchResult]);

      const result = await controller.searchEmployees(searchDto);

      expect(service.searchEmployees).toHaveBeenCalledWith(searchDto);
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        matchPercentage: 100,
        matchedSkills: ['security'],
        missingSkills: [],
        availabilityScore: 85,
        employee: expect.objectContaining({
          id: mockEmployee.id,
        }),
      });
    });
  });

  describe('findAvailable', () => {
    it('should return available employees', async () => {
      const startDate = '2024-01-15T09:00:00Z';
      const endDate = '2024-01-15T17:00:00Z';
      const requiredSkills = 'security,patrol';

      service.findAvailable.mockResolvedValue([mockEmployee] as any);

      const result = await controller.findAvailable(startDate, endDate, requiredSkills);

      expect(service.findAvailable).toHaveBeenCalledWith(
        startDate,
        endDate,
        ['security', 'patrol']
      );
      expect(result).toHaveLength(1);
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

      service.getStats.mockResolvedValue(mockStats);

      const result = await controller.getStats();

      expect(service.getStats).toHaveBeenCalled();
      expect(result).toEqual(mockStats);
    });
  });

  describe('findExpiringCertifications', () => {
    it('should return employees with expiring certifications', async () => {
      const days = 30;

      service.findExpiringCertifications.mockResolvedValue([mockEmployee] as any);

      const result = await controller.findExpiringCertifications(days);

      expect(service.findExpiringCertifications).toHaveBeenCalledWith(days);
      expect(result).toHaveLength(1);
    });
  });

  describe('getDocuments', () => {
    it('should return employee documents', async () => {
      const documentQueryDto: DocumentQueryDto = { documentType: 'LICENSE' };

      service.getEmployeeDocuments.mockResolvedValue([]);

      const result = await controller.getDocuments(mockEmployee.id, documentQueryDto);

      expect(service.getEmployeeDocuments).toHaveBeenCalledWith(mockEmployee.id);
      expect(result).toEqual([]);
    });
  });
});
