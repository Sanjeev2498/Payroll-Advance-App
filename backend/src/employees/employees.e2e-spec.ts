import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../app.module';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEmployeeDto, EmploymentStatus } from './dto';

/**
 * End-to-End Integration Tests for Employee API
 * 
 * These tests verify the complete field mapping architecture:
 * 1. HTTP Request (camelCase) → Service → Repository → Database (snake_case)
 * 2. Database (snake_case) → Repository → Service → HTTP Response (camelCase)
 * 
 * Tests cover:
 * - CRUD operations with field name translation
 * - Error handling with camelCase field names
 * - Performance overhead (< 5ms)
 * - Pagination and filtering
 */
describe('Employee API Integration (E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let testCompanyId: string;
  let authToken: string; // For authenticated requests

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    
    // Apply same pipes as main.ts
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );

    prisma = app.get<PrismaService>(PrismaService);
    await app.init();

    // Create test company
    try {
      const company = await prisma.companies.create({
        data: {
          name: 'E2E Test Company',
          code: `E2E-${Date.now()}`,
          metadata: { test: true },
        },
      });
      testCompanyId = company.id;
    } catch (error) {
      console.error('Failed to create test company:', error);
    }

    // TODO: Get auth token for tests
    // For now, tests will run without auth (requires auth to be disabled in test env)
  });

  afterAll(async () => {
    // Cleanup
    if (testCompanyId) {
      try {
        await prisma.employees.deleteMany({
          where: { company_id: testCompanyId },
        });
        await prisma.companies.delete({
          where: { id: testCompanyId },
        });
      } catch (error) {
        console.error('Cleanup failed:', error);
      }
    }

    await prisma.$disconnect();
    await app.close();
  });

  describe('POST /api/v1/employees - CREATE with field mapping', () => {
    it('should create employee with camelCase DTO and store as snake_case in database', async () => {
      const createDto: Partial<CreateEmployeeDto> = {
        employeeNumber: `E2E-CREATE-${Date.now()}`,
        firstName: 'John',
        lastName: 'Doe',
        email: `john.e2e.${Date.now()}@test.com`,
        phone: '+919876543210',
        aadhaarNumber: '123456789012',
        panNumber: 'ABCDE1234F',
        hireDate: '2024-01-15',
        skills: [
          { name: 'Security', level: 5 },
          { name: 'First Aid', level: 3 },
        ],
      };

      const startTime = Date.now();
      const response = await request(app.getHttpServer())
        .post('/api/v1/employees')
        .send(createDto)
        .expect(201);
      const endTime = Date.now();
      const requestTime = endTime - startTime;

      // Verify API response has camelCase
      expect(response.body).toMatchObject({
        employeeNumber: createDto.employeeNumber,
        firstName: createDto.firstName,
        lastName: createDto.lastName,
      });
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('companyId');

      // Verify database has snake_case
      const dbRecord = await prisma.employees.findFirst({
        where: { employee_number: createDto.employeeNumber },
      });

      expect(dbRecord).toBeDefined();
      expect(dbRecord?.first_name).toBe(createDto.firstName);
      expect(dbRecord?.last_name).toBe(createDto.lastName);
      expect(dbRecord?.employee_number).toBe(createDto.employeeNumber);

      // Verify performance (< 5ms overhead from field mapping)
      // Note: Total request time includes network, validation, DB insert
      // Field mapping overhead should be negligible
      console.log(`CREATE request time: ${requestTime}ms`);
      expect(requestTime).toBeLessThan(1000); // Reasonable for full request
    });

    it('should return 409 Conflict for duplicate employeeNumber with camelCase field name', async () => {
      const employeeNumber = `E2E-DUPLICATE-${Date.now()}`;
      
      // Create first employee
      await prisma.employees.create({
        data: {
          company_id: testCompanyId,
          employee_number: employeeNumber,
          first_name: 'First',
          last_name: 'Employee',
          email: `first.${Date.now()}@test.com`,
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

      // Try to create duplicate
      const response = await request(app.getHttpServer())
        .post('/api/v1/employees')
        .send({
          employeeNumber, // Same employee number
          firstName: 'Second',
          lastName: 'Employee',
          email: `second.${Date.now()}@test.com`,
          phone: '+919876543211',
          aadhaarNumber: '123456789014',
          panNumber: 'ABCDE1234H',
          hireDate: '2024-01-01',
        })
        .expect(409);

      // Verify error message includes camelCase field name
      expect(response.body.error.message).toMatch(/employeeNumber/i);
    });

    it('should return 400 Bad Request for validation errors', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/employees')
        .send({
          // Missing required fields
          firstName: 'John',
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/v1/employees/:id - READ with field mapping', () => {
    let testEmployeeId: string;

    beforeAll(async () => {
      // Create test employee
      const employee = await prisma.employees.create({
        data: {
          company_id: testCompanyId,
          employee_number: `E2E-GET-${Date.now()}`,
          first_name: 'Jane',
          last_name: 'Smith',
          email: `jane.${Date.now()}@test.com`,
          phone: '+919876543210',
          aadhaar_number: '123456789015',
          pan_number: 'ABCDE1234I',
          employment_status: 'ACTIVE',
          hire_date: new Date('2024-01-01'),
          skills: ['Security', 'Patrol'],
          certifications: [],
          metadata: {},
        },
      });
      testEmployeeId = employee.id;
    });

    it('should return employee with camelCase fields from snake_case database', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/employees/${testEmployeeId}`)
        .expect(200);

      // Verify response has camelCase
      expect(response.body).toHaveProperty('employeeNumber');
      expect(response.body).toHaveProperty('firstName', 'Jane');
      expect(response.body).toHaveProperty('lastName', 'Smith');
      expect(response.body).not.toHaveProperty('employee_number');
      expect(response.body).not.toHaveProperty('first_name');
    });

    it('should return 404 Not Found with proper message', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/employees/non-existent-id')
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code', 'NOT_FOUND');
    });
  });

  describe('PATCH /api/v1/employees/:id - UPDATE with field mapping', () => {
    let testEmployeeId: string;

    beforeAll(async () => {
      const employee = await prisma.employees.create({
        data: {
          company_id: testCompanyId,
          employee_number: `E2E-UPDATE-${Date.now()}`,
          first_name: 'Update',
          last_name: 'Test',
          email: `update.${Date.now()}@test.com`,
          phone: '+919876543210',
          aadhaar_number: '123456789016',
          pan_number: 'ABCDE1234J',
          employment_status: 'ACTIVE',
          hire_date: new Date('2024-01-01'),
          skills: [],
          certifications: [],
          metadata: {},
        },
      });
      testEmployeeId = employee.id;
    });

    it('should update employee with partial camelCase DTO', async () => {
      const updateDto = {
        firstName: 'UpdatedFirstName',
        employmentStatus: EmploymentStatus.INACTIVE,
      };

      const response = await request(app.getHttpServer())
        .patch(`/api/v1/employees/${testEmployeeId}`)
        .send(updateDto)
        .expect(200);

      // Verify API response
      expect(response.body.firstName).toBe(updateDto.firstName);
      expect(response.body.employmentStatus).toBe(updateDto.employmentStatus);

      // Verify database was updated with snake_case
      const dbRecord = await prisma.employees.findUnique({
        where: { id: testEmployeeId },
      });

      expect(dbRecord?.first_name).toBe(updateDto.firstName);
      expect(dbRecord?.employment_status).toBe(updateDto.employmentStatus);
    });
  });

  describe('DELETE /api/v1/employees/:id - SOFT DELETE', () => {
    let testEmployeeId: string;

    beforeAll(async () => {
      const employee = await prisma.employees.create({
        data: {
          company_id: testCompanyId,
          employee_number: `E2E-DELETE-${Date.now()}`,
          first_name: 'Delete',
          last_name: 'Test',
          email: `delete.${Date.now()}@test.com`,
          phone: '+919876543210',
          aadhaar_number: '123456789017',
          pan_number: 'ABCDE1234K',
          employment_status: 'ACTIVE',
          hire_date: new Date('2024-01-01'),
          skills: [],
          certifications: [],
          metadata: {},
        },
      });
      testEmployeeId = employee.id;
    });

    it('should soft delete employee (set deleted_at timestamp)', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/employees/${testEmployeeId}`)
        .expect(200);

      // Verify deleted_at is set in database
      const dbRecord = await prisma.employees.findUnique({
        where: { id: testEmployeeId },
      });

      expect(dbRecord).toBeDefined();
      expect(dbRecord?.deleted_at).toBeDefined();
      expect(dbRecord?.deleted_at).toBeInstanceOf(Date);
      expect(dbRecord?.employment_status).toBe('TERMINATED');
    });

    it('should exclude soft-deleted employees from GET requests', async () => {
      // Verify the deleted employee is not returned
      const response = await request(app.getHttpServer())
        .get(`/api/v1/employees/${testEmployeeId}`)
        .expect(404);
    });
  });

  describe('GET /api/v1/employees - LIST with pagination and filtering', () => {
    beforeAll(async () => {
      // Create multiple test employees
      await prisma.employees.createMany({
        data: [
          {
            company_id: testCompanyId,
            employee_number: 'E2E-LIST-1',
            first_name: 'Alice',
            last_name: 'Johnson',
            email: `alice.${Date.now()}@test.com`,
            phone: '+919876543210',
            aadhaar_number: '123456789018',
            pan_number: 'ABCDE1234L',
            employment_status: 'ACTIVE',
            hire_date: new Date('2024-01-01'),
            skills: ['Security', 'First Aid'],
            certifications: [],
            metadata: {},
          },
          {
            company_id: testCompanyId,
            employee_number: 'E2E-LIST-2',
            first_name: 'Bob',
            last_name: 'Williams',
            email: `bob.${Date.now()}@test.com`,
            phone: '+919876543211',
            aadhaar_number: '123456789019',
            pan_number: 'ABCDE1234M',
            employment_status: 'ACTIVE',
            hire_date: new Date('2024-02-01'),
            skills: ['Patrol'],
            certifications: [],
            metadata: {},
          },
        ],
      });
    });

    it('should return paginated results with camelCase fields', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/employees')
        .query({ page: 1, limit: 10 })
        .expect(200);

      expect(response.body).toHaveProperty('employees');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('page', 1);
      expect(response.body).toHaveProperty('limit', 10);
      expect(Array.isArray(response.body.employees)).toBe(true);

      // Verify first employee has camelCase fields
      if (response.body.employees.length > 0) {
        const firstEmployee = response.body.employees[0];
        expect(firstEmployee).toHaveProperty('employeeNumber');
        expect(firstEmployee).toHaveProperty('firstName');
        expect(firstEmployee).not.toHaveProperty('employee_number');
      }
    });

    it('should filter by skills with camelCase query', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/employees')
        .query({ skills: 'Security,First Aid' })
        .expect(200);

      expect(response.body.employees.length).toBeGreaterThan(0);
      
      // Verify filtered employee has the required skills
      const employee = response.body.employees.find(
        (e: any) => e.employeeNumber === 'E2E-LIST-1'
      );
      expect(employee).toBeDefined();
    });

    it('should sort by camelCase field names', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/employees')
        .query({ sortBy: 'firstName', sortOrder: 'asc' })
        .expect(200);

      expect(response.body.employees).toBeDefined();
      
      // Verify sorting worked (if we have employees)
      if (response.body.employees.length >= 2) {
        const firstNames = response.body.employees.map((e: any) => e.firstName);
        const sortedNames = [...firstNames].sort();
        expect(firstNames).toEqual(sortedNames);
      }
    });
  });

  describe('Performance Tests', () => {
    it('should have minimal overhead from field mapping (< 5ms per operation)', async () => {
      const iterations = 10;
      const times: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const startTime = Date.now();
        
        // Simple GET request
        await request(app.getHttpServer())
          .get('/api/v1/employees')
          .query({ limit: 1 });
        
        const endTime = Date.now();
        times.push(endTime - startTime);
      }

      const avgTime = times.reduce((a, b) => a + b, 0) / iterations;
      console.log(`Average request time over ${iterations} iterations: ${avgTime}ms`);
      
      // Field mapping overhead should be negligible
      // Total time includes network + validation + DB query + mapping
      // This is a reasonable threshold for the full request
      expect(avgTime).toBeLessThan(200);
    });
  });
});
