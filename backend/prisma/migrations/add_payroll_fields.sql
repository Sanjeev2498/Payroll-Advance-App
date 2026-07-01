-- Migration: Add Essential Payroll Fields with Encryption
-- Date: 2026-06-30
-- Purpose: Add mandatory salary, banking, and statutory compliance fields

-- ============================================================================
-- ADD SALARY STRUCTURE FIELDS TO EMPLOYEE TABLE
-- ============================================================================

ALTER TABLE employees ADD COLUMN basic_salary VARCHAR(500);           -- Encrypted
ALTER TABLE employees ADD COLUMN basic_salary_iv VARCHAR(32);
ALTER TABLE employees ADD COLUMN basic_salary_tag VARCHAR(32);

ALTER TABLE employees ADD COLUMN hra_amount VARCHAR(500);             -- Encrypted  
ALTER TABLE employees ADD COLUMN hra_amount_iv VARCHAR(32);
ALTER TABLE employees ADD COLUMN hra_amount_tag VARCHAR(32);

ALTER TABLE employees ADD COLUMN other_allowances VARCHAR(500);       -- Encrypted
ALTER TABLE employees ADD COLUMN other_allowances_iv VARCHAR(32);
ALTER TABLE employees ADD COLUMN other_allowances_tag VARCHAR(32);

ALTER TABLE employees ADD COLUMN gross_salary VARCHAR(500);           -- Encrypted
ALTER TABLE employees ADD COLUMN gross_salary_iv VARCHAR(32);
ALTER TABLE employees ADD COLUMN gross_salary_tag VARCHAR(32);

ALTER TABLE employees ADD COLUMN salary_type VARCHAR(20) DEFAULT 'MONTHLY'; -- MONTHLY/DAILY/HOURLY

-- ============================================================================
-- ADD BANK DETAILS (ENCRYPTED - FINANCIAL LEVEL)
-- ============================================================================

ALTER TABLE employees ADD COLUMN bank_name VARCHAR(500);              -- Encrypted
ALTER TABLE employees ADD COLUMN bank_name_iv VARCHAR(32);
ALTER TABLE employees ADD COLUMN bank_name_tag VARCHAR(32);

ALTER TABLE employees ADD COLUMN account_number VARCHAR(500);         -- Encrypted
ALTER TABLE employees ADD COLUMN account_number_iv VARCHAR(32);
ALTER TABLE employees ADD COLUMN account_number_tag VARCHAR(32);

ALTER TABLE employees ADD COLUMN ifsc_code VARCHAR(500);              -- Encrypted
ALTER TABLE employees ADD COLUMN ifsc_code_iv VARCHAR(32);
ALTER TABLE employees ADD COLUMN ifsc_code_tag VARCHAR(32);

ALTER TABLE employees ADD COLUMN account_type VARCHAR(20) DEFAULT 'SAVINGS'; -- SAVINGS/CURRENT

-- ============================================================================
-- ADD STATUTORY COMPLIANCE IDS (ENCRYPTED - RESTRICTED LEVEL)
-- ============================================================================

ALTER TABLE employees ADD COLUMN uan_number VARCHAR(500);             -- EPF UAN - Encrypted
ALTER TABLE employees ADD COLUMN uan_number_iv VARCHAR(32);
ALTER TABLE employees ADD COLUMN uan_number_tag VARCHAR(32);

ALTER TABLE employees ADD COLUMN esic_number VARCHAR(500);            -- ESIC Number - Encrypted
ALTER TABLE employees ADD COLUMN esic_number_iv VARCHAR(32);
ALTER TABLE employees ADD COLUMN esic_number_tag VARCHAR(32);

-- ============================================================================
-- ADD PAYROLL CALCULATION PREFERENCES
-- ============================================================================

ALTER TABLE employees ADD COLUMN epf_applicable BOOLEAN DEFAULT true;        -- EPF deduction applicable
ALTER TABLE employees ADD COLUMN esic_applicable BOOLEAN DEFAULT true;      -- ESIC deduction applicable
ALTER TABLE employees ADD COLUMN pt_applicable BOOLEAN DEFAULT true;        -- Professional Tax applicable
ALTER TABLE employees ADD COLUMN tds_applicable BOOLEAN DEFAULT false;      -- TDS applicable (based on salary slab)

-- ============================================================================
-- ADD ATTENDANCE TRACKING FIELDS  
-- ============================================================================

ALTER TABLE employees ADD COLUMN monthly_working_days INTEGER DEFAULT 26;    -- Standard working days
ALTER TABLE employees ADD COLUMN paid_leave_days INTEGER DEFAULT 21;         -- Annual paid leave entitlement

-- ============================================================================
-- CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX idx_employees_salary_type ON employees(salary_type);
CREATE INDEX idx_employees_epf_applicable ON employees(epf_applicable);
CREATE INDEX idx_employees_esic_applicable ON employees(esic_applicable);
CREATE INDEX idx_employees_pt_applicable ON employees(pt_applicable);