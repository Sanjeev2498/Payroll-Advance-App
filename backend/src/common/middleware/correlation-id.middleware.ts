import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

declare global {
  namespace Express {
    interface Request {
      correlationId?: string;
    }
  }
}

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Check if correlation ID is provided in headers
    let correlationId = req.get('X-Correlation-ID') || 
                       req.get('x-correlation-id') || 
                       req.get('X-Request-ID') || 
                       req.get('x-request-id');

    // Generate new correlation ID if not provided
    if (!correlationId) {
      correlationId = uuidv4();
    }

    // Store correlation ID in request object
    req.correlationId = correlationId;

    // Add correlation ID to response headers
    res.setHeader('X-Correlation-ID', correlationId);

    // Add to locals for access in controllers and services
    res.locals.correlationId = correlationId;

    next();
  }
}