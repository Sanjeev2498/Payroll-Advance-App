const fs = require('fs').promises;
const path = require('path');

/**
 * Systematic Fix for Property Tests
 * Addresses both RBAC dependency injection and data generation issues
 */

// Files that need RBAC dependency fixes
const rbacFixFiles = [
  'src/payroll/tests/payroll-dashboard-accuracy.property.spec.ts',
  // Add other files here as needed
];

// Files that need property test data generation fixes
const propertyTestFiles = [
  'src/tests/property-tests/operations-command-center-kpi.spec.ts',
  'src/tests/property-tests/employee-search-filtering.spec.ts',
  'src/tests/property-tests/client-data-capture.spec.ts',
  'src/tests/property-tests/multi-tenant-isolation.spec.ts',
  'src/tests/property-tests/shift-calendar-simple.spec.ts',
  'src/attendance/attendance-recording-accuracy.property.spec.ts',
  'src/assignments/assignment-logic.property.spec.ts',
  'src/assignments/assignment-skill-matching.property.spec.ts',
  'src/billing/invoice-calculation.property.test.ts',
  'src/common/company-registration.property.spec.ts',
  'src/common/multi-tenant-isolation.property.spec.ts',
  'src/employees/employee-data-integrity.property.spec.ts',
  'src/employees/employee-data-integrity-mock.property.spec.ts',
  'src/sites/site-information-preservation.property.spec.ts',
  'src/supervisor-portal/supervisor-operational-consistency.property.spec.ts',
];

async function fixPropertyTestImports(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    
    // Add imports if they don't exist
    let updatedContent = content;
    
    // Check if PropertyTestSetup is imported
    if (!updatedContent.includes('PropertyTestSetup')) {
      // Find the import section
      const importIndex = updatedContent.indexOf('import');
      if (importIndex !== -1) {
        // Add PropertyTestSetup import after existing imports
        const importLines = updatedContent.split('\n');
        const lastImportIndex = importLines.findIndex(line => 
          line.startsWith('import') && importLines[importLines.indexOf(line) + 1] && 
          !importLines[importLines.indexOf(line) + 1].startsWith('import')
        );
        
        if (lastImportIndex !== -1) {
          importLines.splice(lastImportIndex + 1, 0, 
            "import { PropertyTestSetup, PropertyTestGenerators } from '../../test/helpers/property-test-setup';"
          );
          updatedContent = importLines.join('\n');
        }
      }
    }
    
    // Fix tenant context setup patterns
    updatedContent = updatedContent.replace(
      /tenantContextService\.setContext\([^)]+\)/g,
      'PropertyTestSetup.setupTenantContext(tenantContextService, testTenantId)'
    );
    
    // Fix data generation patterns
    updatedContent = updatedContent.replace(
      /await prismaService\.withSystemContext/g,
      'await PropertyTestSetup.createTenantData(prismaService, testTenantId, "full"); await prismaService.withTenant(testTenantId'
    );
    
    await fs.writeFile(filePath, updatedContent, 'utf8');
    console.log(`✓ Fixed property test: ${filePath}`);
  } catch (error) {
    console.error(`✗ Failed to fix ${filePath}:`, error.message);
  }
}

async function fixTestModule() {
  // Create a comprehensive test module fix for all property tests
  const testModuleFixContent = `
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { RbacTestSetup } from './helpers/rbac-test-setup';
import { UserRole } from '@prisma/client';

/**
 * Standard Property Test Module Factory
 * Creates test modules with proper RBAC and tenant context setup
 */
export class PropertyTestModule {
  static async create(
    providers: any[] = [],
    imports: any[] = [],
    options: {
      tenantId?: string;
      userId?: string;
      userRole?: UserRole;
    } = {}
  ): Promise<TestingModule> {
    return await Test.createTestingModule({
      imports: [ConfigModule.forRoot(), ...imports],
      providers: [
        PrismaService,
        ...RbacTestSetup.getProviders(options),
        ...providers,
      ],
    }).compile();
  }
}`;

  await fs.writeFile(
    path.join(__dirname, 'src/test/helpers/property-test-module.ts'),
    testModuleFixContent,
    'utf8'
  );
  console.log('✓ Created PropertyTestModule helper');
}

async function main() {
  console.log('🔧 Starting systematic property test fixes...\n');
  
  // Fix test module helper
  await fixTestModule();
  
  // Fix individual property test files
  for (const filePath of propertyTestFiles) {
    const fullPath = path.join(__dirname, filePath);
    try {
      await fs.access(fullPath);
      await fixPropertyTestImports(fullPath);
    } catch (error) {
      console.log(`⚠ File not found or not accessible: ${filePath}`);
    }
  }
  
  console.log('\n🎉 Property test fixes completed!');
  console.log('\nNext steps:');
  console.log('1. Run tests to verify RBAC dependency injection fixes');
  console.log('2. Update individual test data generation patterns as needed');
  console.log('3. Address remaining foreign key constraint violations');
}

main().catch(console.error);