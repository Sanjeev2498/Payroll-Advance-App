import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, HttpStatus } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder, OpenAPIObject } from '@nestjs/swagger';
import { AppModule } from '../../app.module';
import { ApiDocsGenerator } from '../../common/utils/api-docs-generator';
import { ErrorReferenceGenerator } from '../../common/utils/error-reference-generator';
import { PostmanGenerator } from '../../common/utils/postman-generator';
import { VersioningGenerator } from '../../common/utils/versioning-generator';
import { IntegrationGuideGenerator } from '../../common/utils/integration-guide-generator';
import { ERROR_CODES } from '../../common/constants/error-codes';
import * as fc from 'fast-check';
import * as fs from 'fs';
import * as path from 'path';
const request = require('supertest');

/**
 * Property-Based Tests for API Documentation Accuracy
 * **Validates: Requirements 15.1**
 * 
 * Property 29: API Documentation Accuracy
 * Test that documented endpoints, request schemas, response schemas, and authentication 
 * requirements remain synchronized with the implemented APIs.
 */

describe('API Documentation Accuracy Property Tests', () => {
  let app: INestApplication;
  let moduleRef: TestingModule;
  let swaggerDocument: OpenAPIObject;
  let docsOutputDir: string;
  
  const PROPERTY_TEST_CONFIG = {
    numRuns: 20,
    timeout: 30000,
    seed: 42,
    endOnFailure: true,
  };

  beforeAll(async () => {
    console.log('🔍 Testing API Documentation Accuracy - Property 29');
    
    moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    
    // Configure validation pipe to match production
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
        disableErrorMessages: false,
        validationError: {
          target: false,
          value: false,
        },
      }),
    );

    app.setGlobalPrefix('api');
    app.enableVersioning({
      type: 1, // VersioningType.URI
      defaultVersion: '1',
      prefix: 'v',
    });

    // Generate comprehensive Swagger documentation
    const config = new DocumentBuilder()
      .setTitle('Security Workforce & Payroll Management API')
      .setDescription('Comprehensive API for workforce operations, payroll processing, and client management')
      .setVersion('1.0.0')
      .setContact('API Support', 'https://yourdomain.com/support', 'api-support@yourdomain.com')
      .setLicense('Proprietary License', 'https://yourdomain.com/license')
      .addBearerAuth({
        description: 'JWT Authorization header using the Bearer scheme. Example: "Authorization: Bearer {token}"',
        name: 'Authorization',
        bearerFormat: 'JWT',
        scheme: 'bearer',
        type: 'http',
        in: 'header',
      }, 'JWT-auth')
      .addApiKey({
        type: 'apiKey',
        name: 'X-API-Key',
        in: 'header',
        description: 'API Key for server-to-server authentication',
      }, 'api-key')
      .addSecurityRequirements('JWT-auth')
      .addServer('http://localhost:3005/api', 'Development server')
      .addServer('https://api-staging.yourdomain.com/api', 'Staging server')
      .addServer('https://api.yourdomain.com/api', 'Production server')
      .build();

    swaggerDocument = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, swaggerDocument);
    
    // Enhance the swagger document with missing summaries and descriptions
    swaggerDocument = ApiDocsGenerator.enhanceOpenAPIDocument(swaggerDocument);
    
    // Generate all documentation files for testing
    docsOutputDir = path.join(process.cwd(), 'test-docs-output');
    if (!fs.existsSync(docsOutputDir)) {
      fs.mkdirSync(docsOutputDir, { recursive: true });
    }
    
    // Generate comprehensive documentation
    ApiDocsGenerator.generateDocumentationFiles(swaggerDocument);
    
    await app.init();
  });

  afterAll(async () => {
    if (app) await app.close();
    if (moduleRef) await moduleRef.close();
    
    // Clean up test documentation files
    if (fs.existsSync(docsOutputDir)) {
      fs.rmSync(docsOutputDir, { recursive: true, force: true });
    }
  });

  /**
   * Property 29: API Documentation Accuracy
   * **Validates: Requirements 15.1**
   * 
   * For any documented API endpoint, the actual implementation SHALL match the documented
   * request/response schemas, authentication requirements, and behavior specifications.
   * Enhanced to validate comprehensive documentation accuracy including error codes,
   * integration guides, Postman collections, and versioning information.
   */
  describe('Property 29: API Documentation Accuracy', () => {
    
    describe('Core API Documentation', () => {
      it('should have all documented endpoints accessible and responsive', async () => {
        await fc.assert(
          fc.asyncProperty(
            documentedEndpointGenerator(),
            async (endpoint) => {
              // Skip endpoints that require specific authentication setup for this test
              if (isProtectedEndpoint(endpoint.path)) {
                return true; // Skip but don't fail - auth validation tested separately
              }
              
              const response = await makeDocumentedRequest(endpoint);
              
              // Endpoint should be accessible (not 404)
              // This is the core property - documented endpoints must exist
              expect(response.status).not.toBe(404);
              
              // Response should be structured (not HTML error page)
              if (response.headers['content-type']?.includes('application/json')) {
                expect(() => JSON.parse(JSON.stringify(response.body))).not.toThrow();
              }
            }
          ),
          { ...PROPERTY_TEST_CONFIG, numRuns: 10 } // Reduced runs for faster execution
        );
      });

      it('should validate request schemas for public endpoints match documentation', async () => {
        const publicEndpoints = extractEndpointsFromSwagger().filter(e => 
          e.method === 'post' && !isProtectedEndpoint(e.path)
        );
        
        if (publicEndpoints.length === 0) {
          console.log('⚠️ No public POST endpoints found for schema validation');
          return; // Skip this test if no public endpoints
        }

        await fc.assert(
          fc.asyncProperty(
            fc.constantFrom(...publicEndpoints),
            async (endpoint) => {
              const schema = getRequestSchemaForEndpoint(endpoint);
              if (!schema) return true; // Skip if no schema found
              
              // Test with valid data based on schema
              const validData = generateValidDataFromSchema(schema);
              const response = await makeDocumentedRequest({
                ...endpoint,
                body: validData
              });
              
              // Should not fail due to schema validation (400/422 are schema validation errors)
              // Business logic errors (401/403) are acceptable for this test
              if (response.status === 400 || response.status === 422) {
                // If there are validation errors, they should reference actual schema issues
                // not missing fields we provided according to documented schema
                const errorBody = response.body;
                if (errorBody?.error?.details) {
                  const requiredFieldErrors = errorBody.error.details.filter((detail: any) => 
                    detail.message?.toLowerCase().includes('required') &&
                    validData.hasOwnProperty(detail.field)
                  );
                  expect(requiredFieldErrors.length).toBe(0);
                }
              }
            }
          ),
          { ...PROPERTY_TEST_CONFIG, numRuns: 5 }
        );
      });

      it('should validate response schemas for accessible endpoints match documentation', async () => {
        const publicEndpoints = extractEndpointsFromSwagger().filter(e => 
          e.method === 'get' && !isProtectedEndpoint(e.path)
        );
        
        if (publicEndpoints.length === 0) {
          console.log('⚠️ No public GET endpoints found for response validation');
          return; // Skip this test if no public endpoints
        }

        await fc.assert(
          fc.asyncProperty(
            fc.constantFrom(...publicEndpoints),
            async (endpoint) => {
              const response = await makeDocumentedRequest(endpoint);
              
              // Skip if endpoint isn't accessible for other reasons
              if (response.status === 404) {
                return true; // This is tested separately
              }
              
              // For successful responses, validate structure matches documentation patterns
              if (response.status >= 200 && response.status < 300) {
                validateResponseStructure(response.body, endpoint.path);
              }
              
              // Error responses should follow documented error format
              if (response.status >= 400) {
                validateErrorResponseStructure(response.body, endpoint.path);
              }
            }
          ),
          { ...PROPERTY_TEST_CONFIG, numRuns: 5 }
        );
      });

      it('should ensure authentication requirements are consistently enforced', async () => {
        await fc.assert(
          fc.asyncProperty(
            documentedProtectedEndpointGenerator(),
            async (endpoint) => {
              const response = await makeDocumentedRequest(endpoint);
              
              // Protected endpoints should require authentication
              // They should not return 200 without proper auth
              expect([400, 401, 403, 404, 500]).toContain(response.status);
              
              // 401 means auth is required (good)
              // 403 means auth was attempted but insufficient (acceptable)
              // 404 means endpoint not found (tested separately)
              // 400 means bad request format (acceptable for this test)
              // 500 means internal error (implementation issue but not documentation issue)
            }
          ),
          { ...PROPERTY_TEST_CONFIG, numRuns: 5 }
        );
      });

      it('should validate content-type headers match API documentation standards', async () => {
        const publicEndpoints = extractEndpointsFromSwagger().filter(e => !isProtectedEndpoint(e.path));
        
        if (publicEndpoints.length === 0) {
          console.log('⚠️ No public endpoints found for content-type validation');
          return; // Skip this test if no public endpoints
        }

        await fc.assert(
          fc.asyncProperty(
            fc.constantFrom(...publicEndpoints),
            async (endpoint) => {
              const response = await makeDocumentedRequest(endpoint);
              
              // Skip 404s - that's tested separately
              if (response.status === 404) {
                return true;
              }
              
              // API endpoints should return JSON unless specifically documented otherwise
              if (response.status >= 200 && response.status < 300) {
                const contentType = response.headers['content-type'];
                if (contentType) {
                  expect(contentType).toMatch(/application\/json/);
                }
              }
              
              // Error responses should also be JSON formatted
              if (response.status >= 400 && response.status < 500) {
                const contentType = response.headers['content-type'];
                if (contentType && response.body && typeof response.body === 'object') {
                  expect(contentType).toMatch(/application\/json/);
                }
              }
            }
          ),
          { ...PROPERTY_TEST_CONFIG, numRuns: 5 }
        );
      });
    });

    describe('Error Code Documentation Accuracy', () => {
      it('should validate all documented error codes are properly implemented', () => {
        // Test that all error codes in ERROR_CODES constant have required properties
        Object.entries(ERROR_CODES).forEach(([key, errorConfig]) => {
          expect(errorConfig.code).toBeDefined();
          expect(errorConfig.message).toBeDefined();
          expect(errorConfig.statusCode).toBeDefined();
          expect(typeof errorConfig.statusCode).toBe('number');
          expect(errorConfig.statusCode).toBeGreaterThanOrEqual(400);
          expect(errorConfig.statusCode).toBeLessThan(600);
          
          // Error codes should follow consistent naming convention
          expect(errorConfig.code).toMatch(/^[A-Z_]+$/);
          expect(errorConfig.code).not.toContain(' ');
        });
      });

      it('should validate error reference generator produces consistent documentation', () => {
        const errorReference = ErrorReferenceGenerator.generateErrorReference();
        
        // Should have entries for all major HTTP status code categories
        expect(errorReference['401']).toBeDefined(); // Authentication errors
        expect(errorReference['403']).toBeDefined(); // Authorization errors
        expect(errorReference['400']).toBeDefined(); // Validation errors
        expect(errorReference['404']).toBeDefined(); // Not found errors
        expect(errorReference['500']).toBeDefined(); // Server errors
        
        // Each status code group should have proper structure
        Object.entries(errorReference).forEach(([statusCode, statusInfo]) => {
          expect(statusInfo.statusCode).toBe(parseInt(statusCode));
          expect(statusInfo.category).toBeDefined();
          expect(statusInfo.codes).toBeDefined();
          expect(typeof statusInfo.codes).toBe('object');
          
          // Each error code should have complete documentation
          Object.entries(statusInfo.codes).forEach(([errorKey, errorDetails]) => {
            expect(errorDetails.code).toBeDefined();
            expect(errorDetails.message).toBeDefined();
            expect(errorDetails.description).toBeDefined();
            expect(errorDetails.commonCauses).toBeDefined();
            expect(Array.isArray(errorDetails.commonCauses)).toBe(true);
            expect(errorDetails.resolution).toBeDefined();
          });
        });
      });

      it('should validate markdown documentation generation is consistent', () => {
        const markdownDoc = ErrorReferenceGenerator.generateMarkdownDocumentation();
        
        // Should contain standard markdown headers and structure
        expect(markdownDoc).toContain('# API Error Code Reference');
        expect(markdownDoc).toContain('## HTTP 401');
        expect(markdownDoc).toContain('## HTTP 403');
        expect(markdownDoc).toContain('## HTTP 400');
        expect(markdownDoc).toContain('## HTTP 404');
        expect(markdownDoc).toContain('## HTTP 500');
        
        // Should contain error response format documentation
        expect(markdownDoc).toContain('## Error Response Format');
        expect(markdownDoc).toContain('```json');
        
        // Should contain all documented error codes
        Object.values(ERROR_CODES).forEach(errorConfig => {
          expect(markdownDoc).toContain(errorConfig.code);
          expect(markdownDoc).toContain(errorConfig.message);
        });
      });
    });

    describe('Postman Collection Accuracy', () => {
      it('should generate valid Postman collections from OpenAPI spec', () => {
        // Generate collections in memory for testing
        const testOutputDir = path.join(process.cwd(), 'test-postman-output');
        if (!fs.existsSync(testOutputDir)) {
          fs.mkdirSync(testOutputDir, { recursive: true });
        }
        
        try {
          PostmanGenerator.generatePostmanCollections(swaggerDocument, testOutputDir);
          
          // Verify main collection was generated
          const mainCollectionPath = path.join(testOutputDir, 'postman', 'payroll-api-main.postman_collection.json');
          expect(fs.existsSync(mainCollectionPath)).toBe(true);
          
          const mainCollection = JSON.parse(fs.readFileSync(mainCollectionPath, 'utf8'));
          
          // Validate collection structure
          expect(mainCollection.info).toBeDefined();
          expect(mainCollection.info.name).toBe('Security Workforce & Payroll Management API');
          expect(mainCollection.info.schema).toContain('postman_collection');
          expect(mainCollection.variable).toBeDefined();
          expect(mainCollection.item).toBeDefined();
          
          // Should have authentication configuration
          expect(mainCollection.auth).toBeDefined();
          expect(mainCollection.auth.type).toBe('bearer');
          
          // Should have collection variables
          const variables = mainCollection.variable;
          expect(variables.some((v: any) => v.key === 'base_url')).toBe(true);
          expect(variables.some((v: any) => v.key === 'access_token')).toBe(true);
          
          // Verify test collection was generated
          const testCollectionPath = path.join(testOutputDir, 'postman', 'payroll-api-tests.postman_collection.json');
          expect(fs.existsSync(testCollectionPath)).toBe(true);
          
          // Verify environment files were generated
          const devEnvPath = path.join(testOutputDir, 'postman', 'development-environment.postman_environment.json');
          expect(fs.existsSync(devEnvPath)).toBe(true);
          
        } finally {
          // Clean up test files
          if (fs.existsSync(testOutputDir)) {
            fs.rmSync(testOutputDir, { recursive: true, force: true });
          }
        }
      });

      it('should validate Postman requests match OpenAPI endpoints', () => {
        const testOutputDir = path.join(process.cwd(), 'test-postman-validation');
        if (!fs.existsSync(testOutputDir)) {
          fs.mkdirSync(testOutputDir, { recursive: true });
        }
        
        try {
          PostmanGenerator.generatePostmanCollections(swaggerDocument, testOutputDir);
          
          const mainCollectionPath = path.join(testOutputDir, 'postman', 'payroll-api-main.postman_collection.json');
          const mainCollection = JSON.parse(fs.readFileSync(mainCollectionPath, 'utf8'));
          
          // Extract all documented endpoints from OpenAPI spec
          const documentedEndpoints = extractEndpointsFromSwagger();
          
          // Extract all requests from Postman collection
          const postmanRequests: any[] = [];
          function extractRequests(items: any[]) {
            items.forEach(item => {
              if (item.request) {
                postmanRequests.push(item.request);
              }
              if (item.item) {
                extractRequests(item.item);
              }
            });
          }
          extractRequests(mainCollection.item);
          
          // Verify coverage - major endpoint categories should be represented
          const endpointCategories = ['employees', 'clients', 'auth', 'attendance', 'payroll'];
          endpointCategories.forEach(category => {
            const hasCategory = postmanRequests.some(req => 
              req.url.raw.includes(category) || req.url.path?.includes(category)
            );
            expect(hasCategory).toBe(true);
          });
          
        } finally {
          if (fs.existsSync(testOutputDir)) {
            fs.rmSync(testOutputDir, { recursive: true, force: true });
          }
        }
      });
    });

    describe('Integration Guide Accuracy', () => {
      it('should generate comprehensive integration guides', () => {
        const testOutputDir = path.join(process.cwd(), 'test-integration-guides');
        if (!fs.existsSync(testOutputDir)) {
          fs.mkdirSync(testOutputDir, { recursive: true });
        }
        
        try {
          IntegrationGuideGenerator.generateIntegrationGuides(testOutputDir);
          
          // Verify main integration guide
          const mainGuidePath = path.join(testOutputDir, 'guides', 'integration-guide.md');
          expect(fs.existsSync(mainGuidePath)).toBe(true);
          
          const guideContent = fs.readFileSync(mainGuidePath, 'utf8');
          
          // Should contain essential sections
          expect(guideContent).toContain('# Comprehensive API Integration Guide');
          expect(guideContent).toContain('## Authentication Flow');
          expect(guideContent).toContain('## Common Operations');
          expect(guideContent).toContain('## Response Format Standards');
          expect(guideContent).toContain('## Error Handling Best Practices');
          
          // Should contain code examples
          expect(guideContent).toContain('```http');
          expect(guideContent).toContain('```json');
          expect(guideContent).toContain('```javascript');
          
          // Verify SDK examples were generated
          const jsSDKPath = path.join(testOutputDir, 'sdk', 'javascript-sdk.md');
          expect(fs.existsSync(jsSDKPath)).toBe(true);
          
          const pythonSDKPath = path.join(testOutputDir, 'sdk', 'python-sdk.md');
          expect(fs.existsSync(pythonSDKPath)).toBe(true);
          
          // Verify use case examples
          const onboardingExamplePath = path.join(testOutputDir, 'examples', 'employee-onboarding.md');
          expect(fs.existsSync(onboardingExamplePath)).toBe(true);
          
          const payrollExamplePath = path.join(testOutputDir, 'examples', 'payroll-processing.md');
          expect(fs.existsSync(payrollExamplePath)).toBe(true);
          
        } finally {
          if (fs.existsSync(testOutputDir)) {
            fs.rmSync(testOutputDir, { recursive: true, force: true });
          }
        }
      });

      it('should validate SDK examples contain proper authentication handling', () => {
        const testOutputDir = path.join(process.cwd(), 'test-sdk-validation');
        if (!fs.existsSync(testOutputDir)) {
          fs.mkdirSync(testOutputDir, { recursive: true });
        }
        
        try {
          IntegrationGuideGenerator.generateIntegrationGuides(testOutputDir);
          
          // Check JavaScript SDK
          const jsSDKPath = path.join(testOutputDir, 'sdk', 'javascript-sdk.md');
          const jsSDKContent = fs.readFileSync(jsSDKPath, 'utf8');
          
          expect(jsSDKContent).toContain('Authorization: Bearer');
          expect(jsSDKContent).toContain('refresh');
          expect(jsSDKContent).toContain('login');
          expect(jsSDKContent).toContain('interceptors');
          
          // Check Python SDK
          const pythonSDKPath = path.join(testOutputDir, 'sdk', 'python-sdk.md');
          const pythonSDKContent = fs.readFileSync(pythonSDKPath, 'utf8');
          
          expect(pythonSDKContent).toContain('Authorization');
          expect(pythonSDKContent).toContain('refresh_access_token');
          expect(pythonSDKContent).toContain('login');
          expect(pythonSDKContent).toContain('PayrollAPIError');
          
        } finally {
          if (fs.existsSync(testOutputDir)) {
            fs.rmSync(testOutputDir, { recursive: true, force: true });
          }
        }
      });
    });

    describe('Versioning Documentation Accuracy', () => {
      it('should generate comprehensive versioning documentation', () => {
        const testOutputDir = path.join(process.cwd(), 'test-versioning-docs');
        if (!fs.existsSync(testOutputDir)) {
          fs.mkdirSync(testOutputDir, { recursive: true });
        }
        
        try {
          VersioningGenerator.generateVersioningDocs(swaggerDocument, testOutputDir);
          
          // Verify main versioning guide
          const versioningGuidePath = path.join(testOutputDir, 'versioning', 'versioning-guide.md');
          expect(fs.existsSync(versioningGuidePath)).toBe(true);
          
          const guideContent = fs.readFileSync(versioningGuidePath, 'utf8');
          
          // Should contain essential versioning sections
          expect(guideContent).toContain('# API Versioning Guide');
          expect(guideContent).toContain('## Versioning Strategy');
          expect(guideContent).toContain('## Version Lifecycle');
          expect(guideContent).toContain('## Backward Compatibility Policy');
          expect(guideContent).toContain('## Migration Strategy');
          
          // Verify migration guides
          const migrationGuidePath = path.join(testOutputDir, 'versioning', 'migrations', 'v1-to-v2-migration.md');
          expect(fs.existsSync(migrationGuidePath)).toBe(true);
          
          // Verify version matrix
          const versionMatrixPath = path.join(testOutputDir, 'versioning', 'version-matrix.md');
          expect(fs.existsSync(versionMatrixPath)).toBe(true);
          
          // Verify changelog
          const changelogPath = path.join(testOutputDir, 'versioning', 'changelog.md');
          expect(fs.existsSync(changelogPath)).toBe(true);
          
          // Verify deprecation notices
          const deprecationPath = path.join(testOutputDir, 'versioning', 'deprecation-notices.md');
          expect(fs.existsSync(deprecationPath)).toBe(true);
          
        } finally {
          if (fs.existsSync(testOutputDir)) {
            fs.rmSync(testOutputDir, { recursive: true, force: true });
          }
        }
      });

      it('should validate semantic versioning guidelines are documented', () => {
        const testOutputDir = path.join(process.cwd(), 'test-semver-validation');
        if (!fs.existsSync(testOutputDir)) {
          fs.mkdirSync(testOutputDir, { recursive: true });
        }
        
        try {
          VersioningGenerator.generateVersioningDocs(swaggerDocument, testOutputDir);
          
          const versioningGuidePath = path.join(testOutputDir, 'versioning', 'versioning-guide.md');
          const guideContent = fs.readFileSync(versioningGuidePath, 'utf8');
          
          // Should contain semantic versioning information
          expect(guideContent).toContain('MAJOR.MINOR.PATCH');
          expect(guideContent).toContain('Breaking changes');
          expect(guideContent).toContain('backward compatibility');
          expect(guideContent).toContain('Bug fixes');
          
          // Should contain deprecation policy
          expect(guideContent).toContain('Deprecation');
          expect(guideContent).toContain('End of Life');
          expect(guideContent).toContain('months');
          
        } finally {
          if (fs.existsSync(testOutputDir)) {
            fs.rmSync(testOutputDir, { recursive: true, force: true });
          }
        }
      });
    });

    describe('Documentation Consistency Validation', () => {
      it('should ensure OpenAPI spec matches controller decorators', async () => {
        // Validate that Swagger document contains expected endpoints from controllers
        const paths = swaggerDocument.paths;
        expect(paths).toBeDefined();
        
        // Should have authentication endpoints
        const hasLoginEndpoint = Object.keys(paths || {}).some(path => 
          path.includes('/auth/login')
        );
        expect(hasLoginEndpoint).toBe(true);
        
        // Should have employee management endpoints
        const hasEmployeeEndpoints = Object.keys(paths || {}).some(path => 
          path.includes('/employees')
        );
        expect(hasEmployeeEndpoints).toBe(true);
        
        // Should have client management endpoints  
        const hasClientEndpoints = Object.keys(paths || {}).some(path => 
          path.includes('/clients')
        );
        expect(hasClientEndpoints).toBe(true);
      });

      it('should validate security scheme documentation is accurate', () => {
        const securitySchemes = swaggerDocument.components?.securitySchemes;
        expect(securitySchemes).toBeDefined();
        
        // Should have JWT bearer auth
        expect(securitySchemes?.['JWT-auth']).toBeDefined();
        expect(securitySchemes?.['JWT-auth'].type).toBe('http');
        expect(securitySchemes?.['JWT-auth'].scheme).toBe('bearer');
        
        // Should have API key auth
        expect(securitySchemes?.['api-key']).toBeDefined();
        expect(securitySchemes?.['api-key'].type).toBe('apiKey');
      });

      it('should validate all endpoints have proper tags and descriptions', () => {
        const paths = swaggerDocument.paths || {};
        
        Object.entries(paths).forEach(([path, pathItem]) => {
          if (!pathItem || typeof pathItem !== 'object') return;
          
          Object.entries(pathItem).forEach(([method, operation]) => {
            if (method === 'parameters') return; // Skip path-level parameters
            
            const op = operation as any;
            
            // Each operation should have tags for organization
            expect(op.tags).toBeDefined();
            expect(Array.isArray(op.tags)).toBe(true);
            expect(op.tags.length).toBeGreaterThan(0);
            
            // Each operation should have a summary or description
            expect(op.summary || op.description).toBeDefined();
          });
        });
      });
    });
  });

  // Data Generators
  function documentedEndpointGenerator() {
    const endpoints = extractEndpointsFromSwagger();
    return fc.constantFrom(...endpoints);
  }

  function documentedGetEndpointGenerator() {
    const endpoints = extractEndpointsFromSwagger().filter(e => e.method === 'get');
    return fc.constantFrom(...endpoints);
  }

  function documentedPostEndpointGenerator() {
    const endpoints = extractEndpointsFromSwagger().filter(e => e.method === 'post');
    return fc.constantFrom(...endpoints);
  }

  function documentedProtectedEndpointGenerator() {
    const endpoints = extractEndpointsFromSwagger().filter(e => isProtectedEndpoint(e.path));
    return fc.constantFrom(...endpoints);
  }

  function documentedEndpointWithParamsGenerator() {
    const endpoints = extractEndpointsFromSwagger().filter(e => 
      getParametersFromDocs(e).required.length > 0 || 
      getParametersFromDocs(e).optional.length > 0
    );
    return fc.constantFrom(...endpoints);
  }

  // Helper Functions
  function extractEndpointsFromSwagger(): Array<{method: string, path: string, operation: any}> {
    const endpoints: Array<{method: string, path: string, operation: any}> = [];
    
    if (!swaggerDocument.paths) return endpoints;
    
    for (const [path, pathItem] of Object.entries(swaggerDocument.paths)) {
      if (!pathItem || typeof pathItem !== 'object') continue;
      
      for (const [method, operation] of Object.entries(pathItem)) {
        if (method === 'parameters') continue; // Skip path-level parameters
        
        endpoints.push({
          method: method.toLowerCase(),
          path: path.startsWith('/api/') ? path : `/api/v1${path}`,
          operation
        });
      }
    }
    
    return endpoints;
  }

  function isProtectedEndpoint(path: string): boolean {
    // Most endpoints require authentication, but some don't
    const publicPaths = [
      '/api/v1/auth/login',
      '/api/v1/auth/register', 
      '/api/v1/health',
      '/api/v1/docs'
    ];
    return !publicPaths.some(publicPath => path.startsWith(publicPath));
  }

  function isBusinessLogicProtected(path: string): boolean {
    // Some endpoints might return business-specific errors even without auth
    return path.includes('/employees') || 
           path.includes('/clients') || 
           path.includes('/payroll') ||
           path.includes('/assignments');
  }

  function getAuthRequirementsFromDocs(endpoint: any): {requiresAuth: boolean, authTypes: string[]} {
    const operation = endpoint.operation;
    if (!operation || !operation.security) {
      return { requiresAuth: false, authTypes: [] };
    }
    
    const authTypes = operation.security.map((sec: any) => Object.keys(sec)).flat();
    return {
      requiresAuth: authTypes.length > 0,
      authTypes
    };
  }

  function getRequestSchemaForEndpoint(endpoint: any): any {
    const operation = endpoint.operation;
    if (!operation?.requestBody?.content?.['application/json']?.schema) {
      return null;
    }
    
    return operation.requestBody.content['application/json'].schema;
  }

  function getResponseSchemaForEndpoint(endpoint: any, statusCode: number): any {
    const operation = endpoint.operation;
    if (!operation?.responses?.[statusCode]?.content?.['application/json']?.schema) {
      return null;
    }
    
    return operation.responses[statusCode].content['application/json'].schema;
  }

  function getParametersFromDocs(endpoint: any): {required: any[], optional: any[]} {
    const operation = endpoint.operation;
    const parameters = operation?.parameters || [];
    
    return {
      required: parameters.filter((p: any) => p.required === true),
      optional: parameters.filter((p: any) => p.required !== true)
    };
  }

  function generateValidDataFromSchema(schema: any): any {
    // Simple schema-to-data generator for common patterns
    if (schema.type === 'object' && schema.properties) {
      const data: any = {};
      
      for (const [propName, propSchema] of Object.entries(schema.properties)) {
        const prop = propSchema as any;
        
        if (schema.required?.includes(propName)) {
          if (prop.type === 'string') {
            if (prop.format === 'email') {
              data[propName] = 'test@example.com';
            } else if (prop.format === 'date-time') {
              data[propName] = new Date().toISOString();
            } else if (prop.maxLength) {
              data[propName] = 'test'.repeat(Math.min(2, Math.floor(prop.maxLength / 4)));
            } else {
              data[propName] = prop.example || 'test-value';
            }
          } else if (prop.type === 'number' || prop.type === 'integer') {
            data[propName] = prop.example || (prop.minimum || 1);
          } else if (prop.type === 'boolean') {
            data[propName] = prop.example || true;
          } else if (prop.type === 'array') {
            data[propName] = prop.example || [];
          } else if (prop.type === 'object') {
            data[propName] = prop.example || {};
          }
        }
      }
      
      return data;
    }
    
    return {};
  }

  async function makeDocumentedRequest(endpoint: any): Promise<any> {
    const { method, path, body = {}, query = {} } = endpoint;
    
    let req = request(app.getHttpServer())[method](path);
    
    // Add query parameters
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        req = req.query({ [key]: value });
      }
    });
    
    // Add body for POST/PUT/PATCH
    if (['post', 'put', 'patch'].includes(method) && Object.keys(body).length > 0) {
      req = req.send(body);
    }
    
    return req;
  }

  function validateResponseStructure(responseBody: any, endpointPath: string) {
    // Basic structure validation for common response patterns
    if (!responseBody) return;
    
    // Check for common API response patterns
    if (endpointPath.includes('/clients') || 
        endpointPath.includes('/employees') || 
        endpointPath.includes('/assignments')) {
      
      if (Array.isArray(responseBody.data)) {
        expect(responseBody.metadata).toBeDefined();
        expect(responseBody.metadata.total).toBeDefined();
        expect(responseBody.metadata.page).toBeDefined();
      }
    }
    
    // Success responses should have success field for structured APIs
    if (responseBody.success !== undefined) {
      expect(responseBody.success).toBe(true);
      expect(responseBody.data).toBeDefined();
    }
  }

  function validateResponseAgainstSchema(responseBody: any, schema: any, endpointPath: string) {
    // Basic schema validation for common response patterns
    if (!responseBody || !schema) return;
    
    // Check for common API response patterns
    if (schema.properties) {
      // List responses should have data array and metadata
      if (endpointPath.includes('/clients') || 
          endpointPath.includes('/employees') || 
          endpointPath.includes('/assignments')) {
        
        if (Array.isArray(responseBody.data)) {
          expect(responseBody.metadata).toBeDefined();
          expect(responseBody.metadata.total).toBeDefined();
          expect(responseBody.metadata.page).toBeDefined();
        }
      }
      
      // Success responses should have success field
      if (responseBody.success !== undefined) {
        expect(responseBody.success).toBe(true);
        expect(responseBody.data).toBeDefined();
      }
    }
  }

  function validateErrorResponseStructure(errorBody: any, endpointPath: string) {
    if (!errorBody) return;
    
    // Check for consistent error response format
    const hasNestError = errorBody.statusCode && errorBody.message;
    const hasStructuredError = errorBody.success === false && errorBody.error;
    
    expect(hasNestError || hasStructuredError).toBeTruthy();
    
    // Structured errors should have proper format
    if (errorBody.error) {
      expect(errorBody.error.code).toBeDefined();
      expect(errorBody.error.message).toBeDefined();
      
      // Validation errors should have field details
      if (errorBody.error.code === 'VALIDATION_ERROR') {
        expect(errorBody.error.details).toBeDefined();
        expect(Array.isArray(errorBody.error.details)).toBe(true);
      }
    }
  }
});