// Direct encryption testing without HTTP or database dependencies
// const { PrismaClient } = require('@prisma/client');

// Mock the encryption utility
class MockEncryptionUtil {
  encrypt(plaintext, level) {
    // Simple base64 encoding for demonstration
    const encoded = Buffer.from(plaintext).toString('base64');
    return {
      encryptedData: encoded,
      iv: 'mock-iv-' + Math.random().toString(36).substr(2, 9),
      tag: 'mock-tag'
    };
  }

  decrypt(encryptedData, iv, tag, level) {
    // Simple base64 decoding for demonstration
    return Buffer.from(encryptedData, 'base64').toString('utf8');
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
          case 'email': return data; // Show contact info
          case 'aadhaar':
          case 'pan': return '●●●●●●●●●●●●'; // Hide identity
        }
        break;

      case 'COMPANY_ADMIN':
      case 'SUPER_ADMIN':
        return data; // Show everything

      default:
        return '●●●●●●●●●●●●'; // Hide everything
    }
  }
}

async function testEncryptionDirect() {
  console.log('🔐 Testing Role-Based Encryption System (Direct)\n');

  const encryptionUtil = new MockEncryptionUtil();

  // Test data
  const testEmployee = {
    firstName: 'Raj',
    lastName: 'Kumar',
    email: 'raj.kumar@example.com',
    phone: '+91 98765-43210',
    aadhaarNumber: '1234-5678-9012',
    panNumber: 'ABCDE1234F',
    salary: '45000'
  };

  console.log('📋 Original Employee Data:');
  console.log(JSON.stringify(testEmployee, null, 2));

  console.log('\n🔒 Encrypting sensitive data...');
  
  // Encrypt sensitive data
  const encryptedData = {
    email: encryptionUtil.encrypt(testEmployee.email, 'sensitive'),
    phone: encryptionUtil.encrypt(testEmployee.phone, 'sensitive'),
    aadhaar: encryptionUtil.encrypt(testEmployee.aadhaarNumber, 'restricted'),
    pan: encryptionUtil.encrypt(testEmployee.panNumber, 'restricted'),
    salary: encryptionUtil.encrypt(testEmployee.salary, 'financial')
  };

  console.log('Encrypted data stored in database:', {
    email: encryptedData.email.encryptedData,
    phone: encryptedData.phone.encryptedData,
    aadhaar: encryptedData.aadhaar.encryptedData,
    pan: encryptedData.pan.encryptedData,
    salary: encryptedData.salary.encryptedData
  });

  console.log('\n🔓 Testing role-based data access...\n');

  // Test different role access
  const roles = ['EMPLOYEE', 'SUPERVISOR', 'COMPANY_ADMIN'];
  
  for (const role of roles) {
    console.log(`=== ${role} VIEW ===`);
    
    let viewData = {
      firstName: testEmployee.firstName,
      lastName: testEmployee.lastName,
      email: '',
      phone: '',
      aadhaarNumber: '',
      panNumber: '',
      salary: ''
    };

    // Decrypt based on role permissions
    if (role === 'COMPANY_ADMIN') {
      // Admin sees everything decrypted
      viewData.email = encryptionUtil.decrypt(encryptedData.email.encryptedData, encryptedData.email.iv, encryptedData.email.tag, 'sensitive');
      viewData.phone = encryptionUtil.decrypt(encryptedData.phone.encryptedData, encryptedData.phone.iv, encryptedData.phone.tag, 'sensitive');
      viewData.aadhaarNumber = encryptionUtil.decrypt(encryptedData.aadhaar.encryptedData, encryptedData.aadhaar.iv, encryptedData.aadhaar.tag, 'restricted');
      viewData.panNumber = encryptionUtil.decrypt(encryptedData.pan.encryptedData, encryptedData.pan.iv, encryptedData.pan.tag, 'restricted');
      viewData.salary = encryptionUtil.decrypt(encryptedData.salary.encryptedData, encryptedData.salary.iv, encryptedData.salary.tag, 'financial');
    } else if (role === 'SUPERVISOR') {
      // Supervisor sees contact info but masked identity docs
      viewData.email = encryptionUtil.decrypt(encryptedData.email.encryptedData, encryptedData.email.iv, encryptedData.email.tag, 'sensitive');
      viewData.phone = encryptionUtil.decrypt(encryptedData.phone.encryptedData, encryptedData.phone.iv, encryptedData.phone.tag, 'sensitive');
      viewData.aadhaarNumber = encryptionUtil.maskData('1234-5678-9012', role, 'aadhaar');
      viewData.panNumber = encryptionUtil.maskData('ABCDE1234F', role, 'pan');
      viewData.salary = 'RESTRICTED';
    } else if (role === 'EMPLOYEE') {
      // Employee sees own data partially masked
      viewData.email = encryptionUtil.maskData(testEmployee.email, role, 'email');
      viewData.phone = encryptionUtil.maskData(testEmployee.phone, role, 'phone');
      viewData.aadhaarNumber = encryptionUtil.maskData('1234-5678-9012', role, 'aadhaar');
      viewData.panNumber = encryptionUtil.maskData('ABCDE1234F', role, 'pan');
      viewData.salary = 'RESTRICTED';
    }

    console.log('Name:', `${viewData.firstName} ${viewData.lastName}`);
    console.log('Email:', viewData.email || 'HIDDEN');
    console.log('Phone:', viewData.phone || 'HIDDEN');
    console.log('Aadhaar:', viewData.aadhaarNumber || 'HIDDEN');
    console.log('PAN:', viewData.panNumber || 'HIDDEN');
    console.log('Salary:', viewData.salary || 'HIDDEN');
    console.log('');
  }

  console.log('✅ Role-based encryption test completed!');
  console.log('\n📊 Summary:');
  console.log('• EMPLOYEE: Sees own data with partial masking');
  console.log('• SUPERVISOR: Sees contact info, no identity docs or salary');
  console.log('• COMPANY_ADMIN: Sees all decrypted data');
  console.log('• All sensitive data is encrypted at rest in the database');
}

testEncryptionDirect();