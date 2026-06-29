# Design Document

## Overview

The Security Workforce & Payroll Management System is an enterprise SaaS platform designed to streamline workforce operations for security guard agencies, facility management companies, and staffing agencies. This system provides comprehensive workforce lifecycle management from client acquisition through payroll processing, with specialized focus on operational visibility and data-driven decision making.

### Key Design Principles

- **Multi-tenant Architecture**: Complete data isolation using PostgreSQL Row-Level Security (RLS)
- **Clean Architecture**: Separation of concerns with domain-driven design patterns
- **Progressive Enhancement**: Phase-by-phase development approach avoiding over-engineering
- **Scalability First**: Built to handle enterprise-scale operations from day one
- **Mobile-First Operations**: Real-time workforce management through mobile applications
- **API-First Design**: Comprehensive REST API supporting third-party integrations

### Core Value Proposition

The platform transforms workforce operations by providing:
- **Operations Visibility**: Real-time dashboards showing site status, workforce deployment, and performance metrics
- **Workforce Monitoring**: Live attendance tracking, staffing gap identification, and site health monitoring
- **Payroll Insights**: Automated salary processing with detailed analytics and compliance reporting
- **Actionable Intelligence**: Predictive analytics for workforce demand forecasting and capacity planning

## Architecture

### System Architecture Overview

```mermaid
graph TB
    subgraph "Frontend Layer"
        WEB[Web Application<br/>Next.js + TypeScript]
        MOBILE[Mobile App<br/>React Native]
    end
    
    subgraph "API Gateway Layer"
        GATEWAY[API Gateway<br/>NestJS Router]
        AUTH[Authentication<br/>JWT + MFA]
        RATE[Rate Limiting<br/>Redis]
    end
    
    subgraph "Application Layer"
        CORE[Core Services<br/>NestJS Modules]
        PAYROLL[Payroll Engine<br/>Domain Service]
        NOTIFICATION[Notification Service<br/>Multi-channel]
        REPORTING[Analytics Engine<br/>Data Aggregation]
    end
    
    subgraph "Data Layer"
        DB[(PostgreSQL<br/>Multi-tenant RLS)]
        REDIS[(Redis<br/>Cache + Sessions)]
        FILES[File Storage<br/>Local → S3]
    end
    
    subgraph "Integration Layer"
        WEBHOOK[Webhook Engine<br/>Event Broadcasting]
        BANKING[Banking APIs<br/>Payment Processing]
        EXTERNAL[External Systems<br/>HR/Accounting]
    end
    
    WEB --> GATEWAY
    MOBILE --> GATEWAY
    GATEWAY --> AUTH
    GATEWAY --> RATE
    GATEWAY --> CORE
    CORE --> PAYROLL
    CORE --> NOTIFICATION
    CORE --> REPORTING
    CORE --> DB
    CORE --> REDIS
    CORE --> FILES
    CORE --> WEBHOOK
    PAYROLL --> BANKING
    WEBHOOK --> EXTERNAL
```

### Multi-Tenant Architecture Design

ents a **Row-Level Security (RLS)** approach for multi-tenancy, providing optimal balance between data The system implemisolation, operational efficiency, and cost-effectiveness.

**Tenant Isolation Strategy**:
- Single PostgreSQL database with RLS policies enforcing data isolation
- `tenant_id` column on all tenant-specific tables with automatic policy enforcement
- Application-level tenant context injection for all database operations
- Shared infrastructure with logical separation (cost-effective for enterprise SaaS)

**Security Context Flow**:
1. User authenticates with tenant-specific credentials
2. JWT token includes tenant_id and role information
3. Database connection established with tenant context
4. RLS policies automatically filter all queries by tenant_id
5. Application logic operates within tenant boundary

### Technology Stack

**Frontend Architecture**:
- **Framework**: Next.js 14+ with App Router for SSR/SSG capabilities
- **Language**: TypeScript for type safety and developer experience
- **Styling**: Tailwind CSS for consistent design system
- **State Management**: Zustand for client-side state with persistence
- **Data Fetching**: TanStack Query (React Query) for server state management
- **Forms**: React Hook Form with Zod schema validation
- **UI Components**: Custom component library built on Radix UI primitives

**Backend Architecture**:
- **Framework**: NestJS for enterprise-grade Node.js backend
- **Language**: TypeScript for consistency across the stack
- **Database**: PostgreSQL 14+ with advanced features (RLS, JSONB, Full-text search)
- **ORM**: Prisma for type-safe database access and schema management
- **Caching**: Redis for session storage, rate limiting, and application cache
- **Authentication**: JWT with refresh tokens and multi-factor authentication
- **File Storage**: Local filesystem (Phase 1) → AWS S3 (Future phases)

**Infrastructure Components**:
- **Message Queue**: BullMQ (Redis-based) for background job processing
- **Monitoring**: Application-level logging with structured output
- **Security**: Helmet.js, CORS, input validation, and audit logging
- **API Documentation**: OpenAPI/Swagger with automated generation

## Components and Interfaces

### Core Domain Models

The system is organized around key business entities that reflect real-world workforce operations:

**Primary Entities**:
- **Company**: Multi-tenant root entity with configuration and branding
- **Client**: External organizations hiring workforce services
- **Site**: Physical locations where workforce is deployed
- **Employee**: Workers employed by the company
- **Assignment**: Employee-to-Site relationship with roles and schedules
- **Shift**: Specific work periods with defined start/end times
- **Attendance**: Real-time tracking of employee presence
- **PayrollRun**: Batch salary processing for specific periods
- **Invoice**: Client billing based on workforce deployment

### Module Architecture

```mermaid
graph LR
    subgraph "Core Modules"
        TENANT[Tenant Management]
        AUTH[Authentication]
        USER[User Management]
    end
    
    subgraph "Business Modules"
        CLIENT[Client Management]
        SITE[Site Operations]
        EMPLOYEE[Employee Lifecycle]
        ASSIGNMENT[Workforce Assignment]
        SCHEDULE[Shift Scheduling]
        ATTENDANCE[Attendance Tracking]
    end
    
    subgraph "Financial Modules"
        PAYROLL[Payroll Processing]
        BILLING[Client Billing]
        INVOICE[Invoice Generation]
    end
    
    subgraph "Supporting Modules"
        NOTIFICATION[Notification Service]
        REPORTING[Analytics & Reports]
        COMPLIANCE[Regulatory Compliance]
        INTEGRATION[API Integration]
    end
    
    TENANT --> CLIENT
    TENANT --> EMPLOYEE
    CLIENT --> SITE
    SITE --> ASSIGNMENT
    EMPLOYEE --> ASSIGNMENT
    ASSIGNMENT --> SCHEDULE
    SCHEDULE --> ATTENDANCE
    ATTENDANCE --> PAYROLL
    PAYROLL --> BILLING
    BILLING --> INVOICE
```

### API Design Patterns

**RESTful Resource Design**:
- Consistent URL structure: `/api/v1/{resource}/{id}`
- HTTP verbs mapping to CRUD operations
- Standardized response formats with metadata
- Error responses following RFC 7807 Problem Details

**Authentication & Authorization**:
- Bearer token authentication with JWT
- Role-based access control (RBAC) with granular permissions
- Tenant context automatically injected into all requests
- API key authentication for system integrations

**Example API Endpoints**:

```typescript
// Client Management
GET    /api/v1/clients                 // List clients (paginated)
POST   /api/v1/clients                 // Create client
GET    /api/v1/clients/{id}            // Get client details
PUT    /api/v1/clients/{id}            // Update client
DELETE /api/v1/clients/{id}            // Soft delete client

// Site Operations
GET    /api/v1/sites                   // List sites with filtering
POST   /api/v1/sites                   // Create site
GET    /api/v1/sites/{id}/assignments  // Get site assignments
PUT    /api/v1/sites/{id}/status       // Update site status

// Workforce Management
GET    /api/v1/employees               // List employees (searchable)
POST   /api/v1/employees               // Add employee
GET    /api/v1/employees/{id}/schedule // Employee schedule
POST   /api/v1/assignments             // Create assignment

// Attendance & Payroll
POST   /api/v1/attendance/clock-in     // Clock in employee
POST   /api/v1/attendance/clock-out    // Clock out employee
GET    /api/v1/payroll/runs            // List payroll runs
POST   /api/v1/payroll/runs            // Initialize payroll run
```

**Response Format Standards**:

```typescript
// Success Response
{
  "success": true,
  "data": { /* response payload */ },
  "metadata": {
    "timestamp": "2024-01-15T10:30:00Z",
    "requestId": "req_123456",
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "hasNext": true
    }
  }
}

// Error Response
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format"
      }
    ]
  },
  "metadata": {
    "timestamp": "2024-01-15T10:30:00Z",
    "requestId": "req_123456"
  }
}
```

## Data Models

### Database Schema Design

The database schema implements a multi-tenant architecture with comprehensive workforce management capabilities. Content was rephrased for compliance with licensing restrictions.

```mermaid
erDiagram
    Company ||--o{ Client : "manages"
    Company ||--o{ Employee : "employs"
    Company ||--o{ User : "has"
    
    Client ||--o{ Site : "owns"
    Client ||--o{ Invoice : "receives"
    
    Site ||--o{ Assignment : "hosts"
    Site ||--o{ Shift : "schedules"
    
    Employee ||--o{ Assignment : "assigned_to"
    Employee ||--o{ Attendance : "records"
    Employee ||--o{ PayrollItem : "earns"
    
    Assignment ||--o{ Shift : "includes"
    Shift ||--o{ Attendance : "tracks"
    
    PayrollRun ||--o{ PayrollItem : "contains"
    
    Company {
        uuid id PK
        string name
        string slug
        jsonb settings
        jsonb branding
        timestamp created_at
        timestamp updated_at
    }
    
    Client {
        uuid id PK
        uuid company_id FK
        string name
        string contact_email
        jsonb contact_info
        string contract_status
        timestamp contract_start
        timestamp contract_end
        jsonb billing_preferences
        timestamp created_at
        timestamp updated_at
    }
    
    Site {
        uuid id PK
        uuid client_id FK
        string name
        jsonb address
        jsonb access_requirements
        jsonb safety_protocols
        string operational_status
        jsonb contact_info
        timestamp created_at
        timestamp updated_at
    }
    
    Employee {
        uuid id PK
        uuid company_id FK
        string employee_number
        string first_name
        string last_name
        string email
        string phone
        jsonb address
        jsonb certifications
        jsonb skills
        string employment_status
        timestamp hire_date
        timestamp created_at
        timestamp updated_at
    }
    
    Assignment {
        uuid id PK
        uuid employee_id FK
        uuid site_id FK
        string role
        jsonb responsibilities
        decimal hourly_rate
        string status
        timestamp start_date
        timestamp end_date
        timestamp created_at
        timestamp updated_at
    }
    
    Shift {
        uuid id PK
        uuid assignment_id FK
        uuid site_id FK
        date shift_date
        time start_time
        time end_time
        string shift_type
        string status
        jsonb notes
        timestamp created_at
        timestamp updated_at
    }
    
    Attendance {
        uuid id PK
        uuid employee_id FK
        uuid shift_id FK
        timestamp clock_in
        timestamp clock_out
        jsonb location_data
        string status
        jsonb verification_data
        timestamp created_at
        timestamp updated_at
    }
    
    PayrollRun {
        uuid id PK
        uuid company_id FK
        string run_number
        date pay_period_start
        date pay_period_end
        string status
        decimal total_amount
        timestamp processed_at
        timestamp created_at
        timestamp updated_at
    }
    
    PayrollItem {
        uuid id PK
        uuid payroll_run_id FK
        uuid employee_id FK
        string item_type
        string description
        decimal amount
        jsonb calculation_data
        timestamp created_at
        timestamp updated_at
    }
    
    Invoice {
        uuid id PK
        uuid client_id FK
        string invoice_number
        date billing_period_start
        date billing_period_end
        decimal subtotal
        decimal tax_amount
        decimal total_amount
        string status
        timestamp due_date
        timestamp created_at
        timestamp updated_at
    }
```

### Multi-Tenant RLS Implementation

Row-Level Security policies enforce data isolation at the database level:

```sql
-- Enable RLS on tenant-specific tables
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE sites ENABLE ROW LEVEL SECURITY;
-- ... additional tables

-- Create RLS policies
CREATE POLICY client_tenant_isolation ON clients
    USING (company_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY employee_tenant_isolation ON employees  
    USING (company_id = current_setting('app.tenant_id')::uuid);

-- Site access through client relationship
CREATE POLICY site_tenant_isolation ON sites
    USING (EXISTS (
        SELECT 1 FROM clients 
        WHERE clients.id = sites.client_id 
        AND clients.company_id = current_setting('app.tenant_id')::uuid
    ));
```

### Data Access Patterns

**Repository Pattern Implementation**:
```typescript
// Base repository with tenant context
abstract class TenantAwareRepository<T> {
  constructor(
    protected prisma: PrismaService,
    protected tenantContext: TenantContextService
  ) {}

  protected getTenantFilter() {
    return {
      company_id: this.tenantContext.getTenantId()
    };
  }

  async findMany(filter: any = {}): Promise<T[]> {
    return this.prisma.model.findMany({
      where: { ...filter, ...this.getTenantFilter() }
    });
  }
}

// Domain-specific repository
@Injectable()
export class EmployeeRepository extends TenantAwareRepository<Employee> {
  async findBySkills(skills: string[]): Promise<Employee[]> {
    return this.prisma.employee.findMany({
      where: {
        ...this.getTenantFilter(),
        skills: {
          hasAll: skills
        }
      }
    });
  }
}
```

### Performance Optimization Strategies

**Database Indexing Strategy**:
```sql
-- Tenant-aware composite indexes
CREATE INDEX idx_employees_tenant_status ON employees(company_id, employment_status);
CREATE INDEX idx_assignments_tenant_site ON assignments(company_id, site_id);
CREATE INDEX idx_attendance_tenant_date ON attendance(company_id, clock_in::date);

-- Full-text search indexes
CREATE INDEX idx_employees_search ON employees USING gin(to_tsvector('english', first_name || ' ' || last_name));
CREATE INDEX idx_sites_search ON sites USING gin(to_tsvector('english', name));
```

**Query Optimization Patterns**:
- Use of materialized views for complex analytics queries
- Proper use of JSONB indexes for flexible schema fields
- Connection pooling with appropriate timeout settings
- Read replicas for reporting queries (future enhancement)

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

Based on the prework analysis, the following properties can be effectively tested using property-based testing:

### Property 1: Multi-tenant Data Isolation

*For any* database operation within a tenant context, the system SHALL never return data belonging to a different tenant, regardless of the complexity of the query or data relationships.

**Validates: Requirements 1.1**

### Property 2: Company Registration Completeness

*For any* valid company registration request, the system SHALL create a complete isolated workspace with all required default configurations and no missing essential components.

**Validates: Requirements 1.2**

### Property 3: Role-Based Access Enforcement

*For any* user with a specific role attempting to access a protected resource, the system SHALL consistently enforce access control rules according to the user's permissions across all API endpoints and data operations.

**Validates: Requirements 1.3**

### Property 4: Client Data Capture Completeness

*For any* client onboarding request with valid data, the system SHALL successfully capture and store all required client details, contract terms, and billing preferences without data loss or corruption.

**Validates: Requirements 2.1**

### Property 5: Site Information Preservation

*For any* site creation request, the system SHALL accurately capture and maintain all location details, access requirements, and operational specifications in a retrievable format.

**Validates: Requirements 3.1**

### Property 6: Employee Data Integrity

*For any* employee hiring process, the system SHALL comprehensively capture personal details, qualifications, certifications, and documentation while maintaining data consistency and validation rules.

**Validates: Requirements 4.1**

### Property 7: Assignment Skill Matching

*For any* assignment creation request, the system SHALL correctly match employee skills with site requirements according to defined matching criteria, rejecting assignments that don't meet minimum requirements.

**Validates: Requirements 5.1**

### Property 8: Scheduling Conflict Prevention

*For any* assignment or schedule modification, the system SHALL detect and prevent scheduling conflicts while ensuring employee availability validation before confirming assignments.

**Validates: Requirements 5.2**

### Property 9: Attendance Recording Accuracy

*For any* employee clock-in/out event, the system SHALL record complete attendance data including accurate timestamps, location verification, and all required metadata without data corruption.

**Validates: Requirements 7.1**

### Property 10: Payroll Calculation Correctness

*For any* payroll run initiation with attendance data and rate information, the system SHALL produce mathematically accurate salary calculations that properly account for all attendance records, rates, and applicable policies.

**Validates: Requirements 8.1**

### Property 11: Complex Payroll Component Accuracy

*For any* payroll calculation involving multiple compensation components (overtime, bonuses, deductions, taxes), the system SHALL compute each component correctly and maintain mathematical consistency in the final total.

**Validates: Requirements 8.2**

### Property 12: Invoice Calculation Precision

*For any* invoice generation based on site deployment and hours worked, the system SHALL calculate charges that accurately reflect deployment evidence, hours worked, and contract rates without mathematical errors.

**Validates: Requirements 9.1**

### Property 13: API Response Consistency

*For any* valid API request to core system functionality, the system SHALL return properly formatted responses that conform to API specifications and handle edge cases gracefully.

**Validates: Requirements 15.1**

## Error Handling

### Error Classification Strategy

The system implements a comprehensive error handling strategy that categorizes errors into distinct types for appropriate response and recovery:

**Validation Errors**:
- Input validation failures at API boundaries
- Business rule violations (e.g., scheduling conflicts, skill mismatches)
- Data constraint violations (e.g., duplicate employee numbers, invalid dates)

**Authorization Errors**:
- Authentication failures (invalid credentials, expired tokens)
- Permission denied for role-based access control
- Tenant boundary violations (data isolation breaches)

**Business Logic Errors**:
- Domain rule violations (e.g., payroll calculation errors)
- State transition errors (e.g., invalid status changes)
- Workflow constraint violations (e.g., closing shifts with active assignments)

**Integration Errors**:
- External API failures (banking, notification services)
- Database connectivity issues
- File storage operation failures

**System Errors**:
- Unexpected runtime exceptions
- Infrastructure failures (database timeouts, memory issues)
- Configuration or deployment problems

### Error Response Architecture

```typescript
// Standardized error response structure
interface ErrorResponse {
  success: false;
  error: {
    code: string;           // Machine-readable error code
    message: string;        // Human-readable error message
    details?: ErrorDetail[];// Field-specific error details
    traceId: string;       // Request correlation ID
    timestamp: string;     // ISO 8601 timestamp
  };
  metadata: {
    requestId: string;
    endpoint: string;
    userContext?: {
      userId: string;
      tenantId: string;
      role: string;
    };
  };
}

interface ErrorDetail {
  field: string;          // Field name causing the error
  message: string;        // Field-specific error message
  code: string;          // Field-specific error code
  value?: any;           // Invalid value that caused the error
}
```

### Error Recovery Patterns

**Transactional Integrity**:
- Database operations wrapped in transactions with proper rollback
- Saga pattern for distributed transactions across multiple services
- Idempotent operations to handle retry scenarios safely

**Graceful Degradation**:
- Fallback mechanisms for non-critical features during partial failures
- Read-only mode when write operations fail
- Cached data serving during temporary database unavailability

**Circuit Breaker Implementation**:
```typescript
@Injectable()
export class CircuitBreakerService {
  private circuits = new Map<string, CircuitState>();
  
  async executeWithCircuitBreaker<T>(
    key: string,
    operation: () => Promise<T>,
    fallback: () => Promise<T>
  ): Promise<T> {
    const circuit = this.circuits.get(key) ?? this.createCircuit();
    
    if (circuit.state === 'OPEN') {
      if (this.shouldAttemptReset(circuit)) {
        circuit.state = 'HALF_OPEN';
      } else {
        return fallback();
      }
    }
    
    try {
      const result = await operation();
      this.recordSuccess(circuit);
      return result;
    } catch (error) {
      this.recordFailure(circuit);
      if (circuit.state === 'OPEN') {
        return fallback();
      }
      throw error;
    }
  }
}
```

### Monitoring and Alerting

**Error Tracking Integration**:
- Structured logging with correlation IDs for request tracing
- Error aggregation and alerting for critical system failures
- Performance monitoring with error rate thresholds

**Audit Trail Requirements**:
- All errors logged with full context (user, tenant, operation)
- Security-related errors trigger immediate alerts
- Compliance violations recorded for regulatory reporting

## Testing Strategy

### Comprehensive Testing Approach

The testing strategy employs multiple complementary approaches to ensure system reliability and correctness:

**Property-Based Testing (Primary)**:
- Minimum 100 iterations per property test for statistical significance
- Focus on universal properties that must hold across all valid inputs
- Automated test data generation covering edge cases and boundary conditions
- Each property test directly references corresponding design document property

**Unit Testing (Supporting)**:
- Specific examples demonstrating correct behavior for documented use cases
- Edge case validation for boundary conditions and error scenarios
- Mock-based testing for external service integrations
- Focus on business logic validation and domain rule enforcement

**Integration Testing (Validation)**:
- End-to-end workflow testing across multiple system components
- Database integration testing with real PostgreSQL instances
- API contract testing ensuring consistent request/response formats
- Multi-tenant isolation verification in realistic scenarios

### Property-Based Testing Implementation

**Testing Framework**: Using [fast-check](https://github.com/dubzzz/fast-check) for TypeScript-based property testing

**Test Configuration**:
```typescript
// Property test configuration
const PROPERTY_TEST_CONFIG = {
  numRuns: 100,           // Minimum iterations per property
  timeout: 5000,          // 5 second timeout per test
  seed: 42,               // Reproducible test runs
  path: "0:0:0",         // Specific test path for debugging
  logger: (log) => console.log(log)
};

// Example property test structure
describe('Multi-tenant Data Isolation', () => {
  it('Property 1: Tenant data isolation', async () => {
    await fc.assert(fc.asyncProperty(
      tenantGenerator(),
      dataGenerator(),
      async (tenant1, tenant2, testData) => {
        // Feature: security-workforce-payroll-system, Property 1: Multi-tenant data isolation
        
        // Setup: Create data for both tenants
        await setupTenantData(tenant1, testData);
        await setupTenantData(tenant2, testData);
        
        // Test: Query as tenant1 should never return tenant2 data
        const tenant1Results = await queryWithTenant(tenant1.id, testData.query);
        const tenant2Results = await queryWithTenant(tenant2.id, testData.query);
        
        // Verify: No data overlap between tenants
        const tenant1Ids = tenant1Results.map(r => r.id);
        const tenant2Ids = tenant2Results.map(r => r.id);
        
        expect(intersection(tenant1Ids, tenant2Ids)).toEqual([]);
      }
    ), PROPERTY_TEST_CONFIG);
  });
});
```

**Data Generation Strategy**:
```typescript
// Custom generators for domain entities
const tenantGenerator = () => fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 100 }),
  slug: fc.string({ minLength: 1, maxLength: 50 }).map(s => s.toLowerCase()),
  settings: fc.object()
});

const employeeGenerator = () => fc.record({
  id: fc.uuid(),
  employeeNumber: fc.string({ minLength: 1, maxLength: 20 }),
  firstName: fc.string({ minLength: 1, maxLength: 50 }),
  lastName: fc.string({ minLength: 1, maxLength: 50 }),
  skills: fc.array(fc.string(), { minLength: 0, maxLength: 10 }),
  hourlyRate: fc.float({ min: 15.0, max: 100.0 })
});

const payrollDataGenerator = () => fc.record({
  attendanceRecords: fc.array(attendanceGenerator(), { minLength: 1, maxLength: 50 }),
  rates: fc.record({
    regular: fc.float({ min: 15.0, max: 50.0 }),
    overtime: fc.float({ min: 22.5, max: 75.0 })
  }),
  policies: fc.record({
    overtimeThreshold: fc.integer({ min: 8, max: 12 }),
    taxRate: fc.float({ min: 0.1, max: 0.4 })
  })
});
```

### Test Data Management

**Database Testing Strategy**:
- Isolated test database per test suite execution
- Transaction-based test isolation with automatic rollback
- Seed data generation for consistent test environments
- Performance testing with realistic data volumes

**Continuous Integration Requirements**:
- All property tests must pass before deployment
- Test coverage reporting with minimum 80% coverage requirement
- Performance regression detection through benchmark comparison
- Security vulnerability scanning in CI/CD pipeline

### Mock and Stub Strategy

**External Service Mocking**:
```typescript
// Banking integration mock
@Injectable()
export class MockBankingService implements BankingService {
  async processPayment(request: PaymentRequest): Promise<PaymentResponse> {
    // Simulate various response scenarios for property testing
    if (request.amount <= 0) {
      throw new ValidationError('Invalid payment amount');
    }
    
    if (request.accountNumber.startsWith('FAIL')) {
      throw new PaymentError('Payment processing failed');
    }
    
    return {
      transactionId: generateMockTransactionId(),
      status: 'PROCESSED',
      processedAt: new Date(),
      confirmationCode: generateMockConfirmation()
    };
  }
}
```

**Property Test Integration**:
- Mock services configured to generate realistic response variations
- Error injection for testing error handling properties
- Performance characteristics simulation for load testing properties

<function_calls>
<invoke name="prework">
<parameter name="featureName">security-workforce-payroll-system

## UI/UX Architecture Strategy

### Design System Foundation

**Modern Enterprise SaaS Patterns**:
- Clean, professional interface focusing on operational efficiency
- Data-dense dashboards with intelligent information hierarchy  
- Mobile-responsive design with touch-optimized interactions
- Consistent component library built on design tokens

**Navigation Architecture**:
```
Primary Navigation (Sidebar)
├── Dashboard (Operations Overview)
├── Workforce Management
│   ├── Employees
│   ├── Assignments  
│   ├── Scheduling
│   └── Attendance
├── Client Management
│   ├── Clients
│   ├── Sites
│   └── Contracts
├── Financial Operations
│   ├── Payroll
│   ├── Billing
│   └── Invoicing
├── Analytics & Reports
└── System Administration
```

### Operations-Focused Dashboard Design

**Real-time Operations Dashboard**:
- Site status overview with live workforce deployment
- Active alerts and notifications requiring immediate attention
- Performance metrics with trend indicators
- Quick action panels for common operations

**Component Hierarchy**:
```mermaid
graph TD
    SHELL[Application Shell]
    SHELL --> NAV[Navigation Sidebar]
    SHELL --> HEADER[Header Bar]
    SHELL --> MAIN[Main Content Area]
    
    MAIN --> DASH[Dashboard Layout]
    MAIN --> FORM[Form Layouts]
    MAIN --> TABLE[Data Tables]
    MAIN --> DETAIL[Detail Views]
    
    DASH --> CARDS[Metric Cards]
    DASH --> CHARTS[Chart Components]
    DASH --> LISTS[Activity Lists]
    DASH --> ALERTS[Alert Panels]
    
    TABLE --> FILTERS[Filter Controls]
    TABLE --> PAGINATION[Pagination]
    TABLE --> ACTIONS[Bulk Actions]
    
    FORM --> INPUTS[Form Inputs]
    FORM --> VALIDATION[Validation States]
    FORM --> WIZARDS[Multi-step Wizards]
```

### Mobile Workforce Application Design

**Employee Mobile App Structure**:
- **Home Screen**: Current assignment, schedule overview, quick actions
- **Clock In/Out**: GPS verification, photo capture, offline support
- **Schedule View**: Weekly/monthly calendar with shift details
- **Incident Reporting**: Photo upload, voice notes, supervisor notification
- **Profile Management**: Personal information, certifications, preferences

**Offline-First Architecture**:
```typescript
// Service Worker for offline functionality
interface OfflineQueueItem {
  id: string;
  type: 'CLOCK_IN' | 'CLOCK_OUT' | 'INCIDENT_REPORT';
  data: any;
  timestamp: Date;
  retryCount: number;
}

class OfflineManager {
  private queue: OfflineQueueItem[] = [];
  
  async queueOperation(operation: OfflineQueueItem): Promise<void> {
    this.queue.push(operation);
    await this.persistQueue();
    
    if (navigator.onLine) {
      await this.processQueue();
    }
  }
  
  async processQueue(): Promise<void> {
    while (this.queue.length > 0 && navigator.onLine) {
      const item = this.queue.shift()!;
      try {
        await this.syncOperation(item);
      } catch (error) {
        if (item.retryCount < 3) {
          item.retryCount++;
          this.queue.unshift(item);
          break;
        }
      }
    }
  }
}
```

### Performance and Accessibility

**Performance Requirements**:
- Initial page load under 2 seconds on 3G networks
- Client-side navigation under 200ms response time
- Optimized bundle sizes with code splitting by route
- Progressive Web App capabilities for mobile users

**Accessibility Compliance**:
- WCAG 2.1 AA compliance across all interfaces
- Keyboard navigation support for all interactive elements
- Screen reader compatibility with semantic HTML and ARIA labels
- High contrast mode support for visual accessibility

## Folder Structure & Code Organization

### Backend Architecture (NestJS)

```
src/
├── app.module.ts                 # Root application module
├── main.ts                       # Application entry point
├── common/                       # Shared utilities and decorators
│   ├── decorators/              # Custom decorators (Tenant, Roles)
│   ├── filters/                 # Exception filters
│   ├── guards/                  # Authentication and authorization guards
│   ├── interceptors/            # Request/response interceptors
│   ├── pipes/                   # Validation and transformation pipes
│   └── utils/                   # Utility functions
├── config/                      # Configuration management
│   ├── database.config.ts       # Database configuration
│   ├── auth.config.ts          # Authentication settings
│   └── app.config.ts           # Application configuration
├── core/                       # Core business modules
│   ├── tenant/                 # Multi-tenant management
│   │   ├── tenant.module.ts
│   │   ├── tenant.service.ts
│   │   ├── tenant.controller.ts
│   │   └── guards/
│   ├── auth/                   # Authentication & authorization
│   │   ├── auth.module.ts
│   │   ├── auth.service.ts
│   │   ├── auth.controller.ts
│   │   ├── strategies/         # Passport strategies
│   │   └── dto/               # Data transfer objects
│   └── user/                  # User management
├── modules/                   # Feature modules
│   ├── client/               # Client management
│   │   ├── client.module.ts
│   │   ├── client.service.ts
│   │   ├── client.controller.ts
│   │   ├── client.repository.ts
│   │   ├── entities/
│   │   ├── dto/
│   │   └── tests/
│   ├── employee/             # Employee management
│   ├── site/                # Site operations
│   ├── assignment/          # Workforce assignment
│   ├── attendance/          # Attendance tracking
│   ├── payroll/            # Payroll processing
│   │   ├── payroll.module.ts
│   │   ├── services/       # Domain services
│   │   │   ├── payroll-calculation.service.ts
│   │   │   ├── payroll-engine.service.ts
│   │   │   └── tax-calculation.service.ts
│   │   ├── controllers/
│   │   ├── repositories/
│   │   ├── entities/
│   │   ├── dto/
│   │   └── tests/
│   ├── billing/            # Client billing
│   ├── notification/       # Notification service
│   ├── analytics/         # Analytics and reporting
│   └── integration/       # Third-party integrations
├── infrastructure/        # Infrastructure concerns
│   ├── database/         # Database configuration and migrations
│   │   ├── migrations/
│   │   ├── seeds/
│   │   └── prisma/
│   ├── cache/           # Redis cache implementation
│   ├── storage/         # File storage abstraction
│   ├── queue/          # Background job processing
│   └── external/       # External service clients
├── shared/             # Shared domain logic
│   ├── entities/      # Base entities and shared models
│   ├── types/         # TypeScript type definitions
│   ├── constants/     # Application constants
│   └── interfaces/    # Shared interfaces
└── tests/             # Test utilities and global setup
    ├── fixtures/      # Test data fixtures
    ├── mocks/         # Mock implementations
    ├── setup/         # Test setup and configuration
    └── utils/         # Test utility functions
```

### Frontend Architecture (Next.js)

```
src/
├── app/                        # App Router (Next.js 13+)
│   ├── globals.css            # Global styles
│   ├── layout.tsx             # Root layout component
│   ├── page.tsx               # Home page
│   ├── (dashboard)/           # Dashboard route group
│   │   ├── layout.tsx         # Dashboard layout
│   │   ├── page.tsx           # Dashboard home
│   │   ├── clients/           # Client management pages
│   │   ├── employees/         # Employee management pages
│   │   ├── sites/             # Site management pages
│   │   ├── assignments/       # Assignment management pages
│   │   ├── attendance/        # Attendance tracking pages
│   │   ├── payroll/           # Payroll management pages
│   │   └── analytics/         # Analytics and reporting pages
│   ├── (auth)/                # Authentication route group
│   │   ├── login/
│   │   ├── register/
│   │   └── forgot-password/
│   └── api/                   # API routes (if needed for client-side logic)
├── components/                # Reusable UI components
│   ├── ui/                   # Base UI components (shadcn/ui style)
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── card.tsx
│   │   ├── table.tsx
│   │   ├── dialog.tsx
│   │   └── form.tsx
│   ├── layout/               # Layout components
│   │   ├── header.tsx
│   │   ├── sidebar.tsx
│   │   ├── navigation.tsx
│   │   └── breadcrumb.tsx
│   ├── dashboard/            # Dashboard-specific components
│   │   ├── metric-card.tsx
│   │   ├── chart-components/
│   │   ├── activity-feed.tsx
│   │   └── alert-panel.tsx
│   ├── forms/               # Form components
│   │   ├── client-form.tsx
│   │   ├── employee-form.tsx
│   │   ├── site-form.tsx
│   │   └── assignment-form.tsx
│   └── tables/              # Data table components
│       ├── data-table.tsx
│       ├── columns/         # Table column definitions
│       └── filters/         # Table filter components
├── lib/                     # Utility libraries
│   ├── api/                # API client and types
│   │   ├── client.ts       # HTTP client configuration
│   │   ├── types/          # API response types
│   │   └── endpoints/      # API endpoint definitions
│   ├── auth/               # Authentication utilities
│   ├── utils/              # General utility functions
│   ├── validations/        # Zod schema validations
│   └── constants/          # Application constants
├── hooks/                  # Custom React hooks
│   ├── use-api.ts         # API data fetching hooks
│   ├── use-tenant.ts      # Tenant context hooks
│   ├── use-auth.ts        # Authentication hooks
│   └── use-form.ts        # Form management hooks
├── store/                 # Zustand store definitions
│   ├── auth-store.ts      # Authentication state
│   ├── tenant-store.ts    # Tenant context state
│   ├── ui-store.ts        # UI state (modals, themes)
│   └── index.ts           # Store exports
├── types/                 # TypeScript type definitions
│   ├── api.ts             # API-related types
│   ├── auth.ts            # Authentication types
│   ├── tenant.ts          # Tenant-related types
│   └── global.d.ts        # Global type declarations
└── styles/                # CSS and styling files
    ├── globals.css        # Global styles
    ├── components.css     # Component-specific styles
    └── themes/            # Theme definitions
```

### Database Schema Management

```
prisma/
├── schema.prisma              # Main Prisma schema
├── migrations/                # Database migrations
│   ├── 20240101000000_init/
│   ├── 20240102000000_add_rls/
│   └── 20240103000000_add_indexes/
├── seeds/                     # Database seed files
│   ├── companies.ts
│   ├── users.ts
│   └── sample-data.ts
└── types/                     # Generated Prisma types
```

## Implementation Strategy

### Phase-by-Phase Development Approach

**Phase 1: Foundation & Core Architecture (Current)**
- Multi-tenant database setup with RLS implementation
- Basic authentication and authorization framework
- Core entity models (Company, User, Client, Employee)
- Essential CRUD operations with API endpoints
- Basic responsive web interface
- Development environment and CI/CD setup

**Phase 2: Workforce Operations**
- Site management and operational specifications
- Employee assignment and scheduling system
- Real-time attendance tracking (web-based)
- Basic reporting and dashboard views
- Notification system for critical events

**Phase 3: Payroll & Financial Operations**
- Payroll calculation engine with complex rules
- Client billing and invoice generation
- Payment processing integration
- Financial reporting and analytics
- Audit trails and compliance features

**Phase 4: Mobile & Advanced Features**
- Mobile workforce application (React Native)
- Offline functionality and data synchronization
- Advanced analytics and predictive insights
- Workflow automation and approval processes
- Enhanced integration capabilities

**Phase 5: Enterprise & Scale**
- Advanced security features (SSO, advanced MFA)
- Performance optimization for enterprise scale
- Advanced customization and white-labeling
- Machine learning for workforce optimization
- Global expansion features (multi-currency, localization)

### Development Environment Setup

**Local Development Stack**:
```bash
# Backend setup
npm install -g @nestjs/cli
nest new workforce-management-api
cd workforce-management-api
npm install prisma @prisma/client
npx prisma init

# Frontend setup
npx create-next-app@latest workforce-management-web --typescript --tailwind --eslint
cd workforce-management-web
npm install zustand @tanstack/react-query zod react-hook-form

# Database setup
docker run --name postgres-dev -e POSTGRES_PASSWORD=dev123 -p 5432:5432 -d postgres:14
docker run --name redis-dev -p 6379:6379 -d redis:latest
```

**Environment Configuration**:
```env
# Database
DATABASE_URL="postgresql://postgres:dev123@localhost:5432/workforce_dev"
REDIS_URL="redis://localhost:6379"

# Authentication
JWT_SECRET="your-super-secret-jwt-key"
JWT_EXPIRY="24h"
REFRESH_TOKEN_EXPIRY="7d"

# External Services
SMTP_HOST="smtp.example.com"
SMTP_PORT=587
SMTP_USER="your-email@example.com"
SMTP_PASS="your-email-password"

# File Storage
STORAGE_TYPE="local" # local | s3
UPLOAD_DIR="./uploads"
MAX_FILE_SIZE="10485760" # 10MB

# Application
NODE_ENV="development"
PORT=3000
API_URL="http://localhost:3000"
WEB_URL="http://localhost:3001"
```

### Data Migration Strategy

**Initial Schema Setup**:
```sql
-- Enable required PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Enable Row Level Security
CREATE OR REPLACE FUNCTION set_tenant_id(tenant_uuid uuid)
RETURNS void AS $$
BEGIN
  PERFORM set_config('app.tenant_id', tenant_uuid::text, true);
END;
$$ LANGUAGE plpgsql;
```

**Prisma Schema Example**:
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Company {
  id        String   @id @default(uuid()) @db.Uuid
  name      String   @db.VarChar(255)
  slug      String   @unique @db.VarChar(100)
  settings  Json     @default("{}")
  branding  Json     @default("{}")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
  
  // Relationships
  clients    Client[]
  employees  Employee[]
  users      User[]
  payrollRuns PayrollRun[]
  
  @@map("companies")
}

model Employee {
  id              String   @id @default(uuid()) @db.Uuid
  companyId       String   @map("company_id") @db.Uuid
  employeeNumber  String   @map("employee_number") @db.VarChar(50)
  firstName       String   @map("first_name") @db.VarChar(100)
  lastName        String   @map("last_name") @db.VarChar(100)
  email          String   @db.VarChar(255)
  phone          String?  @db.VarChar(20)
  address        Json     @default("{}")
  certifications Json     @default("[]")
  skills         String[] @default([])
  employmentStatus String @map("employment_status") @default("active")
  hireDate       DateTime @map("hire_date")
  createdAt      DateTime @default(now()) @map("created_at")
  updatedAt      DateTime @updatedAt @map("updated_at")
  
  // Relationships
  company      Company       @relation(fields: [companyId], references: [id])
  assignments  Assignment[]
  attendance   Attendance[]
  payrollItems PayrollItem[]
  
  @@unique([companyId, employeeNumber])
  @@map("employees")
}
```

### Security Implementation Guidelines

**Authentication Flow**:
```typescript
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}
  
  @Post('login')
  async login(@Body() loginDto: LoginDto): Promise<AuthResponse> {
    // 1. Validate credentials
    const user = await this.authService.validateUser(loginDto.email, loginDto.password);
    
    // 2. Generate JWT with tenant context
    const tokens = await this.authService.generateTokens(user);
    
    // 3. Log authentication event
    await this.authService.logAuthenticationEvent(user, 'LOGIN_SUCCESS');
    
    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: this.authService.sanitizeUser(user),
      tenant: user.company
    };
  }
  
  @Post('refresh')
  @UseGuards(RefreshTokenGuard)
  async refresh(@Request() req): Promise<TokenResponse> {
    return this.authService.refreshTokens(req.user);
  }
}
```

**Tenant Context Guard**:
```typescript
@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private tenantService: TenantService) {}
  
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    
    if (!user?.companyId) {
      throw new UnauthorizedException('No tenant context');
    }
    
    // Set tenant context for database queries
    await this.tenantService.setTenantContext(user.companyId);
    
    return true;
  }
}
```

### Performance Optimization Strategy

**Database Optimization**:
- Appropriate indexing strategy for multi-tenant queries
- Connection pooling configuration for high concurrency
- Query optimization with proper use of joins and subqueries
- Prepared statement caching for frequently executed queries

**Caching Strategy**:
```typescript
@Injectable()
export class CacheService {
  constructor(
    @Inject('REDIS_CLIENT') private redis: Redis,
    private tenantContext: TenantContextService
  ) {}
  
  async get<T>(key: string): Promise<T | null> {
    const tenantKey = this.getTenantKey(key);
    const cached = await this.redis.get(tenantKey);
    return cached ? JSON.parse(cached) : null;
  }
  
  async set<T>(key: string, value: T, ttl: number = 3600): Promise<void> {
    const tenantKey = this.getTenantKey(key);
    await this.redis.setex(tenantKey, ttl, JSON.stringify(value));
  }
  
  private getTenantKey(key: string): string {
    const tenantId = this.tenantContext.getTenantId();
    return `tenant:${tenantId}:${key}`;
  }
}
```

**API Response Optimization**:
- Pagination for all list endpoints with reasonable defaults
- Field selection for reducing payload sizes
- Compression for large responses
- ETags for client-side caching of unchanged resources

This comprehensive design document provides the foundation for building a scalable, secure, and maintainable Security Workforce & Payroll Management System that meets enterprise requirements while maintaining development efficiency and architectural integrity.