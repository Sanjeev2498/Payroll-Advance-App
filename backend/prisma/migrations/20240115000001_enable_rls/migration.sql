-- Enable Row-Level Security (RLS) for multi-tenant data isolation
-- This migration implements comprehensive RLS policies for all tenant-specific tables

-- =============================================================================
-- ENABLE RLS ON ALL TENANT-SPECIFIC TABLES
-- =============================================================================

-- Core tenant tables
ALTER TABLE "companies" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "clients" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "employees" ENABLE ROW LEVEL SECURITY;

-- Site and assignment tables (access through company relationship)
ALTER TABLE "sites" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "assignments" ENABLE ROW LEVEL SECURITY;

-- Scheduling and attendance tables
ALTER TABLE "shifts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "attendance" ENABLE ROW LEVEL SECURITY;

-- Financial tables
ALTER TABLE "payroll_runs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "payroll_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "invoices" ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- HELPER FUNCTIONS FOR TENANT CONTEXT
-- =============================================================================

-- Function to get current tenant ID from session
CREATE OR REPLACE FUNCTION current_tenant_id()
RETURNS UUID AS $$
BEGIN
    RETURN current_setting('app.tenant_id', true)::uuid;
EXCEPTION
    WHEN OTHERS THEN
        -- Return NULL if no tenant context is set (for system operations)
        RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to check if user has admin privileges
CREATE OR REPLACE FUNCTION is_tenant_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN current_setting('app.user_role', true) IN ('SUPER_ADMIN', 'COMPANY_ADMIN');
EXCEPTION
    WHEN OTHERS THEN
        RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- =============================================================================
-- TENANT ISOLATION POLICIES
-- =============================================================================

-- Companies: Users can only access their own company
CREATE POLICY "company_self_access" ON "companies"
    USING (id = current_tenant_id());

-- Users: Access limited to same company
CREATE POLICY "users_tenant_isolation" ON "users"
    USING (company_id = current_tenant_id());

-- Clients: Access limited to same company
CREATE POLICY "clients_tenant_isolation" ON "clients"
    USING (company_id = current_tenant_id());

-- Employees: Access limited to same company
CREATE POLICY "employees_tenant_isolation" ON "employees"
    USING (company_id = current_tenant_id());

-- Sites: Access through client->company relationship
CREATE POLICY "sites_tenant_isolation" ON "sites"
    USING (EXISTS (
        SELECT 1 FROM "clients" 
        WHERE "clients"."id" = "sites"."client_id" 
        AND "clients"."company_id" = current_tenant_id()
    ));

-- Assignments: Access through employee->company and site->client->company relationship
CREATE POLICY "assignments_tenant_isolation" ON "assignments"
    USING (EXISTS (
        SELECT 1 FROM "employees" 
        WHERE "employees"."id" = "assignments"."employee_id" 
        AND "employees"."company_id" = current_tenant_id()
    ) AND EXISTS (
        SELECT 1 FROM "sites" 
        JOIN "clients" ON "clients"."id" = "sites"."client_id"
        WHERE "sites"."id" = "assignments"."site_id" 
        AND "clients"."company_id" = current_tenant_id()
    ));

-- Shifts: Access through assignment->employee->company relationship
CREATE POLICY "shifts_tenant_isolation" ON "shifts"
    USING (EXISTS (
        SELECT 1 FROM "assignments" 
        JOIN "employees" ON "employees"."id" = "assignments"."employee_id"
        WHERE "assignments"."id" = "shifts"."assignment_id" 
        AND "employees"."company_id" = current_tenant_id()
    ));

-- Attendance: Access through employee->company relationship
CREATE POLICY "attendance_tenant_isolation" ON "attendance"
    USING (EXISTS (
        SELECT 1 FROM "employees" 
        WHERE "employees"."id" = "attendance"."employee_id" 
        AND "employees"."company_id" = current_tenant_id()
    ));

-- Payroll Runs: Direct tenant access
CREATE POLICY "payroll_runs_tenant_isolation" ON "payroll_runs"
    USING (company_id = current_tenant_id());

-- Payroll Items: Access through payroll_run->company relationship
CREATE POLICY "payroll_items_tenant_isolation" ON "payroll_items"
    USING (EXISTS (
        SELECT 1 FROM "payroll_runs" 
        WHERE "payroll_runs"."id" = "payroll_items"."payroll_run_id" 
        AND "payroll_runs"."company_id" = current_tenant_id()
    ));

-- Invoices: Access through client->company relationship
CREATE POLICY "invoices_tenant_isolation" ON "invoices"
    USING (EXISTS (
        SELECT 1 FROM "clients" 
        WHERE "clients"."id" = "invoices"."client_id" 
        AND "clients"."company_id" = current_tenant_id()
    ));

-- =============================================================================
-- ADDITIONAL SECURITY POLICIES FOR SYSTEM OPERATIONS
-- =============================================================================

-- Allow system operations when no tenant context is set (for migrations, seeds, etc.)
-- This policy has lower priority and only applies when tenant context is NULL

CREATE POLICY "system_operations_bypass" ON "companies"
    USING (current_tenant_id() IS NULL);

CREATE POLICY "system_operations_bypass" ON "users"
    USING (current_tenant_id() IS NULL);

CREATE POLICY "system_operations_bypass" ON "clients"
    USING (current_tenant_id() IS NULL);

CREATE POLICY "system_operations_bypass" ON "employees"
    USING (current_tenant_id() IS NULL);

CREATE POLICY "system_operations_bypass" ON "sites"
    USING (current_tenant_id() IS NULL);

CREATE POLICY "system_operations_bypass" ON "assignments"
    USING (current_tenant_id() IS NULL);

CREATE POLICY "system_operations_bypass" ON "shifts"
    USING (current_tenant_id() IS NULL);

CREATE POLICY "system_operations_bypass" ON "attendance"
    USING (current_tenant_id() IS NULL);

CREATE POLICY "system_operations_bypass" ON "payroll_runs"
    USING (current_tenant_id() IS NULL);

CREATE POLICY "system_operations_bypass" ON "payroll_items"
    USING (current_tenant_id() IS NULL);

CREATE POLICY "system_operations_bypass" ON "invoices"
    USING (current_tenant_id() IS NULL);

-- =============================================================================
-- GRANT PERMISSIONS
-- =============================================================================

-- Grant execute permissions on helper functions
GRANT EXECUTE ON FUNCTION current_tenant_id() TO payroll_user;
GRANT EXECUTE ON FUNCTION is_tenant_admin() TO payroll_user;

-- Grant necessary permissions for RLS to work properly
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO payroll_user;

-- =============================================================================
-- PERFORMANCE INDEXES FOR RLS QUERIES
-- =============================================================================

-- Additional indexes to optimize RLS policy queries
-- These complement the existing indexes from the main migration

-- Optimize tenant context lookups
CREATE INDEX IF NOT EXISTS "idx_clients_company_id_rls" ON "clients"("company_id") 
WHERE company_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS "idx_employees_company_id_rls" ON "employees"("company_id") 
WHERE company_id IS NOT NULL;

-- Optimize cross-table RLS policy queries
CREATE INDEX IF NOT EXISTS "idx_sites_client_id_rls" ON "sites"("client_id") 
WHERE client_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS "idx_assignments_employee_site_rls" 
ON "assignments"("employee_id", "site_id") 
WHERE employee_id IS NOT NULL AND site_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS "idx_shifts_assignment_id_rls" ON "shifts"("assignment_id") 
WHERE assignment_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS "idx_payroll_items_payroll_run_id_rls" 
ON "payroll_items"("payroll_run_id") 
WHERE payroll_run_id IS NOT NULL;

-- =============================================================================
-- VALIDATION AND TESTING SETUP
-- =============================================================================

-- Create a test function to validate RLS is working
CREATE OR REPLACE FUNCTION validate_rls_isolation()
RETURNS TABLE(table_name TEXT, policy_count INTEGER, rls_enabled BOOLEAN) AS $$
SELECT 
    t.schemaname::TEXT || '.' || t.tablename::TEXT as table_name,
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

-- Grant execution to validate function
GRANT EXECUTE ON FUNCTION validate_rls_isolation() TO payroll_user;

-- =============================================================================
-- MIGRATION COMPLETION LOG
-- =============================================================================

DO $$
BEGIN
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'RLS Migration Completed Successfully';
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'Enabled RLS on % tables', (
        SELECT COUNT(*) FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relkind = 'r' AND n.nspname = 'public' 
        AND c.relrowsecurity = true
        AND c.relname NOT LIKE 'pg_%'
        AND c.relname NOT LIKE '_prisma_%'
    );
    RAISE NOTICE 'Created % RLS policies', (
        SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public'
    );
    RAISE NOTICE 'Helper functions: current_tenant_id(), is_tenant_admin()';
    RAISE NOTICE 'Validation function: validate_rls_isolation()';
    RAISE NOTICE '==============================================';
END $$;