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
      sensitive: process.env.ENCRYPTION_KEY_SENSITIVE || 'dev_sensitive_key_change_in_production_aes256_secret_12345',
      restricted: process.env.ENCRYPTION_KEY_RESTRICTED || 'dev_restricted_key_change_in_production_aes256_secret_67890',
      financial: process.env.ENCRYPTION_KEY_FINANCIAL || 'dev_financial_key_change_in_production_aes256_secret_abcde',
    };

    const keyString = keyMap[level];
    return crypto.pbkdf2Sync(keyString, 'payroll-salt', 100000, this.keyLength, 'sha256');
  }

  encrypt(plaintext, level) {
    if (!plaintext || plaintext.trim() === '') {
      return null;
    }

    const key = this.getEncryptionKey(level);
    const iv = crypto.randomBytes(this.ivLength);
    
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return {
      encryptedData: encrypted,
      iv: iv.toString('hex'),
      tag: 'no-tag',
    };
  }
}

async function migrateEncryptExistingData() {
  const prisma = new PrismaClient();
  const encryptionUtil = new EncryptionUtil();

  try {
    console.log('🔐 Starting migration to encrypt existing employee data...\n');

    // Get all employees with unencrypted data
    const employees = await prisma.employee.findMany({
      where: {
        OR: [
          { emailIv: null },
          { phoneIv: null },
          { aadhaarIv: null },
          { panIv: null }
        ]
      }
    });

    console.log(`Found ${employees.length} employees with unencrypted data`);

    for (const employee of employees) {
      console.log(`\n📝 Processing: ${employee.firstName} ${employee.lastName}`);

      const updateData = {};

      // Encrypt email if present and not encrypted
      if (employee.email && !employee.emailIv) {
        const encrypted = encryptionUtil.encrypt(employee.email, 'sensitive');
        if (encrypted) {
          updateData.email = encrypted.encryptedData;
          updateData.emailIv = encrypted.iv;
          updateData.emailTag = encrypted.tag;
          console.log('  ✅ Email encrypted');
        }
      }

      // Encrypt phone if present and not encrypted
      if (employee.phone && !employee.phoneIv) {
        const encrypted = encryptionUtil.encrypt(employee.phone, 'sensitive');
        if (encrypted) {
          updateData.phone = encrypted.encryptedData;
          updateData.phoneIv = encrypted.iv;
          updateData.phoneTag = encrypted.tag;
          console.log('  ✅ Phone encrypted');
        }
      }

      // Encrypt Aadhaar if present and not encrypted
      if (employee.aadhaarNumber && !employee.aadhaarIv) {
        const encrypted = encryptionUtil.encrypt(employee.aadhaarNumber, 'restricted');
        if (encrypted) {
          updateData.aadhaarNumber = encrypted.encryptedData;
          updateData.aadhaarIv = encrypted.iv;
          updateData.aadhaarTag = encrypted.tag;
          console.log('  ✅ Aadhaar encrypted');
        }
      }

      // Encrypt PAN if present and not encrypted
      if (employee.panNumber && !employee.panIv) {
        const encrypted = encryptionUtil.encrypt(employee.panNumber, 'restricted');
        if (encrypted) {
          updateData.panNumber = encrypted.encryptedData;
          updateData.panIv = encrypted.iv;
          updateData.panTag = encrypted.tag;
          console.log('  ✅ PAN encrypted');
        }
      }

      // Update employee with encrypted data
      if (Object.keys(updateData).length > 0) {
        await prisma.employee.update({
          where: { id: employee.id },
          data: updateData
        });
        console.log(`  ✅ Updated employee ${employee.employeeNumber}`);
      } else {
        console.log('  ℹ️  No data to encrypt');
      }
    }

    // Also encrypt Assignment hourly rates
    console.log('\n💰 Processing assignment hourly rates...');
    
    const assignments = await prisma.assignment.findMany({
      where: { 
        OR: [
          { hourlyRateIv: { equals: null } },
          { hourlyRateIv: { equals: '' } }
        ]
      }
    });

    for (const assignment of assignments) {
      if (assignment.hourlyRate && !assignment.hourlyRateIv) {
        // Check if hourlyRate is a plain number that needs encryption
        if (!isNaN(assignment.hourlyRate)) {
          const encrypted = encryptionUtil.encrypt(assignment.hourlyRate, 'financial');
          if (encrypted) {
            await prisma.assignment.update({
              where: { id: assignment.id },
              data: {
                hourlyRate: encrypted.encryptedData,
                hourlyRateIv: encrypted.iv,
                hourlyRateTag: encrypted.tag
              }
            });
            console.log(`  ✅ Encrypted hourly rate for assignment ${assignment.id}`);
          }
        }
      }
    }

    console.log('\n✅ Encryption migration completed successfully!');

  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Load environment variables
require('dotenv').config();

migrateEncryptExistingData();