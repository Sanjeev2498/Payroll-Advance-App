# JavaScript/Node.js SDK Example

## Installation

```bash
npm install axios
```

## Basic Client Setup

```javascript
const axios = require('axios');

class PayrollAPIClient {
  constructor(baseURL, options = {}) {
    this.client = axios.create({
      baseURL: baseURL || 'https://api.yourdomain.com/api/v1',
      timeout: options.timeout || 30000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'PayrollAPI-JS-Client/1.0.0'
      }
    });

    this.token = null;
    this.refreshToken = null;
    
    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      (config) => {
        if (this.token) {
          config.headers.Authorization = 'Bearer ' + this.token; // Authorization: Bearer token
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401 && this.refreshToken) {
          try {
            await this.refreshAccessToken();
            return this.client.request(error.config);
          } catch (refreshError) {
            this.logout();
            throw refreshError;
          }
        }
        throw error;
      }
    );
  }

  // Authentication
  async login(email, password) {
    try {
      const response = await this.client.post('/auth/login', { email, password });
      const { tokens } = response.data.data;
      
      this.token = tokens.accessToken;
      this.refreshToken = tokens.refreshToken;
      
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async refreshAccessToken() {
    const response = await this.client.post('/auth/refresh', {
      refreshToken: this.refreshToken
    });
    
    const { tokens } = response.data.data;
    this.token = tokens.accessToken;
    
    return response.data;
  }

  logout() {
    this.token = null;
    this.refreshToken = null;
  }

  // Employee Management
  async getEmployees(params = {}) {
    const response = await this.client.get('/employees', { params });
    return response.data;
  }

  async createEmployee(employeeData) {
    const response = await this.client.post('/employees', employeeData);
    return response.data;
  }

  async getEmployee(id) {
    const response = await this.client.get(`/employees/${id}`);
    return response.data;
  }

  async updateEmployee(id, updateData) {
    const response = await this.client.patch(`/employees/${id}`, updateData);
    return response.data;
  }

  // Client Management
  async getClients(params = {}) {
    const response = await this.client.get('/clients', { params });
    return response.data;
  }

  async createClient(clientData) {
    const response = await this.client.post('/clients', clientData);
    return response.data;
  }

  // Attendance Management
  async clockIn(employeeId, locationData = {}) {
    const response = await this.client.post('/attendance/clock-in', {
      employeeId,
      ...locationData
    });
    return response.data;
  }

  async clockOut(employeeId, locationData = {}) {
    const response = await this.client.post('/attendance/clock-out', {
      employeeId,
      ...locationData
    });
    return response.data;
  }

  // Payroll Operations
  async createPayrollRun(payrollData) {
    const response = await this.client.post('/payroll', payrollData);
    return response.data;
  }

  async getPayrollRuns(params = {}) {
    const response = await this.client.get('/payroll', { params });
    return response.data;
  }

  // Error Handling
  handleError(error) {
    if (error.response) {
      const apiError = error.response.data.error;
      const customError = new Error(apiError.message || 'API request failed');
      customError.code = apiError.code;
      customError.details = apiError.details;
      customError.statusCode = error.response.status;
      return customError;
    }
    return error;
  }
}

module.exports = PayrollAPIClient;
```

## Usage Example

```javascript
const PayrollAPIClient = require('./payroll-api-client');

async function main() {
  const client = new PayrollAPIClient('http://localhost:3005/api/v1');

  try {
    // Login
    await client.login('admin@company.com', 'password');
    console.log('Logged in successfully');

    // Create employee
    const newEmployee = await client.createEmployee({
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@company.com',
      phoneNumber: '+1-555-0123',
      employeeId: 'EMP001',
      position: 'Security Guard',
      hireDate: '2024-01-15',
      hourlyRate: 25.00
    });
    console.log('Employee created:', newEmployee.data.id);

    // Get employees with pagination
    const employees = await client.getEmployees({
      page: 1,
      limit: 10,
      sortBy: 'lastName'
    });
    console.log(`Found ${employees.data.length} employees`);

  } catch (error) {
    console.error('Error:', error.message);
    if (error.code) {
      console.error('Error Code:', error.code);
    }
  }
}

main();
```
