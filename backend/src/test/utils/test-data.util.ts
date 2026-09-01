import { randomUUID } from 'crypto';

/**
 * Utility functions for test data creation with proper ID generation
 */
export class TestDataUtil {
  /**
   * Generate a unique UUID for test entities
   */
  static generateTestId(prefix?: string): string {
    const uuid = randomUUID();
    return uuid; // Return just the UUID, not prefixed
  }

  /**
   * Generate a unique slug for test entities
   */
  static generateTestSlug(prefix: string): string {
    const timestamp = Date.now();
    return `${prefix}-${timestamp}`;
  }

  /**
   * Create test company data with proper ID generation
   */
  static createTestCompanyData(overrides: Partial<any> = {}): any {
    return {
      id: overrides.id || this.generateTestId(),
      name: 'Test Security Company',
      slug: this.generateTestSlug('test-company'),
      settings: {},
      branding: {},
      created_at: new Date(),
      updated_at: new Date(),
      ...overrides,
    };
  }

  /**
   * Create test client data with proper ID generation
   */
  static createTestClientData(companyId: string, overrides: Partial<any> = {}): any {
    return {
      id: overrides.id || this.generateTestId(),
      company_id: companyId,
      name: 'Test Client',
      contact_email: 'client@test.com',
      contact_info: {},
      organization_type: 'CORPORATE_OFFICE',
      contract_status: 'ACTIVE',
      created_at: new Date(),
      updated_at: new Date(),
      ...overrides,
    };
  }

  /**
   * Create test contract data with proper ID generation
   */
  static createTestContractData(clientId: string, overrides: Partial<any> = {}): any {
    return {
      client_id: clientId,
      contract_number: `CONTRACT-${this.generateTestSlug('test')}`,
      title: 'Test Security Services Contract',
      description: 'Security services for test purposes',
      status: 'ACTIVE',
      start_date: new Date('2024-01-01'),
      end_date: new Date('2024-12-31'),
      service_definitions: {},
      billing_preferences: {},
      contract_value: 100000.00,
      created_at: new Date(),
      updated_at: new Date(),
      ...overrides,
    };
  }

  /**
   * Create test employee data with proper ID generation
   */
  static createTestEmployeeData(companyId: string, overrides: Partial<any> = {}): any {
    const uniqueNumber = Date.now().toString().slice(-8);
    return {
      id: overrides.id || this.generateTestId(),
      company_id: companyId,
      employee_number: `EMP${uniqueNumber}`,
      first_name: 'John',
      last_name: 'Doe',
      email: 'john.doe@test.com',
      phone: '+91-9999999999',
      address: { street: 'Test Street', city: 'Test City' },
      employment_status: 'ACTIVE',
      hire_date: new Date('2024-01-01'),
      skills: ['security'],
      created_at: new Date(),
      updated_at: new Date(),
      // Encrypted field placeholders - must be exactly 32 chars or less
      email_iv: 'test_iv_1234567890123456789012',      // 26 chars
      email_tag: 'test_tag_123456789012345678901',     // 27 chars
      phone_iv: 'test_iv_1234567890123456789012',      // 26 chars  
      phone_tag: 'test_tag_123456789012345678901',     // 27 chars
      ...overrides,
    };
  }

  /**
   * Create test site data with proper ID generation
   */
  static createTestSiteData(contractId: string, clientId: string, overrides: Partial<any> = {}): any {
    return {
      id: overrides.id || this.generateTestId(),
      contract_id: contractId,
      client_id: clientId,
      name: 'Test Security Site',
      address: { street: 'Test Site Address', city: 'Test City' },
      operational_status: 'ACTIVE',
      access_requirements: {},
      safety_protocols: {},
      contact_info: {},
      min_staffing_level: 1,
      max_staffing_level: 10,
      created_at: new Date(),
      updated_at: new Date(),
      ...overrides,
    };
  }

  /**
   * Create test user data with proper ID generation
   */
  static createTestUserData(companyId: string, overrides: Partial<any> = {}): any {
    return {
      id: overrides.id || this.generateTestId(),
      company_id: companyId,
      email: 'test@company.com',
      password_hash: '$2b$12$testhashedpassword',
      first_name: 'Test',
      last_name: 'User',
      role: 'COMPANY_ADMIN',
      status: 'ACTIVE',
      created_at: new Date(),
      updated_at: new Date(),
      ...overrides,
    };
  }
}