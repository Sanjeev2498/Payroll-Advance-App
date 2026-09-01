import { PrismaClient, UserRole, ContractStatus, EmploymentStatus, ClientOrganizationType } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
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
  await prisma.employees.deleteMany({});
  await prisma.users.deleteMany({});
  await prisma.sites.deleteMany({});
  await prisma.clients.deleteMany({});
  await prisma.companies.deleteMany({});

  console.log('✅ Cleared existing data');

  // Create a demo company
  const company = await prisma.companies.create({
    data: {
      id: crypto.randomUUID(),
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
      },
      created_at: new Date(),
      updated_at: new Date(),
    }
  });

  console.log(`✅ Created company: ${company.name} (ID: ${company.id})`);

  // Create admin user
  const hashedPassword = await bcrypt.hash('admin123', 12);
  const adminUser = await prisma.users.create({
    data: {
      id: crypto.randomUUID(),
      company_id: company.id,
      email: 'admin@demosecurity.co.in',
      first_name: 'System',
      last_name: 'Administrator',
      password_hash: hashedPassword,
      role: UserRole.COMPANY_ADMIN,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    }
  });

  console.log(`✅ Created admin user: ${adminUser.email}`);

  // Create supervisor user
  const supervisorUser = await prisma.users.create({
    data: {
      id: crypto.randomUUID(),
      company_id: company.id,
      email: 'supervisor@demosecurity.co.in',
      first_name: 'Rahul',
      last_name: 'Sharma',
      password_hash: hashedPassword, // Same password for demo: admin123
      role: UserRole.SUPERVISOR,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    }
  });

  console.log(`✅ Created supervisor user: ${supervisorUser.email}`);

  // Create employee user 1
  const employeeUser1 = await prisma.users.create({
    data: {
      id: crypto.randomUUID(),
      company_id: company.id,
      email: 'arjun.singh@demosecurity.co.in',
      first_name: 'Arjun',
      last_name: 'Singh',
      password_hash: hashedPassword, // Same password for demo: admin123
      role: UserRole.EMPLOYEE,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    }
  });

  // Create employee user 2
  const employeeUser2 = await prisma.users.create({
    data: {
      id: crypto.randomUUID(),
      company_id: company.id,
      email: 'priya.reddy@demosecurity.co.in',
      first_name: 'Priya',
      last_name: 'Reddy',
      password_hash: hashedPassword, // Same password for demo: admin123
      role: UserRole.EMPLOYEE,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    }
  });

  console.log(`✅ Created employee users: ${employeeUser1.email}, ${employeeUser2.email}`);

  // Create a demo client
  const client = await prisma.clients.create({
    data: {
      id: crypto.randomUUID(),
      company_id: company.id,
      name: 'Phoenix MarketCity Mall',
      contact_email: 'security@phoenixmarketcity.com',
      contact_info: {
        primaryContact: 'Priya Sharma',
        phone: '+91 80456-78901',
        address: '142, City Square, Whitefield Road, Bangalore, Karnataka 560066'
      },
      organization_type: 'SHOPPING_MALL' as ClientOrganizationType,
      industry: 'Retail',
      company_size: 'Large',
      created_at: new Date(),
      updated_at: new Date()
    }
  });

  console.log(`✅ Created client: ${client.name}`);

  // Create demo contract for the client
  const contract = await prisma.contracts.create({
    data: {
      client_id: client.id,
      contract_number: 'CON-2024-001',
      title: 'Annual Security Services Contract',
      description: 'Comprehensive security services for mall operations',
      status: 'ACTIVE',
      start_date: new Date(),
      end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
      contract_value: 1200000,
      billing_preferences: {
        billingFrequency: 'MONTHLY',
        serviceLevel: 'STANDARD'
      },
      service_definitions: {
        guardCount: 15,
        shifts: 3,
        coverage: '24x7'
      }
    }
  });

  console.log(`✅ Created contract: ${contract.title}`);

  // Create demo sites for the client
  const site1 = await prisma.sites.create({
    data: {
      id: crypto.randomUUID(),
      client_id: client.id,
      contract_id: contract.id,
      name: 'Main Mall Entrance',
      address: {
        street: '142, City Square, Whitefield Road',
        city: 'Bangalore',
        state: 'Karnataka',
        zipCode: '560066',
        building: 'Phoenix MarketCity'
      },
      access_requirements: {
        securityClearance: 'Basic',
        uniformRequired: true,
        equipmentProvided: ['radio', 'flashlight']
      },
      safety_protocols: {
        emergencyContacts: ['+91 80100-08080'],
        evacuationPlan: 'Plan A',
        hazardTypes: ['crowd_control']
      },
      contact_info: {
        siteManager: 'Rajesh Kumar',
        phone: '+91 80456-78902'
      },
      created_at: new Date(),
      updated_at: new Date()
    }
  });

  const site2 = await prisma.sites.create({
    data: {
      id: crypto.randomUUID(),
      client_id: client.id,
      contract_id: contract.id,
      name: 'Parking Area',
      address: {
        street: '142, City Square, Whitefield Road',
        city: 'Bangalore',
        state: 'Karnataka', 
        zipCode: '560066',
        building: 'Parking Complex'
      },
      access_requirements: {
        securityClearance: 'Basic',
        uniformRequired: true,
        equipmentProvided: ['radio', 'flashlight', 'vehicle']
      },
      safety_protocols: {
        emergencyContacts: ['+91 80100-08080'],
        evacuationPlan: 'Plan B',
        hazardTypes: ['vehicle_traffic']
      },
      contact_info: {
        siteManager: 'Sunita Patel',
        phone: '+91 80456-78903'
      },
      created_at: new Date(),
      updated_at: new Date()
    }
  });

  console.log(`✅ Created sites: ${site1.name}, ${site2.name}`);

  // Create demo employees
  const employee1 = await prisma.employees.create({
    data: {
      id: crypto.randomUUID(),
      company_id: company.id,
      employee_number: 'EMP001',
      first_name: 'Arjun',
      last_name: 'Singh',
      email: 'arjun.singh@demosecurity.co.in',
      phone: '+91 98765-43210',
      aadhaar_number: '123456789012', // Valid 12-digit Aadhaar
      pan_number: 'ABCDE1234F',       // Valid PAN format
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
      employment_status: EmploymentStatus.ACTIVE,
      hire_date: new Date('2023-06-15'),
      created_at: new Date(),
      updated_at: new Date()
    }
  });

  const employee2 = await prisma.employees.create({
    data: {
      id: crypto.randomUUID(),
      company_id: company.id,
      employee_number: 'EMP002',
      first_name: 'Priya',
      last_name: 'Reddy',
      email: 'priya.reddy@demosecurity.co.in',
      phone: '+91 87654-32109',
      aadhaar_number: '987654321098', // Valid 12-digit Aadhaar  
      pan_number: 'FGHIJ5678K',       // Valid PAN format
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
      employment_status: EmploymentStatus.ACTIVE,
      hire_date: new Date('2023-08-01'),
      created_at: new Date(),
      updated_at: new Date()
    }
  });

  // Create additional employees for more realistic data
  const employee3 = await prisma.employees.create({
    data: {
      id: crypto.randomUUID(),
      company_id: company.id,
      employee_number: 'EMP003',
      first_name: 'Rajesh',
      last_name: 'Kumar',
      email: 'rajesh.kumar@demosecurity.co.in',
      phone: '+91 76543-21098',
      aadhaar_number: '456789012345',
      pan_number: 'LMNOP9876Q',
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
      employment_status: EmploymentStatus.ACTIVE,
      hire_date: new Date('2023-09-15'),
      created_at: new Date(),
      updated_at: new Date()
    }
  });

  const employee4 = await prisma.employees.create({
    data: {
      id: crypto.randomUUID(),
      company_id: company.id,
      employee_number: 'EMP004',
      first_name: 'Sneha',
      last_name: 'Patel',
      email: 'sneha.patel@demosecurity.co.in',
      phone: '+91 65432-10987',
      aadhaar_number: '567890123456',
      pan_number: 'RSTUV5432W',
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
      employment_status: EmploymentStatus.ACTIVE,
      hire_date: new Date('2023-05-01'),
      created_at: new Date(),
      updated_at: new Date()
    }
  });

  const employee5 = await prisma.employees.create({
    data: {
      id: crypto.randomUUID(),
      company_id: company.id,
      employee_number: 'EMP005',
      first_name: 'Vikash',
      last_name: 'Singh',
      email: 'vikash.singh@demosecurity.co.in',
      phone: '+91 54321-09876',
      aadhaar_number: '678901234567',
      pan_number: 'WXYZ4321X',
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
      employment_status: EmploymentStatus.ON_LEAVE,
      hire_date: new Date('2023-07-01'),
      created_at: new Date(),
      updated_at: new Date()
    }
  });

  const employee6 = await prisma.employees.create({
    data: {
      id: crypto.randomUUID(),
      company_id: company.id,
      employee_number: 'EMP006',
      first_name: 'Anjali',
      last_name: 'Reddy',
      email: 'anjali.reddy@demosecurity.co.in',
      phone: '+91 43210-98765',
      aadhaar_number: '789012345678',
      pan_number: 'ABCD6789Y',
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
      employment_status: EmploymentStatus.INACTIVE,
      hire_date: new Date('2023-10-01'),
      created_at: new Date(),
      updated_at: new Date()
    }
  });

  console.log(`✅ Created employees: ${employee1.first_name} ${employee1.last_name}, ${employee2.first_name} ${employee2.last_name}, ${employee3.first_name} ${employee3.last_name}, ${employee4.first_name} ${employee4.last_name}, ${employee5.first_name} ${employee5.last_name}, ${employee6.first_name} ${employee6.last_name}`);

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