-- Fix schema migration for Task 5.4
-- Create contracts table
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

-- Create indexes on contracts
CREATE INDEX IF NOT EXISTS idx_contracts_client_id ON contracts(client_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status);
CREATE INDEX IF NOT EXISTS idx_contracts_client_id_rls ON contracts(client_id) WHERE client_id IS NOT NULL;

-- Add missing fields to clients table
ALTER TABLE clients ADD COLUMN IF NOT EXISTS organization_type "ClientOrganizationType";
ALTER TABLE clients ADD COLUMN IF NOT EXISTS industry VARCHAR(100);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS company_size VARCHAR(50);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- Create index on organization_type
CREATE INDEX IF NOT EXISTS idx_clients_organization_type ON clients(organization_type);

-- Migrate existing client data to contracts
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

-- Add contract_id column to sites table
ALTER TABLE sites ADD COLUMN IF NOT EXISTS contract_id UUID;

-- Populate contract_id in sites based on client_id
UPDATE sites SET contract_id = contracts.id 
FROM contracts 
WHERE sites.client_id = contracts.client_id 
AND sites.contract_id IS NULL;

-- Add foreign key constraint and indexes for contract_id
ALTER TABLE sites ADD CONSTRAINT IF NOT EXISTS fk_sites_contract_id FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_sites_contract_id ON sites(contract_id);
CREATE INDEX IF NOT EXISTS idx_sites_contract_id_rls ON sites(contract_id) WHERE contract_id IS NOT NULL;

-- Add missing staffing level fields to sites
ALTER TABLE sites ADD COLUMN IF NOT EXISTS min_staffing_level INTEGER DEFAULT 1;
ALTER TABLE sites ADD COLUMN IF NOT EXISTS max_staffing_level INTEGER;

-- Update client_id reference to clientId in invoices (already correct, just verify)
-- This should already be correct based on schema

SELECT 'Schema migration completed successfully!' as result;