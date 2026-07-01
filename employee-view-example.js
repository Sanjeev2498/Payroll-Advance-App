// Example: What an EMPLOYEE sees vs other roles
const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

class EncryptionUtil {
  constructor() {
    this.algorithm = 'aes-256-cbc';
    this.keyLength = 32;
    this.ivLength = 16;
  }

  getEncryptionKey(level) {
    const keyMap = {
      sensitive: 'dev_sensitive_key_change_in_production_aes256_secret_12345',
      restricted: 'dev_restricted_key_change_in_production_aes256_secret_67890',
      financial: 'dev_financial_key_change_in_production_aes256_secret_abcde',
    };
    const keyString = keyMap[level];
    return crypto.pbkdf2Sync(keyString, 'payroll-salt', 100000, this.keyLength, 'sha256');
  }

  decrypt(encryptedData, iv, tag, level) {
    if (!encryptedData || !iv) return null;
    const key = this.getEncryptionKey(level);
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, Buffer.from(iv, 'hex'));
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  maskData(data, role, dataType) {
    if (!data) return '';
    switch (role) {
      case 'EMPLOYEE':
        switch (dataType) {
          case 'phone': return data.replace(/(\+91\s)(\d{2})(\d{3})-(\d{2})(\d{3})/, '$1●●$3-●●$5');
          case 'email': 
            const [username, domain] = data.split('@');
            return `${username.slice(0, 2)}●●●@${domain}`;
          case 'aadhaar': return '●●●●-●●●●-●●●●';
          case 'pan': return '●●●●●●●●●●';
        }
        break;
      case 'SUPERVISOR':
      case 'MANAGER':
        switch (dataType) {
          case 'phone':
          case 'email': return data;
          case 'aadhaar':
          case 'pan': return '●●●●●●●●●●●●';
        }
        break;
      case 'COMPANY_ADMIN':
        return data;
      default:
        return '●●●●●●●●●●●●';
    }
  }
}

async function showEmployeeView() {
  const prisma = new PrismaClient();
  const encryptionUtil = new EncryptionUtil();

  try {
    console.log('👤 EMPLOYEE DASHBOARD - What an Employee Sees\n');
    console.log('='.repeat(60));

    // Get employee data (encrypted in database)
    const employee = await prisma.employee.findFirst({
      where: { employeeNumber: 'EMP002' }, // Priya Reddy
      select: {
        id: true,
        firstName: true,
        lastName: true,
        employeeNumber: true,
        employmentStatus: true,
        hireDate: true,
        email: true, emailIv: true, emailTag: true,
        phone: true, phoneIv: true, phoneTag: true,
        aadhaarNumber: true, aadhaarIv: true, aadhaarTag: true,
        panNumber: true, panIv: true, panTag: true,
        skills: true,
        metadata: true
      }
    });

    if (!employee) {
      console.log('❌ Employee not found');
      return;
    }

    console.log('🏢 EMPLOYEE PORTAL - Personal Information');
    console.log('='.repeat(60));
    console.log();

    // === BASIC INFORMATION (Always visible) ===
    console.log('📋 BASIC INFORMATION');
    console.log('─'.repeat(30));
    console.log(`👤 Name: ${employee.firstName} ${employee.lastName}`);
    console.log(`🔢 Employee ID: ${employee.employeeNumber}`);
    console.log(`📅 Hire Date: ${employee.hireDate.toDateString()}`);
    console.log(`📊 Status: ${employee.employmentStatus}`);
    console.log(`🛠️  Skills: ${employee.skills?.join(', ') || 'Not specified'}`);
    
    const metadata = employee.metadata || {};
    console.log(`🏢 Department: ${metadata.department || 'Not specified'}`);
    console.log(`💼 Job Title: ${metadata.jobTitle || 'Not specified'}`);
    console.log();

    // === CONTACT INFORMATION (Partially masked for employee) ===
    console.log('📞 CONTACT INFORMATION');
    console.log('─'.repeat(30));
    
    // Decrypt and mask email for employee view
    if (employee.email && employee.emailIv) {
      const decryptedEmail = encryptionUtil.decrypt(employee.email, employee.emailIv, employee.emailTag, 'sensitive');
      const maskedEmail = encryptionUtil.maskData(decryptedEmail, 'EMPLOYEE', 'email');
      console.log(`📧 Email: ${maskedEmail}`);
      console.log('   ↳ (Your full email is protected for privacy)');
    }
    
    // Decrypt and mask phone for employee view
    if (employee.phone && employee.phoneIv) {
      const decryptedPhone = encryptionUtil.decrypt(employee.phone, employee.phoneIv, employee.phoneTag, 'sensitive');
      const maskedPhone = encryptionUtil.maskData(decryptedPhone, 'EMPLOYEE', 'phone');
      console.log(`📱 Phone: ${maskedPhone}`);
      console.log('   ↳ (Some digits hidden for security)');
    }
    console.log();

    // === IDENTITY DOCUMENTS (Hidden from employee for compliance) ===
    console.log('🆔 IDENTITY DOCUMENTS');
    console.log('─'.repeat(30));
    console.log(`🇮🇳 Aadhaar: ${encryptionUtil.maskData('', 'EMPLOYEE', 'aadhaar')}`);
    console.log('   ↳ (Hidden for your privacy and security)');
    console.log(`💳 PAN: ${encryptionUtil.maskData('', 'EMPLOYEE', 'pan')}`);
    console.log('   ↳ (Hidden for your privacy and security)');
    console.log();

    // === FINANCIAL INFORMATION (Restricted) ===
    console.log('💰 FINANCIAL INFORMATION');
    console.log('─'.repeat(30));
    console.log('💵 Salary: RESTRICTED');
    console.log('   ↳ (Contact HR for salary information)');
    console.log('💸 Hourly Rate: RESTRICTED');
    console.log('   ↳ (Contact HR for rate information)');
    console.log();

    // === EMPLOYEE ACTIONS (What employee can do) ===
    console.log('⚡ AVAILABLE ACTIONS');
    console.log('─'.repeat(30));
    console.log('✅ View my shift schedule');
    console.log('✅ Clock in/out for shifts');
    console.log('✅ View attendance history');
    console.log('✅ Update emergency contact (through HR)');
    console.log('✅ View payslips (when available)');
    console.log('❌ Cannot see other employees\' data');
    console.log('❌ Cannot see salary/financial details');
    console.log('❌ Cannot see full identity documents');
    console.log();

    console.log('='.repeat(60));
    console.log('🔒 Your personal data is encrypted and secure!');
    console.log('='.repeat(60));

    // Show comparison with other roles
    console.log('\n\n🔍 COMPARISON: What Different Roles See\n');
    
    const decryptedEmail = encryptionUtil.decrypt(employee.email, employee.emailIv, employee.emailTag, 'sensitive');
    const decryptedPhone = encryptionUtil.decrypt(employee.phone, employee.phoneIv, employee.phoneTag, 'sensitive');
    const decryptedAadhaar = encryptionUtil.decrypt(employee.aadhaarNumber, employee.aadhaarIv, employee.aadhaarTag, 'restricted');
    const decryptedPAN = encryptionUtil.decrypt(employee.panNumber, employee.panIv, employee.panTag, 'restricted');

    console.log('📊 DATA VISIBILITY BY ROLE:');
    console.log('─'.repeat(50));
    console.log('Field               | EMPLOYEE     | SUPERVISOR   | ADMIN');
    console.log('─'.repeat(50));
    console.log(`Email               | ${encryptionUtil.maskData(decryptedEmail, 'EMPLOYEE', 'email').padEnd(12)} | ${decryptedEmail.padEnd(12)} | ${decryptedEmail}`);
    console.log(`Phone               | ${encryptionUtil.maskData(decryptedPhone, 'EMPLOYEE', 'phone').padEnd(12)} | ${decryptedPhone.padEnd(12)} | ${decryptedPhone}`);
    console.log(`Aadhaar             | ${'●●●●-●●●●-●●●●'.padEnd(12)} | ${'●●●●●●●●●●●●'.padEnd(12)} | ${decryptedAadhaar}`);
    console.log(`PAN                 | ${'●●●●●●●●●●'.padEnd(12)} | ${'●●●●●●●●●●●●'.padEnd(12)} | ${decryptedPAN}`);
    console.log(`Salary              | ${'RESTRICTED'.padEnd(12)} | ${'RESTRICTED'.padEnd(12)} | Full Access`);
    console.log('─'.repeat(50));

    console.log('\n💡 KEY POINTS FOR EMPLOYEES:');
    console.log('• Your sensitive data is ENCRYPTED in our database');
    console.log('• You see a privacy-focused view of your own information');
    console.log('• Identity documents are hidden to protect against identity theft');
    console.log('• Only authorized HR/Admin can see full details when needed');
    console.log('• All data access is logged for security compliance');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

require('dotenv').config();
showEmployeeView();