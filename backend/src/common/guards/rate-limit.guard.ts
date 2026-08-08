import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

// Simple in-memory rate limiting (for production, use Redis)
interface RateLimit {
  count: number;
  resetTime: number;
}

@Injectable()
export class RateLimitGuard implements CanActivate {
  private requests = new Map<string, RateLimit>();
  
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    
    // Get rate limit configuration (default: 100 requests per minute)
    const limit = this.reflector.getAllAndOverride<number>(RateLimit, [
      context.getHandler(),
      context.getClass(),
    ]) || 100;
    const window = 60 * 1000; // 1 minute
    
    const key = this.getClientKey(request);
    const now = Date.now();
    
    let rateLimit = this.requests.get(key);
    
    if (!rateLimit || now > rateLimit.resetTime) {
      rateLimit = {
        count: 1,
        resetTime: now + window,
      };
    } else {
      rateLimit.count++;
    }
    
    this.requests.set(key, rateLimit);
    
    // Set rate limit headers
    response.setHeader('X-RateLimit-Limit', limit);
    response.setHeader('X-RateLimit-Remaining', Math.max(0, limit - rateLimit.count));
    response.setHeader('X-RateLimit-Reset', rateLimit.resetTime);
    
    if (rateLimit.count > limit) {
      throw new HttpException(
        'Too Many Requests',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    
    return true;
  }
  
  private getClientKey(request: any): string {
    // Use IP address and user ID (if authenticated) as the key
    const ip = request.ip || request.connection.remoteAddress;
    const userId = request.user?.id || 'anonymous';
    return `${ip}:${userId}`;
  }
}

// Decorator for setting rate limits
export const RATE_LIMIT_KEY = 'rateLimit';
export const RateLimit = Reflector.createDecorator<number>();

// Convenience decorators for common rate limits
export const ReadRateLimit = () => RateLimit(1000); // 1000 requests per minute for read operations
export const WriteRateLimit = () => RateLimit(100); // 100 requests per minute for write operations