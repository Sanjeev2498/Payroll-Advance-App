import { PrismaService } from '../../prisma/prisma.service';
import * as fc from 'fast-check';
import { v4 as uuidv4 } from 'uuid';

export interface DeploymentScenario {
  companyName: string;
  siteCount: number;
  employeeCount: number;
  assignmentRatio: number; // 0-1, percentage of sites that get assignments
  skillVariety: number; // 1-5, number of different skills
}

export interface ConflictScenario {
  companyName: string;
  siteCount: number;
  employeeCount: number;
  conflictProbability: number; // 0-1, probability of creating conflicts
  conflictTypes: string[];
}

export interface EfficiencyScenario {
  companyName: string;
  siteCount: number;
  employeeCount: number;
  efficiencyTarget: number; // 0-100, target efficiency percentage
}

export interface RecommendationScenario {
  companyName: string;
  siteName: string;
  availableGuardCount: number;
  requiredSkills: string[];
  minimumExperience: number;
}

export interface QuickAssignmentScenario {
  companyName: string;
  siteName: string;
  hasAvailableGuard: boolean;
  guardSkills: string[];
}

export class DeploymentTestDataGenerator {
  constructor(private prisma: PrismaService) {}

  deploymentScenarioGenerator() {
    return fc.record<DeploymentScenario>({
      companyName: fc.string({ minLength: 5, maxLength: 30 }).filter(s => s.trim().length > 0 && /^[a-zA-Z0-9\s]+$/.test(s.trim())),
      siteCount: fc.integer({ min: 1, max: 10 }),
      employeeCount: fc.integer({ min: 1, max: 20 }),
      assignmentRatio: fc.float({ min: Math.fround(0.3), max: Math.fround(1.0) }),
      skillVariety: fc.integer({ min: 1, max: 5 })
    });
  }

  conflictScenarioGenerator() {
    return fc.record<ConflictScenario>({
      companyName: fc.string({ minLength: 5, maxLength: 30 }).filter(s => s.trim().length > 0 && /^[a-zA-Z0-9\s]+$/.test(s.trim())),
      siteCount: fc.integer({ min: 2, max: 8 }),
      employeeCount: fc.integer({ min: 1, max: 10 }),
      conflictProbability: fc.float({ min: Math.fround(0.2), max: Math.fround(0.8) }),
      conflictTypes: fc.array(fc.constantFrom('scheduling', 'skill_mismatch', 'double_booking'), { minLength: 1, maxLength: 3 })
    });
  }

  efficiencyScenarioGenerator() {
    return fc.record<EfficiencyScenario>({
      companyName: fc.string({ minLength: 5, maxLength: 30 }).filter(s => s.trim().length > 0 && /^[a-zA-Z0-9\s]+$/.test(s.trim())),
      siteCount: fc.integer({ min: 2, max: 12 }),
      employeeCount: fc.integer({ min: 2, max: 15 }),
      efficiencyTarget: fc.float({ min: Math.fround(60), max: Math.fround(95) })
    });
  }

  recommendationScenarioGenerator() {
    return fc.record<RecommendationScenario>({
      companyName: fc.string({ minLength: 5, maxLength: 30 }).filter(s => s.trim().length > 0 && /^[a-zA-Z0-9\s]+$/.test(s.trim())),
      siteName: fc.string({ minLength: 5, maxLength: 50 }).filter(s => s.trim().length > 0 && /^[a-zA-Z0-9\s]+$/.test(s.trim())),
      availableGuardCount: fc.integer({ min: 0, max: 8 }),
      requiredSkills: fc.array(fc.constantFrom('security', 'surveillance', 'patrol', 'emergency_response', 'customer_service'), { minLength: 0, maxLength: 3 }),
      minimumExperience: fc.integer({ min: 0, max: 60 }) // months
    });
  }

  quickAssignmentScenarioGenerator() {
    return fc.record<QuickAssignmentScenario>({
      companyName: fc.string({ minLength: 5, maxLength: 30 }).filter(s => s.trim().length > 0 && /^[a-zA-Z0-9\s]+$/.test(s.trim())),
      siteName: fc.string({ minLength: 5, maxLength: 50 }).filter(s => s.trim().length > 0 && /^[a-zA-Z0-9\s]+$/.test(s.trim())),
      hasAvailableGuard: fc.boolean(),
      guardSkills: fc.array(fc.constantFrom('security', 'surveillance', 'patrol', 'emergency_response'), { minLength: 1, maxLength: 3 })
    });
  }

  async createDeploymentScenario(scenario: DeploymentScenario) {
    // Create company
    const company = await this.prisma.companies.create({
      data: {
        id: uuidv4(),
        name: scenario.companyName,
        slug: scenario.companyName.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
        created_at: new Date(),
        updated_at: new Date(),
        settings: {},
        branding: {}
      }
    });

    // Create client
    const client = await this.prisma.clients.create({
      data: {
        id: uuidv4(),
        company_id: company.id,
        name: `${scenario.companyName} Client`,
        contact_email: `contact@${scenario.companyName.toLowerCase()}.com`,
        contact_info: {
          phone: '555-0123',
          address: '123 Business St'
        },
        updated_at: new Date()
      }
    });

    // Create contract for the client
    const contract = await this.prisma.contracts.create({
      data: {
        id: uuidv4(),
        client_id: client.id,
        contract_number: `CONT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        title: `${scenario.companyName} Service Agreement`,
        status: 'ACTIVE',
        start_date: new Date(),
        end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
        billing_preferences: {
          frequency: 'MONTHLY',
          method: 'PORTAL',
          paymentTerms: 30
        },
        service_definitions: { services: ['security'] }
      }
    });

    // Generate skills pool
    const skillsPool = ['security', 'surveillance', 'patrol', 'emergency_response', 'customer_service'];
    const availableSkills = skillsPool.slice(0, scenario.skillVariety);

    // Create sites
    const sites = [];
    for (let i = 0; i < scenario.siteCount; i++) {
      const site = await this.prisma.sites.create({
        data: {
          id: uuidv4(),
          client_id: client.id,
          contract_id: contract.id,
          name: `Site ${i + 1}`,
          address: {
            street: `${100 + i} Site Street`,
            city: 'Business City',
            state: 'BC',
            zipCode: `1000${i}`
          },
          access_requirements: {
            keycard: true,
            escort: false
          },
          safety_protocols: {
            checkIn: true,
            emergency: '911'
          },
          operational_status: 'ACTIVE',
          contact_info: {
            phone: `555-010${i}`,
            email: `site${i}@company.com`
          },
          updated_at: new Date()
        }
      });
      sites.push(site);
    }

    // Create employees
    const employees = [];
    for (let i = 0; i < scenario.employeeCount; i++) {
      const employeeSkills = availableSkills.slice(0, Math.min(2, availableSkills.length));
      
      const employee = await this.prisma.employees.create({
        data: {
          id: uuidv4(),
          company_id: company.id,
          employee_number: `EMP${1000 + i}`,
          first_name: `Employee${i}`,
          last_name: 'Test',
          email: `employee${i}@test.com`,
          email_iv: 'test-iv-32chars-placeholder-val',
          email_tag: 'test-tag-32chars-placeholder',
          phone: `555-020${i}`,
          phone_iv: 'test-iv-32chars-placeholder-val',
          phone_tag: 'test-tag-32chars-placeholder',
          address: {
            street: `${200 + i} Employee St`,
            city: 'Employee City',
            state: 'EC',
            zipCode: `2000${i}`
          },
          basic_salary: '45000',
          basic_salary_iv: 'test-iv-32chars-placeholder-val',
          basic_salary_tag: 'test-tag-32chars-placeholder',
          hra_amount: '4500',
          hra_amount_iv: 'test-iv-32chars-placeholder-val',
          hra_amount_tag: 'test-tag-32chars-placeholder',
          other_allowances: '1500',
          other_allowances_iv: 'test-iv-32chars-placeholder-val',
          other_allowances_tag: 'test-tag-32chars-placeholder',
          gross_salary: '51000',
          gross_salary_iv: 'test-iv-32chars-placeholder-val',
          gross_salary_tag: 'test-tag-32chars-placeholder',
          salary_type: 'MONTHLY',
          bank_name: 'Test Bank Limited',
          bank_name_iv: 'test-iv-32chars-placeholder-val',
          bank_name_tag: 'test-tag-32chars-placeholder',
          account_number: `12345678${String(i).padStart(2, '0')}`,
          account_number_iv: 'test-iv-32chars-placeholder-val',
          account_number_tag: 'test-tag-32chars-placeholder',
          ifsc_code: 'TEST0123456',
          ifsc_code_iv: 'test-iv-32chars-placeholder-val',
          ifsc_code_tag: 'test-tag-32chars-placeholder',
          account_type: 'SAVINGS',
          epf_applicable: true,
          esic_applicable: true,
          pt_applicable: true,
          tds_applicable: true,
          date_of_birth: new Date('1990-01-01'),
          certifications: {
            security: true,
            firstAid: Math.random() > 0.5
          },
          skills: employeeSkills,
          employment_status: 'ACTIVE',
          hire_date: new Date(Date.now() - Math.floor(Math.random() * 365 * 24 * 60 * 60 * 1000)),
          metadata: { training: 'completed', clearance: 'active' },
          updated_at: new Date()
        }
      });
      employees.push(employee);
    }

    // Create assignments based on assignment ratio
    const assignments = [];
    const sitesToAssign = Math.floor(scenario.siteCount * scenario.assignmentRatio);
    
    for (let i = 0; i < sitesToAssign && i < sites.length && i < employees.length; i++) {
      const assignment = await this.prisma.assignments.create({
        data: {
          id: uuidv4(),
          employee_id: employees[i].id,
          site_id: sites[i].id,
          role: 'Security Guard',
          responsibilities: {
            patrol: true,
            monitoring: true,
            reporting: true
          },
          hourly_rate: (20.0 + Math.random() * 15).toString(), // $20-35/hour as string
          hourly_rate_iv: 'test-iv',
          hourly_rate_tag: 'test-tag',
          status: 'ACTIVE',
          start_date: new Date(),
          updated_at: new Date()
        }
      });
      assignments.push(assignment);
    }

    return { company, client, contract, sites, employees, assignments };
  }

  async createConflictScenario(scenario: ConflictScenario) {
    const company = await this.prisma.companies.create({
      data: {
        id: uuidv4(),
        name: scenario.companyName,
        slug: scenario.companyName.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-conflict-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
        created_at: new Date(),
        updated_at: new Date(),
        settings: {},
        branding: {}
      }
    });

    const client = await this.prisma.clients.create({
      data: {
        id: uuidv4(),
        company_id: company.id,
        name: `${scenario.companyName} Client`,
        contact_email: `contact@${scenario.companyName.toLowerCase()}.com`,
        contact_info: {},
        updated_at: new Date()
      }
    });

    // Create contract for the client
    const contract = await this.prisma.contracts.create({
      data: {
        id: uuidv4(),
        client_id: client.id,
        contract_number: `CONT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        title: `${scenario.companyName} Conflict Service Agreement`,
        status: 'ACTIVE',
        start_date: new Date(),
        end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        billing_preferences: {
          frequency: 'MONTHLY',
          method: 'PORTAL',
          paymentTerms: 30
        },
        service_definitions: { services: ['security'] }
      }
    });

    // Create sites and employees
    const sites = [];
    const employees = [];
    
    for (let i = 0; i < scenario.siteCount; i++) {
      const site = await this.prisma.sites.create({
        data: {
          id: uuidv4(),
          client_id: client.id,
          contract_id: contract.id,
          name: `Conflict Site ${i + 1}`,
          address: {},
          access_requirements: {},
          safety_protocols: {},
          operational_status: 'ACTIVE',
          contact_info: {},
          updated_at: new Date()
        }
      });
      sites.push(site);
    }

    for (let i = 0; i < scenario.employeeCount; i++) {
      const employee = await this.prisma.employees.create({
        data: {
          id: uuidv4(),
          company_id: company.id,
          employee_number: `CONF${1000 + i}`,
          first_name: `ConflictEmployee${i}`,
          last_name: 'Test',
          email: `conflict${i}@test.com`,
          email_iv: 'test-iv-32chars-placeholder-val',
          email_tag: 'test-tag-32chars-placeholder',
          phone: `555-030${i}`,
          phone_iv: 'test-iv-32chars-placeholder-val',
          phone_tag: 'test-tag-32chars-placeholder',
          address: { street: 'Test Address' },
          basic_salary: '45000',
          basic_salary_iv: 'test-iv-32chars-placeholder-val',
          basic_salary_tag: 'test-tag-32chars-placeholder',
          hra_amount: '4500',
          hra_amount_iv: 'test-iv-32chars-placeholder-val',
          hra_amount_tag: 'test-tag-32chars-placeholder',
          other_allowances: '1500',
          other_allowances_iv: 'test-iv-32chars-placeholder-val',
          other_allowances_tag: 'test-tag-32chars-placeholder',
          gross_salary: '51000',
          gross_salary_iv: 'test-iv-32chars-placeholder-val',
          gross_salary_tag: 'test-tag-32chars-placeholder',
          salary_type: 'MONTHLY',
          bank_name: 'Test Bank Limited',
          bank_name_iv: 'test-iv-32chars-placeholder-val',
          bank_name_tag: 'test-tag-32chars-placeholder',
          account_number: `87654321${String(i).padStart(2, '0')}`,
          account_number_iv: 'test-iv-32chars-placeholder-val',
          account_number_tag: 'test-tag-32chars-placeholder',
          ifsc_code: 'TEST0123456',
          ifsc_code_iv: 'test-iv-32chars-placeholder-val',
          ifsc_code_tag: 'test-tag-32chars-placeholder',
          account_type: 'SAVINGS',
          epf_applicable: true,
          esic_applicable: true,
          pt_applicable: true,
          tds_applicable: true,
          date_of_birth: new Date('1990-01-01'),
          certifications: { security: true, conflict: true },
          skills: ['security'],
          employment_status: 'ACTIVE',
          hire_date: new Date(),
          metadata: { training: 'completed', clearance: 'active' },
          updated_at: new Date()
        }
      });
      employees.push(employee);
    }

    // Create conflicting assignments based on probability
    const conflictingAssignments = [];
    
    if (Math.random() < scenario.conflictProbability && employees.length > 0 && sites.length >= 2) {
      // Create double booking scenario - same employee assigned to multiple sites
      const conflictEmployee = employees[0];
      
      const assignment1 = await this.prisma.assignments.create({
        data: {
          id: uuidv4(),
          employee_id: conflictEmployee.id,
          site_id: sites[0].id,
          role: 'Security Guard',
          responsibilities: {},
          hourly_rate: '25.0',
          hourly_rate_iv: 'test-iv',
          hourly_rate_tag: 'test-tag',
          status: 'ACTIVE',
          start_date: new Date(),
          updated_at: new Date()
        }
      });
      
      const assignment2 = await this.prisma.assignments.create({
        data: {
          id: uuidv4(),
          employee_id: conflictEmployee.id,
          site_id: sites[1].id,
          role: 'Security Guard',
          responsibilities: {},
          hourly_rate: '25.0',
          hourly_rate_iv: 'test-iv',
          hourly_rate_tag: 'test-tag',
          status: 'ACTIVE',
          start_date: new Date(),
          updated_at: new Date()
        }
      });
      
      conflictingAssignments.push(assignment1, assignment2);
    }

    return { company, client, contract, sites, employees, conflictingAssignments };
  }

  async createEfficiencyScenario(scenario: EfficiencyScenario) {
    const company = await this.prisma.companies.create({
      data: {
        id: uuidv4(),
        name: scenario.companyName,
        slug: scenario.companyName.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-efficiency-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
        created_at: new Date(),
        updated_at: new Date(),
        settings: {},
        branding: {}
      }
    });

    // Create basic data for efficiency calculations
    const client = await this.prisma.clients.create({
      data: {
        id: uuidv4(),
        company_id: company.id,
        name: `${scenario.companyName} Client`,
        contact_email: `efficiency@${scenario.companyName.toLowerCase()}.com`,
        contact_info: {},
        updated_at: new Date()
      }
    });

    // Create contract for the client
    const contract = await this.prisma.contracts.create({
      data: {
        id: uuidv4(),
        client_id: client.id,
        contract_number: `CONT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        title: `${scenario.companyName} Efficiency Service Agreement`,
        status: 'ACTIVE',
        start_date: new Date(),
        end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        billing_preferences: {
          frequency: 'MONTHLY',
          method: 'PORTAL',
          paymentTerms: 30
        },
        service_definitions: { services: ['security'] }
      }
    });

    // Create sites and assignments to target the efficiency goal
    for (let i = 0; i < scenario.siteCount; i++) {
      const site = await this.prisma.sites.create({
        data: {
          id: uuidv4(),
          client_id: client.id,
          contract_id: contract.id,
          name: `Efficiency Site ${i + 1}`,
          address: {},
          access_requirements: {},
          safety_protocols: {},
          operational_status: 'ACTIVE',
          contact_info: {},
          updated_at: new Date()
        }
      });

      // Create employee and assignment for efficiency testing
      if (i < scenario.employeeCount) {
        const employee = await this.prisma.employees.create({
          data: {
            id: uuidv4(),
            company_id: company.id,
            employee_number: `EFF${1000 + i}`,
            first_name: `EfficiencyEmployee${i}`,
            last_name: 'Test',
            email: `efficiency${i}@test.com`,
            email_iv: 'test-iv-32chars-placeholder-val',
            email_tag: 'test-tag-32chars-placeholder',
            phone: `555-040${i}`,
            phone_iv: 'test-iv-32chars-placeholder-val',
            phone_tag: 'test-tag-32chars-placeholder',
            address: { street: 'Efficiency Street' },
            basic_salary: '45000',
            basic_salary_iv: 'test-iv-32chars-placeholder-val',
            basic_salary_tag: 'test-tag-32chars-placeholder',
            hra_amount: '4500',
            hra_amount_iv: 'test-iv-32chars-placeholder-val',
            hra_amount_tag: 'test-tag-32chars-placeholder',
            other_allowances: '1500',
            other_allowances_iv: 'test-iv-32chars-placeholder-val',
            other_allowances_tag: 'test-tag-32chars-placeholder',
            gross_salary: '51000',
            gross_salary_iv: 'test-iv-32chars-placeholder-val',
            gross_salary_tag: 'test-tag-32chars-placeholder',
            salary_type: 'MONTHLY',
            bank_name: 'Test Bank Limited',
            bank_name_iv: 'test-iv-32chars-placeholder-val',
            bank_name_tag: 'test-tag-32chars-placeholder',
            account_number: `55667788${String(i).padStart(2, '0')}`,
            account_number_iv: 'test-iv-32chars-placeholder-val',
            account_number_tag: 'test-tag-32chars-placeholder',
            ifsc_code: 'TEST0123456',
            ifsc_code_iv: 'test-iv-32chars-placeholder-val',
            ifsc_code_tag: 'test-tag-32chars-placeholder',
            account_type: 'SAVINGS',
            epf_applicable: true,
            esic_applicable: true,
            pt_applicable: true,
            tds_applicable: true,
            date_of_birth: new Date('1990-01-01'),
            certifications: { security: true, efficiency: true },
            skills: ['security'],
            employment_status: 'ACTIVE',
            hire_date: new Date(),
            metadata: { training: 'completed', clearance: 'active' },
            updated_at: new Date()
          }
        });

        await this.prisma.assignments.create({
          data: {
            id: uuidv4(),
            employee_id: employee.id,
            site_id: site.id,
            role: 'Security Guard',
            responsibilities: {},
            hourly_rate: '25.0',
            hourly_rate_iv: 'test-iv',
            hourly_rate_tag: 'test-tag',
            status: 'ACTIVE',
            start_date: new Date(),
            updated_at: new Date()
          }
        });
      }
    }

    return { company };
  }

  async createRecommendationScenario(scenario: RecommendationScenario) {
    const company = await this.prisma.companies.create({
      data: {
        id: uuidv4(),
        name: scenario.companyName,
        slug: scenario.companyName.toLowerCase().replace(/[^a-z0-9]/g, '-').substring(0, 20) + '-' + Math.random().toString(36).substr(2, 6),
        created_at: new Date(),
        updated_at: new Date(),
        settings: {},
        branding: {}
      }
    });

    const client = await this.prisma.clients.create({
      data: {
        id: uuidv4(),
        company_id: company.id,
        name: `${scenario.companyName} Client`,
        contact_email: `recommendation@${scenario.companyName.toLowerCase()}.com`,
        contact_info: {},
        updated_at: new Date()
      }
    });

    // Create contract for the client
    const contract = await this.prisma.contracts.create({
      data: {
        id: uuidv4(),
        client_id: client.id,
        contract_number: `CONT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        title: `${scenario.companyName} Recommendation Service Agreement`,
        status: 'ACTIVE',
        start_date: new Date(),
        end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        billing_preferences: {
          frequency: 'MONTHLY',
          method: 'PORTAL',
          paymentTerms: 30
        },
        service_definitions: { services: ['security'] }
      }
    });

    const site = await this.prisma.sites.create({
      data: {
        id: uuidv4(),
        client_id: client.id,
          contract_id: contract.id,
        name: scenario.siteName,
        address: {},
        access_requirements: {},
        safety_protocols: {},
        operational_status: 'ACTIVE',
        contact_info: {},
        updated_at: new Date()
      }
    });

    const availableGuards = [];
    for (let i = 0; i < scenario.availableGuardCount; i++) {
      const guard = await this.prisma.employees.create({
        data: {
          id: uuidv4(),
          company_id: company.id,
          employee_number: `REC${1000 + i}`,
          first_name: `RecommendationGuard${i}`,
          last_name: 'Test',
          email: `recommendation${i}@test.com`,
          email_iv: 'test-iv-32chars-placeholder-val',
          email_tag: 'test-tag-32chars-placeholder',
          phone: `555-050${i}`,
          phone_iv: 'test-iv-32chars-placeholder-val',
          phone_tag: 'test-tag-32chars-placeholder',
          address: { street: 'Recommendation Street' },
          basic_salary: '45000',
          basic_salary_iv: 'test-iv-32chars-placeholder-val',
          basic_salary_tag: 'test-tag-32chars-placeholder',
          hra_amount: '4500',
          hra_amount_iv: 'test-iv-32chars-placeholder-val',
          hra_amount_tag: 'test-tag-32chars-placeholder',
          other_allowances: '1500',
          other_allowances_iv: 'test-iv-32chars-placeholder-val',
          other_allowances_tag: 'test-tag-32chars-placeholder',
          gross_salary: '51000',
          gross_salary_iv: 'test-iv-32chars-placeholder-val',
          gross_salary_tag: 'test-tag-32chars-placeholder',
          salary_type: 'MONTHLY',
          bank_name: 'Test Bank Limited',
          bank_name_iv: 'test-iv-32chars-placeholder-val',
          bank_name_tag: 'test-tag-32chars-placeholder',
          account_number: `99887766${String(i).padStart(2, '0')}`,
          account_number_iv: 'test-iv-32chars-placeholder-val',
          account_number_tag: 'test-tag-32chars-placeholder',
          ifsc_code: 'TEST0123456',
          ifsc_code_iv: 'test-iv-32chars-placeholder-val',
          ifsc_code_tag: 'test-tag-32chars-placeholder',
          account_type: 'SAVINGS',
          epf_applicable: true,
          esic_applicable: true,
          pt_applicable: true,
          tds_applicable: true,
          date_of_birth: new Date('1990-01-01'),
          certifications: { security: true, recommendation: true },
          skills: scenario.requiredSkills.length > 0 ? 
                 scenario.requiredSkills.slice(0, Math.min(2, scenario.requiredSkills.length)) : 
                 ['security'],
          employment_status: 'ACTIVE',
          hire_date: new Date(),
          metadata: { training: 'completed', clearance: 'active' },
          updated_at: new Date()
        }
      });
      availableGuards.push(guard);
    }

    return { company, site, availableGuards };
  }

  async createQuickAssignmentScenario(scenario: QuickAssignmentScenario) {
    const company = await this.prisma.companies.create({
      data: {
        id: uuidv4(),
        name: scenario.companyName,
        slug: scenario.companyName.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-quickassign-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
        created_at: new Date(),
        updated_at: new Date(),
        settings: {},
        branding: {}
      }
    });

    const client = await this.prisma.clients.create({
      data: {
        id: uuidv4(),
        company_id: company.id,
        name: `${scenario.companyName} Client`,
        contact_email: `quickassign@${scenario.companyName.toLowerCase()}.com`,
        contact_info: {},
        updated_at: new Date()
      }
    });

    // Create contract for the client
    const contract = await this.prisma.contracts.create({
      data: {
        id: uuidv4(),
        client_id: client.id,
        contract_number: `CONT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        title: `${scenario.companyName} QuickAssign Service Agreement`,
        status: 'ACTIVE',
        start_date: new Date(),
        end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        billing_preferences: {
          frequency: 'MONTHLY',
          method: 'PORTAL',
          paymentTerms: 30
        },
        service_definitions: { services: ['security'] }
      }
    });

    const site = await this.prisma.sites.create({
      data: {
        id: uuidv4(),
        client_id: client.id,
          contract_id: contract.id,
        name: scenario.siteName,
        address: {},
        access_requirements: {},
        safety_protocols: {},
        operational_status: 'ACTIVE',
        contact_info: {},
        updated_at: new Date()
      }
    });

    let availableGuard = null;
    if (scenario.hasAvailableGuard) {
      availableGuard = await this.prisma.employees.create({
        data: {
          id: uuidv4(),
          company_id: company.id,
          employee_number: 'QA1000',
          first_name: 'QuickAssignGuard',
          last_name: 'Test',
          email: 'quickassign@test.com',
          email_iv: 'test-iv-32chars-placeholder-val',
          email_tag: 'test-tag-32chars-placeholder',
          phone: '555-060000',
          phone_iv: 'test-iv-32chars-placeholder-val',
          phone_tag: 'test-tag-32chars-placeholder',
          address: { street: 'Quick Assign Street' },
          basic_salary: '45000',
          basic_salary_iv: 'test-iv-32chars-placeholder-val',
          basic_salary_tag: 'test-tag-32chars-placeholder',
          hra_amount: '4500',
          hra_amount_iv: 'test-iv-32chars-placeholder-val',
          hra_amount_tag: 'test-tag-32chars-placeholder',
          other_allowances: '1500',
          other_allowances_iv: 'test-iv-32chars-placeholder-val',
          other_allowances_tag: 'test-tag-32chars-placeholder',
          gross_salary: '51000',
          gross_salary_iv: 'test-iv-32chars-placeholder-val',
          gross_salary_tag: 'test-tag-32chars-placeholder',
          salary_type: 'MONTHLY',
          bank_name: 'Test Bank Limited',
          bank_name_iv: 'test-iv-32chars-placeholder-val',
          bank_name_tag: 'test-tag-32chars-placeholder',
          account_number: '1122334455',
          account_number_iv: 'test-iv-32chars-placeholder-val',
          account_number_tag: 'test-tag-32chars-placeholder',
          ifsc_code: 'TEST0123456',
          ifsc_code_iv: 'test-iv-32chars-placeholder-val',
          ifsc_code_tag: 'test-tag-32chars-placeholder',
          account_type: 'SAVINGS',
          epf_applicable: true,
          esic_applicable: true,
          pt_applicable: true,
          tds_applicable: true,
          date_of_birth: new Date('1990-01-01'),
          certifications: { security: true, quickAssign: true },
          skills: scenario.guardSkills,
          employment_status: 'ACTIVE',
          hire_date: new Date(),
          metadata: { training: 'completed', clearance: 'active' },
          updated_at: new Date()
        }
      });
    }

    return { company, site, availableGuard };
  }

  async cleanup() {
    // Clean up test data in reverse dependency order
    await this.prisma.assignments.deleteMany({});
    await this.prisma.shifts.deleteMany({});
    await this.prisma.attendance.deleteMany({});
    await this.prisma.employees.deleteMany({});
    await this.prisma.sites.deleteMany({});
    await this.prisma.contracts.deleteMany({});
    await this.prisma.clients.deleteMany({});
    await this.prisma.companies.deleteMany({});
  }
}
