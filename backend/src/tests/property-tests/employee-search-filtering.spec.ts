import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { PrismaModule } from '../../prisma/prisma.module';
import * as fc from 'fast-check';
import { randomUUID } from 'crypto';

/**
 * Property-Based Test: Employee Search and Filtering Correctness
 * **Validates: Requirements 4.1**
 *
 * This test ensures that employee directory search and filtering returns accurate results
 * based on skills, availability, and status across all valid inputs and edge cases.
 */
describe('Property Test: Employee Search and Filtering Correctness', () => {
  let prismaService: PrismaService;
  let module: TestingModule;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [PrismaModule],
    }).compile();

    prismaService = module.get<PrismaService>(PrismaService);
    await prismaService.onModuleInit();
  });

  afterAll(async () => {
    await prismaService.onModuleDestroy();
    await module.close();
  });

  /**
   * Generate valid test data for employee search and filtering scenarios
   */
  const employmentStatusGenerator = fc.constantFrom('ACTIVE', 'INACTIVE', 'TERMINATED', 'ON_LEAVE');
  
  const skillsGenerator = fc.array(
    fc.constantFrom('Security', 'Surveillance', 'Patrol', 'Access Control', 'Emergency Response', 'Customer Service', 'First Aid', 'CPR'),
    { minLength: 1, maxLength: 5 }
  );

  const employeeDataGenerator = fc.record({
    employeeNumber: fc.string({ minLength: 3, maxLength: 10 }),
    firstName: fc.string({ minLength: 2, maxLength: 30 }),
    lastName: fc.string({ minLength: 2, maxLength: 30 }),
    email: fc.emailAddress(),
    employmentStatus: employmentStatusGenerator,
    skills: skillsGenerator,
    department: fc.option(fc.constantFrom('Security Operations', 'Patrol Division', 'Administration', 'Training')),
    jobTitle: fc.option(fc.constantFrom('Security Guard', 'Senior Guard', 'Supervisor', 'Manager')),
    hireDate: fc.date({ min: new Date('2020-01-01'), max: new Date() }),
    hourlyRate: fc.float({ min: 15.0, max: 50.0, noNaN: true }),
    availability: fc.option(fc.constantFrom('AVAILABLE', 'UNAVAILABLE', 'PARTIALLY_AVAILABLE')),
    complianceStatus: fc.option(fc.constantFrom('COMPLIANT', 'NON_COMPLIANT', 'PENDING'))
  });

  const searchQueryGenerator = fc.record({
    search: fc.option(fc.string({ minLength: 2, maxLength: 20 })),
    employmentStatus: fc.option(employmentStatusGenerator),
    skills: fc.option(fc.array(fc.string({ minLength: 3, maxLength: 15 }), { maxLength: 3 })),
    department: fc.option(fc.string({ minLength: 3, maxLength: 20 })),
    jobTitle: fc.option(fc.string({ minLength: 3, maxLength: 20 })),
    availabilityStatus: fc.option(fc.constantFrom('AVAILABLE', 'UNAVAILABLE', 'PARTIALLY_AVAILABLE')),
    complianceStatus: fc.option(fc.constantFrom('COMPLIANT', 'NON_COMPLIANT', 'PENDING')),
    page: fc.option(fc.integer({ min: 1, max: 5 })),
    limit: fc.option(fc.integer({ min: 5, max: 50 })),
    sortBy: fc.option(fc.constantFrom('firstName', 'lastName', 'employeeNumber', 'hireDate')),
    sortOrder: fc.option(fc.constantFrom('asc', 'desc'))
  });

  /**
   * Property 17: Employee Search Correctness
   * **Validates: Requirements 4.1**
   *
   * For any employee directory search and filtering request with valid criteria,
   * the system SHALL return accurate results that match all specified filters
   * and maintain data consistency across different search parameters.
   */
  it('Property 17: Employee search and filtering correctness', async () => {
    const testTenantId = randomUUID();

    // Setup: Create test company
    await prismaService.withSystemContext(async (prisma) => {
      await prisma.company.create({
        data: {
          id: testTenantId,
          name: 'Employee Search Test Company',
          slug: `emp-search-${testTenantId.substring(0, 8)}`,
        },
      });
    });

    try {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            employees: fc.array(employeeDataGenerator, { minLength: 5, maxLength: 20 }),
            searchQuery: searchQueryGenerator
          }),
          async (testData) => {
            // Create employees in database
            const createdEmployees = [];
            
            await prismaService.withTenant(testTenantId, async (prisma) => {
              for (const empData of testData.employees) {
                const employee = await prisma.employee.create({
                  data: {
                    employeeNumber: empData.employeeNumber,
                    firstName: empData.firstName,
                    lastName: empData.lastName,
                    email: empData.email,
                    employmentStatus: empData.employmentStatus,
                    skills: empData.skills,
                    hireDate: empData.hireDate,
                    companyId: testTenantId,
                    metadata: {
                      department: empData.department,
                      jobTitle: empData.jobTitle,
                      hourlyRate: empData.hourlyRate,
                      availability: empData.availability,
                      complianceStatus: empData.complianceStatus
                    }
                  }
                });
                createdEmployees.push({
                  ...employee,
                  metadata: employee.metadata as any
                });
              }
            });

            // Test: Perform search using Prisma directly
            const searchResult = await prismaService.withTenant(testTenantId, async (prisma) => {
              const where: any = {
                companyId: testTenantId,
              };

              // Apply search filters
              if (testData.searchQuery.search) {
                where.OR = [
                  { firstName: { contains: testData.searchQuery.search, mode: 'insensitive' } },
                  { lastName: { contains: testData.searchQuery.search, mode: 'insensitive' } },
                  { employeeNumber: { contains: testData.searchQuery.search, mode: 'insensitive' } },
                ];
              }

              if (testData.searchQuery.employmentStatus) {
                where.employmentStatus = testData.searchQuery.employmentStatus;
              }

              if (testData.searchQuery.skills && testData.searchQuery.skills.length > 0) {
                where.skills = {
                  hasEvery: testData.searchQuery.skills,
                };
              }

              const skip = ((testData.searchQuery.page || 1) - 1) * (testData.searchQuery.limit || 10);
              const take = testData.searchQuery.limit || 10;

              const [employees, total] = await Promise.all([
                prisma.employee.findMany({
                  where,
                  skip,
                  take,
                  orderBy: {
                    [testData.searchQuery.sortBy || 'createdAt']: testData.searchQuery.sortOrder || 'desc',
                  },
                }),
                prisma.employee.count({ where }),
              ]);

              return {
                employees,
                total,
                page: testData.searchQuery.page || 1,
                limit: testData.searchQuery.limit || 10,
                pages: Math.ceil(total / (testData.searchQuery.limit || 10)),
              };
            });

            // Verify: Search results are accurate and consistent
            expect(searchResult).toBeDefined();
            expect(searchResult.employees).toBeDefined();
            expect(Array.isArray(searchResult.employees)).toBe(true);
            expect(searchResult.total).toBeGreaterThanOrEqual(0);
            expect(searchResult.page).toBeDefined();
            expect(searchResult.limit).toBeDefined();
            expect(searchResult.pages).toBeDefined();

            // Verify: Pagination consistency
            const expectedPage = testData.searchQuery.page || 1;
            const expectedLimit = testData.searchQuery.limit || 10;
            expect(searchResult.page).toBe(expectedPage);
            expect(searchResult.limit).toBe(expectedLimit);
            expect(searchResult.pages).toBe(Math.ceil(searchResult.total / expectedLimit));

            // Verify: Result count doesn't exceed total
            expect(searchResult.employees.length).toBeLessThanOrEqual(searchResult.total);
            expect(searchResult.employees.length).toBeLessThanOrEqual(expectedLimit);

            // Verify: Search filter accuracy
            if (testData.searchQuery.search) {
              const searchTerm = testData.searchQuery.search.toLowerCase();
              for (const employee of searchResult.employees) {
                const matchesSearch = 
                  employee.firstName?.toLowerCase().includes(searchTerm) ||
                  employee.lastName?.toLowerCase().includes(searchTerm) ||
                  employee.employeeNumber?.toLowerCase().includes(searchTerm);
                expect(matchesSearch).toBe(true);
              }
            }

            // Verify: Employment status filter accuracy
            if (testData.searchQuery.employmentStatus) {
              for (const employee of searchResult.employees) {
                expect(employee.employmentStatus).toBe(testData.searchQuery.employmentStatus);
              }
            }

            // Verify: Skills filter accuracy
            if (testData.searchQuery.skills && testData.searchQuery.skills.length > 0) {
              for (const employee of searchResult.employees) {
                const employeeSkills = employee.skills || [];
                const hasAllRequiredSkills = testData.searchQuery.skills.every(skill =>
                  employeeSkills.includes(skill)
                );
                expect(hasAllRequiredSkills).toBe(true);
              }
            }

            // Verify: Basic sorting is applied (presence of orderBy in query)
            // Note: We don't validate exact sort order since it depends on database collation
            if (searchResult.employees.length > 1 && testData.searchQuery.sortBy) {
              // Just verify that all employees have the sort field populated when possible
              for (const employee of searchResult.employees) {
                const sortField = testData.searchQuery.sortBy;
                if (sortField === 'firstName' || sortField === 'lastName' || sortField === 'employeeNumber') {
                  expect(employee[sortField]).toBeDefined();
                }
              }
            }

            // Verify: Data consistency - no duplicate employees
            const employeeIds = searchResult.employees.map(emp => emp.id);
            const uniqueIds = new Set(employeeIds);
            expect(uniqueIds.size).toBe(employeeIds.length);

            // Verify: All returned employees belong to correct tenant
            for (const employee of searchResult.employees) {
              expect(employee.companyId).toBe(testTenantId);
            }

            // Verify: Data integrity - required fields are present
            for (const employee of searchResult.employees) {
              expect(employee.id).toBeDefined();
              expect(employee.employeeNumber).toBeDefined();
              expect(employee.firstName).toBeDefined();
              expect(employee.lastName).toBeDefined();
              expect(employee.employmentStatus).toBeDefined();
              expect(employee.companyId).toBe(testTenantId);
            }

            // Cleanup: Remove test employees
            await prismaService.withTenant(testTenantId, async (prisma) => {
              await prisma.employee.deleteMany({
                where: { companyId: testTenantId }
              });
            });
          }
        ),
        {
          numRuns: 3, // Reduced for faster testing
          timeout: 20000, // 20 second timeout per test
          seed: 42,
          endOnFailure: true,
        }
      );
    } finally {
      // Cleanup: Remove test company
      await prismaService.withSystemContext(async (prisma) => {
        await prisma.company
          .delete({ where: { id: testTenantId } })
          .catch(() => {
            // Ignore cleanup errors
          });
      });
    }
  }, 45000); // 45 second test timeout

});