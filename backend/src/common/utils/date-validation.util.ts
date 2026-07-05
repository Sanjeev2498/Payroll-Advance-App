import { BadRequestException } from '@nestjs/common';

/**
 * Comprehensive date validation utilities to fix Bug 1: Date Validation Issues
 * 
 * The JavaScript Date constructor silently corrects invalid dates (e.g., Feb 30 -> Mar 1)
 * This utility provides strict validation that rejects invalid dates.
 * 
 * Additionally fixes PostgreSQL date range issues by rejecting dates that PostgreSQL cannot handle.
 */

export interface DateValidationResult {
  isValid: boolean;
  error?: string;
  correctedValue?: Date;
}

export interface DateRange {
  start: Date;
  end: Date;
}

export interface DateRangeValidationOptions {
  allowSameDate?: boolean;
  maxRangeDays?: number;
  minDate?: Date;
  maxDate?: Date;
}

/**
 * Strictly validate a date string or Date object
 * Rejects dates that JavaScript would silently correct
 */
export function validateDate(input: string | Date | null | undefined): DateValidationResult {
  if (input === null || input === undefined) {
    return { isValid: true }; // null/undefined is allowed for optional dates
  }

  let dateToValidate: Date;
  let originalString: string;

  if (typeof input === 'string') {
    originalString = input.trim();
    
    // Check for obviously invalid formats
    if (originalString === '' || originalString === 'Invalid Date') {
      return { isValid: false, error: 'Date string is empty or invalid' };
    }

    // Check for negative year indicators in the string (more precise check)
    if (originalString.match(/^-\d/) || originalString.startsWith('0000-')) {
      return { isValid: false, error: 'Invalid year format (negative years or year 0000 not supported)' };
    }

    dateToValidate = new Date(originalString);
  } else {
    dateToValidate = input;
    originalString = input.toISOString().split('T')[0]; // Get YYYY-MM-DD format
  }

  // Check if Date constructor created an invalid date
  if (isNaN(dateToValidate.getTime())) {
    return { isValid: false, error: 'Date is invalid or unparseable' };
  }

  // Check for year 0000 or negative years (PostgreSQL doesn't support these)
  const year = dateToValidate.getFullYear();
  if (year <= 0) {
    return { isValid: false, error: 'Year must be positive (after 0000)' };
  }

  // Check for unreasonable future dates (e.g., year 9999+)
  if (year > 2100) {
    return { isValid: false, error: 'Year cannot be beyond 2100' };
  }

  // For string input, verify that parsing didn't silently correct the date
  if (typeof input === 'string') {
    const reconstructed = dateToValidate.toISOString().split('T')[0];
    
    // Handle different input formats
    let normalizedInput: string;
    
    if (originalString.match(/^\d{4}-\d{2}-\d{2}$/)) {
      // Already in YYYY-MM-DD format
      normalizedInput = originalString;
    } else if (originalString.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
      // MM/DD/YYYY format - convert to YYYY-MM-DD for comparison
      const parts = originalString.split('/');
      normalizedInput = `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
    } else if (originalString.match(/^\d{2}-\d{2}-\d{4}$/)) {
      // DD-MM-YYYY format - convert to YYYY-MM-DD for comparison
      const parts = originalString.split('-');
      normalizedInput = `${parts[2]}-${parts[1]}-${parts[0]}`;
    } else {
      // For other formats, we'll trust the Date constructor
      // but still do basic sanity checks
      normalizedInput = reconstructed;
    }

    if (reconstructed !== normalizedInput) {
      return {
        isValid: false,
        error: `Date was silently corrected from ${originalString} to ${reconstructed}. Please provide a valid date.`,
        correctedValue: dateToValidate
      };
    }
  }

  return { isValid: true };
}

/**
 * Validate a date range (start and end dates)
 */
export function validateDateRange(
  startDate: string | Date | null,
  endDate: string | Date | null,
  options: DateRangeValidationOptions = {}
): DateValidationResult {
  const {
    allowSameDate = true,
    maxRangeDays,
    minDate,
    maxDate
  } = options;

  // Validate individual dates first
  const startValidation = validateDate(startDate);
  if (!startValidation.isValid) {
    return { isValid: false, error: `Start date invalid: ${startValidation.error}` };
  }

  const endValidation = validateDate(endDate);
  if (!endValidation.isValid) {
    return { isValid: false, error: `End date invalid: ${endValidation.error}` };
  }

  // If either date is null, range validation passes (for optional ranges)
  if (!startDate || !endDate) {
    return { isValid: true };
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  // Check date order
  if (start > end) {
    return { isValid: false, error: 'Start date must be before or equal to end date' };
  }

  if (!allowSameDate && start.getTime() === end.getTime()) {
    return { isValid: false, error: 'Start date and end date cannot be the same' };
  }

  // Check against minimum date
  if (minDate && start < minDate) {
    return { isValid: false, error: `Start date cannot be before ${minDate.toISOString().split('T')[0]}` };
  }

  // Check against maximum date
  if (maxDate && end > maxDate) {
    return { isValid: false, error: `End date cannot be after ${maxDate.toISOString().split('T')[0]}` };
  }

  // Check maximum range
  if (maxRangeDays) {
    const diffTime = end.getTime() - start.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays > maxRangeDays) {
      return { isValid: false, error: `Date range cannot exceed ${maxRangeDays} days` };
    }
  }

  return { isValid: true };
}

/**
 * Validate and parse a date, throwing BadRequestException on failure
 * Use this in controllers and services for immediate validation
 */
export function parseAndValidateDate(input: string | Date | null | undefined, fieldName: string = 'date'): Date | null {
  if (input === null || input === undefined) {
    return null;
  }

  const validation = validateDate(input);
  if (!validation.isValid) {
    throw new BadRequestException(`Invalid ${fieldName}: ${validation.error}`);
  }

  return new Date(input);
}

/**
 * Validate and parse a date range, throwing BadRequestException on failure
 */
export function parseAndValidateDateRange(
  startDate: string | Date | null,
  endDate: string | Date | null,
  options: DateRangeValidationOptions = {}
): DateRange | null {
  const validation = validateDateRange(startDate, endDate, options);
  if (!validation.isValid) {
    throw new BadRequestException(`Invalid date range: ${validation.error}`);
  }

  if (!startDate || !endDate) {
    return null;
  }

  return {
    start: new Date(startDate),
    end: new Date(endDate)
  };
}

/**
 * Common date validation patterns for the payroll system
 */
export const DateValidationPatterns = {
  /**
   * Validate employment dates (hire date, termination date)
   */
  employmentDate: (date: string | Date | null | undefined): DateValidationResult => {
    const result = validateDate(date);
    if (!result.isValid) return result;

    if (date) {
      const parsedDate = new Date(date);
      const today = new Date();
      const minEmploymentDate = new Date('1950-01-01'); // Reasonable minimum employment date

      if (parsedDate < minEmploymentDate) {
        return { isValid: false, error: 'Employment date cannot be before 1950' };
      }

      // Allow future hire dates (up to 1 year)
      const maxFutureDate = new Date();
      maxFutureDate.setFullYear(today.getFullYear() + 1);

      if (parsedDate > maxFutureDate) {
        return { isValid: false, error: 'Employment date cannot be more than 1 year in the future' };
      }
    }

    return { isValid: true };
  },

  /**
   * Validate contract dates (client contracts)
   */
  contractDate: (startDate: string | Date | null, endDate: string | Date | null): DateValidationResult => {
    return validateDateRange(startDate, endDate, {
      allowSameDate: false, // Contracts should have meaningful duration
      maxRangeDays: 365 * 10, // Max 10 year contracts
      minDate: new Date('2020-01-01') // Business started in 2020
    });
  },

  /**
   * Validate payroll period dates
   */
  payrollPeriod: (startDate: string | Date, endDate: string | Date): DateValidationResult => {
    return validateDateRange(startDate, endDate, {
      allowSameDate: false,
      maxRangeDays: 31, // Max monthly payroll
      minDate: new Date('2024-01-01') // System launch date
    });
  }
};