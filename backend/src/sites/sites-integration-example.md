# Sites Module Integration Examples

This document provides examples of how to use the Sites API endpoints for common operations.

## Authentication
All endpoints require a valid JWT token with appropriate permissions:
```
Authorization: Bearer <jwt-token>
```

## API Endpoints

### 1. Create a New Site

**POST** `/api/v1/sites`

```json
{
  "clientId": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Downtown Office Building - Main Lobby",
  "address": {
    "street": "123 Main Street",
    "city": "New York",
    "state": "NY",
    "zipCode": "10001",
    "country": "United States",
    "coordinates": {
      "latitude": 40.7128,
      "longitude": -74.0060
    }
  },
  "accessRequirements": {
    "securityClearance": "Level 2",
    "requiredCertifications": ["Security Guard License", "First Aid"],
    "accessProcedures": "Use main entrance during business hours, side entrance after 6 PM",
    "workingHours": {
      "monday": { "start": "08:00", "end": "18:00", "is24Hour": false },
      "tuesday": { "start": "08:00", "end": "18:00", "is24Hour": false }
    },
    "emergencyProcedures": "Contact building security at ext. 911",
    "specialInstructions": "Check visitor logs every 2 hours"
  },
  "safetyProtocols": {
    "evacuationProcedures": "Use nearest emergency exit, assembly point in parking lot",
    "hazardMitigation": "Fire extinguishers on each floor",
    "incidentReporting": "Report to site manager and security immediately",
    "equipmentRequirements": ["Radio", "Flashlight", "First Aid Kit"],
    "trainingRequirements": ["Fire Safety", "Emergency Response"]
  },
  "operationalStatus": "ACTIVE",
  "contactInfo": {
    "primaryContact": "John Smith",
    "primaryPhone": "+1-555-0123",
    "primaryEmail": "john.smith@building.com",
    "emergencyContact": "Building Security",
    "emergencyPhone": "+1-555-0911",
    "siteManager": {
      "name": "Jane Doe",
      "phone": "+1-555-0456",
      "email": "jane.doe@building.com",
      "role": "Site Manager"
    }
  },
  "staffingRequirements": {
    "guardsPerShift": 2,
    "requiredSkills": ["Security Patrol", "Customer Service"],
    "minimumExperience": 12,
    "shiftPattern": "8-hour shifts",
    "notes": "Must be able to handle high-traffic area"
  },
  "contractDetails": {
    "hourlyRate": 25.50,
    "overtimeMultiplier": 1.5,
    "holidayMultiplier": 2.0,
    "serviceLevel": {
      "responseTime": 5,
      "coverage": "24/7",
      "qualityMetrics": ["Response time", "Client satisfaction"]
    },
    "billingFrequency": "monthly"
  },
  "metadata": {
    "timezone": "America/New_York",
    "clientReferences": ["REF-001", "REF-002"],
    "internalNotes": "High-profile client site",
    "tags": ["downtown", "office", "high-security"]
  }
}
```

**Response:**
```json
{
  "id": "660e8400-e29b-41d4-a716-446655440001",
  "clientId": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Downtown Office Building - Main Lobby",
  "address": {
    "street": "123 Main Street",
    "city": "New York",
    "state": "NY",
    "zipCode": "10001",
    "country": "United States",
    "coordinates": {
      "latitude": 40.7128,
      "longitude": -74.0060
    }
  },
  "operationalStatus": "ACTIVE",
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:30:00Z"
}
```

### 2. List All Sites

**GET** `/api/v1/sites?page=1&limit=20&search=downtown&operationalStatus=ACTIVE`

**Response:**
```json
{
  "sites": [
    {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "clientId": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Downtown Office Building - Main Lobby",
      "operationalStatus": "ACTIVE",
      "client": {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "name": "Acme Corp",
        "contractStatus": "ACTIVE"
      },
      "_count": {
        "assignments": 3,
        "shifts": 15
      },
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-15T10:30:00Z"
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 20,
  "totalPages": 1
}
```

### 3. Get Site by ID

**GET** `/api/v1/sites/660e8400-e29b-41d4-a716-446655440001`

Returns full site details with all nested information.

### 4. Update Site

**PATCH** `/api/v1/sites/660e8400-e29b-41d4-a716-446655440001`

```json
{
  "operationalStatus": "MAINTENANCE",
  "contactInfo": {
    "primaryContact": "John Smith Updated",
    "primaryPhone": "+1-555-0124"
  }
}
```

### 5. Get Sites by Client

**GET** `/api/v1/sites/by-client/550e8400-e29b-41d4-a716-446655440000`

Returns all sites belonging to the specified client.

### 6. Get Sites by Status

**GET** `/api/v1/sites/by-status/ACTIVE`

Returns all sites with the specified operational status.

### 7. Get Site Statistics

**GET** `/api/v1/sites/stats`

**Response:**
```json
{
  "total": 25,
  "active": 22,
  "inactive": 1,
  "maintenance": 2,
  "suspended": 0,
  "totalAssignments": 68,
  "averageAssignmentsPerSite": 2.72
}
```

### 8. Delete Site (Soft Delete)

**DELETE** `/api/v1/sites/660e8400-e29b-41d4-a716-446655440001`

Sets the site operational status to INACTIVE.

## Business Rules

### Site Creation Rules
1. Client must exist and belong to the current tenant
2. Client contract status cannot be TERMINATED
3. Site name must be unique within the client
4. Address information is required
5. Default operational status is ACTIVE if not specified

### Operational Status Transitions
- **ACTIVE** → INACTIVE, SUSPENDED, MAINTENANCE
- **INACTIVE** → ACTIVE  
- **MAINTENANCE** → ACTIVE, SUSPENDED
- **SUSPENDED** → ACTIVE, INACTIVE

### Tenant Isolation
- All site operations are automatically filtered by tenant
- Sites can only be associated with clients from the same tenant
- Cross-tenant site access is prevented by row-level security

### Permissions Required
- `site:create` - Create new sites
- `site:read` - View site information
- `site:update` - Modify site details
- `site:delete` - Deactivate sites

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [
      {
        "field": "clientId",
        "message": "Client with ID xyz not found"
      }
    ]
  }
}
```

### 403 Forbidden
```json
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_PERMISSIONS",
    "message": "User does not have required permissions for this operation"
  }
}
```

### 404 Not Found
```json
{
  "success": false,
  "error": {
    "code": "RESOURCE_NOT_FOUND", 
    "message": "Site with ID xyz not found"
  }
}
```