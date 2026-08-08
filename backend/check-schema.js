const { PrismaClient } = require('@prisma/client');

async function checkSchema() {
  const client = new PrismaClient();
  
  try {
    console.log('Checking sites table structure...');
    const result = await client.$queryRaw`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'sites' ORDER BY ordinal_position`;
    console.log('Sites table columns:', result);
    
    // Try to create a simple site to see if contract_id field works
    console.log('\nTesting contract_id field...');
    try {
      // First create a company and client and contract
      const company = await client.company.create({
        data: {
          name: 'Test Company',
          slug: 'test-company'
        }
      });
      
      const clientRecord = await client.client.create({
        data: {
          companyId: company.id,
          name: 'Test Client',
          contactEmail: 'test@example.com'
        }
      });
      
      const contract = await client.contract.create({
        data: {
          clientId: clientRecord.id,
          contractNumber: 'TEST-001',
          title: 'Test Contract',
          status: 'ACTIVE',
          startDate: new Date(),
          serviceDefinitions: {}
        }
      });
      
      console.log('Created test contract:', contract.id);
      
      // Now try to create a site with contractId
      const site = await client.site.create({
        data: {
          contractId: contract.id,
          name: 'Test Site',
          address: { street: 'Test Street' }
        }
      });
      
      console.log('✅ Successfully created site with contract_id:', site.id);
      
      // Cleanup
      await client.site.delete({ where: { id: site.id } });
      await client.contract.delete({ where: { id: contract.id } });
      await client.client.delete({ where: { id: clientRecord.id } });
      await client.company.delete({ where: { id: company.id } });
      
    } catch (error) {
      console.log('❌ Error creating site with contract_id:', error.message);
    }
    
  } catch (error) {
    console.error('Error checking schema:', error.message);
  } finally {
    await client.$disconnect();
  }
}

checkSchema();