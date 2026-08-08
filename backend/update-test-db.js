const { execSync } = require('child_process');

// Set the test database URL
const testDatabaseUrl = 'postgresql://payroll_user:payroll_pass_dev_123@localhost:5432/payroll_test';

console.log('Updating test database schema...');
console.log('Database URL:', testDatabaseUrl);

try {
  // Use the Prisma CLI with explicit database URL
  const result = execSync(`npx prisma db push --force-reset --url="${testDatabaseUrl}"`, {
    env: { ...process.env },
    stdio: 'inherit',
  });
  console.log('Test database schema updated successfully!');
} catch (error) {
  console.error('Error updating test database:', error.message);
  process.exit(1);
}