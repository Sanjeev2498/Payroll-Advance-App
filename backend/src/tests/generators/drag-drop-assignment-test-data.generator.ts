import { PrismaService } from '../../prisma/prisma.service';
import * as fc from 'fast-check';
import { v4 as uuidv4 } from 'uuid';

export interface DragDropAssignmentScenario {
  companyName: string;
  siteCount: number;
  employeeCount: number;
  existingAssignmentCount: number;
  dragDropOperations: DragDropOperation[];
  skillRequirements: SkillRequirement[];
}

export interface DragDropOperation {
  type: 'assign' | 'reassign' | 'remove' | 'swap';
  sourceEmployeeId?: string;
  targetEmployeeId?: string;
  siteId: string;
  role?: string;
  shiftPattern?: string;
  priority?: number;
}

export interface SkillRequirement {
  siteId: string;
  requiredSkills: string[];
  requiredCertifications: string[];
  minimumExperience?: number;
}

export interface AssignmentConstraint {
  maxAssignmentsPerEmployee: number;
  maxHoursPerWeek: number;
  preventDoubleBooking: boolean;
  requireSkillMatch: boolean;
  requireCertificationMatch: boolean;
}

export interface AssignmentValidationScenario {
  companyName: string;
  sites: SiteSpec[];
  employees: EmployeeSpec[];
  constraints: AssignmentConstraint;
  operations: DragDropOperation[];
}

export interface SiteSpec {
  name: string;
  requiredSkills: string[];
  requiredCertifications: string[];
  shiftPattern: string;
  maxGuards: number;
}

export interface EmployeeSpec {
  name: string;
  skills: string[];
  certifications: string[];
  availability: string[];
  currentAssignments: number;
}

export class DragDropAssignmentTestDataGenerator {
  constructor(private prisma: PrismaService) {}

  dragDropAssignmentScenarioGenerator() {
    return fc.record<DragDropAssignmentScenario>({
      companyName: fc.string({ minLength: 5, maxLength: 30 }).filter(s => 
        s.trim().length > 0 && /^[a-zA-Z0-9\s]+$/.test(s.trim())
      ),
      siteCount: fc.integer({ min: 2, max: 8 }),
      employeeCount: fc.integer({ min: 3, max: 15 }),
      existingAssignmentCount: fc.integer({ min: 0, max: 5 }),
      dragDropOperations: fc.array(this.dragDropOperationGenerator(), { minLength: 1, maxLength: 5 }),
      skillRequirements: fc.array(this.skillRequirementGenerator(), { minLength: 1, maxLength: 3 })
    });
  }

  dragDropOperationGenerator() {
    return fc.record<DragDropOperation>({
      type: fc.constantFrom('assign', 'reassign', 'remove', 'swap'),
      siteId: fc.string({ minLength: 1, maxLength: 50 }),
      role: fc.option(fc.constantFrom('Security Guard', 'Supervisor', 'Patrol Officer', 'Reception')),
      shiftPattern: fc.option(fc.constantFrom('day', 'night', 'rotating', 'weekend')),
      priority: fc.option(fc.integer({ min: 1, max: 5 }))
    });
  }

  skillRequirementGenerator() {
    return fc.record<SkillRequirement>({
      siteId: fc.string({ minLength: 1, maxLength: 50 }),
      requiredSkills: fc.array(
        fc.constantFrom('security', 'surveillance', 'patrol', 'emergency_response', 'customer_service', 'access_control'),
        { minLength: 0, maxLength: 4 }
      ),
      requiredCertifications: fc.array(
        fc.constantFrom('security_license', 'first_aid', 'cpr', 'firearms', 'crowd_control'),
        { minLength: 0, maxLength: 3 }
      ),
      minimumExperience: fc.option(fc.integer({ min: 0, max: 60 })) // months
    });
  }

  assignmentValidationScenarioGenerator() {
    return fc.record<AssignmentValidationScenario>({
      companyName: fc.string({ minLength: 5, maxLength: 30 }).filter(s => 
        s.trim().length > 0 && /^[a-zA-Z0-9\s]+$/.test(s.trim())
      ),
      sites: fc.array(this.siteSpecGenerator(), { minLength: 2, maxLength: 6 }),
      employees: fc.array(this.employeeSpecGenerator(), { minLength: 3, maxLength: 12 }),
      constraints: this.assignmentConstraintGenerator(),
      operations: fc.array(this.dragDropOperationGenerator(), { minLength: 1, maxLength: 8 })
    });
  }

  siteSpecGenerator() {
    return fc.record<SiteSpec>({
      name: fc.string({ minLength: 5, maxLength: 50 }).filter(s => 
        s.trim().length > 0 && /^[a-zA-Z0-9\s]+$/.test(s.trim())
      ),
      requiredSkills: fc.array(
        fc.constantFrom('security', 'surveillance', 'patrol', 'emergency_response', 'customer_service'),
        { minLength: 1, maxLength: 3 }
      ),
      requiredCertifications: fc.array(
        fc.constantFrom('security_license', 'first_aid', 'cpr'),
        { minLength: 0, maxLength: 2 }
      ),
      shiftPattern: fc.constantFrom('day', 'night', 'rotating', 'weekend'),
      maxGuards: fc.integer({ min: 1, max: 5 })
    });
  }

  employeeSpecGenerator() {
    return fc.record<EmployeeSpec>({
      name: fc.string({ minLength: 5, maxLength: 50 }).filter(s => 
        s.trim().length > 0 && /^[a-zA-Z0-9\s]+$/.test(s.trim())
      ),
      skills: fc.array(
        fc.constantFrom('security', 'surveillance', 'patrol', 'emergency_response', 'customer_service', 'access_control'),
        { minLength: 1, maxLength: 4 }
      ),
      certifications: fc.array(
        fc.constantFrom('security_license', 'first_aid', 'cpr', 'firearms'),
        { minLength: 0, maxLength: 3 }
      ),
      availability: fc.array(
        fc.constantFrom('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'),
        { minLength: 2, maxLength: 7 }
      ),
      currentAssignments: fc.integer({ min: 0, max: 3 })
    });
  }

  assignmentConstraintGenerator() {
    return fc.record<AssignmentConstraint>({
      maxAssignmentsPerEmployee: fc.integer({ min: 1, max: 5 }),
      maxHoursPerWeek: fc.integer({ min: 20, max: 60 }),
      preventDoubleBooking: fc.boolean(),
      requireSkillMatch: fc.boolean(),
      requireCertificationMatch: fc.boolean()
    });
  }

  async createDragDropScenario(scenario: DragDropAssignmentScenario) {
    // Create company
    const company = await this.prisma.company.create({
      data: {
        id: uuidv4(),
        name: scenario.companyName,
        slug: scenario.companyName.toLowerCase().replace(/[^a-z0-9]/g, '-') + 
              '-dragdrop-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
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
        contactEmail: `dragdrop@${scenario.companyName.toLowerCase()}.com`,
        contactInfo: {
          phone: '555-0100',
          address: '100 Drag Drop Ave'
        },
        contractStatus: 'ACTIVE',
        contractStart: new Date(),
        contractEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        billingPreferences: {}
      }
    });

    // Create sites with skill requirements
    const sites = [];
    for (let i = 0; i < scenario.siteCount; i++) {
      const skillReq = scenario.skillRequirements.find(sr => sr.siteId === `site-${i}`) || {
        siteId: `site-${i}`,
        requiredSkills: ['security'],
        requiredCertifications: []
      };

      const site = await this.prisma.site.create({
        data: {
          id: uuidv4(),
          clientId: client.id,
          name: `DragDrop Site ${i + 1}`,
          address: {
            street: `${300 + i} Site Street`,
            city: 'DragDrop City',
            state: 'DD',
            zipCode: `3000${i}`
          },
          accessRequirements: {
            keycard: true,
            backgroundCheck: true
          },
          safetyProtocols: {
            checkIn: true,
            emergency: '911'
          },
          operationalStatus: 'ACTIVE',
          contactInfo: {
            phone: `555-030${i}`,
            email: `site${i}@dragdrop.com`
          }
        }
      });
      sites.push(site);
    }

    // Create employees with varied skills and certifications
    const employees = [];
    const skillPool = ['security', 'surveillance', 'patrol', 'emergency_response', 'customer_service', 'access_control'];
    const certPool = ['security_license', 'first_aid', 'cpr', 'firearms', 'crowd_control'];

    for (let i = 0; i < scenario.employeeCount; i++) {
      const employeeSkills = skillPool.slice(0, Math.min(3, skillPool.length));
      const employeeCerts = certPool.slice(0, Math.min(2, certPool.length));

      const employee = await this.prisma.employee.create({
        data: {
          id: uuidv4(),
          companyId: company.id,
          employeeNumber: `DD${1000 + i}`,
          firstName: `DragDropEmployee${i}`,
          lastName: 'Test',
          email: `dragdrop${i}@test.com`,
          phone: `555-040${i}`,
          address: {
            street: `${400 + i} Employee St`,
            city: 'Employee City',
            state: 'EC',
            zipCode: `4000${i}`
          },
          certifications: {
            [employeeCerts[0] || 'security_license']: true,
            ...(employeeCerts[1] && { [employeeCerts[1]]: true })
          },
          skills: employeeSkills,
          employmentStatus: 'ACTIVE',
          hireDate: new Date(Date.now() - Math.floor(Math.random() * 365 * 24 * 60 * 60 * 1000))
        }
      });
      employees.push(employee);
    }

    // Create existing assignments
    const existingAssignments = [];
    const assignmentCount = Math.min(scenario.existingAssignmentCount, sites.length, employees.length);
    
    for (let i = 0; i < assignmentCount; i++) {
      const assignment = await this.prisma.assignment.create({
        data: {
          id: uuidv4(),
          employeeId: employees[i].id,
          siteId: sites[i].id,
          role: 'Security Guard',
          responsibilities: {
            patrol: true,
            monitoring: true,
            reporting: true,
            shiftPattern: 'day',
            priority: Math.floor(Math.random() * 5) + 1,
            assignmentSource: 'existing'
          },
          hourlyRate: (22.0 + Math.random() * 18).toString(), // $22-40/hour as string
          hourlyRateIv: 'test-iv',
          hourlyRateTag: 'test-tag',
          status: 'ACTIVE',
          startDate: new Date()
        }
      });
      existingAssignments.push(assignment);
    }

    return { 
      company, 
      client, 
      sites, 
      employees, 
      existingAssignments, 
      operations: scenario.dragDropOperations,
      skillRequirements: scenario.skillRequirements
    };
  }

  async createValidationScenario(scenario: AssignmentValidationScenario) {
    // Create company
    const company = await this.prisma.company.create({
      data: {
        id: uuidv4(),
        name: scenario.companyName,
        slug: scenario.companyName.toLowerCase().replace(/[^a-z0-9]/g, '-') + 
              '-validation-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
        settings: {
          constraints: scenario.constraints
        },
        branding: {}
      }
    });

    // Create client
    const client = await this.prisma.client.create({
      data: {
        id: uuidv4(),
        companyId: company.id,
        name: `${scenario.companyName} Validation Client`,
        contactEmail: `validation@${scenario.companyName.toLowerCase()}.com`,
        contactInfo: {},
        contractStatus: 'ACTIVE',
        contractStart: new Date(),
        contractEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        billingPreferences: {}
      }
    });

    // Create sites based on specifications
    const sites = [];
    for (let i = 0; i < scenario.sites.length; i++) {
      const siteSpec = scenario.sites[i];
      const site = await this.prisma.site.create({
        data: {
          id: uuidv4(),
          clientId: client.id,
          name: siteSpec.name,
          address: {
            street: `${500 + i} Validation Street`,
            city: 'Validation City',
            state: 'VC',
            zipCode: `5000${i}`
          },
          accessRequirements: {},
          safetyProtocols: {},
          operationalStatus: 'ACTIVE',
          contactInfo: {}
        }
      });
      sites.push(site);
    }

    // Create employees based on specifications
    const employees = [];
    for (let i = 0; i < scenario.employees.length; i++) {
      const empSpec = scenario.employees[i];
      
      // Convert certifications array to object format
      const certifications = {};
      empSpec.certifications.forEach(cert => {
        certifications[cert] = true;
      });

      const employee = await this.prisma.employee.create({
        data: {
          id: uuidv4(),
          companyId: company.id,
          employeeNumber: `VAL${1000 + i}`,
          firstName: empSpec.name.split(' ')[0] || `Employee${i}`,
          lastName: empSpec.name.split(' ')[1] || 'Test',
          email: `validation${i}@test.com`,
          phone: `555-050${i}`,
          address: {},
          certifications,
          skills: empSpec.skills,
          employmentStatus: 'ACTIVE',
          hireDate: new Date()
        }
      });
      employees.push(employee);
    }

    return { 
      company, 
      client, 
      sites, 
      employees, 
      constraints: scenario.constraints, 
      operations: scenario.operations 
    };
  }

  async cleanup() {
    // Clean up test data in reverse dependency order
    await this.prisma.assignment.deleteMany({});
    await this.prisma.shift.deleteMany({});
    await this.prisma.attendance.deleteMany({});
    await this.prisma.employee.deleteMany({});
    await this.prisma.site.deleteMany({});
    await this.prisma.client.deleteMany({});
    await this.prisma.company.deleteMany({});
  }
}