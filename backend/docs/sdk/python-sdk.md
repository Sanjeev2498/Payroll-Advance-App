# Python SDK Example

## Installation

```bash
pip install requests
```

## Basic Client Setup

```python
import requests
import json
from typing import Optional, Dict, Any
from datetime import datetime, timedelta

class PayrollAPIError(Exception):
    """Custom exception for Payroll API errors"""
    def __init__(self, message: str, code: Optional[str] = None, status_code: Optional[int] = None, details: Optional[Dict] = None):
        super().__init__(message)
        self.code = code
        self.status_code = status_code
        self.details = details or {}

class PayrollAPIClient:
    def __init__(self, base_url: str = "https://api.yourdomain.com/api/v1", timeout: int = 30):
        self.base_url = base_url.rstrip('/')
        self.timeout = timeout
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'User-Agent': 'PayrollAPI-Python-Client/1.0.0'
        })
        
        self.access_token: Optional[str] = None
        self.refresh_token: Optional[str] = None
        self.token_expires_at: Optional[datetime] = None

    def _make_request(self, method: str, endpoint: str, **kwargs) -> Dict[Any, Any]:
        """Make HTTP request with automatic token refresh"""
        url = f"{self.base_url}{endpoint}"
        
        # Add auth header if token exists and not expired
        if self.access_token and self._is_token_valid():
            self.session.headers['Authorization'] = f"Bearer {self.access_token}"
        elif self.access_token and self.refresh_token:
            # Token expired, try to refresh
            try:
                self.refresh_access_token()
                self.session.headers['Authorization'] = f"Bearer {self.access_token}"
            except Exception:
                self.logout()
                raise PayrollAPIError("Authentication required - please login again", "AUTH_REQUIRED", 401)
        
        response = self.session.request(method, url, timeout=self.timeout, **kwargs)
        
        # Handle 401 with refresh token
        if response.status_code == 401 and self.refresh_token:
            try:
                self.refresh_access_token()
                self.session.headers['Authorization'] = f"Bearer {self.access_token}"
                response = self.session.request(method, url, timeout=self.timeout, **kwargs)
            except Exception:
                self.logout()
                raise
        
        return self._handle_response(response)

    def _handle_response(self, response: requests.Response) -> Dict[Any, Any]:
        """Handle API response and errors"""
        try:
            data = response.json()
        except json.JSONDecodeError:
            raise Exception(f"Invalid JSON response: {response.text}")
        
        if response.status_code >= 400:
            error_info = data.get('error', {})
            raise PayrollAPIError(
                message=error_info.get('message', 'Unknown error'),
                code=error_info.get('code'),
                status_code=response.status_code,
                details=error_info.get('details', {})
            )
        
        return data

    def _is_token_valid(self) -> bool:
        """Check if current token is still valid"""
        if not self.token_expires_at:
            return True
        return datetime.now() < self.token_expires_at - timedelta(minutes=5)

    # Authentication Methods
    def login(self, email: str, password: str) -> Dict[Any, Any]:
        """Login and store tokens"""
        response = self._make_request('POST', '/auth/login', json={
            'email': email,
            'password': password
        })
        
        tokens = response['data']['tokens']
        self.access_token = tokens['accessToken']
        self.refresh_token = tokens['refreshToken']
        
        # Estimate token expiry (typically 1 hour for JWT)
        self.token_expires_at = datetime.now() + timedelta(hours=1)
        
        return response

    def refresh_access_token(self) -> Dict[Any, Any]:
        """Refresh access token using refresh token"""
        if not self.refresh_token:
            raise Exception("No refresh token available")
        
        # Temporarily remove auth header for refresh request
        old_auth = self.session.headers.pop('Authorization', None)
        
        try:
            response = self._make_request('POST', '/auth/refresh', json={
                'refreshToken': self.refresh_token
            })
            
            tokens = response['data']['tokens']
            self.access_token = tokens['accessToken']
            self.token_expires_at = datetime.now() + timedelta(hours=1)
            
            return response
        finally:
            # Restore auth header if it existed
            if old_auth:
                self.session.headers['Authorization'] = old_auth

    def logout(self) -> None:
        """Clear stored tokens"""
        self.access_token = None
        self.refresh_token = None
        self.token_expires_at = None
        self.session.headers.pop('Authorization', None)

    # Employee Management
    def get_employees(self, **params) -> Dict[Any, Any]:
        """Get list of employees with optional filters"""
        return self._make_request('GET', '/employees', params=params)

    def create_employee(self, employee_data: Dict[str, Any]) -> Dict[Any, Any]:
        """Create a new employee"""
        return self._make_request('POST', '/employees', json=employee_data)

    def get_employee(self, employee_id: str) -> Dict[Any, Any]:
        """Get employee by ID"""
        return self._make_request('GET', f'/employees/{employee_id}')

    def update_employee(self, employee_id: str, update_data: Dict[str, Any]) -> Dict[Any, Any]:
        """Update employee information"""
        return self._make_request('PATCH', f'/employees/{employee_id}', json=update_data)

    def delete_employee(self, employee_id: str) -> Dict[Any, Any]:
        """Delete employee (soft delete)"""
        return self._make_request('DELETE', f'/employees/{employee_id}')

    # Client Management
    def get_clients(self, **params) -> Dict[Any, Any]:
        """Get list of clients with optional filters"""
        return self._make_request('GET', '/clients', params=params)

    def create_client(self, client_data: Dict[str, Any]) -> Dict[Any, Any]:
        """Create a new client"""
        return self._make_request('POST', '/clients', json=client_data)

    def get_client(self, client_id: str) -> Dict[Any, Any]:
        """Get client by ID"""
        return self._make_request('GET', f'/clients/{client_id}')

    def update_client(self, client_id: str, update_data: Dict[str, Any]) -> Dict[Any, Any]:
        """Update client information"""
        return self._make_request('PATCH', f'/clients/{client_id}', json=update_data)

    # Attendance Management
    def clock_in(self, employee_id: str, location_data: Optional[Dict[str, Any]] = None) -> Dict[Any, Any]:
        """Clock in employee"""
        payload = {'employeeId': employee_id}
        if location_data:
            payload.update(location_data)
        return self._make_request('POST', '/attendance/clock-in', json=payload)

    def clock_out(self, employee_id: str, location_data: Optional[Dict[str, Any]] = None) -> Dict[Any, Any]:
        """Clock out employee"""
        payload = {'employeeId': employee_id}
        if location_data:
            payload.update(location_data)
        return self._make_request('POST', '/attendance/clock-out', json=payload)

    def get_attendance(self, **params) -> Dict[Any, Any]:
        """Get attendance records"""
        return self._make_request('GET', '/attendance', params=params)

    # Payroll Operations
    def create_payroll_run(self, payroll_data: Dict[str, Any]) -> Dict[Any, Any]:
        """Create a new payroll run"""
        return self._make_request('POST', '/payroll', json=payroll_data)

    def get_payroll_runs(self, **params) -> Dict[Any, Any]:
        """Get payroll runs with optional filters"""
        return self._make_request('GET', '/payroll', params=params)

    def get_payroll_run(self, run_id: str) -> Dict[Any, Any]:
        """Get specific payroll run"""
        return self._make_request('GET', f'/payroll/{run_id}')

    # Reporting
    def get_reports(self, report_type: str, **params) -> Dict[Any, Any]:
        """Generate reports"""
        return self._make_request('GET', f'/reports/{report_type}', params=params)

    def export_data(self, export_type: str, **params) -> Dict[Any, Any]:
        """Export data in various formats"""
        return self._make_request('POST', '/export', json={
            'type': export_type,
            **params
        })
```

## Usage Example

```python
from payroll_api_client import PayrollAPIClient
from datetime import date

def main():
    # Initialize client
    client = PayrollAPIClient('http://localhost:3005/api/v1')

    try:
        # Login
        login_response = client.login('admin@company.com', 'password')
        print("Logged in successfully")

        # Create a new employee
        new_employee = client.create_employee({
            'firstName': 'Jane',
            'lastName': 'Smith',
            'email': 'jane.smith@company.com',
            'phoneNumber': '+1-555-0124',
            'employeeId': 'EMP002',
            'position': 'Security Supervisor',
            'hireDate': '2024-01-15',
            'hourlyRate': 30.00,
            'department': 'Security',
            'status': 'active'
        })
        
        employee_id = new_employee['data']['id']
        print(f"Employee created: {employee_id}")

        # Clock in employee
        clock_in_response = client.clock_in(employee_id, {
            'latitude': 40.7128,
            'longitude': -74.0060,
            'notes': 'Starting shift'
        })
        print("Employee clocked in")

        # Get employees with pagination and filtering
        employees = client.get_employees(
            page=1,
            limit=10,
            sortBy='lastName',
            status='active'
        )
        print(f"Found {len(employees['data'])} active employees")

        # Get attendance records for today
        attendance = client.get_attendance(
            startDate=date.today().isoformat(),
            endDate=date.today().isoformat()
        )
        print(f"Today's attendance: {len(attendance['data'])} records")

        # Create payroll run
        payroll_run = client.create_payroll_run({
            'periodStart': '2024-01-01',
            'periodEnd': '2024-01-15',
            'description': 'Bi-weekly payroll - January 2024',
            'clientIds': []  # All clients
        })
        print(f"Payroll run created: {payroll_run['data']['id']}")

    except Exception as error:
        print(f"Error: {str(error)}")
    finally:
        # Always logout to clean up tokens
        client.logout()

if __name__ == "__main__":
    main()
```

## Error Handling

```python
from payroll_api_client import PayrollAPIClient

client = PayrollAPIClient()

try:
    # API operation that might fail
    result = client.create_employee({})
except Exception as e:
    error_message = str(e)
    
    if "VALIDATION_ERROR" in error_message:
        print("Please check your input data")
    elif "EMPLOYEE_EXISTS" in error_message:
        print("Employee with this ID already exists")
    elif "UNAUTHORIZED" in error_message:
        print("Please login first")
    else:
        print(f"Unexpected error: {error_message}")
```
