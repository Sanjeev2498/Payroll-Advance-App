const { PrismaService } = require('./dist/src/prisma/prisma.service.js');
const { v4: uuidv4 } = require('uuid');

async function verifyBug3Fix() {
  console.log('=== Verifying Bug 3 Fix: Timestamp Precision ===');
  
  const prisma = new PrismaService();
  await prisma.onModuleInit();
  
  const companyId = uuidv4();
  
  try {
    // Create test company
    await prisma.withSystemContext(async (p) => {
      await p.company.create({
        data: {
          id: companyId,
          name: 'Bug 3 Verification Company',
          slug: 'bug3-verify-' + Date.now()
        }
      });
    });
    
    console.log('\\n1. Testing client contract timestamp precision:');
    
    const precisionTestDate = new Date('2024-12-31T14:30:45.123Z');
    console.log(`Input timestamp: ${precisionTestDate.toISOString()}`);
    
    await prisma.withSystemContext(async (p) => {
      const clientId = uuidv4();
      
      // Create client with precise timestamps
      const client = await p.client.create({
        data: {
          id: clientId,
          companyId: companyId,
          name: 'Precision Test Client',
          contactEmail: 'precision@example.com',
          contractStart: precisionTestDate,
          contractEnd: new Date('2025-06-15T09:45:30.789Z')
        }
      });
      
      console.log(`Stored contractStart: ${client.contractStart?.toISOString()}`);
      console.log(`Stored contractEnd: ${client.contractEnd?.toISOString()}`);
      
      // Verify precision
      const startTime = client.contractStart?.getTime();
      const originalTime = precisionTestDate.getTime();
      
      if (startTime === originalTime) {
        console.log('✅ Contract start timestamp precision PRESERVED!');
      } else {
        console.log(`❌ Precision lost: ${originalTime - startTime}ms difference`);
      }
      
      // Clean up
      await p.client.delete({ where: { id: clientId } });
    });
    
    console.log('\\n2. Testing employee hire date precision:');
    
    const hirePrecisionDate = new Date('2024-03-15T08:00:00.000Z');
    console.log(`Hire timestamp: ${hirePrecisionDate.toISOString()}`);
    
    await prisma.withSystemContext(async (p) => {
      const employeeId = uuidv4();
      
      const employee = await p.employee.create({
        data: {
          id: employeeId,
          companyId: companyId,
          employeeNumber: 'EMP001',
          firstName: 'Precision',
          lastName: 'Test',
          hireDate: hirePrecisionDate
        }
      });
      
      console.log(`Stored hireDate: ${employee.hireDate.toISOString()}`);
      
      if (employee.hireDate.getTime() === hirePrecisionDate.getTime()) {
        console.log('✅ Employee hire date precision PRESERVED!');
      } else {
        console.log(`❌ Hire date precision lost`);
      }
      
      // Clean up
      await p.employee.delete({ where: { id: employeeId } });
    });
    
    console.log('\\n3. Testing assignment date precision:');
    
    // First create an employee and site for the assignment
    const employeeId = uuidv4();
    const siteId = uuidv4();
    const clientId = uuidv4();
    
    await prisma.withSystemContext(async (p) => {
      // Create client
      await p.client.create({
        data: {
          id: clientId,
          companyId: companyId,
          name: 'Assignment Test Client',
          contactEmail: 'assignment@example.com'
        }
      });
      
      // Create site
      await p.site.create({
        data: {
          id: siteId,
          clientId: clientId,
          name: 'Assignment Test Site',
          address: { street: '123 Test St', city: 'Test City' }
        }
      });
      
      // Create employee
      await p.employee.create({
        data: {
          id: employeeId,
          companyId: companyId,
          employeeNumber: 'ASSIGN001',
          firstName: 'Assignment',
          lastName: 'Test',
          hireDate: new Date()
        }
      });
      
      const assignmentStartDate = new Date('2024-04-01T10:15:30.456Z');
      console.log(`Assignment start: ${assignmentStartDate.toISOString()}`);
      
      const assignment = await p.assignment.create({
        data: {
          employeeId: employeeId,
          siteId: siteId,
          role: 'Security Guard',
          hourlyRate: 'dummy', // Encrypted field
          hourlyRateIv: 'dummy',
          hourlyRateTag: 'dummy',
          startDate: assignmentStartDate
        }
      });
      
      console.log(`Stored assignment startDate: ${assignment.startDate.toISOString()}`);
      
      if (assignment.startDate.getTime() === assignmentStartDate.getTime()) {
        console.log('✅ Assignment start date precision PRESERVED!');
      } else {
        console.log(`❌ Assignment start date precision lost`);
      }
      
      // Clean up
      await p.assignment.delete({ where: { id: assignment.id } });
      await p.employee.delete({ where: { id: employeeId } });
      await p.site.delete({ where: { id: siteId } });
      await p.client.delete({ where: { id: clientId } });
    });
    
  } finally {
    // Clean up test company
    try {
      await prisma.withSystemContext(async (p) => {
        await p.company.delete({ where: { id: companyId } });
      });
    } catch (e) {
      // Ignore cleanup errors
    }
    
    await prisma.onModuleDestroy();
  }
  
  console.log('\\n=== Bug 3 Fix Verification Complete ===');
  console.log('If all precision tests show "PRESERVED", Bug 3 is fixed!');
}

verifyBug3Fix().catch(console.error);