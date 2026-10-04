import { Injectable, NestMiddleware, BadRequestException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class RequestSizeLimitMiddleware implements NestMiddleware {
  private readonly maxSize = 1 * 1024 * 1024; // 1MB for application logic (stricter than Express 5MB)
  private readonly maxHeaderSize = 8 * 1024; // 8KB for headers

  use(req: Request, res: Response, next: NextFunction) {
    const contentLength = parseInt(req.headers['content-length'] || '0');
    
    // Check content length
    if (contentLength > this.maxSize) {
      throw new BadRequestException(`Request size ${contentLength} exceeds maximum allowed limit of ${this.maxSize} bytes`);
    }

    // Check header size
    const headerSize = JSON.stringify(req.headers).length;
    if (headerSize > this.maxHeaderSize) {
      throw new BadRequestException(`Request headers size exceeds maximum allowed limit`);
    }

    // Check URL length
    if (req.url && req.url.length > 2048) {
      throw new BadRequestException('Request URL exceeds maximum allowed length');
    }

    // Track request size for monitoring
    req['requestSize'] = contentLength;
    req['headerSize'] = headerSize;
    
    // Set response timeout to prevent slow loris attacks
    res.setTimeout(30000, () => {
      res.status(408).json({
        success: false,
        error: {
          code: 'REQUEST_TIMEOUT',
          message: 'Request timeout'
        }
      });
    });
    
    next();
  }
}