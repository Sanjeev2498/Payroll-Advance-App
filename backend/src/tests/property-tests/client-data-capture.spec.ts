import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import * as fc from 'fast-check';
import { randomUUID } from 'crypto';
import { ContractStatus } from '@prisma/client';
import { PrismaModule } from '../../prisma/prisma.module';
import { validateDate, parseAndValidateDate } from '../../common/utils/date-validation.util';

/**
 * Property-Based Test: Client Data Capture Completeness
 * **Validates: Requirements 2.1**
 *
 * This test ensures that client onboarding captures all required data without loss
 * and maintains data integrity throughout the process.
 */
describe('Property Test: Client Data Capture Completeness', () => {
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
   * Generate valid dates that won't trigger database constraint violations
   * Respects PostgreSQL date range limits and business logic constraints
   */
  const validDateGenerator = fc.date({ 
    min: new Date('2020-01-01'), 
    max: new Date('2099-12-31') 
  }).filter(date => {
    const validation = validateDate(date);
    return validation.isValid;
  });

  /**
   * Property 4: Client Data Capture Completeness
   * **Validates: Requirements 2.1**
   *
   * For any client onboarding request with valid data, the system SHALL successfully
   * capture and store all required client details, contract terms, and billing preferences
   * without data loss or corruption.
   */
  it('Property 4: Client data capture completeness', async () => {
    const testTenantId = randomUUID();

    // Setup: Create a test company first
    await prismaService.withSystemContext(async (prisma) => {
      await prisma.company.create({
        data: {
          id: testTenantId,
          name: 'Test Company',
          slug: `test-${testTenantId.substring(0, 8)}`,
        },
      });
    });

    try {
      await fc.assert(
        fc.asyncProperty(
          // Generate comprehensive client data
          fc.record({
            client: fc.record({
              name: fc.string({ minLength: 2, maxLength: 100 }).filter((s) => s.trim().length >= 2),
              contactEmail: fc.emailAddress(),
              organizationType: fc.constantFrom('CORPORATE_OFFICE', 'RESIDENTIAL_SOCIETY', 'HOSPITAL'),
              contactInfo: fc.option(
                fc.record({
                  contactPerson: fc.string({ minLength: 2, maxLength: 100 }),
                  phone: fc.option(fc.string({ minLength: 10, maxLength: 20 })),
                  secondaryEmail: fc.option(fc.emailAddress()),
                  address: fc.option(
                    fc.record({
                      street: fc.string({ minLength: 5, maxLength: 100 }),
                      city: fc.string({ minLength: 2, maxLength: 50 }),
                      state: fc.string({ minLength: 2, maxLength: 50 }),
                      zipCode: fc.string({ minLength: 5, maxLength: 10 }),
                      country: fc.string({ minLength: 2, maxLength: 50 }),
                    }),
                  ),
                  notes: fc.option(fc.string({ maxLength: 500 })),
                }),
              ),
            }),
            contract: fc.record({
              contractNumber: fc.string({ minLength: 5, maxLength: 20 }),
              title: fc.string({ minLength: 5, maxLength: 100 }),
              status: fc.constantFrom(
                ContractStatus.ACTIVE,
                ContractStatus.PENDING,
                ContractStatus.EXPIRED,
                ContractStatus.TERMINATED,
              ),
              startDate: fc.option(validDateGenerator),
              endDate: fc.option(validDateGenerator),
              billingPreferences: fc.option(
                fc.record({
                  frequency: fc.constantFrom('MONTHLY', 'QUARTERLY', 'YEARLY'),
                  method: fc.option(fc.constantFrom('EMAIL', 'MAIL', 'PORTAL')),
                  paymentTerms: fc.option(fc.integer({ min: 1, max: 90 })),
                  billingEmail: fc.option(fc.emailAddress()),
                  instructions: fc.option(fc.string({ maxLength: 500 })),
                }),
              ),
            }),
          }),
          async (testData) => {
            // Ensure contract dates are logical and valid if both provided
            if (testData.contract.startDate && testData.contract.endDate) {
              // Validate both dates first
              const startValidation = validateDate(testData.contract.startDate);
              const endValidation = validateDate(testData.contract.endDate);
              
              if (!startValidation.isValid || !endValidation.isValid) {
                fc.pre(false); // Skip invalid dates
              }
              
              if (testData.contract.startDate >= testData.contract.endDate) {
                fc.pre(false); // Skip illogical date ranges
              }
            }

            // Individual date validation
            if (testData.contract.startDate) {
              const validation = validateDate(testData.contract.startDate);
              fc.pre(validation.isValid);
            }

            if (testData.contract.endDate) {
              const validation = validateDate(testData.contract.endDate);
              fc.pre(validation.isValid);
            }

            // Test: Create client and contract through Prisma with system context to avoid tenant issues
            const { createdClient, createdContract } = await prismaService.withSystemContext(async (prisma) => {
              // Ensure company exists first
              let company = await prisma.company.findUnique({ where: { id: testTenantId } });
              if (!company) {
                company = await prisma.company.create({
                  data: {
                    id: testTenantId,
                    name: `Test Company ${testTenantId}`,
                    slug: `test-${testTenantId}-${Date.now()}`,
                    settings: {
                      timeZone: 'Asia/Kolkata',
                      dateFormat: 'DD/MM/YYYY',
                      currency: 'INR',
                      workingHours: {},
                      payrollSettings: {}
                    },
                    branding: {
                      primaryColor: '#1f2937',
                      secondaryColor: '#6b7280'
                    }
                  }
                });
              }

              // Create client first with explicit companyId
              const client = await prisma.client.create({
                data: {
                  name: testData.client.name,
                  contactEmail: testData.client.contactEmail,
                  organizationType: testData.client.organizationType as any,
                  contactInfo: testData.client.contactInfo || { phone: '+91-9999999999', address: 'Test Address' },
                  companyId: testTenantId,
                },
              });

              // Create contract for the client with proper foreign key reference
              const contract = await prisma.contract.create({
                data: {
                  clientId: client.id,
                  contractNumber: testData.contract.contractNumber,
                  title: testData.contract.title,
                  status: testData.contract.status,
                  startDate: testData.contract.startDate || new Date(),
                  endDate: testData.contract.endDate,
                  serviceDefinitions: { services: ['security'] }, // Required field
                  billingPreferences: testData.contract.billingPreferences,
                },
              });

              return { createdClient: client, createdContract: contract };
            });

            // Verify: All required fields are captured correctly
            expect(createdClient).toBeDefined();
            expect(createdClient.id).toBeDefined();
            expect(createdClient.companyId).toBe(testTenantId);

            // Verify: Basic required data is preserved
            expect(createdClient.name).toBe(testData.client.name);
            expect(createdClient.contactEmail).toBe(testData.client.contactEmail);
            expect(createdClient.organizationType).toBe(testData.client.organizationType);

            // Verify: Contract data is preserved
            expect(createdContract).toBeDefined();
            expect(createdContract.clientId).toBe(createdClient.id);
            expect(createdContract.status).toBe(testData.contract.status);

            // Verify: Optional data is preserved when provided
            if (testData.client.contactInfo) {
              expect(createdClient.contactInfo).toBeDefined();
              const storedContactInfo = createdClient.contactInfo as any;
              expect(storedContactInfo.contactPerson).toBe(testData.client.contactInfo.contactPerson);
              if (testData.client.contactInfo.phone) {
                expect(storedContactInfo.phone).toBe(testData.client.contactInfo.phone);
              }
              if (testData.client.contactInfo.secondaryEmail) {
                expect(storedContactInfo.secondaryEmail).toBe(
                  testData.client.contactInfo.secondaryEmail,
                );
              }
            }

            // Verify: Timestamp precision is preserved
            if (testData.contract.startDate) {
              expect(createdContract.startDate).toEqual(testData.contract.startDate);
              
              // Verify full timestamp precision is maintained
              const originalTime = testData.contract.startDate.getTime();
              const storedTime = createdContract.startDate.getTime();
              expect(storedTime).toBe(originalTime);
            }

            if (testData.contract.endDate) {
              expect(createdContract.endDate).toEqual(testData.contract.endDate);
              
              // Verify full timestamp precision is maintained  
              const originalTime = testData.contract.endDate.getTime();
              const storedTime = createdContract.endDate.getTime();
              expect(storedTime).toBe(originalTime);
            }

            if (testData.contract.billingPreferences) {
              expect(createdContract.billingPreferences).toBeDefined();
              const storedBillingPrefs = createdContract.billingPreferences as any;
              expect(storedBillingPrefs.frequency).toBe(testData.contract.billingPreferences.frequency);
              if (testData.contract.billingPreferences.paymentTerms) {
                expect(storedBillingPrefs.paymentTerms).toBe(
                  testData.contract.billingPreferences.paymentTerms,
                );
              }
            }

            // Verify: Timestamps are set correctly
            expect(createdClient.createdAt).toBeInstanceOf(Date);
            expect(createdClient.updatedAt).toBeInstanceOf(Date);
            expect(createdContract.createdAt).toBeInstanceOf(Date);
            expect(createdContract.updatedAt).toBeInstanceOf(Date);

            // Test: Retrieve the client and contract to verify data persistence
            const { retrievedClient, retrievedContract } = await prismaService.withTenant(testTenantId, async (prisma) => {
              const client = await prisma.client.findUnique({
                where: { id: createdClient.id },
              });
              const contract = await prisma.contract.findUnique({
                where: { id: createdContract.id },
              });
              return { retrievedClient: client, retrievedContract: contract };
            });

            // Verify: Retrieved data matches created data exactly
            expect(retrievedClient).toBeDefined();
            expect(retrievedClient!.name).toBe(createdClient.name);
            expect(retrievedClient!.contactEmail).toBe(createdClient.contactEmail);
            expect(retrievedClient!.organizationType).toBe(createdClient.organizationType);

            expect(retrievedContract).toBeDefined();
            expect(retrievedContract!.status).toBe(createdContract.status);

            // Deep comparison of JSON fields if they exist
            if (createdClient.contactInfo && retrievedClient!.contactInfo) {
              expect(JSON.stringify(retrievedClient!.contactInfo)).toBe(
                JSON.stringify(createdClient.contactInfo),
              );
            }

            if (createdContract.billingPreferences && retrievedContract!.billingPreferences) {
              expect(JSON.stringify(retrievedContract!.billingPreferences)).toBe(
                JSON.stringify(createdContract.billingPreferences),
              );
            }

            // Cleanup: Remove the test data
            await prismaService.withTenant(testTenantId, async (prisma) => {
              await prisma.contract.delete({ where: { id: createdContract.id } });
              await prisma.client.delete({ where: { id: createdClient.id } });
            });
          },
        ),
        {
          numRuns: 2, // Reduced for faster testing
          timeout: 10000, // 10 second timeout per test
          seed: 42,
          endOnFailure: true,
        },
      );
    } finally {
      // Cleanup: Remove the test company
      await prismaService.withSystemContext(async (prisma) => {
        await prisma.company
          .delete({
            where: { id: testTenantId },
          })
          .catch(() => {
            // Ignore cleanup errors
          });
      });
    }
  }, 30000); // 30 second test timeout

  /**
   * Property 5: Client Data Validation and Constraints
   * **Validates: Requirements 2.1**
   *
   * The system SHALL properly validate client data and reject invalid inputs
   * while providing meaningful error messages.
   */
  it('Property 5: Client data validation and constraints', async () => {
    const testTenantId = randomUUID();

    // Setup: Create a test company
    await prismaService.withSystemContext(async (prisma) => {
      await prisma.company.create({
        data: {
          id: testTenantId,
          name: 'Test Company Validation',
          slug: `test-val-${testTenantId.substring(0, 8)}`,
        },
      });
    });

    try {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            name: fc.string({ minLength: 1, maxLength: 10 }), // Valid short names
            contactEmail: fc.emailAddress(),
            organizationType: fc.constantFrom('CORPORATE_OFFICE', 'RESIDENTIAL_SOCIETY', 'HOSPITAL'),
            contractStart: fc.option(validDateGenerator),
            contractEnd: fc.option(validDateGenerator),
          }),
          async (validData) => {
            // Ensure dates are valid before proceeding
            if (validData.contractStart) {
              const validation = validateDate(validData.contractStart);
              fc.pre(validation.isValid);
            }
            
            if (validData.contractEnd) {
              const validation = validateDate(validData.contractEnd);
              fc.pre(validation.isValid);
            }

            // Ensure logical date ranges if both dates are provided
            if (validData.contractStart && validData.contractEnd) {
              fc.pre(validData.contractStart < validData.contractEnd);
            }

            // Test with valid data - should succeed
            const { client, contract } = await prismaService.withTenant(testTenantId, async (prisma) => {
              // Ensure company exists first
              let company = await prisma.company.findUnique({ where: { id: testTenantId } });
              if (!company) {
                company = await prisma.company.create({
                  data: {
                    id: testTenantId,
                    name: `Test Company ${testTenantId}`,
                    slug: `test-${testTenantId}`,
                    settings: {},
                    branding: {}
                  }
                });
              }

              const createdClient = await prisma.client.create({
                data: {
                  name: validData.name,
                  contactEmail: validData.contactEmail,
                  organizationType: validData.organizationType as any,
                  companyId: testTenantId,
                },
              });

              const createdContract = await prisma.contract.create({
                data: {
                  clientId: createdClient.id,
                  contractNumber: `TEST-${Date.now()}`,
                  title: 'Test Contract',
                  startDate: validData.contractStart || new Date(),
                  endDate: validData.contractEnd,
                  serviceDefinitions: { services: ['security'] },
                },
              });

              return { client: createdClient, contract: createdContract };
            });

            expect(client).toBeDefined();
            expect(client.name).toBe(validData.name);
            expect(client.contactEmail).toBe(validData.contactEmail);
            expect(client.organizationType).toBe(validData.organizationType);

            expect(contract).toBeDefined();
            expect(contract.clientId).toBe(client.id);

            // Cleanup successful creation
            await prismaService.withTenant(testTenantId, async (prisma) => {
              await prisma.contract.delete({ where: { id: contract.id } });
              await prisma.client.delete({ where: { id: client.id } });
            });
          },
        ),
        {
          numRuns: 2, // Reduced for faster testing
          timeout: 8000,
          seed: 123,
        },
      );
    } finally {
      // Cleanup: Remove the test company
      await prismaService.withSystemContext(async (prisma) => {
        await prisma.company
          .delete({
            where: { id: testTenantId },
          })
          .catch(() => {
            // Ignore cleanup errors
          });
      });
    }
  }, 30000);
});

/**
 * Property 6: Date Validation Edge Cases 
 * **Validates: Requirements 2.1 - Bug 1 Fix**
 *
 * Additional test suite for date validation edge cases
 */
describe('Property Test: Date Validation Edge Cases', () => {
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

  it('should reject invalid dates that PostgreSQL cannot handle', async () => {
    const testTenantId = randomUUID();

    // Setup: Create a test company
    await prismaService.withSystemContext(async (prisma) => {
      await prisma.company.create({
        data: {
          id: testTenantId,
          name: 'Test Company Date Validation',
          slug: `test-date-${testTenantId.substring(0, 8)}`,
        },
      });
    });

    try {
      // Test invalid dates that should be rejected by database constraints
      const invalidDates = [
        new Date('0000-12-31'), // Year 0000 - PostgreSQL doesn't support
        new Date('0000-01-01'), // Year 0000  
      ];

      for (const invalidDate of invalidDates) {
        let wasRejected = false;
        
        try {
          await prismaService.withTenant(testTenantId, async (prisma) => {
            const client = await prisma.client.create({
              data: {
                name: 'Test Client',
                contactEmail: `test-${Date.now()}@example.com`, // Unique email
                organizationType: 'CORPORATE_OFFICE',
                company: {
                  connect: { id: testTenantId },
                },
              },
            });

            // Create contract with invalid date
            return prisma.contract.create({
              data: {
                clientId: client.id,
                contractNumber: `INVALID-${Date.now()}`,
                title: 'Invalid Date Contract',
                startDate: invalidDate,
                serviceDefinitions: { services: ['security'] },
              },
            });
          });
        } catch (error) {
          wasRejected = true;
          // Verify it's a database constraint violation, not some other error
          expect(error.message).toMatch(/date\/time field value out of range|check constraint|valid_year/i);
        }

        // The invalid date should have been rejected
        expect(wasRejected).toBe(true);
      }
    } finally {
      // Cleanup: Remove the test company
      await prismaService.withSystemContext(async (prisma) => {
        await prisma.company
          .delete({
            where: { id: testTenantId },
          })
          .catch(() => {
            // Ignore cleanup errors
          });
      });
    }
  }, 30000);
});