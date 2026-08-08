import { PrismaClient, UserRole, ContractStatus, EmploymentStatus, ClientOrganizationType } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

// Create PostgreSQL connection pool for Prisma 7.x
const connectionString = process.env.DATABASE_URL || 'postgresql://payroll_user:payroll_pass_dev_123@localhost:5432/payroll_system_dev';
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({
  adapter,
});

async function main() {
  console.log('🌱 Starting database seeding...');

  // Clear existing data first (for clean seeding)
  await prisma.employee.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.site.deleteMany({});
  await prisma.client.deleteMany({});
  await prisma.company.deleteMany({});

  console.log('✅ Cleared existing data');

  // Create a demo company
  const company = await prisma.company.create({
    data: {
      name: 'Demo Security Services',
      slug: 'demo-security',
      settings: {
        timezone: 'Asia/Kolkata',
        dateFormat: 'dd/MM/yyyy',
        currency: 'INR'
      },
      branding: {
        primaryColor: '#1E40AF',
        logo: null,
        companyAddress: '123 Security Tower, MG Road, Bangalore, Karnataka 560001'
      }
    }
  });

  console.log(`✅ Created company: ${company.name} (ID: ${company.id})`);

  // Create admin user
  const hashedPassword = await bcrypt.hash('admin123', 12);
  const adminUser = await prisma.user.create({
    data: {
      companyId: company.id,
      email: 'admin@demosecurity.co.in',
      firstName: 'System',
      lastName: 'Administrator',
      passwordHash: hashedPassword,
      role: UserRole.COMPANY_ADMIN,
      isActive: true
    }
  });

  console.log(`✅ Created admin user: ${adminUser.email}`);

  // Create supervisor user
  const supervisorUser = await prisma.user.create({
    data: {
      companyId: company.id,
      email: 'supervisor@demosecurity.co.in',
      firstName: 'Rahul',
      lastName: 'Sharma',
      passwordHash: hashedPassword, // Same password for demo: admin123
      role: UserRole.SUPERVISOR,
      isActive: true
    }
  });

  console.log(`✅ Created supervisor user: ${supervisorUser.email}`);

  // Create employee user 1
  const employeeUser1 = await prisma.user.create({
    data: {
      companyId: company.id,
      email: 'arjun.singh@demosecurity.co.in',
      firstName: 'Arjun',
      lastName: 'Singh',
      passwordHash: hashedPassword, // Same password for demo: admin123
      role: UserRole.EMPLOYEE,
      isActive: true
    }
  });

  // Create employee user 2
  const employeeUser2 = await prisma.user.create({
    data: {
      companyId: company.id,
      email: 'priya.reddy@demosecurity.co.in',
      firstName: 'Priya',
      lastName: 'Reddy',
      passwordHash: hashedPassword, // Same password for demo: admin123
      role: UserRole.EMPLOYEE,
      isActive: true
    }
  });

  console.log(`✅ Created employee users: ${employeeUser1.email}, ${employeeUser2.email}`);

  // Create a demo client
  const client = await prisma.client.create({
    data: {
      companyId: company.id,
      name: 'Phoenix MarketCity Mall',
      contactEmail: 'security@phoenixmarketcity.com',
      contactInfo: {
        primaryContact: 'Priya Sharma',
        phone: '+91 80456-78901',
        address: '142, City Square, Whitefield Road, Bangalore, Karnataka 560066'
      },
      organizationType: 'SHOPPING_MALL' as ClientOrganizationType,
      industry: 'Retail',
      companySize: 'Large'
    }
  });

  console.log(`✅ Created client: ${client.name}`);

  // Create demo contract for the client
  const contract = await prisma.contract.create({
    data: {
      client: {
        connect: { id: client.id }
      },
      contractNumber: 'CON-2024-001',
      title: 'Annual Security Services Contract',
      description: 'Comprehensive security services for mall operations',
      status: 'ACTIVE',
      startDate: new Date(),
      endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
      contractValue: 1200000,
      billingPreferences: {
        billingFrequency: 'MONTHLY',
        serviceLevel: 'STANDARD'
      },
      serviceDefinitions: {
        guardCount: 15,
        shifts: 3,
        coverage: '24x7'
      }
    }
  });

  console.log(`✅ Created contract: ${contract.title}`);

  // Create demo sites for the client
  const site1 = await prisma.site.create({
    data: {
      contractId: contract.id,
      name: 'Main Mall Entrance',
      address: {
        street: '142, City Square, Whitefield Road',
        city: 'Bangalore',
        state: 'Karnataka',
        zipCode: '560066',
        building: 'Phoenix MarketCity'
      },
      accessRequirements: {
        securityClearance: 'Basic',
        uniformRequired: true,
        equipmentProvided: ['radio', 'flashlight']
      },
      safetyProtocols: {
        emergencyContacts: ['+91 80100-08080'],
        evacuationPlan: 'Plan A',
        hazardTypes: ['crowd_control']
      },
      contactInfo: {
        siteManager: 'Rajesh Kumar',
        phone: '+91 80456-78902'
      }
    }
  });

  const site2 = await prisma.site.create({
    data: {
      contractId: contract.id,
      name: 'Parking Area',
      address: {
        street: '142, City Square, Whitefield Road',
        city: 'Bangalore',
        state: 'Karnataka', 
        zipCode: '560066',
        building: 'Parking Complex'
      },
      accessRequirements: {
        securityClearance: 'Basic',
        uniformRequired: true,
        equipmentProvided: ['radio', 'flashlight', 'vehicle']
      },
      safetyProtocols: {
        emergencyContacts: ['+91 80100-08080'],
        evacuationPlan: 'Plan B',
        hazardTypes: ['vehicle_traffic']
      },
      contactInfo: {
        siteManager: 'Sunita Patel',
        phone: '+91 80456-78903'
      }
    }
  });

  console.log(`✅ Created sites: ${site1.name}, ${site2.name}`);

  // Create demo employees
  const employee1 = await prisma.employee.create({
    data: {
      companyId: company.id,
      employeeNumber: 'EMP001',
      firstName: 'Arjun',
      lastName: 'Singh',
      email: 'arjun.singh@demosecurity.co.in',
      phone: '+91 98765-43210',
      aadhaarNumber: '123456789012', // Valid 12-digit Aadhaar
      panNumber: 'ABCDE1234F',       // Valid PAN format
      address: {
        street: '45, MG Road',
        city: 'Bangalore',
        state: 'Karnataka',
        zipCode: '560001'
      },
      certifications: {
        securityLicense: {
          number: 'KAR123456',
          expiryDate: '2025-06-30',
          issuingAuthority: 'Karnataka Police'
        },
        firstAid: {
          number: 'FA789012',
          expiryDate: '2025-03-15',
          issuingAuthority: 'Indian Red Cross'
        }
      },
      skills: ['crowd_control', 'emergency_response', 'customer_service'],
      employmentStatus: EmploymentStatus.ACTIVE,
      hireDate: new Date('2023-06-15')
    }
  });

  const employee2 = await prisma.employee.create({
    data: {
      companyId: company.id,
      employeeNumber: 'EMP002',
      firstName: 'Priya',
      lastName: 'Reddy',
      email: 'priya.reddy@demosecurity.co.in',
      phone: '+91 87654-32109',
      aadhaarNumber: '987654321098', // Valid 12-digit Aadhaar  
      panNumber: 'FGHIJ5678K',       // Valid PAN format
      address: {
        street: '78, Brigade Road',
        city: 'Bangalore',
        state: 'Karnataka',
        zipCode: '560025'
      },
      certifications: {
        securityLicense: {
          number: 'KAR654321',
          expiryDate: '2025-08-30',
          issuingAuthority: 'Karnataka Police'
        }
      },
      skills: ['patrol', 'report_writing', 'customer_service'],
      employmentStatus: EmploymentStatus.ACTIVE,
      hireDate: new Date('2023-08-01')
    }
  });

  // Create additional employees for more realistic data
  const employee3 = await prisma.employee.create({
    data: {
      companyId: company.id,
      employeeNumber: 'EMP003',
      firstName: 'Rajesh',
      lastName: 'Kumar',
      email: 'rajesh.kumar@demosecurity.co.in',
      phone: '+91 76543-21098',
      aadhaarNumber: '456789012345',
      panNumber: 'LMNOP9876Q',
      address: {
        street: '22, Commercial Street',
        city: 'Bangalore',
        state: 'Karnataka',
        zipCode: '560001'
      },
      certifications: {
        securityLicense: {
          number: 'KAR789012',
          expiryDate: '2025-12-31',
          issuingAuthority: 'Karnataka Police'
        }
      },
      skills: ['patrol', 'emergency_response', 'access_control'],
      employmentStatus: EmploymentStatus.ACTIVE,
      hireDate: new Date('2023-09-15')
    }
  });

  const employee4 = await prisma.employee.create({
    data: {
      companyId: company.id,
      employeeNumber: 'EMP004',
      firstName: 'Sneha',
      lastName: 'Patel',
      email: 'sneha.patel@demosecurity.co.in',
      phone: '+91 65432-10987',
      aadhaarNumber: '567890123456',
      panNumber: 'RSTUV5432W',
      address: {
        street: '88, Indiranagar',
        city: 'Bangalore',
        state: 'Karnataka',
        zipCode: '560038'
      },
      certifications: {
        securityLicense: {
          number: 'KAR345678',
          expiryDate: '2026-03-15',
          issuingAuthority: 'Karnataka Police'
        },
        supervisorLicense: {
          number: 'SUP123456',
          expiryDate: '2026-06-30',
          issuingAuthority: 'Security Training Institute'
        }
      },
      skills: ['supervision', 'team_leadership', 'incident_management', 'training'],
      employmentStatus: EmploymentStatus.ACTIVE,
      hireDate: new Date('2023-05-01')
    }
  });

  const employee5 = await prisma.employee.create({
    data: {
      companyId: company.id,
      employeeNumber: 'EMP005',
      firstName: 'Vikash',
      lastName: 'Singh',
      email: 'vikash.singh@demosecurity.co.in',
      phone: '+91 54321-09876',
      aadhaarNumber: '678901234567',
      panNumber: 'WXYZ4321X',
      address: {
        street: '12, Koramangala',
        city: 'Bangalore',
        state: 'Karnataka',
        zipCode: '560034'
      },
      certifications: {
        securityLicense: {
          number: 'KAR567890',
          expiryDate: '2024-12-15', // Expiring soon
          issuingAuthority: 'Karnataka Police'
        }
      },
      skills: ['vehicle_patrol', 'parking_management', 'cctv_monitoring'],
      employmentStatus: EmploymentStatus.ON_LEAVE,
      hireDate: new Date('2023-07-01')
    }
  });

  const employee6 = await prisma.employee.create({
    data: {
      companyId: company.id,
      employeeNumber: 'EMP006',
      firstName: 'Anjali',
      lastName: 'Reddy',
      email: 'anjali.reddy@demosecurity.co.in',
      phone: '+91 43210-98765',
      aadhaarNumber: '789012345678',
      panNumber: 'ABCD6789Y',
      address: {
        street: '67, HSR Layout',
        city: 'Bangalore',
        state: 'Karnataka',
        zipCode: '560102'
      },
      certifications: {
        securityLicense: {
          number: 'KAR890123',
          expiryDate: '2024-09-30', // Expired
          issuingAuthority: 'Karnataka Police'
        }
      },
      skills: ['reception_security', 'visitor_management', 'customer_service'],
      employmentStatus: EmploymentStatus.INACTIVE,
      hireDate: new Date('2023-10-01')
    }
  });

  console.log(`✅ Created employees: ${employee1.firstName} ${employee1.lastName}, ${employee2.firstName} ${employee2.lastName}, ${employee3.firstName} ${employee3.lastName}, ${employee4.firstName} ${employee4.lastName}, ${employee5.firstName} ${employee5.lastName}, ${employee6.firstName} ${employee6.lastName}`);

  console.log('🇮🇳 Database seeding completed successfully with Indian localization!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });