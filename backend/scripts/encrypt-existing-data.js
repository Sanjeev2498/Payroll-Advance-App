/**
 * Script to encrypt existing employee data after schema migration
 * This script should be run once after adding encryption fields
 */

const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

// Encryption configuration (matches EncryptionUtil)
const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 16;

// Environment-based encryption keys
const ENCRYPTION_KEYS = {
  sensitive: process.env.ENCRYPTION_KEY_SENSITIVE || 'dev_sensitive_key_change_in_production_aes256_secret_12345',
  restricted: process.env.ENCRYPTION_KEY_RESTRICTED || 'dev_restricted_key_change_in_production_aes256_secret_67890',
  financial: process.env.ENCRYPTION_KEY_FINANCIAL || 'dev_financial_key_change_in_production_aes256_secret_abcde'
};

function getEncryptionKey(level) {
  const keyString = ENCRYPTION_KEYS[level];
  if (!keyString) {
    throw new Error(`Encryption key not found for level: ${level}`);
  }
  return crypto.pbkdf2Sync(keyString, 'payroll-salt', 100000, KEY_LENGTH, 'sha256');
}

function encrypt(plaintext, level) {
  if (!plaintext || plaintext.trim() === '') {
    return null;
  }

  const key = getEncryptionKey(level);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipherGCM(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const tag = cipher.getAuthTag();

  return {
    encryptedData: encrypted,
    iv: iv.toString('hex'),
    tag: tag.toString('hex'),
  };
}

async function encryptExistingEmployeeData() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔒 Starting encryption of existing employee data...');

    // Find all employees with unencrypted data
    const employees = await prisma.employee.findMany({
      where: {
        OR: [
          { email: { not: null }, emailIv: null },
          { phone: { not: null }, phoneIv: null },
          { aadhaarNumber: { not: null }, aadhaarIv: null },
          { panNumber: { not: null }, panIv: null },
        ]
      }
    });

    console.log(`📊 Found ${employees.length} employees with unencrypted data`);

    for (const employee of employees) {
      const updates = {};

      // Encrypt email if exists and not already encrypted
      if (employee.email && !employee.emailIv) {
        console.log(`📧 Encrypting email for employee: ${employee.id}`);
        const emailEncryption = encrypt(employee.email, 'sensitive');
        if (emailEncryption) {
          updates.email = emailEncryption.encryptedData;
          updates.emailIv = emailEncryption.iv;
          updates.emailTag = emailEncryption.tag;
        }
      }

      // Encrypt phone if exists and not already encrypted
      if (employee.phone && !employee.phoneIv) {
        console.log(`📱 Encrypting phone for employee: ${employee.id}`);
        const phoneEncryption = encrypt(employee.phone, 'sensitive');
        if (phoneEncryption) {
          updates.phone = phoneEncryption.encryptedData;
          updates.phoneIv = phoneEncryption.iv;
          updates.phoneTag = phoneEncryption.tag;
        }
      }

      // Encrypt Aadhaar if exists and not already encrypted
      if (employee.aadhaarNumber && !employee.aadhaarIv) {
        console.log(`🆔 Encrypting Aadhaar for employee: ${employee.id}`);
        const aadhaarEncryption = encrypt(employee.aadhaarNumber, 'restricted');
        if (aadhaarEncryption) {
          updates.aadhaarNumber = aadhaarEncryption.encryptedData;
          updates.aadhaarIv = aadhaarEncryption.iv;
          updates.aadhaarTag = aadhaarEncryption.tag;
        }
      }

      // Encrypt PAN if exists and not already encrypted
      if (employee.panNumber && !employee.panIv) {
        console.log(`🏛️ Encrypting PAN for employee: ${employee.id}`);
        const panEncryption = encrypt(employee.panNumber, 'restricted');
        if (panEncryption) {
          updates.panNumber = panEncryption.encryptedData;
          updates.panIv = panEncryption.iv;
          updates.panTag = panEncryption.tag;
        }
      }

      // Update employee if we have data to encrypt
      if (Object.keys(updates).length > 0) {
        await prisma.employee.update({
          where: { id: employee.id },
          data: updates
        });
        console.log(`✅ Encrypted data for employee: ${employee.id}`);
      }
    }

    console.log('🎉 Employee data encryption completed successfully!');

  } catch (error) {
    console.error('❌ Error encrypting employee data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

async function encryptExistingAssignmentData() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔒 Starting encryption of existing assignment data...');

    // Find all assignments (since we're adding new fields, all are unencrypted)
    const assignments = await prisma.assignment.findMany();

    console.log(`📊 Found ${assignments.length} assignments with unencrypted hourly rates`);

    for (const assignment of assignments) {
      console.log(`💰 Encrypting hourly rate for assignment: ${assignment.id}`);
      
      // For existing data, we need to convert Decimal to string
      const hourlyRateString = assignment.hourlyRate ? assignment.hourlyRate.toString() : null;
      
      if (hourlyRateString) {
        const rateEncryption = encrypt(hourlyRateString, 'financial');
        if (rateEncryption) {
          await prisma.assignment.update({
            where: { id: assignment.id },
            data: {
              hourlyRate: rateEncryption.encryptedData,
              hourlyRateIv: rateEncryption.iv,
              hourlyRateTag: rateEncryption.tag,
            }
          });
          console.log(`✅ Encrypted hourly rate for assignment: ${assignment.id}`);
        }
      }
    }

    console.log('🎉 Assignment data encryption completed successfully!');

  } catch (error) {
    console.error('❌ Error encrypting assignment data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

async function encryptExistingPayrollData() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔒 Starting encryption of existing payroll data...');

    // Find all payroll items (since we're adding new fields, all are unencrypted)
    const payrollItems = await prisma.payrollItem.findMany();

    console.log(`📊 Found ${payrollItems.length} payroll items with unencrypted amounts`);

    for (const item of payrollItems) {
      console.log(`💵 Encrypting amount for payroll item: ${item.id}`);
      
      // For existing data, we need to convert Decimal to string
      const amountString = item.amount ? item.amount.toString() : null;
      
      if (amountString) {
        const amountEncryption = encrypt(amountString, 'financial');
        if (amountEncryption) {
          await prisma.payrollItem.update({
            where: { id: item.id },
            data: {
              amount: amountEncryption.encryptedData,
              amountIv: amountEncryption.iv,
              amountTag: amountEncryption.tag,
            }
          });
          console.log(`✅ Encrypted amount for payroll item: ${item.id}`);
        }
      }
    }

    console.log('🎉 Payroll data encryption completed successfully!');

  } catch (error) {
    console.error('❌ Error encrypting payroll data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  console.log('🚀 Starting encryption of existing data...');
  console.log('⚠️  Make sure to backup your database before running this script!');
  
  try {
    await encryptExistingEmployeeData();
    await encryptExistingAssignmentData();
    await encryptExistingPayrollData();
    
    console.log('✨ All data encryption completed successfully!');
    console.log('🔐 Your sensitive data is now encrypted at rest.');
  } catch (error) {
    console.error('💥 Encryption failed:', error);
    process.exit(1);
  }
}

// Run the script if called directly
if (require.main === module) {
  main();
}

module.exports = {
  encryptExistingEmployeeData,
  encryptExistingAssignmentData, 
  encryptExistingPayrollData,
};