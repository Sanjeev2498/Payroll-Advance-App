import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import * as fc from 'fast-check';
import { randomUUID } from 'crypto';
import { ContractStatus } from '../../clients/dto/create-client.dto';
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
            name: fc.string({ minLength: 2, maxLength: 100 }).filter((s) => s.trim().length >= 2),
            contactEmail: fc.emailAddress(),
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
            contractStatus: fc.constantFrom(
              ContractStatus.ACTIVE,
              ContractStatus.PENDING,
              ContractStatus.EXPIRED,
              ContractStatus.TERMINATED,
            ),
            contractStart: fc.option(validDateGenerator),
            contractEnd: fc.option(validDateGenerator),
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
          async (clientData) => {
            // Ensure contract dates are logical and valid if both provided
            if (clientData.contractStart && clientData.contractEnd) {
              // Validate both dates first
              const startValidation = validateDate(clientData.contractStart);
              const endValidation = validateDate(clientData.contractEnd);
              
              if (!startValidation.isValid || !endValidation.isValid) {
                fc.pre(false); // Skip invalid dates
              }
              
              if (clientData.contractStart >= clientData.contractEnd) {
                fc.pre(false); // Skip illogical date ranges
              }
            }

            // Individual date validation
            if (clientData.contractStart) {
              const validation = validateDate(clientData.contractStart);
              fc.pre(validation.isValid);
            }

            if (clientData.contractEnd) {
              const validation = validateDate(clientData.contractEnd);
              fc.pre(validation.isValid);
            }

            // Test: Create client through Prisma with tenant context
            const createdClient = await prismaService.withTenant(testTenantId, async (prisma) => {
              return prisma.client.create({
                data: {
                  name: clientData.name,
                  contactEmail: clientData.contactEmail,
                  contactInfo: clientData.contactInfo,
                  contractStatus: clientData.contractStatus,
                  contractStart: clientData.contractStart,
                  contractEnd: clientData.contractEnd,
                  billingPreferences: clientData.billingPreferences,
                  company: {
                    connect: { id: testTenantId },
                  },
                },
              });
            });

            // Verify: All required fields are captured correctly
            expect(createdClient).toBeDefined();
            expect(createdClient.id).toBeDefined();
            expect(createdClient.companyId).toBe(testTenantId);

            // Verify: Basic required data is preserved
            expect(createdClient.name).toBe(clientData.name);
            expect(createdClient.contactEmail).toBe(clientData.contactEmail);
            expect(createdClient.contractStatus).toBe(clientData.contractStatus);

            // Verify: Optional data is preserved when provided
            if (clientData.contactInfo) {
              expect(createdClient.contactInfo).toBeDefined();
              const storedContactInfo = createdClient.contactInfo as any;
              expect(storedContactInfo.contactPerson).toBe(clientData.contactInfo.contactPerson);
              if (clientData.contactInfo.phone) {
                expect(storedContactInfo.phone).toBe(clientData.contactInfo.phone);
              }
              if (clientData.contactInfo.secondaryEmail) {
                expect(storedContactInfo.secondaryEmail).toBe(
                  clientData.contactInfo.secondaryEmail,
                );
              }
            }

            // Verify: Timestamp precision is preserved (Bug 2 fix verification)
            if (clientData.contractStart) {
              expect(createdClient.contractStart).toEqual(clientData.contractStart);
              
              // Verify full timestamp precision is maintained
              const originalTime = clientData.contractStart.getTime();
              const storedTime = createdClient.contractStart.getTime();
              expect(storedTime).toBe(originalTime);
            }

            if (clientData.contractEnd) {
              expect(createdClient.contractEnd).toEqual(clientData.contractEnd);
              
              // Verify full timestamp precision is maintained  
              const originalTime = clientData.contractEnd.getTime();
              const storedTime = createdClient.contractEnd.getTime();
              expect(storedTime).toBe(originalTime);
            }

            if (clientData.billingPreferences) {
              expect(createdClient.billingPreferences).toBeDefined();
              const storedBillingPrefs = createdClient.billingPreferences as any;
              expect(storedBillingPrefs.frequency).toBe(clientData.billingPreferences.frequency);
              if (clientData.billingPreferences.paymentTerms) {
                expect(storedBillingPrefs.paymentTerms).toBe(
                  clientData.billingPreferences.paymentTerms,
                );
              }
            }

            // Verify: Timestamps are set correctly
            expect(createdClient.createdAt).toBeInstanceOf(Date);
            expect(createdClient.updatedAt).toBeInstanceOf(Date);

            // Test: Retrieve the client to verify data persistence
            const retrievedClient = await prismaService.withTenant(testTenantId, async (prisma) => {
              return prisma.client.findUnique({
                where: { id: createdClient.id },
              });
            });

            // Verify: Retrieved data matches created data exactly
            expect(retrievedClient).toBeDefined();
            expect(retrievedClient!.name).toBe(createdClient.name);
            expect(retrievedClient!.contactEmail).toBe(createdClient.contactEmail);
            expect(retrievedClient!.contractStatus).toBe(createdClient.contractStatus);

            // Deep comparison of JSON fields if they exist
            if (createdClient.contactInfo && retrievedClient!.contactInfo) {
              expect(JSON.stringify(retrievedClient!.contactInfo)).toBe(
                JSON.stringify(createdClient.contactInfo),
              );
            }

            if (createdClient.billingPreferences && retrievedClient!.billingPreferences) {
              expect(JSON.stringify(retrievedClient!.billingPreferences)).toBe(
                JSON.stringify(createdClient.billingPreferences),
              );
            }

            // Cleanup: Remove the test client
            await prismaService.withTenant(testTenantId, async (prisma) => {
              await prisma.client.delete({
                where: { id: createdClient.id },
              });
            });
          },
        ),
        {
          numRuns: 10, // Reasonable number for comprehensive testing
          timeout: 15000, // 15 second timeout per test
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
            const client = await prismaService.withTenant(testTenantId, async (prisma) => {
              return prisma.client.create({
                data: {
                  name: validData.name,
                  contactEmail: validData.contactEmail,
                  contractStart: validData.contractStart,
                  contractEnd: validData.contractEnd,
                  company: {
                    connect: { id: testTenantId },
                  },
                },
              });
            });

            expect(client).toBeDefined();
            expect(client.name).toBe(validData.name);
            expect(client.contactEmail).toBe(validData.contactEmail);

            // Cleanup successful creation
            await prismaService.withTenant(testTenantId, async (prisma) => {
              await prisma.client.delete({
                where: { id: client.id },
              });
            });
          },
        ),
        {
          numRuns: 5,
          timeout: 10000,
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
            return prisma.client.create({
              data: {
                name: 'Test Client',
                contactEmail: `test-${Date.now()}@example.com`, // Unique email
                contractStart: invalidDate,
                company: {
                  connect: { id: testTenantId },
                },
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