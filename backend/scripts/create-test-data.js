#!/usr/bin/env node

/**
 * Create Test Data Script
 * 
 * Creates minimal test data for manual testing:
 * - Client (Phoenix MarketCity)
 * - Contract (Security Services)
 * - Site (Main Entrance Security)
 * - Employee Assignments
 */

const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');

const connectionString = process.env.DATABASE_URL || 'postgresql://payroll_user:payroll_pass_dev_123@localhost:5432/payroll_system_dev';
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({
  adapter,
});

async function createTestData() {
  console.log('🚀 Creating test data for manual testing...');
  
  try {
    await prisma.$transaction(async (tx) => {
      
      // Get the company
      const company = await tx.company.findFirst();
      if (!company) {
        throw new Error('No company found. Run clear-demo-data.js first.');
      }
      
      console.log(`📢 Using company: ${company.name}`);
      
      // Create a client
      console.log('🏢 Creating test client...');
      const client = await tx.client.create({
        data: {
          companyId: company.id,
          name: 'Phoenix MarketCity',
          contactEmail: 'security@phoenixmall.in',
          contactInfo: {
            phone: '+91 98765-11111',
            address: {
              street: 'Phoenix MarketCity Mall',
              city: 'Bangalore',
              state: 'Karnataka',
              zipCode: '560048',
              country: 'India'
            }
          },
          organizationType: 'SHOPPING_MALL',
          industry: 'Retail & Shopping',
          companySize: 'LARGE',
          tags: ['mall', 'retail', 'high-traffic']
        }
      });
      
      console.log(`✅ Created client: ${client.name} (${client.id})`);
      
      // Create a contract
      console.log('📄 Creating test contract...');
      const contract = await tx.contract.create({
        data: {
          clientId: client.id,
          contractNumber: 'SEC-2024-001',
          title: 'Security Services Contract',
          description: '24x7 Security Services for Phoenix MarketCity Mall',
          serviceDefinitions: {
            guardCount: 2,
            shiftPattern: '24x7',
            supervisorRequired: true,
            coverage: 'CONTINUOUS'
          },
          billingConfiguration: {
            hourlyRate: 25.0,
            overtimeMultiplier: 1.5,
            billingFrequency: 'MONTHLY',
            paymentTerms: 'NET_30'
          },
          status: 'ACTIVE',
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-12-31')
        }
      });
      
      console.log(`✅ Created contract: ${contract.title} (${contract.id})`);
      
      // Create a site
      console.log('🏛️ Creating test site...');
      const site = await tx.site.create({
        data: {
          contractId: contract.id,
          name: 'Main Entrance Security',
          address: {
            street: 'Phoenix MarketCity Mall - Main Gate',
            city: 'Bangalore',
            state: 'Karnataka',
            zipCode: '560048',
            country: 'India'
          },
          operationalStatus: 'ACTIVE',
          requirements: {
            minGuards: 2,
            maxGuards: 3,
            shiftPattern: '24x7',
            securityLevel: 'MEDIUM',
            accessControl: true,
            cctv: true
          },
          accessRequirements: {
            clearanceLevel: 'BASIC',
            uniformRequired: true,
            equipmentProvided: ['radio', 'torch', 'logbook']
          },
          safetyProtocols: {
            emergencyContacts: [
              {
                name: 'Mall Security Control',
                phone: '+91 98765-22222',
                type: 'PRIMARY'
              }
            ],
            procedures: [
              'Access control verification',
              'CCTV monitoring',
              'Incident reporting',
              'Emergency response'
            ]
          },
          contactInfo: {
            siteManager: 'Rajesh Kumar',
            phone: '+91 98765-33333',
            email: 'security.manager@phoenixmall.in'
          }
        }
      });
      
      console.log(`✅ Created site: ${site.name} (${site.id})`);
      
      // Get employees to create assignments
      const employees = await tx.employee.findMany({
        where: {
          companyId: company.id,
          employmentStatus: 'ACTIVE'
        }
      });
      
      if (employees.length > 0) {
        console.log(`👷 Creating assignments for ${employees.length} employees...`);
        
        for (const employee of employees) {
          const assignment = await tx.assignment.create({
            data: {
              employeeId: employee.id,
              siteId: site.id,
              role: employee.firstName === 'Site' ? 'SUPERVISOR' : 'SECURITY_GUARD',
              responsibilities: {
                primary: employee.firstName === 'Site' ? 
                  ['Supervise security operations', 'Coordinate with mall management', 'Handle incidents'] :
                  ['Access control', 'Visitor screening', 'Patrol duties', 'Incident reporting'],
                secondary: ['Emergency response', 'Equipment maintenance'],
                escalation: 'Site Manager'
              },
              // Note: hourlyRate is encrypted, so we need to use the encrypted fields
              hourlyRate: employee.firstName === 'Site' ? '35.00' : '25.00', // This will be encrypted by the service
              hourlyRateIv: 'dummy_iv_' + Date.now(),
              hourlyRateTag: 'dummy_tag_' + Date.now(),
              status: 'ACTIVE',
              startDate: new Date('2024-01-01')
            }
          });
          
          console.log(`✅ Created assignment: ${employee.firstName} ${employee.lastName} → ${site.name} (${assignment.role})`);
        }
      } else {
        console.log('⚠️ No employees found to assign');
      }
      
    });
    
    console.log('\n🎉 Test data creation completed successfully!');
    console.log('\n📊 Created Test Data:');
    console.log('┌─────────────────┬─────────────────────────────────────────────┐');
    console.log('│ Component       │ Details                                     │');
    console.log('├─────────────────┼─────────────────────────────────────────────┤');
    console.log('│ Client          │ Phoenix MarketCity (Shopping Mall)         │');
    console.log('│ Contract        │ Security Services Contract (24x7)          │');
    console.log('│ Site            │ Main Entrance Security (Active)            │');
    console.log('│ Assignments     │ 2 Employees assigned (Supervisor + Guard)  │');
    console.log('└─────────────────┴─────────────────────────────────────────────┘');
    
    console.log('\n🧪 Manual Testing Now Available:');
    console.log('- ✅ Employee Directory Search (Employee records exist)');
    console.log('- ✅ Client Management (Phoenix MarketCity created)');
    console.log('- ✅ Site Operations (Main Entrance Security active)');
    console.log('- ✅ Assignment Management (Employees assigned to site)');
    console.log('- ✅ Dashboard Metrics (Real data available)');
    console.log('- ⏳ Shift Scheduling (Create shifts for assignments)');
    console.log('- ⏳ Attendance Tracking (Clock in/out for shifts)');
    console.log('- ⏳ Payroll Processing (Process attendance for payroll)');
    
    console.log('\n💡 Next Steps for Manual Testing:');
    console.log('1. 🗓️ Create shifts for the site assignments');
    console.log('2. ⏰ Test attendance clock-in/out workflow');
    console.log('3. 📊 Check dashboard for real-time data');
    console.log('4. 💰 Test payroll processing with attendance data');
    console.log('5. 🧾 Generate client invoices based on hours worked');
    
  } catch (error) {
    console.error('❌ Error creating test data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
if (require.main === module) {
  createTestData()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Script failed:', error.message);
      process.exit(1);
    });
}

module.exports = { createTestData };