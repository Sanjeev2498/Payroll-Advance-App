# Employee Onboarding Workflow

This example demonstrates the complete workflow for onboarding a new security guard employee.

## Step 1: Create Employee Profile

```http
POST /api/v1/employees
Authorization: Bearer <token>
Content-Type: application/json

{
  "firstName": "Michael",
  "lastName": "Johnson",
  "email": "michael.johnson@company.com",
  "phoneNumber": "+1-555-0125",
  "employeeId": "EMP003",
  "position": "Security Guard",
  "hireDate": "2024-03-15",
  "hourlyRate": 22.00,
  "emergencyContact": {
    "name": "Sarah Johnson",
    "relationship": "Spouse",
    "phone": "+1-555-0126"
  },
  "address": {
    "street": "456 Oak Street",
    "city": "Chicago",
    "state": "IL",
    "zipCode": "60601"
  },
  "skills": ["Security Guard", "CPR Certified"],
  "certifications": [
    {
      "type": "Security License",
      "number": "SEC-2024-001",
      "issueDate": "2024-01-01",
      "expiryDate": "2025-01-01"
    }
  ]
}
```

## Step 2: Upload Required Documents

```http
POST /api/v1/employees/{employee-id}/documents
Authorization: Bearer <token>
Content-Type: multipart/form-data

{
  "documentType": "GOVERNMENT_ID",
  "file": <binary-file-data>
}
```

## Step 3: Assign to Initial Site

```http
POST /api/v1/assignments
Authorization: Bearer <token>
Content-Type: application/json

{
  "employeeId": "emp_generated_id",
  "siteId": "site_downtown_office",
  "startDate": "2024-03-20",
  "shiftType": "DAY_SHIFT",
  "status": "ACTIVE"
}
```

## Step 4: Create Initial Schedule

```http
POST /api/v1/shifts
Authorization: Bearer <token>
Content-Type: application/json

{
  "assignmentId": "asn_generated_id",
  "date": "2024-03-20",
  "startTime": "08:00:00",
  "endTime": "16:00:00",
  "requiredSkills": ["Security Guard"],
  "notes": "Initial training shift - shadow experienced guard"
}
```

## Complete JavaScript Example

```javascript
async function onboardEmployee(apiClient, employeeData) {
  try {
    // Step 1: Create employee
    const employeeResponse = await apiClient.createEmployee(employeeData);
    const employeeId = employeeResponse.data.id;
    console.log(`Employee created: ${employeeId}`);

    // Step 2: Upload documents (if provided)
    if (employeeData.documents) {
      for (const doc of employeeData.documents) {
        await apiClient.uploadDocument(employeeId, doc);
        console.log(`Document uploaded: ${doc.type}`);
      }
    }

    // Step 3: Create assignment
    const assignmentResponse = await apiClient.createAssignment({
      employeeId: employeeId,
      siteId: employeeData.initialSiteId,
      startDate: employeeData.startDate,
      shiftType: 'DAY_SHIFT',
      status: 'ACTIVE'
    });
    
    const assignmentId = assignmentResponse.data.id;
    console.log(`Assignment created: ${assignmentId}`);

    // Step 4: Create initial shifts for first week
    const startDate = new Date(employeeData.startDate);
    for (let i = 0; i < 5; i++) {
      const shiftDate = new Date(startDate);
      shiftDate.setDate(startDate.getDate() + i);
      
      await apiClient.createShift({
        assignmentId: assignmentId,
        date: shiftDate.toISOString().split('T')[0],
        startTime: '08:00:00',
        endTime: '16:00:00',
        requiredSkills: employeeData.skills,
        notes: i === 0 ? 'Training shift' : 'Regular shift'
      });
    }

    console.log('Employee onboarding completed successfully');
    return {
      success: true,
      employeeId,
      assignmentId
    };

  } catch (error) {
    console.error('Onboarding failed:', error.message);
    throw error;
  }
}

// Usage
const newEmployee = {
  firstName: 'Michael',
  lastName: 'Johnson',
  email: 'michael.johnson@company.com',
  phoneNumber: '+1-555-0125',
  employeeId: 'EMP003',
  position: 'Security Guard',
  hireDate: '2024-03-15',
  hourlyRate: 22.00,
  skills: ['Security Guard', 'CPR Certified'],
  initialSiteId: 'site_downtown_office',
  startDate: '2024-03-20'
};

onboardEmployee(apiClient, newEmployee)
  .then(result => console.log('Success:', result))
  .catch(error => console.error('Error:', error));
```
