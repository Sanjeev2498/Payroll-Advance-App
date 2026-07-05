# Implementation Plan: Security Workforce & Payroll Management System

## Overview

This implementation plan covers **Phase 1: Foundation & Product Architecture** for an enterprise SaaS platform that manages security workforce operations and payroll processing. The implementation follows a multi-tenant architecture using TypeScript, NestJS backend, Next.js frontend, and PostgreSQL with Row-Level Security.

The approach focuses on building essential foundation components without over-engineering, ensuring proper multi-tenant data isolation, and establishing core CRUD operations for all business entities with comprehensive property-based testing.

## Tasks

- [x] 1. Development Environment Setup and Project Scaffolding
  - [x] 1.1 Initialize backend NestJS project with TypeScript configuration
    - Create NestJS application with proper folder structure
    - Configure TypeScript, ESLint, and Prettier
    - Set up environment configuration and validation
    - _Requirements: 1.1, 14.1_

  - [x] 1.2 Initialize frontend Next.js project with App Router
    - Create Next.js 14+ application with TypeScript and Tailwind CSS
    - Configure Zustand for state management and TanStack Query for server state
    - Set up component library structure and development tools
    - _Requirements: 1.1, 11.5_

  - [x] 1.3 Set up Docker development environment
    - Create Docker Compose configuration for PostgreSQL and Redis
    - Configure database connection and Redis cache setup
    - Establish development database with proper extensions
    - _Requirements: 1.1_

  - [x]* 1.4 Configure CI/CD pipeline foundation
    - Set up GitHub Actions or similar CI/CD workflow
    - Configure automated testing, linting, and build validation
    - _Requirements: 14.4_

- [x] 2. Database Schema and Multi-Tenant Architecture Implementation
  - [x] 2.1 Set up Prisma ORM with PostgreSQL schema
    - Initialize Prisma with database configuration
    - Create base schema with Company, User, and audit fields
    - Configure Prisma client generation and migration setup
    - _Requirements: 1.1, 1.2_

  - [x] 2.2 Implement Row-Level Security (RLS) policies
    - Enable RLS on all tenant-specific tables
    - Create tenant isolation policies and helper functions
    - Implement tenant context setting mechanism
    - _Requirements: 1.1_

  - [x]* 2.3 Write property test for multi-tenant data isolation
    - **Property 1: Multi-tenant Data Isolation**
    - **Validates: Requirements 1.1**
    - Test that tenant queries never return data from other tenants

  - [x] 2.4 Create core entity schemas (Company, Client, Site, Employee)
    - Define Prisma models for primary business entities
    - Implement proper relationships, constraints, and indexes
    - Add JSON fields for flexible configuration and metadata
    - _Requirements: 1.2, 2.1, 3.1, 4.1_

  - [x] 2.5 Implement Assignment, Shift, Attendance, and Payroll schemas
    - Create workforce scheduling and tracking entities
    - Define payroll processing and billing entities  
    - Establish proper foreign key relationships and constraints
    - _Requirements: 5.1, 6.1, 7.1, 8.1, 9.1_

  - [x]* 2.6 Write property tests for data integrity constraints
    - **Property 2: Company Registration Completeness**
    - **Validates: Requirements 1.2**
    - Test that company registration creates complete workspace with defaults

- [x] 3. Authentication and Authorization System
  - [x] 3.1 Implement JWT-based authentication service
    - Create authentication module with login/logout endpoints
    - Implement JWT token generation and validation
    - Add refresh token mechanism for secure token renewal
    - _Requirements: 14.1_

  - [x] 3.2 Build role-based access control (RBAC) system
    - Define user roles and permissions system
    - Create authorization guards and decorators
    - Implement tenant-aware permission checking
    - _Requirements: 1.3_

  - [ ]* 3.3 Write property test for role-based access enforcement
    - **Property 3: Role-Based Access Enforcement**  
    - **Validates: Requirements 1.3**
    - Test that users can only access resources permitted by their roles

  - [x] 3.4 Create tenant context management system
    - Implement tenant context injection middleware
    - Build tenant guard for automatic context setting
    - Create tenant-aware base repository pattern
    - _Requirements: 1.1_

  - [x] 3.5 Build user management endpoints and services
    - Create user CRUD operations with tenant isolation
    - Implement user registration and profile management
    - Add password hashing and security validations
    - _Requirements: 1.3, 14.1_

- [x] 4. Checkpoint - Authentication and Database Foundation
  - Ensure all tests pass, verify multi-tenant isolation works correctly, ask the user if questions arise.

- [x] 5. Core Business Logic and API Implementation
  - [x] 5.1 Implement Client management module
    - Create Client entity CRUD operations with full API endpoints
    - Build client onboarding workflow with contract management
    - Implement client search, filtering, and pagination
    - _Requirements: 2.1_

  - [x] 5.2 Write property test for client data capture
    - **Property 4: Client Data Capture Completeness**
    - **Validates: Requirements 2.1**
    - Test that client onboarding captures all required data without loss

  - [x] 5.3 Implement Site management module
    - Create Site entity with location and operational specifications
    - Build site CRUD operations with client relationship management
    - Implement site status tracking and requirements definition
    - _Requirements: 3.1_

  - [x]* 5.4 Write property test for site information preservation
    - **Property 5: Site Information Preservation**
    - **Validates: Requirements 3.1**
    - Test that site creation accurately captures and maintains all specifications

  - [x] 5.5 Implement Employee management module
    - Create Employee entity with skills, certifications, and compliance tracking
    - Build employee CRUD operations with document management
    - Implement employee search by skills and availability
    - _Requirements: 4.1_

  - [x] 5.6 Write property test for employee data integrity
    - **Property 6: Employee Data Integrity**
    - **Validates: Requirements 4.1**
    - Test that employee data capture maintains consistency and validation rules

  - [x] 5.7 Implement Assignment management system
    - Create Assignment entity linking employees to sites with roles
    - Build skill-matching logic for optimal assignment recommendations
    - Implement assignment CRUD with conflict detection and validation
    - _Requirements: 5.1, 5.2_

  - [x] 5.8 Write property tests for assignment logic
    - **Property 7: Assignment Skill Matching**
    - **Validates: Requirements 5.1**
    - Test that assignments correctly match employee skills with site requirements
    - **Property 8: Scheduling Conflict Prevention**
    - **Validates: Requirements 5.2**
    - Test that system prevents scheduling conflicts and validates availability

- [x] 6. Shift Management and Attendance Tracking
  - [x] 6.1 Implement Shift scheduling system
    - Create Shift entity with flexible patterns and recurring schedules
    - Build shift CRUD operations with coverage requirement tracking
    - Implement shift modification workflows with notifications
    - _Requirements: 6.1, 6.2_

  - [x] 6.2 Implement Attendance tracking system
    - Create Attendance entity with timestamp and location verification
    - Build clock-in/clock-out endpoints with validation and anomaly detection
    - Implement attendance correction workflows with approval processes
    - _Requirements: 7.1, 7.4_

  - [x] 6.3 Write property test for attendance recording accuracy
    - **Property 9: Attendance Recording Accuracy**
    - **Validates: Requirements 7.1**
    - Test that attendance records capture complete data without corruption

  - [x] 6.4 Build real-time attendance dashboard components
    - Create attendance monitoring interface with live updates
    - Implement attendance anomaly detection and alerting
    - Build attendance reporting with filtering and export capabilities
    - _Requirements: 7.3, 11.1_

- [x] 7. Payroll Processing Engine
  - [x] 7.1 Implement core payroll calculation engine
    - Create PayrollRun and PayrollItem entities with calculation logic
    - Build payroll calculation service with attendance-based salary computation
    - Implement basic pay, overtime, and deduction calculations
    - _Requirements: 8.1, 8.2_

  - [x] 7.2 Write property tests for payroll calculations
    - **Property 10: Payroll Calculation Correctness**
    - **Validates: Requirements 8.1**
    - Test mathematical accuracy of salary calculations based on attendance and rates
    - **Property 11: Complex Payroll Component Accuracy**
    - **Validates: Requirements 8.2**
    - Test accuracy of complex payroll components (overtime, bonuses, deductions)

  - [x] 7.3 Build payroll run management system
    - Create payroll run initialization and processing workflows
    - Implement payroll approval processes with immutable finalization
    - Build payroll reports, pay slips, and export functionality
    - _Requirements: 8.3, 8.5_

  - [x] 7.4 Implement client billing and invoice generation
    - Create Invoice entity with site deployment-based charging
    - Build invoice calculation logic based on hours worked and contract rates
    - Implement invoice generation, tracking, and status management
    - _Requirements: 9.1, 9.3, 9.4_

  - [x] 7.5 Write property test for invoice calculation precision
    - **Property 12: Invoice Calculation Precision**
    - **Validates: Requirements 9.1**
    - Test that invoice calculations accurately reflect deployment evidence and rates

**Phase 1 – Enterprise Operations Center (Highest Priority)**
- [x] 8. Enterprise Operations Dashboard
  - [x] 8.1 Build Enterprise Operations Command Center
    - Design enterprise application shell with authentication interface and layout system
    - Build responsive navigation and role-based sidebar
    - Create Operations Command Center homepage
    - Display real-time KPIs: Active Guards, Active Sites, Guards on Duty, Vacant Positions, Attendance Status, Payroll Status, Pending Approvals, Billing Overview
    - Build activity timeline
    - Add notification center
    - Mobile responsive layout
    - _Requirements: 11.1, 14.1, 11.5_

  - [x] 8.1.PT Write property test for Operations Command Center KPI accuracy
    - **Property 14: Real-time KPI Accuracy**
    - **Validates: Requirements 11.1**
    - Test that Operations Command Center displays accurate real-time metrics for active guards, sites, attendance status, and billing overview

  - [x] 8.2 Build Deployment Operations Dashboard
    - Site deployment overview
    - Required vs Assigned Guards
    - Vacancy tracking
    - Shift coverage visualization
    - Guard availability
    - Emergency replacement actions
    - Assignment conflict indicators
    - Site operational health
    - _Requirements: 5.1, 5.2, 11.1_

  - [x] 8.2.PT Write property test for deployment assignment correctness
    - **Property 15: Deployment Assignment Correctness**
    - **Validates: Requirements 5.1, 5.2**
    - Test that deployment dashboard correctly tracks required vs assigned guards and prevents assignment conflicts

  - [x] 8.3 Build Attendance Operations Dashboard
    - Live attendance monitor
    - GPS verification status
    - Late arrivals
    - Missing check-ins
    - Attendance anomaly alerts
    - Supervisor attendance approval
    - Attendance heatmaps
    - _Requirements: 7.1, 7.3, 11.1_

  - [x] 8.3.PT Write property test for attendance monitoring accuracy
    - **Property 16: Attendance Monitoring Accuracy**
    - **Validates: Requirements 7.1, 7.3**
    - Test that attendance dashboard accurately tracks GPS verification, late arrivals, and attendance anomalies

**Phase 2 – Workforce Management**
- [ ] 9. Workforce Management Interfaces
  - [ ] 9.1 Employee Management
    - Employee directory
    - Search & filtering
    - Skill management
    - Availability status
    - Employee profile
    - Document management
    - _Requirements: 4.1_

  - [ ] 9.1.PT Write property test for employee search and filtering correctness
    - **Property 17: Employee Search Correctness**
    - **Validates: Requirements 4.1**
    - Test that employee directory search and filtering returns accurate results based on skills, availability, and status

  - [ ] 9.2 Assignment Management
    - Drag & drop assignment board
    - Site assignment
    - Shift assignment
    - Conflict detection
    - Assignment recommendations
    - _Requirements: 5.1, 5.2_

  - [ ] 9.2.PT Write property test for drag-and-drop assignment validation
    - **Property 18: Assignment Interface Validation**
    - **Validates: Requirements 5.1, 5.2**
    - Test that drag-and-drop assignment board maintains data consistency and validates all assignment constraints

  - [ ] 9.3 Shift Management
    - Shift calendar
    - Recurring schedules
    - Shift swapping
    - Shift availability
    - _Requirements: 6.1, 6.2_

  - [ ] 9.3.PT Write property test for shift calendar consistency
    - **Property 19: Shift Calendar Consistency**
    - **Validates: Requirements 6.1, 6.2**
    - Test that shift calendar operations (creation, swapping, recurring) maintain schedule integrity and prevent conflicts

**Phase 3 – Business Management**
- [ ] 10. Client & Site Operations
  - [ ] 10.1 Client Management
    - Client directory
    - Client onboarding
    - Contract management
    - Billing configuration
    - _Requirements: 2.1_

  - [ ] 10.1.PT Write property test for client onboarding workflow completeness
    - **Property 20: Client Onboarding Completeness**
    - **Validates: Requirements 2.1**
    - Test that client onboarding workflow captures all required information and properly configures billing settings

  - [ ] 10.2 Site Management
    - Site overview
    - Site status
    - Site requirements
    - Guard deployment
    - Operational statistics
    - _Requirements: 3.1_

  - [ ] 10.2.PT Write property test for site operational status accuracy
    - **Property 21: Site Status Accuracy**
    - **Validates: Requirements 3.1**
    - Test that site management interface accurately reflects operational status and guard deployment requirements

**Phase 4 – Financial Operations**
- [ ] 11. Payroll & Billing
  - [ ] 11.1 Payroll Operations
    - Payroll dashboard
    - Payroll run interface
    - Approval workflow
    - Payslip generation
    - Salary summaries
    - _Requirements: 8.1, 8.3, 8.5_

  - [ ] 11.1.PT Write property test for payroll dashboard calculation accuracy
    - **Property 22: Payroll Dashboard Accuracy**
    - **Validates: Requirements 8.1, 8.3**
    - Test that payroll dashboard displays accurate calculations and approval workflow maintains data integrity

  - [ ] 11.2 Billing & Invoicing
    - Invoice dashboard
    - Invoice generation
    - Client billing
    - Payment tracking
    - Revenue analytics
    - _Requirements: 9.1, 9.3, 9.4_

  - [ ] 11.2.PT Write property test for invoice generation correctness
    - **Property 23: Invoice Generation Correctness**
    - **Validates: Requirements 9.1, 9.3**
    - Test that invoice generation accurately calculates billing amounts and tracks payment status

  - [ ] 11.3 Financial Reports
    - Payroll reports
    - Billing reports
    - Site profitability
    - Cost analysis
    - _Requirements: 8.5, 9.4_

  - [ ] 11.3.PT Write property test for financial report accuracy
    - **Property 24: Financial Report Accuracy**
    - **Validates: Requirements 8.5, 9.4**
    - Test that financial reports (payroll, billing, profitability) display accurate calculations and data consistency

**Phase 5 – Customer Experience**
- [ ] 12. Self-Service Portals
  - [ ] 12.1 Employee Portal
    - Attendance
    - Schedule
    - Leave
    - Payslips
    - Documents
    - Notifications
    - _Requirements: 11.2_

  - [ ] 12.1.PT Write property test for employee portal data consistency
    - **Property 25: Employee Portal Consistency**
    - **Validates: Requirements 11.2**
    - Test that employee portal displays consistent attendance, schedule, and payslip data across all views

  - [ ] 12.2 Client Portal
    - Site monitoring
    - Attendance
    - Deployment
    - Reports
    - Invoices
    - Complaints
    - Replacement requests
    - _Requirements: 11.4_

  - [ ] 12.2.PT Write property test for client portal monitoring accuracy
    - **Property 26: Client Portal Monitoring Accuracy**
    - **Validates: Requirements 11.4**
    - Test that client portal accurately displays site monitoring data, attendance records, and deployment status

**Phase 6 – Platform Security & API**
- [ ] 13. API Platform
  - [ ] 13.1 API Standardization
    - Standard response format
    - Error handling
    - Validation
    - API versioning
    - _Requirements: 15.1_

  - [ ] 13.1.PT Write property test for API response format consistency
    - **Property 27: API Response Format Consistency**
    - **Validates: Requirements 15.1**
    - Test that all API endpoints conform to standardized response format and error handling patterns

  - [ ] 13.2 Write property test for API response consistency
    - **Property 13: API Response Consistency**
    - **Validates: Requirements 15.1**
    - Test that API responses conform to specifications across all endpoints

  - [ ] 13.3 Security
    - Rate limiting
    - Helmet
    - CORS
    - Audit logging
    - Request logging
    - Encryption
    - Secure uploads
    - _Requirements: 14.2, 15.4_

  - [ ] 13.3.PT Write property test for security middleware effectiveness
    - **Property 28: Security Middleware Effectiveness**
    - **Validates: Requirements 14.2, 15.4**
    - Test that security middleware (rate limiting, CORS, encryption) properly protects all endpoints

  - [ ] 13.4 API Documentation
    - Swagger/OpenAPI
    - Integration guide
    - Authentication guide
    - _Requirements: 15.1_

**Phase 7 – Quality Assurance**
- [ ] 14. Testing
  - [ ] 14.1 Unit Tests
    - Payroll
    - Attendance
    - Assignment
    - Billing
    - _Requirements: 8.1, 5.1_

  - [ ] 14.1.PT Write property test for unit test coverage completeness
    - **Property 29: Unit Test Coverage Completeness**
    - **Validates: Requirements 8.1, 5.1**
    - Test that unit tests provide comprehensive coverage of payroll, attendance, assignment, and billing logic

  - [ ] 14.2 Integration Tests
    - Authentication
    - Multi-tenancy
    - API contracts
    - _Requirements: 1.1, 14.1, 15.1_

  - [ ] 14.2.PT Write property test for integration test scenario coverage
    - **Property 30: Integration Test Scenario Coverage**
    - **Validates: Requirements 1.1, 14.1, 15.1**
    - Test that integration tests validate all critical authentication, multi-tenancy, and API contract scenarios

  - [ ] 14.3 Property-Based Tests
    - Payroll correctness
    - Assignment correctness
    - Financial calculations
    - _Requirements: All properties validation_

**Phase 8 – Mobile Workforce Platform**
- [ ] 15. Mobile Application
  - [ ] 15.1 Mobile Application
    - GPS Attendance
    - Shift Schedule
    - Leave
    - Notifications
    - Incident Reporting
    - Employee Profile
    - Offline support (future)
    - _Requirements: 11.3_

**Phase 9 – Intelligence & Enterprise Features**
- [ ] 16. Analytics & Business Intelligence
  - [ ] 16.1 Analytics & Business Intelligence
    - Workforce Analytics
    - Attendance Analytics
    - Payroll Analytics
    - Site Performance
    - Client Profitability
    - Predictive Workforce Planning
    - _Requirements: 11.1_

- [ ] 17. Enterprise Integrations
  - [ ] 17.1 Enterprise Integrations
    - Biometric Devices
    - SMS
    - Email
    - Payment Gateway
    - AWS S3
    - Accounting Software
    - _Requirements: 12.1, 13.1_

- [ ] 18. Performance Optimization
  - [ ] 18.1 Performance Optimization
    - Redis Caching
    - BullMQ Optimization
    - Database Optimization
    - Lazy Loading
    - CDN
    - Monitoring
    - _Requirements: 15.3_

**Phase 10 – Production Readiness**
- [ ] 19. Final Validation
  - [ ] 19.1 Final Validation
    - End-to-end workflow testing
    - Security audit
    - Performance testing
    - Accessibility testing
    - Cross-browser testing
    - Production deployment validation
    - Backup & disaster recovery verification
    - User acceptance testing
    - _Requirements: 14.2, 14.3, 14.4_

- [ ] 20. Security and Compliance Implementation
  - [ ] 20.1 Implement audit logging system
    - Create audit trail for all data modifications and access patterns
    - Build comprehensive logging with user context and tenant information
    - Implement security event detection and alerting
    - _Requirements: 1.5, 14.3_

  - [ ] 20.2 Build data encryption and protection measures
    - Implement encryption for sensitive data at rest and in transit
    - Add input sanitization and SQL injection protection
    - Build secure file upload handling with virus scanning
    - _Requirements: 14.2_

  - [ ] 20.3 Create compliance reporting and document management
    - Implement employee certification and license tracking
    - Build compliance violation detection and alerting system
    - Create regulatory reporting capabilities with audit trails
    - _Requirements: 10.1, 10.3_

- [ ] 21. Final Checkpoint and System Validation
  - Ensure all tests pass, verify end-to-end workflows function correctly, validate security measures are working, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional property-based tests and can be skipped for faster MVP delivery
- Each task references specific requirements from the requirements document for traceability
- Property tests validate universal correctness properties defined in the design document  
- Checkpoints ensure incremental validation and provide opportunities for user feedback
- The implementation follows Phase 1 scope focusing on foundation without over-engineering
- Multi-tenant architecture with PostgreSQL RLS ensures enterprise-grade data isolation
- TypeScript is used consistently across frontend and backend for type safety
- All external integrations (banking, notifications) are designed with mock implementations for Phase 1

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "1.3"] },
    { "id": 1, "tasks": ["1.4", "2.1"] },
    { "id": 2, "tasks": ["2.2", "2.4"] },
    { "id": 3, "tasks": ["2.3", "2.5", "3.1"] },
    { "id": 4, "tasks": ["2.6", "3.2", "3.4"] },
    { "id": 5, "tasks": ["3.3", "3.5", "5.1"] },
    { "id": 6, "tasks": ["5.2", "5.3", "5.5"] },
    { "id": 7, "tasks": ["5.4", "5.6", "5.7"] },
    { "id": 8, "tasks": ["5.8", "6.1"] },
    { "id": 9, "tasks": ["6.2", "6.4"] },
    { "id": 10, "tasks": ["6.3", "7.1"] },
    { "id": 11, "tasks": ["7.2", "7.3"] },
    { "id": 12, "tasks": ["7.4", "7.5"] },
    { "id": 13, "tasks": ["8.1"] },
    { "id": 14, "tasks": ["8.1.PT", "8.2"] },
    { "id": 15, "tasks": ["8.2.PT", "8.3"] },
    { "id": 16, "tasks": ["8.3.PT", "9.1"] },
    { "id": 17, "tasks": ["9.1.PT", "9.2"] },
    { "id": 18, "tasks": ["9.2.PT", "9.3"] },
    { "id": 19, "tasks": ["9.3.PT", "10.1"] },
    { "id": 20, "tasks": ["10.1.PT", "10.2"] },
    { "id": 21, "tasks": ["10.2.PT", "11.1"] },
    { "id": 22, "tasks": ["11.1.PT", "11.2"] },
    { "id": 23, "tasks": ["11.2.PT", "11.3"] },
    { "id": 24, "tasks": ["11.3.PT", "12.1"] },
    { "id": 25, "tasks": ["12.1.PT", "12.2"] },
    { "id": 26, "tasks": ["12.2.PT", "13.1"] },
    { "id": 27, "tasks": ["13.1.PT", "13.2"] },
    { "id": 28, "tasks": ["13.3"] },
    { "id": 29, "tasks": ["13.3.PT", "13.4"] },
    { "id": 30, "tasks": ["14.1"] },
    { "id": 31, "tasks": ["14.1.PT", "14.2"] },
    { "id": 32, "tasks": ["14.2.PT", "14.3"] },
    { "id": 33, "tasks": ["15.1"] },
    { "id": 34, "tasks": ["16.1", "17.1", "18.1"] },
    { "id": 35, "tasks": ["19.1"] },
    { "id": 36, "tasks": ["20.1", "20.2"] },
    { "id": 37, "tasks": ["20.3"] }
  ]
}
```