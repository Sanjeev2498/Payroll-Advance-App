import { PrismaClient, UserRole, ContractStatus, EmploymentStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Create a demo company
  const company = await prisma.company.create({
    data: {
      name: 'Demo Security Agency',
      slug: 'demo-security',
      settings: {
        timezone: 'America/New_York',
        dateFormat: 'MM/dd/yyyy',
        currency: 'USD'
      },
      branding: {
        primaryColor: '#1E40AF',
        logo: null,
        companyAddress: '123 Security Blvd, New York, NY 10001'
      }
    }
  });

  console.log(`✅ Created company: ${company.name} (ID: ${company.id})`);

  // Create admin user
  const hashedPassword = await bcrypt.hash('admin123', 12);
  const adminUser = await prisma.user.create({
    data: {
      companyId: company.id,
      email: 'admin@demosecurity.com',
      firstName: 'System',
      lastName: 'Administrator',
      passwordHash: hashedPassword,
      role: UserRole.COMPANY_ADMIN,
      isActive: true
    }
  });

  console.log(`✅ Created admin user: ${adminUser.email}`);

  // Create a demo client
  const client = await prisma.client.create({
    data: {
      companyId: company.id,
      name: 'Downtown Shopping Mall',
      contactEmail: 'security@downtownmall.com',
      contactInfo: {
        primaryContact: 'Jane Smith',
        phone: '+1-555-0123',
        address: '456 Commerce St, New York, NY 10002'
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
      name: 'Main Entrance',
      address: {
        street: '456 Commerce St',
        city: 'New York',
        state: 'NY',
        zipCode: '10002',
        building: 'Main Building'
      },
      accessRequirements: {
        securityClearance: 'Basic',
        uniformRequired: true,
        equipmentProvided: ['radio', 'flashlight']
      },
      safetyProtocols: {
        emergencyContacts: ['+1-555-9911'],
        evacuationPlan: 'Plan A',
        hazardTypes: ['crowd_control']
      },
      contactInfo: {
        siteManager: 'Bob Wilson',
        phone: '+1-555-0124'
      }
    }
  });

  const site2 = await prisma.site.create({
    data: {
      clientId: client.id,
      name: 'Parking Garage',
      address: {
        street: '458 Commerce St',
        city: 'New York',
        state: 'NY',
        zipCode: '10002',
        building: 'Parking Structure'
      },
      accessRequirements: {
        securityClearance: 'Basic',
        uniformRequired: true,
        equipmentProvided: ['radio', 'flashlight', 'vehicle']
      },
      safetyProtocols: {
        emergencyContacts: ['+1-555-9911'],
        evacuationPlan: 'Plan B',
        hazardTypes: ['vehicle_traffic']
      },
      contactInfo: {
        siteManager: 'Carol Davis',
        phone: '+1-555-0125'
      }
    }
  });

  console.log(`✅ Created sites: ${site1.name}, ${site2.name}`);

  // Create demo employees
  const employee1 = await prisma.employee.create({
    data: {
      companyId: company.id,
      employeeNumber: 'EMP001',
      firstName: 'John',
      lastName: 'Security',
      email: 'john.security@demosecurity.com',
      phone: '+1-555-0201',
      address: {
        street: '789 Worker Ave',
        city: 'New York',
        state: 'NY',
        zipCode: '10003'
      },
      certifications: {
        securityLicense: {
          number: 'SEC123456',
          expiryDate: '2025-06-30',
          issuingAuthority: 'NY State'
        },
        firstAid: {
          number: 'FA789012',
          expiryDate: '2025-03-15',
          issuingAuthority: 'Red Cross'
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
      firstName: 'Sarah',
      lastName: 'Guardian',
      email: 'sarah.guardian@demosecurity.com',
      phone: '+1-555-0202',
      address: {
        street: '123 Guard Lane',
        city: 'New York',
        state: 'NY',
        zipCode: '10004'
      },
      certifications: {
        securityLicense: {
          number: 'SEC654321',
          expiryDate: '2025-08-30',
          issuingAuthority: 'NY State'
        }
      },
      skills: ['patrol', 'report_writing', 'customer_service'],
      employmentStatus: EmploymentStatus.ACTIVE,
      hireDate: new Date('2023-08-01')
    }
  });

  console.log(`✅ Created employees: ${employee1.firstName} ${employee1.lastName}, ${employee2.firstName} ${employee2.lastName}`);

  console.log('🎉 Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });