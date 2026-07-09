const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');

async function getEmployees() {
  const connectionString = 'postgresql://payroll_user:payroll_pass_dev_123@localhost:5432/payroll_system_dev';
  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });
  
  try {
    const employees = await prisma.employee.findMany({
      select: {
        id: true,
        employeeNumber: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        employmentStatus: true
      }
    });
    
    console.log('📋 Demo Employees:');
    console.log('==================');
    employees.forEach(emp => {
      console.log('ID: ' + emp.id);
      console.log('Employee Number: ' + emp.employeeNumber);
      console.log('Name: ' + emp.firstName + ' ' + emp.lastName);
      console.log('Email: ' + emp.email);
      console.log('Phone: ' + (emp.phone || 'N/A'));
      console.log('Status: ' + emp.employmentStatus);
      console.log('---');
    });
    
    console.log('\n🆔 Employee IDs for easy copy-paste:');
    console.log('=====================================');
    employees.forEach(emp => {
      console.log(emp.id + ' // ' + emp.firstName + ' ' + emp.lastName);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

getEmployees();