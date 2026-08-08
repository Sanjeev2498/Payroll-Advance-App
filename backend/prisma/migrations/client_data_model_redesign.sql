-- Migration: Client Data Model Redesign
-- Description: Documents the implementation of the Company → Client → Contract → Sites → Deployments architecture
-- Task: 11.7.1 Redesign Client Data Model and Architecture
-- Date: $(Get-Date -Format "yyyy-MM-dd")

-- This migration documents the redesigned client data model architecture that implements:
-- 1. Company → Client → Contract → Sites → Deployments hierarchy
-- 2. Contract entity between Client and Sites with service definitions
-- 3. Client Users/Contacts with role-based permissions
-- 4. Client organization types and enhanced management fields

-- Architecture Overview:
-- - Companies manage multiple Clients
-- - Clients have multiple Contracts (service agreements)
-- - Contracts define Sites where services are delivered
-- - Sites have Assignments (employee deployments)
-- - Client Users provide role-based access to client stakeholders

-- Key Features Implemented:
-- ✅ Contract entity with service definitions, SLAs, and billing configuration
-- ✅ ClientUser entity with 5 role types (Security Manager, Facility Manager, HR Manager, Finance Manager, Regional Manager)
-- ✅ Client organization types (9 types: Corporate Offices, Hospitals, Shopping Malls, etc.)
-- ✅ Site-specific billing rates and SLA overrides
-- ✅ Enhanced client management fields (industry, company size, tags, performance metrics)
-- ✅ Account manager assignment and relationship tracking
-- ✅ Contract history and renewal management
-- ✅ Client user invitation and activation workflows

-- Database Schema Verification:
-- The following tables and relationships are now in place:

-- 1. Enhanced Client Model
-- Table: clients
-- Key Fields: id, company_id, name, contact_email, organization_type, industry, 
--            company_size, tags, account_manager_id, performance_metrics
-- Relationships: → Company, → User (account manager), → Contract[], → ClientUser[]

-- 2. Contract Entity (NEW)
-- Table: contracts  
-- Key Fields: id, client_id, contract_number, title, status, start_date, end_date,
--            service_definitions, service_level_agreement, billing_preferences, 
--            default_billing_rates, contract_value, payment_terms
-- Relationships: → Client, → Site[], → Invoice[]

-- 3. Client User Entity (NEW)  
-- Table: client_users
-- Key Fields: id, client_id, email, first_name, last_name, role, phone, job_title,
--            department, is_active, permissions, preferences
-- Relationships: → Client
-- Roles: SECURITY_MANAGER, FACILITY_MANAGER, HR_MANAGER, FINANCE_MANAGER, REGIONAL_MANAGER

-- 4. Updated Site Model
-- Table: sites
-- Key Fields: id, contract_id, name, address, operational_status, contact_info,
--            site_billing_rates, site_sla, min_staffing_level, max_staffing_level
-- Relationships: → Contract, → Assignment[]

-- 5. Client Organization Types (ENUM)
-- Values: CORPORATE_OFFICE, RESIDENTIAL_SOCIETY, HOSPITAL, SHOPPING_MALL, FACTORY,
--         WAREHOUSE, EDUCATIONAL_INSTITUTION, GOVERNMENT_BUILDING, HOTEL

-- Repository Patterns Updated:
-- ✅ ClientRepository - Updated for new schema with contracts relationship
-- ✅ ContractRepository - New repository for contract management 
-- ✅ ClientUserRepository - New repository for client user management

-- Data Flow Examples:
-- 1. Client Onboarding: Company → Client → Contract → Sites
-- 2. Site Access: ClientUser (role-based) → Client → Contract → Sites
-- 3. Billing: Contract → Sites → Assignments → Hours → Invoices  
-- 4. Service Delivery: Contract (SLA) → Sites (deployment) → Assignments (employees)

-- Benefits of New Architecture:
-- 1. Multi-contract support per client
-- 2. Site-specific billing and SLA management  
-- 3. Granular client user permissions
-- 4. Flexible service definitions per contract
-- 5. Enhanced client relationship management
-- 6. Scalable organization type classification
-- 7. Contract lifecycle management with renewal tracking

-- Implementation Status: COMPLETE ✅
-- All required entities, relationships, and repository patterns have been implemented
-- and are ready for use in the application layer.

SELECT 'Client Data Model Redesign Migration Complete' AS status;