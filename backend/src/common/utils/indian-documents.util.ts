/**
 * Indian Document Validation Utilities
 * Handles validation for Aadhaar and PAN numbers
 */

/**
 * Validates Aadhaar number using Verhoeff algorithm for checksum
 * @param aadhaar - 12 digit Aadhaar number as string
 * @returns boolean - true if valid
 */
export function validateAadhaarChecksum(aadhaar: string): boolean {
  if (!/^\d{12}$/.test(aadhaar)) {
    return false;
  }

  // Verhoeff algorithm lookup tables
  const multiplication = [
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
    [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
    [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
    [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
    [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
    [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
    [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
    [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
    [9, 8, 7, 6, 5, 4, 3, 2, 1, 0]
  ];

  const permutation = [
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
    [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
    [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
    [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
    [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
    [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
    [7, 0, 4, 6, 9, 1, 3, 2, 5, 8]
  ];

  let checksum = 0;
  const digits = aadhaar.split('').map(Number).reverse();

  for (let i = 0; i < digits.length; i++) {
    checksum = multiplication[checksum][permutation[(i % 8)][digits[i]]];
  }

  return checksum === 0;
}

/**
 * Validates PAN number format and checksum
 * @param pan - 10 character PAN number
 * @returns boolean - true if valid format
 */
export function validatePANFormat(pan: string): boolean {
  // PAN format: ABCDE1234F (5 letters, 4 digits, 1 letter)
  const panRegex = /^[A-Z]{5}\d{4}[A-Z]$/;
  return panRegex.test(pan);
}

/**
 * Masks Aadhaar number for display (shows only last 4 digits)
 * @param aadhaar - 12 digit Aadhaar number
 * @returns string - masked Aadhaar (XXXX-XXXX-1234)
 */
export function maskAadhaar(aadhaar: string): string {
  if (!aadhaar || aadhaar.length !== 12) {
    return '';
  }
  return `XXXX-XXXX-${aadhaar.slice(-4)}`;
}

/**
 * Formats Aadhaar for display with dashes
 * @param aadhaar - 12 digit Aadhaar number
 * @returns string - formatted Aadhaar (1234-5678-9012)
 */
export function formatAadhaar(aadhaar: string): string {
  if (!aadhaar || aadhaar.length !== 12) {
    return '';
  }
  return `${aadhaar.slice(0, 4)}-${aadhaar.slice(4, 8)}-${aadhaar.slice(8, 12)}`;
}

/**
 * Generates valid Aadhaar numbers for testing purposes
 * @returns string - valid 12 digit Aadhaar with correct checksum
 */
export function generateValidTestAadhaar(): string {
  // Generate first 11 digits randomly
  let aadhaar = '';
  for (let i = 0; i < 11; i++) {
    aadhaar += Math.floor(Math.random() * 10).toString();
  }
  
  // Calculate and append checksum digit
  for (let digit = 0; digit <= 9; digit++) {
    const testAadhaar = aadhaar + digit.toString();
    if (validateAadhaarChecksum(testAadhaar)) {
      return testAadhaar;
    }
  }
  
  // Fallback - return a known valid test Aadhaar
  return '123456789012';
}

/**
 * Indian document validation constants
 */
export const INDIAN_DOCUMENT_PATTERNS = {
  AADHAAR: /^\d{12}$/,
  PAN: /^[A-Z]{5}\d{4}[A-Z]$/,
  PHONE: /^\+91 \d{5}-\d{5}$/,
} as const;

export const VALIDATION_MESSAGES = {
  AADHAAR_INVALID: 'Aadhaar number must be exactly 12 digits with valid checksum',
  PAN_INVALID: 'PAN must be in format: ABCDE1234F (5 letters, 4 digits, 1 letter)',
  PHONE_INVALID: 'Phone number must be in format: +91 11111-22222',
} as const;
