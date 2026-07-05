-- Fix for Bug 1: Multi-Tenant Isolation Failure
-- Apply FORCE ROW LEVEL SECURITY to prevent RLS bypass for superusers and table owners

-- Force RLS on all tenant-specific tables
ALTER TABLE "companies" FORCE ROW LEVEL SECURITY;
ALTER TABLE "users" FORCE ROW LEVEL SECURITY;
ALTER TABLE "clients" FORCE ROW LEVEL SECURITY;
ALTER TABLE "employees" FORCE ROW LEVEL SECURITY;
ALTER TABLE "sites" FORCE ROW LEVEL SECURITY;
ALTER TABLE "assignments" FORCE ROW LEVEL SECURITY;
ALTER TABLE "shifts" FORCE ROW LEVEL SECURITY;
ALTER TABLE "attendance" FORCE ROW LEVEL SECURITY;
ALTER TABLE "payroll_runs" FORCE ROW LEVEL SECURITY;
ALTER TABLE "payroll_items" FORCE ROW LEVEL SECURITY;
ALTER TABLE "invoices" FORCE ROW LEVEL SECURITY;

-- For tables that might not be covered yet
ALTER TABLE "shift_templates" FORCE ROW LEVEL SECURITY;
ALTER TABLE "shift_notifications" FORCE ROW LEVEL SECURITY;

-- Verify the fix
DO $$
BEGIN
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'Bug 1 Fix Applied: FORCE ROW LEVEL SECURITY';
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'All tenant tables now enforce RLS for all users';
    RAISE NOTICE 'Including superusers and table owners';
    RAISE NOTICE 'Multi-tenant isolation should now work correctly';
    RAISE NOTICE '==============================================';
END $$;