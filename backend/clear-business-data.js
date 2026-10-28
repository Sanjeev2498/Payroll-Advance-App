const { PrismaClient } = require('@prisma/client');

// Initialize Prisma client with standard configuration
const prisma = new PrismaClient({
  log: ['error', 'warn'],
  errorFormat: 'minimal',
});

async function clearBusinessData() {
  console.log('🧹 Starting complete business data cleanup...');

  try {
    // Start a transaction to ensure all operations succeed or fail together
    await prisma.$transaction(async (tx) => {
      console.log('🗑️  Clearing all business operational data...');

      // 1. Clear attendance and time tracking data
      console.log('   📅 Deleting attendance records...');
      const attendanceCount = await tx.attendance_records.deleteMany({});
      console.log(`   ✅ Deleted ${attendanceCount.count} attendance records`);

      // 2. Clear payroll data
      console.log('   💰 Deleting payroll records...');
      const payrollCount = await tx.payroll_items.deleteMany({});
      console.log(`   ✅ Deleted ${payrollCount.count} payroll items`);

      // 3. Clear shifts and schedules
      console.log('   📋 Deleting shifts and schedules...');
      const shiftsCount = await tx.shifts.deleteMany({});
      console.log(`   ✅ Deleted ${shiftsCount.count} shifts`);

      // 4. Clear assignments (employee-site relationships)
      console.log('   🔗 Deleting site assignments...');
      const assignmentsCount = await tx.site_assignments.deleteMany({});
      console.log(`   ✅ Deleted ${assignmentsCount.count} site assignments`);

      // 5. Clear employees (this will cascade to related data)
      console.log('   👥 Deleting all employees...');
      const employeesCount = await tx.employees.deleteMany({});
      console.log(`   ✅ Deleted ${employeesCount.count} employees`);

      // 6. Clear sites
      console.log('   🏢 Deleting all sites...');
      const sitesCount = await tx.sites.deleteMany({});
      console.log(`   ✅ Deleted ${sitesCount.count} sites`);

      // 7. Clear clients
      console.log('   🤝 Deleting all clients...');
      const clientsCount = await tx.clients.deleteMany({});
      console.log(`   ✅ Deleted ${clientsCount.count} clients`);

      // 8. Clear any supervisor-related data (if stored separately)
      console.log('   👨‍💼 Cleaning supervisor data...');
      
      // Clear any specific supervisor tables if they exist
      try {
        // If there's a supervisors table
        const supervisorsCount = await tx.supervisors?.deleteMany?.({}) || { count: 0 };
        console.log(`   ✅ Deleted ${supervisorsCount.count} supervisors`);
      } catch (error) {
        console.log('   ℹ️  No separate supervisors table found');
      }

      // 9. Clear any notification/alert data related to business operations
      console.log('   🔔 Clearing operational notifications...');
      try {
        // Clear notifications that aren't system-level
        const notificationsCount = await tx.notifications?.deleteMany?.({}) || { count: 0 };
        console.log(`   ✅ Deleted ${notificationsCount.count} notifications`);
      } catch (error) {
        console.log('   ℹ️  No notifications table found');
      }

      // 10. Clear any audit logs related to business operations (optional)
      console.log('   📝 Clearing business audit logs...');
      try {
        const auditCount = await tx.audit_logs?.deleteMany?.({
          where: {
            table_name: {
              in: ['employees', 'sites', 'clients', 'site_assignments', 'attendance_records', 'payroll_items', 'shifts']
            }
          }
        }) || { count: 0 };
        console.log(`   ✅ Deleted ${auditCount.count} audit log entries`);
      } catch (error) {
        console.log('   ℹ️  No audit_logs table found or different structure');
      }

      console.log('\n✅ Business data cleanup completed successfully!');
    });

    // Verify the cleanup
    console.log('\n🔍 Verifying cleanup...');
    
    const remainingCounts = {
      employees: await prisma.employees.count(),
      sites: await prisma.sites.count(),
      clients: await prisma.clients.count(),
      assignments: await prisma.site_assignments.count(),
      attendance: await prisma.attendance_records.count(),
      payroll: await prisma.payroll_items.count(),
      shifts: await prisma.shifts.count(),
    };

    console.log('📊 Remaining records:');
    Object.entries(remainingCounts).forEach(([table, count]) => {
      console.log(`   ${table}: ${count} records`);
    });

    // Verify that core system data is preserved
    console.log('\n🔒 Verifying core system data is preserved:');
    const systemCounts = {
      users: await prisma.users.count(),
      companies: await prisma.companies.count(),
    };

    console.log('🛡️  Core system records:');
    Object.entries(systemCounts).forEach(([table, count]) => {
      console.log(`   ${table}: ${count} records`);
    });

    if (systemCounts.users > 0 && systemCounts.companies > 0) {
      console.log('✅ Core system data preserved successfully!');
    } else {
      console.log('⚠️  Warning: Core system data may have been affected!');
    }

    console.log('\n🎯 Database is now ready for fresh business data creation!');
    console.log('   You can now create:');
    console.log('   - Clients');
    console.log('   - Sites');
    console.log('   - Employees');
    console.log('   - Supervisors');
    console.log('   - Site assignments');

  } catch (error) {
    console.error('❌ Error during business data cleanup:', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the cleanup
clearBusinessData()
  .then(() => {
    console.log('\n🏁 Business data cleanup script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Fatal error during cleanup:', error);
    process.exit(1);
  });