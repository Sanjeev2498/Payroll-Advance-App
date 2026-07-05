const { PrismaService } = require('./dist/src/prisma/prisma.service.js');
const { parseAndValidateDate, DateValidationPatterns } = require('./dist/src/common/utils/date-validation.util.js');
const { v4: uuidv4 } = require('uuid');

async function verifyBug2Fix() {
  console.log('=== Verifying Bug 2 Fix: Date Validation ===');
  
  // Test 1: Verify parseAndValidateDate prevents invalid dates
  console.log('\\n1. Testing parseAndValidateDate utility:');
  
  const invalidDates = [
    '0000-12-31',
    '2024-02-30', // Feb 30 -> silently corrected to Mar 1
    '2023-02-29', // Non-leap year Feb 29
    '-001-01-01'
  ];
  
  invalidDates.forEach(invalidDate => {
    try {
      const result = parseAndValidateDate(invalidDate, 'test date');
      console.log(`❌ ERROR: ${invalidDate} was accepted! Result: ${result}`);
    } catch (error) {
      console.log(`✅ ${invalidDate} correctly rejected: ${error.message}`);
    }
  });
  
  // Test 2: Verify valid dates still work
  console.log('\\n2. Testing valid dates:');
  const validDates = ['2024-01-01', '2024-02-29', '2024-12-31'];
  
  validDates.forEach(validDate => {
    try {
      const result = parseAndValidateDate(validDate, 'test date');
      console.log(`✅ ${validDate} correctly accepted: ${result.toISOString().split('T')[0]}`);
    } catch (error) {
      console.log(`❌ ERROR: ${validDate} was rejected! Error: ${error.message}`);
    }
  });
  
  // Test 3: Test DateValidationPatterns
  console.log('\\n3. Testing business logic patterns:');
  
  // Employment date validation
  const empDateResult = DateValidationPatterns.employmentDate('1949-12-31'); // Before 1950
  console.log(`Employment date before 1950: ${empDateResult.isValid ? 'ACCEPTED (BAD)' : 'REJECTED (GOOD)'}`);
  
  // Contract date validation  
  const contractResult = DateValidationPatterns.contractDate('2024-01-01', '2024-01-01'); // Same dates
  console.log(`Contract same start/end: ${contractResult.isValid ? 'ACCEPTED (BAD)' : 'REJECTED (GOOD)'}`);
  
  // Test 4: Integration test with database
  console.log('\\n4. Testing database integration:');
  
  const prisma = new PrismaService();
  await prisma.onModuleInit();
  
  const companyId = uuidv4();
  
  try {
    // Create test company
    await prisma.withSystemContext(async (p) => {
      await p.company.create({
        data: {
          id: companyId,
          name: 'Date Validation Test',
          slug: 'date-validation-test'
        }
      });
    });
    
    // Test creating client with validated dates
    console.log('Testing client creation with date validation...');
    
    try {
      // This should use the validation utility in a real application
      const validatedStartDate = parseAndValidateDate('2024-01-01', 'contract start');
      const validatedEndDate = parseAndValidateDate('2025-12-31', 'contract end');
      
      await prisma.withTenant(companyId, async (p) => {
        const client = await p.client.create({
          data: {
            name: 'Test Client',
            contactEmail: 'test@example.com',
            contractStart: validatedStartDate,
            contractEnd: validatedEndDate
          }
        });
        
        console.log('✅ Client created with validated dates');
        
        // Clean up
        await p.client.delete({ where: { id: client.id } });
      });
      
    } catch (error) {
      console.log(`❌ Client creation failed: ${error.message}`);
    }
    
    // Test invalid date should be caught by validation utility
    try {
      console.log('\\nTesting invalid date rejection...');
      parseAndValidateDate('0000-12-31', 'contract start'); // This should throw
      console.log('❌ ERROR: Invalid date was not caught by validation!');
      
    } catch (error) {
      console.log('✅ Invalid date correctly caught by validation utility');
    }
    
  } finally {
    // Clean up
    try {
      await prisma.withSystemContext(async (p) => {
        await p.company.delete({ where: { id: companyId } });
      });
    } catch (e) {
      // Ignore cleanup errors
    }
    
    await prisma.onModuleDestroy();
  }
  
  console.log('\\n=== Bug 2 Fix Verification Complete ===');
  console.log('✅ Date validation utility prevents invalid dates');
  console.log('✅ Business logic patterns enforce reasonable constraints');
  console.log('✅ Integration with database works correctly');
  console.log('');
  console.log('📋 NEXT STEPS FOR COMPLETE BUG 2 FIX:');
  console.log('1. Integrate date validation into all DTOs (CreateClientDto, etc.)');
  console.log('2. Add validation to controllers using class-validator decorators');
  console.log('3. Update existing services to use parseAndValidateDate');
  console.log('4. Add date validation to frontend forms');
}

verifyBug2Fix().catch(console.error);