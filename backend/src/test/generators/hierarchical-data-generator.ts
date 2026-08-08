import * as fc from 'fast-check';

/**
 * Hierarchical Data Generator for Property-Based Tests
 * 
 * This generator creates valid entity relationships following the proper hierarchy:
 * Company → Client → Contract → Site → Employee → Assignment
 * 
 * This fixes the tenant isolation and foreign key issues in property tests.
 */

// Utility to generate valid dates
const validDateRange = () => fc.date({
  min: new Date(2020, 0, 1),
  max: new Date(2030, 11, 31),
});

// Base entity generators with proper validation
export const companyGenerator = () => fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 3, maxLength: 100 }),
  slug: fc.string({ minLength: 3, maxLength: 50 }).map(s => 
    s.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 50)
  ),
  settings: fc.record({
    timeZone: fc.constantFrom('UTC', 'EST', 'PST', 'MST'),
    dateFormat: fc.constantFrom('YYYY-MM-DD', 'DD/MM/YYYY', 'MM/DD/YYYY'),
    currency: fc.constantFrom('INR', 'EUR', 'GBP', 'USD'),
    workingHours: fc.record({
      start: fc.constantFrom('08:00', '09:00', '10:00'),
      end: fc.constantFrom('17:00', '18:00', '19:00'),
    }),
  }),
  branding: fc.record({
    primaryColor: fc.constantFrom('#1f2937', '#3b82f6', '#10b981', '#f59e0b'),
    secondaryColor: fc.constantFrom('#6b7280', '#93c5fd', '#86efac', '#fcd34d'),
    logo: fc.option(fc.webUrl(), { nil: null }),
    favicon: fc.option(fc.webUrl(), { nil: null }),
    companyDescription: fc.string({ maxLength: 500 }),
    themes: fc.record({
      light: fc.record({
        background: fc.constantFrom('#ffffff', '#f9fafb', '#f3f4f6'),
        text: fc.constantFrom('#111827', '#374151', '#1f2937'),
      }),
      dark: fc.record({
        background: fc.constantFrom('#111827', '#1f2937', '#374151'),
        text: fc.constantFrom('#f9fafb', '#e5e7eb', '#d1d5db'),
      }),
    }),
  }),
  createdAt: validDateRange(),
  updatedAt: validDateRange(),
});

export const clientGenerator = (companyId: string) => fc.record({
  id: fc.uuid(),
  companyId: fc.constant(companyId), // Ensure proper tenant relationship
  name: fc.string({ minLength: 3, maxLength: 100 }),
  contactEmail: fc.emailAddress(),
  contactInfo: fc.record({
    phone: fc.string({ minLength: 10, maxLength: 15 }),
    address: fc.record({
      street: fc.string({ minLength: 5, maxLength: 100 }),
      city: fc.string({ minLength: 2, maxLength: 50 }),
      state: fc.string({ minLength: 2, maxLength: 50 }),
      zipCode: fc.string({ minLength: 5, maxLength: 10 }),
      country: fc.constantFrom('USA', 'Canada', 'UK', 'India'),
    }),
  }),
  organizationType: fc.constantFrom(
    'CORPORATE_OFFICE', 'RESIDENTIAL_SOCIETY', 'HOSPITAL', 
    'SHOPPING_MALL', 'FACTORY', 'WAREHOUSE', 'EDUCATIONAL_INSTITUTION'
  ),
  industry: fc.option(fc.string({ minLength: 3, maxLength: 100 }), { nil: null }),
  companySize: fc.option(fc.constantFrom('SMALL', 'MEDIUM', 'LARGE', 'ENTERPRISE'), { nil: null }),
  tags: fc.array(fc.string({ minLength: 2, maxLength: 20 }), { maxLength: 5 }),
  createdAt: validDateRange(),
  updatedAt: validDateRange(),
});

export const contractGenerator = (clientId: string) => {
  return fc.record({
    id: fc.uuid(),
    clientId: fc.constant(clientId), // Ensure proper relationship
    contractNumber: fc.string({ minLength: 5, maxLength: 20 }).map(s => `CONTRACT-${s}`),
    title: fc.string({ minLength: 10, maxLength: 200 }),
    description: fc.option(fc.string({ minLength: 10, maxLength: 1000 }), { nil: null }),
    status: fc.constantFrom('ACTIVE', 'PENDING', 'EXPIRED', 'TERMINATED'),
    startDate: validDateRange(),
    endDate: fc.option(validDateRange(), { nil: null }),
    serviceDefinitions: fc.record({
      securityServices: fc.array(fc.string({ minLength: 5, maxLength: 50 }), { minLength: 1, maxLength: 5 }),
      coverage: fc.record({
        hours: fc.constantFrom(8, 12, 24),
        days: fc.constantFrom(5, 6, 7),
      }),
    }),
    billingPreferences: fc.record({
      frequency: fc.constantFrom('MONTHLY', 'QUARTERLY', 'ANNUALLY'),
      paymentTerms: fc.constantFrom('NET_15', 'NET_30', 'NET_45', 'NET_60'),
    }),
    contractValue: fc.option(
      fc.float({ min: 10000, max: 1000000 }).map(v => v.toFixed(2)), 
      { nil: null }
    ),
    createdAt: validDateRange(),
    updatedAt: validDateRange(),
  });
};

export const siteGenerator = (contractId: string) => fc.record({
  id: fc.uuid(),
  contractId: fc.constant(contractId), // FIXED: Use contractId instead of clientId
  name: fc.string({ minLength: 3, maxLength: 100 }),
  address: fc.record({
    street: fc.string({ minLength: 5, maxLength: 255 }),
    city: fc.string({ minLength: 2, maxLength: 100 }),
    state: fc.string({ minLength: 2, maxLength: 50 }),
    zipCode: fc.string({ minLength: 5, maxLength: 20 }),
    country: fc.constantFrom('USA', 'Canada', 'UK', 'India'),
    coordinates: fc.option(fc.record({
      latitude: fc.float({ min: -90, max: 90 }),
      longitude: fc.float({ min: -180, max: 180 }),
    }), { nil: null }),
  }),
  operationalStatus: fc.constantFrom('ACTIVE', 'INACTIVE', 'MAINTENANCE', 'SUSPENDED'),
  accessRequirements: fc.option(fc.record({
    securityClearance: fc.option(fc.string({ minLength: 3, maxLength: 50 }), { nil: null }),
    requiredCertifications: fc.option(
      fc.array(fc.string({ minLength: 3, maxLength: 50 }), { maxLength: 5 }),
      { nil: null }
    ),
    accessProcedures: fc.option(fc.string({ minLength: 10, maxLength: 1000 }), { nil: null }),
  }), { nil: null }),
  safetyProtocols: fc.option(fc.record({
    evacuationProcedures: fc.option(fc.string({ minLength: 10, maxLength: 1000 }), { nil: null }),
    hazardMitigation: fc.option(fc.string({ minLength: 10, maxLength: 1000 }), { nil: null }),
  }), { nil: null }),
  contactInfo: fc.option(fc.record({
    primaryContact: fc.option(fc.string({ minLength: 3, maxLength: 100 }), { nil: null }),
    primaryPhone: fc.option(fc.string({ minLength: 10, maxLength: 20 }), { nil: null }),
    primaryEmail: fc.option(fc.emailAddress(), { nil: null }),
    emergencyContact: fc.option(fc.string({ minLength: 3, maxLength: 100 }), { nil: null }),
    emergencyPhone: fc.option(fc.string({ minLength: 10, maxLength: 20 }), { nil: null }),
  }), { nil: null }),
  minStaffingLevel: fc.integer({ min: 1, max: 10 }),
  maxStaffingLevel: fc.option(fc.integer({ min: 1, max: 20 }), { nil: null }),
  createdAt: validDateRange(),
  updatedAt: validDateRange(),
});

export const employeeGenerator = (companyId: string) => fc.record({
  id: fc.uuid(),
  companyId: fc.constant(companyId), // Ensure proper tenant relationship
  employeeNumber: fc.string({ minLength: 5, maxLength: 20 }).map(s => `EMP-${s}`),
  firstName: fc.string({ minLength: 2, maxLength: 50 }),
  lastName: fc.string({ minLength: 2, maxLength: 50 }),
  email: fc.option(fc.emailAddress(), { nil: null }),
  phone: fc.option(fc.string({ minLength: 10, maxLength: 20 }), { nil: null }),
  employmentStatus: fc.constantFrom('ACTIVE', 'INACTIVE', 'TERMINATED', 'ON_LEAVE'),
  hireDate: validDateRange(),
  terminationDate: fc.option(validDateRange(), { nil: null }),
  skills: fc.array(fc.string({ minLength: 3, maxLength: 20 }), { maxLength: 10 }),
  certifications: fc.option(fc.record({
    security: fc.array(fc.string({ minLength: 5, maxLength: 50 }), { maxLength: 5 }),
    safety: fc.array(fc.string({ minLength: 5, maxLength: 50 }), { maxLength: 3 }),
  }), { nil: null }),
  createdAt: validDateRange(),
  updatedAt: validDateRange(),
});

export const assignmentGenerator = (employeeId: string, siteId: string) => fc.record({
  id: fc.uuid(),
  employeeId: fc.constant(employeeId), // Ensure proper relationship
  siteId: fc.constant(siteId), // Ensure proper relationship
  role: fc.constantFrom('Security Guard', 'Senior Guard', 'Supervisor', 'Manager'),
  status: fc.constantFrom('ACTIVE', 'INACTIVE', 'COMPLETED', 'CANCELLED'),
  startDate: validDateRange(),
  endDate: fc.option(validDateRange(), { nil: null }),
  responsibilities: fc.option(fc.record({
    duties: fc.array(fc.string({ minLength: 10, maxLength: 100 }), { minLength: 1, maxLength: 5 }),
    specialInstructions: fc.option(fc.string({ minLength: 10, maxLength: 500 }), { nil: null }),
  }), { nil: null }),
  createdAt: validDateRange(),
  updatedAt: validDateRange(),
});

/**
 * Hierarchical workspace generator that creates complete, valid entity relationships
 */
export const workspaceGenerator = () => {
  return fc.record({
    company: companyGenerator(),
  }).chain(({ company }) =>
    fc.record({
      company: fc.constant(company),
      clients: fc.array(clientGenerator(company.id), { minLength: 1, maxLength: 3 }),
    })
  ).chain(({ company, clients }) => {
    const contractsForClients = clients.map(client =>
      fc.array(contractGenerator(client.id), { minLength: 1, maxLength: 2 })
    );
    
    return fc.tuple(...contractsForClients).map(contractArrays => ({
      company,
      clients: clients.map((client, index) => ({
        ...client,
        contracts: contractArrays[index],
      })),
      // Flatten all contracts for easier access
      allContracts: contractArrays.flat(),
    }));
  }).chain(({ company, clients, allContracts }) => {
    const sitesForContracts = allContracts.map(contract =>
      fc.array(siteGenerator(contract.id), { minLength: 1, maxLength: 2 })
    );
    
    return fc.tuple(...sitesForContracts).map(siteArrays => ({
      company,
      clients,
      allContracts: allContracts.map((contract, index) => ({
        ...contract,
        sites: siteArrays[index],
      })),
      // Flatten all sites for easier access
      allSites: siteArrays.flat(),
    }));
  }).chain(({ company, clients, allContracts, allSites }) =>
    fc.record({
      company: fc.constant(company),
      clients: fc.constant(clients),
      contracts: fc.constant(allContracts),
      sites: fc.constant(allSites),
      employees: fc.array(employeeGenerator(company.id), { minLength: 2, maxLength: 10 }),
    })
  ).chain(({ company, clients, contracts, sites, employees }: any): any => {
    // Generate assignments between employees and sites
    const assignmentGenerators = employees.flatMap(employee =>
      sites.slice(0, Math.min(sites.length, 2)).map(site =>
        assignmentGenerator(employee.id, site.id)
      )
    );
    
    if (assignmentGenerators.length === 0) {
      return fc.constant({
        company,
        clients,
        contracts,
        sites,
        employees,
        assignments: [],
      });
    }
    
    return fc.tuple(...assignmentGenerators).map(assignments => ({
      company,
      clients,
      contracts,
      sites,
      employees,
      assignments,
    }));
  });
};

/**
 * Simplified generators for specific entity creation
 */
export const createSiteDtoGenerator = () => {
  // Generate the full hierarchy to get a valid contractId
  return workspaceGenerator().map((workspace: any) => {
    const contract = workspace.contracts[0]; // Use first contract
    const site = workspace.sites[0]; // Use first site as template
    
    return {
      contractId: contract.id, // FIXED: Use contractId instead of clientId
      name: site.name,
      address: site.address,
      accessRequirements: site.accessRequirements,
      safetyProtocols: site.safetyProtocols,
      operationalStatus: site.operationalStatus,
      contactInfo: site.contactInfo,
      minStaffingLevel: site.minStaffingLevel,
      maxStaffingLevel: site.maxStaffingLevel,
    };
  });
};

export const createEmployeeDtoGenerator = (companyId?: string) => {
  if (companyId) {
    return employeeGenerator(companyId).map(employee => ({
      employeeNumber: employee.employeeNumber,
      firstName: employee.firstName,
      lastName: employee.lastName,
      email: employee.email,
      phone: employee.phone,
      employmentStatus: employee.employmentStatus,
      hireDate: employee.hireDate,
      skills: employee.skills,
      certifications: employee.certifications,
    }));
  }
  
  // Generate with full workspace context
  return workspaceGenerator().map((workspace: any) => {
    const employee = workspace.employees[0];
    
    return {
      employeeNumber: employee.employeeNumber,
      firstName: employee.firstName,
      lastName: employee.lastName,
      email: employee.email,
      phone: employee.phone,
      employmentStatus: employee.employmentStatus,
      hireDate: employee.hireDate,
      skills: employee.skills,
      certifications: employee.certifications,
    };
  });
};

/**
 * Company registration generator with proper branding structure
 */
export const companyRegistrationGenerator = () => fc.record({
  name: fc.string({ minLength: 3, maxLength: 50 }).map(s => s.trim()),
  slug: fc.string({ minLength: 3, maxLength: 20 })
    .map(s => s.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 20))
    .filter(s => s.length >= 3),
  adminUser: fc.record({
    email: fc.emailAddress(),
    firstName: fc.string({ minLength: 2, maxLength: 20 }).map(s => s.trim()),
    lastName: fc.string({ minLength: 2, maxLength: 20 }).map(s => s.trim()),
    password: fc.string({ minLength: 8, maxLength: 50 }),
  }),
  settings: fc.option(fc.record({
    timeZone: fc.constantFrom('UTC', 'EST', 'PST'),
    currency: fc.constantFrom('INR', 'EUR', 'USD'),
  }), { nil: undefined }),
  // FIXED: Ensure branding always has required structure when provided
  branding: fc.option(fc.record({
    primaryColor: fc.constantFrom('#1f2937', '#3b82f6', '#10b981', '#f59e0b'),
    secondaryColor: fc.constantFrom('#6b7280', '#93c5fd', '#86efac', '#fcd34d'),
    logo: fc.option(fc.webUrl(), { nil: null }),
    favicon: fc.option(fc.webUrl(), { nil: null }),
    companyDescription: fc.string({ maxLength: 500 }),
    themes: fc.record({
      light: fc.record({
        background: fc.constantFrom('#ffffff', '#f9fafb'),
        text: fc.constantFrom('#111827', '#374151'),
      }),
      dark: fc.record({
        background: fc.constantFrom('#111827', '#1f2937'),
        text: fc.constantFrom('#f9fafb', '#e5e7eb'),
      }),
    }),
  }), { nil: undefined }),
});

/**
 * Multi-tenant scenario generator for isolation testing
 */
export const multiTenantScenarioGenerator = () => fc.record({
  tenant1: workspaceGenerator(),
  tenant2: workspaceGenerator(),
}).map(({ tenant1, tenant2 }: any) => {
  // Ensure different tenant IDs
  const modifiedTenant2 = {
    ...tenant2,
    company: {
      ...tenant2.company,
      id: tenant2.company.id + '_different', // Ensure different ID
      slug: tenant2.company.slug + '_2', // Ensure different slug
    },
  };
  
  return {
    tenant1,
    tenant2: modifiedTenant2 as any,
  };
});

/**
 * Attendance record generator with valid date ranges
 */
export const attendanceGenerator = (employeeId: string, shiftId: string) => fc.record({
  id: fc.uuid(),
  employeeId: fc.constant(employeeId),
  shiftId: fc.constant(shiftId),
  clockIn: fc.option(validDateRange(), { nil: null }),
  clockOut: fc.option(validDateRange(), { nil: null }),
  status: fc.constantFrom('PENDING', 'PRESENT', 'ABSENT', 'LATE', 'EARLY_DEPARTURE', 'OVERTIME'),
  locationData: fc.option(fc.record({
    latitude: fc.float({ min: -90, max: 90 }),
    longitude: fc.float({ min: -180, max: 180 }),
    accuracy: fc.float({ min: 1, max: 100 }),
  }), { nil: null }),
  notes: fc.option(fc.string({ maxLength: 500 }), { nil: null }),
  createdAt: validDateRange(),
  updatedAt: validDateRange(),
});