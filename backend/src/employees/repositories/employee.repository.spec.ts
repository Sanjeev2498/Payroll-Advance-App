import { Test, TestingModule } from '@nestjs/testing';
import { EmployeeRepository } from './employee.repository';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateEmployeeDto, UpdateEmployeeDto } from '../dto';
import { EmploymentStatus } from '../dto/create-employee.dto';

describe('EmployeeRepository', () => {
  let repository: EmployeeRepository;
  let prismaService: PrismaService;
  let mockPrismaEmployees: any;

  beforeEach(async () => {
    // Create mock Prisma employees model
    mockPrismaEmployees = {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    };

    // Create mock PrismaService
    const mockPrismaService = {
      employees: mockPrismaEmployees,
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmployeeRepository,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    repository = module.get<EmployeeRepository>(EmployeeRepository);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should be defined', () => {
      expect(repository).toBeDefined();
    });

    it('should initialize with correct model name', () => {
      expect((repository as any).modelName).toBe('employees');
    });

    it('should enable soft delete', () => {
      expect((repository as any).hasSoftDelete).toBe(true);
    });
  });

  describe('findByEmployeeNumber', () => {
    const mockEmployee = {
      id: 'emp-123',
      company_id: 'company-123',
      employee_number: 'EMP-001',
      first_name: 'John',
      last_name: 'Doe',
      email: 'john@example.com',
      phone: '+919876543210',
      aadhaar_number: '123456789012',
      pan_number: 'ABCDE1234F',
      employment_status: 'ACTIVE',
      hire_date: new Date('2024-01-01'),
      skills: ['Security', 'First Aid'],
      certifications: [],
      metadata: {},
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      termination_date: null,
      department: 'Security',
      jobTitle: 'Guard',
      employmentType: 'FULL_TIME',
      hourlyRate: 25,
      contactInfo: {},
      address: null,
    };

    it('should find an employee by employee number', async () => {
      mockPrismaEmployees.findFirst.mockResolvedValue(mockEmployee);

      const result = await repository.findByEmployeeNumber('EMP-001');

      expect(result).toBeDefined();
      expect(result?.employeeNumber).toBe('EMP-001');
      expect(mockPrismaEmployees.findFirst).toHaveBeenCalledWith({
        where: expect.objectContaining({
          employee_number: 'EMP-001',
          deleted_at: null,
        }),
      });
    });

    it('should find an employee by employee number with company filter', async () => {
      mockPrismaEmployees.findFirst.mockResolvedValue(mockEmployee);

      const result = await repository.findByEmployeeNumber(
        'EMP-001',
        'company-123',
      );

      expect(result).toBeDefined();
      expect(mockPrismaEmployees.findFirst).toHaveBeenCalledWith({
        where: expect.objectContaining({
          employee_number: 'EMP-001',
          company_id: 'company-123',
          deleted_at: null,
        }),
      });
    });

    it('should return null when employee not found', async () => {
      mockPrismaEmployees.findFirst.mockResolvedValue(null);

      const result = await repository.findByEmployeeNumber('NOT-EXIST');

      expect(result).toBeNull();
    });

    it('should throw error when database operation fails', async () => {
      mockPrismaEmployees.findFirst.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(
        repository.findByEmployeeNumber('EMP-001'),
      ).rejects.toThrow('Database error');
    });
  });

  describe('findBySkills', () => {
    const mockEmployees = [
      {
        id: 'emp-1',
        company_id: 'company-123',
        employee_number: 'EMP-001',
        first_name: 'John',
        last_name: 'Doe',
        employment_status: 'ACTIVE',
        hire_date: new Date('2024-01-01'),
        skills: ['Security', 'First Aid'],
        certifications: [],
        metadata: {},
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
        email: 'john@example.com',
        phone: '+919876543210',
        aadhaar_number: '123456789012',
        pan_number: 'ABCDE1234F',
        termination_date: null,
        department: 'Security',
        jobTitle: 'Guard',
        employmentType: 'FULL_TIME',
        hourlyRate: 25,
        contactInfo: {},
        address: null,
      },
      {
        id: 'emp-2',
        company_id: 'company-123',
        employee_number: 'EMP-002',
        first_name: 'Jane',
        last_name: 'Smith',
        employment_status: 'ACTIVE',
        hire_date: new Date('2024-01-15'),
        skills: ['Security', 'First Aid', 'CPR'],
        certifications: [],
        metadata: {},
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
        email: 'jane@example.com',
        phone: '+919876543211',
        aadhaar_number: '123456789013',
        pan_number: 'ABCDE1234G',
        termination_date: null,
        department: 'Security',
        jobTitle: 'Guard',
        employmentType: 'FULL_TIME',
        hourlyRate: 28,
        contactInfo: {},
        address: null,
      },
    ];

    it('should find employees by skills', async () => {
      mockPrismaEmployees.findMany.mockResolvedValue(mockEmployees);

      const result = await repository.findBySkills(['Security', 'First Aid']);

      expect(result).toHaveLength(2);
      expect(mockPrismaEmployees.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          deleted_at: null,
          skills: {
            hasEvery: ['Security', 'First Aid'],
          },
        }),
      });
    });

    it('should find employees by skills with company filter', async () => {
      mockPrismaEmployees.findMany.mockResolvedValue(mockEmployees);

      const result = await repository.findBySkills(
        ['Security'],
        'company-123',
      );

      expect(result).toHaveLength(2);
      expect(mockPrismaEmployees.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          company_id: 'company-123',
          deleted_at: null,
          skills: {
            hasEvery: ['Security'],
          },
        }),
      });
    });

    it('should return empty array when no employees match', async () => {
      mockPrismaEmployees.findMany.mockResolvedValue([]);

      const result = await repository.findBySkills(['Rare Skill']);

      expect(result).toHaveLength(0);
    });

    it('should throw error when database operation fails', async () => {
      mockPrismaEmployees.findMany.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(repository.findBySkills(['Security'])).rejects.toThrow(
        'Database error',
      );
    });
  });

  describe('getStats', () => {
    it('should return employee statistics', async () => {
      mockPrismaEmployees.count
        .mockResolvedValueOnce(50) // total
        .mockResolvedValueOnce(45) // active
        .mockResolvedValueOnce(2) // inactive
        .mockResolvedValueOnce(1) // on leave
        .mockResolvedValueOnce(2); // terminated

      const result = await repository.getStats('company-123');

      expect(result).toEqual({
        total: 50,
        active: 45,
        inactive: 2,
        onLeave: 1,
        terminated: 2,
        certificationsExpiringSoon: 0,
        complianceIssues: 0,
        averagePerformanceRating: 0,
      });

      expect(mockPrismaEmployees.count).toHaveBeenCalledTimes(5);
    });

    it('should return stats without company filter', async () => {
      mockPrismaEmployees.count
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(90) // active
        .mockResolvedValueOnce(5) // inactive
        .mockResolvedValueOnce(3) // on leave
        .mockResolvedValueOnce(2); // terminated

      const result = await repository.getStats();

      expect(result.total).toBe(100);
      expect(result.active).toBe(90);

      // Verify that company_id was not in the where clause
      const calls = mockPrismaEmployees.count.mock.calls;
      calls.forEach((call) => {
        expect(call[0].where).not.toHaveProperty('company_id');
      });
    });

    it('should throw error when database operation fails', async () => {
      mockPrismaEmployees.count.mockRejectedValue(new Error('Database error'));

      await expect(repository.getStats('company-123')).rejects.toThrow(
        'Database error',
      );
    });
  });

  describe('findExpiringCertifications', () => {
    const createEmployee = (certExpiryDate: Date | null) => ({
      id: `emp-${Date.now()}`,
      company_id: 'company-123',
      employee_number: `EMP-${Date.now()}`,
      first_name: 'John',
      last_name: 'Doe',
      employment_status: 'ACTIVE',
      hire_date: new Date('2024-01-01'),
      skills: ['Security'],
      certifications: certExpiryDate
        ? [
            {
              name: 'Security License',
              issuingOrganization: 'Security Board',
              issueDate: new Date('2023-01-01'),
              expiryDate: certExpiryDate,
              certificateNumber: 'SEC-12345',
            },
          ]
        : [],
      metadata: {},
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      email: 'john@example.com',
      phone: '+919876543210',
      aadhaar_number: '123456789012',
      pan_number: 'ABCDE1234F',
      termination_date: null,
      department: 'Security',
      jobTitle: 'Guard',
      employmentType: 'FULL_TIME',
      hourlyRate: 25,
      contactInfo: {},
      address: null,
    });

    it('should find employees with certifications expiring within 30 days', async () => {
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 15); // Expires in 15 days

      const employeeWithExpiringCert = createEmployee(expiryDate);

      mockPrismaEmployees.findMany.mockResolvedValue([
        employeeWithExpiringCert,
      ]);

      const result = await repository.findExpiringCertifications(30);

      expect(result).toHaveLength(1);
      expect(mockPrismaEmployees.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          deleted_at: null,
          certifications: {
            not: null,
          },
        }),
      });
    });

    it('should not return employees with certifications expiring after the date range', async () => {
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 60); // Expires in 60 days

      const employeeWithFutureCert = createEmployee(expiryDate);

      mockPrismaEmployees.findMany.mockResolvedValue([employeeWithFutureCert]);

      const result = await repository.findExpiringCertifications(30);

      expect(result).toHaveLength(0);
    });

    it('should not return employees with already expired certifications', async () => {
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() - 10); // Expired 10 days ago

      const employeeWithExpiredCert = createEmployee(expiryDate);

      mockPrismaEmployees.findMany.mockResolvedValue([
        employeeWithExpiredCert,
      ]);

      const result = await repository.findExpiringCertifications(30);

      expect(result).toHaveLength(0);
    });

    it('should filter by company ID when provided', async () => {
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 15);

      const employee = createEmployee(expiryDate);

      mockPrismaEmployees.findMany.mockResolvedValue([employee]);

      await repository.findExpiringCertifications(30, 'company-123');

      expect(mockPrismaEmployees.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          company_id: 'company-123',
          deleted_at: null,
          certifications: {
            not: null,
          },
        }),
      });
    });

    it('should handle employees with no certifications', async () => {
      const employeeNoCerts = createEmployee(null);

      mockPrismaEmployees.findMany.mockResolvedValue([employeeNoCerts]);

      const result = await repository.findExpiringCertifications(30);

      expect(result).toHaveLength(0);
    });

    it('should throw error when database operation fails', async () => {
      mockPrismaEmployees.findMany.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(
        repository.findExpiringCertifications(30),
      ).rejects.toThrow('Database error');
    });
  });

  describe('beforeCreate lifecycle hook', () => {
    const validEmployeeDto: CreateEmployeeDto = {
      employeeNumber: 'EMP-001',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      phone: '+919876543210',
      aadhaarNumber: '123456789012',
      panNumber: 'ABCDE1234F',
      accountNumber: '1234567890123456',
      ifscCode: 'SBIN0001234',
      hireDate: new Date().toISOString().split('T')[0], // Today's date
      skills: [{ name: 'Security', level: 5 }],
    };

    it('should validate and pass valid employee data', async () => {
      const result = await (repository as any).beforeCreate(validEmployeeDto);

      expect(result).toEqual(validEmployeeDto);
    });

    it('should reject invalid employee number format', async () => {
      const invalidDto = {
        ...validEmployeeDto,
        employeeNumber: 'EMP@001!',
      };

      await expect((repository as any).beforeCreate(invalidDto)).rejects.toThrow(
        'Employee number must contain only letters, numbers, hyphens, and underscores',
      );
    });

    it('should accept employee numbers with hyphens and underscores', async () => {
      const validDto = {
        ...validEmployeeDto,
        employeeNumber: 'EMP_001-A',
      };

      const result = await (repository as any).beforeCreate(validDto);

      expect(result.employeeNumber).toBe('EMP_001-A');
    });

    it('should reject future hire dates', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 10);

      const invalidDto = {
        ...validEmployeeDto,
        hireDate: futureDate.toISOString().split('T')[0],
      };

      await expect((repository as any).beforeCreate(invalidDto)).rejects.toThrow(
        'Hire date cannot be in the future',
      );
    });

    it('should accept hire date that is today', async () => {
      const todayDto = {
        ...validEmployeeDto,
        hireDate: new Date().toISOString().split('T')[0],
      };

      const result = await (repository as any).beforeCreate(todayDto);

      expect(result.hireDate).toBe(todayDto.hireDate);
    });

    it('should accept past hire dates', async () => {
      const pastDate = new Date('2024-01-01');
      const pastDto = {
        ...validEmployeeDto,
        hireDate: pastDate.toISOString().split('T')[0],
      };

      const result = await (repository as any).beforeCreate(pastDto);

      expect(result.hireDate).toBe(pastDto.hireDate);
    });
  });

  describe('beforeUpdate lifecycle hook', () => {
    const validUpdateDto: UpdateEmployeeDto = {
      firstName: 'Jane',
      lastName: 'Smith',
    };

    it('should validate and pass valid update data', async () => {
      const result = await (repository as any).beforeUpdate(
        'emp-123',
        validUpdateDto,
      );

      expect(result).toEqual(validUpdateDto);
    });

    it('should reject future hire dates in updates', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 10);

      const invalidDto = {
        ...validUpdateDto,
        hireDate: futureDate.toISOString().split('T')[0],
      };

      await expect(
        (repository as any).beforeUpdate('emp-123', invalidDto),
      ).rejects.toThrow('Hire date cannot be in the future');
    });

    it('should auto-set termination date when status is TERMINATED', async () => {
      const terminationDto: UpdateEmployeeDto = {
        employmentStatus: EmploymentStatus.TERMINATED,
      };

      const result = await (repository as any).beforeUpdate(
        'emp-123',
        terminationDto,
      );

      expect(result.terminationDate).toBeDefined();
      expect(result.terminationDate).toBeInstanceOf(Date);
    });

    it('should not override manually set termination date', async () => {
      const specificDate = new Date('2024-12-31');
      const terminationDto: UpdateEmployeeDto = {
        employmentStatus: EmploymentStatus.TERMINATED,
        terminationDate: specificDate,
      };

      const result = await (repository as any).beforeUpdate(
        'emp-123',
        terminationDto,
      );

      expect(result.terminationDate).toEqual(specificDate);
    });

    it('should allow updates without hire date', async () => {
      const updateDto: UpdateEmployeeDto = {
        phone: '+919876543210',
        email: 'newemail@example.com',
      };

      const result = await (repository as any).beforeUpdate(
        'emp-123',
        updateDto,
      );

      expect(result).toEqual(updateDto);
    });
  });

  describe('transformToDto', () => {
    const mockEmployeeModel = {
      id: 'emp-123',
      company_id: 'company-123',
      employee_number: 'EMP-001',
      first_name: 'John',
      last_name: 'Doe',
      email: 'john@example.com',
      phone: '+919876543210',
      aadhaar_number: '123456789012',
      pan_number: 'ABCDE1234F',
      employment_status: 'ACTIVE',
      hire_date: new Date('2024-01-01'),
      termination_date: null,
      skills: ['Security', 'First Aid'],
      certifications: [
        {
          name: 'Security License',
          issuingOrganization: 'Security Board',
          issueDate: new Date('2023-01-01'),
          certificateNumber: 'SEC-12345',
        },
      ],
      department: 'Security',
      jobTitle: 'Guard',
      employmentType: 'FULL_TIME',
      hourlyRate: 25,
      metadata: {
        customField: 'value',
      },
      created_at: new Date('2024-01-01'),
      updated_at: new Date('2024-01-15'),
      deleted_at: null,
      contactInfo: {},
      address: null,
    };

    it('should transform Prisma model to DTO with camelCase fields', () => {
      const result = (repository as any).transformToDto(mockEmployeeModel);

      expect(result).toMatchObject({
        id: 'emp-123',
        companyId: 'company-123',
        employeeNumber: 'EMP-001',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phone: '+919876543210',
        employmentStatus: 'ACTIVE',
        department: 'Security',
        jobTitle: 'Guard',
        employmentType: 'FULL_TIME',
        hourlyRate: 25,
      });
    });

    it('should transform skills array properly', () => {
      const result = (repository as any).transformToDto(mockEmployeeModel);

      expect(result.skills).toEqual([
        { name: 'Security' },
        { name: 'First Aid' },
      ]);
    });

    it('should preserve certifications array', () => {
      const result = (repository as any).transformToDto(mockEmployeeModel);

      expect(result.certifications).toHaveLength(1);
      expect(result.certifications[0].name).toBe('Security License');
    });

    it('should handle employees with metadata fields', () => {
      const modelWithMetadata = {
        ...mockEmployeeModel,
        metadata: {
          employmentType: 'CONTRACT',
          department: 'Operations',
          jobTitle: 'Supervisor',
          customField: 'custom value',
        },
      };

      const result = (repository as any).transformToDto(modelWithMetadata);

      // Should prefer metadata values when available
      expect(result.metadata).toBeDefined();
      expect(result.metadata.customField).toBe('custom value');
    });

    it('should handle null values gracefully', () => {
      const minimalModel = {
        ...mockEmployeeModel,
        email: null,
        phone: null,
        certifications: null,
        metadata: null,
      };

      const result = (repository as any).transformToDto(minimalModel);

      expect(result.email).toBeNull();
      expect(result.phone).toBeNull();
      expect(result.certifications).toBeNull();
      expect(result.metadata).toBeNull();
    });
  });
});
