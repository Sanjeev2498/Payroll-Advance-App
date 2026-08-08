/**
 * Test Data Factory
 * 
 * Creates test data in the correct dependency order to prevent foreign key constraint violations:
 * Company → Client → Contract → Site → Employee → Assignment → Shift → Attendance
 */

import { PrismaService } from '../../prisma/prisma.service';
import { 
  Company, 
  Client, 
  Contract, 
  Site, 
  Employee, 
  Assignment,
  ContractStatus,
  OperationalStatus,
  EmploymentStatus,
  AssignmentStatus
} from '@prisma/client';

export class TestDataFactory {
  constructor(private prisma: PrismaService) {}

  /**
   * Create a complete test hierarchy in the correct order
   */
  async createFullHierarchy() {
    const company = await this.createCompany();
    const client = await this.createClient(company.id);
    const contract = await this.createContract(client.id);
    const site = await this.createSite(contract.id);
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
    const companyData = {
      name: 'Test Security Company',
      slug: `test-company-${Date.now()}`,
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

    // Use direct Prisma call for company creation to bypass tenant restrictions
    try {
      return await this.prisma.company.create({
        data: companyData,
      });
    } catch (error) {
      // If withSystemContext method doesn't exist, use direct creation
      return await this.prisma.company.create({
        data: companyData,
      });
    }
  }

  /**
   * Client (Depends on: Company)
   */
  async createClient(companyId: string, overrides: Partial<Client> = {}): Promise<Client> {
    const clientData = {
      companyId,
      name: 'Test Client Organization',
      contactEmail: `client-${Date.now()}@example.com`,
      contactInfo: {
        phone: '+91-9876543210',
        address: '123 Business District, Mumbai, India',
      },
      organizationType: 'CORPORATE_OFFICE' as any,
      industry: 'Technology',
      companySize: '500-1000',
      documentRequirements: {
        idProof: true,
        addressProof: true,
        backgroundCheck: true,
      },
      onboardingChecklist: {
        orientation: false,
        uniformIssued: false,
        accessCardIssued: false,
      },
      tags: ['high-priority', 'tech-client'],
      performanceMetrics: {
        satisfactionScore: 4.5,
        responseTime: '< 15 minutes',
      },
      relationshipNotes: 'Premium client with 24/7 security requirements',
      ...overrides,
    };

    return await this.prisma.client.create({
      data: clientData,
    });
  }

  /**
   * Contract (Depends on: Client)
   */
  async createContract(clientId: string, overrides: Partial<Contract> = {}): Promise<Contract> {
    const contractData = {
      clientId,
      contractNumber: `CT-${Date.now()}`,
      title: 'Security Services Agreement',
      description: 'Comprehensive security services for corporate premises',
      status: ContractStatus.ACTIVE,
      startDate: new Date(),
      endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
      serviceDefinitions: {
        services: ['Physical Security', 'Access Control', 'CCTV Monitoring'],
        coverage: '24x7',
        responseTime: '< 5 minutes',
      },
      serviceLevelAgreement: {
        uptime: '99.9%',
        responseTime: '< 5 minutes',
        escalationMatrix: {
          level1: 'Site Supervisor',
          level2: 'Security Manager',
          level3: 'Operations Head',
        },
      },
      billingPreferences: {
        cycle: 'monthly',
        terms: 'NET-30',
        currency: 'INR',
      },
      defaultBillingRates: {
        securityGuard: 800.00,
        supervisor: 1200.00,
        manager: 2000.00,
      },
      renewalNotificationDays: 90,
      autoRenewalEnabled: false,
      contractValue: 2400000.00, // 24 lakhs annually
      paymentTerms: {
        advancePayment: 25,
        installments: 12,
        lateFee: 2,
      },
      ...overrides,
    };

    return await this.prisma.contract.create({
      data: contractData,
    });
  }

  /**
   * Site (Depends on: Contract)
   */
  async createSite(contractId: string, overrides: Partial<Site> = {}): Promise<Site> {
    const siteData = {
      contractId,
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
      accessRequirements: {
        securityClearance: 'Level 2',
        idCardRequired: true,
        visitorRegistration: true,
        restrictions: ['No photography', 'Visitor escort required'],
      },
      safetyProtocols: {
        emergencyExits: 4,
        fireExtinguishers: 12,
        firstAidKits: 3,
        emergencyContacts: {
          fire: '101',
          police: '100',
          ambulance: '108',
        },
      },
      operationalStatus: OperationalStatus.ACTIVE,
      contactInfo: {
        siteManager: 'John Doe',
        phone: '+91-9876543211',
        email: 'site.manager@client.com',
      },
      siteBillingRates: {
        dayShift: 800.00,
        nightShift: 900.00,
        holidayRate: 1200.00,
      },
      siteSLA: {
        responseTime: '< 3 minutes',
        escalationTime: '< 10 minutes',
      },
      minStaffingLevel: 2,
      maxStaffingLevel: 6,
      skillRequirements: {
        mandatory: ['Security Training', 'Basic First Aid'],
        preferred: ['Fire Safety', 'Access Control Systems'],
      },
      ...overrides,
    };

    return await this.prisma.site.create({
      data: siteData,
    });
  }

  /**
   * Employee (Depends on: Company)
   */
  async createEmployee(companyId: string, overrides: Partial<Employee> = {}): Promise<Employee> {
    const employeeNumber = `EMP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Ensure company exists before creating employee
    let company = await this.prisma.company.findUnique({ where: { id: companyId } });
    if (!company) {
      company = await this.prisma.company.create({
        data: {
          id: companyId,
          name: `Test Company ${companyId}`,
          slug: `test-${companyId.substring(0, 8)}`,
          settings: {},
          branding: {}
        }
      });
    }
    
    const employeeData = {
      companyId,
      employeeNumber,
      firstName: 'Rajesh',
      lastName: 'Kumar',
      email: `${employeeNumber.toLowerCase()}@company.com`,
      phone: '+91-9876543212',
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
      employmentStatus: EmploymentStatus.ACTIVE,
      hireDate: new Date('2023-01-01'),
      ...overrides,
    };

    // Use direct Prisma call for employee creation
    try {
      return await this.prisma.employee.create({
        data: employeeData,
      });
    } catch (error) {
      // If withSystemContext method doesn't exist, use direct creation
      return await this.prisma.employee.create({
        data: employeeData,
      });
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
    const assignmentData = {
      employeeId,
      siteId,
      role: 'Security Guard',
      responsibilities: {
        primary: ['Perimeter Security', 'Access Control'],
        secondary: ['Visitor Management', 'Incident Reporting'],
        reporting: {
          frequency: 'daily',
          format: 'digital',
        },
      },
      hourlyRate: 800.00, // Using numeric value instead of string
      status: AssignmentStatus.ACTIVE,
      startDate: new Date(),
      ...overrides,
    };

    return await this.prisma.assignment.create({
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
        employeeNumber: `EMP-${Date.now()}-${i}`,
        firstName: `Employee${i}`,
        lastName: `Test${i}`,
        email: `employee${i}@company.com`,
      });
      employees.push(employee);
    }
    return employees;
  }

  async createMultipleSites(contractId: string, count: number): Promise<Site[]> {
    const sites: Site[] = [];
    for (let i = 0; i < count; i++) {
      const site = await this.createSite(contractId, {
        name: `Site ${i + 1}`,
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
        await this.prisma.assignment.deleteMany({ 
          where: { employee: { companyId } } 
        });
      } catch (error) {
        // Ignore if assignments table doesn't exist
      }
      
      // Clean up employees
      try {
        await this.prisma.employee.deleteMany({ 
          where: { companyId } 
        });
      } catch (error) {
        // Ignore if employees table doesn't exist
      }
      
      // Clean up sites (if contracts table exists)
      try {
        await this.prisma.site.deleteMany({ 
          where: { contract: { client: { companyId } } } 
        });
      } catch (error) {
        // Ignore if sites/contracts table doesn't exist
      }
      
      // Clean up contracts (if table exists)
      try {
        await this.prisma.contract.deleteMany({ 
          where: { client: { companyId } } 
        });
      } catch (error) {
        // Ignore if contracts table doesn't exist
      }
      
      // Clean up clients
      try {
        await this.prisma.client.deleteMany({ 
          where: { companyId } 
        });
      } catch (error) {
        // Ignore if clients table doesn't exist
      }
      
      // Clean up company
      try {
        await this.prisma.company.delete({ 
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
    const employeeNumber = `EMP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    return {
      employeeNumber,
      firstName: `Test${Math.random().toString(36).substr(2, 5)}`,
      lastName: `User${Math.random().toString(36).substr(2, 5)}`,
      email: `${employeeNumber.toLowerCase()}@example.com`,
      phone: `+91-98765${Math.floor(Math.random() * 99999).toString().padStart(5, '0')}`,
      skills: this.getRandomSkills(),
      hireDate: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000),
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