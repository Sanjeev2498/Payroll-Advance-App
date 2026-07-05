const fs = require('fs');
const path = require('path');

console.log('🧹 Starting cleanup of unnecessary documentation files...');

// Files to remove from root directory (ONLY .md documentation files)
const rootFilesToRemove = [
  'ACTUAL_DATA_STORAGE_STATUS.md',
  'ADMIN_DASHBOARD_PREVIEW.md',
  'ATTENDANCE_DASHBOARD_IMPLEMENTATION.md',
  'ATTENDANCE_IMPLEMENTATION_SUMMARY.md',
  'ATTENDANCE_OPERATIONS_DASHBOARD_IMPLEMENTATION.md',
  'COMPILATION_FIXES_NEEDED.md',
  'COMPREHENSIVE_SYSTEM_TEST_REPORT_2026.md',
  'COMPREHENSIVE_TEST_RESULTS.md',
  'DASHBOARD_API_FIX_SUMMARY.md',
  'DEPLOYMENT_OPERATIONS_DASHBOARD_IMPLEMENTATION.md',
  'EMPLOYEE_DASHBOARD_PREVIEW.md',
  'ENCRYPTION_IMPLEMENTATION_STATUS.md',
  'ENCRYPTION_TEST_RESULTS.md',
  'FINAL_LOGIN_TEST.md',
  'LOGIN_TEST_RESULTS.md',
  'PAYROLL_RUN_MANAGEMENT_IMPLEMENTATION.md',
  'PRISMA_7_CONFIGURATION_FIXES_COMPLETE.md',
  'PRISMA_V7_CONFIGURATION_FIXES_COMPLETE.md',
  'SUPERVISOR_DASHBOARD_PREVIEW.md',
  'SYSTEM_ISSUES_INVENTORY.md',
  'TECHNOLOGY_STACK_UPGRADE_TEST_REPORT.md',
  'URGENT_LOGIN_FIX_SUMMARY.md'
];

// Files to remove from backend directory
const backendFilesToRemove = [
  'DATABASE_SETUP.md',
  'PRISMA_SETUP_COMPLETE.md',
  'RBAC_IMPLEMENTATION_SUMMARY.md',
  'RLS_IMPLEMENTATION.md',
  'TASK_2.2_SUMMARY.md',
  'TASK_2.4_SCHEMA_SUMMARY.md',
  'TENANT_CONTEXT_SYSTEM.md'
];

let removedCount = 0;
let errors = [];

// Remove files from root directory
console.log('\n📁 Cleaning root directory...');
rootFilesToRemove.forEach(filename => {
  const filePath = path.join(__dirname, filename);
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`✅ Removed: ${filename}`);
      removedCount++;
    } else {
      console.log(`⚠️  File not found (already removed?): ${filename}`);
    }
  } catch (error) {
    console.log(`❌ Error removing ${filename}: ${error.message}`);
    errors.push({ file: filename, error: error.message });
  }
});

// Remove files from backend directory
console.log('\n📁 Cleaning backend directory...');
backendFilesToRemove.forEach(filename => {
  const filePath = path.join(__dirname, 'backend', filename);
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`✅ Removed: backend/${filename}`);
      removedCount++;
    } else {
      console.log(`⚠️  File not found (already removed?): backend/${filename}`);
    }
  } catch (error) {
    console.log(`❌ Error removing backend/${filename}: ${error.message}`);
    errors.push({ file: `backend/${filename}`, error: error.message });
  }
});

// Summary
console.log('\n📊 Cleanup Summary:');
console.log(`✅ Successfully removed: ${removedCount} files`);
if (errors.length > 0) {
  console.log(`❌ Errors encountered: ${errors.length}`);
  errors.forEach(({ file, error }) => {
    console.log(`   - ${file}: ${error}`);
  });
}

console.log('\n🎯 Files KEPT (as intended):');
console.log('   - All debug scripts (final-debug.js, apply-fix.js, etc.)');
console.log('   - All test files (test-encryption.js, test-login-api.js, etc.)');
console.log('   - All source code files in src/');
console.log('   - Configuration files (package.json, tsconfig.json, .env, etc.)');
console.log('   - Docker files (docker-compose.yml, Dockerfile)');
console.log('   - Git configuration (.gitignore, .github/)');
console.log('   - Kiro specs (.kiro/specs/)');
console.log('   - All essential project files');

console.log('\n✨ Cleanup completed successfully!');