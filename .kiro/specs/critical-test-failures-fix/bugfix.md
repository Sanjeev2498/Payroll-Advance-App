# Bugfix Requirements Document

## Introduction

The payroll system has 10 critical test failures that prevent proper development and deployment. These failures block the `npm test` command from passing and hinder the development workflow. The issues span across database schema mismatches, dependency injection problems, service integration issues, and data structure inconsistencies between tests and the actual schema.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN running `npm test` with database schema operations THEN the system fails with "employees.contact_info does not exist" error due to column name mismatch

1.2 WHEN executing billing integration tests THEN the system fails due to wrong field mapping in contract creation setup

1.3 WHEN running tests that require PrismaService THEN the system fails with "Cannot read properties of undefined (reading 'findFirst')" because `this.prisma` is undefined

1.4 WHEN contract tests attempt to resolve ConfigService dependencies THEN the system fails because EncryptionUtil cannot resolve ConfigService

1.5 WHEN sites service tests call tenant context methods THEN the system fails with "`this.tenantContext.hasContext` is not a function" error

1.6 WHEN invoice calculation service generates invoice numbers THEN the system fails because generateInvoiceNumber expects clientId but should use contractId per new schema

1.7 WHEN billing tests create test data structures THEN the system fails due to incorrect data structure for new Client -> Contract -> Site relationship

1.8 WHEN employee creation tests run THEN the system fails due to inconsistent field names between tests and schema

1.9 WHEN SupervisorPortalController is instantiated in tests THEN the system fails with "metatype is not a constructor" error

1.10 WHEN property tests attempt to use Prisma mocking THEN the system fails because service is not properly injected in property tests

### Expected Behavior (Correct)

2.1 WHEN running `npm test` with database schema operations THEN the system SHALL use correct column name `contactInfo` instead of `contact_info`

2.2 WHEN executing billing integration tests THEN the system SHALL use correct field mapping matching the current contract creation schema

2.3 WHEN running tests that require PrismaService THEN the system SHALL properly inject PrismaService so `this.prisma` is defined and accessible

2.4 WHEN contract tests attempt to resolve ConfigService dependencies THEN the system SHALL successfully resolve ConfigService for EncryptionUtil

2.5 WHEN sites service tests call tenant context methods THEN the system SHALL have properly mocked `this.tenantContext.hasContext` function available

2.6 WHEN invoice calculation service generates invoice numbers THEN the system SHALL use contractId parameter instead of clientId to match new schema

2.7 WHEN billing tests create test data structures THEN the system SHALL use correct data structure matching Client -> Contract -> Site relationship

2.8 WHEN employee creation tests run THEN the system SHALL use consistent field names that match the actual schema

2.9 WHEN SupervisorPortalController is instantiated in tests THEN the system SHALL properly construct the controller without metatype errors

2.10 WHEN property tests attempt to use Prisma mocking THEN the system SHALL properly inject the service for property tests

### Unchanged Behavior (Regression Prevention)

3.1 WHEN running tests for modules not affected by these fixes THEN the system SHALL CONTINUE TO pass those tests without modification

3.2 WHEN executing production code outside of test environment THEN the system SHALL CONTINUE TO function normally without any behavioral changes

3.3 WHEN using database operations with correct column names in existing code THEN the system SHALL CONTINUE TO work as expected

3.4 WHEN properly configured services and dependencies are used THEN the system SHALL CONTINUE TO resolve and inject them correctly

3.5 WHEN valid data structures and field names are used in existing functionality THEN the system SHALL CONTINUE TO process them correctly