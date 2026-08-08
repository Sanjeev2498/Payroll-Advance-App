-- Fix contract migration manually
-- Step 1: Disable RLS temporarily
ALTER TABLE invoices DISABLE ROW LEVEL SECURITY;
ALTER TABLE sites DISABLE ROW LEVEL SECURITY;
ALTER TABLE clients DISABLE ROW LEVEL SECURITY;

-- Drop dependent policies
DROP POLICY IF EXISTS invoices_tenant_isolation ON invoices;
DROP POLICY IF EXISTS invoices_system_bypass ON invoices;

-- Create missing enums
DO $$ BEGIN
  CREATE TYPE "ClientOrganizationType" AS ENUM ('CORPORATE_OFFICE', 'RESIDENTIAL_SOCIETY', 'HOSPITAL', 'SHOPPING_MALL', 'FACTORY', 'WAREHOUSE', 'EDUCATIONAL_INSTITUTION', 'GOVERNMENT_BUILDING', 'HOTEL');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "ClientUserRole" AS ENUM ('SECURITY_MANAGER', 'FACILITY_MANAGER', 'HR_MANAGER', 'FINANCE_MANAGER', 'REGIONAL_MANAGER');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "EmploymentType" AS ENUM ('FULL_TIME', 'PART_TIME', 'CONTRACT', 'TEMPORARY');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create contracts table if it doesn't exist
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

-- Create indexes for contracts
CREATE INDEX IF NOT EXISTS contracts_client_id_idx ON contracts(client_id);
CREATE INDEX IF NOT EXISTS contracts_status_idx ON contracts(status);
CREATE INDEX IF NOT EXISTS contracts_start_date_idx ON contracts(start_date);
CREATE INDEX IF NOT EXISTS contracts_end_date_idx ON contracts(end_date);

-- Migrate existing client contract data to contracts table (only if no contracts exist)
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

-- Add missing columns to existing tables
ALTER TABLE sites ADD COLUMN IF NOT EXISTS contract_id UUID;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS contract_id UUID;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS organization_type "ClientOrganizationType" DEFAULT 'CORPORATE_OFFICE';
ALTER TABLE clients ADD COLUMN IF NOT EXISTS industry VARCHAR(100);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS company_size VARCHAR(50);

-- Update sites and invoices to reference contracts
UPDATE sites 
SET contract_id = c.id 
FROM contracts c 
WHERE sites.client_id = c.client_id 
AND sites.contract_id IS NULL;

UPDATE invoices 
SET contract_id = c.id 
FROM contracts c 
WHERE invoices.client_id = c.client_id 
AND invoices.contract_id IS NULL;

-- Make contract_id required after data migration
ALTER TABLE sites ALTER COLUMN contract_id SET NOT NULL;
ALTER TABLE invoices ALTER COLUMN contract_id SET NOT NULL;

-- Add foreign key constraints
ALTER TABLE sites 
ADD CONSTRAINT IF NOT EXISTS sites_contract_id_fkey 
FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE;

ALTER TABLE invoices 
ADD CONSTRAINT IF NOT EXISTS invoices_contract_id_fkey 
FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE;

-- Remove old contract fields from clients table
ALTER TABLE clients DROP COLUMN IF EXISTS contract_status CASCADE;
ALTER TABLE clients DROP COLUMN IF EXISTS contract_start CASCADE;
ALTER TABLE clients DROP COLUMN IF EXISTS contract_end CASCADE;
ALTER TABLE clients DROP COLUMN IF EXISTS billing_preferences CASCADE;

-- Remove old client_id references (now using contract_id)
ALTER TABLE sites DROP COLUMN IF EXISTS client_id CASCADE;
ALTER TABLE invoices DROP COLUMN IF EXISTS client_id CASCADE;

-- Enable RLS on contracts
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for contracts
CREATE POLICY contracts_tenant_isolation ON contracts
USING (client_id IN (
  SELECT c.id FROM clients c WHERE c.company_id = current_setting('app.current_tenant_id')::uuid
));

CREATE POLICY contracts_system_bypass ON contracts
USING (current_setting('app.bypass_rls', true)::boolean = true);

-- Update RLS policies for sites and invoices to use contracts
DROP POLICY IF EXISTS sites_tenant_isolation ON sites;
CREATE POLICY sites_tenant_isolation ON sites
USING (contract_id IN (
  SELECT ct.id FROM contracts ct 
  JOIN clients c ON ct.client_id = c.id 
  WHERE c.company_id = current_setting('app.current_tenant_id')::uuid
));

DROP POLICY IF EXISTS invoices_tenant_isolation ON invoices;
CREATE POLICY invoices_tenant_isolation ON invoices
USING (contract_id IN (
  SELECT ct.id FROM contracts ct 
  JOIN clients c ON ct.client_id = c.id 
  WHERE c.company_id = current_setting('app.current_tenant_id')::uuid
));

-- Re-enable RLS on all tables
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;