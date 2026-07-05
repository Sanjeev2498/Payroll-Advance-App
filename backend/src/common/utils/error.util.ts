/**
 * Error handling utilities for TypeScript 6.0+ compatibility
 * Handles the stricter error typing where catch blocks receive 'unknown'
 */

export interface ErrorWithMessage {
  message: string;
  stack?: string;
}

export interface ErrorWithCode extends ErrorWithMessage {
  code?: string | number;
}

/**
 * Type guard to check if an error has a message property
 */
export function isErrorWithMessage(error: unknown): error is ErrorWithMessage {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as Record<string, unknown>).message === 'string'
  );
}

/**
 * Type guard to check if an error has a stack property
 */
export function isErrorWithStack(error: unknown): error is ErrorWithMessage {
  return (
    isErrorWithMessage(error) &&
    'stack' in error &&
    typeof (error as any).stack === 'string'
  );
}

/**
 * Type guard to check if an error has a code property
 */
export function isErrorWithCode(error: unknown): error is ErrorWithCode {
  return (
    isErrorWithMessage(error) &&
    'code' in error &&
    (typeof (error as any).code === 'string' ||
     typeof (error as any).code === 'number')
  );
}

/**
 * Safely extracts error message from unknown error
 */
export function getErrorMessage(error: unknown): string {
  if (isErrorWithMessage(error)) {
    return error.message;
  }
  
  if (typeof error === 'string') {
    return error;
  }
  
  if (error instanceof Error) {
    return getErrorMessage(error);
  }
  
  return 'An unknown error occurred';
}

/**
 * Safely extracts error stack from unknown error
 */
export function getErrorStack(error: unknown): string | undefined {
  if (isErrorWithStack(error)) {
    return error.stack;
  }
  
  if (error instanceof Error && getErrorStack(error)) {
    return getErrorStack(error);
  }
  
  return undefined;
}

/**
 * Safely extracts error code from unknown error
 */
export function getErrorCode(error: unknown): string | number | undefined {
  if (isErrorWithCode(error)) {
    return error.code;
  }
  
  return undefined;
}

/**
 * Formats error for logging purposes
 */
export function formatError(error: unknown): {
  message: string;
  stack?: string;
  code?: string | number;
} {
  return {
    message: getErrorMessage(error),
    stack: getErrorStack(error),
    code: getErrorCode(error),
  };
}

/**
 * Creates a standardized error object from unknown error
 */
export function toErrorWithMessage(error: unknown): ErrorWithMessage {
  if (isErrorWithMessage(error)) {
    return error;
  }
  
  if (error instanceof Error) {
    return {
      message: getErrorMessage(error),
      stack: getErrorStack(error),
    };
  }
  
  if (typeof error === 'string') {
    return { message: error };
  }
  
  return { message: 'An unknown error occurred' };
}