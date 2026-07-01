const { PrismaClient } = require('@prisma/client');

async function testDatabaseEncryption() {
  const prisma = new PrismaClient();

  try {
    console.log('🔍 Checking existing employees in database...\n');

    // Get all employees to see current data
    const employees = await prisma.employee.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        emailIv: true,
        emailTag: true,
        phone: true,
        phoneIv: true,
        phoneTag: true,
        aadhaarNumber: true,
        aadhaarIv: true,
        aadhaarTag: true,
        panNumber: true,
        panIv: true,
        panTag: true,
        employeeNumber: true,
        companyId: true
      }
    });

    if (employees.length === 0) {
      console.log('❌ No employees found in database');
      return;
    }

    console.log(`✅ Found ${employees.length} employees`);

    employees.forEach((emp, index) => {
      console.log(`\n--- Employee ${index + 1} ---`);
      console.log('Name:', `${emp.firstName} ${emp.lastName}`);
      console.log('Employee Number:', emp.employeeNumber);
      console.log('Company ID:', emp.companyId);
      
      // Check if data is encrypted (has IV and TAG)
      console.log('\n🔐 Encryption Status:');
      console.log('Email encrypted:', !!(emp.email && emp.emailIv && emp.emailTag));
      console.log('Phone encrypted:', !!(emp.phone && emp.phoneIv && emp.phoneTag));
      console.log('Aadhaar encrypted:', !!(emp.aadhaarNumber && emp.aadhaarIv && emp.aadhaarTag));
      console.log('PAN encrypted:', !!(emp.panNumber && emp.panIv && emp.panTag));
      
      if (emp.email && emp.emailIv) {
        console.log('\n📧 Email Data:');
        console.log('  Encrypted:', emp.email.substring(0, 20) + '...');
        console.log('  IV:', emp.emailIv.substring(0, 10) + '...');
        console.log('  Tag:', emp.emailTag);
      }
      
      if (emp.phone && emp.phoneIv) {
        console.log('\n📱 Phone Data:');
        console.log('  Encrypted:', emp.phone.substring(0, 20) + '...');
        console.log('  IV:', emp.phoneIv.substring(0, 10) + '...');
        console.log('  Tag:', emp.phoneTag);
      }

      if (emp.aadhaarNumber && emp.aadhaarIv) {
        console.log('\n🆔 Aadhaar Data:');
        console.log('  Encrypted:', emp.aadhaarNumber.substring(0, 20) + '...');
        console.log('  IV:', emp.aadhaarIv.substring(0, 10) + '...');
        console.log('  Tag:', emp.aadhaarTag);
      }

      if (emp.panNumber && emp.panIv) {
        console.log('\n💳 PAN Data:');
        console.log('  Encrypted:', emp.panNumber.substring(0, 20) + '...');
        console.log('  IV:', emp.panIv.substring(0, 10) + '...');
        console.log('  Tag:', emp.panTag);
      }
    });

    console.log('\n✅ Database encryption check completed!');

  } catch (error) {
    console.error('❌ Database check failed:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testDatabaseEncryption();