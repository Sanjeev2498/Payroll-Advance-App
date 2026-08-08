#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createEmployeeRecords() {
  try {
    console.log('🔍 Checking existing User and Employee records...');
    
    const users = await prisma.user.findMany({
      where: {
        role: { in: ['SUPERVISOR', 'EMPLOYEE'] }
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        companyId: true
      }
    });
    
    const existingEmployees = await prisma.employee.findMany({
      select: { email: true }
    });
    const existingEmails = existingEmployees.map(emp => emp.email);
    
    console.log(`Found ${users.length} user accounts with employee roles`);
    console.log(`Found ${existingEmployees.length} existing employee records`);
    
    const usersNeedingEmployeeRecords = users.filter(user => 
      user.email && !existingEmails.includes(user.email)
    );
    
    console.log(`${usersNeedingEmployeeRecords.length} users need Employee records created`);
    
    if (usersNeedingEmployeeRecords.length === 0) {
      console.log('✅ All users already have Employee records');
      return;
    }
    
    // Create Employee records for users
    const createdEmployees = [];
    
    for (let i = 0; i < usersNeedingEmployeeRecords.length; i++) {
      const user = usersNeedingEmployeeRecords[i];
      
      const employeeNumber = `EMP-${String(i + 1).padStart(3, '0')}`;
      
      console.log(`📝 Creating Employee record for ${user.email}...`);
      
      const employee = await prisma.employee.create({
        data: {
          employeeNumber,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: '+91 98765-43210', // Default phone format
          companyId: user.companyId,
          hireDate: new Date('2024-01-01'),
          employmentStatus: 'ACTIVE',
          employmentType: 'FULL_TIME',
          department: user.role === 'SUPERVISOR' ? 'Operations' : 'Security Operations',
          jobTitle: user.role === 'SUPERVISOR' ? 'Site Supervisor' : 'Security Guard',
          skills: [
            {
              name: 'Basic Security',
              level: 8,
              yearsExperience: 2,
              certificationRef: 'SEC-BASIC-001'
            },
            {
              name: 'Access Control',
              level: 7,
              yearsExperience: 1,
              certificationRef: 'AC-CERT-001'
            }
          ],
          certifications: [
            {
              name: 'Security Guard License',
              issuingOrganization: 'State Security Board',
              issueDate: new Date('2024-01-01'),
              expiryDate: new Date('2026-12-31'),
              certificateNumber: `SGL-2024-${String(i + 1).padStart(4, '0')}`,
              verificationUrl: 'https://verify.security.gov.in'
            }
          ],
          complianceStatus: {
            backgroundCheck: 'COMPLETED',
            backgroundCheckDate: new Date('2023-12-15'),
            medicalClearance: 'COMPLETED',
            medicalClearanceDate: new Date('2024-01-05'),
            securityClearance: 'LEVEL_1',
            drugTestStatus: 'PASSED',
            drugTestDate: new Date('2024-01-03')
          },
          availability: {
            availableDays: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'],
            preferredShifts: ['DAY_SHIFT', 'NIGHT_SHIFT'],
            maxHoursPerWeek: 48,
            travelAvailability: 'WITHIN_CITY',
            overtimeAvailability: 'AVAILABLE'
          },
          performanceMetrics: {
            overallRating: 4,
            punctualityRating: 4,
            reliabilityRating: 4,
            communicationRating: 4,
            lastReviewDate: new Date('2024-06-01'),
            nextReviewDate: new Date('2024-12-01')
          },
          hourlyRate: user.role === 'SUPERVISOR' ? 35.0 : 25.0,
          contactInfo: {
            emergencyContactName: 'Emergency Contact',
            emergencyContactPhone: '+91 98765-12345',
            emergencyContactRelationship: 'Family',
            address: {
              street: '123 Main Street',
              city: 'Bangalore',
              state: 'Karnataka',
              zipCode: '560001',
              country: 'India'
            }
          },
          metadata: {
            createdFrom: 'user-account',
            userId: user.id,
            originalRole: user.role
          }
        }
      });
      
      createdEmployees.push(employee);
      console.log(`✅ Created Employee record: ${employee.employeeNumber} - ${employee.firstName} ${employee.lastName}`);
    }
    
    console.log(`\n🎉 Successfully created ${createdEmployees.length} Employee records!`);
    
    // Display summary
    console.log('\n📊 Employee Records Summary:');
    for (const employee of createdEmployees) {
      console.log(`- ${employee.employeeNumber}: ${employee.firstName} ${employee.lastName} (${employee.jobTitle})`);
    }
    
    console.log('\n✅ Employee directory search should now work with these records');
    
  } catch (error) {
    console.error('❌ Error creating Employee records:', error);
    
    // If there's a validation error, show details
    if (error.code === 'P2002') {
      console.error('Unique constraint violation - some data already exists');
    }
    
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
if (require.main === module) {
  createEmployeeRecords()
    .then(() => {
      console.log('\n🚀 Employee records creation completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Script failed:', error.message);
      process.exit(1);
    });
}

module.exports = { createEmployeeRecords };