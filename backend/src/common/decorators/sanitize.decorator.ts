import { Transform } from 'class-transformer';
import * as DOMPurify from 'isomorphic-dompurify';

/**
 * Sanitizes string input to prevent XSS attacks
 */
export function Sanitize() {
  return Transform(({ value }) => {
    if (typeof value === 'string') {
      // Remove HTML tags and dangerous content
      return DOMPurify.sanitize(value, { 
        ALLOWED_TAGS: [], 
        ALLOWED_ATTR: [],
        KEEP_CONTENT: true 
      });
    }
    return value;
  });
}

/**
 * Trims whitespace from string input
 */
export function Trim() {
  return Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.trim();
    }
    return value;
  });
}

/**
 * Normalizes email addresses to lowercase
 */
export function NormalizeEmail() {
  return Transform(({ value }) => {
    if (typeof value === 'string' && value.includes('@')) {
      return value.toLowerCase().trim();
    }
    return value;
  });
}

/**
 * Removes special characters except allowed ones
 */
export function AlphanumericOnly(allowedChars: string = '') {
  return Transform(({ value }) => {
    if (typeof value === 'string') {
      const regex = new RegExp(`[^a-zA-Z0-9${allowedChars.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}]`, 'g');
      return value.replace(regex, '');
    }
    return value;
  });
}

/**
 * Limits string length
 */
export function MaxLength(maxLength: number) {
  return Transform(({ value }) => {
    if (typeof value === 'string' && value.length > maxLength) {
      return value.substring(0, maxLength);
    }
    return value;
  });
}