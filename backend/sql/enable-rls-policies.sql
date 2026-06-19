-- ============================================================================= 
-- Row-Level Security (RLS) Setup for Multi-Tenant Security Workforce System
-- This file can be run directly against PostgreSQL to enable RLS policies
-- =============================================================================

-- Check PostgreSQL version and required extensions
DO $$
BEGIN
    RAISE NOTICE 'PostgreSQL Version: %', version();
    RAISE NOTICE 'Starting RLS setup for Security Workforce & Payroll System...';
END $$;

-- =============================================================================
-- ENABLE RLS ON ALL TENANT-SPECIFIC TABLES
-- =============================================================================

\echo 'Enabling Row-Level Security on all tables...'

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- HELPER FUNCTIONS FOR TENANT CONTEXT MANAGEMENT
-- =============================================================================

\echo 'Creating tenant context helper functions...'

-- Function to get current tenant ID from session context
CREATE OR REPLACE FUNCTION current_tenant_id()
RETURNS UUID AS $$
BEGIN
    -- Return the tenant ID from PostgreSQL session variable
    RETURN current_setting('app.tenant_id', true)::uuid;
EXCEPTION
    WHEN OTHERS THEN
        -- Return NULL if no tenant context is set (allows system operations)
        RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to check if user has administrative privileges
CREATE OR REPLACE FUNCTION is_tenant_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN current_setting('app.user_role', true) IN ('SUPER_ADMIN', 'COMPANY_ADMIN');
EXCEPTION
    WHEN OTHERS THEN
        RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to validate tenant isolation (for testing)
CREATE OR REPLACE FUNCTION validate_rls_isolation()
RETURNS TABLE(table_name TEXT, policy_count INTEGER, rls_enabled BOOLEAN) AS $$
SELECT 
    schemaname::TEXT || '.' || tablename::TEXT as table_name,
    COUNT(pol.policyname)::INTEGER as policy_count,
    relrowsecurity as rls_enabled
FROM pg_tables t
LEFT JOIN pg_policies pol ON pol.schemaname = t.schemaname AND pol.tablename = t.tablename
LEFT JOIN pg_class c ON c.relname = t.tablename
WHERE t.schemaname = 'public' 
  AND t.tablename NOT LIKE 'pg_%'
  AND t.tablename NOT LIKE '_prisma_%'
GROUP BY t.schemaname, t.tablename, c.relrowsecurity
ORDER BY t.tablename;
$$ LANGUAGE sql SECURITY DEFINER;

-- =============================================================================
-- DROP EXISTING POLICIES (IN CASE OF RE-RUN)
-- =============================================================================

\echo 'Cleaning up any existing RLS policies...'

-- Drop policies if they exist (ignore errors)
DROP POLICY IF EXISTS company_self_access ON companies;
DROP POLICY IF EXISTS users_tenant_isolation ON users;
DROP POLICY IF EXISTS clients_tenant_isolation ON clients;
DROP POLICY IF EXISTS employees_tenant_isolation ON employees;
DROP POLICY IF EXISTS sites_tenant_isolation ON sites;
DROP POLICY IF EXISTS assignments_tenant_isolation ON assignments;
DROP POLICY IF EXISTS shifts_tenant_isolation ON shifts;
DROP POLICY IF EXISTS attendance_tenant_isolation ON attendance;
DROP POLICY IF EXISTS payroll_runs_tenant_isolation ON payroll_runs;
DROP POLICY IF EXISTS payroll_items_tenant_isolation ON payroll_items;
DROP POLICY IF EXISTS invoices_tenant_isolation ON invoices;

-- Drop system bypass policies
DROP POLICY IF EXISTS system_operations_bypass ON companies;
DROP POLICY IF EXISTS system_operations_bypass ON users;
DROP POLICY IF EXISTS system_operations_bypass ON clients;
DROP POLICY IF EXISTS system_operations_bypass ON employees;
DROP POLICY IF EXISTS system_operations_bypass ON sites;
DROP POLICY IF EXISTS system_operations_bypass ON assignments;
DROP POLICY IF EXISTS system_operations_bypass ON shifts;
DROP POLICY IF EXISTS system_operations_bypass ON attendance;
DROP POLICY IF EXISTS system_operations_bypass ON payroll_runs;
DROP POLICY IF EXISTS system_operations_bypass ON payroll_items;
DROP POLICY IF EXISTS system_operations_bypass ON invoices;

-- =============================================================================
-- CREATE TENANT ISOLATION POLICIES
-- =============================================================================

\echo 'Creating tenant isolation policies...'

-- Companies: Users can only access their own company data
CREATE POLICY company_self_access ON companies
    USING (id = current_tenant_id());

-- Users: Access limited to users within the same company
CREATE POLICY users_tenant_isolation ON users
    USING (company_id = current_tenant_id());

-- Clients: Access limited to clients of the same company
CREATE POLICY clients_tenant_isolation ON clients
    USING (company_id = current_tenant_id());

-- Employees: Access limited to employees of the same company
CREATE POLICY employees_tenant_isolation ON employees
    USING (company_id = current_tenant_id());

-- Sites: Access through client->company relationship
CREATE POLICY sites_tenant_isolation ON sites
    USING (EXISTS (
        SELECT 1 FROM clients 
        WHERE clients.id = sites.client_id 
        AND clients.company_id = current_tenant_id()
    ));

-- Assignments: Access through employee->company and site->client->company
CREATE POLICY assignments_tenant_isolation ON assignments
    USING (EXISTS (
        SELECT 1 FROM employees 
        WHERE employees.id = assignments.employee_id 
        AND employees.company_id = current_tenant_id()
    ) AND EXISTS (
        SELECT 1 FROM sites 
        JOIN clients ON clients.id = sites.client_id
        WHERE sites.id = assignments.site_id 
        AND clients.company_id = current_tenant_id()
    ));

-- Shifts: Access through assignment->employee->company
CREATE POLICY shifts_tenant_isolation ON shifts
    USING (EXISTS (
        SELECT 1 FROM assignments 
        JOIN employees ON employees.id = assignments.employee_id
        WHERE assignments.id = shifts.assignment_id 
        AND employees.company_id = current_tenant_id()
    ));

-- Attendance: Access through employee->company
CREATE POLICY attendance_tenant_isolation ON attendance
    USING (EXISTS (
        SELECT 1 FROM employees 
        WHERE employees.id = attendance.employee_id 
        AND employees.company_id = current_tenant_id()
    ));

-- Payroll Runs: Direct company ownership
CREATE POLICY payroll_runs_tenant_isolation ON payroll_runs
    USING (company_id = current_tenant_id());

-- Payroll Items: Access through payroll_run->company
CREATE POLICY payroll_items_tenant_isolation ON payroll_items
    USING (EXISTS (
        SELECT 1 FROM payroll_runs 
        WHERE payroll_runs.id = payroll_items.payroll_run_id 
        AND payroll_runs.company_id = current_tenant_id()
    ));

-- Invoices: Access through client->company
CREATE POLICY invoices_tenant_isolation ON invoices
    USING (EXISTS (
        SELECT 1 FROM clients 
        WHERE clients.id = invoices.client_id 
        AND clients.company_id = current_tenant_id()
    ));

-- =============================================================================
-- SYSTEM OPERATION BYPASS POLICIES
-- =============================================================================

\echo 'Creating system operation bypass policies...'

-- Allow system operations when no tenant context is set
-- These policies have lower priority and only apply when tenant context is NULL

CREATE POLICY system_operations_bypass ON companies
    USING (current_tenant_id() IS NULL);

CREATE POLICY system_operations_bypass ON users
    USING (current_tenant_id() IS NULL);

CREATE POLICY system_operations_bypass ON clients
    USING (current_tenant_id() IS NULL);

CREATE POLICY system_operations_bypass ON employees
    USING (current_tenant_id() IS NULL);

CREATE POLICY system_operations_bypass ON sites
    USING (current_tenant_id() IS NULL);

CREATE POLICY system_operations_bypass ON assignments
    USING (current_tenant_id() IS NULL);

CREATE POLICY system_operations_bypass ON shifts
    USING (current_tenant_id() IS NULL);

CREATE POLICY system_operations_bypass ON attendance
    USING (current_tenant_id() IS NULL);

CREATE POLICY system_operations_bypass ON payroll_runs
    USING (current_tenant_id() IS NULL);

CREATE POLICY system_operations_bypass ON payroll_items
    USING (current_tenant_id() IS NULL);

CREATE POLICY system_operations_bypass ON invoices
    USING (current_tenant_id() IS NULL);

-- =============================================================================
-- PERFORMANCE OPTIMIZATION INDEXES
-- =============================================================================

\echo 'Creating performance indexes for RLS queries...'

-- Tenant-aware indexes to optimize RLS policy queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clients_company_id_rls 
    ON clients(company_id) WHERE company_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_employees_company_id_rls 
    ON employees(company_id) WHERE company_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sites_client_id_rls 
    ON sites(client_id) WHERE client_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_assignments_employee_site_rls 
    ON assignments(employee_id, site_id) 
    WHERE employee_id IS NOT NULL AND site_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_shifts_assignment_id_rls 
    ON shifts(assignment_id) WHERE assignment_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payroll_items_payroll_run_id_rls 
    ON payroll_items(payroll_run_id) WHERE payroll_run_id IS NOT NULL;

-- =============================================================================
-- GRANT PERMISSIONS
-- =============================================================================

\echo 'Granting necessary permissions...'

-- Grant execute permissions on helper functions to application user
DO $$
BEGIN
    -- Try to grant to payroll_user if it exists
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'payroll_user') THEN
        GRANT EXECUTE ON FUNCTION current_tenant_id() TO payroll_user;
        GRANT EXECUTE ON FUNCTION is_tenant_admin() TO payroll_user;
        GRANT EXECUTE ON FUNCTION validate_rls_isolation() TO payroll_user;
        GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO payroll_user;
        RAISE NOTICE 'Permissions granted to payroll_user';
    ELSE
        RAISE NOTICE 'payroll_user role not found - skipping permission grants';
    END IF;
END $$;

-- =============================================================================
-- VALIDATION AND COMPLETION
-- =============================================================================

\echo 'Validating RLS configuration...'

-- Show RLS status for all tables
DO $$
DECLARE
    rec RECORD;
    total_tables INTEGER := 0;
    rls_enabled_tables INTEGER := 0;
    total_policies INTEGER := 0;
BEGIN
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'RLS CONFIGURATION VALIDATION';
    RAISE NOTICE '==============================================';
    
    FOR rec IN SELECT * FROM validate_rls_isolation() LOOP
        total_tables := total_tables + 1;
        total_policies := total_policies + rec.policy_count;
        
        IF rec.rls_enabled THEN
            rls_enabled_tables := rls_enabled_tables + 1;
        END IF;
        
        RAISE NOTICE 'Table: % | RLS: % | Policies: %', 
            rec.table_name, 
            CASE WHEN rec.rls_enabled THEN 'ENABLED' ELSE 'DISABLED' END,
            rec.policy_count;
    END LOOP;
    
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'SUMMARY:';
    RAISE NOTICE '  Total Tables: %', total_tables;
    RAISE NOTICE '  RLS Enabled: %', rls_enabled_tables;
    RAISE NOTICE '  Total Policies: %', total_policies;
    RAISE NOTICE '==============================================';
    
    IF rls_enabled_tables >= 11 AND total_policies >= 22 THEN
        RAISE NOTICE '✅ RLS SETUP COMPLETED SUCCESSFULLY!';
        RAISE NOTICE 'Multi-tenant data isolation is now active.';
    ELSE
        RAISE NOTICE '⚠️  RLS setup may be incomplete.';
        RAISE NOTICE 'Expected: 11+ tables with RLS, 22+ policies';
    END IF;
END $$;

\echo 'RLS setup completed. Review the output above for any issues.'