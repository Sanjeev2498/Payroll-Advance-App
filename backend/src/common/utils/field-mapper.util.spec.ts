import { FieldMapper } from './field-mapper.util';

describe('FieldMapper', () => {
  beforeEach(() => {
    FieldMapper.clearCache();
  });

  describe('toSnakeCase', () => {
    it('should convert camelCase to snake_case', () => {
      expect(FieldMapper.toSnakeCase('employeeNumber')).toBe('employee_number');
      expect(FieldMapper.toSnakeCase('firstName')).toBe('first_name');
      expect(FieldMapper.toSnakeCase('lastName')).toBe('last_name');
    });

    it('should handle single word', () => {
      expect(FieldMapper.toSnakeCase('name')).toBe('name');
      expect(FieldMapper.toSnakeCase('id')).toBe('id');
    });

    it('should handle acronyms', () => {
      expect(FieldMapper.toSnakeCase('URLPath')).toBe('url_path');
      expect(FieldMapper.toSnakeCase('HTTPSConnection')).toBe('https_connection');
    });

    it('should handle numbers', () => {
      expect(FieldMapper.toSnakeCase('address1')).toBe('address1');
      expect(FieldMapper.toSnakeCase('phone2')).toBe('phone2');
    });

    it('should handle already snake_case', () => {
      expect(FieldMapper.toSnakeCase('employee_number')).toBe('employee_number');
      expect(FieldMapper.toSnakeCase('first_name')).toBe('first_name');
    });

    it('should handle fields starting with underscore', () => {
      expect(FieldMapper.toSnakeCase('_id')).toBe('_id');
      expect(FieldMapper.toSnakeCase('__typename')).toBe('__typename');
    });

    it('should handle null and undefined', () => {
      expect(FieldMapper.toSnakeCase(null as any)).toBe(null);
      expect(FieldMapper.toSnakeCase(undefined as any)).toBe(undefined);
    });

    it('should handle empty string', () => {
      expect(FieldMapper.toSnakeCase('')).toBe('');
    });
  });

  describe('toCamelCase', () => {
    it('should convert snake_case to camelCase', () => {
      expect(FieldMapper.toCamelCase('employee_number')).toBe('employeeNumber');
      expect(FieldMapper.toCamelCase('first_name')).toBe('firstName');
      expect(FieldMapper.toCamelCase('last_name')).toBe('lastName');
    });

    it('should handle single word', () => {
      expect(FieldMapper.toCamelCase('name')).toBe('name');
      expect(FieldMapper.toCamelCase('id')).toBe('id');
    });

    it('should handle already camelCase', () => {
      expect(FieldMapper.toCamelCase('employeeNumber')).toBe('employeeNumber');
      expect(FieldMapper.toCamelCase('firstName')).toBe('firstName');
    });

    it('should handle multiple underscores', () => {
      expect(FieldMapper.toCamelCase('employee_first_name')).toBe('employeeFirstName');
      expect(FieldMapper.toCamelCase('a_b_c_d')).toBe('aBCD');
    });

    it('should handle null and undefined', () => {
      expect(FieldMapper.toCamelCase(null as any)).toBe(null);
      expect(FieldMapper.toCamelCase(undefined as any)).toBe(undefined);
    });

    it('should handle empty string', () => {
      expect(FieldMapper.toCamelCase('')).toBe('');
    });
  });

  describe('objectToSnakeCase', () => {
    it('should convert simple object', () => {
      const input = {
        employeeNumber: 'E001',
        firstName: 'John',
        lastName: 'Doe',
      };

      const expected = {
        employee_number: 'E001',
        first_name: 'John',
        last_name: 'Doe',
      };

      expect(FieldMapper.objectToSnakeCase(input)).toEqual(expected);
    });

    it('should convert nested objects', () => {
      const input = {
        employeeNumber: 'E001',
        contactInfo: {
          phoneNumber: '123-456-7890',
          emailAddress: 'john@example.com',
        },
      };

      const expected = {
        employee_number: 'E001',
        contact_info: {
          phone_number: '123-456-7890',
          email_address: 'john@example.com',
        },
      };

      expect(FieldMapper.objectToSnakeCase(input)).toEqual(expected);
    });

    it('should handle deeply nested objects (3+ levels)', () => {
      const input = {
        employeeData: {
          personalInfo: {
            contactDetails: {
              phoneNumber: '123',
            },
          },
        },
      };

      const expected = {
        employee_data: {
          personal_info: {
            contact_details: {
              phone_number: '123',
            },
          },
        },
      };

      expect(FieldMapper.objectToSnakeCase(input)).toEqual(expected);
    });

    it('should handle arrays of primitives', () => {
      const input = {
        skillList: ['Security', 'Patrol', 'Surveillance'],
      };

      const expected = {
        skill_list: ['Security', 'Patrol', 'Surveillance'],
      };

      expect(FieldMapper.objectToSnakeCase(input)).toEqual(expected);
    });

    it('should handle arrays of objects', () => {
      const input = {
        employees: [
          { employeeNumber: 'E001', firstName: 'John' },
          { employeeNumber: 'E002', firstName: 'Jane' },
        ],
      };

      const expected = {
        employees: [
          { employee_number: 'E001', first_name: 'John' },
          { employee_number: 'E002', first_name: 'Jane' },
        ],
      };

      expect(FieldMapper.objectToSnakeCase(input)).toEqual(expected);
    });

    it('should handle null values', () => {
      const input = {
        employeeNumber: 'E001',
        middleName: null,
      };

      const expected = {
        employee_number: 'E001',
        middle_name: null,
      };

      expect(FieldMapper.objectToSnakeCase(input)).toEqual(expected);
    });

    it('should handle undefined values', () => {
      const input = {
        employeeNumber: 'E001',
        middleName: undefined,
      };

      const expected = {
        employee_number: 'E001',
        middle_name: undefined,
      };

      expect(FieldMapper.objectToSnakeCase(input)).toEqual(expected);
    });

    it('should handle Date objects', () => {
      const date = new Date('2024-01-15');
      const input = {
        hireDate: date,
      };

      const expected = {
        hire_date: date,
      };

      expect(FieldMapper.objectToSnakeCase(input)).toEqual(expected);
    });

    it('should handle empty objects', () => {
      expect(FieldMapper.objectToSnakeCase({})).toEqual({});
    });

    it('should handle null', () => {
      expect(FieldMapper.objectToSnakeCase(null)).toBe(null);
    });

    it('should handle undefined', () => {
      expect(FieldMapper.objectToSnakeCase(undefined)).toBe(undefined);
    });
  });

  describe('objectToCamelCase', () => {
    it('should convert simple object', () => {
      const input = {
        employee_number: 'E001',
        first_name: 'John',
        last_name: 'Doe',
      };

      const expected = {
        employeeNumber: 'E001',
        firstName: 'John',
        lastName: 'Doe',
      };

      expect(FieldMapper.objectToCamelCase(input)).toEqual(expected);
    });

    it('should convert nested objects', () => {
      const input = {
        employee_number: 'E001',
        contact_info: {
          phone_number: '123-456-7890',
          email_address: 'john@example.com',
        },
      };

      const expected = {
        employeeNumber: 'E001',
        contactInfo: {
          phoneNumber: '123-456-7890',
          emailAddress: 'john@example.com',
        },
      };

      expect(FieldMapper.objectToCamelCase(input)).toEqual(expected);
    });

    it('should handle arrays of objects', () => {
      const input = {
        employees: [
          { employee_number: 'E001', first_name: 'John' },
          { employee_number: 'E002', first_name: 'Jane' },
        ],
      };

      const expected = {
        employees: [
          { employeeNumber: 'E001', firstName: 'John' },
          { employeeNumber: 'E002', firstName: 'Jane' },
        ],
      };

      expect(FieldMapper.objectToCamelCase(input)).toEqual(expected);
    });

    it('should handle Date objects', () => {
      const date = new Date('2024-01-15');
      const input = {
        hire_date: date,
      };

      const expected = {
        hireDate: date,
      };

      expect(FieldMapper.objectToCamelCase(input)).toEqual(expected);
    });

    it('should handle empty objects', () => {
      expect(FieldMapper.objectToCamelCase({})).toEqual({});
    });
  });

  describe('whereToSnakeCase', () => {
    it('should convert simple WHERE clause', () => {
      const input = {
        employeeNumber: 'E001',
        firstName: 'John',
      };

      const expected = {
        employee_number: 'E001',
        first_name: 'John',
      };

      expect(FieldMapper.whereToSnakeCase(input)).toEqual(expected);
    });

    it('should preserve Prisma AND operator', () => {
      const input = {
        AND: [
          { employeeNumber: 'E001' },
          { firstName: 'John' },
        ],
      };

      const expected = {
        AND: [
          { employee_number: 'E001' },
          { first_name: 'John' },
        ],
      };

      expect(FieldMapper.whereToSnakeCase(input)).toEqual(expected);
    });

    it('should preserve Prisma OR operator', () => {
      const input = {
        OR: [
          { employeeNumber: 'E001' },
          { employeeNumber: 'E002' },
        ],
      };

      const expected = {
        OR: [
          { employee_number: 'E001' },
          { employee_number: 'E002' },
        ],
      };

      expect(FieldMapper.whereToSnakeCase(input)).toEqual(expected);
    });

    it('should preserve Prisma NOT operator', () => {
      const input = {
        NOT: {
          employeeNumber: 'E001',
        },
      };

      const expected = {
        NOT: {
          employee_number: 'E001',
        },
      };

      expect(FieldMapper.whereToSnakeCase(input)).toEqual(expected);
    });

    it('should preserve Prisma comparison operators', () => {
      const input = {
        hireDate: {
          gte: new Date('2024-01-01'),
          lte: new Date('2024-12-31'),
        },
      };

      const expected = {
        hire_date: {
          gte: new Date('2024-01-01'),
          lte: new Date('2024-12-31'),
        },
      };

      expect(FieldMapper.whereToSnakeCase(input)).toEqual(expected);
    });

    it('should preserve Prisma string operators', () => {
      const input = {
        firstName: {
          contains: 'John',
          mode: 'insensitive',
        },
      };

      const expected = {
        first_name: {
          contains: 'John',
          mode: 'insensitive',
        },
      };

      expect(FieldMapper.whereToSnakeCase(input)).toEqual(expected);
    });

    it('should preserve Prisma array operators', () => {
      const input = {
        skills: {
          hasEvery: ['Security', 'Patrol'],
        },
      };

      const expected = {
        skills: {
          hasEvery: ['Security', 'Patrol'],
        },
      };

      expect(FieldMapper.whereToSnakeCase(input)).toEqual(expected);
    });

    it('should handle complex nested WHERE clauses', () => {
      const input = {
        AND: [
          {
            OR: [
              { employeeNumber: 'E001' },
              { employeeNumber: 'E002' },
            ],
          },
          {
            firstName: {
              contains: 'John',
              mode: 'insensitive',
            },
          },
        ],
      };

      const expected = {
        AND: [
          {
            OR: [
              { employee_number: 'E001' },
              { employee_number: 'E002' },
            ],
          },
          {
            first_name: {
              contains: 'John',
              mode: 'insensitive',
            },
          },
        ],
      };

      expect(FieldMapper.whereToSnakeCase(input)).toEqual(expected);
    });
  });

  describe('Cache Management', () => {
    it('should create and retrieve field map from cache', () => {
      const fieldMap = FieldMapper.getFieldMap('employees');
      expect(fieldMap).toBeInstanceOf(Map);

      // Should return same instance from cache
      const fieldMap2 = FieldMapper.getFieldMap('employees');
      expect(fieldMap2).toBe(fieldMap);
    });

    it('should clear cache', () => {
      FieldMapper.getFieldMap('employees');
      FieldMapper.getFieldMap('clients');
      
      const statsBefore = FieldMapper.getCacheStats();
      expect(statsBefore.models).toBe(2);

      FieldMapper.clearCache();

      const statsAfter = FieldMapper.getCacheStats();
      expect(statsAfter.models).toBe(0);
    });

    it('should track cache statistics', () => {
      FieldMapper.clearCache();
      
      FieldMapper.getFieldMap('employees');
      FieldMapper.getFieldMap('clients');

      const stats = FieldMapper.getCacheStats();
      expect(stats.models).toBe(2);
      expect(stats.totalMappings).toBe(0); // No mappings added yet
    });
  });

  describe('Performance', () => {
    it('should convert objects quickly', () => {
      const largeObject = {
        employeeNumber: 'E001',
        firstName: 'John',
        lastName: 'Doe',
        contactInfo: {
          phoneNumber: '123',
          emailAddress: 'test@test.com',
          address: {
            streetName: 'Main St',
            cityName: 'New York',
            zipCode: '10001',
          },
        },
        skills: ['Skill1', 'Skill2', 'Skill3'],
      };

      const start = performance.now();
      FieldMapper.objectToSnakeCase(largeObject);
      const duration = performance.now() - start;

      // Should complete in less than 1ms for typical objects
      expect(duration).toBeLessThan(5);
    });
  });
});
