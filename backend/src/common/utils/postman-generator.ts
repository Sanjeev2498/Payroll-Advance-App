import * as fs from 'fs';
import * as path from 'path';
import { OpenAPIObject } from '@nestjs/swagger';

/**
 * Postman Collection Generator
 * Converts OpenAPI specification to Postman Collection v2.1 format
 */

interface PostmanCollection {
  info: {
    name: string;
    description: string;
    version: string;
    schema: string;
  };
  auth?: {
    type: string;
    bearer: {
      key: string;
      value: string;
      type: string;
    }[];
  };
  variable: Array<{
    key: string;
    value: string;
    type?: string;
  }>;
  item: PostmanItem[];
  event?: PostmanEvent[];
}

interface PostmanItem {
  name: string;
  description?: string;
  item?: PostmanItem[];
  request?: PostmanRequest;
  event?: PostmanEvent[];
}

interface PostmanRequest {
  method: string;
  header: Array<{
    key: string;
    value: string;
    type: string;
  }>;
  url: {
    raw: string;
    host: string[];
    path: string[];
    query?: Array<{
      key: string;
      value: string;
      description?: string;
    }>;
  };
  body?: {
    mode: string;
    raw?: string;
    options?: {
      raw: {
        language: string;
      };
    };
  };
  auth?: {
    type: string;
    bearer?: {
      key: string;
      value: string;
      type: string;
    }[];
  };
}

interface PostmanEvent {
  listen: string;
  script: {
    type: string;
    exec: string[];
  };
}

export class PostmanGenerator {
  
  /**
   * Generate Postman collections from OpenAPI document
   */
  static generatePostmanCollections(document: OpenAPIObject, outputDir: string): void {
    const collectionsDir = path.join(outputDir, 'postman');
    
    if (!fs.existsSync(collectionsDir)) {
      fs.mkdirSync(collectionsDir, { recursive: true });
    }

    // Generate main collection
    const mainCollection = this.generateMainCollection(document);
    fs.writeFileSync(
      path.join(collectionsDir, 'payroll-api-main.postman_collection.json'),
      JSON.stringify(mainCollection, null, 2)
    );

    // Generate environment files
    this.generateEnvironments(collectionsDir);

    // Generate test collection
    const testCollection = this.generateTestCollection(document);
    fs.writeFileSync(
      path.join(collectionsDir, 'payroll-api-tests.postman_collection.json'),
      JSON.stringify(testCollection, null, 2)
    );

    // Generate onboarding collection
    const onboardingCollection = this.generateOnboardingCollection();
    fs.writeFileSync(
      path.join(collectionsDir, 'payroll-api-onboarding.postman_collection.json'),
      JSON.stringify(onboardingCollection, null, 2)
    );

    console.log(`📮 Postman collections generated in: ${collectionsDir}`);
  }
  /**
   * Generate main API collection from OpenAPI spec
   */
  private static generateMainCollection(document: OpenAPIObject): PostmanCollection {
    const collection: PostmanCollection = {
      info: {
        name: 'Security Workforce & Payroll Management API',
        description: document.info.description || 'Complete API for workforce operations, payroll processing, and client management',
        version: document.info.version,
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/postman_collection.json'
      },
      auth: {
        type: 'bearer',
        bearer: [{
          key: 'token',
          value: '{{access_token}}',
          type: 'string'
        }]
      },
      variable: [
        {
          key: 'base_url',
          value: 'http://localhost:3005/api/v1',
          type: 'string'
        },
        {
          key: 'access_token',
          value: '',
          type: 'string'
        },
        {
          key: 'refresh_token',
          value: '',
          type: 'string'
        }
      ],
      item: [],
      event: [
        {
          listen: 'prerequest',
          script: {
            type: 'text/javascript',
            exec: [
              '// Auto-refresh token if expired',
              'const token = pm.collectionVariables.get("access_token");',
              'if (!token) {',
              '    console.log("No access token found. Please run the Login request first.");',
              '    return;',
              '}',
              '',
              '// Check if token is expired (simplified check)',
              'const tokenData = JSON.parse(atob(token.split(".")[1]));',
              'const now = Math.floor(Date.now() / 1000);',
              'if (tokenData.exp && tokenData.exp < now + 60) {',
              '    console.log("Token expiring soon, attempting refresh...");',
              '    ',
              '    const refreshToken = pm.collectionVariables.get("refresh_token");',
              '    if (refreshToken) {',
              '        pm.sendRequest({',
              '            url: pm.collectionVariables.get("base_url") + "/auth/refresh",',
              '            method: "POST",',
              '            header: {',
              '                "Content-Type": "application/json"',
              '            },',
              '            body: {',
              '                mode: "raw",',
              '                raw: JSON.stringify({ refreshToken: refreshToken })',
              '            }',
              '        }, function(err, response) {',
              '            if (!err && response.code === 200) {',
              '                const responseJson = response.json();',
              '                if (responseJson.success) {',
              '                    pm.collectionVariables.set("access_token", responseJson.data.tokens.accessToken);',
              '                    console.log("Token refreshed successfully");',
              '                }',
              '            }',
              '        });',
              '    }',
              '}'
            ]
          }
        }
      ]
    };

    // Group endpoints by tags
    const groupedPaths = this.groupPathsByTags(document.paths || {});
    
    Object.entries(groupedPaths).forEach(([tag, paths]) => {
      const folder: PostmanItem = {
        name: tag,
        description: `${tag} related endpoints`,
        item: []
      };

      Object.entries(paths).forEach(([path, methods]) => {
        Object.entries(methods).forEach(([method, operation]) => {
          const request = this.createPostmanRequest(path, method, operation);
          folder.item!.push({
            name: operation.summary || `${method.toUpperCase()} ${path}`,
            description: operation.description,
            request,
            event: this.createRequestEvents(method, operation)
          });
        });
      });

      collection.item.push(folder);
    });

    return collection;
  }

  /**
   * Group API paths by their tags
   */
  private static groupPathsByTags(paths: any): Record<string, any> {
    const grouped: Record<string, any> = {};

    Object.entries(paths).forEach(([path, pathItem]: [string, any]) => {
      Object.entries(pathItem).forEach(([method, operation]: [string, any]) => {
        if (typeof operation === 'object' && operation.tags) {
          const tag = operation.tags[0] || 'Uncategorized';
          
          if (!grouped[tag]) {
            grouped[tag] = {};
          }
          if (!grouped[tag][path]) {
            grouped[tag][path] = {};
          }
          grouped[tag][path][method] = operation;
        }
      });
    });

    return grouped;
  }

  /**
   * Create Postman request from OpenAPI operation
   */
  private static createPostmanRequest(path: string, method: string, operation: any): PostmanRequest {
    const request: PostmanRequest = {
      method: method.toUpperCase(),
      header: [
        {
          key: 'Content-Type',
          value: 'application/json',
          type: 'text'
        }
      ],
      url: {
        raw: `{{base_url}}${path}`,
        host: ['{{base_url}}'],
        path: path.split('/').filter(p => p)
      }
    };

    // Add authorization for protected endpoints
    if (operation.security) {
      request.auth = {
        type: 'bearer',
        bearer: [{
          key: 'token',
          value: '{{access_token}}',
          type: 'string'
        }]
      };
    }

    // Add query parameters
    if (operation.parameters) {
      const queryParams = operation.parameters.filter((p: any) => p.in === 'query');
      if (queryParams.length > 0) {
        request.url.query = queryParams.map((param: any) => ({
          key: param.name,
          value: param.example || '',
          description: param.description
        }));
      }
    }

    // Add request body for POST/PUT/PATCH
    if (['POST', 'PUT', 'PATCH'].includes(method.toUpperCase()) && operation.requestBody) {
      const schema = operation.requestBody?.content?.['application/json']?.schema;
      if (schema) {
        const exampleBody = this.generateExampleFromSchema(schema);
        request.body = {
          mode: 'raw',
          raw: JSON.stringify(exampleBody, null, 2),
          options: {
            raw: {
              language: 'json'
            }
          }
        };
      }
    }

    return request;
  }

  /**
   * Generate example data from OpenAPI schema
   */
  private static generateExampleFromSchema(schema: any): any {
    if (schema.example) {
      return schema.example;
    }

    if (schema.type === 'object' && schema.properties) {
      const example: any = {};
      Object.entries(schema.properties).forEach(([key, prop]: [string, any]) => {
        if (prop.example !== undefined) {
          example[key] = prop.example;
        } else {
          example[key] = this.getDefaultValueForType(prop.type, key);
        }
      });
      return example;
    }

    return this.getDefaultValueForType(schema.type);
  }

  /**
   * Get default example values for different types
   */
  private static getDefaultValueForType(type: string, fieldName?: string): any {
    const examples: Record<string, any> = {
      string: fieldName?.toLowerCase().includes('email') ? 'user@example.com' : 
              fieldName?.toLowerCase().includes('phone') ? '+1-555-0123' : 'example',
      number: fieldName?.toLowerCase().includes('rate') ? 25.00 : 1,
      integer: 1,
      boolean: true,
      array: [],
      object: {}
    };

    return examples[type] || 'example';
  }
  /**
   * Create request-specific events (tests and pre-request scripts)
   */
  private static createRequestEvents(method: string, operation: any): PostmanEvent[] {
    const events: PostmanEvent[] = [];

    // Add pre-request script for specific endpoints
    if (operation.operationId === 'login') {
      events.push({
        listen: 'prerequest',
        script: {
          type: 'text/javascript',
          exec: [
            '// Clear existing tokens before login',
            'pm.collectionVariables.set("access_token", "");',
            'pm.collectionVariables.set("refresh_token", "");'
          ]
        }
      });
    }

    // Add test script
    const testScript = this.generateTestScript(method, operation);
    if (testScript.length > 0) {
      events.push({
        listen: 'test',
        script: {
          type: 'text/javascript',
          exec: testScript
        }
      });
    }

    return events;
  }

  /**
   * Generate test scripts for requests
   */
  private static generateTestScript(method: string, operation: any): string[] {
    const script: string[] = [
      '// Basic response validation',
      'pm.test("Status code is successful", function () {',
      '    pm.expect(pm.response.code).to.be.oneOf([200, 201, 204]);',
      '});',
      '',
      'pm.test("Response time is less than 2000ms", function () {',
      '    pm.expect(pm.response.responseTime).to.be.below(2000);',
      '});',
      '',
      'pm.test("Response has required headers", function () {',
      '    pm.expect(pm.response.headers.get("Content-Type")).to.include("application/json");',
      '});'
    ];

    // Add specific tests based on operation
    if (operation.operationId === 'login') {
      script.push(
        '',
        '// Login-specific tests',
        'pm.test("Login response contains tokens", function () {',
        '    const responseJson = pm.response.json();',
        '    pm.expect(responseJson.success).to.be.true;',
        '    pm.expect(responseJson.data.tokens).to.be.an("object");',
        '    pm.expect(responseJson.data.tokens.accessToken).to.be.a("string");',
        '    pm.expect(responseJson.data.tokens.refreshToken).to.be.a("string");',
        '    ',
        '    // Store tokens for subsequent requests',
        '    pm.collectionVariables.set("access_token", responseJson.data.tokens.accessToken);',
        '    pm.collectionVariables.set("refresh_token", responseJson.data.tokens.refreshToken);',
        '});'
      );
    }

    if (method.toLowerCase() === 'post') {
      script.push(
        '',
        '// POST-specific tests',
        'pm.test("Created resource has ID", function () {',
        '    const responseJson = pm.response.json();',
        '    if (responseJson.success && responseJson.data) {',
        '        pm.expect(responseJson.data.id).to.be.a("string");',
        '        // Store created resource ID for cleanup',
        '        pm.collectionVariables.set("last_created_id", responseJson.data.id);',
        '    }',
        '});'
      );
    }

    if (method.toLowerCase() === 'get' && operation.operationId?.includes('getAll')) {
      script.push(
        '',
        '// List endpoint tests',
        'pm.test("Response contains data array", function () {',
        '    const responseJson = pm.response.json();',
        '    pm.expect(responseJson.success).to.be.true;',
        '    pm.expect(responseJson.data).to.be.an("array");',
        '});',
        '',
        'pm.test("Response contains pagination metadata", function () {',
        '    const responseJson = pm.response.json();',
        '    if (responseJson.metadata && responseJson.metadata.pagination) {',
        '        pm.expect(responseJson.metadata.pagination.page).to.be.a("number");',
        '        pm.expect(responseJson.metadata.pagination.limit).to.be.a("number");',
        '        pm.expect(responseJson.metadata.pagination.total).to.be.a("number");',
        '    }',
        '});'
      );
    }

    script.push(
      '',
      '// Error handling test',
      'pm.test("Error responses have proper format", function () {',
      '    if (pm.response.code >= 400) {',
      '        const responseJson = pm.response.json();',
      '        pm.expect(responseJson.success).to.be.false;',
      '        pm.expect(responseJson.error).to.be.an("object");',
      '        pm.expect(responseJson.error.code).to.be.a("string");',
      '        pm.expect(responseJson.error.message).to.be.a("string");',
      '    }',
      '});'
    );

    return script;
  }

  /**
   * Generate environment files
   */
  private static generateEnvironments(outputDir: string): void {
    const environments = {
      development: {
        name: 'Development Environment',
        values: [
          { key: 'base_url', value: 'http://localhost:3005/api/v1', enabled: true },
          { key: 'admin_email', value: 'admin@company.com', enabled: true },
          { key: 'admin_password', value: 'password', enabled: true },
          { key: 'test_employee_email', value: 'john.doe@company.com', enabled: true }
        ]
      },
      staging: {
        name: 'Staging Environment',
        values: [
          { key: 'base_url', value: 'https://api-staging.yourdomain.com/api/v1', enabled: true },
          { key: 'admin_email', value: 'staging-admin@company.com', enabled: true },
          { key: 'admin_password', value: 'staging-password', enabled: true },
          { key: 'test_employee_email', value: 'test.employee@company.com', enabled: true }
        ]
      },
      production: {
        name: 'Production Environment',
        values: [
          { key: 'base_url', value: 'https://api.yourdomain.com/api/v1', enabled: true },
          { key: 'admin_email', value: 'production-admin@company.com', enabled: true },
          { key: 'admin_password', value: 'CHANGE_ME', enabled: true },
          { key: 'test_employee_email', value: 'production-test@company.com', enabled: true }
        ]
      }
    };

    Object.entries(environments).forEach(([name, env]) => {
      const envFile = {
        id: `${name}-env-id`,
        name: env.name,
        values: env.values,
        _postman_variable_scope: 'environment',
        _postman_exported_at: new Date().toISOString(),
        _postman_exported_using: 'Postman/10.0.0'
      };

      fs.writeFileSync(
        path.join(outputDir, `${name}-environment.postman_environment.json`),
        JSON.stringify(envFile, null, 2)
      );
    });

    console.log(`🌍 Environment files generated for development, staging, and production`);
  }
  /**
   * Generate test collection for automated testing
   */
  private static generateTestCollection(document: OpenAPIObject): PostmanCollection {
    return {
      info: {
        name: 'Payroll API - Automated Tests',
        description: 'Comprehensive test suite for the Payroll API',
        version: document.info.version,
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/postman_collection.json'
      },
      variable: [
        {
          key: 'base_url',
          value: 'http://localhost:3005/api/v1'
        },
        {
          key: 'test_employee_id',
          value: ''
        },
        {
          key: 'test_client_id',
          value: ''
        }
      ],
      item: [
        {
          name: 'Setup Tests',
          item: [
            {
              name: 'Health Check',
              request: {
                method: 'GET',
                header: [],
                url: {
                  raw: '{{base_url}}/health',
                  host: ['{{base_url}}'],
                  path: ['health']
                }
              },
              event: [{
                listen: 'test',
                script: {
                  type: 'text/javascript',
                  exec: [
                    'pm.test("API is healthy", function () {',
                    '    pm.response.to.have.status(200);',
                    '    const response = pm.response.json();',
                    '    pm.expect(response.status).to.eql("healthy");',
                    '});'
                  ]
                }
              }]
            },
            {
              name: 'Admin Login',
              request: {
                method: 'POST',
                header: [
                  {
                    key: 'Content-Type',
                    value: 'application/json',
                    type: 'text'
                  }
                ],
                body: {
                  mode: 'raw',
                  raw: JSON.stringify({
                    email: '{{admin_email}}',
                    password: '{{admin_password}}'
                  }, null, 2),
                  options: {
                    raw: {
                      language: 'json'
                    }
                  }
                },
                url: {
                  raw: '{{base_url}}/auth/login',
                  host: ['{{base_url}}'],
                  path: ['auth', 'login']
                }
              },
              event: [{
                listen: 'test',
                script: {
                  type: 'text/javascript',
                  exec: [
                    'pm.test("Admin login successful", function () {',
                    '    pm.response.to.have.status(200);',
                    '    const response = pm.response.json();',
                    '    pm.expect(response.success).to.be.true;',
                    '    pm.expect(response.data.tokens.accessToken).to.exist;',
                    '    ',
                    '    pm.collectionVariables.set("access_token", response.data.tokens.accessToken);',
                    '    pm.collectionVariables.set("refresh_token", response.data.tokens.refreshToken);',
                    '});'
                  ]
                }
              }]
            }
          ]
        },
        {
          name: 'CRUD Tests',
          item: [
            {
              name: 'Create Test Employee',
              request: {
                method: 'POST',
                header: [
                  {
                    key: 'Content-Type',
                    value: 'application/json',
                    type: 'text'
                  },
                  {
                    key: 'Authorization',
                    value: 'Bearer {{access_token}}',
                    type: 'text'
                  }
                ],
                body: {
                  mode: 'raw',
                  raw: JSON.stringify({
                    firstName: 'Test',
                    lastName: 'Employee',
                    email: 'test.employee.{{$timestamp}}@company.com',
                    phoneNumber: '+1-555-0123',
                    employeeId: 'TEST{{$timestamp}}',
                    position: 'Security Guard',
                    hireDate: '2024-01-15',
                    hourlyRate: 25.00,
                    skills: ['Security Guard', 'CPR Certified']
                  }, null, 2)
                },
                url: {
                  raw: '{{base_url}}/employees',
                  host: ['{{base_url}}'],
                  path: ['employees']
                }
              },
              event: [{
                listen: 'test',
                script: {
                  type: 'text/javascript',
                  exec: [
                    'pm.test("Employee created successfully", function () {',
                    '    pm.response.to.have.status(201);',
                    '    const response = pm.response.json();',
                    '    pm.expect(response.success).to.be.true;',
                    '    pm.expect(response.data.id).to.exist;',
                    '    ',
                    '    pm.collectionVariables.set("test_employee_id", response.data.id);',
                    '});',
                    '',
                    'pm.test("Employee has correct data", function () {',
                    '    const response = pm.response.json();',
                    '    pm.expect(response.data.firstName).to.eql("Test");',
                    '    pm.expect(response.data.lastName).to.eql("Employee");',
                    '    pm.expect(response.data.position).to.eql("Security Guard");',
                    '    pm.expect(response.data.hourlyRate).to.eql(25.00);',
                    '});'
                  ]
                }
              }]
            },
            {
              name: 'Get Test Employee',
              request: {
                method: 'GET',
                header: [
                  {
                    key: 'Authorization',
                    value: 'Bearer {{access_token}}',
                    type: 'text'
                  }
                ],
                url: {
                  raw: '{{base_url}}/employees/{{test_employee_id}}',
                  host: ['{{base_url}}'],
                  path: ['employees', '{{test_employee_id}}']
                }
              },
              event: [{
                listen: 'test',
                script: {
                  type: 'text/javascript',
                  exec: [
                    'pm.test("Employee retrieved successfully", function () {',
                    '    pm.response.to.have.status(200);',
                    '    const response = pm.response.json();',
                    '    pm.expect(response.success).to.be.true;',
                    '    pm.expect(response.data.id).to.eql(pm.collectionVariables.get("test_employee_id"));',
                    '});'
                  ]
                }
              }]
            },
            {
              name: 'Update Test Employee',
              request: {
                method: 'PATCH',
                header: [
                  {
                    key: 'Content-Type',
                    value: 'application/json',
                    type: 'text'
                  },
                  {
                    key: 'Authorization',
                    value: 'Bearer {{access_token}}',
                    type: 'text'
                  }
                ],
                body: {
                  mode: 'raw',
                  raw: JSON.stringify({
                    hourlyRate: 30.00,
                    position: 'Senior Security Guard'
                  }, null, 2)
                },
                url: {
                  raw: '{{base_url}}/employees/{{test_employee_id}}',
                  host: ['{{base_url}}'],
                  path: ['employees', '{{test_employee_id}}']
                }
              },
              event: [{
                listen: 'test',
                script: {
                  type: 'text/javascript',
                  exec: [
                    'pm.test("Employee updated successfully", function () {',
                    '    pm.response.to.have.status(200);',
                    '    const response = pm.response.json();',
                    '    pm.expect(response.success).to.be.true;',
                    '    pm.expect(response.data.hourlyRate).to.eql(30.00);',
                    '    pm.expect(response.data.position).to.eql("Senior Security Guard");',
                    '});'
                  ]
                }
              }]
            }
          ]
        },
        {
          name: 'Cleanup Tests',
          item: [
            {
              name: 'Delete Test Employee',
              request: {
                method: 'DELETE',
                header: [
                  {
                    key: 'Authorization',
                    value: 'Bearer {{access_token}}',
                    type: 'text'
                  }
                ],
                url: {
                  raw: '{{base_url}}/employees/{{test_employee_id}}',
                  host: ['{{base_url}}'],
                  path: ['employees', '{{test_employee_id}}']
                }
              },
              event: [{
                listen: 'test',
                script: {
                  type: 'text/javascript',
                  exec: [
                    'pm.test("Employee deleted successfully", function () {',
                    '    pm.response.to.have.status(200);',
                    '    const response = pm.response.json();',
                    '    pm.expect(response.success).to.be.true;',
                    '});'
                  ]
                }
              }]
            }
          ]
        }
      ]
    };
  }
  /**
   * Generate onboarding collection for new developers
   */
  private static generateOnboardingCollection(): PostmanCollection {
    return {
      info: {
        name: 'Payroll API - Developer Onboarding',
        description: 'Step-by-step guide for new developers to get started with the API',
        version: '1.0.0',
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/postman_collection.json'
      },
      variable: [
        {
          key: 'base_url',
          value: 'http://localhost:3005/api/v1'
        }
      ],
      item: [
        {
          name: '1. Getting Started',
          description: 'Basic API exploration and health checks',
          item: [
            {
              name: '1.1 Check API Health',
              description: 'Verify that the API is running and accessible',
              request: {
                method: 'GET',
                header: [],
                url: {
                  raw: '{{base_url}}/health',
                  host: ['{{base_url}}'],
                  path: ['health']
                }
              },
              event: [{
                listen: 'test',
                script: {
                  type: 'text/javascript',
                  exec: [
                    '// This is your first API test!',
                    'pm.test("API is running", function () {',
                    '    pm.response.to.have.status(200);',
                    '    console.log("✅ API is healthy and running!");',
                    '});',
                    '',
                    'pm.test("Response format is correct", function () {',
                    '    const response = pm.response.json();',
                    '    pm.expect(response.status).to.eql("healthy");',
                    '    console.log("✅ API response format is correct!");',
                    '});'
                  ]
                }
              }]
            },
            {
              name: '1.2 Get API Documentation',
              description: 'Access the Swagger documentation endpoint',
              request: {
                method: 'GET',
                header: [],
                url: {
                  raw: '{{base_url}}/../docs-json',
                  host: ['{{base_url}}'],
                  path: ['..', 'docs-json']
                }
              },
              event: [{
                listen: 'test',
                script: {
                  type: 'text/javascript',
                  exec: [
                    'pm.test("Documentation is accessible", function () {',
                    '    pm.response.to.have.status(200);',
                    '    const openapi = pm.response.json();',
                    '    pm.expect(openapi.openapi).to.exist;',
                    '    pm.expect(openapi.info.title).to.include("Payroll");',
                    '    console.log("✅ API documentation is accessible at /docs");',
                    '});'
                  ]
                }
              }]
            }
          ]
        },
        {
          name: '2. Authentication Flow',
          description: 'Learn how to authenticate with the API',
          item: [
            {
              name: '2.1 Login as Admin',
              description: 'Authenticate as an administrator to get access tokens',
              request: {
                method: 'POST',
                header: [
                  {
                    key: 'Content-Type',
                    value: 'application/json',
                    type: 'text'
                  }
                ],
                body: {
                  mode: 'raw',
                  raw: JSON.stringify({
                    email: 'admin@company.com',
                    password: 'password'
                  }, null, 2)
                },
                url: {
                  raw: '{{base_url}}/auth/login',
                  host: ['{{base_url}}'],
                  path: ['auth', 'login']
                }
              },
              event: [{
                listen: 'test',
                script: {
                  type: 'text/javascript',
                  exec: [
                    'pm.test("Login successful", function () {',
                    '    pm.response.to.have.status(200);',
                    '    const response = pm.response.json();',
                    '    pm.expect(response.success).to.be.true;',
                    '    ',
                    '    // Extract and store tokens',
                    '    const tokens = response.data.tokens;',
                    '    pm.collectionVariables.set("access_token", tokens.accessToken);',
                    '    pm.collectionVariables.set("refresh_token", tokens.refreshToken);',
                    '    ',
                    '    console.log("✅ Successfully logged in!");',
                    '    console.log("🔑 Access token stored for subsequent requests");',
                    '});',
                    '',
                    'pm.test("User profile included", function () {',
                    '    const response = pm.response.json();',
                    '    pm.expect(response.data.user).to.exist;',
                    '    pm.expect(response.data.user.email).to.eql("admin@company.com");',
                    '    console.log("👤 User profile: " + response.data.user.role);',
                    '});'
                  ]
                }
              }]
            },
            {
              name: '2.2 Get Current User Profile',
              description: 'Use the access token to get your user profile',
              request: {
                method: 'GET',
                header: [
                  {
                    key: 'Authorization',
                    value: 'Bearer {{access_token}}',
                    type: 'text'
                  }
                ],
                url: {
                  raw: '{{base_url}}/auth/profile',
                  host: ['{{base_url}}'],
                  path: ['auth', 'profile']
                }
              },
              event: [{
                listen: 'test',
                script: {
                  type: 'text/javascript',
                  exec: [
                    'pm.test("Profile retrieved with token", function () {',
                    '    pm.response.to.have.status(200);',
                    '    const response = pm.response.json();',
                    '    pm.expect(response.success).to.be.true;',
                    '    pm.expect(response.data.email).to.exist;',
                    '    ',
                    '    console.log("✅ Successfully authenticated request!");',
                    '    console.log("🏢 Company: " + (response.data.tenantId || "N/A"));',
                    '});'
                  ]
                }
              }]
            }
          ]
        },
        {
          name: '3. Basic CRUD Operations',
          description: 'Learn the fundamental Create, Read, Update, Delete operations',
          item: [
            {
              name: '3.1 List Employees',
              description: 'Get a paginated list of employees',
              request: {
                method: 'GET',
                header: [
                  {
                    key: 'Authorization',
                    value: 'Bearer {{access_token}}',
                    type: 'text'
                  }
                ],
                url: {
                  raw: '{{base_url}}/employees?page=1&limit=5',
                  host: ['{{base_url}}'],
                  path: ['employees'],
                  query: [
                    {
                      key: 'page',
                      value: '1'
                    },
                    {
                      key: 'limit',
                      value: '5'
                    }
                  ]
                }
              },
              event: [{
                listen: 'test',
                script: {
                  type: 'text/javascript',
                  exec: [
                    'pm.test("Employee list retrieved", function () {',
                    '    pm.response.to.have.status(200);',
                    '    const response = pm.response.json();',
                    '    pm.expect(response.success).to.be.true;',
                    '    pm.expect(response.data).to.be.an("array");',
                    '    ',
                    '    console.log("✅ Found " + response.data.length + " employees");',
                    '    ',
                    '    if (response.metadata.pagination) {',
                    '        console.log("📄 Page " + response.metadata.pagination.page + ' +
                    '                   " of " + response.metadata.pagination.totalPages);',
                    '    }',
                    '});'
                  ]
                }
              }]
            },
            {
              name: '3.2 Create New Employee',
              description: 'Create a new employee record',
              request: {
                method: 'POST',
                header: [
                  {
                    key: 'Content-Type',
                    value: 'application/json',
                    type: 'text'
                  },
                  {
                    key: 'Authorization',
                    value: 'Bearer {{access_token}}',
                    type: 'text'
                  }
                ],
                body: {
                  mode: 'raw',
                  raw: JSON.stringify({
                    firstName: 'New',
                    lastName: 'Developer',
                    email: 'new.developer@company.com',
                    phoneNumber: '+1-555-0199',
                    employeeId: 'DEV001',
                    position: 'Security Guard',
                    hireDate: '2024-03-15',
                    hourlyRate: 22.00,
                    skills: ['Security Guard']
                  }, null, 2)
                },
                url: {
                  raw: '{{base_url}}/employees',
                  host: ['{{base_url}}'],
                  path: ['employees']
                }
              },
              event: [{
                listen: 'test',
                script: {
                  type: 'text/javascript',
                  exec: [
                    'pm.test("Employee created successfully", function () {',
                    '    pm.response.to.have.status(201);',
                    '    const response = pm.response.json();',
                    '    pm.expect(response.success).to.be.true;',
                    '    pm.expect(response.data.id).to.exist;',
                    '    ',
                    '    // Store the new employee ID for next steps',
                    '    pm.collectionVariables.set("new_employee_id", response.data.id);',
                    '    ',
                    '    console.log("✅ Created employee with ID: " + response.data.id);',
                    '    console.log("💼 Position: " + response.data.position);',
                    '});'
                  ]
                }
              }]
            },
            {
              name: '3.3 Get Employee by ID',
              description: 'Retrieve the employee we just created',
              request: {
                method: 'GET',
                header: [
                  {
                    key: 'Authorization',
                    value: 'Bearer {{access_token}}',
                    type: 'text'
                  }
                ],
                url: {
                  raw: '{{base_url}}/employees/{{new_employee_id}}',
                  host: ['{{base_url}}'],
                  path: ['employees', '{{new_employee_id}}']
                }
              },
              event: [{
                listen: 'test',
                script: {
                  type: 'text/javascript',
                  exec: [
                    'pm.test("Retrieved employee by ID", function () {',
                    '    pm.response.to.have.status(200);',
                    '    const response = pm.response.json();',
                    '    pm.expect(response.success).to.be.true;',
                    '    pm.expect(response.data.firstName).to.eql("New");',
                    '    pm.expect(response.data.lastName).to.eql("Developer");',
                    '    ',
                    '    console.log("✅ Successfully retrieved: " + ' +
                    '               response.data.firstName + " " + response.data.lastName);',
                    '});'
                  ]
                }
              }]
            }
          ]
        },
        {
          name: '4. Error Handling',
          description: 'Learn how the API handles errors',
          item: [
            {
              name: '4.1 Try Invalid Endpoint',
              description: 'See what happens when you access a non-existent endpoint',
              request: {
                method: 'GET',
                header: [
                  {
                    key: 'Authorization',
                    value: 'Bearer {{access_token}}',
                    type: 'text'
                  }
                ],
                url: {
                  raw: '{{base_url}}/nonexistent-endpoint',
                  host: ['{{base_url}}'],
                  path: ['nonexistent-endpoint']
                }
              },
              event: [{
                listen: 'test',
                script: {
                  type: 'text/javascript',
                  exec: [
                    'pm.test("Handles 404 errors properly", function () {',
                    '    pm.response.to.have.status(404);',
                    '    console.log("✅ API properly returns 404 for invalid endpoints");',
                    '});'
                  ]
                }
              }]
            },
            {
              name: '4.2 Try Unauthorized Request',
              description: 'See what happens without authentication',
              request: {
                method: 'GET',
                header: [],
                url: {
                  raw: '{{base_url}}/employees',
                  host: ['{{base_url}}'],
                  path: ['employees']
                }
              },
              event: [{
                listen: 'test',
                script: {
                  type: 'text/javascript',
                  exec: [
                    'pm.test("Requires authentication", function () {',
                    '    pm.response.to.have.status(401);',
                    '    const response = pm.response.json();',
                    '    pm.expect(response.success).to.be.false;',
                    '    pm.expect(response.error.code).to.exist;',
                    '    ',
                    '    console.log("🔒 API properly requires authentication");',
                    '    console.log("Error code: " + response.error.code);',
                    '});'
                  ]
                }
              }]
            }
          ]
        },
        {
          name: '5. Congratulations!',
          description: 'You have completed the onboarding tutorial',
          item: [
            {
              name: '5.1 Summary',
              description: 'Review what you have learned',
              request: {
                method: 'GET',
                header: [
                  {
                    key: 'Authorization',
                    value: 'Bearer {{access_token}}',
                    type: 'text'
                  }
                ],
                url: {
                  raw: '{{base_url}}/dashboard/summary',
                  host: ['{{base_url}}'],
                  path: ['dashboard', 'summary']
                }
              },
              event: [{
                listen: 'test',
                script: {
                  type: 'text/javascript',
                  exec: [
                    'pm.test("Onboarding completed!", function () {',
                    '    pm.response.to.have.status(200);',
                    '    ',
                    '    console.log("🎉 Congratulations! You have completed the API onboarding.");',
                    '    console.log("");',
                    '    console.log("What you learned:");',
                    '    console.log("✅ How to check API health");',
                    '    console.log("✅ How to authenticate with login");',
                    '    console.log("✅ How to use JWT tokens in requests");',
                    '    console.log("✅ How to perform CRUD operations");',
                    '    console.log("✅ How the API handles errors");',
                    '    console.log("");',
                    '    console.log("Next steps:");',
                    '    console.log("📚 Explore the full API documentation at /docs");',
                    '    console.log("🔍 Try the comprehensive test collection");',
                    '    console.log("🛠 Start building your integration!");',
                    '});'
                  ]
                }
              }]
            }
          ]
        }
      ]
    };
  }
}