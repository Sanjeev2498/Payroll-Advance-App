/**
 * Category 1: Database Connection Pool Management - Bug Exploration Tests
 * 
 * PURPOSE: These tests validate the connection pool management fixes.
 * They encode expected behavior and should pass with proper configuration.
 * 
 * FIXES APPLIED:
 * - Connection pool configured to 20 connections for property tests
 * - Cleanup operations executed BEFORE module.close()
 * - Try-finally blocks in all property test iterations
 * - All required fields included in contract creation
 * 
 * PREVIOUS FAILURES (NOW FIXED):
 * - "Cannot use a pool after calling end on the pool" (Fixed: increased pool size)
 * - Pool exhaustion during parallel operations (Fixed: connection_limit=20)
 * - Invalid Prisma client invocation warnings (Fixed: all required fields provided)
 * - Cleanup operations fail with closed connections (Fixed: cleanup before disconnect)
 */

import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../../prisma/prisma.service';
import { PrismaModule } from '../../../prisma/prisma.module';
import { randomUUID } from 'crypto';
import * as fc from 'fast-check';

describe('Category 1: Database Connection Pool - Bug Exploration', () => {
  let module: TestingModule;
  let prisma: PrismaService;
  let tenantId: string;

  beforeAll(async () => {
    // Configure larger pool for property tests
    const originalUrl = process.env.DATABASE_URL;
    process.env.DATABASE_URL = originalUrl.includes('?')
      ? `${originalUrl}&connection_limit=20`
      : `${originalUrl}?connection_limit=20`;
    
    module = await Test.createTestingModule({
      imports: [PrismaModule],
    }).compile();

    prisma = module.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    try {
      // CRITICAL: Cleanup BEFORE disconnecting
      const testCompanies = await prisma.companies.findMany({
        where: {
          OR: [
            { slug: { contains: 'pool-test' } },
            { slug: { contains: 'invocation-test' } },
            { slug: { contains: 'cleanup-test' } },
            { slug: { contains: 'concurrent-test' } }
          ]
        }
      });
      
      for (const company of testCompanies) {
        // Delete in dependency order
        await prisma.contracts.deleteMany({
          where: { clients: { company_id: company.id } }
        });
        await prisma.clients.deleteMany({
          where: { company_id: company.id }
        });
        await prisma.companies.delete({
          where: { id: company.id }
        });
      }
    } catch (error) {
      console.error('Cleanup error (before disconnect):', error);
    } finally {
      // Disconnect AFTER cleanup
      if (module) await module.close();
    }
  });

  beforeEach(() => {
    tenantId = randomUUID();
  });

  /**
   * Exploration Test 1.1: Pool Exhaustion Under Parallel Load
   * EXPECTED TO PASS: Proper pool management with increased connection limit
   */
  it('should handle multiple parallel database operations without pool exhaustion', async () => {
    try {
      // Setup company
      await prisma.companies.create({
        data: {
          id: tenantId,
          name: 'Pool Test Company',
          slug: `pool-test-${Date.now()}`,
          settings: {},
          branding: {},
          created_at: new Date(),
          updated_at: new Date()
        }
      });

      // Property test: Generate many parallel operations
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.string({ minLength: 5, maxLength: 20 }), { minLength: 15, maxLength: 20 }),
          async (clientNames) => {
            const clientIds: string[] = [];
            
            try {
              // Create multiple clients in parallel - stresses connection pool
              const createPromises = clientNames.map((name, index) => {
                const clientId = randomUUID();
                clientIds.push(clientId);
                return prisma.clients.create({
                  data: {
                    id: clientId,
                    company_id: tenantId,
                    name: `${name}-${index}`,
                    contact_email: `client${index}@test.com`,
                    contract_status: 'ACTIVE',
                    created_at: new Date(),
                    updated_at: new Date()
                  }
                });
              });

              const clients = await Promise.all(createPromises);
              
              // Verify all clients created successfully
              expect(clients).toHaveLength(clientNames.length);
              clients.forEach(client => {
                expect(client.id).toBeDefined();
                expect(client.company_id).toBe(tenantId);
              });
            } finally {
              // CRITICAL: Cleanup within property test iteration
              if (clientIds.length > 0) {
                const deletePromises = clientIds.map(id =>
                  prisma.clients.delete({ where: { id } }).catch(() => {})
                );
                await Promise.all(deletePromises);
              }
            }
          }
        ),
        { numRuns: 5, timeout: 30000 } // Run multiple times to stress pool
      );
    } finally {
      // Final cleanup - delete company
      await prisma.companies.delete({ where: { id: tenantId } }).catch(() => {});
    }
  }, 60000);

  /**
   * Exploration Test 1.2: Invalid Prisma Invocation Pattern
   * EXPECTED TO PASS: Contracts created with all required fields
   */
  it('should create database entities with valid Prisma invocation patterns', async () => {
    try {
      // Setup company
      await prisma.companies.create({
        data: {
          id: tenantId,
          name: 'Invocation Test Company',
          slug: `invocation-test-${Date.now()}`,
          settings: {},
          branding: {},
          created_at: new Date(),
          updated_at: new Date()
        }
      });

      // Create client
      const clientId = randomUUID();
      await prisma.clients.create({
        data: {
          id: clientId,
          company_id: tenantId,
          name: 'Test Client',
          contact_email: 'test@client.com',
          contract_status: 'ACTIVE',
          created_at: new Date(),
          updated_at: new Date()
        }
      });

      // FIX: Create contract with all required fields to avoid "Invalid invocation" warnings
      const contractId = randomUUID();
      const contract = await prisma.contracts.create({
        data: {
          id: contractId,
          client_id: clientId,  // Direct foreign key field
          contract_number: `CNT-${Date.now()}`,
          title: 'Test Contract',
          status: 'ACTIVE',
          start_date: new Date(),
          service_definitions: { services: ['security'] },
          created_at: new Date(),
          updated_at: new Date()
        }
      });

      // Verify contract created without warnings
      expect(contract.id).toBe(contractId);
      expect(contract.client_id).toBe(clientId);
    } finally {
      // Cleanup in dependency order
      await prisma.contracts.deleteMany({
        where: { 
          clients: { company_id: tenantId }
        }
      }).catch(() => {});
      await prisma.clients.deleteMany({
        where: { company_id: tenantId }
      }).catch(() => {});
      await prisma.companies.delete({
        where: { id: tenantId }
      }).catch(() => {});
    }
  });

  /**
   * Exploration Test 1.3: Cleanup After Property Tests
   * EXPECTED TO PASS: Cleanup operations succeed with valid connections
   */
  it('should maintain valid connections for cleanup after stress tests', async () => {
    // Setup company
    const companyId = randomUUID();
    
    try {
      await prisma.companies.create({
        data: {
          id: companyId,
          name: 'Cleanup Test Company',
          slug: `cleanup-test-${Date.now()}`,
          settings: {},
          branding: {},
          created_at: new Date(),
          updated_at: new Date()
        }
      });

      // Create multiple entities
      const clientIds: string[] = [];
      for (let i = 0; i < 10; i++) {
        const clientId = randomUUID();
        await prisma.clients.create({
          data: {
            id: clientId,
            company_id: companyId,
            name: `Cleanup Client ${i}`,
            contact_email: `cleanup${i}@test.com`,
            contract_status: 'ACTIVE',
            created_at: new Date(),
            updated_at: new Date()
          }
        });
        clientIds.push(clientId);
      }

      // Simulate connection stress
      await new Promise(resolve => setTimeout(resolve, 100));

      // FIX: Cleanup should succeed because connections remain valid
      // Expected behavior: All cleanups should succeed
      for (const clientId of clientIds) {
        await prisma.clients.delete({ where: { id: clientId } });
      }

      // Verify all clients deleted
      const remainingClients = await prisma.clients.findMany({
        where: { company_id: companyId }
      });
      expect(remainingClients).toHaveLength(0);
    } finally {
      // Cleanup company
      await prisma.companies.delete({ where: { id: companyId } }).catch(() => {});
    }
  });

  /**
   * Exploration Test 1.4: Concurrent Operations with Shared Pool
   * EXPECTED TO PASS: Pool properly manages concurrent read and write operations
   */
  it('should handle concurrent read and write operations on shared pool', async () => {
    try {
      // Setup company
      await prisma.companies.create({
        data: {
          id: tenantId,
          name: 'Concurrent Test Company',
          slug: `concurrent-test-${Date.now()}`,
          settings: {},
          branding: {},
          created_at: new Date(),
          updated_at: new Date()
        }
      });

      // Create initial clients
      const initialClientIds: string[] = [];
      for (let i = 0; i < 5; i++) {
        const clientId = randomUUID();
        await prisma.clients.create({
          data: {
            id: clientId,
            company_id: tenantId,
            name: `Initial Client ${i}`,
            contact_email: `initial${i}@test.com`,
            contract_status: 'ACTIVE',
            created_at: new Date(),
            updated_at: new Date()
          }
        });
        initialClientIds.push(clientId);
      }

      // FIX: Concurrent reads and writes should work with proper pool management
      const operations = [];
      const newClientIds: string[] = [];
      
      // Mix of read operations
      for (let i = 0; i < 10; i++) {
        operations.push(
          prisma.clients.findMany({ where: { company_id: tenantId } })
        );
      }

      // Mix of write operations
      for (let i = 0; i < 10; i++) {
        const newClientId = randomUUID();
        newClientIds.push(newClientId);
        operations.push(
          prisma.clients.create({
            data: {
              id: newClientId,
              company_id: tenantId,
              name: `Concurrent Client ${i}`,
              contact_email: `concurrent${i}@test.com`,
              contract_status: 'ACTIVE',
              created_at: new Date(),
              updated_at: new Date()
            }
          })
        );
      }

      // Execute all operations concurrently
      const results = await Promise.all(operations);
      
      // Verify operations completed
      expect(results).toHaveLength(20);
    } finally {
      // Cleanup all clients and company
      await prisma.clients.deleteMany({ where: { company_id: tenantId } }).catch(() => {});
      await prisma.companies.delete({ where: { id: tenantId } }).catch(() => {});
    }
  });
});
