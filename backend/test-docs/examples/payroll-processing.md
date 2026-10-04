# Payroll Processing Workflow

Complete workflow for processing payroll including time tracking, calculations, and approval.

## Step 1: Collect Attendance Data

```http
GET /api/v1/attendance?startDate=2024-03-01&endDate=2024-03-15&status=approved
Authorization: Bearer <token>
```

## Step 2: Create Payroll Run

```http
POST /api/v1/payroll
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Bi-weekly Payroll - March 1-15, 2024",
  "payPeriodStart": "2024-03-01",
  "payPeriodEnd": "2024-03-15",
  "payDate": "2024-03-22",
  "description": "Regular bi-weekly payroll processing",
  "includeEmployees": "ALL_ACTIVE"
}
```

## Step 3: Review Payroll Calculations

```http
GET /api/v1/payroll/{payroll-run-id}/preview
Authorization: Bearer <token>
```

## Step 4: Approve Payroll

```http
POST /api/v1/payroll/{payroll-run-id}/approve
Authorization: Bearer <token>
Content-Type: application/json

{
  "approvedBy": "manager_user_id",
  "notes": "Reviewed and approved for processing"
}
```

## Complete Python Example

```python
from datetime import datetime, date, timedelta
from payroll_api_client import PayrollAPIClient

def process_payroll(client: PayrollAPIClient, pay_period_start: date, pay_period_end: date):
    """Complete payroll processing workflow"""
    
    try:
        # Step 1: Verify all attendance is approved
        attendance_response = client.get_attendance({
            'startDate': pay_period_start.isoformat(),
            'endDate': pay_period_end.isoformat(),
            'status': 'PENDING_APPROVAL'
        })
        
        pending_count = len(attendance_response.data)
        if pending_count > 0:
            print(f"Warning: {pending_count} attendance records pending approval")
            return False

        # Step 2: Create payroll run
        payroll_data = {
            'name': f'Bi-weekly Payroll - {pay_period_start} to {pay_period_end}',
            'payPeriodStart': pay_period_start.isoformat(),
            'payPeriodEnd': pay_period_end.isoformat(),
            'payDate': (pay_period_end + timedelta(days=7)).isoformat(),
            'description': 'Regular bi-weekly payroll processing',
            'includeEmployees': 'ALL_ACTIVE'
        }
        
        payroll_response = client.create_payroll_run(payroll_data)
        payroll_id = payroll_response.data['id']
        print(f"Payroll run created: {payroll_id}")

        # Step 3: Get preview and validate
        preview_response = client.get_payroll_preview(payroll_id)
        payroll_summary = preview_response.data

        print("Employees in payroll: " + str(payroll_summary['employeeCount']))
        print("Total gross pay: $" + "{:.2f}".format(payroll_summary['totalGrossPay']))
        print("Total net pay: $" + "{:.2f}".format(payroll_summary['totalNetPay']))

        # Step 4: Review individual employee calculations
        for employee in payroll_summary['employees']:
            if employee['grossPay'] > 5000:  # Flag high payments for review
                print("High pay alert: " + employee['employeeName'] + " - $" + "{:.2f}".format(employee['grossPay']))

        # Step 5: Approve payroll (in production, add manual approval step)
        approval_response = client.approve_payroll(payroll_id, {
            'notes': 'Automated approval after validation checks'
        })

        print("Payroll approved and scheduled for " + payroll_data['payDate'])
        return True

    except Exception as e:
        print("Payroll processing failed: " + str(e))
        return False

# Usage
client = PayrollAPIClient()
client.login('payroll@company.com', 'secure_password')

# Process current pay period
start_date = date(2024, 3, 1)
end_date = date(2024, 3, 15)

success = process_payroll(client, start_date, end_date)
if success:
    print("Payroll processing completed successfully")
else:
    print("Payroll processing failed - manual intervention required")
```
