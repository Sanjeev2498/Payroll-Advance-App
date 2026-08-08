const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function seedEmployees() {
  try {
    // First, get or create a company
    let company = await prisma.company.findFirst();
    if (!company) {
      company = await prisma.company.create({
        data: {
          name: 'Demo Security Services',
          slug: 'demo-security',
          settings: {},
          branding: {}
        }
      });
      console.log('Created company:', company.name);
    }

    // Create real employee data
    const employees = [
      {
        companyId: company.id,
        employeeNumber: 'EMP001',
        firstName: 'Arjun',
        lastName: 'Singh',
        email: 'arjun.singh@demosecurity.co.in',
        phone: '+91 98765-43210',
        hireDate: new Date('2023-01-15'),
        skills: ['Security Guard', 'First Aid', 'Fire Safety'],
        employmentStatus: 'ACTIVE',
        certifications: [
          {
            name: 'Security License',
            issuingOrganization: 'Maharashtra Police',
            issueDate: '2023-01-01',
            expiryDate: '2026-01-01',
            verificationStatus: 'VERIFIED'
          },
          {
            name: 'First Aid Certificate',
            issuingOrganization: 'Red Cross',
            issueDate: '2023-02-01',
            expiryDate: '2025-02-01',
            verificationStatus: 'VERIFIED'
          }
        ],
        metadata: {
          employmentType: 'FULL_TIME',
          department: 'Security Operations',
          jobTitle: 'Security Guard',
          hourlyRate: 25.50,
          contactInfo: {
            primaryPhone: '+91 98765-43210',
            emergencyContact: {
              name: 'Priya Singh',
              relationship: 'Spouse',
              phone: '+91 98765-43211'
            },
            address: {
              street: '123 Security Lane',
              city: 'Mumbai',
              state: 'Maharashtra',
              zipCode: '400001',
              country: 'India'
            }
          },
          complianceStatus: {
            backgroundCheckStatus: 'CLEARED',
            backgroundCheckDate: '2023-01-10',
            drugTestStatus: 'PASSED',
            drugTestDate: '2023-01-10'
          },
          performanceMetrics: {
            overallRating: 4.5,
            punctualityScore: 95,
            qualityRating: 4.8,
            clientFeedbackScore: 4.6,
            lastReviewDate: '2024-01-15'
          }
        }
      },
      {
        companyId: company.id,
        employeeNumber: 'EMP002',
        firstName: 'Priya',
        lastName: 'Sharma',
        email: 'priya.sharma@demosecurity.co.in',
        phone: '+91 98765-43211',
        hireDate: new Date('2023-02-01'),
        skills: ['Security Guard', 'CCTV Monitoring', 'Access Control'],
        employmentStatus: 'ACTIVE',
        certifications: [
          {
            name: 'Security License',
            issuingOrganization: 'Maharashtra Police',
            issueDate: '2023-01-20',
            expiryDate: '2026-01-20',
            verificationStatus: 'VERIFIED'
          }
        ],
        metadata: {
          employmentType: 'FULL_TIME',
          department: 'Security Operations',
          jobTitle: 'Senior Security Guard',
          hourlyRate: 28.00,
          contactInfo: {
            primaryPhone: '+91 98765-43211',
            emergencyContact: {
              name: 'Raj Sharma',
              relationship: 'Husband',
              phone: '+91 98765-43212'
            },
            address: {
              street: '456 Guard Street',
              city: 'Mumbai',
              state: 'Maharashtra',
              zipCode: '400002',
              country: 'India'
            }
          },
          complianceStatus: {
            backgroundCheckStatus: 'CLEARED',
            backgroundCheckDate: '2023-01-25',
            drugTestStatus: 'PASSED',
            drugTestDate: '2023-01-25'
          },
          performanceMetrics: {
            overallRating: 4.7,
            punctualityScore: 98,
            qualityRating: 4.9,
            clientFeedbackScore: 4.8,
            lastReviewDate: '2024-02-01'
          }
        }
      },
      {
        companyId: company.id,
        employeeNumber: 'EMP003',
        firstName: 'Rajesh',
        lastName: 'Kumar',
        email: 'rajesh.kumar@demosecurity.co.in',
        phone: '+91 98765-43212',
        hireDate: new Date('2023-03-01'),
        skills: ['Security Guard', 'Patrol', 'Report Writing'],
        employmentStatus: 'ACTIVE',
        certifications: [
          {
            name: 'Security License',
            issuingOrganization: 'Maharashtra Police',
            issueDate: '2023-02-15',
            expiryDate: '2026-02-15',
            verificationStatus: 'VERIFIED'
          }
        ],
        metadata: {
          employmentType: 'FULL_TIME',
          department: 'Security Operations',
          jobTitle: 'Security Guard',
          hourlyRate: 24.00,
          contactInfo: {
            primaryPhone: '+91 98765-43212',
            emergencyContact: {
              name: 'Sunita Kumar',
              relationship: 'Wife',
              phone: '+91 98765-43213'
            },
            address: {
              street: '789 Safety Road',
              city: 'Mumbai',
              state: 'Maharashtra',
              zipCode: '400003',
              country: 'India'
            }
          },
          complianceStatus: {
            backgroundCheckStatus: 'CLEARED',
            backgroundCheckDate: '2023-02-20',
            drugTestStatus: 'PASSED',
            drugTestDate: '2023-02-20'
          },
          performanceMetrics: {
            overallRating: 4.3,
            punctualityScore: 92,
            qualityRating: 4.5,
            clientFeedbackScore: 4.2,
            lastReviewDate: '2024-03-01'
          }
        }
      },
      {
        companyId: company.id,
        employeeNumber: 'EMP004',
        firstName: 'Sneha',
        lastName: 'Patel',
        email: 'sneha.patel@demosecurity.co.in',
        phone: '+91 98765-43213',
        hireDate: new Date('2023-04-01'),
        skills: ['Security Supervisor', 'Team Management', 'Incident Response'],
        employmentStatus: 'ACTIVE',
        certifications: [
          {
            name: 'Security Supervisor License',
            issuingOrganization: 'Maharashtra Police',
            issueDate: '2023-03-15',
            expiryDate: '2026-03-15',
            verificationStatus: 'VERIFIED'
          },
          {
            name: 'Management Certificate',
            issuingOrganization: 'Security Institute',
            issueDate: '2023-03-20',
            expiryDate: '2025-03-20',
            verificationStatus: 'VERIFIED'
          }
        ],
        metadata: {
          employmentType: 'FULL_TIME',
          department: 'Security Operations',
          jobTitle: 'Site Supervisor',
          hourlyRate: 35.00,
          contactInfo: {
            primaryPhone: '+91 98765-43213',
            emergencyContact: {
              name: 'Amit Patel',
              relationship: 'Brother',
              phone: '+91 98765-43214'
            },
            address: {
              street: '321 Supervisor Avenue',
              city: 'Mumbai',
              state: 'Maharashtra',
              zipCode: '400004',
              country: 'India'
            }
          },
          complianceStatus: {
            backgroundCheckStatus: 'CLEARED',
            backgroundCheckDate: '2023-03-25',
            drugTestStatus: 'PASSED',
            drugTestDate: '2023-03-25'
          },
          performanceMetrics: {
            overallRating: 4.8,
            punctualityScore: 99,
            qualityRating: 4.9,
            clientFeedbackScore: 4.9,
            lastReviewDate: '2024-04-01'
          }
        }
      },
      {
        companyId: company.id,
        employeeNumber: 'EMP005',
        firstName: 'Vikash',
        lastName: 'Singh',
        email: 'vikash.singh@demosecurity.co.in',
        phone: '+91 98765-43214',
        hireDate: new Date('2023-05-01'),
        skills: ['Security Guard', 'Vehicle Security', 'Parking Management'],
        employmentStatus: 'ON_LEAVE',
        certifications: [
          {
            name: 'Security License',
            issuingOrganization: 'Maharashtra Police',
            issueDate: '2023-04-15',
            expiryDate: '2026-04-15',
            verificationStatus: 'VERIFIED'
          }
        ],
        metadata: {
          employmentType: 'FULL_TIME',
          department: 'Security Operations',
          jobTitle: 'Security Guard',
          hourlyRate: 23.50,
          contactInfo: {
            primaryPhone: '+91 98765-43214',
            emergencyContact: {
              name: 'Rekha Singh',
              relationship: 'Mother',
              phone: '+91 98765-43215'
            },
            address: {
              street: '654 Guard Colony',
              city: 'Mumbai',
              state: 'Maharashtra',
              zipCode: '400005',
              country: 'India'
            }
          },
          complianceStatus: {
            backgroundCheckStatus: 'CLEARED',
            backgroundCheckDate: '2023-04-20',
            drugTestStatus: 'PASSED',
            drugTestDate: '2023-04-20'
          },
          performanceMetrics: {
            overallRating: 4.1,
            punctualityScore: 89,
            qualityRating: 4.3,
            clientFeedbackScore: 4.0,
            lastReviewDate: '2024-05-01'
          }
        }
      },
      {
        companyId: company.id,
        employeeNumber: 'EMP006',
        firstName: 'Anjali',
        lastName: 'Reddy',
        email: 'anjali.reddy@demosecurity.co.in',
        phone: '+91 98765-43215',
        hireDate: new Date('2023-06-01'),
        skills: ['Security Guard', 'Customer Service', 'Reception Duties'],
        employmentStatus: 'INACTIVE',
        certifications: [
          {
            name: 'Security License',
            issuingOrganization: 'Maharashtra Police',
            issueDate: '2023-05-15',
            expiryDate: '2026-05-15',
            verificationStatus: 'EXPIRED'
          }
        ],
        metadata: {
          employmentType: 'PART_TIME',
          department: 'Security Operations',
          jobTitle: 'Reception Security',
          hourlyRate: 22.00,
          contactInfo: {
            primaryPhone: '+91 98765-43215',
            emergencyContact: {
              name: 'Suresh Reddy',
              relationship: 'Father',
              phone: '+91 98765-43216'
            },
            address: {
              street: '987 Reception Lane',
              city: 'Mumbai',
              state: 'Maharashtra',
              zipCode: '400006',
              country: 'India'
            }
          },
          complianceStatus: {
            backgroundCheckStatus: 'CLEARED',
            backgroundCheckDate: '2023-05-20',
            drugTestStatus: 'PASSED',
            drugTestDate: '2023-05-20'
          },
          performanceMetrics: {
            overallRating: 3.9,
            punctualityScore: 85,
            qualityRating: 4.0,
            clientFeedbackScore: 3.8,
            lastReviewDate: '2024-06-01'
          }
        }
      }
    ];

    // Clear existing employees and create new ones
    await prisma.employee.deleteMany({
      where: {
        companyId: company.id
      }
    });

    for (const employee of employees) {
      const created = await prisma.employee.create({
        data: employee
      });
      console.log(`Created employee: ${created.firstName} ${created.lastName} (${created.employeeNumber})`);
    }

    console.log('\n✅ Employee seeding completed successfully!');
    console.log(`📊 Created ${employees.length} employees for company: ${company.name}`);
    
    // Show summary
    const employeeStats = await prisma.employee.groupBy({
      by: ['employmentStatus'],
      where: { companyId: company.id },
      _count: true
    });
    
    console.log('\n📈 Employee Statistics:');
    employeeStats.forEach(stat => {
      console.log(`  ${stat.employmentStatus}: ${stat._count}`);
    });

  } catch (error) {
    console.error('❌ Error seeding employees:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

seedEmployees().catch((error) => {
  console.error(error);
  process.exit(1);
});