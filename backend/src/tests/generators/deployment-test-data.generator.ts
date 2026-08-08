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
    const company = await this.prisma.company.create({
      data: {
        id: uuidv4(),
        name: scenario.companyName,
        slug: scenario.companyName.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
        settings: {},
        branding: {}
      }
    });

    // Create client
    const client = await this.prisma.client.create({
      data: {
        id: uuidv4(),
        companyId: company.id,
        name: `${scenario.companyName} Client`,
        contactEmail: `contact@${scenario.companyName.toLowerCase()}.com`,
        contactInfo: {
          phone: '555-0123',
          address: '123 Business St'
        }
      }
    });

    // Create contract for the client
    const contract = await this.prisma.contract.create({
      data: {
        id: uuidv4(),
        clientId: client.id,
        contractNumber: `CONT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        title: `${scenario.companyName} Service Agreement`,
        status: 'ACTIVE',
        startDate: new Date(),
        endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
        billingPreferences: {
          frequency: 'MONTHLY',
          method: 'PORTAL',
          paymentTerms: 30
        },
        serviceDefinitions: { services: ['security'] }
      }
    });

    // Generate skills pool
    const skillsPool = ['security', 'surveillance', 'patrol', 'emergency_response', 'customer_service'];
    const availableSkills = skillsPool.slice(0, scenario.skillVariety);

    // Create sites
    const sites = [];
    for (let i = 0; i < scenario.siteCount; i++) {
      const site = await this.prisma.site.create({
        data: {
          id: uuidv4(),
          contractId: contract.id,
          name: `Site ${i + 1}`,
          address: {
            street: `${100 + i} Site Street`,
            city: 'Business City',
            state: 'BC',
            zipCode: `1000${i}`
          },
          accessRequirements: {
            keycard: true,
            escort: false
          },
          safetyProtocols: {
            checkIn: true,
            emergency: '911'
          },
          operationalStatus: 'ACTIVE',
          contactInfo: {
            phone: `555-010${i}`,
            email: `site${i}@company.com`
          },
        }
      });
      sites.push(site);
    }

    // Create employees
    const employees = [];
    for (let i = 0; i < scenario.employeeCount; i++) {
      const employeeSkills = availableSkills.slice(0, Math.min(2, availableSkills.length));
      
      const employee = await this.prisma.employee.create({
        data: {
          id: uuidv4(),
          companyId: company.id,
          employeeNumber: `EMP${1000 + i}`,
          firstName: `Employee${i}`,
          lastName: 'Test',
          email: `employee${i}@test.com`,
          emailIv: 'test-iv-32chars-placeholder-val',
          emailTag: 'test-tag-32chars-placeholder',
          phone: `555-020${i}`,
          phoneIv: 'test-iv-32chars-placeholder-val',
          phoneTag: 'test-tag-32chars-placeholder',
          address: {
            street: `${200 + i} Employee St`,
            city: 'Employee City',
            state: 'EC',
            zipCode: `2000${i}`
          },
          basicSalary: '45000',
          basicSalaryIv: 'test-iv-32chars-placeholder-val',
          basicSalaryTag: 'test-tag-32chars-placeholder',
          hraAmount: '4500',
          hraAmountIv: 'test-iv-32chars-placeholder-val',
          hraAmountTag: 'test-tag-32chars-placeholder',
          otherAllowances: '1500',
          otherAllowancesIv: 'test-iv-32chars-placeholder-val',
          otherAllowancesTag: 'test-tag-32chars-placeholder',
          grossSalary: '51000',
          grossSalaryIv: 'test-iv-32chars-placeholder-val',
          grossSalaryTag: 'test-tag-32chars-placeholder',
          salaryType: 'MONTHLY',
          bankName: 'Test Bank Limited',
          bankNameIv: 'test-iv-32chars-placeholder-val',
          bankNameTag: 'test-tag-32chars-placeholder',
          accountNumber: `12345678${String(i).padStart(2, '0')}`,
          accountNumberIv: 'test-iv-32chars-placeholder-val',
          accountNumberTag: 'test-tag-32chars-placeholder',
          ifscCode: 'TEST0123456',
          ifscCodeIv: 'test-iv-32chars-placeholder-val',
          ifscCodeTag: 'test-tag-32chars-placeholder',
          accountType: 'SAVINGS',
          epfApplicable: true,
          esicApplicable: true,
          ptApplicable: true,
          tdsApplicable: true,
          dateOfBirth: new Date('1990-01-01'),
          certifications: {
            security: true,
            firstAid: Math.random() > 0.5
          },
          skills: employeeSkills,
          employmentStatus: 'ACTIVE',
          hireDate: new Date(Date.now() - Math.floor(Math.random() * 365 * 24 * 60 * 60 * 1000)),
          metadata: { training: 'completed', clearance: 'active' },
        }
      });
      employees.push(employee);
    }

    // Create assignments based on assignment ratio
    const assignments = [];
    const sitesToAssign = Math.floor(scenario.siteCount * scenario.assignmentRatio);
    
    for (let i = 0; i < sitesToAssign && i < sites.length && i < employees.length; i++) {
      const assignment = await this.prisma.assignment.create({
        data: {
          id: uuidv4(),
          employeeId: employees[i].id,
          siteId: sites[i].id,
          role: 'Security Guard',
          responsibilities: {
            patrol: true,
            monitoring: true,
            reporting: true
          },
          hourlyRate: (20.0 + Math.random() * 15).toString(), // $20-35/hour as string
          hourlyRateIv: 'test-iv',
          hourlyRateTag: 'test-tag',
          status: 'ACTIVE',
          startDate: new Date(),
        }
      });
      assignments.push(assignment);
    }

    return { company, client, contract, sites, employees, assignments };
  }

  async createConflictScenario(scenario: ConflictScenario) {
    const company = await this.prisma.company.create({
      data: {
        id: uuidv4(),
        name: scenario.companyName,
        slug: scenario.companyName.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-conflict-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
        settings: {},
        branding: {}
      }
    });

    const client = await this.prisma.client.create({
      data: {
        id: uuidv4(),
        companyId: company.id,
        name: `${scenario.companyName} Client`,
        contactEmail: `contact@${scenario.companyName.toLowerCase()}.com`,
        contactInfo: {}
      }
    });

    // Create contract for the client
    const contract = await this.prisma.contract.create({
      data: {
        id: uuidv4(),
        clientId: client.id,
        contractNumber: `CONT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        title: `${scenario.companyName} Conflict Service Agreement`,
        status: 'ACTIVE',
        startDate: new Date(),
        endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        billingPreferences: {
          frequency: 'MONTHLY',
          method: 'PORTAL',
          paymentTerms: 30
        },
        serviceDefinitions: { services: ['security'] }
      }
    });

    // Create sites and employees
    const sites = [];
    const employees = [];
    
    for (let i = 0; i < scenario.siteCount; i++) {
      const site = await this.prisma.site.create({
        data: {
          id: uuidv4(),
          contractId: contract.id,
          name: `Conflict Site ${i + 1}`,
          address: {},
          accessRequirements: {},
          safetyProtocols: {},
          operationalStatus: 'ACTIVE',
          contactInfo: {}
        }
      });
      sites.push(site);
    }

    for (let i = 0; i < scenario.employeeCount; i++) {
      const employee = await this.prisma.employee.create({
        data: {
          id: uuidv4(),
          companyId: company.id,
          employeeNumber: `CONF${1000 + i}`,
          firstName: `ConflictEmployee${i}`,
          lastName: 'Test',
          email: `conflict${i}@test.com`,
          emailIv: 'test-iv-32chars-placeholder-val',
          emailTag: 'test-tag-32chars-placeholder',
          phone: `555-030${i}`,
          phoneIv: 'test-iv-32chars-placeholder-val',
          phoneTag: 'test-tag-32chars-placeholder',
          address: { street: 'Test Address' },
          basicSalary: '45000',
          basicSalaryIv: 'test-iv-32chars-placeholder-val',
          basicSalaryTag: 'test-tag-32chars-placeholder',
          hraAmount: '4500',
          hraAmountIv: 'test-iv-32chars-placeholder-val',
          hraAmountTag: 'test-tag-32chars-placeholder',
          otherAllowances: '1500',
          otherAllowancesIv: 'test-iv-32chars-placeholder-val',
          otherAllowancesTag: 'test-tag-32chars-placeholder',
          grossSalary: '51000',
          grossSalaryIv: 'test-iv-32chars-placeholder-val',
          grossSalaryTag: 'test-tag-32chars-placeholder',
          salaryType: 'MONTHLY',
          bankName: 'Test Bank Limited',
          bankNameIv: 'test-iv-32chars-placeholder-val',
          bankNameTag: 'test-tag-32chars-placeholder',
          accountNumber: `87654321${String(i).padStart(2, '0')}`,
          accountNumberIv: 'test-iv-32chars-placeholder-val',
          accountNumberTag: 'test-tag-32chars-placeholder',
          ifscCode: 'TEST0123456',
          ifscCodeIv: 'test-iv-32chars-placeholder-val',
          ifscCodeTag: 'test-tag-32chars-placeholder',
          accountType: 'SAVINGS',
          epfApplicable: true,
          esicApplicable: true,
          ptApplicable: true,
          tdsApplicable: true,
          dateOfBirth: new Date('1990-01-01'),
          certifications: { security: true, conflict: true },
          skills: ['security'],
          employmentStatus: 'ACTIVE',
          hireDate: new Date(),
          metadata: { training: 'completed', clearance: 'active' },
        }
      });
      employees.push(employee);
    }

    // Create conflicting assignments based on probability
    const conflictingAssignments = [];
    
    if (Math.random() < scenario.conflictProbability && employees.length > 0 && sites.length >= 2) {
      // Create double booking scenario - same employee assigned to multiple sites
      const conflictEmployee = employees[0];
      
      const assignment1 = await this.prisma.assignment.create({
        data: {
          id: uuidv4(),
          employeeId: conflictEmployee.id,
          siteId: sites[0].id,
          role: 'Security Guard',
          responsibilities: {},
          hourlyRate: '25.0',
          hourlyRateIv: 'test-iv',
          hourlyRateTag: 'test-tag',
          status: 'ACTIVE',
          startDate: new Date(),
        }
      });
      
      const assignment2 = await this.prisma.assignment.create({
        data: {
          id: uuidv4(),
          employeeId: conflictEmployee.id,
          siteId: sites[1].id,
          role: 'Security Guard',
          responsibilities: {},
          hourlyRate: '25.0',
          hourlyRateIv: 'test-iv',
          hourlyRateTag: 'test-tag',
          status: 'ACTIVE',
          startDate: new Date(),
        }
      });
      
      conflictingAssignments.push(assignment1, assignment2);
    }

    return { company, client, contract, sites, employees, conflictingAssignments };
  }

  async createEfficiencyScenario(scenario: EfficiencyScenario) {
    const company = await this.prisma.company.create({
      data: {
        id: uuidv4(),
        name: scenario.companyName,
        slug: scenario.companyName.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-efficiency-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
        settings: {},
        branding: {}
      }
    });

    // Create basic data for efficiency calculations
    const client = await this.prisma.client.create({
      data: {
        id: uuidv4(),
        companyId: company.id,
        name: `${scenario.companyName} Client`,
        contactEmail: `efficiency@${scenario.companyName.toLowerCase()}.com`,
        contactInfo: {}
      }
    });

    // Create contract for the client
    const contract = await this.prisma.contract.create({
      data: {
        id: uuidv4(),
        clientId: client.id,
        contractNumber: `CONT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        title: `${scenario.companyName} Efficiency Service Agreement`,
        status: 'ACTIVE',
        startDate: new Date(),
        endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        billingPreferences: {
          frequency: 'MONTHLY',
          method: 'PORTAL',
          paymentTerms: 30
        },
        serviceDefinitions: { services: ['security'] }
      }
    });

    // Create sites and assignments to target the efficiency goal
    for (let i = 0; i < scenario.siteCount; i++) {
      const site = await this.prisma.site.create({
        data: {
          id: uuidv4(),
          contractId: contract.id,
          name: `Efficiency Site ${i + 1}`,
          address: {},
          accessRequirements: {},
          safetyProtocols: {},
          operationalStatus: 'ACTIVE',
          contactInfo: {}
        }
      });

      // Create employee and assignment for efficiency testing
      if (i < scenario.employeeCount) {
        const employee = await this.prisma.employee.create({
          data: {
            id: uuidv4(),
            companyId: company.id,
            employeeNumber: `EFF${1000 + i}`,
            firstName: `EfficiencyEmployee${i}`,
            lastName: 'Test',
            email: `efficiency${i}@test.com`,
            emailIv: 'test-iv-32chars-placeholder-val',
            emailTag: 'test-tag-32chars-placeholder',
            phone: `555-040${i}`,
            phoneIv: 'test-iv-32chars-placeholder-val',
            phoneTag: 'test-tag-32chars-placeholder',
            address: { street: 'Efficiency Street' },
            basicSalary: '45000',
            basicSalaryIv: 'test-iv-32chars-placeholder-val',
            basicSalaryTag: 'test-tag-32chars-placeholder',
            hraAmount: '4500',
            hraAmountIv: 'test-iv-32chars-placeholder-val',
            hraAmountTag: 'test-tag-32chars-placeholder',
            otherAllowances: '1500',
            otherAllowancesIv: 'test-iv-32chars-placeholder-val',
            otherAllowancesTag: 'test-tag-32chars-placeholder',
            grossSalary: '51000',
            grossSalaryIv: 'test-iv-32chars-placeholder-val',
            grossSalaryTag: 'test-tag-32chars-placeholder',
            salaryType: 'MONTHLY',
            bankName: 'Test Bank Limited',
            bankNameIv: 'test-iv-32chars-placeholder-val',
            bankNameTag: 'test-tag-32chars-placeholder',
            accountNumber: `55667788${String(i).padStart(2, '0')}`,
            accountNumberIv: 'test-iv-32chars-placeholder-val',
            accountNumberTag: 'test-tag-32chars-placeholder',
            ifscCode: 'TEST0123456',
            ifscCodeIv: 'test-iv-32chars-placeholder-val',
            ifscCodeTag: 'test-tag-32chars-placeholder',
            accountType: 'SAVINGS',
            epfApplicable: true,
            esicApplicable: true,
            ptApplicable: true,
            tdsApplicable: true,
            dateOfBirth: new Date('1990-01-01'),
            certifications: { security: true, efficiency: true },
            skills: ['security'],
            employmentStatus: 'ACTIVE',
            hireDate: new Date(),
            metadata: { training: 'completed', clearance: 'active' },
          }
        });

        await this.prisma.assignment.create({
          data: {
            id: uuidv4(),
            employeeId: employee.id,
            siteId: site.id,
            role: 'Security Guard',
            responsibilities: {},
            hourlyRate: '25.0',
            hourlyRateIv: 'test-iv',
            hourlyRateTag: 'test-tag',
            status: 'ACTIVE',
            startDate: new Date(),
          }
        });
      }
    }

    return { company };
  }

  async createRecommendationScenario(scenario: RecommendationScenario) {
    const company = await this.prisma.company.create({
      data: {
        id: uuidv4(),
        name: scenario.companyName,
        slug: scenario.companyName.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-recommendation-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
        settings: {},
        branding: {}
      }
    });

    const client = await this.prisma.client.create({
      data: {
        id: uuidv4(),
        companyId: company.id,
        name: `${scenario.companyName} Client`,
        contactEmail: `recommendation@${scenario.companyName.toLowerCase()}.com`,
        contactInfo: {}
      }
    });

    // Create contract for the client
    const contract = await this.prisma.contract.create({
      data: {
        id: uuidv4(),
        clientId: client.id,
        contractNumber: `CONT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        title: `${scenario.companyName} Recommendation Service Agreement`,
        status: 'ACTIVE',
        startDate: new Date(),
        endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        billingPreferences: {
          frequency: 'MONTHLY',
          method: 'PORTAL',
          paymentTerms: 30
        },
        serviceDefinitions: { services: ['security'] }
      }
    });

    const site = await this.prisma.site.create({
      data: {
        id: uuidv4(),
        contractId: contract.id,
        name: scenario.siteName,
        address: {},
        accessRequirements: {},
        safetyProtocols: {},
        operationalStatus: 'ACTIVE',
        contactInfo: {}
      }
    });

    const availableGuards = [];
    for (let i = 0; i < scenario.availableGuardCount; i++) {
      const guard = await this.prisma.employee.create({
        data: {
          id: uuidv4(),
          companyId: company.id,
          employeeNumber: `REC${1000 + i}`,
          firstName: `RecommendationGuard${i}`,
          lastName: 'Test',
          email: `recommendation${i}@test.com`,
          emailIv: 'test-iv-32chars-placeholder-val',
          emailTag: 'test-tag-32chars-placeholder',
          phone: `555-050${i}`,
          phoneIv: 'test-iv-32chars-placeholder-val',
          phoneTag: 'test-tag-32chars-placeholder',
          address: { street: 'Recommendation Street' },
          basicSalary: '45000',
          basicSalaryIv: 'test-iv-32chars-placeholder-val',
          basicSalaryTag: 'test-tag-32chars-placeholder',
          hraAmount: '4500',
          hraAmountIv: 'test-iv-32chars-placeholder-val',
          hraAmountTag: 'test-tag-32chars-placeholder',
          otherAllowances: '1500',
          otherAllowancesIv: 'test-iv-32chars-placeholder-val',
          otherAllowancesTag: 'test-tag-32chars-placeholder',
          grossSalary: '51000',
          grossSalaryIv: 'test-iv-32chars-placeholder-val',
          grossSalaryTag: 'test-tag-32chars-placeholder',
          salaryType: 'MONTHLY',
          bankName: 'Test Bank Limited',
          bankNameIv: 'test-iv-32chars-placeholder-val',
          bankNameTag: 'test-tag-32chars-placeholder',
          accountNumber: `99887766${String(i).padStart(2, '0')}`,
          accountNumberIv: 'test-iv-32chars-placeholder-val',
          accountNumberTag: 'test-tag-32chars-placeholder',
          ifscCode: 'TEST0123456',
          ifscCodeIv: 'test-iv-32chars-placeholder-val',
          ifscCodeTag: 'test-tag-32chars-placeholder',
          accountType: 'SAVINGS',
          epfApplicable: true,
          esicApplicable: true,
          ptApplicable: true,
          tdsApplicable: true,
          dateOfBirth: new Date('1990-01-01'),
          certifications: { security: true, recommendation: true },
          skills: scenario.requiredSkills.length > 0 ? 
                 scenario.requiredSkills.slice(0, Math.min(2, scenario.requiredSkills.length)) : 
                 ['security'],
          employmentStatus: 'ACTIVE',
          hireDate: new Date(),
          metadata: { training: 'completed', clearance: 'active' },
        }
      });
      availableGuards.push(guard);
    }

    return { company, site, availableGuards };
  }

  async createQuickAssignmentScenario(scenario: QuickAssignmentScenario) {
    const company = await this.prisma.company.create({
      data: {
        id: uuidv4(),
        name: scenario.companyName,
        slug: scenario.companyName.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-quickassign-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
        settings: {},
        branding: {}
      }
    });

    const client = await this.prisma.client.create({
      data: {
        id: uuidv4(),
        companyId: company.id,
        name: `${scenario.companyName} Client`,
        contactEmail: `quickassign@${scenario.companyName.toLowerCase()}.com`,
        contactInfo: {}
      }
    });

    // Create contract for the client
    const contract = await this.prisma.contract.create({
      data: {
        id: uuidv4(),
        clientId: client.id,
        contractNumber: `CONT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        title: `${scenario.companyName} QuickAssign Service Agreement`,
        status: 'ACTIVE',
        startDate: new Date(),
        endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        billingPreferences: {
          frequency: 'MONTHLY',
          method: 'PORTAL',
          paymentTerms: 30
        },
        serviceDefinitions: { services: ['security'] }
      }
    });

    const site = await this.prisma.site.create({
      data: {
        id: uuidv4(),
        contractId: contract.id,
        name: scenario.siteName,
        address: {},
        accessRequirements: {},
        safetyProtocols: {},
        operationalStatus: 'ACTIVE',
        contactInfo: {}
      }
    });

    let availableGuard = null;
    if (scenario.hasAvailableGuard) {
      availableGuard = await this.prisma.employee.create({
        data: {
          id: uuidv4(),
          companyId: company.id,
          employeeNumber: 'QA1000',
          firstName: 'QuickAssignGuard',
          lastName: 'Test',
          email: 'quickassign@test.com',
          emailIv: 'test-iv-32chars-placeholder-val',
          emailTag: 'test-tag-32chars-placeholder',
          phone: '555-060000',
          phoneIv: 'test-iv-32chars-placeholder-val',
          phoneTag: 'test-tag-32chars-placeholder',
          address: { street: 'Quick Assign Street' },
          basicSalary: '45000',
          basicSalaryIv: 'test-iv-32chars-placeholder-val',
          basicSalaryTag: 'test-tag-32chars-placeholder',
          hraAmount: '4500',
          hraAmountIv: 'test-iv-32chars-placeholder-val',
          hraAmountTag: 'test-tag-32chars-placeholder',
          otherAllowances: '1500',
          otherAllowancesIv: 'test-iv-32chars-placeholder-val',
          otherAllowancesTag: 'test-tag-32chars-placeholder',
          grossSalary: '51000',
          grossSalaryIv: 'test-iv-32chars-placeholder-val',
          grossSalaryTag: 'test-tag-32chars-placeholder',
          salaryType: 'MONTHLY',
          bankName: 'Test Bank Limited',
          bankNameIv: 'test-iv-32chars-placeholder-val',
          bankNameTag: 'test-tag-32chars-placeholder',
          accountNumber: '1122334455',
          accountNumberIv: 'test-iv-32chars-placeholder-val',
          accountNumberTag: 'test-tag-32chars-placeholder',
          ifscCode: 'TEST0123456',
          ifscCodeIv: 'test-iv-32chars-placeholder-val',
          ifscCodeTag: 'test-tag-32chars-placeholder',
          accountType: 'SAVINGS',
          epfApplicable: true,
          esicApplicable: true,
          ptApplicable: true,
          tdsApplicable: true,
          dateOfBirth: new Date('1990-01-01'),
          certifications: { security: true, quickAssign: true },
          skills: scenario.guardSkills,
          employmentStatus: 'ACTIVE',
          hireDate: new Date(),
          metadata: { training: 'completed', clearance: 'active' },
        }
      });
    }

    return { company, site, availableGuard };
  }

  async cleanup() {
    // Clean up test data in reverse dependency order
    await this.prisma.assignment.deleteMany({});
    await this.prisma.shift.deleteMany({});
    await this.prisma.attendance.deleteMany({});
    await this.prisma.employee.deleteMany({});
    await this.prisma.site.deleteMany({});
    await this.prisma.contract.deleteMany({});
    await this.prisma.client.deleteMany({});
    await this.prisma.company.deleteMany({});
  }
}