import { PrismaClient, UserRole, ContractStatus, EmploymentStatus } from '@prisma/client';
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
      contractStatus: ContractStatus.ACTIVE,
      contractStart: new Date('2024-01-01'),
      contractEnd: new Date('2024-12-31'),
      billingPreferences: {
        invoiceFrequency: 'monthly',
        paymentTerms: 30,
        preferredFormat: 'email'
      }
    }
  });

  console.log(`✅ Created client: ${client.name}`);

  // Create demo sites for the client
  const site1 = await prisma.site.create({
    data: {
      clientId: client.id,
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
      clientId: client.id,
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

  console.log(`✅ Created employees: ${employee1.firstName} ${employee1.lastName}, ${employee2.firstName} ${employee2.lastName}`);

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