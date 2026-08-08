# Contract-Based Service Management

This module implements comprehensive contract management functionality for the Security Workforce & Payroll Management System, fulfilling task 11.7.4.

## Features

### Core Contract Management
- **CRUD Operations**: Full create, read, update, delete operations for contracts
- **Client Relationship Management**: Links contracts to clients with proper tenant isolation
- **Service Definitions**: Configurable guard count, shift patterns, supervisor requirements, and coverage specifications
- **Billing Configuration**: Hourly rates, overtime multipliers, holiday rates, and billing frequency settings

### Advanced Workflows
- **Contract Amendments**: Create, track, and approve contract modifications
- **Contract Renewals**: Initiate and manage contract renewal processes
- **SLA Tracking**: Monitor service level agreements and compliance metrics
- **Performance Analytics**: Track contract performance and financial metrics

### Security & Compliance
- **Multi-tenant Isolation**: Ensures contracts are isolated per company/tenant
- **Role-based Permissions**: Granular access control for contract operations
- **Audit Trails**: Complete history tracking for all contract changes
- **Data Validation**: Comprehensive validation for all contract data

## API Endpoints

### Basic Contract Operations
```
POST   /contracts                    # Create new contract
GET    /contracts                    # List contracts (paginated, filtered)
GET    /contracts/:id               # Get specific contract
PATCH  /contracts/:id               # Update contract
DELETE /contracts/:id               # Soft delete contract
```

### Amendment Management
```
POST   /contracts/:id/amendments                        # Create amendment
PATCH  /contracts/:id/amendments/:amendmentId/approve  # Approve/reject amendment
```

### Renewal Management
```
POST   /contracts/:id/renewals                        # Initiate renewal
PATCH  /contracts/:id/renewals/:renewalId/approve    # Approve/reject renewal
```

### SLA & Compliance
```
POST   /contracts/:id/sla-reports      # Create SLA compliance report
GET    /contracts/:id/sla-compliance   # Get SLA compliance data
```

### Analytics & Reporting
```
GET    /contracts/:id/performance-metrics  # Get performance metrics
GET    /contracts/:id/billing-summary      # Get billing summary
```

## Data Models

### Contract Entity
The contract entity sits between Client and Sites in the architecture:
**Company → Client → Contract → Sites → Deployments**

Key fields:
- **contractNumber**: Auto-generated unique identifier
- **serviceDefinitions**: Guard requirements and operational specifications
- **billingPreferences**: Rates, frequency, and payment terms
- **serviceLevelAgreement**: SLA metrics and compliance targets
- **contractHistory**: Amendment, renewal, and compliance tracking

### Service Definitions Structure
```json
{
  "guardCount": 3,
  "minStaffingLevel": 2,
  "maxStaffingLevel": 5,
  "shiftPatterns": {
    "day": {
      "startTime": "08:00",
      "endTime": "16:00",
      "duration": 8
    }
  },
  "supervisorRequirements": {
    "required": true,
    "ratio": 10
  },
  "coverageSpecifications": {
    "coverage24x7": true,
    "emergencyResponse": true
  }
}
```

### Billing Configuration Structure
```json
{
  "billingFrequency": "MONTHLY",
  "rates": {
    "regularHourlyRate": 25.00,
    "overtimeHourlyRate": 37.50,
    "holidayHourlyRate": 50.00
  },
  "paymentTerms": 30,
  "autoInvoiceGeneration": true
}
```

## Permissions

The module uses the following permission structure:
- `contract:create` - Create new contracts
- `contract:read` - View contract information
- `contract:update` - Modify existing contracts
- `contract:delete` - Soft delete contracts
- `contract:approve` - Approve amendments and renewals
- `contract:manage_amendments` - Create and manage amendments
- `contract:manage_renewals` - Initiate and manage renewals
- `contract:view_sla_compliance` - View SLA compliance data
- `contract:manage_sla_reports` - Create SLA reports
- `contract:view_analytics` - Access performance metrics

## Usage Examples

### Creating a Contract
```typescript
const contractDto = {
  clientId: "client-uuid",
  title: "Security Services Agreement",
  status: "ACTIVE",
  startDate: "2024-01-01",
  endDate: "2024-12-31",
  serviceDefinitions: {
    guardCount: 3,
    shiftPatterns: { /* patterns */ },
    supervisorRequirements: { /* requirements */ }
  },
  billingConfiguration: {
    billingFrequency: "MONTHLY",
    rates: { regularHourlyRate: 25.00 }
  }
};

const contract = await contractsService.create(contractDto);
```

### Creating an Amendment
```typescript
const amendmentDto = {
  type: "RATE_CHANGE",
  title: "Rate Adjustment",
  effectiveDate: "2024-07-01",
  changes: [{
    field: "billingRates.regularHourlyRate",
    previousValue: 25.00,
    newValue: 27.00,
    reason: "Market adjustment"
  }]
};

await contractsService.createAmendment(amendmentDto);
```

### SLA Compliance Tracking
```typescript
const slaReport = {
  periodStart: "2024-01-01",
  periodEnd: "2024-01-31",
  overallStatus: "COMPLIANT",
  compliancePercentage: 98.5,
  metrics: [
    {
      name: "Response Time",
      target: 15,
      actual: 12,
      unit: "minutes",
      status: "COMPLIANT"
    }
  ]
};

await contractsService.createSLAComplianceReport(slaReport);
```

## Integration with Other Modules

### Client Management
- Contracts are linked to clients with proper validation
- Client relationship management ensures data integrity

### Site Operations
- Sites are created under contracts
- Contract service definitions define site requirements

### Billing System
- Contract billing rates feed into invoice generation
- SLA compliance affects billing adjustments

### Employee Management
- Contract requirements guide employee assignments
- Skills and certifications are matched against contract needs

## Testing

The module includes comprehensive testing:
- **Unit Tests**: Service layer functionality
- **Integration Tests**: End-to-end workflow testing
- **Property-Based Tests**: Contract validation and business logic

Run tests with:
```bash
npm run test -- --testPathPatterns=contracts
```

## Architecture Compliance

This implementation fulfills all requirements for task 11.7.4:

✅ **Contract entity with service definitions**: Complete service definition structure including guard count, shift patterns, supervisor requirements, and coverage specifications

✅ **Contract CRUD operations**: Full create, read, update, delete functionality with client relationship management

✅ **SLA tracking and compliance monitoring**: Comprehensive SLA reporting and compliance metrics tracking

✅ **Billing configuration per contract**: Detailed billing rates, overtime multipliers, holiday rates, and billing frequency configuration

✅ **Contract renewal and amendment workflows**: Complete workflow management for contract modifications and renewals

✅ **Requirements compliance**: Addresses requirements 2.2 (client portfolio management), 9.1 (client billing), and 9.3 (billing models)

The module integrates seamlessly with the existing architecture while maintaining tenant isolation, proper security controls, and comprehensive audit logging.