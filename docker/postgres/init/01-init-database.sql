-- Initialize PostgreSQL for the Payroll System
-- This script runs when the PostgreSQL container starts for the first time

-- Create database extensions for advanced features
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";        -- UUID generation
CREATE EXTENSION IF NOT EXISTS "pg_trgm";          -- Trigram matching for full-text search
CREATE EXTENSION IF NOT EXISTS "btree_gin";        -- GIN indexes for better performance
CREATE EXTENSION IF NOT EXISTS "btree_gist";       -- GiST indexes for range operations
CREATE EXTENSION IF NOT EXISTS "pgcrypto";         -- Cryptographic functions

-- Create application user with appropriate privileges
-- Note: For development only - production should use more restrictive permissions
GRANT ALL PRIVILEGES ON DATABASE payroll_system_dev TO payroll_user;
GRANT ALL PRIVILEGES ON SCHEMA public TO payroll_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO payroll_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO payroll_user;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO payroll_user;

-- Set default privileges for future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO payroll_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO payroll_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO payroll_user;

-- Create a function to set tenant context (for Row-Level Security)
CREATE OR REPLACE FUNCTION set_tenant_id(tenant_uuid UUID)
RETURNS VOID AS $$
BEGIN
    PERFORM set_config('app.tenant_id', tenant_uuid::text, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the tenant function
GRANT EXECUTE ON FUNCTION set_tenant_id(UUID) TO payroll_user;

-- Create indexes that will be commonly used across the application
-- These will be created on actual tables once the schema is established

-- Log successful initialization
INSERT INTO pg_stat_statements_info DEFAULT VALUES 
ON CONFLICT DO NOTHING;

-- Output initialization status
DO $$
BEGIN
    RAISE NOTICE 'PayrollSystem database initialized successfully';
    RAISE NOTICE 'Extensions created: uuid-ossp, pg_trgm, btree_gin, btree_gist, pgcrypto';
    RAISE NOTICE 'Tenant context function created and permissions granted';
END $$;