import { registerDecorator, ValidationOptions, ValidationArguments } from 'class-validator';
import { validateDate, validateDateRange, DateRangeValidationOptions } from '../utils/date-validation.util';

/**
 * Custom validator that uses our comprehensive date validation utility
 * Rejects dates that JavaScript silently corrects and ensures PostgreSQL compatibility
 */
export function IsValidDate(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isValidDate',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (value === null || value === undefined) {
            return true; // Allow null/undefined for optional dates
          }

          const result = validateDate(value);
          return result.isValid;
        },
        defaultMessage(args: ValidationArguments) {
          if (args.value === null || args.value === undefined) {
            return '';
          }

          const result = validateDate(args.value);
          return result.error || `${args.property} must be a valid date`;
        },
      },
    });
  };
}

/**
 * Validator for date ranges with configurable options
 */
export function IsValidDateRange(
  endDateProperty: string,
  options?: DateRangeValidationOptions,
  validationOptions?: ValidationOptions
) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isValidDateRange',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [endDateProperty, options],
      validator: {
        validate(value: any, args: ValidationArguments) {
          const [endDatePropertyName, rangeOptions] = args.constraints;
          const endDate = (args.object as any)[endDatePropertyName];
          
          const result = validateDateRange(value, endDate, rangeOptions);
          return result.isValid;
        },
        defaultMessage(args: ValidationArguments) {
          const [endDatePropertyName, rangeOptions] = args.constraints;
          const endDate = (args.object as any)[endDatePropertyName];
          
          const result = validateDateRange(args.value, endDate, rangeOptions);
          return result.error || `Invalid date range for ${args.property}`;
        },
      },
    });
  };
}

/**
 * Specific validator for employment dates
 */
export function IsValidEmploymentDate(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isValidEmploymentDate',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (value === null || value === undefined) {
            return true;
          }

          const { DateValidationPatterns } = require('../utils/date-validation.util');
          const result = DateValidationPatterns.employmentDate(value);
          return result.isValid;
        },
        defaultMessage(args: ValidationArguments) {
          const { DateValidationPatterns } = require('../utils/date-validation.util');
          const result = DateValidationPatterns.employmentDate(args.value);
          return result.error || `${args.property} must be a valid employment date`;
        },
      },
    });
  };
}

/**
 * Specific validator for contract dates
 */
export function IsValidContractDateRange(
  endDateProperty: string,
  validationOptions?: ValidationOptions
) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isValidContractDateRange',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [endDateProperty],
      validator: {
        validate(value: any, args: ValidationArguments) {
          const [endDatePropertyName] = args.constraints;
          const endDate = (args.object as any)[endDatePropertyName];
          
          if (!value || !endDate) {
            return true; // Individual date validation will catch invalid dates
          }

          const { DateValidationPatterns } = require('../utils/date-validation.util');
          const result = DateValidationPatterns.contractDate(value, endDate);
          return result.isValid;
        },
        defaultMessage(args: ValidationArguments) {
          const [endDatePropertyName] = args.constraints;
          const endDate = (args.object as any)[endDatePropertyName];
          
          const { DateValidationPatterns } = require('../utils/date-validation.util');
          const result = DateValidationPatterns.contractDate(args.value, endDate);
          return result.error || `Invalid contract date range`;
        },
      },
    });
  };
}