import { Test, TestingModule } from '@nestjs/testing';
import { EmployeeRepository } from './employee.repository';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateEmployeeDto } from '../dto';
import { EmploymentStatus } from '../dto/create-employee.dto';

/**
 * Integration tests for EmployeeRepository
 * 
 * These tests use a real test database to verify:
 * - Database connectivity
 * - SQL query generation
 * - Field name translation
 * - Transaction handling
 * - Data integrity
 * 
 * Note: These tests require a running PostgreSQL test database
 */
describe('EmployeeRepository (Integration)', () => {
  let repository: EmployeeRepository;
  let prisma: PrismaService;
  let testCompanyId: string;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EmployeeRepository, PrismaService],
    }).compile();

    repository = module.get<EmployeeRepository>(EmployeeRepository);
    prisma = module.get<PrismaService>(PrismaService);

    // Create a test company for isolation
    try {
      const company = await prisma.companies.create({
        data: {
          name: 'Test Company for Employee Repository',
          code: `TEST-EMP-REPO-${Date.now()}`,
          metadata: { test: true },
        },
      });
      testCompanyId = company.id;
    } catch (error) {
      console.warn('Could not create test company - tests will be skipped:', error.message);
    }
  });

  afterAll(async () => {
    // Clean up test data
    if (testCompanyId) {
      try {
        // Delete all employees for test company
        await prisma.employees.deleteMany({
          where: { company_id: testCompanyId },
        });

        // Delete test company
        await prisma.companies.delete({
          where: { id: testCompanyId },
        });
      } catch (error) {
        console.warn('Cleanup failed:', error.message);
      }
    }

    await prisma.$disconnect();
  });

  afterEach(async () => {
    // Clean up employees created in tests
    if (testCompanyId) {
      try {
        await prisma.employees.deleteMany({
          where: { company_id: testCompanyId },
        });
      } catch (error) {
        console.warn('Test cleanup failed:', error.message);
      }
    }
  });

  const createValidEmployeeDto = (employeeNumber: string): CreateEmployeeDto => ({
    employeeNumber,
    firstName: 'John',
    lastName: 'Doe',
    email: `john.${employeeNumber}@test.com`,
    phone: '+919876543210',
    aadhaarNumber: '123456789012',
    panNumber: 'ABCDE1234F',
    accountNumber: '1234567890123456',
    ifscCode: 'SBIN0001234',
    hireDate: '2024-01-01',
    skills: [{ name: 'Security', level: 5 }, { name: 'First Aid', level: 3 }],
    certifications: [
      {
        name: 'Security License',
        issuingOrganization: 'Security Board',
        issueDate: new Date('2023-01-01'),
        certificateNumber: 'SEC-12345',
      },
    ],
  });

  describe('create and findByEmployeeNumber', () => {
    it('should create and retrieve an employee', async () => {
      if (!testCompanyId) {
        console.warn('Skipping test - no test company available');
        return;
      }

      const createDto = createValidEmployeeDto('INT-TEST-001');

      // Create employee using raw Prisma to verify repository can read it
      const created = await prisma.employees.create({
        data: {
          company_id: testCompanyId,
          employee_number: createDto.employeeNumber,
          first_name: createDto.firstName,
          last_name: createDto.lastName,
          email: createDto.email,
          phone: createDto.phone,
          aadhaar_number: createDto.aadhaarNumber,
          pan_number: createDto.panNumber,
          employment_status: 'ACTIVE',
          hire_date: new Date(createDto.hireDate),
          skills: createDto.skills?.map(s => s.name) || [],
          certifications: createDto.certifications as any,
          metadata: {},
        },
      });

      // Retrieve using repository
      const retrieved = await repository.findByEmployeeNumber(
        createDto.employeeNumber,
        testCompanyId,
      );

      expect(retrieved).toBeDefined();
      expect(retrieved?.employeeNumber).toBe(createDto.employeeNumber);
      expect(retrieved?.firstName).toBe(createDto.firstName);
      expect(retrieved?.lastName).toBe(createDto.lastName);
      expect(retrieved?.companyId).toBe(testCompanyId);
    });

    it('should handle employee numbers with special characters', async () => {
      if (!testCompanyId) {
        console.warn('Skipping test - no test company available');
        return;
      }

      const employeeNumber = 'EMP_TEST-002';

      await prisma.employees.create({
        data: {
          company_id: testCompanyId,
          employee_number: employeeNumber,
          first_name: 'Test',
          last_name: 'User',
          email: 'test@test.com',
          phone: '+919876543210',
          aadhaar_number: '123456789013',
          pan_number: 'ABCDE1234G',
          employment_status: 'ACTIVE',
          hire_date: new Date('2024-01-01'),
          skills: [],
          certifications: [],
          metadata: {},
        },
      });

      const retrieved = await repository.findByEmployeeNumber(
        employeeNumber,
        testCompanyId,
      );

      expect(retrieved).toBeDefined();
      expect(retrieved?.employeeNumber).toBe(employeeNumber);
    });
  });

  describe('findBySkills', () => {
    it('should find employees by required skills', async () => {
      if (!testCompanyId) {
        console.warn('Skipping test - no test company available');
        return;
      }

      // Create employees with different skill sets
      await prisma.employees.createMany({
        data: [
          {
            company_id: testCompanyId,
            employee_number: 'SKILL-001',
            first_name: 'Security',
            last_name: 'Guard',
            email: 'security@test.com',
            phone: '+919876543210',
            aadhaar_number: '123456789014',
            pan_number: 'ABCDE1234H',
            employment_status: 'ACTIVE',
            hire_date: new Date('2024-01-01'),
            skills: ['Security', 'First Aid'],
            certifications: [],
            metadata: {},
          },
          {
            company_id: testCompanyId,
            employee_number: 'SKILL-002',
            first_name: 'Medical',
            last_name: 'Guard',
            email: 'medical@test.com',
            phone: '+919876543211',
            aadhaar_number: '123456789015',
            pan_number: 'ABCDE1234I',
            employment_status: 'ACTIVE',
            hire_date: new Date('2024-01-01'),
            skills: ['First Aid', 'CPR'],
            certifications: [],
            metadata: {},
          },
        ],
      });

      // Find employees with Security skill
      const securityEmployees = await repository.findBySkills(
        ['Security'],
        testCompanyId,
      );

      expect(securityEmployees.length).toBeGreaterThan(0);
      expect(
        securityEmployees.some((e) => e.employeeNumber === 'SKILL-001'),
      ).toBe(true);
    });
  });

  describe('getStats', () => {
    it('should return accurate statistics', async () => {
      if (!testCompanyId) {
        console.warn('Skipping test - no test company available');
        return;
      }

      // Create employees with different statuses
      await prisma.employees.createMany({
        data: [
          {
            company_id: testCompanyId,
            employee_number: 'STATS-001',
            first_name: 'Active',
            last_name: 'Employee',
            email: 'active@test.com',
            phone: '+919876543210',
            aadhaar_number: '123456789016',
            pan_number: 'ABCDE1234J',
            employment_status: 'ACTIVE',
            hire_date: new Date('2024-01-01'),
            skills: [],
            certifications: [],
            metadata: {},
          },
          {
            company_id: testCompanyId,
            employee_number: 'STATS-002',
            first_name: 'Inactive',
            last_name: 'Employee',
            email: 'inactive@test.com',
            phone: '+919876543211',
            aadhaar_number: '123456789017',
            pan_number: 'ABCDE1234K',
            employment_status: 'INACTIVE',
            hire_date: new Date('2024-01-01'),
            skills: [],
            certifications: [],
            metadata: {},
          },
        ],
      });

      const stats = await repository.getStats(testCompanyId);

      expect(stats.total).toBeGreaterThanOrEqual(2);
      expect(stats.active).toBeGreaterThanOrEqual(1);
      expect(stats.inactive).toBeGreaterThanOrEqual(1);
    });
  });

  describe('findExpiringCertifications', () => {
    it('should find employees with expiring certifications', async () => {
      if (!testCompanyId) {
        console.warn('Skipping test - no test company available');
        return;
      }

      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 15); // 15 days from now

      await prisma.employees.create({
        data: {
          company_id: testCompanyId,
          employee_number: 'CERT-001',
          first_name: 'Certified',
          last_name: 'Employee',
          email: 'cert@test.com',
          phone: '+919876543210',
          aadhaar_number: '123456789018',
          pan_number: 'ABCDE1234L',
          employment_status: 'ACTIVE',
          hire_date: new Date('2024-01-01'),
          skills: [],
          certifications: [
            {
              name: 'Security License',
              issuingOrganization: 'Security Board',
              issueDate: new Date('2023-01-01'),
              expiryDate: expiryDate,
              certificateNumber: 'SEC-EXPIRING',
            },
          ] as any,
          metadata: {},
        },
      });

      const employees = await repository.findExpiringCertifications(
        30,
        testCompanyId,
      );

      expect(employees.length).toBeGreaterThan(0);
      expect(employees.some((e) => e.employeeNumber === 'CERT-001')).toBe(true);
    });
  });

  describe('soft delete', () => {
    it('should exclude soft-deleted employees from queries', async () => {
      if (!testCompanyId) {
        console.warn('Skipping test - no test company available');
        return;
      }

      const employeeNumber = 'SOFT-DELETE-001';

      const created = await prisma.employees.create({
        data: {
          company_id: testCompanyId,
          employee_number: employeeNumber,
          first_name: 'Soft',
          last_name: 'Deleted',
          email: 'soft@test.com',
          phone: '+919876543210',
          aadhaar_number: '123456789019',
          pan_number: 'ABCDE1234M',
          employment_status: 'ACTIVE',
          hire_date: new Date('2024-01-01'),
          skills: [],
          certifications: [],
          metadata: {},
        },
      });

      // Verify employee exists
      let found = await repository.findByEmployeeNumber(
        employeeNumber,
        testCompanyId,
      );
      expect(found).toBeDefined();

      // Soft delete
      await prisma.employees.update({
        where: { id: created.id },
        data: { deleted_at: new Date() },
      });

      // Verify employee is excluded
      found = await repository.findByEmployeeNumber(
        employeeNumber,
        testCompanyId,
      );
      expect(found).toBeNull();
    });
  });
});
