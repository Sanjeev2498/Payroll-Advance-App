const { Client } = require('pg');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

async function createTestUsers() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://payroll_user:payroll_pass_dev_123@127.0.0.1:5432/payroll_system_dev'
  });

  try {
    await client.connect();
    console.log('🔌 Connected to database');
    console.log('👥 Creating test users...\n');

    // Hash password (using same method as auth service)
    const hashedPassword = await bcrypt.hash('admin123', 12);
    
    // Check if company exists
    const companyResult = await client.query(`SELECT id FROM companies WHERE slug = 'secureforce'`);
    let companyId;
    
    if (companyResult.rows.length > 0) {
      companyId = companyResult.rows[0].id;
      console.log('✅ Using existing company: SecureForce Solutions');
    } else {
      companyId = uuidv4();
      await client.query(`
        INSERT INTO companies (id, name, slug, settings, branding, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
      `, [
        companyId,
        'SecureForce Solutions',
        'secureforce',
        JSON.stringify({}),
        JSON.stringify({})
      ]);
      console.log('✅ Company created: SecureForce Solutions');
    }

    // Create users
    const users = [
      {
        id: uuidv4(),
        email: 'admin@securityforce.com',
        firstName: 'John',
        lastName: 'Administrator',
        role: 'COMPANY_ADMIN'
      },
      {
        id: uuidv4(),
        email: 'supervisor@securityforce.com',
        firstName: 'Sarah',
        lastName: 'Supervisor',
        role: 'SUPERVISOR'
      },
      {
        id: uuidv4(),
        email: 'guard@securityforce.com',
        firstName: 'David',
        lastName: 'Guard',
        role: 'EMPLOYEE'
      }
    ];

    for (const user of users) {
      await client.query(`
        INSERT INTO users (id, email, password_hash, first_name, last_name, role, company_id, is_active, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
      `, [
        user.id,
        user.email,
        hashedPassword,
        user.firstName,
        user.lastName,
        user.role,
        companyId,
        true
      ]);
      console.log(`✅ User created: ${user.email} (${user.role})`);
    }

    // Create client company and user
    const clientCompanyId = uuidv4();
    await client.query(`
      INSERT INTO companies (id, name, slug, settings, branding, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
    `, [
      clientCompanyId,
      'TechCorp Industries',
      'techcorp',
      JSON.stringify({}),
      JSON.stringify({})
    ]);
    console.log('✅ Client company created: TechCorp Industries');

    const clientUserId = uuidv4();
    await client.query(`
      INSERT INTO users (id, email, password_hash, first_name, last_name, role, company_id, is_active, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
    `, [
      clientUserId,
      'client@techcorp.com',
      hashedPassword,
      'Michael',
      'Client',
      'EMPLOYEE', // Client users are typically EMPLOYEE role
      clientCompanyId,
      true
    ]);
    console.log('✅ Client user created: client@techcorp.com');

    console.log('\n🎯 TEST USERS READY FOR LOGIN');
    console.log('📧 All users can login with password: admin123');
    console.log('🌐 Frontend: http://localhost:3000');

  } catch (error) {
    console.error('❌ Failed to create test users:', error);
  } finally {
    await client.end();
    console.log('🔌 Database connection closed');
  }
}

createTestUsers();