import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();
    
    const traceId = uuidv4();
    const requestId = request.headers['x-request-id'] || 'unknown';
    
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let code = 'INTERNAL_SERVER_ERROR';
    
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse() as any;
      
      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else {
        message = exceptionResponse.message || exception.message;
        code = exceptionResponse.error || exception.name;
      }
    }
    
    // Log the error
    this.logger.error(
      `HTTP ${status} Error - ${message}`,
      exception instanceof Error ? exception.stack : exception,
      {
        traceId,
        requestId,
        url: request.url,
        method: request.method,
      }
    );
    
    // Send error response
    response.status(status).json({
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
    });
  }
}