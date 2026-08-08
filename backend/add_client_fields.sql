-- Add missing client management fields
ALTER TABLE clients 
  ADD COLUMN IF NOT EXISTS industry VARCHAR(100),
  ADD COLUMN IF NOT EXISTS company_size VARCHAR(50),
  ADD COLUMN IF NOT EXISTS service_level_agreement JSONB,
  ADD COLUMN IF NOT EXISTS document_requirements JSONB,
  ADD COLUMN IF NOT EXISTS onboarding_checklist JSONB,
  ADD COLUMN IF NOT EXISTS renewal_notification_days INTEGER DEFAULT 90,
  ADD COLUMN IF NOT EXISTS auto_renewal_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS tags VARCHAR(50)[],
  ADD COLUMN IF NOT EXISTS account_manager_id UUID,
  ADD COLUMN IF NOT EXISTS performance_metrics JSONB,
  ADD COLUMN IF NOT EXISTS contract_history JSONB,
  ADD COLUMN IF NOT EXISTS relationship_notes TEXT,
  ADD COLUMN IF NOT EXISTS last_contact_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS next_follow_up_date TIMESTAMPTZ;

-- Add foreign key constraint for account manager
ALTER TABLE clients 
  ADD CONSTRAINT IF NOT EXISTS fk_clients_account_manager 
  FOREIGN KEY (account_manager_id) 
  REFERENCES users(id) 
  ON DELETE SET NULL;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_clients_account_manager ON clients(account_manager_id);
CREATE INDEX IF NOT EXISTS idx_clients_tags ON clients USING GIN(tags);