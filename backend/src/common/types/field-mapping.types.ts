/**
 * Type utilities for field name mapping between camelCase and snake_case
 */

/**
 * Convert a string type to snake_case
 * Example: "employeeNumber" -> "employee_number"
 */
type SnakeCase<S extends string> = S extends `${infer T}${infer U}`
  ? `${T extends Capitalize<T> ? '_' : ''}${Lowercase<T>}${SnakeCase<U>}`
  : S;

/**
 * Convert a string type to camelCase
 * Example: "employee_number" -> "employeeNumber"
 */
type CamelCase<S extends string> = S extends `${infer P1}_${infer P2}${infer P3}`
  ? `${Lowercase<P1>}${Uppercase<P2>}${CamelCase<P3>}`
  : Lowercase<S>;

/**
 * Recursively convert all object keys to snake_case
 */
export type SnakeCaseKeys<T> = T extends (infer U)[]
  ? SnakeCaseKeys<U>[]
  : T extends object
  ? {
      [K in keyof T as K extends string ? SnakeCase<K> : K]: SnakeCaseKeys<T[K]>;
    }
  : T;

/**
 * Recursively convert all object keys to camelCase
 */
export type CamelCaseKeys<T> = T extends (infer U)[]
  ? CamelCaseKeys<U>[]
  : T extends object
  ? {
      [K in keyof T as K extends string ? CamelCase<K> : K]: CamelCaseKeys<T[K]>;
    }
  : T;

/**
 * Configuration for field mapping
 */
export interface FieldMappingConfig {
  model: string;
  fields: Record<string, string>;
  nestedMappings?: Record<string, FieldMappingConfig>;
}

/**
 * Options for find operations
 */
export interface FindOptions {
  skip?: number;
  take?: number;
  orderBy?: Record<string, 'asc' | 'desc'>;
  include?: Record<string, boolean>;
}
