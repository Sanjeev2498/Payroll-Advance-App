/**
 * Test Data Factory
 * 
 * Creates test data in the correct dependency order to prevent foreign key constraint violations:
 * Company → Client → Contract → Site → Employee → Assignment → Shift → Attendance
 */

import { PrismaService } from '../../prisma/prisma.service';
import { 
  companies as Company, 
  clients as Client, 
  contracts as Contract, 
  sites as Site, 
  employees as Employee, 
  assignments as Assignment,
  ContractStatus,
  OperationalStatus,
  EmploymentStatus,
  AssignmentStatus
} from '@prisma/client';
import { randomUUID } from 'crypto';

export class TestDataFactory {
  // Performance optimization: Cache generated data patterns
  private static dataCache = new Map<string, any>();
  
  /**
   * Get cached data or generate new data if not cached
   */
  private static getCachedData<T>(key: string, generator: () => T): T {
    if (!this.dataCache.has(key)) {
      this.dataCache.set(key, generator());
    }
    return this.dataCache.get(key);
  }

  /**
   * Clear the data cache (call between tests for isolation)
   */
  static clearCache(): void {
    this.dataCache.clear();
  }

  constructor(private prisma: PrismaService) {}

  /**
   * Create a complete test hierarchy in the correct order
   */
  async createFullHierarchy() {
    const company = await this.createCompany();
    const client = await this.createClient(company.id);
    const contract = await this.createContract(client.id);
    const site = await this.createSite(contract.id, { client_id: client.id });
    const employee = await this.createEmployee(company.id);
    const assignment = await this.createAssignment(employee.id, site.id);

    return {
      company,
      client,
      contract,
      site,
      employee,
      assignment,
    };
  }

  /**
   * Company (Root entity - no dependencies)
   */
  async createCompany(overrides: Partial<Company> = {}): Promise<Company> {
    // FIXED: Always generate a proper UUID if not provided to prevent validation errors
    const companyId = overrides.id || randomUUID();
    
    const companyData = {
      id: companyId, // CRITICAL FIX: Ensure proper UUID is always provided
      name: 'Test Security Company',
      slug: `test-company-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`, // Add randomness to prevent duplicates
      // FIXED: Add required timestamp fields to prevent validation errors
      created_at: new Date(),
      updated_at: new Date(),
      settings: {
        timeZone: 'Asia/Kolkata',
        dateFormat: 'DD/MM/YYYY',
        currency: 'INR',
        workingHours: {
          monday: { start: '09:00', end: '18:00' },
          tuesday: { start: '09:00', end: '18:00' },
          wednesday: { start: '09:00', end: '18:00' },
          thursday: { start: '09:00', end: '18:00' },
          friday: { start: '09:00', end: '18:00' },
          saturday: { start: '09:00', end: '14:00' },
          sunday: { start: null, end: null }
        },
        payrollSettings: {
          payFrequency: 'monthly',
          overtimeThreshold: 40,
          overtimeRate: 1.5
        },
        attendanceSettings: {
          clockInGracePeriod: 15,
          clockOutGracePeriod: 15,
          requireLocation: true
        },
        notificationSettings: {
          emailEnabled: true,
          smsEnabled: false,
          pushEnabled: true
        }
      },
      branding: {
        primaryColor: '#1f2937',
        secondaryColor: '#6b7280',
        logo: 'https://example.com/logo.png',
        themes: {
          light: {
            background: '#ffffff',
            text: '#111827'
          },
          dark: {
            background: '#111827',
            text: '#f9fafb'
          }
        }
      },
      ...overrides,
    };

    // FIXED: Handle existing companies gracefully for unique constraint issues
    if (overrides.id) {
      try {
        // Check if company already exists
        const existing = await this.prisma.companies.findUnique({ 
          where: { id: overrides.id } 
        });
        if (existing) {
          return existing as Company;
        }
      } catch (error) {
        // Continue to create if findUnique fails (might be mocked)
      }
    }

    // FIXED: Try system context first, then fall back to regular creation
    try {
      // Check if withSystemContext method exists (for real PrismaService)
      if (this.prisma.withSystemContext && typeof this.prisma.withSystemContext === 'function') {
        return await this.prisma.withSystemContext(async (systemPrisma) => {
          return await systemPrisma.companies.create({
            data: companyData,
          });
        });
      }
    } catch (error) {
      // Continue to fallback
    }

    try {
      // Fallback for regular PrismaService
      return await this.prisma.companies.create({
        data: companyData,
      });
    } catch (error) {
      // Final fallback: if service is mocked, use mock methods directly
      if (this.prisma.companies && this.prisma.companies.create && typeof this.prisma.companies.create === 'function') {
        return this.prisma.companies.create({ data: companyData });
      }
      throw error;
    }
  }

  /**
   * Client (Depends on: Company)
   */
  async createClient(companyId: string, overrides: Partial<Client> = {}): Promise<Client> {
    // FIXED: Always generate a proper UUID if not provided to prevent validation errors
    const clientId = overrides.id || randomUUID();
    
    const clientData = {
      id: clientId, // CRITICAL FIX: Ensure proper UUID is always provided
      company_id: companyId, // CRITICAL FIX: Use correct field name from schema
      name: 'Test Client Organization',
      contact_email: `client-${Date.now()}@example.com`,
      contact_info: {
        phone: '+91-9876543210',
        address: '123 Business District, Mumbai, India',
      },
      organization_type: 'CORPORATE_OFFICE' as any,
      industry: 'Technology',
      company_size: '500-1000',
      contract_status: ContractStatus.ACTIVE, // CRITICAL FIX: Use enum value
      contract_start: new Date(),
      contract_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      billing_preferences: {
        cycle: 'monthly',
        terms: 'NET-30',
        currency: 'INR',
      },
      tags: ['high-priority', 'tech-client'],
      // FIXED: Add required timestamp fields
      created_at: new Date(),
      updated_at: new Date(),
      ...overrides,
    };

    return await this.prisma.clients.create({
      data: clientData,
    });
  }

  /**
   * Contract (Depends on: Client)
   */
  async createContract(clientId: string, overrides: Partial<Contract> = {}): Promise<Contract> {
    // FIXED: Always generate a proper UUID if not provided to prevent validation errors
    const contractId = overrides.id || randomUUID();
    
    const contractData = {
      id: contractId, // CRITICAL FIX: Ensure proper UUID is always provided
      client_id: clientId, // CRITICAL FIX: Use correct field name from schema
      contract_number: `CT-${Date.now()}`,
      title: 'Security Services Agreement',
      description: 'Comprehensive security services for corporate premises',
      status: ContractStatus.ACTIVE,
      start_date: new Date(),
      end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
      service_definitions: {
        services: ['Physical Security', 'Access Control', 'CCTV Monitoring'],
        coverage: '24x7',
        responseTime: '< 5 minutes',
      },
      billing_preferences: {
        cycle: 'monthly',
        terms: 'NET-30',
        currency: 'INR',
      },
      contract_value: 2400000.00, // 24 lakhs annually
      // FIXED: Add required timestamp fields
      created_at: new Date(),
      updated_at: new Date(),
      ...overrides,
    };

    return await this.prisma.contracts.create({
      data: contractData,
    });
  }

  /**
   * Site (Depends on: Contract)
   */
  async createSite(contractId: string, overrides: Partial<Site> = {}): Promise<Site> {
    // FIXED: Always generate a proper UUID if not provided to prevent validation errors
    const siteId = overrides.id || randomUUID();
    
    // Get the client_id from the contract
    let clientId = overrides.client_id;
    if (!clientId) {
      try {
        const contract = await this.prisma.contracts.findUnique({
          where: { id: contractId },
          select: { client_id: true }
        });
        clientId = contract?.client_id;
      } catch (error) {
        // If we can't fetch the contract, use a fallback or require explicit client_id
        throw new Error(`Unable to determine client_id for site. Contract ${contractId} not found or client_id must be provided explicitly.`);
      }
    }
    
    const siteData = {
      id: siteId, // CRITICAL FIX: Ensure proper UUID is always provided
      contract_id: contractId, // CRITICAL FIX: Use correct field name from schema
      client_id: clientId, // CRITICAL FIX: Sites need client_id according to schema
      name: 'Main Office Building',
      address: {
        building: 'Corporate Tower A',
        street: '123 Business Park',
        area: 'Bandra Kurla Complex',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400051',
        country: 'India',
        coordinates: {
          latitude: 19.0596,
          longitude: 72.8295,
        },
      },
      access_requirements: {
        securityClearance: 'Level 2',
        idCardRequired: true,
        visitorRegistration: true,
        restrictions: ['No photography', 'Visitor escort required'],
      },
      safety_protocols: {
        emergencyExits: 4,
        fireExtinguishers: 12,
        firstAidKits: 3,
        emergencyContacts: {
          fire: '101',
          police: '100',
          ambulance: '108',
        },
      },
      operational_status: OperationalStatus.ACTIVE,
      contact_info: {
        siteManager: 'John Doe',
        phone: '+91-9876543211',
        email: 'site.manager@client.com',
      },
      min_staffing_level: 2,
      max_staffing_level: 6,
      // FIXED: Add required timestamp fields
      created_at: new Date(),
      updated_at: new Date(),
      ...overrides,
    };

    return await this.prisma.sites.create({
      data: siteData,
    });
  }

  /**
   * Employee (Depends on: Company)
   */
  async createEmployee(companyId: string, overrides: Partial<Employee> = {}): Promise<Employee> {
    // FIXED: Always generate proper UUIDs if not provided 
    const employeeId = overrides.id || randomUUID();
    const employeeNumber = overrides.employee_number || `EMP-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    // Ensure company exists before creating employee
    let company;
    try {
      company = await this.prisma.companies.findUnique({ where: { id: companyId } });
      if (!company) {
        company = await this.prisma.companies.create({
          data: {
            id: companyId,
            name: `Test Company ${companyId}`,
            slug: `test-${companyId.substring(0, 8)}`,
            // FIXED: Add required timestamp fields
            created_at: new Date(),
            updated_at: new Date(),
            settings: {},
            branding: {}
          }
        });
      }
    } catch (error) {
      // Ignore if mocked - company will be handled by mock
    }
    
    // CRITICAL FIX: Clean overrides to remove conflicting field names
    // Remove any camelCase field names from overrides to prevent "Unknown argument" errors
    const cleanOverrides = { ...overrides };
    delete cleanOverrides['employeeNumber'];
    delete cleanOverrides['firstName'];  
    delete cleanOverrides['lastName'];
    delete cleanOverrides['employmentStatus'];
    delete cleanOverrides['hireDate'];
    delete cleanOverrides['metadata']; // Remove any metadata that might cause conflicts
    
    const employeeData = {
      id: employeeId, // CRITICAL FIX: Ensure proper UUID is always provided
      company_id: companyId, // CRITICAL FIX: Use correct field name from schema
      employee_number: employeeNumber, // CRITICAL FIX: Use correct field name from schema
      first_name: 'Rajesh', // CRITICAL FIX: Use correct field name from schema
      last_name: 'Kumar', // CRITICAL FIX: Use correct field name from schema
      email: `${employeeNumber.toLowerCase()}@company.com`,
      phone: '+91-9876543212',
      // FIXED: Add required timestamp fields to prevent validation errors
      created_at: new Date(),
      updated_at: new Date(),
      address: {
        building: 'A-101, Shanti Apartments',
        street: 'MG Road',
        area: 'Andheri West',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400053',
        country: 'India',
      },
      // Encrypt sensitive fields (in real implementation)
      certifications: {
        securityTraining: {
          issued: '2023-01-15',
          expires: '2025-01-15',
          authority: 'Security Training Institute',
        },
        firstAid: {
          issued: '2023-06-01',
          expires: '2025-06-01',
          authority: 'Red Cross Society',
        },
      },
      skills: ['Security', 'Access Control', 'CCTV Monitoring', 'First Aid'],
      employment_status: EmploymentStatus.ACTIVE, // CRITICAL FIX: Use correct field name from schema
      hire_date: new Date('2023-01-01'), // CRITICAL FIX: Use correct field name from schema
      ...cleanOverrides, // Use cleaned overrides without conflicting field names
    };

    // FIXED: Try system context first, then fall back to regular creation
    try {
      // Check if withSystemContext method exists (for real PrismaService)
      if (this.prisma.withSystemContext && typeof this.prisma.withSystemContext === 'function') {
        return await this.prisma.withSystemContext(async (systemPrisma) => {
          return await systemPrisma.employees.create({
            data: employeeData,
          });
        });
      }
    } catch (error) {
      // Continue to fallback
    }

    try {
      // Fallback for regular PrismaService - handle both singular and plural model names
      if (this.prisma.employees && typeof this.prisma.employees.create === 'function') {
        return await this.prisma.employees.create({
          data: employeeData,
        });
      } else if (this.prisma.employee && typeof this.prisma.employee.create === 'function') {
        return await this.prisma.employee.create({
          data: employeeData,
        });
      }
    } catch (error) {
      console.warn('Primary fallback failed:', (error as any).message);
    }

    // Final fallback: if service is mocked, try accessing models via proxy
    try {
      if (this.prisma && typeof this.prisma === 'object') {
        // For mocked services, the create method might be directly available
        const employeeModel = this.prisma.employees || this.prisma.employee;
        if (employeeModel && typeof employeeModel.create === 'function') {
          return await employeeModel.create({ data: employeeData });
        }
      }
      throw new Error('Unable to access employee model create method');
    } catch (error) {
      throw new Error(`Employee creation failed: ${(error as Error).message}. PrismaService methods available: ${Object.getOwnPropertyNames(this.prisma).join(', ')}`);
    }
  }

  /**
   * Assignment (Depends on: Employee, Site)
   */
  async createAssignment(
    employeeId: string, 
    siteId: string, 
    overrides: Partial<Assignment> = {}
  ): Promise<Assignment> {
    // FIXED: Always generate a proper UUID if not provided to prevent validation errors
    const assignmentId = overrides.id || randomUUID();
    
    const assignmentData = {
      id: assignmentId, // CRITICAL FIX: Ensure proper UUID is always provided
      employee_id: employeeId, // CRITICAL FIX: Use correct field name from schema
      site_id: siteId, // CRITICAL FIX: Use correct field name from schema
      role: 'Security Guard',
      responsibilities: {
        primary: ['Perimeter Security', 'Access Control'],
        secondary: ['Visitor Management', 'Incident Reporting'],
        reporting: {
          frequency: 'daily',
          format: 'digital',
        },
      },
      hourly_rate: '800.00', // CRITICAL FIX: Use string format as required by schema with encryption
      hourly_rate_iv: 'mock_iv_string_32_characters', // CRITICAL FIX: Add required encryption fields
      hourly_rate_tag: 'mock_tag_string_32_characters', // CRITICAL FIX: Add required encryption fields
      status: AssignmentStatus.ACTIVE,
      start_date: new Date(), // CRITICAL FIX: Use correct field name from schema
      end_date: null,
      // FIXED: Add required timestamp fields
      created_at: new Date(),
      updated_at: new Date(),
      ...overrides,
    };

    return await this.prisma.assignments.create({
      data: assignmentData,
    });
  }

  /**
   * Create multiple entities of the same type
   */
  async createMultipleEmployees(companyId: string, count: number): Promise<Employee[]> {
    const employees: Employee[] = [];
    for (let i = 0; i < count; i++) {
      const employee = await this.createEmployee(companyId, {
        employee_number: `EMP-${Date.now()}-${i}`, // CRITICAL FIX: Use correct field name
        first_name: `Employee${i}`, // CRITICAL FIX: Use correct field name  
        last_name: `Test${i}`, // CRITICAL FIX: Use correct field name
        email: `employee${i}@company.com`,
      });
      employees.push(employee);
    }
    return employees;
  }

  async createMultipleSites(contractId: string, count: number, clientId?: string): Promise<Site[]> {
    const sites: Site[] = [];
    for (let i = 0; i < count; i++) {
      const site = await this.createSite(contractId, {
        name: `Site ${i + 1}`,
        client_id: clientId,
      });
      sites.push(site);
    }
    return sites;
  }

  /**
   * Clean up all test data for a company
   */
  async cleanupCompanyData(companyId: string): Promise<void> {
    try {
      // Delete in reverse dependency order, handle missing tables gracefully
      
      // Clean up assignments (if table exists)
      try {
        await this.prisma.assignments.deleteMany({ 
          where: { 
            employees: { company_id: companyId }
          } 
        });
      } catch (error) {
        // Ignore if assignments table doesn't exist
      }
      
      // Clean up employees
      try {
        await this.prisma.employees.deleteMany({ 
          where: { company_id: companyId } 
        });
      } catch (error) {
        // Ignore if employees table doesn't exist
      }
      
      // Clean up sites (if contracts table exists)
      try {
        await this.prisma.sites.deleteMany({ 
          where: { 
            contracts: { 
              clients: { company_id: companyId } 
            } 
          } 
        });
      } catch (error) {
        // Ignore if sites/contracts table doesn't exist
      }
      
      // Clean up contracts (if table exists)
      try {
        await this.prisma.contracts.deleteMany({ 
          where: { 
            clients: { company_id: companyId } 
          } 
        });
      } catch (error) {
        // Ignore if contracts table doesn't exist
      }
      
      // Clean up clients
      try {
        await this.prisma.clients.deleteMany({ 
          where: { company_id: companyId } 
        });
      } catch (error) {
        // Ignore if clients table doesn't exist
      }
      
      // Clean up company
      try {
        await this.prisma.companies.delete({ 
          where: { id: companyId } 
        });
      } catch (error) {
        // Ignore if company doesn't exist or already deleted
      }
    } catch (error) {
      // Ignore all cleanup errors
    }
  }

  /**
   * Generate random test data for property-based testing
   */
  generateRandomEmployeeData() {
    const employeeNumber = `EMP-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    return {
      employee_number: employeeNumber, // CRITICAL FIX: Use correct field name
      first_name: `Test${Math.random().toString(36).substring(2, 5)}`, // CRITICAL FIX: Use correct field name
      last_name: `User${Math.random().toString(36).substring(2, 5)}`, // CRITICAL FIX: Use correct field name
      email: `${employeeNumber.toLowerCase()}@example.com`,
      phone: `+91-98765${Math.floor(Math.random() * 99999).toString().padStart(5, '0')}`,
      skills: this.getRandomSkills(),
      hire_date: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000), // CRITICAL FIX: Use correct field name
    };
  }

  private getRandomSkills(): string[] {
    const allSkills = [
      'Security', 'Access Control', 'CCTV Monitoring', 'First Aid', 
      'Fire Safety', 'Emergency Response', 'Patrol', 'Surveillance',
      'Customer Service', 'Communication'
    ];
    const skillCount = Math.floor(Math.random() * 4) + 1; // 1-4 skills
    return allSkills.sort(() => 0.5 - Math.random()).slice(0, skillCount);
  }
}