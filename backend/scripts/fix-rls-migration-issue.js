#!/usr/bin/env node

// Script to fix RLS policy blocking migration
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

async function fixRlsMigrationIssue() {
  const prisma = new PrismaClient();
  
  try {
    console.log('Dropping RLS policies that might block migration...');
    
    // Drop specific policies that are blocking the migration
    await prisma.$executeRawUnsafe(`DROP POLICY IF EXISTS invoices_tenant_isolation ON invoices CASCADE;`);
    await prisma.$executeRawUnsafe(`DROP POLICY IF EXISTS invoice_items_tenant_isolation ON invoice_items CASCADE;`);
    
    console.log('RLS policies dropped successfully');
    
  } catch (error) {
    console.log('Error (might be expected):', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

fixRlsMigrationIssue()
  .then(() => {
    console.log('RLS policy cleanup completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Failed to fix RLS migration issue:', error);
    process.exit(1);
  });