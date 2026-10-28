import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { Prisma } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { FieldMapper } from '../utils/field-mapper.util';

/**
 * Global exception filter for Prisma database errors
 * 
 * Transforms Prisma error codes into user-friendly HTTP responses
 * with camelCase field names for API consumers.
 * 
 * Error Code Mappings:
 * - P2002: Unique constraint violation → 409 Conflict
 * - P2025: Record not found → 404 Not Found  
 * - P2003: Foreign key constraint → 400 Bad Request
 * - P2014: Required relation violation → 400 Bad Request
 * - P2021: Table does not exist → 500 Internal Server Error
 * - P2022: Column does not exist → 500 Internal Server Error
 * - Other Prisma errors → 400 Bad Request
 */
@Catch(
  Prisma.PrismaClientKnownRequestError,
  Prisma.PrismaClientValidationError,
  Prisma.PrismaClientRustPanicError,
  Prisma.PrismaClientInitializationError,
  Prisma.PrismaClientUnknownRequestError
)
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaExceptionFilter.name);

  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();
    
    const traceId = uuidv4();
    const requestId = request.headers['x-request-id'] || 'unknown';

    let status = HttpStatus.BAD_REQUEST;
    let code = 'DATABASE_ERROR';
    let message = 'Database operation failed';
    let field: string | undefined;

    // Handle known Prisma errors
    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      const result = this.handleKnownRequestError(exception);
      status = result.status;
      code = result.code;
      message = result.message;
      field = result.field;
    } 
    // Handle validation errors
    else if (exception instanceof Prisma.PrismaClientValidationError) {
      status = HttpStatus.BAD_REQUEST;
      code = 'VALIDATION_ERROR';
      message = this.extractValidationMessage(exception.message);
    }
    // Handle initialization errors
    else if (exception instanceof Prisma.PrismaClientInitializationError) {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      code = 'DATABASE_CONNECTION_ERROR';
      message = 'Database connection failed. Please try again later.';
    }
    // Handle rust panic errors
    else if (exception instanceof Prisma.PrismaClientRustPanicError) {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      code = 'DATABASE_PANIC_ERROR';
      message = 'A critical database error occurred. Please contact support.';
    }
    // Handle unknown request errors
    else if (exception instanceof Prisma.PrismaClientUnknownRequestError) {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      code = 'UNKNOWN_DATABASE_ERROR';
      message = 'An unexpected database error occurred.';
    }

    // Log the error with context
    this.logger.error(
      `Prisma ${code}: ${message}`,
      exception.stack || exception.message,
      {
        traceId,
        requestId,
        url: request.url,
        method: request.method,
        errorCode: (exception as any).code,
        field,
      }
    );

    // Send standardized error response
    const errorResponse: any = {
      success: false,
      error: {
        code,
        message,
        traceId,
      },
      metadata: {
        timestamp: new Date().toISOString(),
        requestId,
        version: 'v1',
      },
    };

    // Include field name if available
    if (field) {
      errorResponse.error.field = field;
    }

    response.status(status).json(errorResponse);
  }

  /**
   * Handle known Prisma request errors (P-codes)
   */
  private handleKnownRequestError(error: Prisma.PrismaClientKnownRequestError): {
    status: HttpStatus;
    code: string;
    message: string;
    field?: string;
  } {
    const { code, meta } = error;
    let field: string | undefined;

    switch (code) {
      case 'P2002': {
        // Unique constraint violation
        field = this.extractFieldFromMeta(meta);
        return {
          status: HttpStatus.CONFLICT,
          code: 'CONFLICT',
          message: `A record with this ${field} already exists. Please use a different value.`,
          field,
        };
      }

      case 'P2025': {
        // Record not found
        return {
          status: HttpStatus.NOT_FOUND,
          code: 'NOT_FOUND',
          message: 'The requested record was not found. It may have been deleted.',
        };
      }

      case 'P2003': {
        // Foreign key constraint violation
        field = this.extractFieldFromMeta(meta);
        return {
          status: HttpStatus.BAD_REQUEST,
          code: 'INVALID_REFERENCE',
          message: `Invalid ${field}: the referenced record does not exist.`,
          field,
        };
      }

      case 'P2014': {
        // Required relation violation
        field = this.extractFieldFromMeta(meta);
        return {
          status: HttpStatus.BAD_REQUEST,
          code: 'MISSING_RELATION',
          message: `Required relation '${field}' is missing.`,
          field,
        };
      }

      case 'P2016': {
        // Query interpretation error
        return {
          status: HttpStatus.BAD_REQUEST,
          code: 'INVALID_QUERY',
          message: 'Invalid query parameters.',
        };
      }

      case 'P2021': {
        // Table does not exist
        return {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          code: 'DATABASE_SCHEMA_ERROR',
          message: 'Database schema error. Please contact support.',
        };
      }

      case 'P2022': {
        // Column does not exist
        field = this.extractFieldFromMeta(meta);
        return {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          code: 'DATABASE_SCHEMA_ERROR',
          message: `Database schema error: field '${field}' not found.`,
          field,
        };
      }

      case 'P2023': {
        // Inconsistent column data
        return {
          status: HttpStatus.BAD_REQUEST,
          code: 'INVALID_DATA',
          message: 'Invalid data format for database operation.',
        };
      }

      default: {
        // Generic Prisma error
        return {
          status: HttpStatus.BAD_REQUEST,
          code: 'DATABASE_ERROR',
          message: 'Database operation failed. Please check your input and try again.',
        };
      }
    }
  }

  /**
   * Extract field name from Prisma error metadata
   * Converts snake_case to camelCase for API responses
   */
  private extractFieldFromMeta(meta?: any): string {
    if (!meta) return 'field';

    // Try various metadata fields
    const snakeField =
      meta.target?.[0] ||
      meta.field_name ||
      meta.column ||
      meta.relation_name ||
      'field';

    // Convert snake_case to camelCase for user-facing message
    return FieldMapper.toCamelCase(snakeField);
  }

  /**
   * Extract clean validation message from Prisma validation error
   */
  private extractValidationMessage(fullMessage: string): string {
    // Prisma validation errors are verbose; extract the key part
    const lines = fullMessage.split('\n');
    const relevantLine = lines.find(
      (line) => line.includes('Argument') || line.includes('Unknown') || line.includes('Invalid')
    );
    
    if (relevantLine) {
      // Clean up the message for end users
      return relevantLine
        .replace(/^.*?Argument\s+/, '')
        .replace(/^.*?Invalid\s+/, 'Invalid ')
        .replace(/\s+/g, ' ')
        .trim();
    }
    
    return 'Invalid request data. Please check your input.';
  }
}
