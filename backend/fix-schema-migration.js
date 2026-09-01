require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

async function fixSchemaMigration() {
  const prisma = new PrismaClient({
    log: ['info', 'warn', 'error'],
  });
  
  try {
    console.log('Starting schema migration fix...');
    
    // Step 1: Create contracts table first
    console.log('Creating contracts table...');
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS contracts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
        contract_number VARCHAR(50) NOT NULL,
        title VARCHAR(200) NOT NULL,
        description TEXT,
        status "ContractStatus" DEFAULT 'ACTIVE' NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE,
        service_definitions JSONB,
        billing_preferences JSONB,
        contract_value DECIMAL(15,2),
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        UNIQUE(client_id, contract_number)
      );
    `;
    
    // Step 2: Create indexes
    console.log('Creating indexes on contracts...');
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS idx_contracts_client_id ON contracts(client_id);`;
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status);`;
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS idx_contracts_client_id_rls ON contracts(client_id) WHERE client_id IS NOT NULL;`;
    
    // Step 3: Add missing fields to clients table
    console.log('Adding missing fields to clients table...');
    await prisma.$executeRaw`ALTER TABLE clients ADD COLUMN IF NOT EXISTS organization_type "ClientOrganizationType";`;
    await prisma.$executeRaw`ALTER TABLE clients ADD COLUMN IF NOT EXISTS industry VARCHAR(100);`;
    await prisma.$executeRaw`ALTER TABLE clients ADD COLUMN IF NOT EXISTS company_size VARCHAR(50);`;
    await prisma.$executeRaw`ALTER TABLE clients ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';`;
    
    // Step 4: Create index on organization_type
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS idx_clients_organization_type ON clients(organization_type);`;
    
    // Step 5: Migrate existing client data to contracts
    console.log('Migrating existing client data to contracts...');
    await prisma.$executeRaw`
      INSERT INTO contracts (client_id, contract_number, title, status, start_date, end_date, billing_preferences, created_at, updated_at)
      SELECT 
        id as client_id,
        'CONTRACT-' || EXTRACT(YEAR FROM COALESCE(contract_start, created_at)) || '-' || LPAD(ROW_NUMBER() OVER (ORDER BY created_at)::text, 5, '0') as contract_number,
        'Security Services - ' || name as title,
        contract_status as status,
        COALESCE(contract_start, created_at::date) as start_date,
        contract_end as end_date,
        billing_preferences,
        created_at,
        updated_at
      FROM clients
      WHERE NOT EXISTS (SELECT 1 FROM contracts WHERE contracts.client_id = clients.id);
    `;
    
    // Step 6: Add contract_id column to sites table first
    console.log('Adding contract_id column to sites...');
    await prisma.$executeRaw`ALTER TABLE sites ADD COLUMN IF NOT EXISTS contract_id UUID;`;
    
    // Step 7: Populate contract_id in sites based on client_id
    console.log('Populating contract_id in sites...');
    await prisma.$executeRaw`
      UPDATE sites SET contract_id = contracts.id 
      FROM contracts 
      WHERE sites.client_id = contracts.client_id 
      AND sites.contract_id IS NULL;
    `;
    
    // Step 8: Add foreign key constraint and indexes for contract_id
    console.log('Adding constraints and indexes...');
    await prisma.$executeRaw`ALTER TABLE sites ADD CONSTRAINT IF NOT EXISTS fk_sites_contract_id FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE;`;
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS idx_sites_contract_id ON sites(contract_id);`;
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS idx_sites_contract_id_rls ON sites(contract_id) WHERE contract_id IS NOT NULL;`;
    
    // Step 9: Add missing staffing level fields to sites
    await prisma.$executeRaw`ALTER TABLE sites ADD COLUMN IF NOT EXISTS min_staffing_level INTEGER DEFAULT 1;`;
    await prisma.$executeRaw`ALTER TABLE sites ADD COLUMN IF NOT EXISTS max_staffing_level INTEGER;`;
    
    console.log('✅ Schema migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Schema migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

fixSchemaMigration().catch(console.error);