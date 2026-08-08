/**
 * Clear Demo Data Script
 * 
 * This script clears all operational/demo data while preserving:
 * - Database schema
 * - Companies
 * - Roles & Permissions
 * - Master lookup tables
 * - System configuration
 * 
 * Creates minimal role-based accounts for manual testing.
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');

// Create PostgreSQL connection pool for Prisma 7.x
const connectionString = process.env.DATABASE_URL || 'postgresql://payroll_user:payroll_pass_dev_123@localhost:5432/payroll_system_dev';
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({
  adapter,
});

async function clearDemoData() {
  console.log('🧹 Starting demo data cleanup...');
  
  try {
    // Start transaction for safe cleanup
    await prisma.$transaction(async (tx) => {
      
      console.log('📋 Clearing operational data (preserving schema and config)...');
      
      // Clear operational data in dependency order (children first)
      
      // 1. Clear shift notifications and templates
      await tx.shiftNotification.deleteMany({});
      console.log('✅ Cleared shift notifications');
      
      // 2. Clear attendance records
      await tx.attendance.deleteMany({});
      console.log('✅ Cleared attendance records');
      
      // 3. Clear shifts
      await tx.shift.deleteMany({});
      console.log('✅ Cleared shifts');
      
      // 4. Clear payroll items and runs
      await tx.payrollItem.deleteMany({});
      await tx.payrollRun.deleteMany({});
      console.log('✅ Cleared payroll records');
      
      // 5. Clear invoices
      await tx.invoice.deleteMany({});
      console.log('✅ Cleared invoices');
      
      // 6. Clear assignments
      await tx.assignment.deleteMany({});
      console.log('✅ Cleared assignments');
      
      // 7. Clear employees
      await tx.employee.deleteMany({});
      console.log('✅ Cleared employees');
      
      // 8. Clear client documents and interactions
      await tx.clientDocument.deleteMany({});
      await tx.clientInteraction.deleteMany({});
      console.log('✅ Cleared client documents and interactions');
      
      // 9. Clear client users
      await tx.clientUser.deleteMany({});
      console.log('✅ Cleared client users');
      
      // 10. Clear sites
      await tx.site.deleteMany({});
      console.log('✅ Cleared sites');
      
      // 11. Clear contracts
      await tx.contract.deleteMany({});
      console.log('✅ Cleared contracts');
      
      // 12. Clear clients
      await tx.client.deleteMany({});
      console.log('✅ Cleared clients');
      
      // 13. Clear shift templates
      await tx.shiftTemplate.deleteMany({});
      console.log('✅ Cleared shift templates');
      
      // 14. Clear users (except we'll recreate minimal ones)
      await tx.user.deleteMany({});
      console.log('✅ Cleared users');
      
      console.log('🎯 Creating minimal role-based accounts...');
      
      // Get the existing company (should be preserved)
      let company = await tx.company.findFirst();
      
      if (!company) {
        // Create minimal company if none exists
        company = await tx.company.create({
          data: {
            name: 'Demo Security Services',
            slug: 'demo-security',
            settings: {
              timeZone: 'UTC',
              dateFormat: 'YYYY-MM-DD',
              currency: 'INR',
              workingHours: {
                start: '09:00',
                end: '17:00'
              }
            },
            branding: {
              primaryColor: '#1f2937',
              secondaryColor: '#6b7280',
              companyDescription: 'Security Workforce Management System',
              themes: {
                light: {
                  background: '#ffffff',
                  text: '#111827'
                },
                dark: {
                  background: '#111827',
                  text: '#f9fafb'
                }
              }
            }
          }
        });
        console.log('✅ Created minimal company');
      }
      
      // Create password hash
      const hashedPassword = await bcrypt.hash('admin123', 10);
      
      // Create minimal role-based accounts
      const users = [
        {
          email: 'admin@demosecurity.co.in',
          firstName: 'System',
          lastName: 'Administrator',
          role: 'COMPANY_ADMIN',
          isActive: true,
          companyId: company.id,
          passwordHash: hashedPassword
        },
        {
          email: 'supervisor@demosecurity.co.in',
          firstName: 'Site',
          lastName: 'Supervisor',
          role: 'SUPERVISOR',
          isActive: true,
          companyId: company.id,
          passwordHash: hashedPassword
        },
        {
          email: 'manager@demosecurity.co.in',
          firstName: 'Operations',
          lastName: 'Manager',
          role: 'MANAGER',
          isActive: true,
          companyId: company.id,
          passwordHash: hashedPassword
        },
        {
          email: 'employee@demosecurity.co.in',
          firstName: 'Test',
          lastName: 'Employee',
          role: 'EMPLOYEE',
          isActive: true,
          companyId: company.id,
          passwordHash: hashedPassword
        }
      ];
      
      // Create users
      for (const userData of users) {
        await tx.user.create({
          data: userData
        });
        console.log(`✅ Created ${userData.role}: ${userData.email}`);
      }
      
      // Create Employee records for non-admin users
      console.log('👷 Creating Employee records for operational users...');
      
      const operationalUsers = users.filter(u => ['SUPERVISOR', 'EMPLOYEE'].includes(u.role));
      
      for (let i = 0; i < operationalUsers.length; i++) {
        const user = operationalUsers[i];
        const employeeNumber = `EMP-${String(i + 1).padStart(3, '0')}`;
        
        await tx.employee.create({
          data: {
            employeeNumber,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            phone: '+91 98765-43210',
            companyId: company.id,
            hireDate: new Date('2024-01-01'),
            employmentStatus: 'ACTIVE',
            salaryType: 'MONTHLY',
            epfApplicable: true,
            esicApplicable: true,
            ptApplicable: true,
            tdsApplicable: true,
            skills: ['Basic Security', 'Access Control'],
            certifications: [
              {
                name: 'Security Guard License',
                issuingOrganization: 'State Security Board',
                issueDate: new Date('2024-01-01').toISOString(),
                expiryDate: new Date('2026-12-31').toISOString(),
                certificateNumber: `SGL-2024-${String(i + 1).padStart(4, '0')}`
              }
            ],
            address: {
              street: '123 Main Street',
              city: 'Bangalore',
              state: 'Karnataka',
              zipCode: '560001',
              country: 'India'
            },
            metadata: {
              department: user.role === 'SUPERVISOR' ? 'Operations' : 'Security Operations',
              jobTitle: user.role === 'SUPERVISOR' ? 'Site Supervisor' : 'Security Guard',
              hourlyRate: user.role === 'SUPERVISOR' ? 35.0 : 25.0,
              complianceStatus: {
                backgroundCheck: 'COMPLETED',
                backgroundCheckDate: new Date('2023-12-15').toISOString(),
                medicalClearance: 'COMPLETED',
                medicalClearanceDate: new Date('2024-01-05').toISOString(),
                securityClearance: 'LEVEL_1'
              },
              availability: {
                availableDays: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'],
                preferredShifts: ['DAY_SHIFT', 'NIGHT_SHIFT'],
                maxHoursPerWeek: 48
              }
            }
          }
        });
        
        console.log(`✅ Created Employee: ${employeeNumber} - ${user.firstName} ${user.lastName}`);
      }
      
    });
    
    console.log('');
    console.log('🎉 Demo data cleanup completed successfully!');
    console.log('');
    console.log('📱 Available Test Accounts:');
    console.log('┌─────────────┬─────────────────────────────────┬───────────┐');
    console.log('│ Role        │ Email                           │ Password  │');
    console.log('├─────────────┼─────────────────────────────────┼───────────┤');
    console.log('│ Admin       │ admin@demosecurity.co.in        │ admin123  │');
    console.log('│ Manager     │ manager@demosecurity.co.in      │ admin123  │');
    console.log('│ Supervisor  │ supervisor@demosecurity.co.in   │ admin123  │');
    console.log('│ Employee    │ employee@demosecurity.co.in     │ admin123  │');
    console.log('└─────────────┴─────────────────────────────────┴───────────┘');
    console.log('');
    console.log('🧪 System is now ready for complete manual testing from scratch!');
    console.log('');
    console.log('📊 Current State:');
    console.log('- All operational data cleared');
    console.log('- Database schema preserved');
    console.log('- Minimal role accounts created');
    console.log('- No business data pre-populated');
    console.log('- All dashboards will show empty/zero states');
    console.log('');
    console.log('🚀 You can now manually test:');
    console.log('- Client onboarding');
    console.log('- Contract creation');
    console.log('- Site management');
    console.log('- Employee management');
    console.log('- Assignment workflows');
    console.log('- Attendance tracking');
    console.log('- Payroll processing');
    console.log('- Billing & invoicing');
    console.log('- All other features from ground up');
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the cleanup
if (require.main === module) {
  clearDemoData()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('Failed to clear demo data:', error);
      process.exit(1);
    });
}

module.exports = { clearDemoData };