const { PrismaClient } = require('@prisma/client');

async function migrateContractStructure() {
  const prisma = new PrismaClient();

  try {
    console.log('🔄 Starting contract structure migration...');
    
    // Step 1: Disable RLS temporarily to allow schema changes
    console.log('1. Disabling RLS policies...');
    await prisma.$executeRaw`ALTER TABLE invoices DISABLE ROW LEVEL SECURITY;`;
    await prisma.$executeRaw`ALTER TABLE sites DISABLE ROW LEVEL SECURITY;`;
    await prisma.$executeRaw`ALTER TABLE clients DISABLE ROW LEVEL SECURITY;`;
    
    // Step 2: Drop dependent policies
    console.log('2. Dropping dependent policies...');
    try {
      await prisma.$executeRaw`DROP POLICY IF EXISTS invoices_tenant_isolation ON invoices;`;
      await prisma.$executeRaw`DROP POLICY IF EXISTS invoices_system_bypass ON invoices;`;
    } catch (err) {
      console.log('   Policies may not exist:', err.message);
    }
    
    // Step 3: Create contracts table
    console.log('3. Creating contracts table...');
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS contracts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        client_id UUID NOT NULL,
        contract_number VARCHAR(50) NOT NULL,
        title VARCHAR(200) NOT NULL,
        description TEXT,
        status "ContractStatus" NOT NULL DEFAULT 'ACTIVE',
        start_date DATE NOT NULL,
        end_date DATE,
        service_definitions JSONB,
        service_level_agreement JSONB,
        billing_preferences JSONB,
        default_billing_rates JSONB,
        contract_value DECIMAL(15, 2),
        payment_terms JSONB,
        renewal_notification_days INTEGER DEFAULT 90,
        auto_renewal_enabled BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT contracts_client_id_fkey FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
        CONSTRAINT contracts_client_id_contract_number_key UNIQUE (client_id, contract_number)
      );
    `;
    
    // Step 4: Create indexes for contracts
    console.log('4. Creating contracts indexes...');
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS contracts_client_id_idx ON contracts(client_id);`;
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS contracts_status_idx ON contracts(status);`;
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS contracts_start_date_idx ON contracts(start_date);`;
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS contracts_end_date_idx ON contracts(end_date);`;
    
    // Step 5: Migrate existing client contract data to contracts table
    console.log('5. Migrating client contract data...');
    await prisma.$executeRaw`
      INSERT INTO contracts (client_id, contract_number, title, status, start_date, end_date, billing_preferences, created_at, updated_at)
      SELECT 
        id, 
        'CONTRACT-' || LPAD(EXTRACT(YEAR FROM CURRENT_DATE)::text, 4, '0') || '-' || LPAD(ROW_NUMBER() OVER (ORDER BY created_at)::text, 5, '0'),
        'Contract for ' || name,
        COALESCE(contract_status, 'ACTIVE'),
        COALESCE(contract_start, '2020-01-01'::date),
        contract_end,
        billing_preferences,
        created_at,
        updated_at
      FROM clients
      WHERE id NOT IN (SELECT client_id FROM contracts)
      ON CONFLICT (client_id, contract_number) DO NOTHING;
    `;
    
    // Step 6: Add contract_id to sites table
    console.log('6. Adding contract_id to sites...');
    await prisma.$executeRaw`ALTER TABLE sites ADD COLUMN IF NOT EXISTS contract_id UUID;`;
    
    // Step 7: Update sites to reference contracts
    console.log('7. Updating sites to reference contracts...');
    await prisma.$executeRaw`
      UPDATE sites 
      SET contract_id = c.id 
      FROM contracts c 
      WHERE sites.client_id = c.client_id 
      AND sites.contract_id IS NULL;
    `;
    
    // Step 8: Add contract_id to invoices table  
    console.log('8. Adding contract_id to invoices...');
    await prisma.$executeRaw`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS contract_id UUID;`;
    
    // Step 9: Update invoices to reference contracts
    console.log('9. Updating invoices to reference contracts...');
    await prisma.$executeRaw`
      UPDATE invoices 
      SET contract_id = c.id 
      FROM contracts c 
      WHERE invoices.client_id = c.client_id 
      AND invoices.contract_id IS NULL;
    `;
    
    // Step 10: Make contract_id required and add foreign keys
    console.log('10. Adding foreign key constraints...');
    await prisma.$executeRaw`ALTER TABLE sites ALTER COLUMN contract_id SET NOT NULL;`;
    await prisma.$executeRaw`ALTER TABLE invoices ALTER COLUMN contract_id SET NOT NULL;`;
    
    await prisma.$executeRaw`
      ALTER TABLE sites 
      ADD CONSTRAINT IF NOT EXISTS sites_contract_id_fkey 
      FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE;
    `;
    
    await prisma.$executeRaw`
      ALTER TABLE invoices 
      ADD CONSTRAINT IF NOT EXISTS invoices_contract_id_fkey 
      FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE;
    `;
    
    // Step 11: Remove old contract fields from clients table
    console.log('11. Removing old contract fields from clients...');
    await prisma.$executeRaw`ALTER TABLE clients DROP COLUMN IF EXISTS contract_status CASCADE;`;
    await prisma.$executeRaw`ALTER TABLE clients DROP COLUMN IF EXISTS contract_start CASCADE;`;
    await prisma.$executeRaw`ALTER TABLE clients DROP COLUMN IF EXISTS contract_end CASCADE;`;
    await prisma.$executeRaw`ALTER TABLE clients DROP COLUMN IF EXISTS billing_preferences CASCADE;`;
    
    // Step 12: Add missing enums and fields from schema
    console.log('12. Adding missing enums and fields...');
    
    // Add client enums if they don't exist
    try {
      await prisma.$executeRaw`CREATE TYPE "ClientOrganizationType" AS ENUM ('CORPORATE_OFFICE', 'RESIDENTIAL_SOCIETY', 'HOSPITAL', 'SHOPPING_MALL', 'FACTORY', 'WAREHOUSE', 'EDUCATIONAL_INSTITUTION', 'GOVERNMENT_BUILDING', 'HOTEL');`;
    } catch (err) {
      console.log('   ClientOrganizationType enum may already exist');
    }
    
    try {
      await prisma.$executeRaw`CREATE TYPE "ClientUserRole" AS ENUM ('SECURITY_MANAGER', 'FACILITY_MANAGER', 'HR_MANAGER', 'FINANCE_MANAGER', 'REGIONAL_MANAGER');`;
    } catch (err) {
      console.log('   ClientUserRole enum may already exist');
    }
    
    try {
      await prisma.$executeRaw`CREATE TYPE "EmploymentType" AS ENUM ('FULL_TIME', 'PART_TIME', 'CONTRACT', 'TEMPORARY');`;
    } catch (err) {
      console.log('   EmploymentType enum may already exist');
    }
    
    // Add organization_type field to clients
    await prisma.$executeRaw`ALTER TABLE clients ADD COLUMN IF NOT EXISTS organization_type "ClientOrganizationType" DEFAULT 'CORPORATE_OFFICE';`;
    await prisma.$executeRaw`ALTER TABLE clients ADD COLUMN IF NOT EXISTS industry VARCHAR(100);`;
    await prisma.$executeRaw`ALTER TABLE clients ADD COLUMN IF NOT EXISTS company_size VARCHAR(50);`;
    
    // Step 13: Remove client_id from sites and invoices (now using contract_id)
    console.log('13. Removing old client_id references...');
    await prisma.$executeRaw`ALTER TABLE sites DROP COLUMN IF EXISTS client_id CASCADE;`;
    await prisma.$executeRaw`ALTER TABLE invoices DROP COLUMN IF EXISTS client_id CASCADE;`;
    
    // Step 14: Re-enable RLS and recreate policies
    console.log('14. Re-enabling RLS and recreating policies...');
    
    // Enable RLS on contracts
    await prisma.$executeRaw`ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;`;
    
    // Create RLS policies for contracts
    await prisma.$executeRaw`
      CREATE POLICY contracts_tenant_isolation ON contracts
      USING (client_id IN (
        SELECT c.id FROM clients c WHERE c.company_id = current_setting('app.current_tenant_id')::uuid
      ));
    `;
    
    await prisma.$executeRaw`
      CREATE POLICY contracts_system_bypass ON contracts
      USING (current_setting('app.bypass_rls', true)::boolean = true);
    `;
    
    // Update sites RLS policy to use contract instead of client
    await prisma.$executeRaw`DROP POLICY IF EXISTS sites_tenant_isolation ON sites;`;
    await prisma.$executeRaw`
      CREATE POLICY sites_tenant_isolation ON sites
      USING (contract_id IN (
        SELECT ct.id FROM contracts ct 
        JOIN clients c ON ct.client_id = c.id 
        WHERE c.company_id = current_setting('app.current_tenant_id')::uuid
      ));
    `;
    
    // Update invoices RLS policy to use contract instead of client
    await prisma.$executeRaw`DROP POLICY IF EXISTS invoices_tenant_isolation ON invoices;`;
    await prisma.$executeRaw`
      CREATE POLICY invoices_tenant_isolation ON invoices
      USING (contract_id IN (
        SELECT ct.id FROM contracts ct 
        JOIN clients c ON ct.client_id = c.id 
        WHERE c.company_id = current_setting('app.current_tenant_id')::uuid
      ));
    `;
    
    // Re-enable RLS on all tables
    await prisma.$executeRaw`ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;`;
    await prisma.$executeRaw`ALTER TABLE sites ENABLE ROW LEVEL SECURITY;`;
    await prisma.$executeRaw`ALTER TABLE clients ENABLE ROW LEVEL SECURITY;`;
    
    console.log('✅ Contract structure migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

migrateContractStructure().catch(console.error);