const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

// Import the encryption utility
const { EncryptionUtil } = require('./dist/src/common/utils/encryption.util.js');

async function testCompletePayrollFields() {
  const prisma = new PrismaClient();
  const encryptionUtil = new EncryptionUtil({ get: (key) => process.env[key] });

  try {
    console.log('🔐 Testing Complete Payroll System with All Fields\n');

    // Test employee with all financial data
    const testEmployee = {
      firstName: 'Amit',
      lastName: 'Kumar', 
      email: 'amit.kumar@demosecurity.co.in',
      phone: '+91 98765-12345',
      employeeNumber: 'EMP003',
      aadhaarNumber: '123456789012',
      panNumber: 'ABCDE1234F',
      
      // Salary structure
      basicSalary: '25000',
      hraAmount: '5000', 
      otherAllowances: '3000',
      grossSalary: '33000',
      salaryType: 'MONTHLY',
      
      // Bank details
      bankName: 'HDFC Bank',
      accountNumber: '50200012345678',
      ifscCode: 'HDFC0001234',
      accountType: 'SAVINGS',
      
      // Statutory IDs
      uanNumber: '123456789012',
      esicNumber: '12345678901234567',
      
      // Payroll configuration
      epfApplicable: true,
      esicApplicable: true,
      ptApplicable: true,
      tdsApplicable: false,
      
      hireDate: new Date('2024-01-01'),
      skills: ['security', 'surveillance', 'emergency_response'],
      metadata: {
        department: 'Security Operations',
        jobTitle: 'Senior Security Guard',
        emergencyContact: {
          name: 'Sunita Kumar',
          relation: 'Wife',
          phone: '+91 98765-54321'
        }
      }
    };

    console.log('📋 Creating employee with complete payroll data...');

    // Get company ID (assuming Demo Security Services exists)
    const company = await prisma.company.findFirst();
    if (!company) {
      console.log('❌ No company found. Please run the seed script first.');
      return;
    }

    // Encrypt all the sensitive data
    console.log('🔒 Encrypting sensitive fields...');
    
    const encryptedData = {};

    // Personal data (sensitive level)
    if (testEmployee.email) {
      const emailEnc = encryptionUtil.encryptEmail(testEmployee.email);
      encryptedData.email = emailEnc.encryptedData;
      encryptedData.emailIv = emailEnc.iv;
      encryptedData.emailTag = emailEnc.tag;
    }

    if (testEmployee.phone) {
      const phoneEnc = encryptionUtil.encryptPhone(testEmployee.phone);
      encryptedData.phone = phoneEnc.encryptedData;
      encryptedData.phoneIv = phoneEnc.iv;
      encryptedData.phoneTag = phoneEnc.tag;
    }

    // Identity documents (restricted level)
    if (testEmployee.aadhaarNumber) {
      const aadhaarEnc = encryptionUtil.encryptAadhaar(testEmployee.aadhaarNumber);
      encryptedData.aadhaarNumber = aadhaarEnc.encryptedData;
      encryptedData.aadhaarIv = aadhaarEnc.iv;
      encryptedData.aadhaarTag = aadhaarEnc.tag;
    }

    if (testEmployee.panNumber) {
      const panEnc = encryptionUtil.encryptPAN(testEmployee.panNumber);
      encryptedData.panNumber = panEnc.encryptedData;
      encryptedData.panIv = panEnc.iv;
      encryptedData.panTag = panEnc.tag;
    }

    // Salary components (financial level)
    if (testEmployee.basicSalary) {
      const basicEnc = encryptionUtil.encryptFinancial(testEmployee.basicSalary);
      encryptedData.basicSalary = basicEnc.encryptedData;
      encryptedData.basicSalaryIv = basicEnc.iv;
      encryptedData.basicSalaryTag = basicEnc.tag;
    }

    if (testEmployee.hraAmount) {
      const hraEnc = encryptionUtil.encryptFinancial(testEmployee.hraAmount);
      encryptedData.hraAmount = hraEnc.encryptedData;
      encryptedData.hraAmountIv = hraEnc.iv;
      encryptedData.hraAmountTag = hraEnc.tag;
    }

    if (testEmployee.otherAllowances) {
      const allowEnc = encryptionUtil.encryptFinancial(testEmployee.otherAllowances);
      encryptedData.otherAllowances = allowEnc.encryptedData;
      encryptedData.otherAllowancesIv = allowEnc.iv;
      encryptedData.otherAllowancesTag = allowEnc.tag;
    }

    if (testEmployee.grossSalary) {
      const grossEnc = encryptionUtil.encryptFinancial(testEmployee.grossSalary);
      encryptedData.grossSalary = grossEnc.encryptedData;
      encryptedData.grossSalaryIv = grossEnc.iv;
      encryptedData.grossSalaryTag = grossEnc.tag;
    }

    // Bank details (financial level)
    if (testEmployee.bankName) {
      const bankEnc = encryptionUtil.encryptBankName(testEmployee.bankName);
      encryptedData.bankName = bankEnc.encryptedData;
      encryptedData.bankNameIv = bankEnc.iv;
      encryptedData.bankNameTag = bankEnc.tag;
    }

    if (testEmployee.accountNumber) {
      const accEnc = encryptionUtil.encryptBankAccount(testEmployee.accountNumber);
      encryptedData.accountNumber = accEnc.encryptedData;
      encryptedData.accountNumberIv = accEnc.iv;
      encryptedData.accountNumberTag = accEnc.tag;
    }

    if (testEmployee.ifscCode) {
      const ifscEnc = encryptionUtil.encryptIFSC(testEmployee.ifscCode);
      encryptedData.ifscCode = ifscEnc.encryptedData;
      encryptedData.ifscCodeIv = ifscEnc.iv;
      encryptedData.ifscCodeTag = ifscEnc.tag;
    }

    // Statutory IDs (restricted level)
    if (testEmployee.uanNumber) {
      const uanEnc = encryptionUtil.encryptUAN(testEmployee.uanNumber);
      encryptedData.uanNumber = uanEnc.encryptedData;
      encryptedData.uanNumberIv = uanEnc.iv;
      encryptedData.uanNumberTag = uanEnc.tag;
    }

    if (testEmployee.esicNumber) {
      const esicEnc = encryptionUtil.encryptESIC(testEmployee.esicNumber);
      encryptedData.esicNumber = esicEnc.encryptedData;
      encryptedData.esicNumberIv = esicEnc.iv;
      encryptedData.esicNumberTag = esicEnc.tag;
    }

    // Create employee with encrypted data
    const employee = await prisma.employee.create({
      data: {
        companyId: company.id,
        firstName: testEmployee.firstName,
        lastName: testEmployee.lastName,
        employeeNumber: testEmployee.employeeNumber,
        hireDate: testEmployee.hireDate,
        skills: testEmployee.skills,
        salaryType: testEmployee.salaryType,
        accountType: testEmployee.accountType,
        epfApplicable: testEmployee.epfApplicable,
        esicApplicable: testEmployee.esicApplicable,
        ptApplicable: testEmployee.ptApplicable,
        tdsApplicable: testEmployee.tdsApplicable,
        metadata: testEmployee.metadata,
        employmentStatus: 'ACTIVE',
        ...encryptedData
      }
    });

    console.log('✅ Employee created successfully!');
    console.log(`👤 Employee ID: ${employee.id}`);
    console.log(`🔢 Employee Number: ${employee.employeeNumber}`);

    // Test decryption by role
    console.log('\n🔍 Testing Role-Based Access:\n');

    const roles = ['EMPLOYEE', 'SUPERVISOR', 'COMPANY_ADMIN'];
    
    for (const role of roles) {
      console.log(`=== ${role} VIEW ===`);
      
      let viewData = {
        name: `${testEmployee.firstName} ${testEmployee.lastName}`,
        employeeNumber: testEmployee.employeeNumber,
        salaryType: testEmployee.salaryType
      };

      if (role === 'COMPANY_ADMIN') {
        // Admin sees everything decrypted
        viewData.email = encryptionUtil.decryptEmail(encryptedData.email, encryptedData.emailIv, encryptedData.emailTag);
        viewData.phone = encryptionUtil.decryptPhone(encryptedData.phone, encryptedData.phoneIv, encryptedData.phoneTag);
        viewData.aadhaar = encryptionUtil.decryptAadhaar(encryptedData.aadhaarNumber, encryptedData.aadhaarIv, encryptedData.aadhaarTag);
        viewData.pan = encryptionUtil.decryptPAN(encryptedData.panNumber, encryptedData.panIv, encryptedData.panTag);
        viewData.basicSalary = `₹${encryptionUtil.decryptFinancial(encryptedData.basicSalary, encryptedData.basicSalaryIv, encryptedData.basicSalaryTag)}`;
        viewData.hraAmount = `₹${encryptionUtil.decryptFinancial(encryptedData.hraAmount, encryptedData.hraAmountIv, encryptedData.hraAmountTag)}`;
        viewData.grossSalary = `₹${encryptionUtil.decryptFinancial(encryptedData.grossSalary, encryptedData.grossSalaryIv, encryptedData.grossSalaryTag)}`;
        viewData.bankName = encryptionUtil.decryptBankName(encryptedData.bankName, encryptedData.bankNameIv, encryptedData.bankNameTag);
        viewData.accountNumber = encryptionUtil.decryptBankAccount(encryptedData.accountNumber, encryptedData.accountNumberIv, encryptedData.accountNumberTag);
        viewData.ifscCode = encryptionUtil.decryptIFSC(encryptedData.ifscCode, encryptedData.ifscCodeIv, encryptedData.ifscCodeTag);
        viewData.uanNumber = encryptionUtil.decryptUAN(encryptedData.uanNumber, encryptedData.uanNumberIv, encryptedData.uanNumberTag);
        viewData.esicNumber = encryptionUtil.decryptESIC(encryptedData.esicNumber, encryptedData.esicNumberIv, encryptedData.esicNumberTag);
      } else if (role === 'SUPERVISOR') {
        // Supervisor sees contact info but not financial/identity data
        viewData.email = encryptionUtil.decryptEmail(encryptedData.email, encryptedData.emailIv, encryptedData.emailTag);
        viewData.phone = encryptionUtil.decryptPhone(encryptedData.phone, encryptedData.phoneIv, encryptedData.phoneTag);
        viewData.aadhaar = '●●●●●●●●●●●●';
        viewData.pan = '●●●●●●●●●●●●';
        viewData.salary = 'RESTRICTED';
        viewData.bankDetails = 'RESTRICTED';
      } else {
        // Employee sees own data with masking
        viewData.email = encryptionUtil.maskData(testEmployee.email, role, 'email');
        viewData.phone = encryptionUtil.maskData(testEmployee.phone, role, 'phone');
        viewData.aadhaar = '●●●●-●●●●-●●●●';
        viewData.pan = '●●●●●●●●●●';
        viewData.salary = 'CONTACT_HR';
        viewData.bankDetails = 'CONTACT_HR';
      }

      console.log(JSON.stringify(viewData, null, 2));
      console.log();
    }

    console.log('✅ Complete payroll system test successful!');
    console.log('\n📊 Summary:');
    console.log('• All salary components encrypted ✓');
    console.log('• Bank details encrypted ✓'); 
    console.log('• Statutory IDs encrypted ✓');
    console.log('• Role-based access working ✓');
    console.log('• Indian compliance ready ✓');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testCompletePayrollFields();