#!/usr/bin/env node

// Script to cleanup failed migration status
require('dotenv').config({ path: '.env' });

const { Client } = require('pg');

async function cleanupMigrationStatus() {
  const client = new Client({
    host: '127.0.0.1',
    port: 5432,
    database: 'payroll_system_dev',
    user: 'payroll_user',
    password: 'payroll_pass_dev_123'
  });
  
  try {
    await client.connect();
    console.log('Connected to database');
    
    // Remove the failed migration from the migration table
    console.log('Removing failed migration from _prisma_migrations...');
    await client.query(`
      DELETE FROM _prisma_migrations 
      WHERE migration_name = '20260805162757_restructure_client_contract_model'
    `);
    
    console.log('Migration status cleaned up successfully');
    
  } catch (error) {
    console.error('Error cleaning up migration status:', error.message);
  } finally {
    await client.end();
  }
}

cleanupMigrationStatus()
  .then(() => {
    console.log('Migration cleanup completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Failed to cleanup migration status:', error);
    process.exit(1);
  });