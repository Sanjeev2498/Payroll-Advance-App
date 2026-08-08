import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  BadRequestException,
} from '@nestjs/common';
import { Response } from 'express';

@Catch(BadRequestException)
export class ValidationExceptionFilter implements ExceptionFilter {
  catch(exception: BadRequestException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();
    
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse() as any;
    const requestId = request.headers['x-request-id'] || 'unknown';
    
    // Handle validation errors
    let validationErrors = [];
    if (exceptionResponse.message && Array.isArray(exceptionResponse.message)) {
      validationErrors = exceptionResponse.message.map((msg: string) => ({
        field: msg.split(' ')[0], // Extract field name if possible
        message: msg,
        code: 'VALIDATION_ERROR',
      }));
    }
    
    response.status(status).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: validationErrors,
      },
      metadata: {
        timestamp: new Date().toISOString(),
        requestId,
        version: 'v1',
      },
    });
  }
}