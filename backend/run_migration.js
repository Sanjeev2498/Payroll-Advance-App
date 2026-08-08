const { Client } = require('pg');

async function runMigration() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://payroll_user:payroll_pass_dev_123@127.0.0.1:5432/payroll_system_dev'
  });

  try {
    await client.connect();
    console.log('Connected to database');

    // Add columns one by one to avoid syntax issues
    const alterStatements = [
      'ALTER TABLE clients ADD COLUMN IF NOT EXISTS industry VARCHAR(100);',
      'ALTER TABLE clients ADD COLUMN IF NOT EXISTS company_size VARCHAR(50);',
      'ALTER TABLE clients ADD COLUMN IF NOT EXISTS service_level_agreement JSONB;',
      'ALTER TABLE clients ADD COLUMN IF NOT EXISTS document_requirements JSONB;',
      'ALTER TABLE clients ADD COLUMN IF NOT EXISTS onboarding_checklist JSONB;',
      'ALTER TABLE clients ADD COLUMN IF NOT EXISTS renewal_notification_days INTEGER DEFAULT 90;',
      'ALTER TABLE clients ADD COLUMN IF NOT EXISTS auto_renewal_enabled BOOLEAN DEFAULT false;',
      'ALTER TABLE clients ADD COLUMN IF NOT EXISTS tags VARCHAR(50)[];',
      'ALTER TABLE clients ADD COLUMN IF NOT EXISTS account_manager_id UUID;',
      'ALTER TABLE clients ADD COLUMN IF NOT EXISTS performance_metrics JSONB;',
      'ALTER TABLE clients ADD COLUMN IF NOT EXISTS contract_history JSONB;',
      'ALTER TABLE clients ADD COLUMN IF NOT EXISTS relationship_notes TEXT;',
      'ALTER TABLE clients ADD COLUMN IF NOT EXISTS last_contact_date TIMESTAMPTZ;',
      'ALTER TABLE clients ADD COLUMN IF NOT EXISTS next_follow_up_date TIMESTAMPTZ;'
    ];

    for (const statement of alterStatements) {
      try {
        await client.query(statement);
        console.log('✓ Executed:', statement.substring(0, 50) + '...');
      } catch (error) {
        if (error.code === '42701') {
          console.log('⚠ Column already exists:', statement.substring(0, 50) + '...');
        } else {
          console.error('✗ Error:', error.message);
        }
      }
    }

    // Add foreign key constraint
    try {
      await client.query(`
        ALTER TABLE clients 
        ADD CONSTRAINT fk_clients_account_manager 
        FOREIGN KEY (account_manager_id) 
        REFERENCES users(id) 
        ON DELETE SET NULL;
      `);
      console.log('✓ Added foreign key constraint');
    } catch (error) {
      if (error.code === '42710') {
        console.log('⚠ Constraint already exists');
      } else {
        console.error('✗ Error adding constraint:', error.message);
      }
    }

    // Create indexes
    try {
      await client.query('CREATE INDEX IF NOT EXISTS idx_clients_account_manager ON clients(account_manager_id);');
      console.log('✓ Created account_manager index');
    } catch (error) {
      console.error('✗ Error creating index:', error.message);
    }

    try {
      await client.query('CREATE INDEX IF NOT EXISTS idx_clients_tags ON clients USING GIN(tags);');
      console.log('✓ Created tags index');
    } catch (error) {
      console.error('✗ Error creating tags index:', error.message);
    }

    console.log('Migration completed successfully');
    
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await client.end();
  }
}

runMigration();