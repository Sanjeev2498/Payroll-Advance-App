import { SnakeCaseKeys, CamelCaseKeys } from '../types/field-mapping.types';

/**
 * Utility class for automatic field name translation between camelCase and snake_case.
 * 
 * This class provides methods to convert field names and entire objects between
 * camelCase (used in TypeScript/API layer) and snake_case (used in database/Prisma layer).
 * 
 * Features:
 * - Automatic recursive conversion of nested objects
 * - Array handling
 * - Null/undefined safety
 * - Performance caching
 * - Type-safe transformations
 */
export class FieldMapper {
  /**
   * Cache for field mappings to improve performance
   * Key: model name, Value: Map of camelCase -> snake_case
   */
  private static fieldMapCache = new Map<string, Map<string, string>>();

  /**
   * Convert a camelCase string to snake_case
   * 
   * @param fieldName - The camelCase field name
   * @returns The snake_case field name
   * 
   * @example
   * FieldMapper.toSnakeCase('employeeNumber') // returns 'employee_number'
   * FieldMapper.toSnakeCase('firstName') // returns 'first_name'
   * FieldMapper.toSnakeCase('URLPath') // returns 'url_path'
   */
  static toSnakeCase(fieldName: string): string {
    if (!fieldName || typeof fieldName !== 'string') {
      return fieldName;
    }

    // Skip fields that are already snake_case or start with underscore
    if (fieldName.includes('_') || fieldName.startsWith('_')) {
      return fieldName;
    }

    return fieldName
      .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2') // Handle acronyms: HTTPSConnection -> HTTPS_Connection
      .replace(/([a-z\d])([A-Z])/g, '$1_$2')     // Handle normal case: firstName -> first_Name
      .toLowerCase()
      .replace(/^_/, ''); // Remove leading underscore
  }

  /**
   * Convert a snake_case string to camelCase
   * 
   * @param fieldName - The snake_case field name
   * @returns The camelCase field name
   * 
   * @example
   * FieldMapper.toCamelCase('employee_number') // returns 'employeeNumber'
   * FieldMapper.toCamelCase('first_name') // returns 'firstName'
   */
  static toCamelCase(fieldName: string): string {
    if (!fieldName || typeof fieldName !== 'string') {
      return fieldName;
    }

    // Skip fields that don't have underscores
    if (!fieldName.includes('_')) {
      return fieldName;
    }

    return fieldName.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
  }

  /**
   * Recursively convert all keys in an object from camelCase to snake_case
   * 
   * @param obj - The object to convert
   * @returns A new object with snake_case keys
   * 
   * @example
   * FieldMapper.objectToSnakeCase({ employeeNumber: 'E001', firstName: 'John' })
   * // returns { employee_number: 'E001', first_name: 'John' }
   */
  static objectToSnakeCase<T>(obj: T): SnakeCaseKeys<T> {
    if (obj === null || obj === undefined) {
      return obj as any;
    }

    // Handle arrays
    if (Array.isArray(obj)) {
      return obj.map(item => this.objectToSnakeCase(item)) as any;
    }

    // Handle primitive types
    if (typeof obj !== 'object' || obj instanceof Date) {
      return obj as any;
    }

    // Handle objects
    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
      const snakeKey = this.toSnakeCase(key);
      
      if (value !== null && typeof value === 'object' && !(value instanceof Date)) {
        if (Array.isArray(value)) {
          result[snakeKey] = value.map(item => 
            typeof item === 'object' && item !== null 
              ? this.objectToSnakeCase(item)
              : item
          );
        } else {
          result[snakeKey] = this.objectToSnakeCase(value);
        }
      } else {
        result[snakeKey] = value;
      }
    }

    return result;
  }

  /**
   * Recursively convert all keys in an object from snake_case to camelCase
   * 
   * @param obj - The object to convert
   * @returns A new object with camelCase keys
   * 
   * @example
   * FieldMapper.objectToCamelCase({ employee_number: 'E001', first_name: 'John' })
   * // returns { employeeNumber: 'E001', firstName: 'John' }
   */
  static objectToCamelCase<T>(obj: T): CamelCaseKeys<T> {
    if (obj === null || obj === undefined) {
      return obj as any;
    }

    // Handle arrays
    if (Array.isArray(obj)) {
      return obj.map(item => this.objectToCamelCase(item)) as any;
    }

    // Handle primitive types
    if (typeof obj !== 'object' || obj instanceof Date) {
      return obj as any;
    }

    // Handle objects
    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
      const camelKey = this.toCamelCase(key);
      
      if (value !== null && typeof value === 'object' && !(value instanceof Date)) {
        if (Array.isArray(value)) {
          result[camelKey] = value.map(item => 
            typeof item === 'object' && item !== null 
              ? this.objectToCamelCase(item)
              : item
          );
        } else {
          result[camelKey] = this.objectToCamelCase(value);
        }
      } else {
        result[camelKey] = value;
      }
    }

    return result;
  }

  /**
   * Convert a Prisma WHERE clause from camelCase to snake_case
   * 
   * This method handles special Prisma operators like AND, OR, NOT
   * and preserves operator keys while converting field names.
   * 
   * @param where - The WHERE clause object
   * @returns Converted WHERE clause with snake_case field names
   * 
   * @example
   * FieldMapper.whereToSnakeCase({ employeeNumber: 'E001', firstName: 'John' })
   * // returns { employee_number: 'E001', first_name: 'John' }
   * 
   * FieldMapper.whereToSnakeCase({ OR: [{ employeeNumber: 'E001' }, { employeeNumber: 'E002' }] })
   * // returns { OR: [{ employee_number: 'E001' }, { employee_number: 'E002' }] }
   */
  static whereToSnakeCase<T>(where: T): SnakeCaseKeys<T> {
    if (where === null || where === undefined) {
      return where as any;
    }

    if (typeof where !== 'object') {
      return where as any;
    }

    // Prisma operators that should NOT be converted
    const prismaOperators = new Set([
      'AND', 'OR', 'NOT',
      'equals', 'not', 'in', 'notIn',
      'lt', 'lte', 'gt', 'gte',
      'contains', 'startsWith', 'endsWith',
      'mode',
      'has', 'hasEvery', 'hasSome', 'isEmpty',
      'some', 'every', 'none',
      'is', 'isNot',
    ]);

    const result: any = {};

    for (const [key, value] of Object.entries(where)) {
      // Preserve Prisma operators as-is
      if (prismaOperators.has(key)) {
        if (Array.isArray(value)) {
          result[key] = value.map(item => this.whereToSnakeCase(item));
        } else if (typeof value === 'object' && value !== null && !(value instanceof Date)) {
          result[key] = this.whereToSnakeCase(value);
        } else {
          result[key] = value;
        }
      } else {
        // Convert field names
        const snakeKey = this.toSnakeCase(key);
        
        if (value !== null && typeof value === 'object' && !(value instanceof Date)) {
          if (Array.isArray(value)) {
            result[snakeKey] = value.map(item => 
              typeof item === 'object' && item !== null && !(item instanceof Date)
                ? this.whereToSnakeCase(item)
                : item
            );
          } else {
            result[snakeKey] = this.whereToSnakeCase(value);
          }
        } else {
          result[snakeKey] = value;
        }
      }
    }

    return result;
  }

  /**
   * Get or create a cached field mapping for a model
   * 
   * @param modelName - The name of the model
   * @returns Map of camelCase to snake_case field names
   */
  static getFieldMap(modelName: string): Map<string, string> {
    if (this.fieldMapCache.has(modelName)) {
      return this.fieldMapCache.get(modelName)!;
    }

    const fieldMap = new Map<string, string>();
    this.fieldMapCache.set(modelName, fieldMap);
    return fieldMap;
  }

  /**
   * Clear the field mapping cache
   * Useful for testing or when schema changes
   */
  static clearCache(): void {
    this.fieldMapCache.clear();
  }

  /**
   * Get cache statistics for monitoring
   * 
   * @returns Object with cache statistics
   */
  static getCacheStats() {
    return {
      models: this.fieldMapCache.size,
      totalMappings: Array.from(this.fieldMapCache.values())
        .reduce((sum, map) => sum + map.size, 0),
    };
  }
}
