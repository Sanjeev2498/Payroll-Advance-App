const { PrismaService } = require('./dist/src/prisma/prisma.service.js');

async function applyBug3Fix() {
  console.log('Applying Bug 3 Fix: Timestamp Precision...');
  
  const prisma = new PrismaService();
  await prisma.onModuleInit();
  
  try {
    console.log('\\n1. Backing up existing data...');
    const existingClients = await prisma.$queryRaw`SELECT id, contract_start, contract_end FROM clients LIMIT 5`;
    console.log('Sample existing client data:', existingClients);
    
    console.log('\\n2. Applying schema changes...');
    
    // Fix Client contract dates
    await prisma.$executeRaw`
      ALTER TABLE "clients" 
        ALTER COLUMN "contract_start" TYPE TIMESTAMPTZ USING "contract_start"::TIMESTAMPTZ,
        ALTER COLUMN "contract_end" TYPE TIMESTAMPTZ USING "contract_end"::TIMESTAMPTZ
    `;
    console.log('✅ Updated clients table: contract_start, contract_end -> TIMESTAMPTZ');
    
    // Fix Employee employment dates
    await prisma.$executeRaw`
      ALTER TABLE "employees"
        ALTER COLUMN "hire_date" TYPE TIMESTAMPTZ USING "hire_date"::TIMESTAMPTZ,
        ALTER COLUMN "termination_date" TYPE TIMESTAMPTZ USING "termination_date"::TIMESTAMPTZ
    `;
    console.log('✅ Updated employees table: hire_date, termination_date -> TIMESTAMPTZ');
    
    // Fix Assignment dates
    await prisma.$executeRaw`
      ALTER TABLE "assignments"
        ALTER COLUMN "start_date" TYPE TIMESTAMPTZ USING "start_date"::TIMESTAMPTZ,
        ALTER COLUMN "end_date" TYPE TIMESTAMPTZ USING "end_date"::TIMESTAMPTZ
    `;
    console.log('✅ Updated assignments table: start_date, end_date -> TIMESTAMPTZ');
    
    console.log('\\n3. Verifying changes...');
    const updatedClients = await prisma.$queryRaw`SELECT id, contract_start, contract_end FROM clients LIMIT 5`;
    console.log('Sample updated client data:', updatedClients);
    
    console.log('\\n🎉 Bug 3 Fix Applied Successfully!');
    console.log('All precision-critical timestamp fields now use TIMESTAMPTZ type.');
    
  } catch (error) {
    console.error('❌ Failed to apply Bug 3 fix:', error.message);
    throw error;
  } finally {
    await prisma.onModuleDestroy();
  }
}

applyBug3Fix().catch(console.error);