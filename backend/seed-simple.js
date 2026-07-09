const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const bcrypt = require('bcryptjs');

async function main() {
  const connectionString = process.env.DATABASE_URL || 'postgresql://payroll_user:payroll_pass_dev_123@localhost:5432/payroll_system_dev';
  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  
  const prisma = new PrismaClient({ adapter });

  try {
    console.log('🌱 Creating demo data...');

    // Create company first
    console.log('Creating company...');
    const company = await prisma.$executeRaw`
      INSERT INTO companies (id, name, slug, created_at, updated_at)
      VALUES (
        gen_random_uuid(),
        'Demo Security Services',
        'demo-security',
        now(),
        now()
      )
      ON CONFLICT (slug) DO UPDATE SET
        name = EXCLUDED.name,
        updated_at = now()
      RETURNING id;
    `;

    // Get the company ID
    const companyResult = await prisma.$queryRaw`
      SELECT id FROM companies WHERE slug = 'demo-security' LIMIT 1;
    `;
    
    if (!companyResult || companyResult.length === 0) {
      throw new Error('Failed to create or find company');
    }
    
    const companyId = companyResult[0].id;
    console.log('✅ Company ID:', companyId);

    // Create demo users
    const adminPassword = await bcrypt.hash('admin123', 12);
    const supervisorPassword = await bcrypt.hash('super123', 12);
    const guardPassword = await bcrypt.hash('guard123', 12);
    
    console.log('Creating demo users...');
    
    // Admin user
    await prisma.$executeRaw`
      INSERT INTO users (id, company_id, email, first_name, last_name, password_hash, role, is_active, created_at, updated_at)
      VALUES (
        gen_random_uuid(),
        ${companyId}::uuid,
        'admin@demosecurity.co.in',
        'System',
        'Administrator', 
        ${adminPassword},
        'COMPANY_ADMIN',
        true,
        now(),
        now()
      )
      ON CONFLICT (email) DO UPDATE SET
        password_hash = EXCLUDED.password_hash,
        updated_at = now();
    `;

    // Supervisor user  
    await prisma.$executeRaw`
      INSERT INTO users (id, company_id, email, first_name, last_name, password_hash, role, is_active, created_at, updated_at)
      VALUES (
        gen_random_uuid(),
        ${companyId}::uuid,
        'supervisor@demosecurity.co.in',
        'Rohit',
        'Supervisor', 
        ${supervisorPassword},
        'SUPERVISOR',
        true,
        now(),
        now()
      )
      ON CONFLICT (email) DO UPDATE SET
        password_hash = EXCLUDED.password_hash,
        updated_at = now();
    `;

    // Guard user
    await prisma.$executeRaw`
      INSERT INTO users (id, company_id, email, first_name, last_name, password_hash, role, is_active, created_at, updated_at)
      VALUES (
        gen_random_uuid(),
        ${companyId}::uuid,
        'guard@demosecurity.co.in',
        'Vikash',
        'Security', 
        ${guardPassword},
        'EMPLOYEE',
        true,
        now(),
        now()
      )
      ON CONFLICT (email) DO UPDATE SET
        password_hash = EXCLUDED.password_hash,
        updated_at = now();
    `;

    console.log('✅ Created demo users:');
    console.log('   🔑 Admin: admin@demosecurity.co.in / admin123');
    console.log('   🔑 Supervisor: supervisor@demosecurity.co.in / super123');
    console.log('   🔑 Guard: guard@demosecurity.co.in / guard123');

    // Create demo client
    console.log('Creating demo client...');
    await prisma.$executeRaw`
      INSERT INTO clients (id, company_id, name, contact_email, contact_info, contract_status, created_at, updated_at)
      VALUES (
        gen_random_uuid(),
        ${companyId}::uuid,
        'Tech Plaza Mall',
        'security@techplaza.co.in',
        '{"phone": "+91-98765-43210", "address": {"street": "MG Road", "city": "Bangalore", "state": "Karnataka", "country": "India", "postalCode": "560001"}}',
        'ACTIVE',
        now(),
        now()
      )
      ON CONFLICT DO NOTHING;
    `;

    // Get client ID for creating sites
    const clientResult = await prisma.$queryRaw`
      SELECT id FROM clients WHERE company_id = ${companyId}::uuid LIMIT 1;
    `;
    
    if (clientResult && clientResult.length > 0) {
      const clientId = clientResult[0].id;
      console.log('✅ Client ID:', clientId);

      // Create demo sites
      console.log('Creating demo sites...');
      await prisma.$executeRaw`
        INSERT INTO sites (id, client_id, name, address, operational_status, created_at, updated_at)
        VALUES 
        (
          gen_random_uuid(),
          ${clientId}::uuid,
          'Tech Plaza - Main Entrance',
          '{"street": "MG Road", "city": "Bangalore", "state": "Karnataka", "country": "India", "postalCode": "560001", "building": "Main Building"}',
          'ACTIVE',
          now(),
          now()
        ),
        (
          gen_random_uuid(),
          ${clientId}::uuid,
          'Tech Plaza - Parking Area',
          '{"street": "MG Road", "city": "Bangalore", "state": "Karnataka", "country": "India", "postalCode": "560001", "building": "Parking Complex"}',
          'ACTIVE',
          now(),
          now()
        )
        ON CONFLICT DO NOTHING;
      `;
      
      console.log('✅ Created demo sites');
      
      // Create demo employees
      console.log('Creating demo employees...');
      await prisma.$executeRaw`
        INSERT INTO employees (id, company_id, employee_number, first_name, last_name, email, phone, employment_status, hire_date, created_at, updated_at)
        VALUES 
        (
          gen_random_uuid(),
          ${companyId}::uuid,
          'EMP001',
          'Rajesh',
          'Kumar',
          'rajesh.kumar@demosecurity.co.in',
          '+91-98765-12345',
          'ACTIVE',
          '2024-01-15',
          now(),
          now()
        ),
        (
          gen_random_uuid(),
          ${companyId}::uuid,
          'EMP002',
          'Priya',
          'Sharma',
          'priya.sharma@demosecurity.co.in',
          '+91-98765-12346',
          'ACTIVE',
          '2024-02-01',
          now(),
          now()
        ),
        (
          gen_random_uuid(),
          ${companyId}::uuid,
          'EMP003',
          'Amit',
          'Singh',
          'amit.singh@demosecurity.co.in',
          '+91-98765-12347',
          'ACTIVE',
          '2024-01-20',
          now(),
          now()
        )
        ON CONFLICT DO NOTHING;
      `;
      
      console.log('✅ Created demo employees');
      
      // Get supervisor user ID for site assignment
      const supervisorResult = await prisma.$queryRaw`
        SELECT id FROM users WHERE email = 'supervisor@demosecurity.co.in' AND company_id = ${companyId}::uuid LIMIT 1;
      `;
      
      if (supervisorResult && supervisorResult.length > 0) {
        const supervisorUserId = supervisorResult[0].id;
        
        // Get site IDs for assignment
        const sitesResult = await prisma.$queryRaw`
          SELECT id FROM sites WHERE client_id = ${clientId}::uuid LIMIT 2;
        `;
        
        if (sitesResult && sitesResult.length > 0) {
          console.log('Assigning supervisor to sites...');
          
          // Assign supervisor to sites (you would typically have a supervisor_sites table)
          // For now, we'll add this info to user profile or create assignments
          await prisma.$executeRaw`
            UPDATE users 
            SET settings = jsonb_build_object(
              'assignedSites', 
              ARRAY[${sitesResult[0].id}::uuid, ${sitesResult[1] ? sitesResult[1].id : sitesResult[0].id}::uuid]
            )
            WHERE id = ${supervisorUserId}::uuid;
          `;
          
          console.log('✅ Assigned supervisor to demo sites');
        }
      }
      
      // Create demo payroll data
      console.log('Creating demo payroll data...');
      await prisma.$executeRaw`
        INSERT INTO payroll_runs (id, company_id, run_number, pay_period_start, pay_period_end, status, total_amount, created_at, updated_at)
        VALUES (
          gen_random_uuid(),
          ${companyId}::uuid,
          'JAN-2024-001',
          '2024-01-01',
          '2024-01-31',
          'COMPLETED',
          487500.00,
          now(),
          now()
        )
        ON CONFLICT DO NOTHING;
      `;
      
      // Create demo invoices
      console.log('Creating demo invoices...');
      await prisma.$executeRaw`
        INSERT INTO invoices (id, client_id, invoice_number, billing_period_start, billing_period_end, subtotal, tax_amount, total_amount, status, due_date, created_at, updated_at)
        VALUES (
          gen_random_uuid(),
          ${clientId}::uuid,
          'INV-2024-001',
          '2024-01-01',
          '2024-01-31',
          106779.66,
          19220.34,
          125000.00,
          'PAID',
          '2024-01-31',
          now(),
          now()
        ),
        (
          gen_random_uuid(),
          ${clientId}::uuid,
          'INV-2024-002',
          '2024-02-01',
          '2024-02-28',
          127118.64,
          22881.36,
          150000.00,
          'SENT',
          '2024-02-28',
          now(),
          now()
        )
        ON CONFLICT DO NOTHING;
      `;
      
      console.log('✅ Created demo financial data');
    }

    console.log('🇮🇳 Demo data created successfully!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();