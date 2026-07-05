const { defineConfig } = require('prisma/config');

module.exports = defineConfig({
  datasource: {
    url: process.env.DATABASE_URL || 'postgresql://payroll_user:payroll_pass_dev_123@localhost:5432/payroll_system_dev',
  },
});